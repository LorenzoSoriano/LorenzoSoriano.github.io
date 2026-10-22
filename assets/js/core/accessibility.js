(() => {
  const strings = {
    it: { 'a11y.skip': 'Salta al contenuto', 'construction.title': 'Sezione in costruzione', 'construction.description': 'Sto preparando render e approfondimenti. Puoi tornare alla Home oppure chiudere questo avviso per esplorare l’anteprima.', 'construction.home': 'Torna alla Home', close: 'Chiudi', menu: 'Apri navigazione', menuClose: 'Chiudi navigazione', nav: 'Navigazione principale', footer: 'Navigazione nel footer', home: 'Home', contact: 'Contattami', previous: 'Progetto precedente', next: 'Progetto successivo', show: 'Mostra', pause: 'Pausa carosello', play: 'Avvia carosello', projects: 'Progetti in evidenza' },
    en: { 'a11y.skip': 'Skip to content', 'construction.title': 'Section under construction', 'construction.description': 'Renders and breakdowns are on their way. Return to the Home page or close this notice to explore the preview.', 'construction.home': 'Back to Home', close: 'Close', menu: 'Open navigation', menuClose: 'Close navigation', nav: 'Main navigation', footer: 'Footer navigation', home: 'Home', contact: 'Contact', previous: 'Previous project', next: 'Next project', show: 'Show', pause: 'Pause carousel', play: 'Start carousel', projects: 'Featured projects' }
  };
  Object.entries(strings).forEach(([lang, dict]) => Object.assign(window.TRANSLATIONS?.[lang] || {}, dict));
  const nav = document.querySelector('.nav');
  const menu = document.querySelector('.menu-toggle');
  const portfolio = document.querySelector('.portfolio-menu');
  const toggle = document.querySelector('.portfolio-toggle');
  const dropdown = document.querySelector('.portfolio-dropdown');
  if (nav) { nav.id = 'primary-navigation'; menu?.setAttribute('aria-controls', nav.id); }
  if (dropdown) { dropdown.id = 'portfolio-navigation'; toggle?.setAttribute('aria-controls', dropdown.id); }
  function closePortfolio(restore = false) {
    portfolio?.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
    if (restore) toggle?.focus();
  }
  function closeMenu(restore = false) {
    closePortfolio(); nav?.classList.remove('open'); menu?.setAttribute('aria-expanded', 'false');
    if (restore) menu?.focus();
  }
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
    if (portfolio?.classList.contains('open')) { closePortfolio(true); event.preventDefault(); }
    else if (nav?.classList.contains('open')) { closeMenu(true); event.preventDefault(); }
  }, true);
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeMenu();
    if (event.target.closest('.nav a')) closePortfolio();
    translateLabels();
  });
  document.querySelector('.site-header')?.addEventListener('focusout', event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) closeMenu();
    else if (event.relatedTarget && !portfolio?.contains(event.relatedTarget)) closePortfolio();
  });
  const footer = document.querySelector('footer');
  if (footer) {
    const links = document.createElement('nav');
    links.className = 'footer-links';
    links.innerHTML = (footer.querySelector('a[href="index.html"]') ? '' : '<a href="index.html" data-footer-label="home">Home</a>') + '<a href="contact.html" data-footer-label="contact">Contact</a>';
    footer.append(links);
  }
  function translateLabels() {
    const dict = strings[document.documentElement.lang === 'it' ? 'it' : 'en'];
    document.querySelectorAll('[data-a11y-label]').forEach(el => el.setAttribute('aria-label', dict[el.dataset.a11yLabel]));
    menu?.setAttribute('aria-label', dict[menu.getAttribute('aria-expanded') === 'true' ? 'menuClose' : 'menu']);
    nav?.setAttribute('aria-label', dict.nav);
    document.querySelector('.footer-links')?.setAttribute('aria-label', dict.footer);
    document.querySelectorAll('[data-footer-label]').forEach(el => el.textContent = dict[el.dataset.footerLabel]);
    document.querySelector('.featured-carousel')?.setAttribute('aria-label', dict.projects);
  }
  document.addEventListener('portfolio:language', translateLabels);
  applyLanguage(document.documentElement.lang === 'it' ? 'it' : 'en');
  const dialog = document.querySelector('.construction-dialog');
  if (dialog) {
    const main = document.querySelector('main');
    dialog.querySelector('[data-close-construction]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => main?.focus({ preventScroll: true }));
    dialog.showModal();
  }
})();
