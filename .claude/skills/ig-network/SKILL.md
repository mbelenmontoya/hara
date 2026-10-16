---
name: ig-network
description: |
  Hara Vital network audit on Instagram. Reads active professionals from Supabase (read-only) and, by default, audits only the ones not audited yet; with --all it audits everyone. Opens each Instagram handle in the logged-in Chrome, classifies each one as valid, invalid or renamed_or_uncertain, checks whether @haravital already follows them, and writes a log plus a report. Read-only: it never follows, comments, shares or edits Supabase. Use when the user says "ig-network", "auditar los instagram de los profesionales", "revisar los handles", "chequear qué profesionales seguimos", or asks whether the professionals' Instagram accounts exist. Do NOT use for hashtag commenting or DMs to strangers (that is ig-engage).
---

# ig-network: auditoría de Instagram de profesionales de Hara

Esta versión solo tiene el modo **audit**, que es de solo lectura. Abre cada perfil, observa y registra.

## Importante

- **No hagas ninguna acción de escritura en Instagram.** No sigas cuentas, no des like, no comentes, no compartas y no mandes DMs. Los follows y el descubrimiento de contenido son fases futuras que el usuario habilita después de revisar el resultado del audit.
- **Supabase es solo lectura.** `network.py` hace un único `SELECT` de profesionales activos. Nunca escribas en la base. Si un handle está mal, va al reporte y el usuario decide.
- **La skill no corre sola.** Corre cuando el usuario la lanza, y por defecto solo audita a los profesionales nuevos.
- **La clave del log es `professional_id`, no el handle**, porque el audit puede descubrir que un handle cambió.
- **Toda la lectura y escritura de archivos pasa por `scripts/network.py`.** No edites el log a mano.
- **Una coincidencia de nombre no alcanza para marcar `valid` si hay algo raro.** Ante la duda, marcá `renamed_or_uncertain` y explicá la evidencia.

## Archivos

Las credenciales salen de `.env.local` (`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`). Los demás archivos están en `scripts/` en la raíz del repo y en `.gitignore`, porque son datos de producción.

| Archivo | Qué es |
|---|---|
| `instagram-network.professionals.json` | Copia de la lista de Supabase (`professional_id`, `name`, `instagram`). `plan` la reescribe en cada corrida. `record` y `report` la leen. |
| `instagram-network.log.json` | Estado por `professional_id`: `last_profile_check`, `last_content_check`, `last_shared_at`, `last_followed_at`, `status`, `instagram_db` (el valor de la base cuando se auditó), `resolved_url`, `hara_follows`, `follows_hara`, `is_private`, `evidence`, `candidates`. |
| `logs/network-audit-<fecha>.md` | Reporte legible del audit. |

## Paso 1: Planificar

Desde la raíz del repo:

```bash
python3 .claude/skills/ig-network/scripts/network.py plan
```

Trae de Supabase los profesionales activos con Instagram y devuelve solo los que hay que auditar:
- **`new`**: todavía no están en el log (por ejemplo, registros nuevos en la app);
- **`instagram_changed`**: el profesional cambió su Instagram en la base después del último audit.

Usá `plan --all` solo si el usuario pide auditar a todos de nuevo. En ese caso todos los items salen con `reason: "all"`.

Devuelve un JSON con `items`. Cada item trae `handle` normalizado, `format_ok`, `reason` y, si el formato es inválido, `variants` para probar. Si el script corta con un `ERROR`, mostrale el mensaje al usuario y pará.

Si `due` es 0, decí `No hay profesionales nuevos para auditar.` y terminá ahí, sin abrir Chrome. Si no, mostrá un resumen corto: total en la base, cuántos toca auditar y por qué, y cuáles tienen formato inválido.

## Paso 2: Abrir Instagram en Chrome

Usá las herramientas de Claude in Chrome (`mcp__claude-in-chrome__*`), cargadas en una sola llamada a ToolSearch:

```
select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__tabs_close_mcp
```

