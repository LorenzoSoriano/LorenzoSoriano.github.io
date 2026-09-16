window.TRANSLATIONS=window.TRANSLATIONS||{en:{},it:{}};
Object.assign(window.TRANSLATIONS.en,{
  "legend2.turnFlow":"TURN FLOW",
  "legend2.specialisations":"SPECIALISATIONS",
  "legend2.abilityExamples":"ABILITY EXAMPLES",
  "legend2.abilityIntro":"The most useful abilities return to the same core idea: controlling space and cover rather than adding effects disconnected from the tactical system.",
  "legend2.combatIntro":"Tactical Duel is built around short turn-based firefights. Each character can reposition between covers and then commit to one meaningful action. The choice of position changes protection, line of fire and the value of the action that follows.",
  "legend2.c1d":"At the start of an encounter the party is positioned around the available covers. During a turn, a character can move one cover at a time, trading safety for a better angle or a more aggressive position.",
  "legend2.c2d":"After movement, the player chooses the action that defines the turn: fire, heal or use a special ability. The goal is to keep each turn readable while still creating meaningful trade-offs.",
  "legend2.c3d":"Cover has its own HP and can be destroyed. Removing it does not simply increase damage: it changes the battlefield, exposes characters and can force the opposing team to reposition.",
  "legend2.c4d":"The top-down view is used to read the battlefield and plan movement. When the action is executed, the camera moves closer behind the selected cover to make aiming and feedback more immediate.",
  "legend2.progressIntro":"Progression changes the tactical options available in later encounters. Party composition, weapon statistics and talent choices determine how safely a character can fight, how often they can attack and how effectively they can manipulate cover.",
  "legend2.turnLoopLabel":"HOW A TURN WORKS",
  "legend2.turnLoopCore":"ACTIVE TURN",
  "legend2.turnLoopCoreD":"One character reads the battlefield, repositions and resolves one action before play passes to the next actor.",
  "legend2.turnStep1":"Read the battlefield",
  "legend2.turnStep1d":"Check the turn timeline, enemy positions and available cover before committing.",
  "legend2.turnStep2":"Choose a cover",
  "legend2.turnStep2d":"Evaluate protection, line of fire and the risk of exposing the character.",
  "legend2.turnStep3":"Reposition",
  "legend2.turnStep3d":"Move at most one cover to improve safety, range or attack angle.",
  "legend2.turnStep4":"Choose the action",
  "legend2.turnStep4d":"Attack, heal or activate a special ability according to the tactical situation.",
  "legend2.turnStep5":"Resolve the outcome",
  "legend2.turnStep5d":"Accuracy, damage, cover HP and ability effects update the battlefield.",
  "legend2.turnStep6":"Advance the timeline",
  "legend2.turnStep6d":"Reload counters and turn order update, then control passes to the next character.",
  "legend2.turnReturn":"next character → read the battlefield again"
});
Object.assign(window.TRANSLATIONS.it,{
  "legend2.turnFlow":"FLUSSO DEL TURNO",
  "legend2.specialisations":"SPECIALIZZAZIONI",
  "legend2.abilityExamples":"ESEMPI DI ABILITÀ",
  "legend2.abilityIntro":"Le abilità più interessanti tornano sempre sullo stesso nucleo: controllo dello spazio e delle coperture, invece di aggiungere effetti scollegati dal sistema tattico.",
  "legend2.combatIntro":"Tactical Duel è costruito attorno a scontri a turni brevi e leggibili. Ogni personaggio può riposizionarsi tra le coperture e poi scegliere un'azione significativa. La posizione scelta modifica protezione, linea di tiro e valore dell'azione successiva.",
  "legend2.c1d":"All'inizio dello scontro il gruppo viene disposto attorno alle coperture disponibili. Durante il turno un personaggio può spostarsi di un riparo alla volta, scegliendo tra maggiore sicurezza e una posizione più aggressiva.",
  "legend2.c2d":"Dopo il movimento il giocatore decide l'azione che definisce il turno: sparare, curare oppure usare un'abilità speciale. L'obiettivo è mantenere ogni turno semplice da leggere ma ricco di conseguenze.",
  "legend2.c3d":"Le coperture possiedono HP propri e possono essere distrutte. Eliminarle non significa soltanto fare più danno: modifica il campo di battaglia, espone i personaggi e può costringere il team avversario a riposizionarsi.",
  "legend2.c4d":"La visuale dall'alto serve a leggere il campo e pianificare lo spostamento. Durante l'esecuzione dell'azione la camera si avvicina dietro al riparo selezionato, rendendo mira e feedback più immediati.",
  "legend2.progressIntro":"La progressione cambia concretamente le opzioni disponibili negli scontri successivi. Composizione del team, statistiche delle armi e talenti determinano quanto un personaggio può esporsi, con quale frequenza può attaccare e quanto efficacemente può modificare le coperture.",
  "legend2.turnLoopLabel":"COME SI SVOLGE UN TURNO",
  "legend2.turnLoopCore":"TURNO ATTIVO",
  "legend2.turnLoopCoreD":"Un personaggio legge il campo, si riposiziona e risolve un'azione prima di passare il controllo al personaggio successivo.",
  "legend2.turnStep1":"Leggi il campo",
  "legend2.turnStep1d":"Controlla timeline, posizione dei nemici e coperture disponibili prima di decidere.",
  "legend2.turnStep2":"Scegli il riparo",
  "legend2.turnStep2d":"Valuta protezione, linea di tiro e rischio di lasciare il personaggio esposto.",
  "legend2.turnStep3":"Riposizionati",
  "legend2.turnStep3d":"Spostati al massimo di una copertura per migliorare sicurezza, distanza o angolo d'attacco.",
  "legend2.turnStep4":"Scegli l'azione",
  "legend2.turnStep4d":"Attacca, cura oppure usa un'abilità speciale in base alla situazione tattica.",
  "legend2.turnStep5":"Risolvi l'esito",
  "legend2.turnStep5d":"Accuratezza, danni, HP delle coperture ed effetti delle abilità aggiornano il campo.",
  "legend2.turnStep6":"Aggiorna la timeline",
  "legend2.turnStep6d":"Ricarica e ordine dei turni avanzano, poi il controllo passa al personaggio successivo.",
  "legend2.turnReturn":"personaggio successivo → nuova lettura del campo"
});

