# Professional portal almanac implementation plan

Created: 2026-11-06
Agent: Codex
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Completar la migración visual del editor de perfil y de la creación/recuperación de contraseña al diseño almanac, conservando las funciones actuales del portal profesional. Después se retoma la clasificación de prácticas de los profesionales existentes.

## Out of Scope

- La clasificación de los 41 perfiles existentes se aborda después de cerrar esta migración, como pidió la usuaria. Este spec no modifica esos perfiles ni envía invitaciones a sus titulares.
- Agregar campos nuevos o un cargador para reemplazar la foto. La foto y los tipos de servicio actuales se conservan; el formulario existente no tiene controles para editarlos.
- Cambiar reglas de aprobación, recuperación de cuentas pendientes, reenvío de emails o concurrencia entre dos ediciones. El plan de cobertura general de flujos permanece diferido. Un fallo encontrado se documenta con reproducción antes de proponer una corrección aparte.
- Commit, push y despliegue requieren la aprobación final ya acordada.

## Approach

**Chosen:** Migrar las vistas existentes usando el login profesional y el registro almanac como referencia visual; conservar los handlers de sesión, verificación de enlace y guardado.
**Why:** Completa la continuidad visual del acceso profesional sin sustituir el editor ni la integración con Supabase. Requiere adaptar también todos sus estados y controles, no solamente la pantalla inicial.

## Context for Implementer

Las referencias verificadas son el login profesional actual y el registro basado en el diseño 12. La copia de Claude Design encontrada en el scratchpad de la sesión anterior no ofrece una referencia dedicada verificada para estas dos pantallas; la propuesta es una adaptación explícita del lenguaje existente. Usar Jost, Instrument Serif, fondo cálido, tarjetas crema, títulos con acento cursivo y acciones terracota. Los valores de la skill antigua de diseño y parte de CLAUDE.md están desactualizados: tomar los tokens actuales de globals.css y los patrones ya migrados. No usar datos de ejemplo del diseño.

## Runtime Environment

