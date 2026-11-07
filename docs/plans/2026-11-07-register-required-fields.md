# Registro: rechazar campos obligatorios inutilizables

Created: 2026-11-07
Agent: Codex
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Bugfix

## Summary

**Symptom:** El servidor acepta solicitudes profesionales con nombre o biografía de espacios y con una especialidad vacía, aunque el formulario no permita avanzar con esos valores.
**Trigger:** Un cliente modificado o un error de armado del envío manda esos datos directamente a POST /api/professionals/register.
**Root Cause:** `app/api/professionals/register/route.ts:123-166`: los cast de TypeScript no comprueban tipos en ejecución; la validación de texto comprueba presencia/longitud sin trim, y la de selecciones comprueba únicamente length. Por eso un texto de espacios o un array con una entrada vacía supera los controles antes de Auth y del insert.

## Investigation

- Reproducido nuevamente el 2026-11-07 con el handler real y sus servicios externos simulados: nombre faltante devuelve 400 sin escrituras; nombre de espacios, bio de 60 espacios y specialties=[''] devuelven 200 e intentan crear cuenta e insertar perfil. Evidencia: `/tmp/hara-required-fields-probe.log`. El archivo de tests original se restauró byte por byte; no se insertaron datos reales.
- El cliente `app/registro/RegistroForm.tsx:38-62` ya usa trim para nombre/bio y envía FormData. Corregir solo el cliente no cubre una solicitud directa ni una futura regresión del armado del envío.
- Llamador productivo: RegistroForm.handleSubmit en `app/registro/RegistroForm.tsx:117`. Otros consumidores conocidos: tests de registro y cooldown. `app/api/pro/profile/route.ts` tiene su propio parser; no se modifica en este primer bugfix.
- Comparación útil: el endpoint de edición ya rechaza nombre/país vacíos después de trim. Se conserva el contrato de registro: bio de al menos 50 caracteres útiles tras recortar extremos, especialidades personalizadas admitidas y tarifas/imagen opcionales.
- Confianza alta: fallos reproducidos antes de modificar código. No se atribuye a Supabase ni se cambia el esquema.
- Límites: carreras de slug/cooldown, semántica de especialidades, formatos opcionales y un fallo del proveedor Auth quedan fuera. Contraseña se conserva exactamente como llegó, sin trim. Una petición abortada antes del envío no llega a este handler; el rollback existente sigue cubriendo un insert fallido.

## Behavior Contract

**Given:** Una solicitud de registro JSON o multipart con los demás campos válidos.
**When:** Falta texto obligatorio útil, una bio tiene menos de 50 caracteres tras trim, o modalidad/especialidades no son arrays no vacíos de strings con contenido.
**Currently (bug):** Textos de espacios y selecciones con entradas vacías pueden crear una cuenta/perfil; algunos tipos inesperados pueden caer en el catch genérico y responder 500.
**Expected (fix):** Responder 400 con un error legible antes de consultar cooldown/slug o de crear Auth, insertar un profesional, subir una imagen o enviar emails. Comprobar también los tipos de los strings obligatorios y el cuerpo JSON antes de usarlos. Si hay una entrada inválida dentro de un array mixto, rechazar el envío completo; no quitarla silenciosamente.
**Anti-regression:** Conservar el registro válido JSON/multipart, nombres con acentos, texto con párrafos, especialidades personalizadas, contraseña sin alterar y opcionales vacíos. Conservar los tests existentes de cuenta/rol/vínculo, contraseña, rollback, cooldown y respuesta 429. Una bio con exactamente 50 caracteres tras trim debe pasar; con 49 más espacios debe fallar.

## Fix Approach

Validar y normalizar los campos obligatorios al entrar al handler, antes del primer acceso de registro a servicios externos. Recortar nombre, país y extremos de bio; comprobar tipos y elementos de modalidad/especialidades en la misma ruta. Conservar los validadores de email/WhatsApp y el parser multipart actual, agregando las comprobaciones necesarias para que sus entradas incorrectas sean 400 y no excepciones. No añadir dependencias, un validador general de formularios ni cambios al cliente para esconder el fallo.

## Out of Scope

- Upstash: expresamente apartado por la usuaria. No cambiar su configuración, código ni reglas de acceso.
- Contacto obligatorio del concierge: bug separado que se verá después, no otro endpoint incluido en este fix.
- sendBeacon, reaplicación de rechazados, invitaciones, entrega de emails y el resto del plan general de flujos.
- Nuevos requisitos para prácticas/precios opcionales, nuevas categorías o migraciones.
- Commit/push automático de este fix: revisar el resultado antes de publicarlo.

## Tasks

- [x] Task 1: Reproducing Test (RED)
- [x] Task 2: Implement Fix at Root Cause
- [x] Task 3: Quality Gate

### Task 1: Reproducing Test (RED)

**Objective:** Dejar una regresión persistente por el endpoint real que falle antes del cambio. Probar la consecuencia del dato inválido: no crear cuenta, perfil, imagen ni notificaciones.

**Files:**