1. Llamá `tabs_context_mcp` y después `tabs_create_mcp` para trabajar en una pestaña propia.
2. Navegá a `https://www.instagram.com/`.
3. Confirmá que la sesión está iniciada con la cuenta de Hara. Si ves el formulario de login, decile al usuario: `🔐 Iniciá sesión en Instagram con la cuenta de Hara Vital y avisame.` y esperá. Nunca escribas credenciales.

## Paso 3: Auditar cada profesional

Para cada item, en orden:

**Si `format_ok` es false:**
- Si `variants` está vacío (por ejemplo `invites/contact`), no navegues. Registralo como `invalid` con la evidencia `formato inválido: no es un username`.
- Si hay `variants`, probá cada una con el procedimiento de abajo. Si alguna existe y su nombre o bio coincide con el profesional, registralo como `renamed_or_uncertain` con esa URL en `resolved_url`. Si ninguna existe, registralo como `invalid`. Una variante encontrada **nunca** es `valid`, porque es una suposición que el usuario tiene que confirmar.

**Procedimiento de lectura de un perfil:**

1. Navegá a `https://www.instagram.com/<handle>/`.
2. Leé el estado del perfil con `javascript_tool`. El snippet espera a que el perfil termine de cargar antes de leer:

```javascript
const pageText = () => document.querySelector('main')?.innerText ?? '';
const headerButtons = () =>
  [...document.querySelectorAll('header button, header [role=button]')].map(b => b.innerText.trim());
const FOLLOW_STATES = /^(Follow|Following|Follow Back|Requested|Seguir|Siguiendo|Seguir también|Solicitado)$/;
const ready = () =>
  headerButtons().some(t => FOLLOW_STATES.test(t) || /^(Message|Enviar mensaje)$/.test(t))
  || /isn't available|no está disponible|This (profile|account) is private|(Este perfil|Esta cuenta) es privad[oa]/i.test(pageText());
if (!ready()) {
  await new Promise(resolve => {
    const observer = new MutationObserver(() => { if (ready()) { observer.disconnect(); resolve(); } });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
({
  path: location.pathname,
  header: document.querySelector('header')?.innerText ?? '',
  notFound: /isn't available|no está disponible/i.test(pageText()),
  isPrivate: /This (profile|account) is private|(Este perfil|Esta cuenta) es privad[oa]/i.test(pageText()),
  followButton: headerButtons().find(t => FOLLOW_STATES.test(t)) ?? null
})
```

**Por qué no hay `setTimeout`:** la pestaña de la skill suele quedar oculta detrás de otra ventana, y Chrome frena los timers de las pestañas ocultas. Una espera de 2 segundos puede tardar un minuto y cortar la llamada por timeout. El `MutationObserver` no se frena, y además espera lo justo: hasta que aparece el botón de seguir o el mensaje de error. Esperar solo a que aparezca el `header` no alcanza, porque el header carga antes que los botones.

Si la llamada se corta por timeout (45 segundos), volvé a ejecutar el mismo snippet una vez. Si vuelve a cortarse, la página no cargó: aplicá el punto 5.

3. Clasificá:

| Lo que ves | status |
|---|---|
| `notFound` es `true` | `invalid` (antes de darlo por cerrado, pasa por el Paso 3b) |
| El perfil carga y el nombre o la bio coinciden con el profesional, o la bio es claramente de una práctica holística y nada contradice que sea esa persona | `valid` |
| El perfil carga pero no se parece al profesional (otro nombre, otro rubro, cuenta vacía o de marca ajena) | `renamed_or_uncertain` |

