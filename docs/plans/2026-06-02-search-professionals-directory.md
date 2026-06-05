# Search Motor — Directorio de Profesionales Implementation Plan

Created: 2026-06-02
Author: belu.montoya@dialpad.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Usuarios pueden buscar en `/profesionales` por nombre, práctica o síntoma (incluyendo aliases del catálogo) con filtrado client-side instantáneo y soporte completo de normalización de acentos.

## Out of Scope

- Filtros adicionales (país, modalidad, precio, Destacado) — v2
- Chips de práctica clicables — v2
- URL params / server-side search — directorio pequeño, client-side alcanza
- Búsqueda en `short_description` o `bio` — ruidosa para MVP
- Autocomplete / sugerencias dropdown — v2

## Approach

**Chosen:** Server shell + client island — `DirectoryPage` (server) fetches professionals + practices catalog en paralelo, pasa ambos datasets a nuevo `ProfessionalsDirectory` (client) que gestiona estado de búsqueda y filtrado.

**Why:** Mantiene SSR y frescura de datos (ranking, Destacado expiry) mientras agrega interactividad instantánea sin costo de red por keystroke. La misma arquitectura que Next.js App Router recomienda para "interactive islands". Costo: el bundle del cliente crece ~5 KB por el componente nuevo.

## Context for Implementer

`lib/practices.ts` está marcado como "Server-only — Do NOT import from client components". La restricción es sobre el módulo (que importa `supabaseAdmin`), no sobre el tipo. Usar `import type { Practice } from '@/lib/practices'` es explícitamente permitido por el comentario del archivo y es borrado en compile-time. La función `normalize` (strip NFD accents) existe en `lib/admin-practices.ts:50` y `PracticeMapper.tsx:21` — se inlinea nuevamente en el componente nuevo para no expandir scope con un refactor de shared-utils.

## Runtime Environment

- **Start:** `npm run dev` — `localhost:3000`
- **Target page:** `http://localhost:3000/profesionales`

## File Structure

- `app/profesionales/components/ProfessionalsDirectory.tsx` (create) — client component con estado de búsqueda, lógica de filtrado, y toda la UI del directorio (input + grid + cards)
- `app/profesionales/page.tsx` (modify) — server component: agrega `practices` al SELECT, fetches catálogo en paralelo, delega rendering al nuevo componente

## Progress Tracking

- [x] Task 1: Crear `ProfessionalsDirectory` client component con filtrado por nombre, prácticas y aliases
- [x] Task 2: Actualizar server page para alimentar el componente con datos de professionals + catálogo

## Implementation Tasks

---

### Task 1: Crear `ProfessionalsDirectory` client component

**Objective:** Construir el componente client-side que recibe la lista de profesionales y el catálogo de prácticas, gestiona el estado de búsqueda, filtra con `useMemo`, y renderiza el input de búsqueda + grid de cards. Este componente exporta también el tipo `DirectoryProfessional` para que el server page lo consuma.

**Files:**

- Create: `app/profesionales/components/ProfessionalsDirectory.tsx`

**Key Decisions / Notes:**

- `'use client'` directiva al tope del archivo
- Exportar `DirectoryProfessional` interface desde este archivo (el server page la importará de acá, no al revés — dependency flows page → component)
- `import type { Practice } from '@/lib/practices'` — type-only import, no bundlea el módulo server-side
- Mover desde `app/profesionales/page.tsx`: `ProfessionalCard`, `formatLocation`, `formatPrice`, `formatModality` (parecen locales pero el server page las va a perder — se mudan íntegras)
- `normalize(s: string): string` — inline: `s.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')`
- `buildPracticeIndex(practices: Practice[]): Map<string, string[]>` — para cada práctica, pre-computa array de términos normalizados: `[normalize(p.key), normalize(p.label), ...p.aliases?.map(normalize) ?? []]`
- En `ProfessionalsDirectory` component: `practiceIndex = useMemo(() => buildPracticeIndex(practices), [practices])` — solo re-corre si practices cambia (no cambia durante la sesión)
- Filter lógica en `useMemo`: si `!q` → return all; sino matchear `normalize(pro.full_name).includes(q)` OR `pro.specialties?.some(s => normalize(s).includes(q))` OR `pro.practices?.some(key => practiceIndex.get(key)?.some(t => t.includes(q)))`
- Search input: reusar el mismo estilo que `AdminFilterBar.tsx:45-64` (input `pl-9 pr-9`, SVG lupa izquierda, botón ✕ derecha al tener texto). Placeholder: `"Buscá por nombre, práctica o síntoma..."`
- Mostrar `"{n} resultado{s}"` SOLO cuando hay una búsqueda activa (`searchValue.trim().length > 0`), usando `text-xs text-muted mt-2`
- EmptyState cuando `searchValue && filtered.length === 0`: `title="Sin resultados"` + `description="Probá con otro término."`
- `isEffectivelyDestacado` se importa de `lib/ranking` (módulo isomorphic, no usa supabase — seguro en client)

**Definition of Done:**

- [ ] El componente renderiza el grid completo de cards cuando `searchValue` está vacío
- [ ] Typing "reiki" filtra a solo los profesionales que tienen esa práctica (por key, label o alias)
- [ ] Typing "sanaciones ancestrales" encuentra profesionales con práctica `constelaciones-familiares` (alias match)
- [ ] Typing sin acentos ("meditacion") encuentra profesionales con "meditación" (normalize)
- [ ] Typing un término sin match muestra el EmptyState correcto
- [ ] El botón ✕ limpia el input y vuelve a mostrar todos
- [ ] `tsc --noEmit` pasa sin errores en este archivo
- [ ] Verify: `npx tsc --noEmit 2>&1 | grep -i "ProfessionalsDirectory" || echo "OK"`

