# EMDR Prisma · Sesiones remotas (prototipo técnico)

Implementación inicial de dos vistas (profesional y paciente) para estimulación bilateral visual/auditiva. Basada en el prototipo HTML suministrado. **No es un dispositivo médico validado ni reemplaza supervisión terapéutica. No usar aún con pacientes reales hasta completar pruebas y revisión clínica, de seguridad, accesibilidad y privacidad.**

## Qué incluye

- Motor visual original con vista de paciente (`?role=patient`).
- Crear una sala de demostración de 2 horas, enlace temporal y roles exclusivos (1 profesional + 1 paciente).
- WebSocket por sala con Cloudflare Durable Objects y estado persistido.
- Configuración de trayectoria, estímulo, frecuencia, tamaño, paleta, fondo y audio desde los controles del profesional.
- Iniciar, pausar y detener estímulos a distancia; el paciente siempre puede detenerlos localmente.
- Pausa por desconexión del profesional y por falta de latido en el servidor (hasta ~15 s); pausa local inmediata ante pérdida de WebSocket en el cliente.
- Los datos clínicos, notas, audio y video **no se transfieren** por el servidor de salas.

## Instalación y despliegue (Cloudflare Workers)

Requiere Node.js 20+, cuenta Cloudflare, `npm` y Wrangler. Para simplificar, este proyecto **usa un solo Cloudflare Worker con Static Assets** para alojar HTML y API, no un Pages y Worker separados.

```bash
npm install
npm run dev
```

Esta versión de demostración no requiere variables secretas. Las invitaciones se generan con tokens aleatorios de capacidad por sala. **No es apropiada para uso clínico o publicación abierta permanente**: cualquiera que conozca la web puede crear salas y consumir recursos.

En producción:

```bash
npx wrangler login
npm run deploy
```

El despliegue entrega una URL bajo `workers.dev` si está habilitada para el Worker. La primera migración crea la clase `SessionRoom` (SQLite Durable Object). Según la cuenta, puede haber límites/cuotas.

### Despliegue conectado a GitHub

En Cloudflare Workers Builds: rama `main`, directorio raíz `/`, comando de compilación vacío y comando de despliegue `npx wrangler deploy`. No hay una compilación de frontend previa. La configuración habilita la dirección `workers.dev`.

El repositorio debe incluir **las carpetas completas** `src/`, `public/` y `test/`, además de los archivos de la raíz. Subir solo los archivos sueltos deja fuera la aplicación. Si aparece `The entry-point file at "src/worker.js" was not found`, comprueba que `src/worker.js` y `public/index.html` existan en GitHub en la rama que Cloudflare despliega.

Antes de publicar: `npm run check`, `npm test` y `npx wrangler deploy --dry-run`. El último comando valida el paquete sin subirlo a Cloudflare. Para una carga manual a GitHub, arrastra también las carpetas desde el explorador; seleccionar únicamente los archivos de la raíz no las incluye.

## Uso

1. Abre la URL del Worker sin parámetros: panel del profesional.
2. Pulsa **Crear sala segura**. No se pide contraseña; el servidor genera invitaciones temporales.
3. Pulsa **Copiar enlace paciente**. El enlace lleva un token de invitación en su fragmento y dura como máximo 2 horas. **Trátalo como una contraseña**.
4. El paciente abre el enlace en otro navegador/dispositivo, acepta la activación de audio y espera.
5. Cuando aparezca **Ambos conectados**, el profesional utiliza los controles actuales de EMDR Prisma.
6. Cualquiera puede detener los estímulos. Tras una desconexión, volver a iniciar requiere una acción explícita del profesional.

## Seguridad y límites actuales

**MODO DEMO SIN AUTENTICACIÓN:** Cualquier persona que conozca el sitio puede crear una sala. Utilizar solo con datos ficticios y pruebas controladas. No divulgar el enlace públicamente ni utilizar con pacientes reales. Antes de producción añadir autenticación, cuotas y protección antiabuso.


- Los permisos se comprueban en el servidor: el paciente no puede modificar parámetros ni iniciar ejercicios.
- Acceso profesional: **token de capacidad de sala**, sin login individual ni restricción de creación de salas. Antes de uso clínico comercial, integrar autenticación por profesional, autorización robusta, auditoría, revocación y administración de invitaciones.
- El código del enlace se consume desde el fragmento y se guarda en `sessionStorage`; se retira de la barra del navegador. Sin embargo, el token también se envía por la conexión WebSocket y podría aparecer en registros de infraestructura. Proteger registros y no compartir enlaces públicamente.
- La sincronización de comandos es **aproximada** por latencia de red. No existe todavía calibración precisa de relojes ni audio-visión sincronizados por marcas temporales. Las dos animaciones se ejecutan localmente y pueden tener desfase. **No está validado el ritmo real, el audio ni su sincronía clínica.**
- Los navegadores requieren interacción del paciente para reproducir audio. La activación del sonido es local.
- No incluye videoconferencia, persistencia clínica, consentimiento informado, cifrado extremo a extremo ni monitoreo clínico.
- Las notas originales del prototipo son solo UI; no se envían por WebSocket y no deben utilizarse para almacenar datos sensibles sin rediseño.
- El HTML original carga Tailwind CDN y fuentes externas; antes de producción conviene compilar activos y definir una política de seguridad de contenido.
- Revisar la Ley 19.628 y el régimen aplicable de protección de datos personales en Chile, contratos con proveedores y necesidades institucionales antes de introducir datos de salud.

## Pruebas efectuadas

`npm test` comprueba validación de parámetros y rechazo de mensajes excesivos. `npm run check` comprueba sintaxis JS. `node scripts/smoke.mjs URL` verifica HTTP, creación de sala, conexión de ambos roles, permisos del paciente, configuración, inicio/pausa, parada del paciente y pausa al desconectar el profesional. Crea una sala ficticia temporal de 2 horas; no imprime credenciales y no reproduce estímulos en un navegador. Las pruebas locales y los resultados del despliegue se registran en `EXPERIMENTS.md`. No es una prueba clínica ni mide sincronización audiovisual.

## Arquitectura

`public/index.html`: UI visual original y adaptador `EMDRPrismaEngine`.

`public/realtime.js`: UI de sala, conexión WebSocket, comandos y parada local.

`src/worker.js`: API para crear salas y Durable Object por sesión.

`src/validation.mjs`: validación de configuraciones recibidas.

`wrangler.jsonc`: despliegue de Worker, assets y migración de Durable Objects.

## Licencia

Código original propietario. Ver [`LICENSE.md`](LICENSE.md). Las bibliotecas y recursos de terceros mantienen sus propias licencias; verificar su procedencia antes de comercializar.
