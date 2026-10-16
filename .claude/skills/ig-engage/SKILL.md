---
name: ig-engage
description: "Hara Vital Instagram community engagement — continuous session that finds hashtag posts, generates genuine Argentine Spanish comments with Claude, and posts them at human pace (1–5/hour). Runs until you quit or hit the daily limit."
trigger: "ig-engage, instagram engage, instagram community, instagram comments"
---

# Instagram Community Engagement — Hara Vital

This skill runs a continuous engagement loop on Instagram: it finds posts in your configured hashtags, generates contextual comments in Argentine Spanish, asks for your approval (Y/S/Q), and posts at a human pace with randomised intervals between 12–60 min.

**What you need before starting:**
- Chrome is open with `instagram.com` visible and logged in as Hara Vital
- `scripts/instagram-engage.config.json` exists (edit hashtags there)

**To stop early:** choose "Terminar sesión" at any approval prompt.

---

## Step 0: Cron-resume detection

Check if the invocation prompt contains the phrase **"cron-resume"**.

**If YES (invoked by cron):**
1. Read `scripts/instagram-engage.log.json`
2. Get today's date: `date +%Y-%m-%d`
3. Find today's session entry. Read `session_state`:
   - `today_hashtags` → restore in working memory
   - `hashtag_index` → restore in working memory
   - `cycle_counter` → restore in working memory
   - `last_interval_mins` → restore in working memory (default 0 if absent)
4. Derive `daily_count` and `visited_posts` from `comments[]` (same as Step 1d)
5. Read config (`scripts/instagram-engage.config.json`) for `cfg_min_min`, `cfg_max_min`, `cfg_daily_limit`, `cfg_warning_threshold`
   Read brand voice (`scripts/hara-brand-voice.json`) → store `voice_rules` in working memory
6. Verify Instagram is open and logged in (Step 1b logic — skip 1c entirely)
7. Run `date '+%H:%M:%S'` → `session_start_time`
8. Print:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔁 ig-engage — Ciclo automático (cron)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Hashtags: #<today_hashtags joined with " · #">
📊 Hoy: <daily_count> comentarios ya posteados
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
9. **Go directly to ⛔ LOOP ANCHOR**

**If NO (invoked manually):** continue with Step 1 below.

---

## Step 1: Startup

### 1a. Read config and brand voice

Read `scripts/instagram-engage.config.json` using the Read tool. Store in working memory:
- `cfg_hashtags` — default hashtag list (used as suggestions in Step 1c)
- `cfg_min_min`, `cfg_max_min` — interval range in minutes
- `cfg_daily_limit` — max comments per day
- `cfg_warning_threshold` — warning banner trigger
- `cfg_dm_cycle_frequency` — every N comment cycles, do 1 DM cycle (default 5)
- `cfg_dm_daily_limit` — max DMs per day (default 5)

Read `scripts/hara-brand-voice.json` using the Read tool. Store in working memory:
- `voice_rules` — the `voice_rules` field (used in Step 5 to generate comments)

### 1b. Open Instagram in Chrome

Call `list_pages` to get all open Chrome tabs. Check if any URL contains `instagram.com`.

**Case A — Instagram tab already open:** use it. Proceed to 1c.

**Case B — Chrome is open but no Instagram tab:** Call `new_page` to open a new tab. Then call `navigate_page` with `type: "url"` and `url: "https://www.instagram.com"`. Call `wait_for` with `text: ["Inicio", "Home", "Iniciar sesión", "Log in"]` and `timeout: 15000`.

After loading, call `take_snapshot`. Check the a11y tree:
- If you see a home feed, stories bar, or profile elements → **logged in**, proceed to 1c.
- If you see "Iniciar sesión" / "Log in" / email + password fields → **not logged in**. Print:

```
🔐 Instagram está abierto. Iniciá sesión con la cuenta de Hara Vital y respondé "listo".
```

Wait for the user to respond, then take a new `take_snapshot` to confirm they're logged in. If not yet, wait again.

**Case C — Chrome is not running** (`list_pages` returns empty or errors): Print:

```
🌐 Necesito Chrome abierto. Abrí Chrome (cualquier pestaña) y respondé "listo".
```

