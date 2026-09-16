const graphicsStyles = document.createElement('link');
graphicsStyles.rel = 'stylesheet';
graphicsStyles.href = 'graphics-overrides.css?v=9';
document.head.appendChild(graphicsStyles);

const timelineStyles = document.createElement('link');
timelineStyles.rel = 'stylesheet';
timelineStyles.href = 'about-timeline.css?v=3';
document.head.appendChild(timelineStyles);

const typographyStyles = document.createElement('link');
typographyStyles.rel = 'stylesheet';
typographyStyles.href = 'typography.css?v=3';
document.head.appendChild(typographyStyles);

const backgroundLayerStyles = document.createElement('link');
backgroundLayerStyles.rel = 'stylesheet';
backgroundLayerStyles.href = 'background-layer.css?v=2';
document.head.appendChild(backgroundLayerStyles);

const sectionThemeStyles = document.createElement('link');
sectionThemeStyles.rel = 'stylesheet';
sectionThemeStyles.href = 'section-themes.css?v=1';
document.head.appendChild(sectionThemeStyles);

const page = document.body.dataset.page || 'home';

if (window.TRANSLATIONS) {
  Object.assign(window.TRANSLATIONS.en, {
    "nav.portfolio": "Portfolio",
    "nav.contact": "Contact",
    "nav.narrative": "Narrative Design",
    "nav.production": "Game Production & Communication",
    "title.contact": "Contact — Lorenzo Soriano",
    "title.serious": "Project Gifted — Lorenzo Soriano",
    "serious.label": "PROJECT GIFTED / INTERNSHIP / GAME DEVELOPMENT",
    "dev.giftedTitle": "Project Gifted",
    "dev.thesisTitle": "Thesis: Study and implementation of non-Euclidean spaces in video games",
    "contact.pageLabel": "CONTACT",
    "contact.pageTitle": "Let’s build something together.",
    "contact.pageIntro": "For opportunities, collaborations or project discussions, you can reach me directly or send a message.",
    "contact.directTitle": "Direct contacts",
    "contact.formTitle": "Send me a message",
    "contact.email": "Email",
    "contact.phone": "Phone",
    "contact.linkedin": "LinkedIn",
    "contact.formName": "Name",
    "contact.formNamePlaceholder": "Your name",
    "contact.formEmail": "Your email",
    "contact.formEmailPlaceholder": "name@example.com",
    "contact.formMessage": "Message",
    "contact.formMessagePlaceholder": "Tell me about the opportunity or project...",
    "contact.formSend": "Prepare email",
    "contact.formNote": "The button opens your email application with the message already prepared.",
    "dev.capabilities": "Capabilities",
    "dev.capabilitiesTitle": "Unity, tools, rendering and world systems.",
    "art.environmentTag": "Environment",
    "art.assetTag": "Modeling",
    "art.stylizedTag": "Stylized Art",
    "vitis.metaRole": "Role",
    "vitis.metaEngine": "Engine",
    "vitis.metaFocus": "Current Focus",
    "vitis.metaStatus": "Status",
    "vitis.overviewLabel": "Overview",
    "vitis.media": "World building video / environment shot",
    "vitis.moreTitle": "More breakdowns coming soon.",
    "vitis.moreDesc": "This case study will expand with videos, editor captures, before/after comparisons and technical breakdowns.",
    "vitis.back": "Back to Game Development"
  });

  Object.assign(window.TRANSLATIONS.it, {
    "nav.portfolio": "Portfolio",
    "nav.contact": "Contattami",
    "nav.narrative": "Narrative Design",
    "nav.production": "Game Production & Communication",
    "title.contact": "Contattami — Lorenzo Soriano",
    "title.serious": "Project Gifted — Lorenzo Soriano",
    "serious.label": "PROJECT GIFTED / TIROCINIO / GAME DEVELOPMENT",
    "dev.giftedTitle": "Project Gifted",
    "dev.thesisTitle": "Tesi: Studio e implementazione di spazi non euclidei nei videogiochi",
    "contact.pageLabel": "CONTATTAMI",
    "contact.pageTitle": "Costruiamo qualcosa insieme.",
    "contact.pageIntro": "Per opportunità, collaborazioni o progetti, puoi contattarmi direttamente oppure inviarmi un messaggio.",
    "contact.directTitle": "Contatti diretti",
    "contact.formTitle": "Scrivimi",
    "contact.email": "Email",
    "contact.phone": "Telefono",
    "contact.linkedin": "LinkedIn",
    "contact.formName": "Nome",
    "contact.formNamePlaceholder": "Il tuo nome",
    "contact.formEmail": "La tua email",
    "contact.formEmailPlaceholder": "nome@esempio.com",
    "contact.formMessage": "Messaggio",
    "contact.formMessagePlaceholder": "Parlami dell’opportunità o del progetto...",
    "contact.formSend": "Prepara email",
    "contact.formNote": "Il pulsante apre la tua applicazione email con il messaggio già preparato.",
    "dev.capabilities": "Competenze",
    "dev.capabilitiesTitle": "Unity, strumenti, rendering e sistemi per il mondo di gioco.",
    "art.environmentTag": "Ambiente",
    "art.assetTag": "Modellazione",
    "art.stylizedTag": "Arte stilizzata",
    "vitis.metaRole": "Ruolo",
    "vitis.metaEngine": "Engine",
    "vitis.metaFocus": "Focus attuale",
    "vitis.metaStatus": "Stato",
    "vitis.overviewLabel": "Panoramica",
    "vitis.media": "Video world building / immagine ambiente",
    "vitis.moreTitle": "Altri breakdown in arrivo.",
    "vitis.moreDesc": "Questo case study verrà ampliato con video, catture dell’editor, confronti prima/dopo e breakdown tecnici.",
    "vitis.back": "Torna a Game Development"
  });
}

function buildPrimaryNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  const langSwitch = nav.querySelector('.lang-switch');
  nav.innerHTML = '';

  const home = document.createElement('a');
  home.href = 'index.html';
  home.dataset.page = 'home';
  home.dataset.i18n = 'nav.home';
  home.textContent = 'Home';

  const portfolio = document.createElement('div');
  portfolio.className = 'portfolio-menu';
  portfolio.innerHTML = `
    <button class="portfolio-toggle" type="button" aria-expanded="false">
      <span data-i18n="nav.portfolio">Portfolio</span><span class="dropdown-chevron">⌄</span>
    </button>
    <div class="portfolio-dropdown">
      <a href="game-development.html" data-page="game-dev" data-i18n="nav.game-dev">Game Dev</a>
      <a href="3d-art.html" data-page="3d-art" data-i18n="nav.3d-art">3D Art</a>
      <a href="game-design.html" data-page="game-design" data-i18n="nav.game-design">Game Design</a>
      <a href="narrative-design.html" data-page="narrative" data-i18n="nav.narrative">Narrative Design</a>
      <a href="game-production.html" data-page="production" data-i18n="nav.production">Game Production & Communication</a>
    </div>`;

  const about = document.createElement('a');
  about.href = 'about.html';
  about.dataset.page = 'about';
  about.dataset.i18n = 'nav.about';
  about.textContent = 'About';

  const contact = document.createElement('a');
  contact.href = 'contact.html';
  contact.dataset.page = 'contact';
  contact.dataset.i18n = 'nav.contact';
  contact.textContent = 'Contact';

  nav.append(home, portfolio, about, contact);
  if (langSwitch) nav.appendChild(langSwitch);

  const toggle = portfolio.querySelector('.portfolio-toggle');
  toggle?.addEventListener('click', event => {
    event.stopPropagation();
    const open = portfolio.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', event => {
    if (!portfolio.contains(event.target)) {
      portfolio.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      portfolio.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
    }
  });

  if (['game-dev','3d-art','game-design','design-studies','narrative','production','vitis','remember','serious','nolight','momentum','legend','beyond','dissonant'].includes(page)) {
    toggle?.classList.add('active');
  }
}

buildPrimaryNav();

if (page === 'about') {
  document.getElementById('contact')?.remove();
}

document.querySelectorAll('.section-index,.card-no').forEach(el => {
  if (/^\d+$/.test(el.textContent.trim())) el.remove();
});

const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
menuButton?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});

document.querySelectorAll('.nav a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  document.querySelector('.portfolio-menu')?.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
}));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: .08 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

document.querySelectorAll('.nav a[data-page]').forEach(link => {
  if (link.dataset.page === page) link.classList.add('active');
});

function getLanguage() {
  const saved = localStorage.getItem('portfolioLang');
  if (saved === 'it' || saved === 'en') return saved;
  return navigator.language?.toLowerCase().startsWith('it') ? 'it' : 'en';
}

function applyLanguage(lang) {
  const dict = window.TRANSLATIONS?.[lang] || window.TRANSLATIONS?.en || {};
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const value = dict[el.dataset.i18n];
    if (value !== undefined) el.textContent = value;
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const value = dict[el.dataset.i18nHtml];
    if (value !== undefined) el.innerHTML = value;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const value = dict[el.dataset.i18nPlaceholder];
    if (value !== undefined) el.setAttribute('placeholder', value);
  });
  document.querySelectorAll('[data-lang]').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
  const title = dict[`title.${page}`];
  if (title) document.title = title;
  localStorage.setItem('portfolioLang', lang);
}

document.querySelectorAll('[data-lang]').forEach(btn => btn.addEventListener('click', () => applyLanguage(btn.dataset.lang)));
applyLanguage(getLanguage());

const profile = document.querySelector('.profile-photo');
if (profile) {
  profile.addEventListener('load', () => {
    profile.hidden = false;
    const placeholder = document.querySelector('.photo-placeholder');
    if (placeholder) placeholder.style.display = 'none';
  });
  profile.addEventListener('error', () => { profile.hidden = true; });
}

const contactForm = document.getElementById('contact-form');
contactForm?.addEventListener('submit', event => {
  event.preventDefault();
  const name = document.getElementById('contact-name')?.value.trim() || '';
  const email = document.getElementById('contact-email')?.value.trim() || '';
  const message = document.getElementById('contact-message')?.value.trim() || '';
  const recipient = contactForm.dataset.recipient || '';
  const lang = getLanguage();
  const subject = lang === 'it' ? `Contatto portfolio da ${name}` : `Portfolio contact from ${name}`;
  const body = lang === 'it'
    ? `Nome: ${name}\nEmail: ${email}\n\nMessaggio:\n${message}`
    : `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
  window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const transitionController = document.createElement('script');
transitionController.src = 'page-transitions.js?v=1';
transitionController.async = false;
document.head.appendChild(transitionController);