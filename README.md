# EMDR Prisma · Plataforma de Estimulación Bilateral (React + TypeScript)

Plataforma interactiva clínica de estimulación bilateral EMDR reescrita en React 19 y TypeScript sobre Vite, servida por un Worker de Cloudflare con un Durable Object por sala para la sincronización remota en tiempo real (WebSocket).

## Características Principales

- **11 Trayectorias Clínicas**: Horizontal, Vertical, Diagonal, Alternante, Infinito, Circular, Péndulo, Arco, Zigzag, Rebote y Aleatorio suave con cinemática armónica de alta precisión.
- **Estímulos Clásicos y Experimentales**:
  - Clásicos: Esfera Sólida, Bruma difusa, Anillo hueco.
  - Experimentales con cinemática dedicada: Barra LED cinética (15 focos continuos), Línea de barrido (traslación ping-pong lineal sin aceleración en extremos), Haz láser enfocado con dibujo sobre Canvas 2D, Luces de borde con corte on/off binario instantáneo sin traslación.
- **Audio Estéreo Bilateral**: WebAudio API con paneo L/R sincronizado al impacto con extremos, con 4 timbres acústicos: Latido Somático, Cuenco Zen (440 Hz), Gota de Loto y Click Metrónomo.
- **Paletas Somáticas**: Salvia (botánica y calma), Bruma (enfoque y claridad) y Lino (orgánica y acogida somática), con selectores de fondo rápido (Salvia L, Bruma L, Lino L, Penumbra).
- **Control de Frecuencia con Acordeón Elástico**: Selector de 1 a 20 niveles (0.20 Hz a 1.80 Hz) con micro-medidor de 20 pips animado dinámicamente.
- **Plantillas Preconfiguradas y Personalizadas**: Presets clínicos estándar (Trauma Agudo, Foco Nítido, Hipersensibilidad, Alternancia Rápida) y guardado/carga/eliminación de perfiles de paciente en almacenamiento local.
- **Sincronización Remota Profesional-Paciente**:
  - Vista Profesional con controles completos de sesión, cronómetro, reportes e informe clínico.
  - Vista Paciente inmersiva (`?role=patient`) con controles de seguridad simplificados, botón de activación de sonido y parada de emergencia instantánea.
  - Salas efímeras (2 h) creadas en el servidor: `POST /api/rooms` entrega una credencial para el profesional y otra para el paciente; ambas se guardan solo como hash.
  - Enlace del paciente: `/?role=patient#room=<id>&patient=<token>` (la credencial va en el fragmento y se borra de la barra al cargar).
  - Conexión WebSocket a `/api/rooms/:roomId/ws`; reconexión automática y pausa si se pierde al profesional.
- **Informe Clínico de Sesión**: Conteo de pasadas bilaterales, tiempo de estimulación y registro de notas/SUDs guardados al historial.

## Tecnologías

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite.
- **Backend**: Cloudflare Workers + Durable Objects (`src/worker.ts`, `wrangler.jsonc`).
- **Audio**: WebAudio API con StereoPannerNode y osciladores sintéticos.

## Ejecución

```bash
npm install

# App completa local (compila y levanta el Worker con salas en http://127.0.0.1:8791)
npm run preview

# Desarrollo de interfaz con recarga en caliente (http://localhost:3000).
# Requiere `npm run preview` en otra terminal y copiar .dev.vars.example a .dev.vars.
npm run dev

# Comprobaciones
npm run check                       # tipos
npm run smoke                       # protocolo de salas contra :8791 (o pasar una URL)

# Despliegue (compila automáticamente antes de subir)
npm run deploy
```

Prototipo técnico de demostración, sin validación clínica. Cualquiera con acceso a la web puede crear salas; no introducir datos de pacientes reales.
