const graphicsStyles = document.createElement('link');
graphicsStyles.rel = 'stylesheet';
graphicsStyles.href = 'assets/css/core/graphics-overrides.css?v=10';
document.head.appendChild(graphicsStyles);

const timelineStyles = document.createElement('link');
timelineStyles.rel = 'stylesheet';
timelineStyles.href = 'assets/css/pages/about/about-timeline.css?v=4';
document.head.appendChild(timelineStyles);

const typographyStyles = document.createElement('link');
typographyStyles.rel = 'stylesheet';
typographyStyles.href = 'assets/css/core/typography.css?v=4';
document.head.appendChild(typographyStyles);

const backgroundLayerStyles = document.createElement('link');
backgroundLayerStyles.rel = 'stylesheet';
backgroundLayerStyles.href = 'assets/css/core/background-layer.css?v=3';
document.head.appendChild(backgroundLayerStyles);

const sectionThemeStyles = document.createElement('link');
sectionThemeStyles.rel = 'stylesheet';
sectionThemeStyles.href = 'assets/css/core/section-themes.css?v=4';
document.head.appendChild(sectionThemeStyles);

const bubbleResponsiveStyles = document.createElement('link');
bubbleResponsiveStyles.rel = 'stylesheet';
bubbleResponsiveStyles.href = 'assets/css/components/bubble-responsive.css?v=3';
bubbleResponsiveStyles.dataset.bubbleResponsive = 'true';
document.head.appendChild(bubbleResponsiveStyles);