- Test: `app/api/professionals/register/route.test.ts`
- Test: `__tests__/e2e/registration-flow.spec.ts`
- Test: `__tests__/e2e/registration-full-flow.spec.ts` (opciones explícitas de Chrome visible para el recorrido existente)

**Key Decisions / Notes:**

- Reutilizar el archivo y los mocks actuales del handler. Un test parametrizado cubre texto vacío/espacios, bio de 49 caracteres más espacios, arrays vacíos, entradas vacías o no-string, array con entrada válida e inválida, tipo no-array y cuerpo JSON nulo.
- Casos válidos en el mismo archivo comprueban los límites de bio, campos opcionales vacíos, custom specialties y conservación de contraseña. Los errores de formato de email/WhatsApp conservan su comportamiento.
- Preparar el escenario real de solicitudes manipuladas en el archivo Playwright existente, pero no enviarlo a servicios reales antes del fix: el diagnóstico RED usa Auth/DB/Storage/email simulados para no crear datos inválidos vivos.
- Los dos archivos Playwright usan Chrome instalado con channel=chrome y headless=false; no depender del Chromium descargado ni de una corrida headless para cerrar la verificación.

**Definition of Done:**

- [x] El caso de nombre/bio/especialidad de espacios falla por el comportamiento esperado de 200 frente a 400, no por un error del test.
- [x] Las aserciones comprueban ausencia de creación, insert, upload y emails, además del estado HTTP.
- [x] Verify: `npx vitest run --project unit app/api/professionals/register/route.test.ts -t 'required fields'` falló antes del fix (exit 1): 31 casos fallaron, incluyendo 200 frente a 400 y efectos indebidos; también fallaron los controles de trim. Evidencia: `/tmp/hara-required-fields-red.log`. E2E real preparado, todavía no ejecutado contra código defectuoso.

### Task 2: Implement Fix at Root Cause

**Objective:** Rechazar los datos obligatorios inutilizables en la ruta, manteniendo intacto el resto del registro y sus efectos válidos.

**Files:**

- Modify: `app/api/professionals/register/route.ts`
- Test: `app/api/professionals/register/route.test.ts`

**Key Decisions / Notes:**

- Comprobar forma del cuerpo, strings y arrays antes de usar sus propiedades o crear la cuenta. Evitar cast como sustituto de validación.
- Recortar texto descriptivo y comprobar bio de 50 caracteres después de trim. No recortar contraseña ni inventar una nueva lista de especialidades aceptadas.
- No envolver el problema en otro catch ni cambiar orden/garantías de rollback, aprobación o control de acceso. El rate limiter conserva su lugar y comportamiento.

**Definition of Done:**

- [x] Los casos RED devuelven 400 y no ejecutan los efectos de registro; los controles válidos conservan el payload esperado.
- [x] El cambio queda en el origen documentado y no en un bloqueo adicional del frontend.
- [x] Verify: `npx vitest run --project unit app/api/professionals/register/route.test.ts` pasó (exit 0). Cuerpo/tipos/arrays validados antes de consultas y escrituras; nombre/país/bio recortados; contraseña intacta. Evidencia: `/tmp/hara-required-fields-green.log`.

### Task 3: Quality Gate

**Objective:** Verificar la corrección desde Chrome visible y una compilación de producción, y dejar evidencia por comportamiento antes de pasar al siguiente bug.

**Files:**

- No production files expected.
- Modify: este plan, `.claude/plans/hara.md` e `ISSUES.md` para registrar lo efectivamente comprobado.

**Key Decisions / Notes:**

- Ejecutar solicitudes manipuladas desde el navegador contra el endpoint real, cubriendo JSON y multipart. Usar emails únicos y comprobar ausencia de perfil/cuenta para los envíos rechazados. Auth/DB no se simulan en esa comprobación.
- Mantener una limpieza en finally para cualquier fixture que llegue a existir ante una regresión. No tocar usuarios reales. No afirmar entrega de emails por un 200 del registro.
- Reutilizar el recorrido completo de registro existente para el control válido con cuenta temporal, imagen, login y limpieza, bajo la autorización de prueba ya dada. Ejecutar en Chrome visible con `--headed`; no usar el setup de integración que elimina .next.
- Para evitar interferencias de límites, aislar los buckets mediante el namespace de pruebas ya admitido por el proyecto; no desactivar el limiter ni falsear IPs. Si responde 429, registrarlo como bloqueo de esa prueba y no como prueba de validación correcta.
- Limitar la prueba real a cuatro envíos inválidos representativos (dos JSON y dos multipart) y un registro válido dentro de un namespace fresco; la matriz más amplia de tipos/límites se verifica contra el handler con servicios simulados.
- No cambiar el diseño. En el navegador verificar que nombre/bio vacíos siguen impidiendo avanzar y que un error del servidor conserva los datos para corregirlos.
- Lint está sin configurar (ISSUES 7): ejecutar el comando y registrar su salida sin afirmar PASS ni instalar/configurar herramientas dentro de este fix.

