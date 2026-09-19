(() => {
  const init = () => {
    document.querySelectorAll('[data-level-browser]').forEach(browser => {
      const tabs = Array.from(browser.querySelectorAll('[data-level-tab]'));
      const panels = Array.from(browser.querySelectorAll('[data-level-panel]'));
      if (!tabs.length || !panels.length) return;

      const activate = key => {
        tabs.forEach(tab => {
          const active = tab.dataset.levelTab === key;
          tab.classList.toggle('is-active', active);
          tab.setAttribute('aria-selected', active ? 'true' : 'false');
          tab.tabIndex = active ? 0 : -1;
        });

        panels.forEach(panel => {
          const active = panel.dataset.levelPanel === key;
          panel.classList.toggle('is-active', active);
          panel.hidden = !active;
        });
      };

      tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => activate(tab.dataset.levelTab));

        tab.addEventListener('keydown', event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();

          let next = index;
          if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
          if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
          if (event.key === 'Home') next = 0;
          if (event.key === 'End') next = tabs.length - 1;

          tabs[next].focus();
          activate(tabs[next].dataset.levelTab);
        });
      });

      const active = tabs.find(tab => tab.classList.contains('is-active')) || tabs[0];
      activate(active.dataset.levelTab);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();
