(() => {
  if (window.ContactBrickMobileExit) {
    window.ContactBrickMobileExit.init?.();
    return;
  }

  const phoneQuery = window.matchMedia('(max-width: 700px), (pointer: coarse)');

  function ensureButton() {
    if (document.body.dataset.page !== 'contact') return;
    const root = document.querySelector('.brick-egg-layer');
    if (!root || !phoneQuery.matches || root.querySelector('.brick-egg-mobile-exit')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'brick-egg-mobile-exit';
    button.setAttribute('aria-label', 'Exit easter egg');
    button.innerHTML = '<span aria-hidden="true">×</span>';

    const close = event => {
      event.preventDefault();
      event.stopPropagation();
      window.ContactBrickBreaker?.stop?.();
    };

    button.addEventListener('pointerdown', close, { passive: false });
    button.addEventListener('click', close);
    root.appendChild(button);
  }

  const observer = new MutationObserver(ensureButton);

  function init() {
    if (!document.body) return;
    ensureButton();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.ContactBrickMobileExit = { init: ensureButton };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
