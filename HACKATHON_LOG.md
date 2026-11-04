# Registro de publicación

## 2026-11-04 · Reparación del despliegue Cloudflare

El repositorio `pabloagar/emdr-prisma`, rama `main`, omitía `src/`, `public/` y `test/`. Se reprodujo con Wrangler 4.157.0 el fallo por ausencia de `src/worker.js`. Se restauran las carpetas de la copia local completa `emdr-prisma-demo-sin-claves`; se conserva el contenido existente de la rama y se habilita explícitamente `workers_dev` para servir la web. Se añade el lockfile de npm y se documentan la carga completa y las comprobaciones previas.

Validación local del árbol restaurado: `pnpm check`, `pnpm test` (3/3) y `npx wrangler deploy --dry-run` aprobados. Publicación remota y comprobación web pendientes de completar. El panel de Cloudflare muestra además que la integración Git está desconectada y que `workers.dev` está desactivado en la versión previa. Metodología y límites en `EXPERIMENTS.md`. Este repositorio es independiente de DictaLibre; su rama de producción conectada a Cloudflare es `main`.

Publicado en GitHub: `d7deaed722c91249567fff88693f321416acc578`, confirmado por `git ls-remote origin refs/heads/main`. El conector GitHub rechazó la escritura (403); el push normal de Git completó la publicación sin forzar. Tras confirmación explícita del responsable se añadió únicamente `emdr-prisma` a los repositorios de la instalación existente de Cloudflare Workers and Pages; desapareció el aviso de integración desconectada. El resto de los repositorios seleccionados se conservó. HTTP local y creación de sala aprobados; se prepara despliegue conectado de esta revisión documental. Aún no se afirma que la web esté activa.
