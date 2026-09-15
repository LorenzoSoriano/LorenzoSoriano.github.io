window.TRANSLATIONS = window.TRANSLATIONS || { en:{}, it:{} };

Object.assign(window.TRANSLATIONS.en, {
  "title.remember":"Remember to Wait — Lorenzo Soriano",
  "remember.label":"GAME JAM / NARRATIVE PUZZLE",
  "remember.intro":"A short first-person puzzle-narrative experience about the tension between rushing and waiting, created by Raccoon Interactive during a 48-hour game jam.",
  "remember.metaRole":"Role",
  "remember.role":"Game Design · Audio",
  "remember.metaFormat":"Format",
  "remember.format":"48h Game Jam",
  "remember.metaGenre":"Genre",
  "remember.genre":"Puzzle · Narrative · First Person",
  "remember.metaAward":"Award",
  "remember.awardShort":"Best Sound Effects & Soundtrack",
  "remember.itch":"Play / download on itch.io ↗",
  "remember.watch":"Watch trailer ↓",
  "remember.overviewLabel":"Overview",
  "remember.overviewTitle":"A game about the pressure to always be in a hurry.",
  "remember.overview1":"The player follows a worker obsessed with his career, constantly pushed to decide whether to rush or wait. The opening turns an everyday routine into a source of pressure: get ready, leave the apartment and catch the bus before time runs out.",
  "remember.overview2":"The core idea is deliberately simple: waiting is not treated as dead time, but as part of the mechanic and the narrative. That contrast between urgency and patience gives the experience its identity.",
  "remember.contributionLabel":"Contribution",
  "remember.contributionTitle":"Designing a readable experience under a very short production window.",
  "remember.designTitle":"Game Design",
  "remember.designDesc":"Structuring the rush-versus-wait idea into short, understandable interactions and a compact player loop suitable for a game jam.",
  "remember.audioTitle":"Audio & Feedback",
  "remember.audioDesc":"Using sound, timing and feedback to reinforce tension, rhythm and the contrast between urgency and pauses.",
  "remember.teamTitle":"Rapid Iteration",
  "remember.teamDesc":"Working inside a 48-hour scope meant prioritising clarity, testing ideas quickly and cutting anything that did not support the central concept.",
  "remember.awardTitle":"Rome Game Dev Jam 2025",
  "remember.awardDesc":"Remember to Wait received the award for Best Sound Effects and Soundtrack.",
  "remember.openGame":"Open game page ↗",
  "remember.nextTitle":"A small project with a clear idea at its center.",
  "remember.nextDesc":"The case study will grow with screenshots, development notes and a more detailed breakdown of the game jam process.",
  "remember.back":"Back to Game Development"
});

Object.assign(window.TRANSLATIONS.it, {
  "title.remember":"Remember to Wait — Lorenzo Soriano",
  "remember.label":"GAME JAM / PUZZLE NARRATIVO",
  "remember.intro":"Una breve esperienza puzzle-narrativa in prima persona sul contrasto tra correre e aspettare, realizzata da Raccoon Interactive durante una game jam di 48 ore.",
  "remember.metaRole":"Ruolo",
  "remember.role":"Game Design · Audio",
  "remember.metaFormat":"Formato",
  "remember.format":"Game Jam 48h",
  "remember.metaGenre":"Genere",
  "remember.genre":"Puzzle · Narrativo · Prima persona",
  "remember.metaAward":"Premio",
  "remember.awardShort":"Migliori Effetti Sonori e Colonna Sonora",
  "remember.itch":"Gioca / scarica su itch.io ↗",
  "remember.watch":"Guarda il trailer ↓",
  "remember.overviewLabel":"Panoramica",
  "remember.overviewTitle":"Un gioco sulla pressione di dover essere sempre di fretta.",
  "remember.overview1":"Il giocatore segue un lavoratore ossessionato dalla carriera, continuamente spinto a decidere se correre o aspettare. L'inizio trasforma una routine quotidiana in una fonte di pressione: prepararsi, uscire dall'appartamento e prendere l'autobus prima che il tempo finisca.",
  "remember.overview2":"L'idea centrale è volutamente semplice: l'attesa non viene trattata come tempo morto, ma come parte della meccanica e della narrazione. Il contrasto tra urgenza e pazienza dà identità all'esperienza.",
  "remember.contributionLabel":"Contributo",
  "remember.contributionTitle":"Progettare un'esperienza leggibile in una finestra di produzione molto breve.",
  "remember.designTitle":"Game Design",
  "remember.designDesc":"Trasformare l'idea correre-versus-aspettare in interazioni brevi e comprensibili e in un loop compatto adatto a una game jam.",
  "remember.audioTitle":"Audio & Feedback",
  "remember.audioDesc":"Usare suono, timing e feedback per rafforzare tensione, ritmo e contrasto tra urgenza e pause.",
  "remember.teamTitle":"Iterazione rapida",
  "remember.teamDesc":"Lavorare entro 48 ore ha richiesto di dare priorità alla chiarezza, testare velocemente le idee e tagliare ciò che non supportava il concept centrale.",
  "remember.awardTitle":"Rome Game Dev Jam 2025",
  "remember.awardDesc":"Remember to Wait ha ricevuto il premio “Migliori Effetti Sonori e Colonna Sonora”.",
  "remember.openGame":"Apri la pagina del gioco ↗",
  "remember.nextTitle":"Un piccolo progetto costruito attorno a un'idea chiara.",
  "remember.nextDesc":"Il case study verrà ampliato con screenshot, note di sviluppo e un breakdown più dettagliato del processo della game jam.",
  "remember.back":"Torna a Game Development"
});

window.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page === 'remember') {
    document.querySelector('.portfolio-toggle')?.classList.add('active');
  }
});