**Definition of Done:**

- [x] JSON/multipart inválidos devuelven 400 en el servidor real y no dejan perfiles ni cuentas; controles válidos y cleanup comprobados.
- [x] Chrome visible confirma la interfaz y el recorrido válido. El resultado se registra por escenario, no por cantidad de tests.
- [x] TypeScript, build y proyecto unit pasan después del cambio. Lint se informa por separado con su limitación conocida.
- [x] Verify: comandos ejecutados y evidencia registrada abajo. Lint no pasó: falta configuración preexistente, explícitamente fuera de este fix.

## Implementation Notes — 2026-11-07

- Aprobación concreta del plan recibida con la opción 1. Implementación y verificación técnica completas; revisión final aprobada el 2026-11-07 con la instrucción explícita «commitea y pushea». Spec VERIFIED y entrega git autorizada. La publicación automática en producción no está verificada por este spec.
- Cambio productivo limitado a route.ts: guard del cuerpo, tipos runtime de strings, trim de nombre/país/bio y comprobación de cada entrada de modalidad/especialidades. Se rechazan arrays mixtos completos, sin filtrarlos. No se cambió el cliente, Auth, rollback, acceso, schema, rate limiter ni Upstash.
- RED persistente: `/tmp/hara-required-fields-red.log`, exit 1. GREEN del módulo: `/tmp/hara-required-fields-green.log`, exit 0. Después se añadieron controles de cooldown vigente/vencido al mismo módulo; pasaron en la suite final.
- TypeScript: `npx tsc --noEmit`, exit 0 (`/tmp/hara-required-fields-types.log`). Build de producción: `npm run build`, exit 0 (`/tmp/hara-required-fields-build.log`); conserva advertencias preexistentes de Sentry.
- Suite unit completa: exit 0, 108 archivos y 851 casos (`/tmp/hara-required-fields-unit-final.log`). Estos números son inventario: la prueba específica verifica 400 y ausencia de consultas/escrituras/notificaciones ante datos inválidos, y preservación de datos válidos, contraseña y cooldown.
- Lint: `CI=1 npm run lint -- --no-cache </dev/null`, exit 1. Next pide configurar ESLint (`/tmp/hara-required-fields-lint.log`). No se instaló ni configuró nada.
- Producción local con namespace fresco, sin desactivar el limiter ni falsear IPs. Chrome DevTools no pudo conectar porque su perfil está ocupado; Playwright abrió Chrome instalado visible (`channel: chrome`, `headless: false`). Se conservaron las ventanas ajenas.
- Chrome contra endpoint y Supabase reales: nombre de espacios (JSON), especialidad vacía (JSON), bio de espacios (multipart) y modalidad válida+vacía (multipart) devolvieron 400. Consulta posterior a professionals y listado paginado de Auth: ningún perfil ni cuenta para los cuatro emails únicos. El test incluye finally con limpieza restringida a sus fixtures ante regresiones.
- Control válido real: cuatro pasos, imagen, solicitud 200, estado submitted, prácticas persistidas, login real, aviso de revisión, ausencia de Guardar y POST de edición 403. Limpieza comprobada de perfil, Auth e imagen. Evidencia final: `/tmp/hara-required-fields-browser.log`, exit 0 (7 escenarios); capturas en `test-results/registration-full-flow/`.
- Límites UI: nombre y bio de espacios impiden avanzar/enviar. Una respuesta 400 simulada en el recorrido válido comprueba que el formulario conserva bio, frase e imagen para reintentar; después el envío válido usa el servidor real. Google Places continúa simulado en ese recorrido. No se afirma selección de Google real ni entrega de emails.
- Al inspeccionar la captura se detectó una fixture JPEG preexistente que no se decodificaba, aunque el test aceptaba la etiqueta img visible. Se reemplazó por JPEG generado por Chrome, se exige naturalWidth > 0 y se comparan los bytes descargados de Storage. La limpieza comprueba también que el objeto desapareció. Se repitió el recorrido completo bajo otro namespace fresco (cuatro inválidos + un válido por corrida); no fue un cambio productivo.
- Cooldown: cubierto en handler con dependencias simuladas, incluido este cambio. No se ejecutó el proyecto integration: su setup elimina .next y su fixture de cooldown carece de password y limpieza de Auth. Esto es una limitación de esa suite por inspección, no evidencia de un fallo nuevo del producto ni un arreglo incluido aquí.
- Revert-test obligatorio: se restauró temporalmente route.ts de HEAD, la regresión falló con `expected 200 to be 400`, se restauró el fix byte por byte en finally y la regresión pasó. Logs: `/tmp/hara-required-fields-revert-red.log` y `/tmp/hara-required-fields-restored-green.log`.
- Revisión de alcance: diff en ruta raíz y tests/documentación previstos; sin nuevos paquetes, capas, I/O ni consultas. `git diff --check` limpio; sin instrumentación temporal SPEC-DEBUG ni logs productivos nuevos. El servidor de producción local queda en :3000 y su PID en `/tmp/hara-production.pid`.