---

### Task 2: Actualizar server page para fetching paralelo y delegación al client component

**Objective:** Actualizar `app/profesionales/page.tsx` para (1) agregar la columna `practices` al SELECT, (2) fetchear el catálogo de prácticas en paralelo con los profesionales, y (3) reemplazar el rendering del grid por `<ProfessionalsDirectory>`, eliminando el código movido al componente.

**Files:**

- Modify: `app/profesionales/page.tsx`

**Key Decisions / Notes:**

- Importar `DirectoryProfessional` y `ProfessionalsDirectory` desde `'./components/ProfessionalsDirectory'`
- Importar `getActivePractices` desde `'@/lib/practices'` (función server-side, correcta acá)
- En `DirectoryPage`: usar `Promise.all` para fetchear en paralelo:
  ```ts
  const [professionals, practices] = await Promise.all([
    getProfessionals(),
    getActivePractices().catch(err => { logError(err, { source: 'DirectoryPage.getActivePractices' }); return [] }),
  ])
  ```
- Si `getActivePractices` falla, el catch devuelve `[]` — la búsqueda sigue funcionando por nombre y specialties (sin aliases ni practice labels)
- Actualizar `getProfessionals()` SELECT: agregar `practices` a la lista de columnas
- Actualizar `DirectoryProfessional` (que ahora vive en el componente — ya no está acá): en la query la interfaz viene del import
- Eliminar de `page.tsx`: la definición de `DirectoryProfessional`, `ProfessionalCard`, `formatLocation`, `formatPrice`, `formatModality` (todo movido al componente en Task 1)
- Reemplazar el bloque `{professionals.length === 0 ? ... : <div className="grid ...">}` por `<ProfessionalsDirectory professionals={professionals} practices={practices} />`
- `EmptyState` cuando el directorio tiene cero activos sigue viviendo en `ProfessionalsDirectory` (lo recibe el componente)
- El header `<h1>Profesionales</h1>` y el footer `<Link href="/ayuda">` se quedan en el server page

**Definition of Done:**

- [ ] `http://localhost:3000/profesionales` carga correctamente con todos los profesionales
- [ ] La búsqueda funciona end-to-end (tipear filtra el grid en tiempo real)
- [ ] `page.tsx` tiene < 100 líneas (el código movido está limpio)
- [ ] `tsc --noEmit` pasa sin errores
- [ ] Verify: `npm run build 2>&1 | tail -5` — build exits 0, sin errores TS

---

## E2E Test Scenarios

### TS-001: Búsqueda por nombre
**Priority:** Critical
**Preconditions:** Dev server corriendo en localhost:3000; hay al menos un profesional activo
**Mapped Tasks:** Task 1, Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navegar a `http://localhost:3000/profesionales` | Grid de profesionales visible, sin barra de búsqueda vacía |
| 2 | Click en el input de búsqueda | Input recibe foco |
| 3 | Tipear el nombre (o fragmento de nombre) de un profesional conocido | Grid se filtra en tiempo real mostrando solo cards con ese nombre |
| 4 | Verificar que las cards no-matching desaparecieron | Solo cards del profesional buscado visible |

### TS-002: Búsqueda por práctica (key/label)
**Priority:** Critical
**Preconditions:** Dev server corriendo; hay profesionales con práctica `reiki` mapeada
**Mapped Tasks:** Task 1, Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navegar a `http://localhost:3000/profesionales` | Grid completo visible |
| 2 | Tipear "reiki" en el buscador | Grid muestra solo profesionales cuyo campo `practices` incluye `reiki` |
| 3 | Limpiar el input con el botón ✕ | Todos los profesionales vuelven a aparecer |

### TS-003: Búsqueda por alias de práctica
**Priority:** High
**Preconditions:** Dev server corriendo; hay al menos un profesional con práctica `constelaciones-familiares`; el catálogo tiene alias `'sanaciones ancestrales'` para esa práctica
**Mapped Tasks:** Task 1, Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navegar a `http://localhost:3000/profesionales` | Grid completo visible |
| 2 | Tipear "sanaciones ancestrales" en el buscador | Grid muestra profesionales con `constelaciones-familiares` en su campo `practices` |
| 3 | Verificar que no aparecen profesionales sin esa práctica | Solo profesionales con la práctica (o alias) visible |

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001 | Critical | PASS | 0 | Name search "Leonela" → 1 resultado, correct card |
| TS-002 | Critical | PASS | 0 | "reiki" → 11 resultados; ✕ clears to full grid |
| TS-003 | High | NOT_APPLICABLE | 0 | Precondition not met: no professional has constelaciones-familiares in `practices` column (mapped). Alias logic verified by unit tests (`matchesProfessional alias` passes). |
| TS-004 | High | PASS | 0 | Empty state shown for nonsense term; "meditacion" (no tilde) finds Silvana Lallana (normalization works) |

---

### TS-004: Estado vacío y búsqueda sin acentos
**Priority:** High
**Preconditions:** Dev server corriendo
**Mapped Tasks:** Task 1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navegar a `http://localhost:3000/profesionales` | Grid completo visible |
| 2 | Tipear "xyzxyzxyz" (término sin match) | EmptyState: "Sin resultados. Probá con otro término." visible; grid vacío |
| 3 | Limpiar input | Todos los profesionales vuelven |
| 4 | Tipear "meditacion" (sin tilde) | Aparecen profesionales con "meditación" (normalización funciona) |
