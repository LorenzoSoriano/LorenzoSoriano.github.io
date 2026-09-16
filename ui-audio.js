(() => {
  if (window.__portfolioUiAudioLoaded) return;
  window.__portfolioUiAudioLoaded = true;

  const VOLUME_KEY = 'portfolioUiVolume';
  const DEFAULT_VOLUME = 0.32;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  let context = null;
  let master = null;
  let volume = Number.parseFloat(localStorage.getItem(VOLUME_KEY));
  if (!Number.isFinite(volume)) volume = DEFAULT_VOLUME;
  volume = Math.max(0, Math.min(1, volume));
  let lastNonZeroVolume = volume > 0 ? volume : DEFAULT_VOLUME;
  let lastHover = null;
  let lastWheelSound = 0;
  let lastSliderSound = 0;
  let transitionResizeObserver = null;

  const interactiveSelector = [
    'a[href]',
    'button',
    '[role="button"]',
    'input[type="range"]',
    '.portal-card',
    '.project-card',
    '.content-card',
    '.design-journey-card',
    '.featured-carousel-arrow',
    '.featured-carousel-dots button'
  ].join(',');

  function ensureContext() {
    if (!AudioContextClass) return Promise.resolve(false);
    if (!context) {
      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = volume;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') {
      return context.resume().then(() => true).catch(() => false);
    }
    return Promise.resolve(true);
  }

  function setMasterVolume(next) {
    volume = Math.max(0, Math.min(1, Number(next) || 0));
    if (volume > 0) lastNonZeroVolume = volume;
    localStorage.setItem(VOLUME_KEY, String(volume));
    if (master && context) {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(volume, context.currentTime, 0.018);
    }
    updateVolumeUi();
  }

  function tone(startFrequency, endFrequency, duration, level, type = 'sine', delay = 0) {
    if (!context || !master || volume <= 0 || context.state !== 'running') return;
    const now = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, startFrequency), now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + Math.min(0.012, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function noise(duration = 0.025, level = 0.018, frequency = 1800) {
    if (!context || !master || volume <= 0 || context.state !== 'running') return;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      const envelope = 1 - i / length;
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 0.8;
    gain.gain.value = level;
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
  }

  function playHover() {
    tone(560, 690, 0.045, 0.018, 'sine');
  }

  function playPress() {
    tone(205, 132, 0.075, 0.034, 'triangle');
    noise(0.024, 0.013, 1550);
  }

  function playMenuOpen() {
    tone(245, 330, 0.065, 0.026, 'triangle');
    tone(360, 470, 0.055, 0.015, 'sine', 0.034);
  }

  function playScroll(direction) {
    const up = direction < 0;
    tone(up ? 370 : 330, up ? 430 : 285, 0.032, 0.0075, 'sine');
  }

  function playSliderTick() {
    tone(420, 500, 0.028, 0.01, 'sine');
  }

  function iconMarkup() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 10v4h4l5 4V6L8 10H4Z"></path>
        <path class="sound-wave" d="M16 9.2c1 .8 1.5 1.7 1.5 2.8S17 14 16 14.8"></path>
        <path class="sound-wave" d="M18.5 6.8c1.8 1.5 2.7 3.2 2.7 5.2s-.9 3.7-2.7 5.2"></path>
      </svg>`;
  }

  function createVolumeUi() {
    if (document.querySelector('.ui-audio-root')) return;

    const root = document.createElement('div');
    root.className = 'ui-audio-root';
    root.innerHTML = `
      <button class="ui-audio-button" type="button" aria-expanded="false" aria-label="UI volume">
        ${iconMarkup()}
      </button>
      <div class="ui-audio-panel" role="group" aria-label="UI sound volume">
        <div class="ui-audio-panel__top">
          <span class="ui-audio-panel__label">UI SOUND</span>
          <output>32%</output>
        </div>
        <input class="ui-audio-slider" type="range" min="0" max="100" step="1" value="32" aria-label="UI sound volume">
        <p class="ui-audio-hint">Hover, pressione, menu e scroll.</p>
      </div>`;

    document.body.appendChild(root);

    const button = root.querySelector('.ui-audio-button');
    const slider = root.querySelector('.ui-audio-slider');

    button.addEventListener('click', event => {
      event.stopPropagation();
      const open = root.classList.toggle('open');
      button.setAttribute('aria-expanded', String(open));
      ensureContext();
    });

    slider.addEventListener('input', () => {
      const next = Number(slider.value) / 100;
      setMasterVolume(next);
      const now = performance.now();
      if (now - lastSliderSound > 70) {
        lastSliderSound = now;
        ensureContext().then(ok => { if (ok && next > 0) playSliderTick(); });
      }
    });

    slider.addEventListener('dblclick', () => {
      setMasterVolume(volume > 0 ? 0 : lastNonZeroVolume);
    });

    document.addEventListener('click', event => {
      if (!root.contains(event.target)) {
        root.classList.remove('open');
        button.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        root.classList.remove('open');
        button.setAttribute('aria-expanded', 'false');
      }
    });

    updateVolumeUi();
    syncVolumePosition();
    watchTransitionToggle();
  }

  function updateVolumeUi() {
    const root = document.querySelector('.ui-audio-root');
    if (!root) return;
    const percent = Math.round(volume * 100);
    const button = root.querySelector('.ui-audio-button');
    const slider = root.querySelector('.ui-audio-slider');
    const output = root.querySelector('output');
    const label = root.querySelector('.ui-audio-panel__label');
    const hint = root.querySelector('.ui-audio-hint');
    const italian = (document.documentElement.lang || 'en').toLowerCase().startsWith('it');

    if (slider) slider.value = String(percent);
    if (output) output.textContent = `${percent}%`;
    if (button) {
      button.dataset.muted = String(percent === 0);
      button.setAttribute('aria-label', italian ? 'Volume interfaccia' : 'UI volume');
    }
    if (label) label.textContent = italian ? 'SUONI UI' : 'UI SOUND';
    if (hint) hint.textContent = italian ? 'Hover, pressione, menu e scorrimento.' : 'Hover, press, menus and scrolling.';
  }

  function syncVolumePosition() {
    const root = document.querySelector('.ui-audio-root');
    if (!root) return;
    const bubbleButton = document.querySelector('.transition-toggle');
    if (!bubbleButton) {
      root.style.right = window.innerWidth <= 700 ? '12px' : '18px';
      root.style.bottom = window.innerWidth <= 700 ? '12px' : '18px';
      return;
    }
    const rect = bubbleButton.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const gap = 9;
    root.style.right = `${Math.max(12, window.innerWidth - rect.left + gap)}px`;
    root.style.bottom = `${Math.max(12, window.innerHeight - rect.bottom)}px`;
  }

  function watchTransitionToggle() {
    transitionResizeObserver?.disconnect();
    const bubbleButton = document.querySelector('.transition-toggle');
    if (bubbleButton && 'ResizeObserver' in window) {
      transitionResizeObserver = new ResizeObserver(syncVolumePosition);
      transitionResizeObserver.observe(bubbleButton);
    }
  }

  function closestInteractive(target) {
    return target?.closest?.(interactiveSelector) || null;
  }

  document.addEventListener('pointerover', event => {
    if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const interactive = closestInteractive(event.target);
    if (!interactive || interactive === lastHover) return;
    lastHover = interactive;
    if (context?.state === 'running' && volume > 0) playHover();
  }, { passive: true });

  document.addEventListener('pointerout', event => {
    if (!lastHover) return;
    const from = closestInteractive(event.target);
    const to = closestInteractive(event.relatedTarget);
    if (from === lastHover && to !== lastHover) lastHover = null;
  }, { passive: true });

  document.addEventListener('pointerdown', event => {
    const interactive = closestInteractive(event.target);
    if (!interactive) return;
    ensureContext().then(ok => {
      if (!ok || volume <= 0) return;
      if (interactive.matches('.menu-toggle,.portfolio-toggle')) playMenuOpen();
      else playPress();
    });
  }, { capture: true, passive: true });

  window.addEventListener('wheel', event => {
    if (Math.abs(event.deltaY) < 4 || event.target.closest?.('.ui-audio-panel')) return;
    const now = performance.now();
    if (now - lastWheelSound < 125) return;
    lastWheelSound = now;
    if (context?.state === 'running' && volume > 0) playScroll(event.deltaY);
  }, { passive: true });

  window.addEventListener('resize', syncVolumePosition, { passive: true });

  const bodyObserver = new MutationObserver(() => {
    if (!document.querySelector('.ui-audio-root')) createVolumeUi();
    watchTransitionToggle();
    syncVolumePosition();
  });

  function init() {
    createVolumeUi();
    bodyObserver.observe(document.body, { childList: true });
    const langObserver = new MutationObserver(updateVolumeUi);
    langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
