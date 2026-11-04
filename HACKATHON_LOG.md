# Registro de publicación

## 2026-11-04 · Reparación del despliegue Cloudflare

El repositorio `pabloagar/emdr-prisma`, rama `main`, omitía `src/`, `public/` y `test/`. Se reprodujo con Wrangler 4.157.0 el fallo por ausencia de `src/worker.js`. Se restauran las carpetas de la copia local completa `emdr-prisma-demo-sin-claves`; se conserva el contenido existente de la rama y se habilita explícitamente `workers_dev` para servir la web. Se añade el lockfile de npm y se documentan la carga completa y las comprobaciones previas.

Validación local del árbol restaurado: `pnpm check`, `pnpm test` (3/3) y `npx wrangler deploy --dry-run` aprobados. Publicación remota y comprobación web pendientes de completar. El panel de Cloudflare muestra además que la integración Git está desconectada y que `workers.dev` está desactivado en la versión previa. Metodología y límites en `EXPERIMENTS.md`. Este repositorio es independiente de DictaLibre; su rama de producción conectada a Cloudflare es `main`.
