# Verificación del despliegue

## 2026-11-04 · Restaurar archivos omitidos

Hipótesis: el despliegue falla porque el árbol de GitHub no incluye el punto de entrada y los archivos estáticos declarados en Wrangler. No se compara rendimiento de variantes.

Condiciones: copia limpia de `main` en `d833a776a595be89223ef71ec7cc7cc8c654afd5`, Windows, Node v26.13.0, npm 11.20.0, Wrangler 4.157.0, `compatibility_date=2026-10-30`. Dependencias de npm; red y dispositivo físico: null. Fuente de audio: null. No se usan datos de pacientes. Telemetría de Wrangler desactivada en las comprobaciones locales con `WRANGLER_SEND_METRICS=false`.

Métrica directa: código de salida de `npx wrangler deploy --dry-run` (sin unidades); intervalo desde invocación hasta terminación, una ejecución antes y una después. Criterio de aceptación: termina con código 0 después de restaurar las carpetas. Duración de despliegue, latencia audiovisual y precisión clínica: null. Sobrecosto: un empaquetado local por comprobación; sin instrumentación de ejecución añadida a la aplicación.

Resultado inicial: código 1, `The entry-point file at "src\\worker.js" was not found.` El árbol remoto solo contenía siete archivos de la raíz. Se localizaron `src/`, `public/` y `test/` en la copia local `emdr-prisma-demo-sin-claves`, cuyo package.json y wrangler.jsonc coinciden con la configuración de la rama original.

Resultado posterior: código 0; Wrangler detecta los dos archivos estáticos y los bindings `ROOMS (SessionRoom)` y `ASSETS`. `pnpm check` y `pnpm test` aprobados (3/3 pruebas), con `pnpm_config_verify_deps_before_run=false` para utilizar las dependencias ya instaladas por npm. `npm ci`: 34 paquetes, auditoría sin vulnerabilidades comunicadas por npm. No es una auditoría integral de seguridad. La comprobación web queda pendiente al publicar. Las comprobaciones locales se realizan sobre el árbol de trabajo restaurado; no se atribuyen al commit original, que carece de esos archivos.

Reproducción: instalar dependencias, ejecutar `npm run check`, `npm test`, `npx wrangler deploy --dry-run`; tras desplegar comprobar `/`, `/realtime.js` y `/api/health`, y una sala con ambos roles usando solo datos ficticios. No registrar tokens de invitación ni URL de WebSocket con credenciales.

Comprobación HTTP local del commit restaurado `d7deaed722c91249567fff88693f321416acc578`, Wrangler local en `127.0.0.1:8791`: `/`, `/realtime.js` y `/api/health` responden 200; `POST /api/rooms` responde 201 con identificador y credenciales generadas (valores no registrados). Una ejecución por ruta. Los tres scripts inline del HTML pasan análisis sintáctico con `vm.Script`. Navegador: null para estas solicitudes Node. Red: loopback local; equipo físico y fuente de audio: null.