Wait for response. Then retry from the top of Step 1b.

### 1c. Ask for today's hashtags

Print the configured defaults and ask which ones to use today:

```
📋 Hashtags guardados: #<cfg_hashtags joined with " · #">

¿Cuáles querés trabajar hoy? Escribilos sin # separados por coma,
o decí "todos" para usar todos los de arriba.
```

Wait for the user's response (plain chat reply — not AskUserQuestion):
- `"todos"` or `"all"` → `today_hashtags = cfg_hashtags`
- Any other text → split by comma, strip whitespace and any leading `#` → `today_hashtags`

Store `today_hashtags` in working memory. This is the list the skill will rotate through for the rest of this session.

### 1d. Load today's session state from the log

Run `date +%Y-%m-%d` via Bash to get today's date string (`TODAY`).

Read `scripts/instagram-engage.log.json` using the Read tool.

From the `sessions` array, find all entries where `date == TODAY`. For each such entry:
- Collect every `post_url` from its `comments` array into an in-memory set: `visited_posts`
- Count entries with `skipped == false` → this is `daily_count` (comments already posted today before this session)

If no entries for today: `daily_count = 0`, `visited_posts = {}`.

> **Note:** `visited_posts` is scoped to today only. Posts from previous days will appear as unvisited — keep volume low (under 30/day) to reduce detection risk from repeat interactions.

