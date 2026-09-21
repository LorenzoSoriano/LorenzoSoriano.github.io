(() => {
  const root = document.querySelector('[data-dd-shift]');
  if (!root) return;

  const stage = root.querySelector('.dd-shift-stage');
  const tabs = [...root.querySelectorAll('.dd-shift-tab')];

  function select(dimension) {
    const two = dimension === 'two';
    stage?.classList.toggle('is-one', !two);
    stage?.classList.toggle('is-two', two);
    tabs.forEach(tab => {
      const active = tab.dataset.dimension === dimension;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
  }

  tabs.forEach(tab => tab.addEventListener('click', () => select(tab.dataset.dimension)));

  root.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const current = tabs.findIndex(tab => tab.classList.contains('is-active'));
    const next = event.key === 'ArrowRight' ? (current + 1) % tabs.length : (current - 1 + tabs.length) % tabs.length;
    tabs[next]?.focus();
    select(tabs[next]?.dataset.dimension);
  });
})();
