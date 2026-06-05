# Search — Directorio de Profesionales

Created: 2026-06-02
Author: belu.montoya@dialpad.com
Agent: Claude Code
Category: Feature
Status: Draft
Research: Quick

## Problem Statement

La página `/profesionales` lista todos los profesionales activos pero no tiene ningún mecanismo de búsqueda. El usuario que llega con una necesidad concreta ("busco alguien de reiki", "quiero trabajar la ansiedad", "busco a María López") tiene que scrollear todo el directorio sin poder filtrar. En un catálogo holístico donde los usuarios muchas veces no conocen los nombres oficiales de las prácticas (escriben "sanaciones ancestrales" en lugar de "constelaciones familiares"), la búsqueda debe ser tolerante con terminología alternativa y sin necesidad de tildes.

## Core User Flows

### Flow 1: Búsqueda por práctica o síntoma

1. Usuario entra a `/profesionales`
2. Ve el directorio completo + una barra de búsqueda en el topo
3. Escribe "ansiedad" (o "meditacion" sin tilde)
4. El listado se filtra en tiempo real mostrando solo profesionales cuyas especialidades o prácticas mapeadas incluyen ese término (directo o por alias)
5. Si no hay resultados, ve un estado vacío claro: "No encontramos profesionales para esa búsqueda."
6. Al borrar el texto, vuelven todos los resultados

### Flow 2: Búsqueda por nombre

1. Usuario escribe "María" o "López"
2. El directorio muestra solo los profesionales cuyo `full_name` contiene ese término (normalizado, sin distinción de mayúsculas o tildes)

### Flow 3: Búsqueda por alias de práctica

1. Usuario escribe "bioneurodesprogramación" (alias, no el nombre oficial "biodecodificación")
2. El sistema resuelve el alias → práctica "biodecodificación" → muestra profesionales que tienen esa práctica mapeada

## Scope

### In Scope

- Barra de búsqueda de texto libre en `/profesionales` (encima del grid de cards)
- Filtrado client-side con `useMemo` sobre los datos ya cargados
- Campos matcheados: `full_name`, `specialties[]` (free-text del profesional), `practices[]` (claves del catálogo)
- Para prácticas mapeadas: match contra `label` del catálogo + cada `alias` en `aliases[]`
- Normalización de texto: lowercase + strip de acentos (NFD) en query y en todos los campos indexados
- Estado vacío cuando no hay resultados
- Placeholder descriptivo: "Buscá por nombre, práctica o síntoma..."
- Reset automático al limpiar el input

### Explicitly Out of Scope

- Filtros adicionales (por país, modalidad, precio) — pueden venir en una iteración futura
- Chips de práctica clicables — no en este MVP
- URL params (`?q=`) / server-side search — el directorio tiene pocos profesionales, client-side alcanza
- Búsqueda en `short_description` o `bio` — demasiado ruidosa para MVP
- Sugerencias / autocomplete dropdown — v2

## Technical Context

- **Archivo principal:** `app/profesionales/page.tsx` — Server Component, actualmente fetches solo `professionals`
- **Cambio de arquitectura:** La página queda como Server Component pero ahora fetches dos datasets en paralelo:
  1. `professionals` — agrega `practices` al SELECT (actualmente ausente de `DirectoryProfessional`)
  2. `practices` catalog — usando `getActivePractices()` de `lib/practices.ts` (ya existe)
- **Nuevo client component:** `app/profesionales/components/ProfessionalsDirectory.tsx` — recibe `professionals` + `practices` como props, maneja el estado de búsqueda y renderiza el grid. El `ProfessionalCard` se mueve aquí o queda como subcomponente.
- **Función de normalización:** Existe en `lib/admin-practices.ts` — reusar o extraer a `lib/utils.ts`
- **Interface `DirectoryProfessional`:** Agregar `practices: string[] | null`
- **Patrón de referencia:** `app/admin/professionals/page.tsx` tiene `filteredProfessionals` con `useMemo` — seguir ese patrón

### Matching Logic (pseudocódigo)

```ts
function normalize(s: string): string {
  return s.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Pre-compute at component mount (not on every keystroke)
// For each practice in catalog: build a set of searchable terms
// { key: 'biodecodificacion', terms: ['biodecodificacion', 'bioneurodesprogramacion', ...] }

function matches(pro: DirectoryProfessional, query: string, practiceIndex: Map<string, string[]>): boolean {
  const q = normalize(query)
  if (!q) return true
  if (normalize(pro.full_name).includes(q)) return true
  if (pro.specialties?.some(s => normalize(s).includes(q))) return true
  if (pro.practices?.some(key => {
    const terms = practiceIndex.get(key) ?? [key]
    return terms.some(t => t.includes(q))
  })) return true
  return false
}
```

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Client-side vs server-side filtering | Client-side (`useMemo`) | El directorio tiene pocos profesionales; respuesta instantánea sin latencia de red. Server-side agrega complejidad (URL params, debounce, revalidación) sin beneficio real a esta escala. |
| UX: texto libre vs chips de práctica | Texto libre solamente | El MVP más simple que resuelve el problema. Chips requieren estado más complejo y hay que decidir qué prácticas mostrar como chips vs dropdown. |
| Normalización de acentos | Sí, siempre | Comportamiento esperado en una app en español. Un usuario que escribe "meditacion" sin tilde debe encontrar resultados. |
| Incluir aliases en búsqueda | Sí, crítico | Los usuarios holísticos usan terminología alternativa que no coincide con los nombres oficiales del catálogo. |
| Campos incluidos en search | full_name + specialties + practices (con labels y aliases) | Cobertura completa. Excluir `short_description`/`bio` evita falsos positivos por texto narrativo. |
| Arquitectura de componentes | Server shell + Client island | La página mantiene SSR (ranking, frescura de datos) y agrega interactividad sin convertir todo a client. Patrón estándar de Next.js 14 App Router. |
