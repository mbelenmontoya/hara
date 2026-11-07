# Arteterapia: completar una asociación del catálogo

Created: 2026-11-07
Agent: Codex
Status: VERIFIED
Approved: Yes
Type: Data correction
Worktree: No

## Alcance aprobado

La usuaria pidió resolver únicamente el caso de Arteterapia. Actualizar solo practices[key=arteterapia].specialties de [] a [autoconocimiento]. Se elige la categoría existente Autoconocimiento por las descripciones de exploración/conexión a través del arte. No reclasificar los 41 perfiles, modificar otras prácticas, crear cuentas, enviar emails ni cambiar código o esquema.

## Investigación y contrato

- Síntoma: Marcellino María Laura declara Arteterapia y queda sin especialidades derivadas. Victoria Biurrarena también ofrece Arteterapia junto con otras prácticas.
- Causa: el registro Arteterapia del catálogo tiene specialties vacío. El resolver de lib/profile-specialties.ts:53 consume ese array y ProfileDetails omite la sección cuando no obtiene especialidades. No es un error en el reconocimiento de prácticas.
- Resultado esperado: el perfil de María Laura muestra Autoconocimiento; Victoria conserva sus especialidades; todos los registros de profesionales y los otros campos/filas del catálogo permanecen iguales.
- Respaldo previo: /tmp/hara-arteterapia-before.json, con catálogo completo, datos mínimos de los dos perfiles y huella de la tabla professionals.
- La corrección es de datos vivos, no una migración. La selección queda editable desde Admin → Prácticas → Arteterapia → Especialidades que cubre.

## Tareas

- [x] 1. RED: comprobar en Chrome visible que falta Autoconocimiento en el perfil de María Laura. Falló como se esperaba: 0 etiquetas, esperada 1 (/tmp/hara-arteterapia-red.log).
- [x] 2. Corrección en origen: actualizado únicamente practices[arteterapia].specialties a [autoconocimiento], con guardia del valor previo vacío. Lectura independiente confirma una sola fila/campo distintos; tabla professionals y resto del catálogo intactos.
- [x] 3. Verificación: lectura independiente confirma una sola fila/campo distintos y la huella de professionals idéntica. Ambos perfiles muestran Autoconocimiento en Chrome visible a 1280 y 402 px, tanto en producción local como en https://haravital.app.

## Límites de verificación

Sin cambios de código, cuentas temporales ni envíos. Bloquear POST/otras escrituras del navegador durante la lectura pública para evitar eventos de analítica. Los pendientes generales y el despliegue del código anterior quedan fuera de este trabajo.

## Evidencia final

- Base: /tmp/hara-arteterapia-data-verification.json confirma changedCatalogRows=[arteterapia], changedFields=[specialties], profileRecordsUnchanged=true y catálogo con igual cantidad de filas. Se actualizó la fila por el conector autorizado de Supabase, no mediante una migración ni reescritura de perfiles.
- RED: /tmp/hara-arteterapia-red.log, perfil de María Laura sin etiqueta Autoconocimiento antes del cambio.
- GREEN local: /tmp/hara-arteterapia-green.log. GREEN público: /tmp/hara-arteterapia-production.log. Ambos verifican los dos perfiles a 1280/402 px, incluido que Victoria conserva Bloqueos emocionales, Estrés y ansiedad y Equilibrio energético.
- Capturas públicas: /tmp/hara-arteterapia-visible-production/. Verificado con Chrome instalado, headless=false. Solo se cerró el navegador aislado de la prueba.
- No se modificaron otros registros del catálogo ni ningún registro de professionals. No se cambió código, no se ejecutaron migraciones y no se crearon commits ni despliegues para esta corrección de datos.