if(document.body?.dataset?.page==='legend'&&!document.querySelector('.legend-turn-loop')){
  const combatStory=document.querySelector('.legend-combat-story');
  if(combatStory){
    const loop=document.createElement('div');
    loop.className='legend-turn-loop reveal';
    loop.innerHTML=`
      <p class="legend-turn-loop__label" data-i18n="legend2.turnLoopLabel">COME SI SVOLGE UN TURNO</p>
      <svg class="legend-turn-loop__path" viewBox="0 0 1000 360" aria-hidden="true" preserveAspectRatio="none">
        <defs>
          <linearGradient id="legendTurnGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#796cf0"/>
            <stop offset="58%" stop-color="#5ea0f0"/>
            <stop offset="100%" stop-color="#f4d75c"/>
          </linearGradient>
          <marker id="legendTurnArrow" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto" markerUnits="strokeWidth">
            <path d="M1,1 L10,6 L1,11" fill="none" stroke="#796cf0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </marker>
        </defs>
        <path d="M150 76 H775 Q900 76 900 180 Q900 284 775 284 H225 Q100 284 100 180 Q100 76 225 76" marker-end="url(#legendTurnArrow)"/>
      </svg>
      <div class="legend-turn-loop__core">
        <span data-i18n="legend2.turnLoopCore">TURNO ATTIVO</span>
        <strong data-i18n="legend2.turnLoopCore">TURNO ATTIVO</strong>
        <p data-i18n="legend2.turnLoopCoreD"></p>
      </div>
      <ol class="legend-turn-loop__steps">
        <li class="legend-turn-loop__step"><strong data-i18n="legend2.turnStep1"></strong><p data-i18n="legend2.turnStep1d"></p></li>
        <li class="legend-turn-loop__step"><strong data-i18n="legend2.turnStep2"></strong><p data-i18n="legend2.turnStep2d"></p></li>
        <li class="legend-turn-loop__step"><strong data-i18n="legend2.turnStep3"></strong><p data-i18n="legend2.turnStep3d"></p></li>
        <li class="legend-turn-loop__step"><strong data-i18n="legend2.turnStep4"></strong><p data-i18n="legend2.turnStep4d"></p></li>
        <li class="legend-turn-loop__step"><strong data-i18n="legend2.turnStep5"></strong><p data-i18n="legend2.turnStep5d"></p></li>
        <li class="legend-turn-loop__step"><strong data-i18n="legend2.turnStep6"></strong><p data-i18n="legend2.turnStep6d"></p></li>
      </ol>
      <div class="legend-turn-loop__return" data-i18n="legend2.turnReturn">personaggio successivo → nuova lettura del campo</div>`;
    combatStory.before(loop);
  }
}