4. Leé también:
   - `hara_follows`: sale de `followButton`, que es el texto exacto del botón de seguir. No lo busques en el texto del `header`, porque la bio también puede decir "Follow" o "Seguir".

   - `follows_hara`: si el profesional sigue a Hara. Sale del mismo botón.

     | `followButton` | `hara_follows` | `follows_hara` |
     |---|---|---|
     | `Following` / `Siguiendo` | `true` | `null` |
     | `Follow Back` / `Seguir también` | `false` | `true` |
     | `Follow` / `Seguir` | `false` | `false` |
     | `Requested` / `Solicitado` (cuenta privada con solicitud pendiente) | `false`, y agregá `solicitud pendiente` a la evidencia | `null` |
     | `null` | `null` | `null` |

     `follows_hara` queda `null` cuando Hara ya sigue al profesional, porque en ese caso Instagram muestra "Following" y no dice si la otra persona sigue a Hara. No lo adivines.

     Si el perfil cargó y `followButton` es `null`, Instagram cambió el botón. Anotalo en la evidencia para revisar el snippet.
   - `is_private`: el valor de `isPrivate`.
5. Si la página no cargó (spinner, error de red), reintentá una vez. Si sigue igual, registrá `renamed_or_uncertain` con la evidencia `no cargó`.

**Registrar el resultado** inmediatamente después de cada perfil, para que una interrupción no pierda trabajo:

```bash
python3 .claude/skills/ig-network/scripts/network.py record '{"professional_id":"<id>","status":"valid","handle_checked":"<handle>","resolved_url":"https://www.instagram.com/<handle>/","hara_follows":false,"follows_hara":true,"is_private":false,"evidence":"bio: Reiki y registros akáshicos, Córdoba"}'
```

`evidence` es una frase corta con lo que viste y justifica el status. Para `valid`, citá el nombre o la bio. Para los otros dos, explicá qué no coincide.

Imprimí una línea por perfil: `✓ Nombre → valid (sigue: no)`, `✗ Nombre → invalid`, `? Nombre → renamed_or_uncertain`.

**Ritmo:** es solo lectura, pero son muchas visitas seguidas. Cada 10 perfiles mostrá el progreso. Si Instagram muestra "Intentá de nuevo más tarde" / "Try again later" o un challenge, **pará**, avisale al usuario y no sigas. Lo que ya está registrado queda guardado, y la próxima corrida retoma desde los pendientes.

## Paso 3b: Buscar cuentas renombradas

Instagram muestra "Sorry, this page isn't available" tanto si la cuenta se borró como si cambió de nombre o bloqueó a Hara. Por eso, antes de dar por `invalid` a alguien, buscalo por nombre. Hacé este paso para cada profesional que quedó `invalid` en el Paso 3, incluidos los de formato inválido.

**Saltealo** si el nombre del profesional tiene una sola palabra (por ejemplo "Dalila"). Con un solo nombre la búsqueda devuelve cientos de homónimos y no prueba nada. Dejalo `invalid` y agregá a la evidencia `nombre de una palabra, no se buscó`.

**1. Buscar.** Una búsqueda por llamada a `javascript_tool`, en la pestaña de Instagram. Usa el buscador interno de Instagram con la sesión de Hara y es de solo lectura:

```javascript
const name = '<nombre del profesional>';
const r = await fetch('/web/search/topsearch/?context=blended&query=' + encodeURIComponent(name));
const j = await r.json().catch(() => null);
const n = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const tokens = n(name).split(/\s+/).filter(t => t.length > 2);
({
  status: r.status,
  hits: (j?.users ?? []).map(u => u.user)
    .filter(u => { const words = n(u.full_name).split(/[^a-z0-9]+/); return tokens.every(t => words.includes(t)); })
    .slice(0, 4)
    .map(u => ({ username: u.username, full_name: u.full_name, is_private: u.is_private }))
})
```

El filtro compara palabras completas, no partes de palabras. Sin eso, "Eri Pantano" coincide con "Federico Pantano". Si `status` no es 200, pará y avisale al usuario: el buscador cambió o Instagram está limitando.

Si ningún candidato de esta búsqueda califica (ver punto 2), repetila una vez con `name + ' terapias'` como query, sin cambiar los `tokens` del filtro. La búsqueda solo por nombre a veces no trae la cuenta profesional entre los primeros resultados. Así apareció `fluirconscienteterapias` para Guadalupe Rodríguez.

