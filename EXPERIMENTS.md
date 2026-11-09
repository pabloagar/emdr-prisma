# Verificación del despliegue

## 2026-11-04 · Restaurar archivos omitidos

Hipótesis: el despliegue falla porque el árbol de GitHub no incluye el punto de entrada y los archivos estáticos declarados en Wrangler. No se compara rendimiento de variantes.

Condiciones: copia limpia de `main` en `d833a776a595be89223ef71ec7cc7cc8c654afd5`, Windows, Node v26.13.0, npm 11.20.0, Wrangler 4.157.0, `compatibility_date=2026-10-30`. Dependencias de npm; red y dispositivo físico: null. Fuente de audio: null. No se usan datos de pacientes. Telemetría de Wrangler desactivada en las comprobaciones locales con `WRANGLER_SEND_METRICS=false`.

Métrica directa: código de salida de `npx wrangler deploy --dry-run` (sin unidades); intervalo desde invocación hasta terminación, una ejecución antes y una después. Criterio de aceptación: termina con código 0 después de restaurar las carpetas. Duración de despliegue, latencia audiovisual y precisión clínica: null. Sobrecosto: un empaquetado local por comprobación; sin instrumentación de ejecución añadida a la aplicación.

Resultado inicial: código 1, `The entry-point file at "src\\worker.js" was not found.` El árbol remoto solo contenía siete archivos de la raíz. Se localizaron `src/`, `public/` y `test/` en la copia local `emdr-prisma-demo-sin-claves`, cuyo package.json y wrangler.jsonc coinciden con la configuración de la rama original.

Resultado posterior: código 0; Wrangler detecta los dos archivos estáticos y los bindings `ROOMS (SessionRoom)` y `ASSETS`. `pnpm check` y `pnpm test` aprobados (3/3 pruebas), con `pnpm_config_verify_deps_before_run=false` para utilizar las dependencias ya instaladas por npm. `npm ci`: 34 paquetes, auditoría sin vulnerabilidades comunicadas por npm. No es una auditoría integral de seguridad. La comprobación web queda pendiente al publicar. Las comprobaciones locales se realizan sobre el árbol de trabajo restaurado; no se atribuyen al commit original, que carece de esos archivos.

Reproducción: instalar dependencias, ejecutar `npm run check`, `npm test`, `npx wrangler deploy --dry-run`; tras desplegar comprobar `/`, `/realtime.js` y `/api/health`, y una sala con ambos roles usando solo datos ficticios. No registrar tokens de invitación ni URL de WebSocket con credenciales.

Comprobación HTTP local del commit restaurado `d7deaed722c91249567fff88693f321416acc578`, Wrangler local en `127.0.0.1:8791`: `/`, `/realtime.js` y `/api/health` responden 200; `POST /api/rooms` responde 201 con identificador y credenciales generadas (valores no registrados). Una ejecución por ruta. Los tres scripts inline del HTML pasan análisis sintáctico con `vm.Script`. Navegador: null para estas solicitudes Node. Red: loopback local; equipo físico y fuente de audio: null.

Prueba de protocolo local del mismo código: `node scripts/smoke.mjs http://127.0.0.1:8791`, una ejecución completa aprobada: ambos roles, rechazo del inicio por paciente, configuración, inicio, pausa, parada del paciente y pausa por desconexión del profesional. Los intervalos terminan al recibir la respuesta HTTP/mensaje esperado; se verifica comportamiento, sin medir latencia. Dos primeras ejecuciones públicas del script y una con preferencia DNS IPv4 fallaron en el primer GET con `fetch failed`; se conserva el resultado, sin atribuir causa de red demostrada. Una solicitud pública independiente a `/api/health` respondió 200.

