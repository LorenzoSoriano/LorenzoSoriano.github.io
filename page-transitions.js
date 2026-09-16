(() => {
  if (!document.querySelector('link[data-zoom-resilience]')) {
    const zoomStyles = document.createElement('link');
    zoomStyles.rel = 'stylesheet';
    zoomStyles.href = 'zoom-resilience.css?v=1';
    zoomStyles.dataset.zoomResilience = 'true';
    document.head.appendChild(zoomStyles);
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const transitionKey = 'portfolioBubbleTransition';

  const style = document.createElement('style');
  style.textContent = `
    .bubble-transition{
      position:fixed;
      inset:0;
      z-index:2147483000;
      overflow:hidden;
      pointer-events:none;
      visibility:hidden;
      contain:strict;
    }
    .bubble-transition::before{
      content:"";
      position:absolute;
      inset:0;
      background:#1e2440;
      opacity:0;
      pointer-events:none;
    }
    .bubble-transition.is-covering,
    .bubble-transition.is-revealing{
      visibility:visible;
      pointer-events:auto;
    }
    .bubble-transition__bubble{
      position:absolute;
      left:var(--x);
      top:var(--y);
      width:var(--size);
      aspect-ratio:1;
      border-radius:50%;
      transform:translate(-50%,-50%) scale(.02);
      transform-origin:center;
      opacity:0;
      will-change:transform,opacity;
      background:
        radial-gradient(circle at 31% 27%,rgba(255,255,255,.82) 0 4%,rgba(255,255,255,.2) 5% 12%,transparent 13%),
        radial-gradient(circle at 68% 72%,rgba(255,255,255,.16),transparent 42%),
        var(--bubble-color);
      border:1px solid rgba(255,255,255,.34);
      box-shadow:
        inset 0 0 0 2px rgba(255,255,255,.08),
        inset -24px -28px 52px rgba(30,36,64,.14),
        0 18px 48px rgba(30,36,64,.16);
    }
    .bubble-transition__bubble::after{
      content:"";
      position:absolute;
      inset:14%;
      border:2px solid rgba(255,255,255,.34);
      border-radius:50%;
      opacity:0;
      transform:scale(.72);
    }

    .bubble-transition.is-covering .bubble-transition__bubble{
      animation:bubble-cover .62s cubic-bezier(.2,.78,.18,1) forwards;
      animation-delay:var(--delay);
    }
    .bubble-transition.is-covering::before{
      animation:bubble-veil-in .18s ease forwards;
      animation-delay:.46s;
    }

    .bubble-transition.is-revealing::before{
      opacity:1;
      animation:bubble-veil-out .34s ease forwards;
      animation-delay:.08s;
    }
    .bubble-transition.is-revealing .bubble-transition__bubble{
      opacity:1;
      transform:translate(-50%,-50%) scale(1.18);
      animation:bubble-pop .54s cubic-bezier(.34,.02,.18,1) forwards;
      animation-delay:var(--pop-delay);
    }
    .bubble-transition.is-revealing .bubble-transition__bubble::after{
      animation:bubble-ring .42s ease-out forwards;
      animation-delay:var(--pop-delay);
    }

    @keyframes bubble-cover{
      0%{opacity:0;transform:translate(-50%,-50%) scale(.02)}
      22%{opacity:1}
      72%{opacity:1;transform:translate(-50%,-50%) scale(1.05)}
      100%{opacity:1;transform:translate(-50%,-50%) scale(1.18)}
    }
    @keyframes bubble-pop{
      0%{opacity:1;transform:translate(-50%,-50%) scale(1.18)}
      34%{opacity:1;transform:translate(-50%,-50%) scale(1.28)}
      58%{opacity:.98;transform:translate(-50%,-50%) scale(.92)}
      100%{opacity:0;transform:translate(-50%,-50%) scale(.02)}
    }
    @keyframes bubble-ring{
      0%{opacity:0;transform:scale(.68)}
      28%{opacity:.72}
      100%{opacity:0;transform:scale(1.34)}
    }
    @keyframes bubble-veil-in{
      from{opacity:0}
      to{opacity:1}
    }
    @keyframes bubble-veil-out{
      from{opacity:1}
      to{opacity:0}
    }

    body.language-fade main,
    body.language-fade footer{
      opacity:.3;
      transform:translateY(2px);
      transition:opacity .14s ease,transform .14s ease;
    }
    body:not(.language-fade) main,
    body:not(.language-fade) footer{
      transition:opacity .18s ease,transform .18s ease;
    }

    @media(max-width:620px){
      .bubble-transition__bubble{
        box-shadow:
          inset 0 0 0 1px rgba(255,255,255,.08),
          inset -14px -18px 34px rgba(30,36,64,.12),
          0 10px 28px rgba(30,36,64,.13);
      }
    }

    @media(prefers-reduced-motion:reduce){
      .bubble-transition{display:none!important}
      body.language-fade main,
      body.language-fade footer,
      body:not(.language-fade) main,
      body:not(.language-fade) footer{
        transition:none!important;
        transform:none!important;
      }
    }
  `;
  document.head.appendChild(style);

  const palette = ['#796cf0','#5ea0f0','#8b7cf4','#eef29d','#f4d75c','#6f8df0'];
  const layout = [
    [3,4,39],[23,2,44],[45,5,36],[69,2,43],[91,6,40],
    [11,28,43],[34,25,38],[58,29,45],[82,25,40],[101,31,46],
    [-3,55,45],[21,52,39],[46,57,46],[72,53,38],[94,58,45],
    [9,82,42],[32,79,47],[57,84,40],[80,80,46],[101,86,42],
    [1,104,40],[27,101,45],[53,103,37],[77,101,44],[97,104,40]
  ];

  function ensureOverlay() {
    let overlay = document.querySelector('.bubble-transition');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.className = 'bubble-transition';
    overlay.setAttribute('aria-hidden', 'true');

    layout.forEach(([x,y,size], index) => {
      const bubble = document.createElement('span');
      bubble.className = 'bubble-transition__bubble';
      bubble.style.setProperty('--x', `${x}%`);
      bubble.style.setProperty('--y', `${y}%`);
      bubble.style.setProperty('--size', `${size}vmax`);
      bubble.style.setProperty('--bubble-color', palette[index % palette.length]);
      bubble.style.setProperty('--delay', `${(index % 5) * 20}ms`);
      bubble.style.setProperty('--pop-delay', `${((layout.length - 1 - index) % 7) * 24}ms`);
      overlay.appendChild(bubble);
    });

    document.body.appendChild(overlay);
    return overlay;
  }

  function setWaveDelays(overlay, originX, originY) {
    const width = Math.max(window.innerWidth,1);
    const height = Math.max(window.innerHeight,1);
    const maxDistance = Math.hypot(width,height);

    [...overlay.children].forEach((bubble, index) => {
      const x = parseFloat(bubble.style.getPropertyValue('--x')) / 100 * width;
      const y = parseFloat(bubble.style.getPropertyValue('--y')) / 100 * height;
      const distance = Math.hypot(x-originX,y-originY) / maxDistance;
      const jitter = (index % 4) * 8;
      bubble.style.setProperty('--delay', `${Math.round(distance * 145 + jitter)}ms`);
    });
  }

  function revealIncomingTransition() {
    if (reduceMotion) return;
    let incoming = false;
    try {
      incoming = sessionStorage.getItem(transitionKey) === '1';
      if (incoming) sessionStorage.removeItem(transitionKey);
    } catch {}
    if (!incoming) return;

    const overlay = ensureOverlay();
    overlay.classList.add('is-revealing');

    window.setTimeout(() => {
      overlay.classList.remove('is-revealing');
      overlay.remove();
    }, 930);
  }

  revealIncomingTransition();

  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      document.querySelector('.bubble-transition')?.remove();
    }
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-lang]');
    if (!button) return;

    const nextLang = button.dataset.lang;
    const currentLang = document.documentElement.lang;
    if (!nextLang || nextLang === currentLang || reduceMotion) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    document.body.classList.add('language-fade');

    window.setTimeout(() => {
      if (typeof window.applyLanguage === 'function') window.applyLanguage(nextLang);
      window.setTimeout(() => document.body.classList.remove('language-fade'), 30);
    }, 120);
  }, true);

  let navigationLocked = false;

  document.addEventListener('click', event => {
    if (navigationLocked || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = event.target.closest('a[href]');
    if (!link) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;

    let url;
    try { url = new URL(link.href, window.location.href); } catch { return; }
    if (url.origin !== window.location.origin) return;

    const sameDocument = url.pathname === window.location.pathname && url.search === window.location.search;
    if (sameDocument && url.hash) return;
    if (reduceMotion) return;

    event.preventDefault();
    navigationLocked = true;

    const overlay = ensureOverlay();
    const originX = Number.isFinite(event.clientX) ? event.clientX : window.innerWidth / 2;
    const originY = Number.isFinite(event.clientY) ? event.clientY : window.innerHeight / 2;
    setWaveDelays(overlay, originX, originY);
    overlay.classList.add('is-covering');

    try { sessionStorage.setItem(transitionKey, '1'); } catch {}

    window.setTimeout(() => {
      window.location.href = url.href;
    }, 790);
  });
})();