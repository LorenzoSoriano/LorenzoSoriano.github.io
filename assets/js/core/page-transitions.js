(() => {
  if (!document.querySelector('link[data-zoom-resilience]')) {
    const zoomStyles = document.createElement('link');
    zoomStyles.rel = 'stylesheet';
    zoomStyles.href = 'assets/css/core/zoom-resilience.css?v=1';
    zoomStyles.dataset.zoomResilience = 'true';
    document.head.appendChild(zoomStyles);
  }

  const STORAGE_KEY = 'portfolioTransitionMode';
  const PENDING_KEY = 'portfolioBubbleTransitionPending';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const palette = ['#796cf0','#5ea0f0','#8f82f5','#eef29d','#f4d75c','#82b9f4','#a48df2'];
  const pageCache = new Map();
  let navigationLocked = false;

  const style = document.createElement('style');
  style.textContent = `
    @view-transition{navigation:auto}
    ::view-transition-old(root),::view-transition-new(root){animation:none!important}

    html,body{background:#fbfaf6}
    body{transition:opacity .28s cubic-bezier(.22,.61,.36,1),transform .28s cubic-bezier(.22,.61,.36,1)}
    body.page-entering{opacity:0;transform:translateY(7px)}
    body.page-entering.page-visible{opacity:1;transform:none}
    body.page-leaving{opacity:0!important;transform:translateY(-6px)!important;pointer-events:none}

    body.language-fade main,body.language-fade footer{
      opacity:.28;transform:translateY(3px);transition:opacity .16s ease,transform .16s ease
    }
    body:not(.language-fade) main,body:not(.language-fade) footer{
      transition:opacity .2s ease,transform .2s ease
    }

    .transition-toggle{
      position:fixed;right:18px;bottom:18px;z-index:2147482990;
      display:inline-flex;align-items:center;gap:9px;min-height:42px;padding:9px 13px;
      border:1px solid rgba(121,108,240,.16);border-radius:999px;
      background:rgba(255,255,255,.84);backdrop-filter:blur(14px) saturate(120%);
      box-shadow:0 14px 36px rgba(46,57,96,.14);color:#1e2440;
      font:600 11px/1 "Manrope",sans-serif;cursor:pointer;transition:transform .2s ease,opacity .2s ease
    }
    .transition-toggle:hover{transform:translateY(-2px)}
    .transition-toggle__dot{
      width:9px;height:9px;border-radius:50%;flex:0 0 auto;
      background:linear-gradient(135deg,#796cf0,#5ea0f0);box-shadow:0 0 0 4px rgba(121,108,240,.1)
    }
    .transition-toggle[data-mode="fade"] .transition-toggle__dot{
      background:#a9afc4;box-shadow:0 0 0 4px rgba(169,175,196,.14)
    }

    .bubble-transition{
      position:fixed;inset:0;z-index:2147483000;overflow:hidden;pointer-events:none;
      visibility:hidden;contain:strict;background:transparent
    }
    .bubble-transition::before{
      content:"";position:absolute;inset:-2px;opacity:0;
      background:linear-gradient(145deg,#1e2440 0%,#363c76 45%,#5e78c9 100%)
    }
    .bubble-transition.is-covering,.bubble-transition.is-revealing{visibility:visible;pointer-events:auto}
    .bubble-transition__bubble{
      position:absolute;left:var(--x);top:var(--y);width:var(--size);aspect-ratio:1;border-radius:50%;
      transform:translate(-50%,-50%) scale(.01);opacity:0;will-change:transform,opacity;
      background:
        radial-gradient(circle at 30% 26%,rgba(255,255,255,.74) 0 3%,rgba(255,255,255,.20) 4% 10%,transparent 11%),
        radial-gradient(circle at 72% 76%,rgba(255,255,255,.13),transparent 45%),
        var(--bubble-color);
      border:1px solid rgba(255,255,255,.28);
      box-shadow:inset 0 0 0 1px rgba(255,255,255,.07),0 10px 28px rgba(30,36,64,.14)
    }
    .bubble-transition__bubble::after{
      content:"";position:absolute;inset:18%;border:1px solid rgba(255,255,255,.34);border-radius:50%;
      opacity:0;transform:scale(.72)
    }

    .bubble-transition.is-covering .bubble-transition__bubble{
      animation:bubble-cover var(--duration) cubic-bezier(.16,.76,.18,1) forwards;
      animation-delay:var(--delay)
    }
    .bubble-transition.is-covering::before{
      animation:bubble-veil-in .34s ease forwards;animation-delay:1.02s
    }
    .bubble-transition.is-revealing::before{
      opacity:1;animation:bubble-veil-out .78s ease forwards;animation-delay:.22s
    }
    .bubble-transition.is-revealing .bubble-transition__bubble{
      opacity:1;transform:translate(-50%,-50%) scale(var(--cover-scale));
      animation:bubble-pop var(--pop-duration) cubic-bezier(.28,.02,.18,1) forwards;
      animation-delay:var(--pop-delay)
    }
    .bubble-transition.is-revealing .bubble-transition__bubble::after{
      animation:bubble-ring .55s ease-out forwards;animation-delay:var(--pop-delay)
    }

    @keyframes bubble-cover{
      0%{opacity:0;transform:translate(-50%,-50%) scale(.01)}
      16%{opacity:.96}
      82%{opacity:1;transform:translate(-50%,-50%) scale(calc(var(--cover-scale) * .92))}
      100%{opacity:1;transform:translate(-50%,-50%) scale(var(--cover-scale))}
    }
    @keyframes bubble-pop{
      0%{opacity:1;transform:translate(-50%,-50%) scale(var(--cover-scale))}
      18%{opacity:1;transform:translate(-50%,-50%) scale(calc(var(--cover-scale) * 1.05))}
      56%{opacity:.96;transform:translate(-50%,-50%) scale(calc(var(--cover-scale) * .70))}
      100%{opacity:0;transform:translate(-50%,-50%) scale(.01)}
    }
    @keyframes bubble-ring{
      0%{opacity:0;transform:scale(.7)}30%{opacity:.58}100%{opacity:0;transform:scale(1.42)}
    }
    @keyframes bubble-veil-in{from{opacity:0}to{opacity:1}}
    @keyframes bubble-veil-out{from{opacity:1}to{opacity:0}}

    @media(max-width:700px){.transition-toggle{right:12px;bottom:12px;padding:9px 11px}}
    @media(prefers-reduced-motion:reduce){
      .bubble-transition,.transition-toggle{display:none!important}
      body,body.language-fade main,body.language-fade footer,body:not(.language-fade) main,body:not(.language-fade) footer{
        transition:none!important;transform:none!important
      }
    }
  `;
  document.head.appendChild(style);

  function getMode(){return localStorage.getItem(STORAGE_KEY)==='fade'?'fade':'bubbles'}
  function setMode(mode){localStorage.setItem(STORAGE_KEY,mode);updateToggle()}

  function updateToggle(){
    const button=document.querySelector('.transition-toggle');
    if(!button)return;
    const mode=getMode();
    const italian=(document.documentElement.lang||'en').toLowerCase().startsWith('it');
    button.dataset.mode=mode;
    button.setAttribute('aria-pressed',String(mode==='bubbles'));
    button.querySelector('.transition-toggle__label').textContent=mode==='bubbles'?(italian?'Bolle ON':'Bubbles ON'):(italian?'Bolle OFF':'Bubbles OFF');
    button.title=italian?'Attiva o disattiva la transizione a bolle':'Enable or disable bubble transitions';
  }

  function ensureToggle(){
    if(reduceMotion||document.querySelector('.transition-toggle'))return;
    const button=document.createElement('button');
    button.type='button';button.className='transition-toggle';
    button.innerHTML='<span class="transition-toggle__dot" aria-hidden="true"></span><span class="transition-toggle__label"></span>';
    button.addEventListener('click',()=>setMode(getMode()==='bubbles'?'fade':'bubbles'));
    document.body.appendChild(button);updateToggle();
  }

  function makeSpecs(originX,originY){
    const w=Math.max(innerWidth,1),h=Math.max(innerHeight,1);
    const cols=Math.max(6,Math.min(10,Math.ceil(w/175)));
    const rows=Math.max(5,Math.min(8,Math.ceil(h/145)));
    const cellW=w/cols,cellH=h/rows;
    const specs=[];

    for(let row=-1;row<=rows;row++){
      for(let col=-1;col<=cols;col++){
        const x=(col+.5+(Math.random()-.5)*.34)*cellW;
        const y=(row+.5+(Math.random()-.5)*.34)*cellH;
        const baseSize=48+Math.random()*54;
        const targetDiameter=Math.hypot(cellW*1.5,cellH*1.5);
        const coverScale=Math.max(2.8,Math.min(6.2,targetDiameter/baseSize));
        const dist=Math.hypot(x-originX,y-originY)/Math.hypot(w,h);
        specs.push({
          x:x/w,y:y/h,size:baseSize,coverScale,
          color:palette[Math.floor(Math.random()*palette.length)],
          delay:Math.round(dist*250+Math.random()*230),
          duration:1080+Math.random()*360,
          popDelay:Math.round(Math.random()*420),
          popDuration:900+Math.random()*420
        });
      }
    }

    for(let i=0;i<(w<700?10:16);i++){
      const angle=Math.random()*Math.PI*2;
      const radius=12+Math.random()*Math.min(w,h)*.18;
      const x=originX+Math.cos(angle)*radius;
      const y=originY+Math.sin(angle)*radius;
      specs.push({
        x:x/w,y:y/h,size:38+Math.random()*52,coverScale:2.1+Math.random()*1.8,
        color:palette[Math.floor(Math.random()*palette.length)],
        delay:Math.random()*180,duration:980+Math.random()*340,
        popDelay:Math.random()*380,popDuration:820+Math.random()*380
      });
    }
    return specs;
  }

  function buildOverlay(specs,reverse=false){
    const w=Math.max(innerWidth,1),h=Math.max(innerHeight,1);
    const overlay=document.createElement('div');
    overlay.className=`bubble-transition ${reverse?'is-revealing':'is-covering'}`;
    for(const spec of specs){
      const bubble=document.createElement('span');
      bubble.className='bubble-transition__bubble';
      bubble.style.setProperty('--x',`${spec.x*w}px`);
      bubble.style.setProperty('--y',`${spec.y*h}px`);
      bubble.style.setProperty('--size',`${spec.size}px`);
      bubble.style.setProperty('--cover-scale',String(spec.coverScale));
      bubble.style.setProperty('--bubble-color',spec.color);
      bubble.style.setProperty('--delay',`${spec.delay}ms`);
      bubble.style.setProperty('--duration',`${spec.duration}ms`);
      bubble.style.setProperty('--pop-delay',`${spec.popDelay}ms`);
      bubble.style.setProperty('--pop-duration',`${spec.popDuration}ms`);
      overlay.appendChild(bubble);
    }
    return overlay;
  }

  function revealIncoming(){
    if(reduceMotion||getMode()!=='bubbles')return false;
    let pending=null;
    try{pending=JSON.parse(sessionStorage.getItem(PENDING_KEY)||'null');sessionStorage.removeItem(PENDING_KEY)}catch{}
    if(!pending?.specs?.length)return false;
    const overlay=buildOverlay(pending.specs,true);
    document.body.appendChild(overlay);
    setTimeout(()=>overlay.remove(),1850);
    return true;
  }

  function absoluteAssetUrl(value,base){
    try{return new URL(value,base).href}catch{return value}
  }

  function fetchPage(url){
    const key=url.href;
    if(pageCache.has(key))return pageCache.get(key);
    const promise=fetch(url.href,{credentials:'same-origin',headers:{'X-Portfolio-Navigation':'soft'}})
      .then(response=>{
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .catch(error=>{pageCache.delete(key);throw error});
    pageCache.set(key,promise);
    return promise;
  }

  function prefetch(url){
    if(!url||url.origin!==location.origin)return;
    fetchPage(url).catch(()=>{});
  }

  async function ensureStyles(targetDoc,targetUrl){
    const current=new Set([...document.querySelectorAll('link[rel="stylesheet"][href]')].map(link=>link.href));
    const pending=[];
    targetDoc.querySelectorAll('link[rel="stylesheet"][href]').forEach(source=>{
      const href=absoluteAssetUrl(source.getAttribute('href'),targetUrl.href);
      if(current.has(href))return;
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href=href;
      link.dataset.softNavStyle='true';
      current.add(href);
      pending.push(new Promise(resolve=>{
        link.addEventListener('load',resolve,{once:true});
        link.addEventListener('error',resolve,{once:true});
        setTimeout(resolve,1400);
      }));
      document.head.appendChild(link);
    });
    await Promise.all(pending);
  }

  async function preloadIntroImages(targetDoc,targetUrl){
    const images=[...targetDoc.querySelectorAll('main > section:first-child img[src], .page-intro img[src]')].slice(0,4);
    if(!images.length)return;
    const jobs=images.map(node=>new Promise(resolve=>{
      const image=new Image();
      image.onload=image.onerror=resolve;
      image.src=absoluteAssetUrl(node.getAttribute('src'),targetUrl.href);
    }));
    await Promise.race([Promise.all(jobs),new Promise(resolve=>setTimeout(resolve,1000))]);
  }

  async function executeScriptSource(src,targetUrl){
    const absolute=absoluteAssetUrl(src,targetUrl.href);
    const response=await fetch(absolute,{credentials:'same-origin'});
    if(!response.ok)throw new Error(`Script ${response.status}: ${absolute}`);
    const code=await response.text();
    const run=new Function(`${code}\n//# sourceURL=${absolute}`);
    run.call(window);
  }

  async function runTargetScripts(targetDoc,targetUrl){
    const sources=[...targetDoc.querySelectorAll('script[src]')]
      .map(script=>script.getAttribute('src'))
      .filter(Boolean);

    const ignored=source=>{
      const name=new URL(source,targetUrl.href).pathname.split('/').pop()||'';
      return /^script\.js(?:$|\?)/.test(name)||/^page-transitions\.js(?:$|\?)/.test(name)||name==='assets/js/i18n/translations.js';
    };

    const translationSources=sources.filter(src=>!ignored(src)&&/translations[^/]*\.js/i.test(new URL(src,targetUrl.href).pathname));
    const behaviorSources=sources.filter(src=>!ignored(src)&&!translationSources.includes(src));

    for(const src of translationSources){
      try{await executeScriptSource(src,targetUrl)}catch(error){console.warn('[soft-nav] translation script failed',src,error)}
    }

    if(typeof window.applyLanguage==='function'){
      try{window.applyLanguage(localStorage.getItem('portfolioLang')||document.documentElement.lang||'en')}catch{}
    }

    for(const src of behaviorSources){
      try{await executeScriptSource(src,targetUrl)}catch(error){console.warn('[soft-nav] page script failed',src,error)}
    }
  }

  function refreshGlobalUi(targetTitle){
    const page=document.body.dataset.page||'';
    document.querySelectorAll('.nav a[data-page]').forEach(link=>link.classList.toggle('active',link.dataset.page===page));
    const portfolioToggle=document.querySelector('.portfolio-toggle');
    const portfolioPages=['game-dev','3d-art','game-design','design-studies','narrative','production','vitis','remember','serious','nolight','momentum','legend','beyond','dissonant'];
    portfolioToggle?.classList.toggle('active',portfolioPages.includes(page));
    document.querySelector('.nav')?.classList.remove('open');
    document.querySelector('.portfolio-menu')?.classList.remove('open');
    document.querySelector('.menu-toggle')?.setAttribute('aria-expanded','false');

    const year=document.getElementById('year');
    if(year)year.textContent=new Date().getFullYear();

    if(page==='about')document.getElementById('contact')?.remove();

    const profile=document.querySelector('.profile-photo');
    if(profile){
      const showProfile=()=>{
        profile.hidden=false;
        const placeholder=document.querySelector('.photo-placeholder');
        if(placeholder)placeholder.style.display='none';
      };
      if(profile.complete&&profile.naturalWidth)showProfile();
      else{
        profile.addEventListener('load',showProfile,{once:true});
        profile.addEventListener('error',()=>{profile.hidden=true},{once:true});
      }
    }

    const revealObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){entry.target.classList.add('visible');revealObserver.unobserve(entry.target)}
      });
    },{threshold:.08});
    document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));

    if(targetTitle)document.title=targetTitle;
    updateToggle();
  }

  async function swapDocument(targetDoc,targetUrl,pushHistory=true){
    const nextMain=targetDoc.querySelector('main');
    const currentMain=document.querySelector('main');
    if(!nextMain||!currentMain)throw new Error('Missing main element');

    const nextFooter=targetDoc.querySelector('footer');
    const currentFooter=document.querySelector('footer');
    const targetTitle=targetDoc.title;

    await ensureStyles(targetDoc,targetUrl);
    await preloadIntroImages(targetDoc,targetUrl);

    const importedMain=document.importNode(nextMain,true);
    currentMain.replaceWith(importedMain);

    if(nextFooter&&currentFooter){
      currentFooter.replaceWith(document.importNode(nextFooter,true));
    }else if(nextFooter&&!currentFooter){
      document.body.appendChild(document.importNode(nextFooter,true));
    }else if(!nextFooter&&currentFooter){
      currentFooter.remove();
    }

    const transitionToggle=document.querySelector('.transition-toggle');
    const transitionOverlay=document.querySelector('.bubble-transition');
    const targetBodyClass=targetDoc.body?.className||'';
    document.body.className=targetBodyClass;
    if(transitionToggle&&!transitionToggle.isConnected)document.body.appendChild(transitionToggle);
    if(transitionOverlay&&!transitionOverlay.isConnected)document.body.appendChild(transitionOverlay);

    const targetPage=targetDoc.body?.dataset?.page||'';
    if(targetPage)document.body.dataset.page=targetPage;
    else delete document.body.dataset.page;

    if(pushHistory)history.pushState({portfolioSoftNav:true},'',targetUrl.href);
    window.scrollTo({top:0,left:0,behavior:'instant'});

    await runTargetScripts(targetDoc,targetUrl);
    refreshGlobalUi(targetTitle);
  }

  async function softNavigate(url,{pushHistory=true,originX=innerWidth/2,originY=innerHeight/2}={}){
    if(navigationLocked)return;
    navigationLocked=true;

    const mode=getMode();
    const specs=makeSpecs(originX,originY);
    let overlay=null;
    const started=performance.now();

    if(!reduceMotion&&mode==='bubbles'){
      overlay=buildOverlay(specs,false);
      document.body.appendChild(overlay);
    }else if(!reduceMotion&&mode==='fade'){
      document.body.classList.remove('page-visible');
      document.body.classList.add('page-leaving');
    }

    try{
      const html=await fetchPage(url);
      const targetDoc=new DOMParser().parseFromString(html,'text/html');

      if(mode==='bubbles'&&!reduceMotion){
        const elapsed=performance.now()-started;
        if(elapsed<1260)await new Promise(resolve=>setTimeout(resolve,1260-elapsed));
      }else if(mode==='fade'&&!reduceMotion){
        const elapsed=performance.now()-started;
        if(elapsed<220)await new Promise(resolve=>setTimeout(resolve,220-elapsed));
      }

      await swapDocument(targetDoc,url,pushHistory);

      if(overlay){
        overlay.classList.remove('is-covering');
        void overlay.offsetWidth;
        overlay.classList.add('is-revealing');
        setTimeout(()=>overlay.remove(),1850);
      }else{
        document.body.classList.remove('page-leaving','page-entering');
        requestAnimationFrame(()=>document.body.classList.add('page-visible'));
      }
    }catch(error){
      console.warn('[soft-nav] falling back to normal navigation',error);
      try{sessionStorage.setItem(PENDING_KEY,JSON.stringify({specs}))}catch{}
      location.href=url.href;
      return;
    }finally{
      setTimeout(()=>{navigationLocked=false},80);
    }
  }

  const incoming=revealIncoming();
  if(!reduceMotion&&!incoming&&getMode()==='fade'){
    document.body.classList.add('page-entering');
    requestAnimationFrame(()=>requestAnimationFrame(()=>document.body.classList.add('page-visible')));
  }

  window.addEventListener('pageshow',event=>{
    document.body.classList.remove('page-leaving');
    if(event.persisted)document.querySelector('.bubble-transition')?.remove();
    ensureToggle();updateToggle();
  });

  document.addEventListener('pointerover',event=>{
    const link=event.target.closest('a[href]');if(!link)return;
    try{const url=new URL(link.href,location.href);if(url.origin===location.origin)prefetch(url)}catch{}
  },{passive:true});

  document.addEventListener('focusin',event=>{
    const link=event.target.closest('a[href]');if(!link)return;
    try{const url=new URL(link.href,location.href);if(url.origin===location.origin)prefetch(url)}catch{}
  });

  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-lang]');
    if(!button)return;
    const nextLang=button.dataset.lang,currentLang=document.documentElement.lang;
    if(!nextLang||nextLang===currentLang||reduceMotion)return;
    event.preventDefault();event.stopImmediatePropagation();document.body.classList.add('language-fade');
    setTimeout(()=>{if(typeof window.applyLanguage==='function')window.applyLanguage(nextLang);updateToggle();setTimeout(()=>document.body.classList.remove('language-fade'),30)},145);
  },true);

  document.addEventListener('click',event=>{
    if(navigationLocked||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const link=event.target.closest('a[href]');
    if(!link||link.target==='_blank'||link.hasAttribute('download'))return;

    const href=link.getAttribute('href');
    if(!href||href.startsWith('mailto:')||href.startsWith('tel:')||href.startsWith('javascript:'))return;

    let url;
    try{url=new URL(link.href,location.href)}catch{return}
    if(url.origin!==location.origin)return;

    const sameDocument=url.pathname===location.pathname&&url.search===location.search;
    if(sameDocument&&url.hash)return;

    event.preventDefault();
    const rect=link.getBoundingClientRect();
    const x=Number.isFinite(event.clientX)&&event.clientX>0?event.clientX:rect.left+rect.width/2;
    const y=Number.isFinite(event.clientY)&&event.clientY>0?event.clientY:rect.top+rect.height/2;
    softNavigate(url,{pushHistory:true,originX:x,originY:y});
  });

  window.addEventListener('popstate',()=>{
    const url=new URL(location.href);
    softNavigate(url,{pushHistory:false,originX:innerWidth/2,originY:innerHeight/2});
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureToggle,{once:true});else ensureToggle();
})();
