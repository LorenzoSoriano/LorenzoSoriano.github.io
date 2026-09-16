(() => {
  if (window.ContactBrickBreaker) {
    window.ContactBrickBreaker.init?.();
    return;
  }

  const palette = ['#796cf0','#5ea0f0','#eef29d','#f4d75c','#8f82f5','#82b9f4'];
  const state = {
    running:false,
    root:null,
    canvas:null,
    ctx:null,
    raf:0,
    last:0,
    width:0,
    height:0,
    dpr:1,
    paddle:null,
    ball:null,
    targets:[],
    bricks:[],
    fragments:[],
    score:0,
    lives:3,
    phase:'interface',
    destroyedUi:0,
    spawnTimer:0,
    keys:{left:false,right:false},
    audio:null,
    restoreScrollY:0,
    typed:'',
    clickCount:0,
    clickTimer:0,
    resizeHandler:null,
  };

  function isItalian(){
    return (document.documentElement.lang||'en').toLowerCase().startsWith('it');
  }

  function ensureAudio(){
    const AudioContextClass=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextClass)return null;
    if(!state.audio)state.audio=new AudioContextClass();
    if(state.audio.state==='suspended')state.audio.resume().catch(()=>{});
    return state.audio;
  }

  function uiVolume(){
    const raw=Number.parseFloat(localStorage.getItem('portfolioUiVolume'));
    return Number.isFinite(raw)?Math.max(0,Math.min(1,raw)):.32;
  }

  function tone(freq=260,duration=.05,level=.035,type='triangle'){
    const audio=ensureAudio();
    if(!audio||uiVolume()<=0)return;
    const osc=audio.createOscillator();
    const gain=audio.createGain();
    const now=audio.currentTime;
    osc.type=type;
    osc.frequency.setValueAtTime(freq,now);
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(level*uiVolume(),now+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(gain);gain.connect(audio.destination);
    osc.start(now);osc.stop(now+duration+.02);
  }

  function noise(duration=.045,level=.025){
    const audio=ensureAudio();
    if(!audio||uiVolume()<=0)return;
    const length=Math.max(1,Math.floor(audio.sampleRate*duration));
    const buffer=audio.createBuffer(1,length,audio.sampleRate);
    const data=buffer.getChannelData(0);
    for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
    const source=audio.createBufferSource();
    const gain=audio.createGain();
    gain.gain.value=level*uiVolume();
    source.buffer=buffer;source.connect(gain);gain.connect(audio.destination);source.start();
  }

  function playBounce(){tone(310,.035,.018,'sine')}
  function playBreak(){tone(145,.085,.035,'square');noise(.055,.022)}
  function playPhase(){tone(220,.08,.03,'triangle');setTimeout(()=>tone(410,.07,.022,'sine'),70)}

  function clamp(v,min,max){return Math.max(min,Math.min(max,v))}

  function roundedRect(ctx,x,y,w,h,r){
    const rr=Math.min(r,w/2,h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr,y);
    ctx.arcTo(x+w,y,x+w,y+h,rr);
    ctx.arcTo(x+w,y+h,x,y+h,rr);
    ctx.arcTo(x,y+h,x,y,rr);
    ctx.arcTo(x,y,x+w,y,rr);
    ctx.closePath();
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
        <button class="brick-egg-exit" type="button" aria-label="Exit easter egg">×</button>
      </div>
      <div class="brick-egg-message"><span></span><strong></strong></div>`;
    document.body.appendChild(root);
    root.querySelector('.brick-egg-exit')?.addEventListener('click',stop);
    root.addEventListener('pointermove',event=>{
      if(!state.running||!state.paddle)return;
      state.paddle.x=clamp(event.clientX-state.paddle.w/2,10,state.width-state.paddle.w-10);
    },{passive:true});
    root.addEventListener('pointerdown',event=>{
      if(!state.running||!state.paddle)return;
      state.paddle.x=clamp(event.clientX-state.paddle.w/2,10,state.width-state.paddle.w-10);
    },{passive:true});
    state.root=root;
    state.canvas=root.querySelector('canvas');
    state.ctx=state.canvas.getContext('2d');
  }

  function showMessage(kicker,title){
    const box=state.root?.querySelector('.brick-egg-message');
    if(!box)return;
    box.querySelector('span').textContent=kicker;
    box.querySelector('strong').textContent=title;
    box.classList.remove('show');
    void box.offsetWidth;
    box.classList.add('show');
  }

  function updateHud(){
    const phase=state.root?.querySelector('.brick-egg-hud__phase');
    const score=state.root?.querySelector('.brick-egg-hud__score');
    if(phase)phase.textContent=state.phase==='interface'?(isItalian()?'ROMPI L’INTERFACCIA':'BREAK THE INTERFACE'):(isItalian()?'BRICK FALL':'BRICK FALL');
    if(score)score.textContent=`SCORE ${String(state.score).padStart(4,'0')} · ${isItalian()?'VITE':'LIVES'} ${state.lives}`;
  }

  function resizeCanvas(){
    if(!state.canvas)return;
    const previousW=state.width||innerWidth;
    const previousH=state.height||innerHeight;
    state.width=Math.max(1,innerWidth);
    state.height=Math.max(1,window.visualViewport?.height||innerHeight);
    state.dpr=Math.min(2,window.devicePixelRatio||1);
    state.canvas.width=Math.round(state.width*state.dpr);
    state.canvas.height=Math.round(state.height*state.dpr);
    state.canvas.style.width=`${state.width}px`;
    state.canvas.style.height=`${state.height}px`;
    state.ctx.setTransform(state.dpr,0,0,state.dpr,0,0);

    if(state.paddle){
      const ratio=state.width/previousW;
      state.paddle.w=state.width<700?Math.min(126,state.width*.30):150;
      state.paddle.h=14;
      state.paddle.y=state.height-(state.width<700?42:34);
      state.paddle.x=clamp(state.paddle.x*ratio,10,state.width-state.paddle.w-10);
    }
    if(state.ball){
      state.ball.x=clamp(state.ball.x*(state.width/previousW),state.ball.r,state.width-state.ball.r);
      state.ball.y=clamp(state.ball.y*(state.height/previousH),state.ball.r,state.height-state.ball.r-50);
    }
    if(state.running&&state.phase==='interface')collectTargets();
  }

  function cleanCloneIds(node){
    if(node.nodeType!==1)return;
    node.removeAttribute('id');
    node.querySelectorAll?.('[id]').forEach(el=>el.removeAttribute('id'));
    node.querySelectorAll?.('input,textarea,button,a').forEach(el=>el.setAttribute('tabindex','-1'));
  }

  function shatterElement(el){
    const rect=el.getBoundingClientRect();
    if(rect.width<4||rect.height<4)return;
    const clips=[
      'polygon(0 0,52% 0,48% 54%,0 48%)',
      'polygon(52% 0,100% 0,100% 48%,48% 54%)',
      'polygon(0 48%,48% 54%,52% 100%,0 100%)',
      'polygon(48% 54%,100% 48%,100% 100%,52% 100%)'
    ];
    clips.forEach((clip,index)=>{
      const fragment=el.cloneNode(true);
      cleanCloneIds(fragment);
      fragment.classList.add('brick-egg-fragment');
      fragment.setAttribute('aria-hidden','true');
      fragment.style.left=`${rect.left}px`;
      fragment.style.top=`${rect.top}px`;
      fragment.style.width=`${rect.width}px`;
      fragment.style.height=`${rect.height}px`;
      fragment.style.clipPath=clip;
      state.root.appendChild(fragment);
      const dx=(index%2===0?-1:1)*(14+Math.random()*44);
      const dy=80+Math.random()*180;
      const rotate=(index%2===0?-1:1)*(6+Math.random()*18);
      const anim=fragment.animate([
        {transform:'translate(0,0) rotate(0deg)',opacity:1},
        {transform:`translate(${dx}px,${dy}px) rotate(${rotate}deg)`,opacity:0}
      ],{duration:760+Math.random()*380,easing:'cubic-bezier(.22,.68,.23,1)',fill:'forwards'});
      anim.finished.finally(()=>fragment.remove());
    });
    el.classList.add('brick-egg-hidden');
  }

  function collectTargets(){
    const selectors=[
      '.contact-copy',
      '.contact-form',
      '.contact-page-intro h1',
      '.contact-page-intro > p:last-child',
      '.contact-detail'
    ];
    const seen=new Set();
    const candidates=[];
    selectors.forEach(selector=>{
      document.querySelectorAll(selector).forEach(el=>{
        if(seen.has(el)||el.classList.contains('brick-egg-hidden'))return;
        const r=el.getBoundingClientRect();
        const visible=r.bottom>20&&r.top<state.height-60&&r.right>0&&r.left<state.width;
        if(!visible||r.width<50||r.height<24)return;
        seen.add(el);
        candidates.push(el);
      });
    });
    const old=new Map(state.targets.map(t=>[t.el,t]));
    state.targets=candidates.map(el=>{
      const r=el.getBoundingClientRect();
      const prior=old.get(el);
      return {
        el,
        x:r.left,y:r.top,w:r.width,h:r.height,
        hp:prior?.hp??(el.matches('.contact-copy,.contact-form')?2:1),
        alive:prior?.alive??true,
        cooldown:0,
      };
    }).filter(t=>t.alive);
  }

  function resetInterface(){
    document.querySelectorAll('.brick-egg-hidden').forEach(el=>el.classList.remove('brick-egg-hidden'));
    document.querySelectorAll('.brick-egg-hit').forEach(el=>el.classList.remove('brick-egg-hit'));
  }

  function beginBrickPhase(){
    if(state.phase==='bricks')return;
    state.phase='bricks';
    state.targets.forEach(target=>{
      if(target.alive){
        target.alive=false;
        shatterElement(target.el);
      }
    });
    state.targets=[];
    playPhase();
    showMessage('PHASE 02','BRICK FALL');
    state.spawnTimer=0;
    spawnBrickRow(-10);
    spawnBrickRow(-72);
    updateHud();
  }

  function spawnBrickRow(y=-40){
    const gap=8;
    const margin=state.width<700?14:28;
    const cols=state.width<460?5:state.width<780?7:10;
    const w=(state.width-margin*2-gap*(cols-1))/cols;
    const h=state.width<700?24:30;
    for(let i=0;i<cols;i++){
      state.bricks.push({
        x:margin+i*(w+gap),y,w,h,
        hp:1,
        color:palette[(i+Math.floor(Math.random()*palette.length))%palette.length],
        alive:true
      });
    }
  }

  function circleRectCollision(ball,rect){
    const cx=clamp(ball.x,rect.x,rect.x+rect.w);
    const cy=clamp(ball.y,rect.y,rect.y+rect.h);
    const dx=ball.x-cx,dy=ball.y-cy;
    return dx*dx+dy*dy<=ball.r*ball.r;
  }

  function reflectFromRect(rect){
    const left=Math.abs((state.ball.x+state.ball.r)-rect.x);
    const right=Math.abs((rect.x+rect.w)-(state.ball.x-state.ball.r));
    const top=Math.abs((state.ball.y+state.ball.r)-rect.y);
    const bottom=Math.abs((rect.y+rect.h)-(state.ball.y-state.ball.r));
    const min=Math.min(left,right,top,bottom);
    if(min===left||min===right)state.ball.vx*=-1;
    else state.ball.vy*=-1;
  }

  function damageTarget(target){
    if(target.cooldown>0||!target.alive)return;
    target.cooldown=.14;
    target.hp-=1;
    target.el.classList.remove('brick-egg-hit');
    void target.el.offsetWidth;
    target.el.classList.add('brick-egg-hit');
    setTimeout(()=>target.el.classList.remove('brick-egg-hit'),220);
    playBreak();
    if(target.hp<=0){
      target.alive=false;
      shatterElement(target.el);
      state.destroyedUi+=1;
      state.score+=125;
      updateHud();
      const remaining=state.targets.filter(t=>t.alive).length;
      if(state.destroyedUi>=4||remaining<=1)setTimeout(beginBrickPhase,260);
    }
  }

  function resetBall(){
    const mobile=state.width<700;
    state.ball={
      x:state.width/2,
      y:state.paddle.y-24,
      r:mobile?7:8,
      vx:(Math.random()>.5?1:-1)*(mobile?190:250),
      vy:-(mobile?300:360)
    };
  }

  function update(dt){
    if(!state.running)return;
    if(state.keys.left)state.paddle.x-=state.paddle.speed*dt;
    if(state.keys.right)state.paddle.x+=state.paddle.speed*dt;
    state.paddle.x=clamp(state.paddle.x,10,state.width-state.paddle.w-10);

    const ball=state.ball;
    ball.x+=ball.vx*dt;
    ball.y+=ball.vy*dt;

    if(ball.x-ball.r<=0){ball.x=ball.r;ball.vx=Math.abs(ball.vx);playBounce()}
    if(ball.x+ball.r>=state.width){ball.x=state.width-ball.r;ball.vx=-Math.abs(ball.vx);playBounce()}
    if(ball.y-ball.r<=0){ball.y=ball.r;ball.vy=Math.abs(ball.vy);playBounce()}

    const p=state.paddle;
    if(ball.vy>0&&circleRectCollision(ball,p)){
      ball.y=p.y-ball.r-1;
      const impact=(ball.x-(p.x+p.w/2))/(p.w/2);
      const speed=Math.hypot(ball.vx,ball.vy)*1.01;
      const angle=impact*1.0;
      ball.vx=clamp(speed*Math.sin(angle),-430,430);
      ball.vy=-Math.abs(speed*Math.cos(angle));
      playBounce();
    }

    if(ball.y-ball.r>state.height){
      state.lives-=1;
      updateHud();
      if(state.lives<=0){
        showMessage(isItalian()?'FINE PARTITA':'GAME OVER',isItalian()?'Interfaccia ripristinata':'Interface restored');
        setTimeout(stop,1050);
        return;
      }
      resetBall();
    }

    if(state.phase==='interface'){
      state.targets.forEach(target=>{
        if(target.cooldown>0)target.cooldown-=dt;
        if(target.alive&&target.cooldown<=0&&circleRectCollision(ball,target)){
          reflectFromRect(target);
          damageTarget(target);
        }
      });
    }else{
      state.spawnTimer+=dt;
      const fallSpeed=state.width<700?8:11;
      state.bricks.forEach(brick=>{
        if(!brick.alive)return;
        brick.y+=fallSpeed*dt;
        if(circleRectCollision(ball,brick)){
          reflectFromRect(brick);
          brick.alive=false;
          state.score+=50;
          playBreak();
          updateHud();
        }
      });
      state.bricks=state.bricks.filter(brick=>brick.alive&&brick.y<state.height+60);
      if(state.spawnTimer>(state.width<700?5.6:4.8)){
        state.spawnTimer=0;
        spawnBrickRow(-34);
      }
      const danger=state.bricks.some(brick=>brick.y+brick.h>=state.paddle.y-8);
      if(danger){
        showMessage(isItalian()?'GAME OVER':'GAME OVER',isItalian()?'I blocchi hanno raggiunto il fondo':'The bricks reached the bottom');
        setTimeout(stop,1100);
      }
    }
  }

  function draw(){
    const ctx=state.ctx;
    if(!ctx)return;
    ctx.clearRect(0,0,state.width,state.height);

    if(state.phase==='bricks'){
      state.bricks.forEach(brick=>{
        if(!brick.alive)return;
        ctx.save();
        ctx.fillStyle=brick.color;
        ctx.globalAlpha=.92;
        roundedRect(ctx,brick.x,brick.y,brick.w,brick.h,8);
        ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,.42)';
        ctx.lineWidth=1;
        ctx.stroke();
        ctx.restore();
      });
    }

    ctx.save();
    const paddleGradient=ctx.createLinearGradient(state.paddle.x,state.paddle.y,state.paddle.x+state.paddle.w,state.paddle.y);
    paddleGradient.addColorStop(0,'#796cf0');
    paddleGradient.addColorStop(1,'#5ea0f0');
    ctx.fillStyle=paddleGradient;
    ctx.shadowColor='rgba(121,108,240,.30)';
    ctx.shadowBlur=18;
    roundedRect(ctx,state.paddle.x,state.paddle.y,state.paddle.w,state.paddle.h,999);
    ctx.fill();
    ctx.restore();

    ctx.save();
    const ballGradient=ctx.createRadialGradient(state.ball.x-2,state.ball.y-3,1,state.ball.x,state.ball.y,state.ball.r*1.4);
    ballGradient.addColorStop(0,'#fff');
    ballGradient.addColorStop(.28,'#eef29d');
    ballGradient.addColorStop(1,'#796cf0');
    ctx.fillStyle=ballGradient;
    ctx.shadowColor='rgba(121,108,240,.42)';
    ctx.shadowBlur=16;
    ctx.beginPath();ctx.arc(state.ball.x,state.ball.y,state.ball.r,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  function frame(ts){
    if(!state.running)return;
    const dt=Math.min(.032,Math.max(.001,(ts-state.last)/1000||.016));
    state.last=ts;
    update(dt);draw();
    state.raf=requestAnimationFrame(frame);
  }

  function onKeyDown(event){
    if(!state.running)return;
    if(event.key==='Escape'){event.preventDefault();stop();return}
    if(event.key==='ArrowLeft'||event.key==='a'||event.key==='A'){state.keys.left=true;event.preventDefault()}
    if(event.key==='ArrowRight'||event.key==='d'||event.key==='D'){state.keys.right=true;event.preventDefault()}
  }

  function onKeyUp(event){
    if(event.key==='ArrowLeft'||event.key==='a'||event.key==='A')state.keys.left=false;
    if(event.key==='ArrowRight'||event.key==='d'||event.key==='D')state.keys.right=false;
  }

  function start(){
    if(state.running||document.body.dataset.page!=='contact')return;
    ensureAudio();
    state.restoreScrollY=window.scrollY;
    const panel=document.querySelector('.contact-page-panel');
    if(panel){
      const top=panel.getBoundingClientRect().top+window.scrollY-96;
      window.scrollTo({top:Math.max(0,top),behavior:'auto'});
    }

    state.running=true;
    state.score=0;state.lives=3;state.phase='interface';state.destroyedUi=0;state.bricks=[];state.targets=[];
    document.documentElement.classList.add('brick-egg-running');
    document.body.classList.add('brick-egg-running');
    createUi();
    state.paddle={x:0,y:0,w:150,h:14,speed:520};
    resizeCanvas();
    state.paddle.x=(state.width-state.paddle.w)/2;
    resetBall();
    collectTargets();
    updateHud();
    showMessage('EASTER EGG','BREAK THE UI');
    playPhase();

    window.addEventListener('keydown',onKeyDown,{capture:true});
    window.addEventListener('keyup',onKeyUp,{capture:true});
    state.resizeHandler=()=>resizeCanvas();
    window.addEventListener('resize',state.resizeHandler,{passive:true});
    window.visualViewport?.addEventListener('resize',state.resizeHandler,{passive:true});
    state.last=performance.now();
    state.raf=requestAnimationFrame(frame);
  }

  function stop(){
    if(!state.running)return;
    state.running=false;
    cancelAnimationFrame(state.raf);
    window.removeEventListener('keydown',onKeyDown,{capture:true});
    window.removeEventListener('keyup',onKeyUp,{capture:true});
    if(state.resizeHandler){
      window.removeEventListener('resize',state.resizeHandler);
      window.visualViewport?.removeEventListener('resize',state.resizeHandler);
    }
    resetInterface();
    state.root?.remove();
    state.root=null;state.canvas=null;state.ctx=null;state.targets=[];state.bricks=[];
    document.documentElement.classList.remove('brick-egg-running');
    document.body.classList.remove('brick-egg-running');
    window.scrollTo({top:state.restoreScrollY,behavior:'auto'});
  }

  function bindTrigger(){
    if(document.body.dataset.page!=='contact')return;
    const trigger=document.querySelector('[data-brick-egg-trigger]');
    if(trigger&&!trigger.dataset.brickEggBound){
      trigger.dataset.brickEggBound='true';
      trigger.addEventListener('click',()=>{
        clearTimeout(state.clickTimer);
        state.clickCount+=1;
        if(state.clickCount>=7){state.clickCount=0;start();return}
        state.clickTimer=setTimeout(()=>{state.clickCount=0},2600);
      });
    }
  }

  function globalSecretKey(event){
    if(document.body.dataset.page!=='contact'||state.running)return;
    if(event.target?.matches?.('input,textarea,[contenteditable="true"]'))return;
    if(event.key.length!==1)return;
    state.typed=(state.typed+event.key.toLowerCase()).slice(-8);
    if(state.typed.endsWith('break')){state.typed='';start()}
  }

  document.addEventListener('keydown',globalSecretKey);

  function init(){
    bindTrigger();
  }

  window.ContactBrickBreaker={init,start,stop};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
