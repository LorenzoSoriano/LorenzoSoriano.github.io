(() => {
  const style = document.createElement('style');
  style.textContent = `
    body{
      transition:opacity .28s cubic-bezier(.22,.61,.36,1),transform .28s cubic-bezier(.22,.61,.36,1);
      will-change:opacity,transform;
    }
    body.page-entering{opacity:0;transform:translateY(7px)}
    body.page-entering.page-visible{opacity:1;transform:none}
    body.page-leaving{opacity:0!important;transform:translateY(-6px)!important;pointer-events:none}
    body.language-fade main,
    body.language-fade footer{
      opacity:.28;
      transform:translateY(3px);
      transition:opacity .16s ease,transform .16s ease;
    }
    body:not(.language-fade) main,
    body:not(.language-fade) footer{
      transition:opacity .2s ease,transform .2s ease;
    }
    @media(prefers-reduced-motion:reduce){
      body,body.language-fade main,body.language-fade footer,
      body:not(.language-fade) main,body:not(.language-fade) footer{
        transition:none!important;
        transform:none!important;
      }
    }
  `;
  document.head.appendChild(style);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduceMotion) {
    document.body.classList.add('page-entering');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.body.classList.add('page-visible');
    }));
  }

  window.addEventListener('pageshow', () => {
    document.body.classList.remove('page-leaving');
    if (!reduceMotion) document.body.classList.add('page-visible');
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
      if (typeof window.applyLanguage === 'function') {
        window.applyLanguage(nextLang);
      }
      window.setTimeout(() => document.body.classList.remove('language-fade'), 30);
    }, 145);
  }, true);

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

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
    document.body.classList.remove('page-visible');
    document.body.classList.add('page-leaving');

    window.setTimeout(() => {
      window.location.href = url.href;
    }, 245);
  });
})();