**2. Verificar cada candidato** (máximo 4). Abrilo con el mismo procedimiento de lectura del Paso 3 y mirá la bio. Un candidato **califica** si se cumple una de estas dos condiciones:
- la bio es de una práctica holística o de bienestar;
- es el único resultado con ese nombre completo y la bio no muestra claramente otra profesión (por ejemplo "Escritora · Profesora de Lengua" no califica).

Si hay varios homónimos y ninguno tiene una bio holística, ninguno califica. Una cuenta privada solo califica si es el único resultado.

**3. Registrar.**
- Si al menos un candidato califica, el status es `renamed_or_uncertain`. En `resolved_url` va el candidato más fuerte. En `candidates` van todos los que calificaron, cada uno con una evidencia corta.
- Si ninguno califica, queda `invalid`. Agregá a la evidencia `buscado por nombre, sin candidatos`.

```json
{"professional_id":"<id>","status":"renamed_or_uncertain","handle_checked":"yogayfloresok","resolved_url":"https://www.instagram.com/yogaenred.alborterapias/","evidence":"handle de la DB no existe; candidato por nombre","candidates":[{"username":"yogaenred.alborterapias","full_name":"Lic. Victoria Garino | Yoga & Terapias","evidence":"yoga y terapias, mismo nombre"}]}
```

Un candidato nunca pasa a `valid`. Que sea la misma persona lo confirma el usuario.

## Paso 4: Reporte

```bash
python3 .claude/skills/ig-network/scripts/network.py report
```

Genera `scripts/logs/network-audit-<fecha>.md`, ordenado por problema primero (`invalid`, `renamed_or_uncertain`, sin revisar, `valid`). Cerrá la pestaña que abriste con `tabs_close_mcp`.

Al usuario mostrale:
- los conteos por status;
- la lista de `invalid` y `renamed_or_uncertain` con la evidencia de cada uno;
- cuántos `valid` Hara todavía no sigue (esto alimenta la fase de follows).

No propongas corregir Supabase por tu cuenta. El reporte es el insumo para que el usuario decida.

## Verificación

- `plan` (sin `--all`) después del audit debe mostrar `due: 0`.
- La cantidad de filas del reporte debe coincidir con `total_db` de `plan`.
- Cada fila revisada tiene `evidence` no vacía.

## Problemas comunes

**`ERROR: no existe .env.local` o `faltan en .env.local`.** La skill necesita `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`. Pedíselos al usuario. No los busques en otro lado.

**`ERROR: Supabase respondió 401` (o 403).** La clave de `.env.local` no es válida o se rotó. Avisale al usuario y pará.

**El `header` viene vacío.** Instagram a veces tarda en hidratar la página. Esperá y volvé a leer una vez, o usá `get_page_text` y buscá los mismos textos.

**Todos los perfiles salen `invalid` de golpe.** Casi seguro la sesión se cerró o Instagram está limitando. Pará y revisá la página de inicio antes de seguir registrando.

## Fuera de alcance en esta versión

Estas fases están acordadas con el usuario pero **no** se ejecutan hasta que las habilite:

- **Follow:** automático con máximo `follow_daily_limit` (5) por día, solo a profesionales `valid` que Hara no sigue, con registro en `last_followed_at` y nunca unfollow.
- **Descubrir contenido:** revisar posts recientes, clasificarlos (educativo, práctica, sesión, evento, reflexión) y recomendarlos con profesional, post, fecha, resumen, por qué sirve y acción propuesta (`share_to_story`, `comment`, `skip`). Toda publicación requiere aprobación. Si el share nativo no está disponible, se marca `manual_required` y nunca se descarga ni se republica contenido ajeno.

## Cuándo NO usar

- Comentar en posts de hashtags o mandar DMs a desconocidos: eso es `ig-engage`.
- Editar datos de profesionales: eso se hace en el admin de Hara, no desde esta skill.