const sitePolishStyles = document.createElement('link');
sitePolishStyles.rel = 'stylesheet';
sitePolishStyles.href = 'assets/css/core/site-polish.css?v=1';
sitePolishStyles.dataset.sitePolish = 'true';
document.head.appendChild(sitePolishStyles);

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

  Object.assign(window.TRANSLATIONS.en, {
    "home.title": "I build <em>games, systems</em> and tools in Unity.",
    "home.intro": "I work across development, visual design and game design. These case studies show what I built, how it works and which production problem it was meant to solve.",
    "dev.title": "Unity systems and tools tested inside real projects.",
    "dev.intro": "My work starts from practical production problems: building environments faster, managing water and climate, organising content or making a mechanic easier to read. Those needs become editor tools, shaders and gameplay systems.",
    "art.title": "Environments, assets and visual studies between Blender and Unity.",
    "art.intro": "This section will collect finished renders alongside concise breakdowns of modeling, materials, composition and real-time presentation.",
    "art.note": "The visual gallery is in development. These three spaces define the material that will be added: an environment, an asset breakdown and a stylized study.",
    "art.placeholderEnvironment": "Environment preview in development",
    "art.placeholderAsset": "Asset breakdown in development",
    "art.placeholderStylized": "Stylized study in development",
    "design.title": "I design mechanics, then test how they work together.",
    "design.intro": "The projects in this section show how a concept becomes a playable structure through rules, constraints, iteration and documentation.",
    "narrative.title": "I use space, pacing and interaction to tell a story.",
    "narrative.intro": "My narrative work starts from what the player does and understands: environments, choices and mechanics carry the story together with dialogue.",
    "production.title": "From a concept to a production plan that can be discussed and revised.",
    "production.intro": "This area focuses on the practical material behind a project: scope, GDDs, milestones, pitches and the decisions that connect design to production.",
    "production.dissonantDesc": "Case study in development based on an academic GDD and production exercise: 11-month plan, €85,000 test budget, target, platforms and premium positioning.",
    "about.title": "I develop games with a technical, visual and design perspective.",
    "about.body1": "I mainly work in Unity, where I build gameplay systems, custom tools and visual solutions for the projects I am developing.",
    "about.body2": "In this portfolio I document the problems I faced, the contribution I made and the decisions that changed the final result.",
    "about.approachHeading": "A practical method built around iteration.",
    "about.approachIntro": "I begin by understanding the problem, build a focused prototype and then refine it through testing and feedback. I document the decisions that affect more than one system and avoid adding complexity that does not improve the project.",
    "about.strength1": "Understand the problem first",
    "about.strength2": "Prototype on a small scale",
    "about.strength3": "Document key decisions",
    "about.strength4": "Use feedback in practice",
    "about.strength5": "Refine by priority",
    "about.strength6": "Adapt the process",
    "contact.pageTitle": "Let’s talk about a project or an opportunity.",
    "contact.pageIntro": "For a role, a collaboration or a project discussion, you can contact me directly or use the form.",
    "dissonant.title": "Two dimensions, one traversal system and a production plan built around the concept.",
    "dissonant.intro": "Dissonant Dimension is an academic studio-management exercise that combines a GDD with a test production plan for a dimension-shifting 2D puzzle-action game.",
    "dissonant.status": "Case study in development",
    "dissonant.dimensionA": "Dimension A",
    "dissonant.dimensionB": "Dimension B",
    "dissonant.shift": "SHIFT",
    "dissonant.developmentLabel": "CURRENT STATUS",
    "dissonant.developmentTitle": "The project structure is defined. The visual case study is still being developed.",
    "dissonant.definedTitle": "Already defined",
    "dissonant.definedDesc": "Core mechanic, traversal, genre, target, budget, schedule, platforms and premium positioning.",
    "dissonant.nextTitle": "Next page update",
    "dissonant.nextDesc": "Dimension-shift diagrams, level examples, GDD extracts and a readable production timeline.",
    "dissonant.overviewTitle": "Dimension shifting changes the space; scope and constraints define how the concept can be produced.",
    "dissonant.system1Label": "SPACE",
    "dissonant.system2Label": "MOVEMENT",
    "dissonant.system3Label": "PRODUCTION",
    "dissonant.callTitle": "The project connects what the player does with what the team needs to build.",
    "dissonant.callDesc": "The same material explains both the mechanics and their production impact: every feature is considered together with time, budget, platform and target."
  });

  Object.assign(window.TRANSLATIONS.it, {
    "home.title": "Sviluppo <em>giochi, sistemi</em> e strumenti in Unity.",
    "home.intro": "Lavoro tra sviluppo, direzione visiva e game design. Nei case study mostro cosa ho realizzato, come funziona e quale problema di produzione volevo risolvere.",
    "dev.title": "Sistemi e strumenti Unity testati dentro progetti reali.",
    "dev.intro": "Il mio lavoro parte da problemi concreti di produzione: costruire ambienti più velocemente, gestire acqua e clima, organizzare contenuti o rendere una meccanica più leggibile. Da queste esigenze nascono editor tool, shader e sistemi di gameplay.",
    "art.title": "Ambienti, asset e studi visivi tra Blender e Unity.",
    "art.intro": "Questa sezione raccoglierà render finali e breakdown sintetici dedicati a modellazione, materiali, composizione e presentazione real-time.",
    "art.note": "La galleria visiva è in sviluppo. Questi tre spazi definiscono i materiali che verranno inseriti: un ambiente, il breakdown di un asset e uno studio stilizzato.",
    "art.placeholderEnvironment": "Anteprima ambiente in preparazione",
    "art.placeholderAsset": "Breakdown asset in preparazione",
    "art.placeholderStylized": "Studio stilizzato in preparazione",
    "design.title": "Progetto le meccaniche e verifico come funzionano insieme.",
    "design.intro": "I progetti di questa sezione mostrano come un concept diventa una struttura giocabile attraverso regole, vincoli, iterazione e documentazione.",
    "narrative.title": "Uso spazio, ritmo e interazione per raccontare una storia.",
    "narrative.intro": "Il mio lavoro narrativo parte da ciò che il giocatore fa e comprende: ambienti, scelte e meccaniche raccontano insieme ai dialoghi.",
    "production.title": "Dal concept a un piano di produzione che può essere discusso e rivisto.",
    "production.intro": "Questa area raccoglie il materiale pratico dietro un progetto: scope, GDD, milestone, pitch e decisioni che collegano design e produzione.",
    "production.dissonantDesc": "Case study in sviluppo basato su un GDD e un'esercitazione accademica di produzione: piano di 11 mesi, budget di prova da 85.000 €, target, piattaforme e posizionamento premium.",
    "about.title": "Sviluppo giochi con uno sguardo tecnico, visivo e progettuale.",
    "about.body1": "Lavoro soprattutto in Unity, dove costruisco sistemi di gameplay, strumenti custom e soluzioni visive per i progetti che sto sviluppando.",
    "about.body2": "Nel portfolio documento i problemi affrontati, il mio contributo e le decisioni che hanno modificato il risultato finale.",
    "about.approachHeading": "Un metodo pratico costruito sull'iterazione.",
    "about.approachIntro": "Parto dalla comprensione del problema, costruisco un prototipo mirato e lo rifinisco attraverso test e feedback. Documento le decisioni che coinvolgono più sistemi ed evito di aggiungere complessità che non migliora il progetto.",
    "about.strength1": "Capire prima il problema",
    "about.strength2": "Prototipare in piccolo",
    "about.strength3": "Documentare le decisioni",
    "about.strength4": "Usare il feedback",
    "about.strength5": "Rifinire per priorità",
    "about.strength6": "Adattare il processo",
    "contact.pageTitle": "Parliamo di un progetto o di un'opportunità.",
    "contact.pageIntro": "Per una posizione, una collaborazione o un progetto puoi contattarmi direttamente oppure usare il form.",
    "dissonant.title": "Due dimensioni, un sistema di movimento e un piano produttivo costruito intorno al concept.",
    "dissonant.intro": "Dissonant Dimension è un'esercitazione accademica di studio management che combina un GDD con un piano produttivo di prova per un puzzle-action 2D basato sul cambio dimensionale.",
    "dissonant.status": "Case study in sviluppo",
    "dissonant.dimensionA": "Dimensione A",
    "dissonant.dimensionB": "Dimensione B",
    "dissonant.shift": "CAMBIO",
    "dissonant.developmentLabel": "STATO ATTUALE",
    "dissonant.developmentTitle": "La struttura del progetto è definita. Il case study visivo è ancora in sviluppo.",
    "dissonant.definedTitle": "Già definito",
    "dissonant.definedDesc": "Meccanica centrale, movimento, genere, target, budget, calendario, piattaforme e posizionamento premium.",
    "dissonant.nextTitle": "Prossimo aggiornamento",
    "dissonant.nextDesc": "Diagrammi del cambio dimensionale, esempi di livello, estratti dal GDD e una timeline produttiva leggibile.",
    "dissonant.overviewTitle": "Il cambio dimensionale modifica lo spazio; scope e vincoli definiscono come produrre il concept.",
    "dissonant.system1Label": "SPAZIO",
    "dissonant.system2Label": "MOVIMENTO",
    "dissonant.system3Label": "PRODUZIONE",
    "dissonant.callTitle": "Il progetto collega ciò che il giocatore fa a ciò che il team deve produrre.",
    "dissonant.callDesc": "Lo stesso materiale spiega sia le meccaniche sia il loro impatto produttivo: ogni feature viene valutata insieme a tempi, budget, piattaforma e target."
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

document.querySelectorAll('.portal-grid,.portfolio-project-grid,.capability-grid,.project-facts,.case-system-grid,.art-gallery').forEach(group => {
  [...group.querySelectorAll(':scope > .reveal')].forEach((item, index) => {
    item.style.setProperty('--reveal-delay', `${Math.min(index, 5) * 65}ms`);
  });
});

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