- User correction (2026-11-06): browser verification must run in a visible Chrome window. The initial headless evidence does not close the visual review. Use the foreground connector or isolated Playwright Chrome with headless=false; preserve existing user windows.
- Verificación contra `npm run build` y `npm start -- --port 3000`, no solamente desarrollo. Existe un servidor de producción local; su PID está en `/tmp/hara-production.pid`. Verificar identidad antes de detenerlo. Nunca matar procesos por puerto ni cerrar navegadores del usuario.
- Salud: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/pro/login`. Reiniciar la compilación antes de verificar cambios para no revisar una versión anterior.
- Pruebas reales con una única cuenta temporal y perfil de prueba identificados por email único bajo example.com. Crear la cuenta mediante Auth Admin generateLink de tipo invite, asignarle app_metadata.role=professional y vincular una fixture de perfil válida mediante user_id. No crear primero una cuenta confirmada: impediría probar la invitación inicial. No utilizar ni activar cuentas de los 45 profesionales. La fixture activa puede aparecer brevemente en el directorio real durante la comprobación; eliminarla al terminar, incluso ante fallos.
- Generar la invitación inicial y, después, el enlace de recuperación con Auth Admin para la fixture, sin enviar emails. Nunca imprimir claves, contraseñas ni tokens. Borrar perfil antes de borrar Auth, y consultar ambos por identificador para confirmar su ausencia. Si falla crear el perfil, borrar igualmente la cuenta recién creada. Si falta acceso a los servicios, reportar BLOCKED, nunca sustituirlo por un PASS con mocks.

## Feature Inventory

| Vista / función existente | Contrato que se conserva | Tarea |
|---|---|---|
| ProPerfilPage: sesión y búsqueda por user_id | Sin sesión lleva al login; solo muestra el perfil del usuario | 1, 4 |
| ProPerfilPage: active / submitted / rejected / sin vínculo | Editor solo activo; aviso de revisión, motivo de rechazo y contacto si no hay perfil | 1, 4 |
| SiteHeader: exclusiones por ruta | Las dos vistas nuevas tienen un solo encabezado y no recuperan la navegación vieja | 1 |
| ProfileEditForm: inicialización y handleSubmit | Conserva todos los valores y el POST, normalización de Instagram, errores y guardado | 2, 4 |
| Datos y ubicación | Nombre, email no editable, WhatsApp, Instagram, ciudad/país/coordenadas y solo online | 2 |
| Atención y descripción | Modalidades, prácticas, especialidades, descripción breve, bio y experiencia | 2 |
| Tarifas y disponibilidad | Mínimo, máximo, ARS/USD/EUR y aceptación de nuevos clientes | 2 |
| service_type y profile_image_url | Mantiene los valores existentes sin convertirlos en controles nuevos ni borrarlos | 2 |
| ReadOnlyScorePanel y cálculo memoizado | Índice actualizado al editar; no permite sobrescribir puntos; reutiliza ScoreRing y ScoreBreakdown | 2 |
| PracticePicker: multiselección | Conserva selección y aria-pressed; mejora tamaño táctil/foco sin alterar sus otros consumidores | 2 |
| SetPasswordForm: useEffect / verifyOtp | Respeta token_hash y tipo invite/recovery; enlace ausente o vencido lleva al estado inválido | 3, 4 |
| SetPasswordForm: handleSubmit | Mínimo de 8 caracteres, confirmación coincidente, updateUser y navegación al perfil | 3, 4 |
| Contraseña: verifying / invalid / form / saving | Todos los estados migran; saving bloquea el envío; fallo permite reintentar | 3 |

## Risks and Mitigations

| Riesgo | Impacto | Mitigación verificable |
|---|---|---|
| Un control desaparece o cambia el dato enviado al reorganizar la vista | Pérdida de información del profesional | Comparar payload completo y releer la fixture después de guardar; asegurar que foto y service_type no cambian |
| La pantalla parece funcionar con mocks pero no guarda o no establece contraseña | Profesional sin acceso o sin cambios publicados | Ejecutar TS-001, TS-002 y TS-004 con Auth y base reales, dejando evidencia separada de las pruebas simuladas |
| La prueba deja un perfil público o una cuenta temporal | Datos de prueba visibles | IDs únicos, cleanup en finally/afterAll y consultas que confirmen su eliminación |

## File Structure

- `app/pro/perfil/page.tsx`: vista de perfil y estados de revisión.
- `app/components/SiteHeader.tsx` y su test: exclusión del encabezado viejo.
- `app/pro/perfil/page.test.tsx`: estados y acceso a la vista.
- `app/pro/perfil/ProfileEditForm.tsx` y su test: editor y feedback de guardado.
- `app/components/PracticePicker.tsx` y su test existente: selección accesible y controles táctiles.
- `app/pro/set-password/page.tsx` y su test: formulario y estados del enlace.
- `__tests__/e2e/professional-portal.spec.ts` (nuevo): recorridos con fixture real y errores de transporte simulados explícitamente.
- Este plan y `.claude/plans/hara.md`: evidencia y continuidad con la clasificación de prácticas.

## E2E Test Scenarios

### TS-001: Establecer contraseña desde invitación
**Priority:** Critical
**Mapped Tasks:** Task 3, Task 4
**Preconditions:** Fixture propia sin invitaciones por email; enlace invite real generado para esa cuenta.

| Paso | Acción | Resultado observable |
|---|---|---|
| 1 | Abrir el enlace de invitación | Encabezado con logo único y Volver, estado de verificación y luego formulario almanac |
| 2 | Probar contraseña corta y confirmación distinta | No se guarda; aparece indicación accesible y los campos siguen disponibles |
| 3 | Guardar contraseña válida coincidente | Abre el perfil de la fixture |
| 4 | Cerrar la sesión de prueba y entrar desde el login | La contraseña elegida permite acceder al mismo perfil |

### TS-002: Editar y releer un perfil aprobado
**Priority:** Critical
**Mapped Tasks:** Task 1, Task 2, Task 4
**Preconditions:** Fixture activa propia; valores conocidos de foto y service_type; prácticas reales válidas.

| Paso | Acción | Resultado observable |
|---|---|---|
| 1 | Abrir perfil y modificar contacto, textos, prácticas, especialidades, precio y disponibilidad | Valores iniciales correctos; email no editable; el Índice responde sin controles de override |
| 2 | Guardar y recargar | Los valores nuevos permanecen en el formulario y en una lectura independiente de la base |
| 3 | Abrir perfil público de la fixture | Textos, contacto y tarifas visibles coinciden con lo guardado; foto y tipos de servicio siguen intactos |
| 4 | Cambiar a solo online y dejar precios opcionales vacíos; guardar y recargar | Estado persistido, ciudad vacía según el contrato actual y precios null sin convertirlos en cero |

### TS-003: Guardado rechazado y reintento
**Priority:** High
**Mapped Tasks:** Task 2, Task 4
**Preconditions:** Fixture activa. Interceptar solo el primer POST de guardado para devolver un error de servidor; declarar esta parte como simulada.

| Paso | Acción | Resultado observable |
|---|---|---|
| 1 | Editar un texto y guardar durante el fallo simulado | Se muestra el error, no aparece éxito y el texto escrito se conserva |
| 2 | Quitar la interceptación y volver a guardar | Una petición real guarda el texto y sobrevive a recarga |

### TS-004: Recuperación y enlace inválido
**Priority:** Critical
**Mapped Tasks:** Task 3, Task 4
**Preconditions:** Enlace recovery real de la fixture; sesión de prueba aislada.

| Paso | Acción | Resultado observable |
|---|---|---|
| 1 | Abrir /pro/set-password sin token y con token inválido | Estado almanac de enlace inválido, sin formulario y con acceso al login |
| 2 | Abrir enlace recovery válido y elegir otra contraseña | Permite entrar con la contraseña nueva; la anterior ya no permite entrar |
| 3 | Reabrir el enlace consumido desde una sesión limpia | Muestra enlace inválido en vez de dar acceso al formulario |

### TS-005: Revisión, rechazo y falta de vínculo
**Priority:** High
**Mapped Tasks:** Task 1, Task 4
**Preconditions:** Cambiar solo la fixture entre submitted/rejected, luego desvincular solo su user_id.

| Paso | Acción | Resultado observable |
|---|---|---|
| 1 | Entrar con estado submitted | Aviso de revisión almanac, sin editor; POST real de edición devuelve 403 |
| 2 | Entrar con estado rejected y motivo | Muestra el motivo, sin editor ni promesa de publicación |
| 3 | Entrar sin perfil vinculado | Mensaje de contacto visible; no muestra datos de otros profesionales |

### TS-006: Teléfono, escritorio y teclado
**Priority:** High
**Mapped Tasks:** Task 1, Task 2, Task 3, Task 4
**Preconditions:** Usar los estados anteriores a 320, 402 y 1280 px; tomar capturas con fixture reconocible.

| Paso | Acción | Resultado observable |
|---|---|---|
| 1 | Recorrer perfil activo, avisos y contraseña válida/inválida | Sin desborde horizontal, encabezado duplicado ni vidrio/ilustración antiguos; tarifas se apilan en teléfono |
| 2 | Completar campos con Tab y activar selecciones con teclado | Etiquetas asociadas, foco visible, orden lógico y controles táctiles de al menos 44 px |
| 3 | Disparar error y guardado | Estado anunciado, botón indica Guardando y no permite otro envío durante la petición |

## Progress Tracking

- [x] Task 1: Migrar página de perfil y estados de acceso.
- [x] Task 2: Migrar editor completo y controles accesibles.
- [x] Task 3: Migrar creación y recuperación de contraseña.
- [x] Task 4: Verificar recorridos reales en producción local y documentar cierre.

## Implementation Tasks

### Task 1: Migrar el marco y los estados del perfil

**Objective:** Dar continuidad al login con un encabezado almanac de logo único y Volver, título serif y avisos legibles. Conservar la resolución de sesión y la exclusión del editor según estado, verificada por TS-005 y TS-006.

**Files:**

- Modify: `app/pro/perfil/page.tsx`
- Test: `app/pro/perfil/page.test.tsx`
- Modify: `app/components/SiteHeader.tsx`
- Test: `app/components/SiteHeader.test.tsx`

**Key Decisions / Notes:**

- Reutilizar visualmente el encabezado de `app/pro/login/page.tsx:65`; adaptar el ancho al editor, sin menú administrativo ni enlaces nuevos en la home.
- Quitar PageBackground; usar main con font-almanac, tarjetas bg-gray-50 y navegación Volver a `/`.
- Extender EXCLUDED_EXACT con `/pro/perfil` y `/pro/set-password`; conservar las demás rutas.

**Definition of Done:**

- [x] Activo conserva el editor; pendiente, rechazado y sin vínculo conservan sus mensajes y no muestran formulario.
- [x] Un solo logo, título y encabezado en ambas rutas; no hay navegación vieja añadida.
- [x] Verify: `npx vitest run --project unit app/pro/perfil/page.test.tsx app/components/SiteHeader.test.tsx`

### Task 2: Migrar todos los controles del editor

**Objective:** Reorganizar el editor en tarjetas de datos/contacto, atención, descripción y tarifas, con el Índice Hara conservado. Permitir completar y guardar los mismos datos desde celular y escritorio, según TS-002, TS-003 y TS-006.

**Files:**

- Modify: `app/pro/perfil/ProfileEditForm.tsx`
- Test: `app/pro/perfil/ProfileEditForm.test.tsx`
- Modify: `app/components/PracticePicker.tsx`
- Test: `app/components/PracticePicker.test.tsx`

**Key Decisions / Notes:**

- Cambiar GlassCard por secciones crema; heredar Jost y aplicar font-almanac-serif a títulos. Reutilizar ScoreRing y ScoreBreakdown sin modificar sus consumidores admin ni permitir overrides.
- Mantener handleSubmit y cálculo de puntos; conservar service_type y foto sin introducir sus controles. No cambiar el contrato del endpoint.
- Asociar label/htmlFor/id en campos, incluido PlacesAutocomplete usando su prop id; agrupar modalidades y opciones con nombres accesibles. Mensajes de error con role=alert y éxito con role=status.
- Tarifas en una columna a 320 px y tres en escritorio; botón Guardar cambios terracota, tamaño táctil y foco visible. PracticePicker conserva su multiselección al mejorar min-height/foco, comprobando sus consumidores con el proyecto unit.
- Ampliar los tests existentes para comparar el payload completo, email no editable, conservación de service_type, null en precios vacíos y error sin perder lo escrito. No crear tests para cada clase CSS.

**Definition of Done:**

- [x] Ningún dato del inventario se pierde ni cambia por reorganizar controles; los valores opcionales vacíos conservan su representación actual.
- [x] El Índice sigue respondiendo a cambios y sigue siendo de solo lectura; errores de guardado mantienen el formulario disponible para reintentar.
- [x] Todos los campos se encuentran por su etiqueta y todos los selectores funcionan con teclado; no hay desborde a 320 px.
- [x] Verify: `npx vitest run --project unit app/pro/perfil/ProfileEditForm.test.tsx app/components/PracticePicker.test.tsx`

### Task 3: Migrar contraseña y todos sus estados

**Objective:** Presentar invitación y recuperación con la misma estética del login, incluyendo verificación, enlace inválido, formulario, error y guardado. Conservar el flujo Auth real y la navegación al perfil, según TS-001, TS-004 y TS-006.

**Files:**

- Modify: `app/pro/set-password/page.tsx`
- Test: `app/pro/set-password/page.test.tsx`

**Key Decisions / Notes:**

- Reemplazar PageBackground/GlassCard por fondo cálido, logo único, Volver al login, título serif y tarjeta crema. El fallback de Suspense y la verificación muestran texto de estado almanac.
- Preservar verifyOtp({ token_hash, type }), mínimo de 8, coincidencia y updateUser; no mezclar invite con recovery ni cambiar restricciones de cuentas pendientes.
- Etiquetas asociadas, autocomplete=new-password, errores vinculados a campos, foco visible y submit deshabilitado al guardar. Diferenciar el título de creación del de recuperación sin modificar la autenticación.
- Reutilizar tests actuales y añadir ausencia de token, error de updateUser conservando datos y bloqueo durante petición; verificar que los fallos no navegan al perfil.

**Definition of Done:**

- [x] Invitación y recuperación muestran los estados nuevos y conservan sus parámetros Auth.
- [x] Contraseñas cortas o distintas no se guardan; un error de guardado permite reintentar y un resultado correcto abre el perfil.
- [x] Enlace ausente/inválido no muestra formulario; carga y guardado son estados visibles y anunciados.
- [x] Verify: `npx vitest run --project unit app/pro/set-password/page.test.tsx`

### Task 4: Comprobar el recorrido y registrar el cierre visual

**Objective:** Ejecutar los escenarios contra una compilación de producción y una fixture propia para demostrar acceso, persistencia y recuperación. Documentar evidencia concreta por escenario y dejar el diseño listo para revisión antes de pasar a clasificar las prácticas.

**Files:**

- Create: `__tests__/e2e/professional-portal.spec.ts`
- Modify: `docs/plans/2026-11-06-pro-portal-almanac.md`
- Modify: `.claude/plans/hara.md`

**Key Decisions / Notes:**

- Usar Playwright con el proyecto public y servidor de producción existente; fixture y cleanup en el mismo archivo, sin modificar config global ni añadir dependencias. Crear Auth con generateLink invite, asignar rol professional y vincular el perfil por user_id; no invocar el registro ni el reenvío del admin para evitar emails innecesarios.
- Los recorridos Auth y persistencia no se interceptan; declarar por separado la simulación controlada de TS-003. Google Places se puede simular para estabilidad, declarando esa limitación, sin afirmar integración real por esa prueba.
- Capturar escritorio y teléfono y comparar con las referencias de login/registro. Guardar evidencia bajo test-results o /tmp, sin datos privados de terceros.
- Marcar cada escenario PASS/FAIL/BLOCKED y registrar cleanup. La clasificación de los 41 profesionales sigue a esta revisión y necesita sus criterios de mapeo antes de cambiar datos.

**Definition of Done:**

- [x] TS-001 a TS-006 tienen resultado y evidencia; un guardado solo pasa si sobrevive a recarga y coincide con la base real.
- [x] Fixture de perfil y cuenta eliminadas, con comprobación de ausencia incluso tras fallo del test.
- [x] Plan principal actualizado con alcance efectivamente verificado, limitaciones y siguiente trabajo de clasificación; sin commit ni push.
- [x] Verify: `npx tsc --noEmit`, `npx vitest run --project unit`, `npm run build`, iniciar producción y ejecutar `npx playwright test __tests__/e2e/professional-portal.spec.ts --project=public --timeout=90000`.

## Implementation and verification evidence (2026-11-06)

All four tasks implemented. Status remains COMPLETE until the user reviews the result, as required by spec-verify; implementation approval is not final visual approval. No commit, push or deployment was performed.

| Scenario | Result | Actual evidence |
|---|---|---|
| TS-001 | PASS | Real Auth invite, browser password validation/mismatch, password save and subsequent password sign-in |
| TS-002 | PASS | Real profile POST, reload and independent DB read of complete edited payload; public bio, price and contact links match; online-only/null prices persist; photo/service_type preserved |
| TS-003 | PASS | Only the first save response was simulated as 500; error retained text, then a real POST and reload persisted it |
| TS-004 | PASS | Missing/invalid link, real recovery, new password login, old password rejected and consumed link rejected from a clean cookie context |
| TS-005 | PASS | Real fixture states submitted/rejected/unlinked, matching notices; submitted POST denied 403 without altering its name |
| TS-006 | PASS | Keyboard focus and Space selection, real final save; screenshots and measured controls at 320/402/1280 px across active/error/pending/rejected/unlinked and password states |

- RED before source changes: `/tmp/hara-pro-task1-red.log` (missing main/navigation and old header still visible), `/tmp/hara-pro-task2-red.log` (unassociated labels), `/tmp/hara-pro-task3-red.log` (unassociated password labels). Corresponding green/final logs use the same task prefix.
- Full unit project passed; production build passed; TypeScript passed. Logs: `/tmp/hara-pro-unit.log`, `/tmp/hara-pro-build.log`, `/tmp/hara-pro-types.log`. Unit results alone are not evidence of persistence or delivery.
- Real browser run: `/tmp/hara-pro-e2e.log`, six scenarios passed. Every run, including the two initial selector failures, verified deletion of its own profile and Auth user. No invitation or recovery email was sent. Temporary credentials/tokens were not logged.
- Initial test corrections were for Next.js's separate route-announcer alert and the existing contact link's plus sign. These were test selectors, not product changes or bugs labeled as fixed.
- Screenshots: `test-results/professional-portal/`, including viewport captures of the active editor. Visually inspected desktop/mobile editor and password invitation/invalid states.
- Known external limitation: production logs still show the previously documented dead Upstash hostname while recording public-profile analytics (ISSUES.md 16). This spec does not claim analytics or rate limiting are fixed.
- Lint remains unavailable because the repository has no ESLint config: `/tmp/hara-pro-lint.log` records the interactive setup prompt and exit 1. No lint PASS is claimed and no configuration was added.
- Google SDK requests were blocked in this suite; it verifies the existing city/coordinates survive and online-only clears city, not a live Google autocomplete selection. Mail delivery, photo replacement, multi-user/concurrent edits and classification of the 41 real professionals are outside this verification.


## Final review and verification (2026-11-06)

- Independent changes review found three issues and confirmed their source fixes on follow-up: selected practice chip contrast, field-placeholder/small-label contrast, and accepting an ambiguous null Auth lookup as cleanup proof.
- A real browser RED captured computed contrast 4.26 for the small label and 2.76 for password placeholders (`/tmp/hara-pro-contrast-red.log`). After using existing darker tokens, the browser check requires at least 4.5:1 for the checked labels, placeholders and selected chips at every verified width. The final run passed.
- Cleanup now requires successful deletion, a subsequent Auth lookup returning 404, and user=null. A separate final read-only query confirmed 45 active real profiles, zero portal-test profiles and zero portal-test Auth accounts.
- The final source passed the unit project, TypeScript and production build after the contrast changes. The final production browser run passed all six scenarios (`/tmp/hara-pro-e2e.log`). No further source changes followed that run.
- Code identity was verified through the migrated profile/password markup and computed colors against the restarted production build. Browser tests used isolated installed Chrome; only that test context/browser was closed.
- Review captures preserved in `/tmp/hara-pro-portal-review/`: desktop/mobile editor viewport, invitation form, invalid-link view and rejection notice. They contain only the deleted fixture's data.
- No Console code-review annotations were present. The final user review gate remains pending; COMPLETE is intentional, not VERIFIED. Remaining limitations above still apply, including unconfigured lint and external Upstash failures.


## Visible Chrome verification (user correction, 2026-11-06)

- The user rejected headless-only visual verification. The original headless run remains archived at `/tmp/hara-pro-e2e-headless.log` and does not close the visual gate.
- Chrome DevTools connector could not connect because its browser profile was already occupied. No user browser was stopped. The existing Playwright suite now explicitly launches installed Chrome with `headless: false`, brings its own page to the foreground and slows actions for visible execution.
- Repeated TS-001 through TS-006 against the same local production build in visible Chrome: all six passed in 47.9 seconds (`/tmp/hara-pro-e2e.log`). No product code changed for this correction. TypeScript passed after the test configuration update.
- Verified fixture cleanup again: successful profile/Auth deletion and Auth absence returning 404. No invitation or recovery emails were sent.
- Headed-run captures preserved separately at `/tmp/hara-pro-portal-review-headed/`. A visible Chrome window was left at `http://localhost:3000/pro/login` after the suite closed its own temporary test browser. AppleScript confirmed the foreground tab title Hara Vital and that exact URL.
- Visible Chrome is now recorded as the default UI verification requirement in CLAUDE.md and the main plan. Final user visual approval, commit and push remain pending.

## Final user approval (2026-11-06)

The user approved the completed work after the visible Chrome run: "si pasaron entonces apruebo, podes comietear y pushear". The final review gate is satisfied and commit/push are authorized. Earlier pending-review statements above describe the review history. The critical-flow follow-up remains deferred and its implementation is not approved by this release.


## Git delivery confirmed (2026-11-06)

Committed and pushed to main as f9e229717963f5b1d779867e4ece535da44d1a62. The pre-push unit project passed and local HEAD matched origin/main after push. Final visual approval and git delivery are complete; historical pending-review statements above are superseded. Automatic deployment, invitations for existing professionals and the deferred critical-flow work are not marked complete by this release.
