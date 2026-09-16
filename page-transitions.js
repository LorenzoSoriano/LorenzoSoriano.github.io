(() => {
  if (!document.querySelector('link[data-zoom-resilience]')) {
    const zoomStyles = document.createElement('link');
    zoomStyles.rel = 'stylesheet';
    zoomStyles.href = 'zoom-resilience.css?v=1';
    zoomStyles.dataset.zoomResilience = 'true';
    document.head.appendChild(zoomStyles);
  }

  const STORAGE_KEY = 'portfolioTransitionMode';
  const PENDING_KEY = 'portfolioBubbleTransitionPending';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
      content:"";position:absolute;inset:0;opacity:0;
      background:linear-gradient(145deg,#1e2440 0%,#363c76 45%,#5e78c9 100%)
    }
    .bubble-transition.is-covering,.bubble-transition.is-revealing{visibility:visible;pointer-events:auto}
    .bubble-transition__bubble{
      position:absolute;left:var(--x);top:var(--y);width:var(--size);aspect-ratio:1;border-radius:50%;
      transform:translate(-50%,-50%) scale(.01);opacity:0;will-change:transform,opacity;
      background:
        radial-gradient(circle at 30% 26%,rgba(255,255,255,.72) 0 3%,rgba(255,255,255,.20) 4% 10%,transparent 11%),
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
      animation:bubble-veil-in .42s ease forwards;animation-delay:.92s
    }
    .bubble-transition.is-revealing::before{
      opacity:1;animation:bubble-veil-out .72s ease forwards;animation-delay:.16s
    }
    .bubble-transition.is-revealing .bubble-transition__bubble{
      opacity:1;transform:translate(-50%,-50%) scale(1.08);
      animation:bubble-pop var(--pop-duration) cubic-bezier(.28,.02,.18,1) forwards;
      animation-delay:var(--pop-delay)
    }
    .bubble-transition.is-revealing .bubble-transition__bubble::after{
      animation:bubble-ring .55s ease-out forwards;animation-delay:var(--pop-delay)
    }

    @keyframes bubble-cover{
      0%{opacity:0;transform:translate(-50%,-50%) scale(.01)}
      18%{opacity:.96}
      76%{opacity:1;transform:translate(-50%,-50%) scale(1.03)}
      100%{opacity:1;transform:translate(-50%,-50%) scale(1.12)}
    }
    @keyframes bubble-pop{
      0%{opacity:1;transform:translate(-50%,-50%) scale(1.12)}
      24%{opacity:1;transform:translate(-50%,-50%) scale(1.22)}
      56%{opacity:.95;transform:translate(-50%,-50%) scale(.86)}
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

  const palette = ['#796cf0','#5ea0f0','#8f82f5','#eef29d','#f4d75c','#82b9f4','#a48df2'];

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
    const cols=w<700?6:9,rows=h<650?5:7;
    const cellW=w/cols,cellH=h/rows;
    const specs=[];
    for(let row=0;row<rows;row++){
      for(let col=0;col<cols;col++){
        const x=(col+.5+(Math.random()-.5)*.65)*cellW;
        const y=(row+.5+(Math.random()-.5)*.65)*cellH;
        const dist=Math.hypot(x-originX,y-originY)/Math.hypot(w,h);
        const base=Math.min(cellW,cellH);
        const size=Math.max(58,Math.min(190,base*(1.35+Math.random()*.8)));
        specs.push({x,y,size,color:palette[Math.floor(Math.random()*palette.length)],delay:Math.round(dist*420+Math.random()*260),duration:1120+Math.random()*520,popDelay:Math.round(Math.random()*520),popDuration:980+Math.random()*520});
      }
    }
    for(let i=0;i<(w<700?8:14);i++){
      const angle=Math.random()*Math.PI*2;
      const radius=20+Math.random()*Math.min(w,h)*.20;
      specs.push({x:originX+Math.cos(angle)*radius,y:originY+Math.sin(angle)*radius,size:50+Math.random()*95,color:palette[Math.floor(Math.random()*palette.length)],delay:Math.random()*240,duration:1050+Math.random()*520,popDelay:Math.random()*460,popDuration:900+Math.random()*520});
    }
    return specs;
  }

  function buildOverlay(originX,originY,reverse=false){
    const overlay=document.createElement('div');
    overlay.className=`bubble-transition ${reverse?'is-revealing':'is-covering'}`;
    const specs=makeSpecs(originX,originY);
    for(const spec of specs){
      const bubble=document.createElement('span');
      bubble.className='bubble-transition__bubble';
      bubble.style.setProperty('--x',`${spec.x}px`);
      bubble.style.setProperty('--y',`${spec.y}px`);
      bubble.style.setProperty('--size',`${spec.size}px`);
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
    if(!pending)return false;
    const overlay=buildOverlay(pending.x||innerWidth/2,pending.y||innerHeight/2,true);
    document.body.appendChild(overlay);
    setTimeout(()=>overlay.remove(),1900);
    return true;
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

  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-lang]');
    if(!button)return;
    const nextLang=button.dataset.lang,currentLang=document.documentElement.lang;
    if(!nextLang||nextLang===currentLang||reduceMotion)return;
    event.preventDefault();event.stopImmediatePropagation();document.body.classList.add('language-fade');
    setTimeout(()=>{if(typeof window.applyLanguage==='function')window.applyLanguage(nextLang);updateToggle();setTimeout(()=>document.body.classList.remove('language-fade'),30)},145);
  },true);

  let navigationLocked=false;
  document.addEventListener('click',event=>{
    if(navigationLocked||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const link=event.target.closest('a[href]');if(!link||link.target==='_blank'||link.hasAttribute('download'))return;
    const href=link.getAttribute('href');if(!href||href.startsWith('mailto:')||href.startsWith('tel:')||href.startsWith('javascript:'))return;
    let url;try{url=new URL(link.href,location.href)}catch{return}if(url.origin!==location.origin)return;
    const sameDocument=url.pathname===location.pathname&&url.search===location.search;if(sameDocument&&url.hash)return;
    if(reduceMotion)return;
    event.preventDefault();navigationLocked=true;

    if(getMode()==='fade'){
      document.body.classList.remove('page-visible');document.body.classList.add('page-leaving');
      setTimeout(()=>{location.href=url.href},245);return;
    }

    const rect=link.getBoundingClientRect();
    const x=Number.isFinite(event.clientX)&&event.clientX>0?event.clientX:rect.left+rect.width/2;
    const y=Number.isFinite(event.clientY)&&event.clientY>0?event.clientY:rect.top+rect.height/2;
    try{sessionStorage.setItem(PENDING_KEY,JSON.stringify({x,y}))}catch{}
    const overlay=buildOverlay(x,y,false);document.body.appendChild(overlay);
    setTimeout(()=>{location.href=url.href},1380);
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureToggle,{once:true});else ensureToggle();
})();