Initialise session counters. **If the log has a `session_state` entry for today**, restore `hashtag_index` and `cycle_counter` from it (the session was interrupted mid-day and we're resuming). Otherwise start fresh:
- `hashtag_index = 0` (position in `today_hashtags`, wraps round-robin)
- `cycle_counter = 0` (mod 5: 0,1,2 → pick recent; 3,4 → pick top)

Always initialise:
- `session_posted = 0`
- `session_skipped = 0`
- `session_hashtags_used = []`
- `dm_counter = 0` (or restore from `session_state.dm_counter` if resuming)
- `dm_daily_count = 0`

Also read `scripts/instagram-dm.log.json`. Collect ALL `profile_url` values from its `outreach[]` array into `contacted_profiles` (lifetime dedup — never DM the same person twice). Count entries where `date == TODAY` AND `skipped == false` → `dm_daily_count`.

Run `date '+%H:%M:%S'` via Bash → `session_start_time`.

### 1e. Print startup banner

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌿 ig-engage — Hara Vital
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Hashtags de hoy: #<today_hashtags joined with " · #">
⏱  Intervalo: <cfg_min_min>–<cfg_max_min> min entre ciclos
📊 Hoy: <daily_count> comentarios · <dm_daily_count> DMs
⚠️  Aviso en: <cfg_warning_threshold> | Límite: <cfg_daily_limit> | DMs: cada <cfg_dm_cycle_frequency> ciclos
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ctrl+C durante el sleep para detener en cualquier momento.
```

---

## ⛔ LOOP ANCHOR — Return here after every cycle

---

## Step 2: Check daily limit

If `daily_count >= cfg_daily_limit`:
```
📵 Límite diario alcanzado (<daily_count>/<cfg_daily_limit> comentarios). Sesión terminada.
```
→ go to **Exit Sequence**.

---

## Step 2.5: Route — Comentario o DM

Increment `dm_counter` by 1.

If `dm_counter % cfg_dm_cycle_frequency == 0` AND `dm_daily_count < cfg_dm_daily_limit`:
→ **DM cycle** — skip Steps 3–7 and jump to **Step 3D: DM — Buscar Profesional**.

Otherwise: normal comment cycle → proceed to Step 3.

---

## Step 3: Post Selection

### 3a. Pick current hashtag

Read `today_hashtags[hashtag_index]` → store as `current_hashtag`.

Increment `hashtag_index`. If `hashtag_index >= length(today_hashtags)`, reset to 0.

### 3b. URL-encode the hashtag

Run via Bash:
```bash
python3 -c "import urllib.parse; print(urllib.parse.quote('<current_hashtag>'))"
```
Store the result as `hashtag_encoded`.

### 3c. Navigate to the hashtag page

Call `navigate_page` with `type: "url"` and `url: "https://www.instagram.com/explore/tags/<hashtag_encoded>/"`.

Call `wait_for` with `text: ["publicaciones", "posts", "Reels", "reels"]` and `timeout: 15000`. If it times out, take a `take_snapshot` and proceed anyway.

### 3d. Extract post links

**Primary:** Call `take_snapshot`. Scan the a11y tree text for strings matching the pattern `/p/` followed by alphanumeric characters — these are post links. Collect up to 24 unique `/p/` URLs from the snapshot text (they appear as link hrefs or text nodes).

**Fallback (if take_snapshot yields fewer than 3 post links):** Call `evaluate_script` with:
```javascript
() => {
  const links = document.querySelectorAll('a[href*="/p/"]');
  const urls = Array.from(links).map(a => {
    try { return new URL(a.href).origin + new URL(a.href).pathname; } catch { return a.href; }
  });
  return [...new Set(urls)].filter(u => u.includes('/p/')).slice(0, 24);
}
```

If evaluate_script also returns 0 results, log: `⚠️ No se encontraron posts en la página — Instagram pudo haber cambiado el DOM. Probando siguiente hashtag.` and move on.

All collected URLs should be deduplicated and normalised to `https://www.instagram.com/p/<id>/` form. Instagram renders top posts first, then recent posts below.

Classify:
- `top_pool` = first 4 URLs from the result
- `recent_pool` = remaining URLs (index 4 onward)

### 3e. Filter visited posts and promotional content

Remove any URL in `visited_posts` from both `top_pool` and `recent_pool`.

Also remove posts whose link text (caption preview visible in the hashtag page snapshot) contains **promotional signals**:
- Explicit prices: `$`, `pesos`, `USD`, `valor`, `precio`, `promo`, `oferta`, `descuento`, `lanzamiento`
- Direct booking CTAs: `reservá`, `anotate`, `turnos disponibles`, `agendá`, `link en bio`, `escribinos`, `consultá por DM`, `cupos disponibles`
- Flyer/announcement language: `NUEVO SERVICIO`, `YA DISPONIBLE`, `LANZAMOS`

**Rule:** the filter applies to the **post content**, not the account. A commercial account can post educational/reflective content worth engaging — only skip posts where the primary purpose is selling something specific right now.

If both pools are empty after filtering:
- Print: `⏭ Sin posts nuevos en #<current_hashtag>. Probando siguiente hashtag...`
- Skip to Step 3a with the next hashtag (increment `hashtag_index`)
- If you cycle through ALL hashtags without finding an unvisited post: print `Todos los hashtags agotados por hoy.` → go to **Exit Sequence**

### 3f. Pick one post (3-recent / 2-top rotation)

Based on `cycle_counter mod 5`:
- 0, 1, 2 → **prefer** `recent_pool`
- 3, 4 → **prefer** `top_pool`

Pick the **first available URL** from the preferred pool. If the preferred pool is empty, pick from the other pool.

Increment `cycle_counter` by 1.

Store as `current_post_url`. Add `current_hashtag` to `session_hashtags_used` if not already there.

---

## Step 4: Caption Extraction

### 4a. Navigate to the post

Call `navigate_page` with `type: "url"` and `url: current_post_url`.

### 4b. Wait for post to load

Call `wait_for` with `text: ["Me gusta", "like", "Comment", "Comentar", "Add a comment", "Añadir"]` and `timeout: 10000`.

### 4c. Extract caption

First attempt — `take_snapshot`. Read the a11y tree output. Look for a substantial text block (>20 characters) that appears near the top of the article, typically following the username and before the "Me gusta" / likes count. Copy this text as `current_caption`.

If the snapshot does not clearly show the caption, use `evaluate_script`:
```javascript
() => {
  const article = document.querySelector('article');
  if (!article) return '';
  const all = article.querySelectorAll('span, h1');
  const candidates = Array.from(all)
    .map(el => (el.innerText || '').trim())
    .filter(t =>
      t.length > 20 &&
      !t.match(/^\d/) &&          // skip like counts ("123 Me gusta")
      !t.match(/^hace \d/) &&     // skip timestamps ("hace 2 horas")
      !t.includes('Ver traducción')
    );
  return candidates.slice(0, 4).join(' ').substring(0, 400);
}
```

Store as `current_caption`. If empty, use `"Post sin texto visible"`.

---

## Step 5: Comment Generation

### 5a. Determine if this cycle includes an explicit Hara product reference

Check `cycle_counter mod 5 == 0` (i.e., every 5th cycle: 0, 5, 10…).

- If **YES**: `hara_mention = true` — add a brief, natural second sentence referencing what Hara offers.
- If **NO**: `hara_mention = false` — warm brand presence only, no product reference.

### 5b. Generate the comment

**⚠️ PERSPECTIVA: siempre desde la plataforma.** El comentario viene de @haravital — un directorio que conecta personas buscando terapias holísticas con profesionales como la persona que posteó. La voz es la de una plataforma que VE la demanda y valida al profesional desde ese lugar.

NO hablar como un coach, terapeuta o cuenta de autoayuda. NO dar sabiduría. NO frases motivacionales.
SÍ hablar como una plataforma que conoce lo que sus usuarios buscan y lo conecta con lo que el profesional ofrece.

Generate internally (no sub-agent). Use `voice_rules` from working memory.

**Prompt:**

> Voz de marca: `<voice_rules>`
>
> Caption del post: `<current_caption>`
>
> La cuenta que comenta es @haravital — una plataforma que conecta personas buscando bienestar holístico con profesionales.
>
> Escribí UN comentario en español argentino informal (vos, querés). Reglas:
> - 1-2 oraciones máximo
> - **Siempre desde la perspectiva de la plataforma**: "En Hara vemos personas que...", "Desde Hara notamos que...", "Las personas que llegan a Hara buscan exactamente..."
> - Conectá lo que dice el post con lo que los usuarios de Hara necesitan
> - Validá al profesional desde la demanda real que la plataforma ve
> - Sin hashtags, sin emojis salvo que caigan solos
> - Tono: cálido, directo, nunca clínico ni motivacional
>
> **Estructura modelo:**
> "En Hara [observación sobre lo que ven/buscan los usuarios]. Por eso [reconocimiento del trabajo del profesional]."
>
> **Ejemplos correctos:**
> - (post sobre arteterapia + autoconocimiento): "En Hara vemos personas que saben muy bien qué les duele pero no qué les hace bien. Por eso necesitan exactamente un espacio como el tuyo."
> - (post sobre Reiki en CABA): "Las personas que llegan a Hara buscando Reiki muchas veces no saben bien qué esperan — y eso se nota en cómo describís la primera sesión. Por eso importa."
> - (post reflexivo sobre el bienestar): "Desde Hara notamos que las personas llegan con mucha claridad sobre lo que no quieren, pero poca sobre lo que sí. Bien que haya espacios que trabajen eso."
> - (profesional que abre su espacio): "En Hara sabemos que cuando alguien da ese paso de abrir su espacio, llega con todo. Las personas que te buscan también."
>
> **Anti-patrón absoluto:** "Tan bien dicho esto." / "El autoconocimiento es importante." / "Hermoso espacio." / cualquier frase que podría decir una cuenta de frases motivacionales. **Prohibido.**

**If `hara_mention = true`**: add a natural second sentence that references Hara's offering. Match to what was posted:

| Tipo de post | Ejemplo de mención |
|---|---|
| Profesional abriendo su espacio | "En Hara los profesionales como vos tienen su lugar — el perfil es gratis y el contacto es directo." |
| Contenido educativo del profesional | "Si alguna vez querés que esto llegue más lejos, en el blog de Hara buscan voces del mundo holístico." |
| Alguien buscando/descubriendo prácticas | "En Hara podés encontrar profesionales por modalidad y zona, con mapa." |
| Contenido reflexivo/comunitario | "Esto resuena con lo que construimos en Hara — un espacio para que el bienestar holístico sea más accesible." |

**Test obligatorio antes de incluir la mención:** ¿se lee como continuación natural o como publicidad pegada? Si es lo segundo → no la incluyas, publicá solo el comentario base.

Store the full generated text (base comment + optional Hara line) as `current_comment`.

---

## Step 6: Approval

Display this block (substitute real values):

```
─────────────────────────────────────────────
📍 Hashtag:   #<current_hashtag>
🔗 Post:      <current_post_url>
📝 Caption:   <first 200 chars of current_caption>...
💬 Propuesto: <current_comment>
📊 Hoy:       <daily_count> / <cfg_daily_limit>
─────────────────────────────────────────────
```

Then call `AskUserQuestion`:
```
questions: [{
  question: "¿Qué hacemos con este comentario?",
  header: "Aprobación",
  multiSelect: false,
  options: [
    { label: "Postear", description: "Publicar el comentario en este post" },
    { label: "Saltear", description: "No postear, pasar al próximo ciclo" },
    { label: "Terminar sesión", description: "Guardar el log y ver el resumen" }
  ]
}]
```

---

## Step 7a: If "Postear"

### 7a.1 Locate the comment input

**⚠️ Si el post no carga el formulario de comentarios** (no hay textbox después de 5s): algunos posts de Instagram no renderizan el formulario en ciertas navegaciones. Solución: navegar a `https://www.instagram.com/` (home) primero para que React re-hidrate, luego navegar al URL del post de nuevo. Si sigue sin cargar, saltear el post y elegir otro del mismo hashtag.

Call `take_snapshot`. Scan the a11y tree for a `textbox` or `textarea` whose accessible name or placeholder contains "comment", "comentario", "Add a comment", or "Añadir un comentario". Note its `uid`.

If not visible, scroll down on the page with:
```javascript
() => { window.scrollBy(0, 400); }
```
Then take another `take_snapshot`.

### 7a.2 Click and type the comment

Call `click` with the comment input's `uid`.

Call `type_text` with `text: current_comment`.

### 7a.3 Submit the comment

Call `type_text` with `text: ""` and `submitKey: "Enter"`.

If that doesn't work (take_snapshot shows comment still in input after 3 seconds), look for a "Post" or "Publicar" button in a new snapshot and `click` it.

### 7a.4 Confirm submission

Call `wait_for` with the first 20–25 ASCII-safe characters of `current_comment` (avoid leading accented characters like ¡/¿) and `timeout: 8000`.

**Fallback if wait_for times out:** Take a `take_snapshot`. If the comment input field is empty (placeholder text "Add a comment…" / "Añadir un comentario…" is visible again), the comment was successfully posted. If the input still contains text, attempt to submit once more before moving on.

### 7a.5 Update session state

- Add `current_post_url` to `visited_posts`
- `daily_count += 1`
- `session_posted += 1`
- Get time: `date '+%H:%M:%S'` → `posted_at`
- Run **Log Update Procedure** (see below) with `skipped: false`

### 7a.6 Check thresholds

**Warning:** if `daily_count >= cfg_warning_threshold` AND `daily_count < cfg_daily_limit`:

Print:
```
⚠️  AVISO: <daily_count> comentarios hoy
Estás por encima de la zona segura (20–30/día).
El riesgo de detección aumenta a partir de acá.
```

Call `AskUserQuestion`:
```
questions: [{
  question: "¿Seguir comentando?",
  header: "Zona de riesgo",
  multiSelect: false,
  options: [
    { label: "Sí, continuar", description: "Seguir hasta el límite diario" },
    { label: "Terminar sesión", description: "Guardar y salir ahora" }
  ]
}]
```

If "Terminar sesión" → go to **Exit Sequence**.

**Hard limit:** if `daily_count >= cfg_daily_limit`:
```
📵 Límite diario alcanzado (<daily_count>/<cfg_daily_limit>). Sesión terminada automáticamente.
```
→ go to **Exit Sequence**.

Proceed to **Step 8: Interval Wait**.

---

## Step 7b: If "Saltear"

- Add `current_post_url` to `visited_posts`
- `session_skipped += 1`
- Get time: `date '+%H:%M:%S'` → `posted_at`
- Run **Log Update Procedure** with `skipped: true`, `comment_text: null`

Proceed to **Step 8: Interval Wait**.

---

## Step 7c: If "Terminar sesión"

→ go to **Exit Sequence**.

---

## Step 3D: DM — Buscar Profesional

*(Solo cuando Step 2.5 redirige acá)*

### 3Da. Navegar a hashtag y encontrar un post de un profesional

Usar `current_hashtag` del ciclo actual (ya calculado en Step 2.5 via el mismo `hashtag_index`).

Navegar a `https://www.instagram.com/explore/tags/<hashtag_encoded>/`.

`take_snapshot` — extraer hasta 10 URLs de posts (`/p/`). Para cada una, intentar identificar el autor desde el snapshot. Si no es claro, navegar al post y leer el username del autor.

Filtrar perfiles ya en `contacted_profiles`. Si todos los perfiles visibles ya fueron contactados, moverse al siguiente hashtag.

Store: `dm_post_url` (URL del post desde donde llegamos), `dm_profile_url` (`https://www.instagram.com/<username>/`), `dm_username`.

---

## Step 4D: DM — Evaluar Fit

Navegar a `dm_profile_url`.

`wait_for` con `text: ["publicaciones", "seguidores", "followers"]` y `timeout: 10000`.

`take_snapshot`. Leer la bio.

Si `evaluate_script` es necesario para leer la bio completa:
```javascript
() => {
  const header = document.querySelector('header');
  return header ? header.innerText : '';
}
```

Store `dm_bio`.

**Criterio de fit — único y amplio:** ¿Esta persona trabaja en bienestar holístico, sanación, terapias alternativas, prácticas energéticas, o espiritualidad? Si la bio o sus posts recientes mencionan *cualquier* combinación de: terapia, terapeuta, sanación, holístico, bienestar, energía, meditación, yoga, reiki, chakra, constelaciones, registros, akáshico, coaching, coach, mentoría, retiro, facilitadora, facilitador, sesión, taller, workshop, floral, curación, mindfulness, espiritual, integrativo — o cualquier variante similar — `dm_fit = true`.

**Si `dm_fit = false`:** Agregar a `contacted_profiles` para no volver a intentar. Print `⏭ No es del espacio holístico — pasando al siguiente.` Intentar con el siguiente perfil del mismo hashtag (volver al inicio de Step 3D con el próximo candidato).

---

## Step 5D: DM — Generar mensaje

**Tono de referencia real** — este es el estilo exacto de los DMs que ya funcionaron:

> "Hola Silvia! Soy Belén. Un gusto! Que bueno que se quieran sumar. Te paso el link directo del formulario para completar. Mientras más campos y más completo mejor, aparecen mas arriba en el buscador https://haravital.app/registro
> Cualquier duda me avisan 🤍 Gracias por sumarse."

**Estructura del DM:**
1. Saludo con el nombre del profesional + "Soy Belén de Hara Vital"
2. Una oración genuina y específica sobre su trabajo (demuestra que miraste el perfil)
3. Invitación directa con el link: `https://haravital.app/registro`
4. Tip de completitud: "Mientras más completo el perfil, más arriba aparecen en el buscador"
5. Cierre cálido: "Cualquier duda me avisan 🤍"

**Para generar:**

Primero extraé el **primer nombre** de `dm_username` o `dm_bio`. Ejemplo: si la bio dice "Hola soy Ana, terapeuta..." → usar "Ana". Si no está claro, usar el username sin @ ni underscore.

Generar internamente. Prompt:

> Bio del profesional: `<dm_bio>`
> Usuario: @`<dm_username>`
> Hashtag: #`<current_hashtag>`
>
> Escribí un DM en español argentino informal de Belén (de Hara Vital) a este profesional.
> Seguí esta estructura exacta:
>
> "Hola [nombre]! Soy Belén de Hara Vital. [Una oración específica sobre su trabajo basada en la bio — que demuestre que lo/la miraste]. Te paso el link para sumarte al directorio: https://haravital.app/registro — mientras más completo el perfil, más arriba aparecés en el buscador. Cualquier duda acá estamos 🤍"
>
> Reglas:
> - Siempre incluir el link haravital.app/registro
> - La oración sobre su trabajo debe ser MUY específica (su modalidad, su ciudad si está en la bio, algo concreto)
> - Máximo 4-5 oraciones en total
> - Tono: cálido, directo, personal — no corporativo

Store como `dm_text`.

---

## Step 6D: DM — Aprobación

Mostrar:
```
────────────────────────────────────────────
💬 DM CYCLE (<dm_daily_count + 1>/<cfg_dm_daily_limit> hoy)
👤 Perfil:  @<dm_username>
🔗 URL:     <dm_profile_url>
📝 Bio:     <first 120 chars of dm_bio>...
✉️  DM:      <dm_text>
────────────────────────────────────────────
```

`AskUserQuestion`:
```
question: "¿Enviamos este DM?"
header: "DM Aprobación"
options:
  - label: "Enviar"     description: "Mandar el DM a @<dm_username>"
  - label: "Saltear"    description: "No contactar a esta persona"
  - label: "Terminar"   description: "Salir de la sesión"
```

---

## Step 7D: DM — Enviar o Saltear

**Si "Enviar":**

1. Navegar de vuelta a `dm_profile_url` si no estamos ahí.
2. `take_snapshot` — buscar botón "Enviar mensaje" / "Message". Clickear.
3. `wait_for` con `text: ["Mensaje", "Message", "Enviar"]` y `timeout: 10000`.
4. Si aparece un diálogo de confirmación ("¿Enviar solicitud?") → clickear confirmar.
5. `take_snapshot` para localizar el input de mensaje. `click` en él.
6. `type_text` con `text: dm_text`.
7. `type_text` con `text: ""` y `submitKey: "Enter"`. Si no envía, buscar botón "Enviar" y clickear.
8. `wait_for` con los primeros 20 chars de `dm_text` y `timeout: 8000`. Si timeout → `take_snapshot`, si el input está vacío el DM fue enviado.
9. Agregar `dm_profile_url` a `contacted_profiles`.
10. `dm_daily_count += 1`. Run **DM Log Update Procedure**.

**Si "Saltear":** Agregar `dm_profile_url` a `contacted_profiles` (no volver a intentar). Run DM Log Update Procedure con `skipped: true`.

**Si "Terminar":** → **Exit Sequence**.

Proceed to **Step 8: Schedule Next Cycle via Cron**.

---

## DM Log Update Procedure

Llamar después de cada DM enviado o salteado.

1. Read `scripts/instagram-dm.log.json`
2. Preparar registro:
   - **Enviado:** `{"date": "<TODAY>", "profile_url": "<dm_profile_url>", "username": "<dm_username>", "hashtag": "<current_hashtag>", "bio_snippet": "<first 80 chars of dm_bio>", "dm_text": "<dm_text>", "sent_at": "<HH:MM:SS>", "skipped": false}`
   - **Salteado:** `{"date": "<TODAY>", "profile_url": "<dm_profile_url>", "username": "<dm_username>", "hashtag": "<current_hashtag>", "bio_snippet": "<first 80 chars of dm_bio>", "dm_text": null, "sent_at": "<HH:MM:SS>", "skipped": true}`
3. Append al array `outreach[]`
4. Write el JSON completo a `scripts/instagram-dm.log.json`

---

## Step 8: Schedule Next Cycle via Cron

Instead of blocking with sleep, schedule the next cycle as a one-shot cron job and end the current session.

### 8a. Compute the target time with variation

Intervals must look human — never two similar values in a row. Use a **band-switching** strategy using thirds of the configured range. Substitute actual config values for `cfg_min` and `cfg_max`:

```bash
python3 -c "
import datetime, random
last = <last_interval_mins>   # from session_state, or 0 if first cycle
cfg_min = <cfg_min_min>
cfg_max = <cfg_max_min>
span = cfg_max - cfg_min
low_top  = cfg_min + span // 3          # bottom third ceiling
high_bot = cfg_min + 2 * (span // 3)   # top third floor
if last == 0:
    mins = random.randint(cfg_min, cfg_max)
elif last <= low_top:                   # last was low → pick high
    mins = random.randint(high_bot, cfg_max)
elif last >= high_bot:                  # last was high → pick low
    mins = random.randint(cfg_min, low_top)
else:                                   # last was mid → pick either band
    band = random.choice(['low', 'high'])
    mins = random.randint(cfg_min, low_top) if band == 'low' else random.randint(high_bot, cfg_max)
now = datetime.datetime.now()
target = now + datetime.timedelta(minutes=mins)
print(f'MINS={mins}')
print(f'CRON_EXPR={target.minute} {target.hour} {target.day} {target.month} *')
print(f'TARGET_TIME={target.strftime(\"%H:%M\")}')
"
```

Store: `random_mins`, `cron_expr`, `target_time`.

### 8b. Save session state to log

Before creating the cron, update `session_state` in today's log entry with current in-memory values:
```json
"session_state": {
  "today_hashtags": [...],
  "hashtag_index": <current value>,
  "cycle_counter": <current value>,
  "dm_counter": <current value>
}
```

Run the **Log Update Procedure** with the state update included (or write the full log if the procedure already ran).

### 8c. Create the one-shot cron

Call `CronCreate` with:
- `cron`: the computed `cron_expr` (e.g. `"32 19 10 6 *"`)
- `prompt`: `"Retomar sesión ig-engage — cron-resume. Invocar el skill ig-engage. El proyecto está en /Users/belumontoya/Desktop/greenbit/hara. Leer session_state desde scripts/instagram-engage.log.json y continuar desde el LOOP ANCHOR."`
- `recurring`: `false`
- `durable`: `true`

### 8d. Confirm and end session

Print:
```
⏳ Próximo ciclo programado para las <target_time> (~<random_mins> min).
   El cron lo retomará automáticamente.
   ⚠️  Mantené esta ventana de Claude Code abierta — el cron vive en la sesión.
```

**Do NOT return to the ⛔ LOOP ANCHOR.** The current session ends here. The cron will invoke a fresh ig-engage in cron-resume mode.

---

## Log Update Procedure

Call this after every Post or Skip action.

1. Read `scripts/instagram-engage.log.json` with the Read tool
2. Get today's date: `date +%Y-%m-%d`
3. Find the entry in `sessions[]` where `date == today`
   - If found: use it
   - If not found: create `{"date": "<today>", "daily_count": 0, "session_state": {}, "comments": []}`
4. Append a record to its `comments[]`:
   - **Posted:** `{"post_url": "<current_post_url>", "hashtag": "<current_hashtag>", "comment_text": "<current_comment>", "posted_at": "<posted_at>", "skipped": false}`
   - **Skipped:** `{"post_url": "<current_post_url>", "hashtag": "<current_hashtag>", "comment_text": null, "posted_at": "<posted_at>", "skipped": true}`
5. Update `daily_count` to the current in-memory value *(informational only)*
6. Update `session_state` with current in-memory values:
   ```json
   "session_state": {
     "today_hashtags": [...],
     "hashtag_index": <current value>,
     "cycle_counter": <current value>,
     "dm_counter": <current value>,
     "last_interval_mins": <random_mins from Step 8a, or 0 if not yet computed>
   }
   ```
7. Write the complete updated JSON back to `scripts/instagram-engage.log.json` with the Write tool

---

## Exit Sequence

1. Write final in-memory log state to `scripts/instagram-engage.log.json`
2. Get end time: `date '+%H:%M:%S'`
3. Build unique hashtag list from `session_hashtags_used`, joined with `" · #"`, prefix first with `#`
4. Write daily MD log to `scripts/logs/<TODAY>.md` (create the `logs/` folder if needed):
   - Table of posted comments: hora · hashtag · URL del post
   - List of hashtags worked
   - Brief summary (count, Hara mentions)
   - **Append** if the file already exists (the day may have had multiple sessions)
5. Read `scripts/instagram-dm.log.json`. Count entries where `date == TODAY` AND `skipped == false` → `dms_sent_today`.

6. Write daily MD log to `scripts/logs/<TODAY>.md` (create the `logs/` folder if needed):
   - Table of posted comments: hora · hashtag · @cuenta · texto del comentario
   - Table of DMs sent: hora · @perfil · bio snippet
   - List of hashtags worked
   - Summary counts
   - **Append** if the file already exists

7. Print summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ig-engage — Sesión terminada
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 Comentarios posteados: <session_posted>
✉️  DMs enviados hoy:      <dms_sent_today>
⏭  Posts salteados:       <session_skipped>
📊 Total hoy:             <daily_count> / <cfg_daily_limit>
#️⃣  Hashtags cubiertos:   <formatted hashtag list, or "ninguno" if empty>
🕐 Sesión:                <session_start_time> → <end_time>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

8. Skill ends.
