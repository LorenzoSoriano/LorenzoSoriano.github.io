(() => {
  if (window.ContactBrickBreakerV4) {
    window.ContactBrickBreakerV4.init?.();
    return;
  }

  const palette=['#796cf0','#5ea0f0','#eef29d','#f4d75c','#8f82f5','#82b9f4'];
  const powerPalette={wide:'#eef29d',multi:'#8f82f5',slow:'#82b9f4',life:'#f4d75c'};
  const state={
    running:false,paused:false,closing:false,resultShown:false,
    root:null,canvas:null,ctx:null,raf:0,last:0,width:0,height:0,ceiling:0,dpr:1,
    paddle:null,balls:[],targets:[],bricks:[],powerups:[],
    score:0,lives:3,phase:'interface',destroyedUi:0,phase1Goal:0,totalBricks:0,
    brickPhaseStartScore:0,brickPhaseStartedAt:0,combo:0,maxCombo:0,
    keys:{left:false,right:false},audio:null,restoreScrollY:0,typed:'',clickCount:0,clickTimer:0,
    resizeHandler:null,wideUntil:0,slowUntil:0,pointerUnlockIntentional:false,
  };

  const isItalian=()=> (document.documentElement.lang||'en').toLowerCase().startsWith('it');
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

  function ensureAudio(){
    const AudioContextClass=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextClass)return null;
    if(!state.audio)state.audio=new AudioContextClass();
    if(state.audio.state==='suspended')state.audio.resume().catch(()=>{});
    return state.audio;
  }
  function uiVolume(){
    const raw=Number.parseFloat(localStorage.getItem('portfolioUiVolume'));
    return Number.isFinite(raw)?clamp(raw,0,1):.32;
  }
  function tone(freq=260,duration=.05,level=.03,type='triangle',delay=0){
    const audio=ensureAudio();if(!audio||uiVolume()<=0)return;
    const osc=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime+delay;
    osc.type=type;osc.frequency.setValueAtTime(freq,now);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(level*uiVolume(),now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(gain);gain.connect(audio.destination);osc.start(now);osc.stop(now+duration+.02);
  }
  function noise(duration=.04,level=.02){
    const audio=ensureAudio();if(!audio||uiVolume()<=0)return;
    const length=Math.max(1,Math.floor(audio.sampleRate*duration));
    const buffer=audio.createBuffer(1,length,audio.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
    const source=audio.createBufferSource(),gain=audio.createGain();gain.gain.value=level*uiVolume();source.buffer=buffer;source.connect(gain);gain.connect(audio.destination);source.start();
  }
  const playBounce=()=>tone(315+Math.random()*24,.03,.013,'sine');
  const playInterfaceBreak=()=>{tone(145,.085,.034,'square');noise(.055,.02)};
  const playBrickBreak=()=>{tone(360+Math.random()*120,.042,.018,'square');if(Math.random()>.76)tone(560+Math.random()*80,.025,.007,'sine',.018)};
  const playPower=()=>{tone(420,.07,.025,'sine');tone(650,.11,.022,'sine',.045)};
  const playPhase=()=>{tone(220,.08,.03,'triangle');setTimeout(()=>tone(410,.07,.022,'sine'),70)};
  function playResult(stars){tone(330,.09,.024,'triangle');if(stars>0)tone(480,.10,.022,'sine',.08);if(stars>1)tone(620,.11,.02,'sine',.16);if(stars>2)tone(790,.14,.019,'sine',.24)}

  function roundedRect(ctx,x,y,w,h,r){
    const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
  }

  function createUi(){
    const root=document.createElement('div');
    root.className='brick-egg-layer';
    root.innerHTML=`
      <canvas class="brick-egg-canvas" aria-hidden="true"></canvas>
      <div class="brick-egg-hud">
        <div class="brick-egg-hud__meta">
          <span class="brick-egg-hud__phase"></span>
          <span class="brick-egg-hud__score"></span>
        </div>
        <div class="brick-egg-help"><span>Mouse / A D</span><strong>ESC · ${isItalian()?'Esci':'Exit'}</strong></div>
      </div>
      <div class="brick-egg-active-powers" aria-live="polite"></div>
      <div class="brick-egg-message"><span></span><strong></strong></div>
      <div class="brick-egg-result" role="dialog" aria-modal="true" aria-hidden="true">
        <div class="brick-egg-result__card">
          <p class="brick-egg-result__kicker"></p>
          <h2 class="brick-egg-result__title"></h2>
          <strong class="brick-egg-result__score"></strong>
          <div class="brick-egg-result__stars" aria-label="Stars"></div>
          <p class="brick-egg-result__detail"></p>
          <div class="brick-egg-result__actions">
            <button class="brick-egg-replay" type="button"></button>
            <button class="brick-egg-close" type="button"></button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(root);
    state.root=root;state.canvas=root.querySelector('canvas');state.ctx=state.canvas.getContext('2d');

    root.querySelector('.brick-egg-replay')?.addEventListener('click',()=>{restartGame();requestPointerLock()});
    root.querySelector('.brick-egg-close')?.addEventListener('click',closeWithBubbles);

    root.addEventListener('pointermove',event=>{
      if(!state.running||state.paused||!state.paddle)return;
      if(document.pointerLockElement===root){
        state.paddle.x=clamp(state.paddle.x+event.movementX,10,state.width-state.paddle.w-10);
      }else if(event.pointerType!=='touch'){
        state.paddle.x=clamp(event.clientX-state.paddle.w/2,10,state.width-state.paddle.w-10);
      }
    },{passive:true});
    root.addEventListener('pointerdown',event=>{
      if(!state.running||state.paused||!state.paddle)return;
      if(event.pointerType==='touch')state.paddle.x=clamp(event.clientX-state.paddle.w/2,10,state.width-state.paddle.w-10);
      else if(document.pointerLockElement!==root)requestPointerLock();
    },{passive:true});
  }

  function requestPointerLock(){
    if(!state.root||!state.running||state.paused||matchMedia('(pointer:coarse)').matches)return;
    if(document.pointerLockElement===state.root)return;
    try{state.root.requestPointerLock?.()}catch{}
  }
  function releasePointerLock(intentional=true){
    if(!document.pointerLockElement)return;
    state.pointerUnlockIntentional=intentional;
    try{document.exitPointerLock?.()}catch{}
    setTimeout(()=>{state.pointerUnlockIntentional=false},80);
  }
  function onPointerLockChange(){
    if(!state.running||state.resultShown||state.closing)return;
    if(document.pointerLockElement!==state.root&&!state.pointerUnlockIntentional){
      closeWithBubbles();
    }
  }

  function showMessage(kicker,title){
    const box=state.root?.querySelector('.brick-egg-message');if(!box)return;
    box.querySelector('span').textContent=kicker;box.querySelector('strong').textContent=title;box.classList.remove('show');void box.offsetWidth;box.classList.add('show');
  }

  function updateHud(){
    const phase=state.root?.querySelector('.brick-egg-hud__phase');
    const score=state.root?.querySelector('.brick-egg-hud__score');
    if(phase)phase.textContent=state.phase==='interface'?(isItalian()?'ROMPI L’INTERFACCIA':'BREAK THE INTERFACE'):state.phase==='bricks'?'BRICK BREAKER':(isItalian()?'RISULTATO':'RESULT');
    if(score)score.textContent=`SCORE ${String(Math.max(0,Math.round(state.score))).padStart(4,'0')} · ${isItalian()?'VITE':'LIVES'} ${state.lives}`;
    updatePowerIcons();
  }

  function updatePowerIcons(){
    const root=state.root?.querySelector('.brick-egg-active-powers');if(!root)return;
    const now=performance.now(),items=[];
    if(state.wideUntil>now)items.push({type:'wide',icon:'↔',label:isItalian()?'Paddle larga':'Wide paddle',value:`${Math.ceil((state.wideUntil-now)/1000)}s`});
    if(state.slowUntil>now)items.push({type:'slow',icon:'◷',label:'Slow',value:`${Math.ceil((state.slowUntil-now)/1000)}s`});
    if(state.balls.length>1)items.push({type:'multi',icon:'●●',label:'Multiball',value:`×${state.balls.length}`});
    root.innerHTML=items.map(item=>`<div class="brick-egg-power-icon brick-egg-power-icon--${item.type}" title="${item.label}"><span>${item.icon}</span><small>${item.value}</small></div>`).join('');
    root.classList.toggle('has-powers',items.length>0);
  }

  function updateCeiling(){
    const rect=document.querySelector('.site-header')?.getBoundingClientRect();
    state.ceiling=clamp(Math.ceil(rect?.bottom||0),0,Math.max(0,state.height-150));
    state.root?.style.setProperty('--brick-ceiling',`${state.ceiling}px`);
  }

  function resizeCanvas(){
    if(!state.canvas)return;
    const oldW=state.width||innerWidth,oldH=state.height||innerHeight;
    state.width=Math.max(1,innerWidth);state.height=Math.max(1,window.visualViewport?.height||innerHeight);state.dpr=Math.min(2,devicePixelRatio||1);
    state.canvas.width=Math.round(state.width*state.dpr);state.canvas.height=Math.round(state.height*state.dpr);state.canvas.style.width=`${state.width}px`;state.canvas.style.height=`${state.height}px`;state.ctx.setTransform(state.dpr,0,0,state.dpr,0,0);
    updateCeiling();
    if(state.paddle){
      const ratio=state.width/oldW,baseW=state.width<700?Math.min(126,state.width*.30):150;
      state.paddle.baseW=baseW;state.paddle.w=state.wideUntil>performance.now()?baseW*1.55:baseW;state.paddle.y=state.height-(state.width<700?42:34);state.paddle.x=clamp(state.paddle.x*ratio,10,state.width-state.paddle.w-10);
    }
    state.balls.forEach(ball=>{ball.x=clamp(ball.x*(state.width/oldW),ball.r,state.width-ball.r);ball.y=clamp(ball.y*(state.height/oldH),state.ceiling+ball.r,state.height-ball.r-50)});
    if(state.running&&state.phase==='bricks'&&state.bricks.length)layoutExistingBricks();
  }

  function cleanCloneIds(node){
    if(node.nodeType!==1)return;node.removeAttribute('id');node.querySelectorAll?.('[id]').forEach(el=>el.removeAttribute('id'));node.querySelectorAll?.('input,textarea,button,a').forEach(el=>el.setAttribute('tabindex','-1'));
  }
  function shatterElement(el){
    const rect=el.getBoundingClientRect();if(rect.width<4||rect.height<4)return;
    const clips=['polygon(0 0,52% 0,48% 54%,0 48%)','polygon(52% 0,100% 0,100% 48%,48% 54%)','polygon(0 48%,48% 54%,52% 100%,0 100%)','polygon(48% 54%,100% 48%,100% 100%,52% 100%)'];
    clips.forEach((clip,index)=>{
      const fragment=el.cloneNode(true);cleanCloneIds(fragment);fragment.classList.add('brick-egg-fragment');fragment.setAttribute('aria-hidden','true');
      Object.assign(fragment.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`,clipPath:clip});state.root.appendChild(fragment);
      const dx=(index%2===0?-1:1)*(14+Math.random()*44),dy=80+Math.random()*180,rotate=(index%2===0?-1:1)*(6+Math.random()*18);
      const anim=fragment.animate([{transform:'translate(0,0) rotate(0deg)',opacity:1},{transform:`translate(${dx}px,${dy}px) rotate(${rotate}deg)`,opacity:0}],{duration:760+Math.random()*380,easing:'cubic-bezier(.22,.68,.23,1)',fill:'forwards'});anim.finished.finally(()=>fragment.remove());
    });
    el.classList.add('brick-egg-hidden');
  }

  function collectTargets(){
    const mobile=state.width<700;
    const selectors=mobile
      ? ['.contact-copy h2','.contact-detail','.contact-form .form-title','.contact-form .field','.contact-form .button','.contact-page-intro h1']
      : ['.contact-copy','.contact-form','.contact-page-intro h1','.contact-page-intro > p:last-child'];
    const candidates=[],seen=new Set();
    selectors.forEach(selector=>document.querySelectorAll(selector).forEach(el=>{
      if(seen.has(el)||el.classList.contains('brick-egg-hidden'))return;
      const r=el.getBoundingClientRect();
      const left=clamp(r.left,0,state.width),right=clamp(r.right,0,state.width),top=clamp(r.top,state.ceiling,state.height-70),bottom=clamp(r.bottom,state.ceiling,state.height-70);
      const visibleW=Math.max(0,right-left),visibleH=Math.max(0,bottom-top),visibleArea=visibleW*visibleH,totalArea=Math.max(1,r.width*r.height),ratio=visibleArea/totalArea;
      if(visibleW<48||visibleH<22||ratio<(mobile?.42:.30))return;
      seen.add(el);candidates.push({el,x:left,y:top,w:visibleW,h:visibleH});
    }));
    const limit=mobile?6:5;
    state.targets=candidates.slice(0,limit).map(item=>({...item,hp:item.el.matches('.contact-copy,.contact-form')?2:1,alive:true,cooldown:0}));
    state.phase1Goal=Math.max(1,Math.min(mobile?3:4,state.targets.length));
    if(!state.targets.length)setTimeout(beginBrickPhase,200);
  }

  function resetInterface(){document.querySelectorAll('.brick-egg-hidden').forEach(el=>el.classList.remove('brick-egg-hidden'));document.querySelectorAll('.brick-egg-hit').forEach(el=>el.classList.remove('brick-egg-hit'))}

  function brickLayoutConfig(){
    const mobile=state.width<700,compact=state.width<460,cols=compact?5:mobile?7:10,rows=compact?6:mobile?6:7,gap=mobile?6:8,margin=compact?12:mobile?16:34;
    const top=state.ceiling+(mobile?64:70),available=Math.max(150,state.paddle.y-top-96),h=clamp((available-gap*(rows-1))/rows,mobile?20:24,mobile?28:32),w=(state.width-margin*2-gap*(cols-1))/cols;
    return {cols,rows,gap,margin,top,w,h};
  }
  function createBrickField(){
    const cfg=brickLayoutConfig();state.bricks=[];
    for(let row=0;row<cfg.rows;row++)for(let col=0;col<cfg.cols;col++)state.bricks.push({row,col,x:cfg.margin+col*(cfg.w+cfg.gap),y:cfg.top+row*(cfg.h+cfg.gap),w:cfg.w,h:cfg.h,color:palette[(row+col)%palette.length],alive:true});
    state.totalBricks=state.bricks.length;
  }
  function layoutExistingBricks(){const cfg=brickLayoutConfig();state.bricks.forEach(b=>{b.x=cfg.margin+b.col*(cfg.w+cfg.gap);b.y=cfg.top+b.row*(cfg.h+cfg.gap);b.w=cfg.w;b.h=cfg.h})}

  function beginBrickPhase(){
    if(state.phase==='bricks'||state.resultShown)return;
    state.phase='bricks';state.targets.forEach(t=>{if(t.alive){t.alive=false;shatterElement(t.el)}});state.targets=[];document.body.classList.add('brick-egg-phase2');
    state.combo=0;state.powerups=[];state.brickPhaseStartScore=state.score;state.brickPhaseStartedAt=performance.now();createBrickField();playPhase();showMessage('PHASE 02','BRICK BREAKER');updateHud();
  }

  function circleRectCollision(ball,rect){const cx=clamp(ball.x,rect.x,rect.x+rect.w),cy=clamp(ball.y,rect.y,rect.y+rect.h),dx=ball.x-cx,dy=ball.y-cy;return dx*dx+dy*dy<=ball.r*ball.r}
  function reflectFromRect(ball,rect){const left=Math.abs((ball.x+ball.r)-rect.x),right=Math.abs((rect.x+rect.w)-(ball.x-ball.r)),top=Math.abs((ball.y+ball.r)-rect.y),bottom=Math.abs((rect.y+rect.h)-(ball.y-ball.r)),m=Math.min(left,right,top,bottom);if(m===left||m===right)ball.vx*=-1;else ball.vy*=-1}

  function damageTarget(ball,target){
    if(target.cooldown>0||!target.alive)return;target.cooldown=.14;target.hp-=1;target.el.classList.remove('brick-egg-hit');void target.el.offsetWidth;target.el.classList.add('brick-egg-hit');setTimeout(()=>target.el.classList.remove('brick-egg-hit'),220);playInterfaceBreak();
    if(target.hp<=0){target.alive=false;shatterElement(target.el);state.destroyedUi++;state.score+=125;updateHud();if(state.destroyedUi>=state.phase1Goal||!state.targets.some(t=>t.alive))setTimeout(beginBrickPhase,260)}
  }

  function maybeSpawnPowerup(brick){
    if(Math.random()>.22)return;const pool=['wide','multi','slow','life'],type=pool[Math.floor(Math.random()*pool.length)];state.powerups.push({type,x:brick.x+brick.w/2,y:brick.y+brick.h/2,r:state.width<700?11:12,vy:state.width<700?115:135,alive:true,color:powerPalette[type]});
  }
  function normalizeBallSpeed(ball,target){const s=Math.max(1,Math.hypot(ball.vx,ball.vy)),r=target/s;ball.vx*=r;ball.vy*=r}
  function applyPowerup(type){
    const now=performance.now();
    if(type==='wide'){state.wideUntil=now+14000;state.paddle.w=Math.min(state.width-24,state.paddle.baseW*1.55);state.paddle.x=clamp(state.paddle.x,10,state.width-state.paddle.w-10)}
    else if(type==='multi'){
      const source=state.balls[0];if(source){const additions=[];for(let i=0;i<Math.max(1,3-Math.min(state.balls.length,3));i++){const angle=(i===0?-.42:.42)+(Math.random()-.5)*.16,speed=Math.hypot(source.vx,source.vy),b={x:source.x,y:source.y,r:source.r,vx:source.vx*Math.cos(angle)-source.vy*Math.sin(angle),vy:source.vx*Math.sin(angle)+source.vy*Math.cos(angle)};normalizeBallSpeed(b,speed);additions.push(b)}state.balls.push(...additions);state.balls=state.balls.slice(0,5)}
    }else if(type==='slow'){state.slowUntil=now+11000;state.balls.forEach(b=>normalizeBallSpeed(b,Math.max(230,Math.hypot(b.vx,b.vy)*.74)))}
    else if(type==='life'){state.lives=Math.min(5,state.lives+1);flashPowerIcon('life','+1')}
    state.score+=75;playPower();updateHud();
  }
  function flashPowerIcon(type,text){const root=state.root?.querySelector('.brick-egg-active-powers');if(!root)return;const item=document.createElement('div');item.className=`brick-egg-power-icon brick-egg-power-icon--${type} is-flash`;item.innerHTML=`<span>♥</span><small>${text}</small>`;root.appendChild(item);setTimeout(()=>item.remove(),1200)}
  function updatePowerups(dt){state.powerups.forEach(p=>{if(!p.alive)return;p.y+=p.vy*dt;if(circleRectCollision({x:p.x,y:p.y,r:p.r},state.paddle)){p.alive=false;applyPowerup(p.type)}else if(p.y-p.r>state.height+30)p.alive=false});state.powerups=state.powerups.filter(p=>p.alive)}

  function damageBrick(ball,brick){if(!brick.alive)return;brick.alive=false;state.combo++;state.maxCombo=Math.max(state.maxCombo,state.combo);state.score+=50+Math.min(100,(state.combo-1)*5);maybeSpawnPowerup(brick);playBrickBreak();updateHud();if(!state.bricks.some(b=>b.alive))finishGame(true)}
  function newBall(direction=1){const mobile=state.width<700;return{x:state.width/2,y:state.paddle.y-24,r:mobile?7:8,vx:direction*(mobile?190:250),vy:-(mobile?300:360)}}
  const resetBalls=()=>{state.balls=[newBall(Math.random()>.5?1:-1)]};

  function updateTimedPowers(){
    const now=performance.now();
    if(state.paddle&&state.wideUntil&&now>=state.wideUntil){state.wideUntil=0;state.paddle.w=state.paddle.baseW;state.paddle.x=clamp(state.paddle.x,10,state.width-state.paddle.w-10)}
    if(state.slowUntil&&now>=state.slowUntil){state.slowUntil=0;state.balls.forEach(b=>{const desired=state.width<700?355:425;if(Math.hypot(b.vx,b.vy)<desired*.88)normalizeBallSpeed(b,desired)})}
    updatePowerIcons();
  }

  function updateBall(ball,dt){
    ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
    if(ball.x-ball.r<=0){ball.x=ball.r;ball.vx=Math.abs(ball.vx);playBounce()}if(ball.x+ball.r>=state.width){ball.x=state.width-ball.r;ball.vx=-Math.abs(ball.vx);playBounce()}if(ball.y-ball.r<=state.ceiling){ball.y=state.ceiling+ball.r;ball.vy=Math.abs(ball.vy);playBounce()}
    const p=state.paddle;if(ball.vy>0&&circleRectCollision(ball,p)){ball.y=p.y-ball.r-1;const impact=(ball.x-(p.x+p.w/2))/(p.w/2),speed=Math.min(520,Math.hypot(ball.vx,ball.vy)*1.012),angle=impact;ball.vx=clamp(speed*Math.sin(angle),-455,455);ball.vy=-Math.abs(speed*Math.cos(angle));state.combo=0;playBounce()}
    if(state.phase==='interface')state.targets.forEach(t=>{if(t.cooldown>0)t.cooldown-=dt;if(t.alive&&t.cooldown<=0&&circleRectCollision(ball,t)){reflectFromRect(ball,t);damageTarget(ball,t)}});
    else if(state.phase==='bricks')for(const brick of state.bricks){if(brick.alive&&circleRectCollision(ball,brick)){reflectFromRect(ball,brick);damageBrick(ball,brick);break}}
  }

  function update(dt){
    if(!state.running||state.paused)return;
    if(state.keys.left)state.paddle.x-=state.paddle.speed*dt;if(state.keys.right)state.paddle.x+=state.paddle.speed*dt;state.paddle.x=clamp(state.paddle.x,10,state.width-state.paddle.w-10);
    updateTimedPowers();state.balls.forEach(b=>updateBall(b,dt));state.balls=state.balls.filter(b=>b.y-b.r<=state.height);if(state.phase==='bricks')updatePowerups(dt);
    if(!state.balls.length&&!state.resultShown){state.lives--;state.combo=0;state.wideUntil=0;state.slowUntil=0;state.paddle.w=state.paddle.baseW;updateHud();if(state.lives<=0){finishGame(false);return}resetBalls()}
  }

  function powerLabel(type){return type==='wide'?'W':type==='multi'?'M':type==='slow'?'S':'+'}
  function draw(){
    const ctx=state.ctx;if(!ctx)return;ctx.clearRect(0,0,state.width,state.height);
    if(state.phase==='bricks'||state.phase==='result'){
      state.bricks.forEach(b=>{if(!b.alive)return;ctx.save();ctx.fillStyle=b.color;ctx.globalAlpha=.94;roundedRect(ctx,b.x,b.y,b.w,b.h,7);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.48)';ctx.lineWidth=1;ctx.stroke();ctx.restore()});
      state.powerups.forEach(p=>{if(!p.alive)return;ctx.save();ctx.fillStyle=p.color;ctx.shadowColor='rgba(30,36,64,.22)';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#1e2440';ctx.font=`700 ${Math.max(10,p.r*.9)}px Manrope,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(powerLabel(p.type),p.x,p.y+.5);ctx.restore()});
    }
    if(state.paddle){ctx.save();const g=ctx.createLinearGradient(state.paddle.x,state.paddle.y,state.paddle.x+state.paddle.w,state.paddle.y);g.addColorStop(0,'#796cf0');g.addColorStop(1,'#5ea0f0');ctx.fillStyle=g;ctx.shadowColor='rgba(121,108,240,.30)';ctx.shadowBlur=18;roundedRect(ctx,state.paddle.x,state.paddle.y,state.paddle.w,state.paddle.h,999);ctx.fill();ctx.restore()}
    state.balls.forEach(ball=>{ctx.save();const g=ctx.createRadialGradient(ball.x-2,ball.y-3,1,ball.x,ball.y,ball.r*1.4);g.addColorStop(0,'#fff');g.addColorStop(.28,'#eef29d');g.addColorStop(1,'#796cf0');ctx.fillStyle=g;ctx.shadowColor='rgba(121,108,240,.42)';ctx.shadowBlur=16;ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fill();ctx.restore()});
  }
  function frame(ts){if(!state.running)return;const dt=Math.min(.032,Math.max(.001,(ts-state.last)/1000||.016));state.last=ts;update(dt);draw();state.raf=requestAnimationFrame(frame)}

  function calculateResult(win){if(!win)return{stars:0};const elapsed=Math.max(1,(performance.now()-state.brickPhaseStartedAt)/1000),timeBonus=Math.max(0,Math.round((145-elapsed)*11)),lifeBonus=state.lives*350;state.score+=timeBonus+lifeBonus;const clearBase=state.brickPhaseStartScore+state.totalBricks*50,stars=state.score>=clearBase+1550?3:state.score>=clearBase+700?2:1;return{stars}}
  function finishGame(win){
    if(state.resultShown)return;state.resultShown=true;state.paused=true;state.phase='result';releasePointerLock(true);const result=calculateResult(win);updateHud();playResult(result.stars);
    const modal=state.root?.querySelector('.brick-egg-result');if(!modal)return;
    modal.querySelector('.brick-egg-result__kicker').textContent=win?(isItalian()?'LIVELLO COMPLETATO':'LEVEL CLEARED'):(isItalian()?'PARTITA TERMINATA':'GAME OVER');
    modal.querySelector('.brick-egg-result__title').textContent=win?(isItalian()?'Brick Breaker completato.':'Brick Breaker cleared.'):(isItalian()?'Riprova.':'Try again.');
    modal.querySelector('.brick-egg-result__score').textContent=`${Math.round(state.score)} pts`;
    modal.querySelector('.brick-egg-result__stars').innerHTML=[1,2,3].map(i=>`<span class="${i<=result.stars?'earned':''}">★</span>`).join('');
    modal.querySelector('.brick-egg-result__detail').textContent=win?`${isItalian()?'Combo migliore':'Best combo'} ×${state.maxCombo} · ${isItalian()?'Vite rimaste':'Lives left'} ${state.lives}`:`${isItalian()?'Blocchi rimasti':'Bricks left'} ${state.bricks.filter(b=>b.alive).length}`;
    modal.querySelector('.brick-egg-replay').textContent=isItalian()?'Ripeti':'Replay';modal.querySelector('.brick-egg-close').textContent=isItalian()?'Chiudi':'Close';modal.setAttribute('aria-hidden','false');modal.classList.add('show');
  }
  function hideResult(){const modal=state.root?.querySelector('.brick-egg-result');modal?.classList.remove('show');modal?.setAttribute('aria-hidden','true')}

  function restartGame(){
    if(!state.running)return;document.body.classList.remove('brick-egg-phase2');resetInterface();state.root?.querySelectorAll('.brick-egg-fragment').forEach(el=>el.remove());hideResult();
    Object.assign(state,{score:0,lives:3,phase:'interface',destroyedUi:0,phase1Goal:0,totalBricks:0,combo:0,maxCombo:0,resultShown:false,paused:false,closing:false,wideUntil:0,slowUntil:0});
    state.targets=[];state.bricks=[];state.powerups=[];state.paddle.w=state.paddle.baseW;state.paddle.x=(state.width-state.paddle.w)/2;resetBalls();collectTargets();updateHud();showMessage('EASTER EGG','BREAK THE UI');playPhase();
  }

  function makeBubbleSpecs(){
    const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight),cols=w<520?5:w<900?7:9,rows=h<620?5:h<900?7:8,specs=[],cellW=w/cols,cellH=h/rows;
    for(let row=-1;row<=rows;row++)for(let col=-1;col<=cols;col++){const x=(col+.5+(Math.random()-.5)*.28)*cellW,y=(row+.5+(Math.random()-.5)*.28)*cellH,size=w<520?34+Math.random()*24:w<900?40+Math.random()*32:46+Math.random()*44,target=Math.hypot(cellW*1.55,cellH*1.55);specs.push({x:x/w,y:y/h,size,coverScale:Math.max(2.5,Math.min(5.2,target/size)),color:palette[Math.floor(Math.random()*palette.length)],delay:Math.random()*330,duration:980+Math.random()*360,popDelay:Math.random()*360,popDuration:820+Math.random()*360})}return specs;
  }
  function buildBubbleOverlay(specs,reverse=false){const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight),overlay=document.createElement('div');overlay.className=`bubble-transition ${reverse?'is-revealing':'is-covering'}`;specs.forEach(s=>{const b=document.createElement('span');b.className='bubble-transition__bubble';b.style.setProperty('--x',`${s.x*w}px`);b.style.setProperty('--y',`${s.y*h}px`);b.style.setProperty('--size',`${s.size}px`);b.style.setProperty('--cover-scale',String(s.coverScale));b.style.setProperty('--bubble-color',s.color);b.style.setProperty('--delay',`${s.delay}ms`);b.style.setProperty('--duration',`${s.duration}ms`);b.style.setProperty('--pop-delay',`${s.popDelay}ms`);b.style.setProperty('--pop-duration',`${s.popDuration}ms`);overlay.appendChild(b)});return overlay}
  function closeWithBubbles(){if(!state.running||state.closing)return;state.closing=true;state.paused=true;releasePointerLock(true);const specs=makeBubbleSpecs(),overlay=buildBubbleOverlay(specs,false);document.body.appendChild(overlay);setTimeout(()=>{hardStop();overlay.classList.remove('is-covering');void overlay.offsetWidth;overlay.classList.add('is-revealing');setTimeout(()=>overlay.remove(),1900)},1280)}

  function onKeyDown(event){
    if(!state.running)return;if(event.key==='Escape'){event.preventDefault();closeWithBubbles();return}if(state.paused)return;
    if(event.key==='ArrowLeft'||event.key==='a'||event.key==='A'){state.keys.left=true;event.preventDefault()}if(event.key==='ArrowRight'||event.key==='d'||event.key==='D'){state.keys.right=true;event.preventDefault()}
  }
  function onKeyUp(event){if(event.key==='ArrowLeft'||event.key==='a'||event.key==='A')state.keys.left=false;if(event.key==='ArrowRight'||event.key==='d'||event.key==='D')state.keys.right=false}

  function start(){
    if(state.running||document.body.dataset.page!=='contact')return;ensureAudio();state.restoreScrollY=scrollY;
    const panel=document.querySelector('.contact-page-panel');if(panel){const top=panel.getBoundingClientRect().top+scrollY-88;scrollTo({top:Math.max(0,top),behavior:'auto'})}
    Object.assign(state,{running:true,paused:false,closing:false,resultShown:false,score:0,lives:3,phase:'interface',destroyedUi:0,phase1Goal:0,totalBricks:0,combo:0,maxCombo:0,wideUntil:0,slowUntil:0});
    state.bricks=[];state.powerups=[];state.targets=[];state.balls=[];document.body.classList.remove('brick-egg-phase2');document.documentElement.classList.add('brick-egg-running');document.body.classList.add('brick-egg-running');
    createUi();state.paddle={x:0,y:0,w:150,baseW:150,h:14,speed:520};resizeCanvas();state.paddle.x=(state.width-state.paddle.w)/2;resetBalls();collectTargets();updateHud();showMessage('EASTER EGG','BREAK THE UI');playPhase();
    addEventListener('keydown',onKeyDown,{capture:true});addEventListener('keyup',onKeyUp,{capture:true});document.addEventListener('pointerlockchange',onPointerLockChange);
    state.resizeHandler=()=>resizeCanvas();addEventListener('resize',state.resizeHandler,{passive:true});visualViewport?.addEventListener('resize',state.resizeHandler,{passive:true});state.last=performance.now();state.raf=requestAnimationFrame(frame);requestPointerLock();
  }

  function hardStop(){
    if(!state.running)return;state.running=false;state.paused=false;cancelAnimationFrame(state.raf);removeEventListener('keydown',onKeyDown,{capture:true});removeEventListener('keyup',onKeyUp,{capture:true});document.removeEventListener('pointerlockchange',onPointerLockChange);releasePointerLock(true);
    if(state.resizeHandler){removeEventListener('resize',state.resizeHandler);visualViewport?.removeEventListener('resize',state.resizeHandler)}
    document.body.classList.remove('brick-egg-phase2');resetInterface();state.root?.remove();state.root=null;state.canvas=null;state.ctx=null;state.targets=[];state.bricks=[];state.powerups=[];state.balls=[];document.documentElement.classList.remove('brick-egg-running');document.body.classList.remove('brick-egg-running');scrollTo({top:state.restoreScrollY,behavior:'auto'});
  }

  function bindTrigger(){
    if(document.body.dataset.page!=='contact')return;const trigger=document.querySelector('[data-brick-egg-trigger]');if(trigger&&!trigger.dataset.brickEggBoundV4){trigger.dataset.brickEggBoundV4='true';trigger.addEventListener('click',()=>{clearTimeout(state.clickTimer);state.clickCount++;if(state.clickCount>=7){state.clickCount=0;start();return}state.clickTimer=setTimeout(()=>{state.clickCount=0},2600)})}
  }
  function globalSecretKey(event){if(document.body.dataset.page!=='contact'||state.running||event.target?.matches?.('input,textarea,[contenteditable="true"]')||event.key.length!==1)return;state.typed=(state.typed+event.key.toLowerCase()).slice(-8);if(state.typed.endsWith('break')){state.typed='';start()}}
  document.addEventListener('keydown',globalSecretKey);
  function init(){bindTrigger()}
  window.ContactBrickBreakerV4={init,start,stop:closeWithBubbles};window.ContactBrickBreaker=window.ContactBrickBreakerV4;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();