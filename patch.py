from pathlib import Path
p=Path(__file__).parent/'public/index.html'
s=p.read_text()
s=s.replace('<title>Bilateral Clínico EMDR · Consola Profesional</title>','<title>EMDR Prisma · Plataforma de estimulación bilateral</title>')
s=s.replace('        Bilateral Clínico\n','        EMDR Prisma\n',1)
s=s.replace('id="patient-sync-status">Sincronizado','id="patient-sync-status">Sin conexión')
s=s.replace('id="ws-latency-badge">12ms','id="ws-latency-badge">--')
s=s.replace('>1 paciente</span>','>Sala remota</span>',1)
s=s.replace("  function startSession() {\n    getAudioContext();", "  function startSession() {\n    if (isPlaying) return;\n    getAudioContext();")
s=s.replace('    animId = requestAnimationFrame(render);\n  }\n\n  function requestSmoothPause()', "    animId = requestAnimationFrame(render);\n    if (!isPatient) window.dispatchEvent(new CustomEvent('emdr:action',{detail:'start'}));\n  }\n\n  function requestSmoothPause()",1)
s=s.replace("    if (statusLabel) statusLabel.textContent = 'Retornando al centro...';", "    if (!isPatient) window.dispatchEvent(new CustomEvent('emdr:action',{detail:'pause'}));\n    if (statusLabel) statusLabel.textContent = 'Retornando al centro...';",1)
needle='  // Inicialización\n  setPalette(\'salvia\');'
insert="""  // API de integración con el controlador remoto; solo expone comandos locales validados.
  function emergencyStop() {
    isPlaying = false; isStoppingSmoothly = false;
    if (animId) cancelAnimationFrame(animId);
    animId = null;
    cur.nx = 0; cur.ny = 0; cur.lat = 0;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    finalizePauseState(); paint();
  }
  function currentSettings() {
    return {
      level, trajectory, stimulus, soundType, soundActive, dotSize,
      palette: activePalette, bg: document.getElementById('current-bg-hex')?.textContent?.trim() || '#faf8f5'
    };
  }
  window.EMDRPrismaEngine = {
    settings: currentSettings,
    playing: () => isPlaying,
    applySettings(next) {
      if (next.level != null) updateSpeed(next.level);
      if (next.trajectory != null) setTrajectory(next.trajectory);
      if (next.palette != null) setPalette(next.palette);
      if (next.bg != null) { stage.style.backgroundColor = next.bg; document.getElementById('current-bg-hex').textContent = next.bg; }
      if (next.stimulus != null) document.querySelector(`.stim-shape-btn[data-shape="${next.stimulus}"]`)?.click();
      if (next.dotSize != null) { const slider=document.getElementById('slider-dot-size'); if(slider){slider.value=next.dotSize;slider.dispatchEvent(new Event('input',{bubbles:true}));} }
      if (next.soundActive != null) { soundActive=next.soundActive; const box=document.getElementById('checkbox-sound-active');if(box)box.checked=next.soundActive; }
      if (next.soundType != null) document.querySelector(`.sound-option-btn[data-sound="${next.soundType}"]`)?.click();
      paint();
    },
    start: () => { if(!isPlaying) startSession(); },
    pause: emergencyStop,
    stop: emergencyStop,
    enableAudio: () => unlockAudio()
  };
  // Emitir cambios del panel después de que sus propios manejadores los procesen.
  ['click','change','input'].forEach(name => document.addEventListener(name,event => {
    if (!isPatient && event.target.closest?.('#config-sidebar, #therapist-bottom-bar, #therapist-header')) {
      queueMicrotask(() => window.dispatchEvent(new CustomEvent('emdr:settings-changed')));
    }
  }));

"""
assert needle in s
s=s.replace(needle,insert+needle,1)
s=s.replace('</body></html>', '<script src="/realtime.js" defer></script></body></html>')
p.write_text(s)
