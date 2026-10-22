# Lorenzo Soriano Portfolio

Portfolio personale pubblicato con GitHub Pages.

## Struttura attuale

- `index.html` — homepage e sezioni principali
- `project-vitis.html` — case study di **Vitis: A Wine Country Tale**
- `assets/css/core/` — stile globale, tipografia e responsive
- `assets/js/core/` — menu, lingua e accessibilità
- `assets/images/` — screenshot, render e immagini dei progetti
- `assets/videos/` — video e clip del portfolio
- `assets/documents/` — CV, tesi e altri documenti pubblici

## Aree del portfolio

- Game Development / Technical Art
- 3D Art
- Game Design
- Thesis

## Progetto in evidenza

**Vitis: A Wine Country Tale** — progetto Unity a lungo termine attualmente focalizzato su world building, shader, sistema climatico e strumenti di authoring del mondo.

Il sito è mantenuto come static HTML/CSS/JS per restare semplice da modificare e pubblicare direttamente con GitHub Pages.


## Accessibilità e responsive

Le pagine caricano gli stili condivisi nel documento, prima del rendering. Le regole finali comuni sono in `assets/css/core/accessibility.css`, dopo gli stili di progetto. I font restano quelli del portfolio e vengono richiesti direttamente dal documento, senza import CSS concatenati.

`assets/js/core/accessibility.js` gestisce etichette IT/EN, navigazione da tastiera e dialog della sezione 3D. Il dialog si apre ad ogni visita: “Torna alla Home” naviga a `index.html`; il popup non può essere chiuso con Escape o clic sullo sfondo. Il collegamento alla Home è l’unica azione disponibile; i placeholder restano conservati nella pagina.

Il sito è statico: non richiede installazione di dipendenze o compilazione locale. Per l’anteprima usare un server HTTP dalla radice del repository. GitHub Pages esegue la propria build e pubblicazione dopo il push a `main`.

Verifiche eseguite: tutte le 19 route HTML a 320, 390, 768, 1024 e 1440 CSS px; flusso touch menu → 3D → Home a 360×740, 414×896, 820×1180 e 844×390; tastiera, focus del dialog, lingua, storage disabilitato, contenuti senza JavaScript, riferimenti locali e sintassi JavaScript. Queste verifiche usano Chromium e non sostituiscono una verifica su dispositivi fisici iOS/Android.