La primera inspección en Chrome de `d9fda8b`/versión Cloudflare `98ace90f-c880-4d8a-981e-8a202a22529f` detectó `ReferenceError: btnResetTimer is not defined`; el motor abortaba antes de exponer su API y el panel de salas no aparecía. Se declaran las referencias del botón y del panel lateral en el bloque DOM del motor. Árbol corregido, navegador Chrome (versión exacta: null), local: panel de salas visible, reinicio de temporizador, colapsar configuración y creación de sala aprobados, sin errores de consola capturados (una ejecución). Reproducción manual: abrir `/`, comprobar «Sala remota», pulsar reiniciar tiempo, colapsar configuración y crear una sala ficticia. `pnpm check`, 3/3 pruebas y dry-run aprobados de nuevo. Esta comprobación no mide calidad clínica, audio ni animación. La revisión corregida queda pendiente de verificar públicamente.

### Cierre de verificación pública

Revisión corregida publicada: `ccefda93e4e666539ad5fb587db12933ebc38ebe`; build Cloudflare `6381e056-ada9-40ff-b790-3d13a0a6e1e3` concluido con éxito, versión `647ca7b1-3e37-4b5d-a958-bdbf649a61fb`. Sustituye el estado pendiente anterior.

`node scripts/smoke.mjs https://emdr-prisma.pablo-aguirre-araya.workers.dev` completó una ejecución pública con todas sus comprobaciones aprobadas, sin imprimir tokens. Las solicitudes públicas independientes a `/`, `/realtime.js` y `/api/health` también dieron 200. En Chrome, tras recargar la versión corregida, apareció «Sala remota»; crear una sala terminó en «Esperando a la otra persona» y el WebSocket permaneció conectado. No se observaron nuevos errores de JavaScript; el registro de consola de la pestaña conserva el error de la versión anterior con su hora original. No se introdujeron datos clínicos, ni se comprobó la percepción de audio, exactitud del ritmo, sincronía audiovisual o validez terapéutica.

Los fallos de conexión iniciales indicados arriba se conservan; no se ha medido su causa. Número de navegadores interactivos con ambos roles: null (la prueba pública de dos roles se ejecutó con WebSocket de Node). Configuración de red pública, modelo de equipo y versión exacta de Chrome: null. La captura de evidencia queda solo en `.wrangler/emdr-prisma-cloudflare-activa.png`, excluida de Git. La revisión posterior de cierre solo cambia documentación y conserva el mismo código de aplicación.

## 2026-11-09 · Salas remotas con la app React

Hipótesis: el paciente no entra porque en Cloudflare no hay backend de salas. Evidencia previa: `GET /api/health` en producción devolvió el HTML de la app (consulta web, una vez); el código de sala mostrado (`EMDR-2368`) coincide con el valor por defecto/sustituto del cliente.

Condiciones: Linux, Node v22.23.4, npm 10.9.9, Wrangler 4.158.0 en local (`127.0.0.1:8791`), Chrome headless vía Playwright 1.63.0 con dos contextos aislados (equivalen a dos navegadores). Sin datos de pacientes; tokens no registrados.

Resultados (una ejecución cada uno):
- `npm run build` y `wrangler deploy --dry-run`: aprobados; bindings `ROOMS (SessionRoom)` y `ASSETS`.
- `npm run check`: quedan 2 errores de tipos previos a este cambio (`StageViewport.tsx` comparación con `'laser'`; import de `index.css`), que ya estaban en `main` junto a otros 6 resueltos al eliminar `server.ts`.
- `node scripts/smoke.mjs`: 12/12 comprobaciones (app servida, `/api/health` JSON, creación de sala, token falso rechazado, ambos roles, permisos, configuración, inicio/pausa, parada del paciente, pausa al desconectar al profesional, reconexión).
- Navegador: crear sala → copiar enlace → abrir en otro contexto: profesional ve «Paciente Conectado», paciente «Conectado con el terapeuta»; tras recargar el paciente sigue conectado; Espacio en el profesional pone a ambos en «Estimulando»; DETENER del paciente devuelve a ambos a «En reposo». Sin errores de JavaScript.

No se midió latencia, percepción de audio, sincronía audiovisual ni validez clínica. No verificado aún en producción ni con dos dispositivos reales.
