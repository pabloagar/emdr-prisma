# EMDR Prisma · Plataforma de Estimulación Bilateral (React + TypeScript)

Plataforma interactiva clínica de estimulación bilateral EMDR reescrita en React 19 y TypeScript sobre Vite y Express con soporte de sincronización remota en tiempo real mediante WebSocket y BroadcastChannel.

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
  - Conexión WebSocket a `/api/rooms/:roomId/ws` y soporte complementario para pruebas multipestaña con `BroadcastChannel`.
- **Informe Clínico de Sesión**: Conteo de pasadas bilaterales, tiempo de estimulación y registro de notas/SUDs guardados al historial.

## Tecnologías

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite.
- **Backend**: Node.js, Express, `ws` (WebSocket Server).
- **Audio**: WebAudio API con StereoPannerNode y osciladores sintéticos.

## Ejecución

```bash
# Modo de desarrollo (dev server en puerto 3000)
npm run dev

# Compilar frontend
npm run build

# Iniciar servidor en producción
npm start
```
