(() => {
  if (window.ContactBrickBreaker) {
    window.ContactBrickBreaker.init?.();
    return;
  }

  const palette = ['#796cf0','#5ea0f0','#eef29d','#f4d75c','#8f82f5','#82b9f4'];
  const powerPalette = {
    wide:'#eef29d',
    multi:'#8f82f5',
    slow:'#82b9f4',
    life:'#f4d75c'
  };

  const state = {
    running:false,
    paused:false,
    closing:false,
    resultShown:false,
    root:null,
    canvas:null,
    ctx:null,
    raf:0,
    last:0,
    width:0,
    height:0,
    ceiling:0,
    dpr:1,
    paddle:null,
    balls:[],
    targets:[],
    bricks:[],
    powerups:[],
    score:0,
    lives:3,
    phase:'interface',
    destroyedUi:0,
    totalBricks:0,
    brickPhaseStartScore:0,
    brickPhaseStartedAt:0,
    combo:0,
    maxCombo:0,
    keys:{left:false,right:false},
    audio:null,
    restoreScrollY:0,
    typed:'',
    clickCount:0,
    clickTimer:0,
    resizeHandler:null,
    wideUntil:0,
    slowUntil:0,
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

  function tone(freq=260,duration=.05,level=.035,type='triangle',delay=0){
    const audio=ensureAudio();
    if(!audio||uiVolume()<=0)return;
    const osc=audio.createOscillator();
    const gain=audio.createGain();
    const now=audio.currentTime+delay;
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

  function playBounce(){tone(310+Math.random()*28,.032,.014,'sine')}
  function playInterfaceBreak(){tone(145,.085,.034,'square');noise(.055,.020)}
  function playBrickBreak(){tone(360+Math.random()*110,.042,.019,'square');if(Math.random()>.72)tone(520+Math.random()*90,.025,.008,'sine',.018)}
  function playPower(){tone(420,.07,.025,'sine');tone(650,.11,.022,'sine',.045)}
  function playPhase(){tone(220,.08,.03,'triangle');setTimeout(()=>tone(410,.07,.022,'sine'),70)}
  function playResult(stars){
    tone(330,.09,.024,'triangle');
    if(stars>0)tone(480,.10,.022,'sine',.08);
    if(stars>1)tone(620,.11,.020,'sine',.16);
    if(stars>2)tone(790,.14,.019,'sine',.24);
  }

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
          <span class="brick-egg-hud__power"></span>
        </div>
        <button class="brick-egg-exit" type="button" aria-label="Exit easter egg">×</button>
      </div>
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

    root.querySelector('.brick-egg-exit')?.addEventListener('click',closeWithBubbles);
    root.querySelector('.brick-egg-replay')?.addEventListener('click',restartGame);
    root.querySelector('.brick-egg-close')?.addEventListener('click',closeWithBubbles);

    root.addEventListener('pointermove',event=>{
      if(!state.running||state.paused||!state.paddle)return;
      state.paddle.x=clamp(event.clientX-state.paddle.w/2,10,state.width-state.paddle.w-10);
    },{passive:true});
    root.addEventListener('pointerdown',event=>{
      if(!state.running||state.paused||!state.paddle)return;
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

  function activePowerText(){
    const now=performance.now();
    const active=[];
    if(state.wideUntil>now)active.push(isItalian()?'PADDLE LARGA':'WIDE PADDLE');
    if(state.slowUntil>now)active.push(isItalian()?'SLOW':'SLOW');
    if(state.balls.length>1)active.push(`MULTI ×${state.balls.length}`);
    return active.join(' · ');
  }

  function updateHud(){
    const phase=state.root?.querySelector('.brick-egg-hud__phase');
    const score=state.root?.querySelector('.brick-egg-hud__score');
    const power=state.root?.querySelector('.brick-egg-hud__power');
    if(phase){
      if(state.phase==='interface')phase.textContent=isItalian()?'ROMPI L’INTERFACCIA':'BREAK THE INTERFACE';
      else if(state.phase==='bricks')phase.textContent='BRICK BREAKER';
      else phase.textContent=isItalian()?'RISULTATO':'RESULT';
    }
    if(score)score.textContent=`SCORE ${String(Math.max(0,Math.round(state.score))).padStart(4,'0')} · ${isItalian()?'VITE':'LIVES'} ${state.lives}`;
    if(power)power.textContent=activePowerText();
  }

  function updateCeiling(){
    const header=document.querySelector('.site-header');
    const rect=header?.getBoundingClientRect();
    state.ceiling=clamp(Math.ceil(rect?.bottom||0),0,Math.max(0,state.height-140));
    state.root?.style.setProperty('--brick-ceiling',`${state.ceiling}px`);
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
    updateCeiling();

    if(state.paddle){
      const ratio=state.width/previousW;
      const baseW=state.width<700?Math.min(126,state.width*.30):150;
      state.paddle.baseW=baseW;
      state.paddle.w=state.wideUntil>performance.now()?baseW*1.55:baseW;
      state.paddle.h=14;
      state.paddle.y=state.height-(state.width<700?42:34);
      state.paddle.x=clamp(state.paddle.x*ratio,10,state.width-state.paddle.w-10);
    }
    if(state.balls.length){
      state.balls.forEach(ball=>{
        ball.x=clamp(ball.x*(state.width/previousW),ball.r,state.width-ball.r);
        ball.y=clamp(ball.y*(state.height/previousH),state.ceiling+ball.r,state.height-ball.r-50);
      });
    }
    if(state.running&&state.phase==='interface')collectTargets();
    if(state.running&&state.phase==='bricks'&&state.bricks.length)layoutExistingBricks();
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
        const visible=r.bottom>state.ceiling+4&&r.top<state.height-60&&r.right>0&&r.left<state.width;
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

  function brickLayoutConfig(){
    const mobile=state.width<700;
    const compact=state.width<460;
    const cols=compact?5:mobile?7:10;
    const rows=compact?6:mobile?6:7;
    const gap=mobile?6:8;
    const margin=compact?12:mobile?16:34;
    const top=state.ceiling+(mobile?18:24);
    const available=Math.max(150,state.paddle.y-top-110);
    const h=clamp((available-gap*(rows-1))/rows,mobile?20:24,mobile?27:32);
    const w=(state.width-margin*2-gap*(cols-1))/cols;
    return {cols,rows,gap,margin,top,w,h};
  }

  function createBrickField(){
    const cfg=brickLayoutConfig();
    state.bricks=[];
    for(let row=0;row<cfg.rows;row++){
      for(let col=0;col<cfg.cols;col++){
        state.bricks.push({
          row,col,
          x:cfg.margin+col*(cfg.w+cfg.gap),
          y:cfg.top+row*(cfg.h+cfg.gap),
          w:cfg.w,h:cfg.h,
          hp:1,
          color:palette[(row+col)%palette.length],
          alive:true
        });
      }
    }
    state.totalBricks=state.bricks.length;
  }

  function layoutExistingBricks(){
    const cfg=brickLayoutConfig();
    state.bricks.forEach(brick=>{
      brick.x=cfg.margin+brick.col*(cfg.w+cfg.gap);
      brick.y=cfg.top+brick.row*(cfg.h+cfg.gap);
      brick.w=cfg.w;
      brick.h=cfg.h;
    });
  }

  function beginBrickPhase(){
    if(state.phase==='bricks'||state.resultShown)return;
    state.phase='bricks';
    state.targets.forEach(target=>{
      if(target.alive){target.alive=false;shatterElement(target.el)}
    });
    state.targets=[];
    document.body.classList.add('brick-egg-phase2');
    state.combo=0;
    state.powerups=[];
    state.brickPhaseStartScore=state.score;
    state.brickPhaseStartedAt=performance.now();
    createBrickField();
    playPhase();
    showMessage('PHASE 02','BRICK BREAKER');
    updateHud();
  }

  function circleRectCollision(ball,rect){
    const cx=clamp(ball.x,rect.x,rect.x+rect.w);
    const cy=clamp(ball.y,rect.y,rect.y+rect.h);
    const dx=ball.x-cx,dy=ball.y-cy;
    return dx*dx+dy*dy<=ball.r*ball.r;
  }

  function reflectFromRect(ball,rect){
    const left=Math.abs((ball.x+ball.r)-rect.x);
    const right=Math.abs((rect.x+rect.w)-(ball.x-ball.r));
    const top=Math.abs((ball.y+ball.r)-rect.y);
    const bottom=Math.abs((rect.y+rect.h)-(ball.y-ball.r));
    const min=Math.min(left,right,top,bottom);
    if(min===left||min===right)ball.vx*=-1;
    else ball.vy*=-1;
  }

  function damageTarget(ball,target){
    if(target.cooldown>0||!target.alive)return;
    target.cooldown=.14;
    target.hp-=1;
    target.el.classList.remove('brick-egg-hit');
    void target.el.offsetWidth;
    target.el.classList.add('brick-egg-hit');
    setTimeout(()=>target.el.classList.remove('brick-egg-hit'),220);
    playInterfaceBreak();
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

  function maybeSpawnPowerup(brick){
    if(Math.random()>.22)return;
    const pool=['wide','multi','slow','life'];
    const type=pool[Math.floor(Math.random()*pool.length)];
    state.powerups.push({
      type,
      x:brick.x+brick.w/2,
      y:brick.y+brick.h/2,
      r:state.width<700?11:12,
      vy:state.width<700?115:135,
      alive:true,
      color:powerPalette[type]
    });
  }

  function normalizeBallSpeed(ball,targetSpeed){
    const speed=Math.max(1,Math.hypot(ball.vx,ball.vy));
    const ratio=targetSpeed/speed;
    ball.vx*=ratio;
    ball.vy*=ratio;
  }

  function applyPowerup(type){
    const now=performance.now();
    if(type==='wide'){
      state.wideUntil=now+14000;
      state.paddle.w=Math.min(state.width-24,state.paddle.baseW*1.55);
      state.paddle.x=clamp(state.paddle.x,10,state.width-state.paddle.w-10);
    }else if(type==='multi'){
      const source=state.balls[0];
      if(source){
        const additions=[];
        const current=Math.min(state.balls.length,3);
        for(let i=0;i<Math.max(1,3-current);i++){
          const angle=(i===0?-0.42:0.42)+(Math.random()-.5)*.16;
          const speed=Math.hypot(source.vx,source.vy);
          additions.push({
            x:source.x,y:source.y,r:source.r,
            vx:source.vx*Math.cos(angle)-source.vy*Math.sin(angle),
            vy:source.vx*Math.sin(angle)+source.vy*Math.cos(angle)
          });
          normalizeBallSpeed(additions[additions.length-1],speed);
        }
        state.balls.push(...additions);
        state.balls=state.balls.slice(0,5);
      }
    }else if(type==='slow'){
      state.slowUntil=now+11000;
      state.balls.forEach(ball=>normalizeBallSpeed(ball,Math.max(230,Math.hypot(ball.vx,ball.vy)*.74)));
    }else if(type==='life'){
      state.lives=Math.min(5,state.lives+1);
    }
    state.score+=75;
    playPower();
    updateHud();
  }

  function updatePowerups(dt){
    state.powerups.forEach(power=>{
      if(!power.alive)return;
      power.y+=power.vy*dt;
      const rect={x:power.x-power.r,y:power.y-power.r,w:power.r*2,h:power.r*2};
      if(circleRectCollision({x:power.x,y:power.y,r:power.r},state.paddle)){
        power.alive=false;
        applyPowerup(power.type);
      }else if(rect.y>state.height+30){
        power.alive=false;
      }
    });
    state.powerups=state.powerups.filter(power=>power.alive);
  }

  function damageBrick(ball,brick){
    if(!brick.alive)return;
    brick.alive=false;
    state.combo+=1;
    state.maxCombo=Math.max(state.maxCombo,state.combo);
    state.score+=50+Math.min(100,(state.combo-1)*5);
    maybeSpawnPowerup(brick);
    playBrickBreak();
    updateHud();
    if(!state.bricks.some(item=>item.alive))finishGame(true);
  }

  function newBall(direction=1){
    const mobile=state.width<700;
    return {
      x:state.width/2,
      y:state.paddle.y-24,
      r:mobile?7:8,
      vx:direction*(mobile?190:250),
      vy:-(mobile?300:360)
    };
  }

  function resetBalls(){
    state.balls=[newBall(Math.random()>.5?1:-1)];
  }

  function updateTimedPowers(){
    const now=performance.now();
    if(state.paddle&&state.wideUntil&&now>=state.wideUntil){
      state.wideUntil=0;
      state.paddle.w=state.paddle.baseW;
      state.paddle.x=clamp(state.paddle.x,10,state.width-state.paddle.w-10);
    }
    if(state.slowUntil&&now>=state.slowUntil){
      state.slowUntil=0;
      state.balls.forEach(ball=>{
        const desired=state.width<700?355:425;
        if(Math.hypot(ball.vx,ball.vy)<desired*.88)normalizeBallSpeed(ball,desired);
      });
    }
  }

  function updateBall(ball,dt){
    ball.x+=ball.vx*dt;
    ball.y+=ball.vy*dt;

    if(ball.x-ball.r<=0){ball.x=ball.r;ball.vx=Math.abs(ball.vx);playBounce()}
    if(ball.x+ball.r>=state.width){ball.x=state.width-ball.r;ball.vx=-Math.abs(ball.vx);playBounce()}
    if(ball.y-ball.r<=state.ceiling){ball.y=state.ceiling+ball.r;ball.vy=Math.abs(ball.vy);playBounce()}

    const p=state.paddle;
    if(ball.vy>0&&circleRectCollision(ball,p)){
      ball.y=p.y-ball.r-1;
      const impact=(ball.x-(p.x+p.w/2))/(p.w/2);
      const speed=Math.min(520,Math.hypot(ball.vx,ball.vy)*1.012);
      const angle=impact*1.0;
      ball.vx=clamp(speed*Math.sin(angle),-455,455);
      ball.vy=-Math.abs(speed*Math.cos(angle));
      state.combo=0;
      playBounce();
    }

    if(state.phase==='interface'){
      state.targets.forEach(target=>{
        if(target.cooldown>0)target.cooldown-=dt;
        if(target.alive&&target.cooldown<=0&&circleRectCollision(ball,target)){
          reflectFromRect(ball,target);
          damageTarget(ball,target);
        }
      });
    }else if(state.phase==='bricks'){
      for(const brick of state.bricks){
        if(brick.alive&&circleRectCollision(ball,brick)){
          reflectFromRect(ball,brick);
          damageBrick(ball,brick);
          break;
        }
      }
    }
  }

  function update(dt){
    if(!state.running||state.paused)return;
    if(state.keys.left)state.paddle.x-=state.paddle.speed*dt;
    if(state.keys.right)state.paddle.x+=state.paddle.speed*dt;
    state.paddle.x=clamp(state.paddle.x,10,state.width-state.paddle.w-10);

    updateTimedPowers();
    state.balls.forEach(ball=>updateBall(ball,dt));
    state.balls=state.balls.filter(ball=>ball.y-ball.r<=state.height);

    if(state.phase==='bricks')updatePowerups(dt);

    if(!state.balls.length&&!state.resultShown){
      state.lives-=1;
      state.combo=0;
      state.wideUntil=0;
      state.slowUntil=0;
      state.paddle.w=state.paddle.baseW;
      updateHud();
      if(state.lives<=0){
        finishGame(false);
        return;
      }
      resetBalls();
    }
  }

  function powerLabel(type){
    if(type==='wide')return 'W';
    if(type==='multi')return 'M';
    if(type==='slow')return 'S';
    return '+';
  }

  function draw(){
    const ctx=state.ctx;
    if(!ctx)return;
    ctx.clearRect(0,0,state.width,state.height);

    if(state.phase==='bricks'||state.phase==='result'){
      state.bricks.forEach(brick=>{
        if(!brick.alive)return;
        ctx.save();
        ctx.fillStyle=brick.color;
        ctx.globalAlpha=.94;
        roundedRect(ctx,brick.x,brick.y,brick.w,brick.h,7);
        ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,.48)';
        ctx.lineWidth=1;
        ctx.stroke();
        ctx.restore();
      });

      state.powerups.forEach(power=>{
        if(!power.alive)return;
        ctx.save();
        ctx.fillStyle=power.color;
        ctx.shadowColor='rgba(30,36,64,.22)';
        ctx.shadowBlur=12;
        ctx.beginPath();ctx.arc(power.x,power.y,power.r,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#1e2440';
        ctx.font=`700 ${Math.max(10,power.r*.9)}px Manrope, sans-serif`;
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(powerLabel(power.type),power.x,power.y+.5);
        ctx.restore();
      });
    }

    if(state.paddle){
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
    }

    state.balls.forEach(ball=>{
      ctx.save();
      const ballGradient=ctx.createRadialGradient(ball.x-2,ball.y-3,1,ball.x,ball.y,ball.r*1.4);
      ballGradient.addColorStop(0,'#fff');
      ballGradient.addColorStop(.28,'#eef29d');
      ballGradient.addColorStop(1,'#796cf0');
      ctx.fillStyle=ballGradient;
      ctx.shadowColor='rgba(121,108,240,.42)';
      ctx.shadowBlur=16;
      ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fill();
      ctx.restore();
    });
  }

  function frame(ts){
    if(!state.running)return;
    const dt=Math.min(.032,Math.max(.001,(ts-state.last)/1000||.016));
    state.last=ts;
    update(dt);draw();
    state.raf=requestAnimationFrame(frame);
  }

  function calculateResult(win){
    if(!win)return {stars:0,timeBonus:0,lifeBonus:0,elapsed:0};
    const elapsed=Math.max(1,(performance.now()-state.brickPhaseStartedAt)/1000);
    const timeBonus=Math.max(0,Math.round((145-elapsed)*11));
    const lifeBonus=state.lives*350;
    state.score+=timeBonus+lifeBonus;
    const clearBase=state.brickPhaseStartScore+state.totalBricks*50;
    const stars=state.score>=clearBase+1550?3:state.score>=clearBase+700?2:1;
    return {stars,timeBonus,lifeBonus,elapsed};
  }

  function finishGame(win){
    if(state.resultShown)return;
    state.resultShown=true;
    state.paused=true;
    state.phase='result';
    const result=calculateResult(win);
    updateHud();
    playResult(result.stars);

    const modal=state.root?.querySelector('.brick-egg-result');
    if(!modal)return;
    const kicker=modal.querySelector('.brick-egg-result__kicker');
    const title=modal.querySelector('.brick-egg-result__title');
    const score=modal.querySelector('.brick-egg-result__score');
    const stars=modal.querySelector('.brick-egg-result__stars');
    const detail=modal.querySelector('.brick-egg-result__detail');
    const replay=modal.querySelector('.brick-egg-replay');
    const close=modal.querySelector('.brick-egg-close');

    kicker.textContent=win?(isItalian()?'LIVELLO COMPLETATO':'LEVEL CLEARED'):(isItalian()?'PARTITA TERMINATA':'GAME OVER');
    title.textContent=win?(isItalian()?'Interfaccia demolita.':'Interface demolished.'):(isItalian()?'Riprova il breakout.':'Try the breakout again.');
    score.textContent=`${Math.round(state.score)} pts`;
    stars.innerHTML=[1,2,3].map(i=>`<span class="${i<=result.stars?'earned':''}" aria-hidden="true">★</span>`).join('');
    detail.textContent=win
      ? `${isItalian()?'Combo migliore':'Best combo'} ×${state.maxCombo} · ${isItalian()?'Vite rimaste':'Lives left'} ${state.lives}`
      : `${isItalian()?'Blocchi rimasti':'Bricks left'} ${state.bricks.filter(brick=>brick.alive).length}`;
    replay.textContent=isItalian()?'Ripeti':'Replay';
    close.textContent=isItalian()?'Chiudi':'Close';

    modal.setAttribute('aria-hidden','false');
    modal.classList.add('show');
  }

  function hideResult(){
    const modal=state.root?.querySelector('.brick-egg-result');
    modal?.classList.remove('show');
    modal?.setAttribute('aria-hidden','true');
  }

  function restartGame(){
    if(!state.running)return;
    document.body.classList.remove('brick-egg-phase2');
    resetInterface();
    state.root?.querySelectorAll('.brick-egg-fragment').forEach(el=>el.remove());
    hideResult();
    state.score=0;
    state.lives=3;
    state.phase='interface';
    state.destroyedUi=0;
    state.targets=[];
    state.bricks=[];
    state.powerups=[];
    state.totalBricks=0;
    state.combo=0;
    state.maxCombo=0;
    state.resultShown=false;
    state.paused=false;
    state.closing=false;
    state.wideUntil=0;
    state.slowUntil=0;
    state.paddle.w=state.paddle.baseW;
    state.paddle.x=(state.width-state.paddle.w)/2;
    resetBalls();
    collectTargets();
    updateHud();
    showMessage('EASTER EGG','BREAK THE UI');
    playPhase();
  }

  function makeBubbleSpecs(){
    const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);
    const cols=w<520?5:w<900?7:9;
    const rows=h<620?5:h<900?7:8;
    const specs=[];
    const cellW=w/cols,cellH=h/rows;
    for(let row=-1;row<=rows;row++){
      for(let col=-1;col<=cols;col++){
        const x=(col+.5+(Math.random()-.5)*.28)*cellW;
        const y=(row+.5+(Math.random()-.5)*.28)*cellH;
        const size=w<520?34+Math.random()*24:w<900?40+Math.random()*32:46+Math.random()*44;
        const target=Math.hypot(cellW*1.55,cellH*1.55);
        specs.push({
          x:x/w,y:y/h,size,
          coverScale:Math.max(2.5,Math.min(5.2,target/size)),
          color:palette[Math.floor(Math.random()*palette.length)],
          delay:Math.random()*330,
          duration:980+Math.random()*360,
          popDelay:Math.random()*360,
          popDuration:820+Math.random()*360
        });
      }
    }
    return specs;
  }

  function buildBubbleOverlay(specs,reverse=false){
    const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);
    const overlay=document.createElement('div');
    overlay.className=`bubble-transition ${reverse?'is-revealing':'is-covering'}`;
    specs.forEach(spec=>{
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
    });
    return overlay;
  }

  function closeWithBubbles(){
    if(!state.running||state.closing)return;
    state.closing=true;
    state.paused=true;
    const specs=makeBubbleSpecs();
    const overlay=buildBubbleOverlay(specs,false);
    document.body.appendChild(overlay);
    setTimeout(()=>{
      hardStop();
      overlay.classList.remove('is-covering');
      void overlay.offsetWidth;
      overlay.classList.add('is-revealing');
      setTimeout(()=>overlay.remove(),1900);
    },1280);
  }

  function onKeyDown(event){
    if(!state.running)return;
    if(event.key==='Escape'){event.preventDefault();closeWithBubbles();return}
    if(state.paused)return;
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
    state.paused=false;
    state.closing=false;
    state.resultShown=false;
    state.score=0;
    state.lives=3;
    state.phase='interface';
    state.destroyedUi=0;
    state.bricks=[];
    state.powerups=[];
    state.targets=[];
    state.combo=0;
    state.maxCombo=0;
    state.wideUntil=0;
    state.slowUntil=0;

    document.body.classList.remove('brick-egg-phase2');
    document.documentElement.classList.add('brick-egg-running');
    document.body.classList.add('brick-egg-running');
    createUi();
    state.paddle={x:0,y:0,w:150,baseW:150,h:14,speed:520};
    resizeCanvas();
    state.paddle.x=(state.width-state.paddle.w)/2;
    resetBalls();
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

  function hardStop(){
    if(!state.running)return;
    state.running=false;
    state.paused=false;
    cancelAnimationFrame(state.raf);
    window.removeEventListener('keydown',onKeyDown,{capture:true});
    window.removeEventListener('keyup',onKeyUp,{capture:true});
    if(state.resizeHandler){
      window.removeEventListener('resize',state.resizeHandler);
      window.visualViewport?.removeEventListener('resize',state.resizeHandler);
    }
    document.body.classList.remove('brick-egg-phase2');
    resetInterface();
    state.root?.remove();
    state.root=null;
    state.canvas=null;
    state.ctx=null;
    state.targets=[];
    state.bricks=[];
    state.powerups=[];
    state.balls=[];
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

  window.ContactBrickBreaker={init,start,stop:closeWithBubbles};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
