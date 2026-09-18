(() => {
  const modal = document.querySelector('[data-momentum-demo]');
  const canvas = document.querySelector('[data-momentum-demo-canvas]');
  const openers = Array.from(document.querySelectorAll('[data-momentum-demo-open]'));
  if (!modal || !canvas || !openers.length) return;

  const ctx = canvas.getContext('2d');
  const closeButtons = Array.from(modal.querySelectorAll('[data-momentum-demo-close]'));
  const ammoEl = modal.querySelector('[data-demo-ammo]');
  const coresEl = modal.querySelector('[data-demo-cores]');
  const timeEl = modal.querySelector('[data-demo-time]');
  const scoreEl = modal.querySelector('[data-demo-score]');
  const leftButton = modal.querySelector('[data-demo-left]');
  const rightButton = modal.querySelector('[data-demo-right]');
  const jumpButton = modal.querySelector('[data-demo-jump]');
  const shootButton = modal.querySelector('[data-demo-shoot]');

  const W = canvas.width;
  const H = canvas.height;
  const floorY = 346;
  const input = { left:false, right:false };
  const platforms = [
    { x:0, y:floorY, w:W, h:H-floorY },
    { x:300, y:282, w:128, h:13 },
    { x:500, y:238, w:104, h:13 }
  ];

  let raf = 0;
  let playing = false;
  let last = 0;
  let lastFocus = null;
  let spawnClock = 0;
  let enemyId = 0;
  let flash = 0;

  const state = {
    ammo:6,
    cores:3,
    score:0,
    bullets:[],
    enemies:[],
    player:{ x:76, y:floorY-31, w:23, h:31, vx:0, vy:0, grounded:true },
    actionPulse:0
  };

  const resetPlayer = () => {
    Object.assign(state.player,{ x:76, y:floorY-31, vx:0, vy:0, grounded:true });
  };

  const spawnEnemy = (forced=false) => {
    const flying = forced ? false : Math.random() > .58;
    const tough = enemyId % 4 === 0;
    state.enemies.push({
      id:++enemyId,
      x:W-48,
      y:flying ? 212 + Math.random()*62 : floorY-(tough?34:26),
      w:tough?30:24,
      h:tough?34:26,
      hp:tough?2:1,
      speed:flying?54:40 + Math.random()*16,
      flying,
      phase:Math.random()*Math.PI*2
    });
  };

  const resetGame = () => {
    state.ammo=6;
    state.cores=3;
    state.score=0;
    state.bullets.length=0;
    state.enemies.length=0;
    state.actionPulse=0;
    spawnClock=0;
    flash=0;
    resetPlayer();
    spawnEnemy(true);
    updateHud(.24);
  };

  const updateHud = scale => {
    if(ammoEl) ammoEl.textContent=String(state.ammo);
    if(coresEl) coresEl.textContent=String(state.cores);
    if(scoreEl) scoreEl.textContent=String(state.score);
    if(timeEl){
      timeEl.textContent=scale < .6 ? 'SLOW' : 'NORMAL';
      timeEl.style.color=scale < .6 ? '#72d5e9' : '#ffe875';
    }
  };

  const shoot = () => {
    if (!playing || state.ammo <= 0) return;
    const p=state.player;
    state.ammo--;
    state.actionPulse=.26;
    state.bullets.push({
      x:p.x+p.w+5,
      y:p.y+p.h*.42,
      vx:380,
      r:4,
      mode:'out',
      wait:0,
      returnAfter:2.6,
      returnHits:new Set()
    });
  };

  const jump = () => {
    if(!playing || !state.player.grounded) return;
    state.player.vy=-338;
    state.player.grounded=false;
    state.actionPulse=.22;
  };

  const playerHit = enemy => {
    const idx=state.enemies.indexOf(enemy);
    if(idx>=0) state.enemies.splice(idx,1);
    state.cores--;
    flash=.3;
    resetPlayer();
    if(state.cores<=0){
      state.cores=3;
      state.score=0;
      state.ammo=6;
      state.bullets.length=0;
      state.enemies.length=0;
      spawnEnemy(true);
    }
  };

  const rectHit = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;

  const damageEnemy = enemy => {
    enemy.hp--;
    if(enemy.hp<=0){
      const idx=state.enemies.indexOf(enemy);
      if(idx>=0) state.enemies.splice(idx,1);
      state.score+=100;
    }
  };

  const updatePlayer = (dt,scale) => {
    const p=state.player;
    const move=(input.right?1:0)-(input.left?1:0);
    p.vx=move*172;
    if(move!==0) state.actionPulse=.12;

    p.x+=p.vx*dt;
    p.x=Math.max(20,Math.min(W-p.w-20,p.x));

    const previousBottom=p.y+p.h;
    p.vy+=760*dt;
    p.y+=p.vy*dt;
    p.grounded=false;

    for(const platform of platforms){
      const nextBottom=p.y+p.h;
      const overX=p.x+p.w>platform.x && p.x<platform.x+platform.w;
      if(overX && p.vy>=0 && previousBottom<=platform.y+3 && nextBottom>=platform.y){
        p.y=platform.y-p.h;
        p.vy=0;
        p.grounded=true;
      }
    }

    if(p.y>H+60) resetPlayer();
  };

  const updateBullets = (dt,scale) => {
    const p=state.player;

    for(let i=state.bullets.length-1;i>=0;i--){
      const b=state.bullets[i];

      if(b.mode==='out'){
        b.x+=b.vx*dt*scale;

        let impacted=null;
        for(const enemy of [...state.enemies]){
          if(b.x+b.r>enemy.x && b.x-b.r<enemy.x+enemy.w &&
             b.y+b.r>enemy.y && b.y-b.r<enemy.y+enemy.h){
            impacted=enemy;
            break;
          }
        }

        if(impacted){
          damageEnemy(impacted);
          b.mode='wait';
          b.wait=0;
        } else if(b.x>W-24){
          b.x=W-24;
          b.mode='wait';
          b.wait=0;
        }
      } else if(b.mode==='wait'){
        b.wait+=dt*scale;
        if(b.wait>=b.returnAfter) b.mode='return';
      } else {
        const tx=p.x+p.w*.5;
        const ty=p.y+p.h*.45;
        const dx=tx-b.x;
        const dy=ty-b.y;
        const dist=Math.hypot(dx,dy)||1;
        const speed=430;
        b.x+=dx/dist*speed*dt*scale;
        b.y+=dy/dist*speed*dt*scale;

        for(const enemy of [...state.enemies]){
          if(b.returnHits.has(enemy.id)) continue;
          if(b.x+b.r>enemy.x && b.x-b.r<enemy.x+enemy.w &&
             b.y+b.r>enemy.y && b.y-b.r<enemy.y+enemy.h){
            b.returnHits.add(enemy.id);
            damageEnemy(enemy);
          }
        }

        if(dist<13){
          state.bullets.splice(i,1);
          state.ammo=Math.min(6,state.ammo+1);
        }
      }
    }
  };

  const updateEnemies = (dt,scale) => {
    spawnClock+=dt*scale;
    if(spawnClock>2.65 && state.enemies.length<5){
      spawnClock=0;
      spawnEnemy();
    }

    for(const enemy of [...state.enemies]){
      enemy.phase+=dt*scale*2.2;
      enemy.x-=enemy.speed*dt*scale;
      if(enemy.flying) enemy.y+=Math.sin(enemy.phase)*13*dt*scale;

      if(rectHit(state.player,enemy)) playerHit(enemy);
      else if(enemy.x<-40){
        const idx=state.enemies.indexOf(enemy);
        if(idx>=0) state.enemies.splice(idx,1);
      }
    }
  };

  const drawTower = () => {
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#111a30');
    g.addColorStop(1,'#07101f');
    ctx.fillStyle=g;
    ctx.fillRect(0,0,W,H);

    ctx.fillStyle='rgba(244,150,72,.08)';
    ctx.fillRect(0,75,W,2);

    for(let i=0;i<11;i++){
      const x=i*74+(i%2)*18;
      const h=90+(i%4)*38;
      ctx.fillStyle=i%2?'#10182a':'#0d1526';
      ctx.fillRect(x,145-h*.4,58,h+120);
      ctx.fillStyle='rgba(244,160,74,.14)';
      for(let y=120;y<300;y+=28){
        if((i+y)%3!==0) ctx.fillRect(x+12,y,5,11);
      }
    }

    ctx.strokeStyle='rgba(114,213,233,.09)';
    ctx.lineWidth=1;
    for(let x=0;x<W;x+=36){
      ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();
    }
    for(let y=0;y<H;y+=36){
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
    }

    for(const platform of platforms){
      ctx.fillStyle=platform.y===floorY?'#18223a':'#27314b';
      ctx.fillRect(platform.x,platform.y,platform.w,platform.h);
      ctx.fillStyle=platform.y===floorY?'#796cf0':'#5ea0f0';
      ctx.fillRect(platform.x,platform.y,platform.w,2);
    }
  };

  const drawPlayer = () => {
    const p=state.player;
    ctx.fillStyle='#e8ecf4';
    ctx.fillRect(p.x,p.y,p.w,p.h);
    ctx.fillStyle='#101827';
    ctx.fillRect(p.x+4,p.y+7,p.w-8,8);
    ctx.fillStyle='#f4d75c';
    ctx.fillRect(p.x+p.w-4,p.y+10,5,3);
    ctx.fillStyle='#5ea0f0';
    ctx.fillRect(p.x+5,p.y+p.h-4,p.w-10,3);
  };

  const drawEnemies = () => {
    for(const e of state.enemies){
      ctx.fillStyle=e.hp>1?'#a94d45':'#7a3541';
      ctx.fillRect(e.x,e.y,e.w,e.h);
      ctx.fillStyle='#ff754f';
      ctx.fillRect(e.x+4,e.y+5,e.w-8,4);
      if(e.flying){
        ctx.fillStyle='#a94d45';
        ctx.fillRect(e.x-7,e.y+8,7,4);
        ctx.fillRect(e.x+e.w,e.y+8,7,4);
      }
    }
  };

  const drawBullets = () => {
    for(const b of state.bullets){
      ctx.beginPath();
      ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
      if(b.mode==='out') ctx.fillStyle='#ffe875';
      else if(b.mode==='wait') ctx.fillStyle='#9b8cff';
      else ctx.fillStyle='#72d5e9';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(b.x,b.y,b.r+4,0,Math.PI*2);
      ctx.strokeStyle=b.mode==='return'?'rgba(114,213,233,.35)':'rgba(244,215,92,.18)';
      ctx.stroke();
    }
  };

  const drawOverlay = scale => {
    if(scale<.6){
      ctx.fillStyle='rgba(94,160,240,.055)';
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle='rgba(114,213,233,.72)';
      ctx.font='700 10px monospace';
      ctx.fillText('TIME / SLOW',20,24);
    }else{
      ctx.fillStyle='rgba(244,215,92,.72)';
      ctx.font='700 10px monospace';
      ctx.fillText('TIME / NORMAL',20,24);
    }

    ctx.fillStyle='rgba(255,255,255,.40)';
    ctx.font='9px monospace';
    ctx.fillText('STOP = PLAN   •   MOVE = COMMIT   •   RETURNING SHOTS CAN HIT AGAIN',20,H-18);

    if(flash>0){
      ctx.fillStyle='rgba(255,74,74,.14)';
      ctx.fillRect(0,0,W,H);
    }
  };

  const frame = now => {
    if(!playing) return;
    const rawDt=Math.min(.035,(now-last)/1000 || .016);
    last=now;

    state.actionPulse=Math.max(0,state.actionPulse-rawDt);
    flash=Math.max(0,flash-rawDt);

    const activeMovement=input.left||input.right||!state.player.grounded||state.actionPulse>0;
    const scale=activeMovement?1:.24;

    updatePlayer(rawDt,scale);
    updateBullets(rawDt,scale);
    updateEnemies(rawDt,scale);
    updateHud(scale);

    drawTower();
    drawEnemies();
    drawBullets();
    drawPlayer();
    drawOverlay(scale);

    raf=requestAnimationFrame(frame);
  };

  const pressHold = (button,key) => {
    if(!button) return;
    const down=e=>{e.preventDefault();input[key]=true;};
    const up=e=>{e.preventDefault();input[key]=false;};
    button.addEventListener('pointerdown',down);
    button.addEventListener('pointerup',up);
    button.addEventListener('pointercancel',up);
    button.addEventListener('pointerleave',up);
  };

  pressHold(leftButton,'left');
  pressHold(rightButton,'right');
  jumpButton?.addEventListener('pointerdown',e=>{e.preventDefault();jump();});
  shootButton?.addEventListener('pointerdown',e=>{e.preventDefault();shoot();});
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();shoot();});

  const keyDown = e => {
    if(!playing) return;
    if(['ArrowLeft','ArrowRight',' ','Spacebar'].includes(e.key)) e.preventDefault();
    if(e.key==='a'||e.key==='A'||e.key==='ArrowLeft') input.left=true;
    if(e.key==='d'||e.key==='D'||e.key==='ArrowRight') input.right=true;
    if((e.key===' '||e.key==='Spacebar'||e.key==='ArrowUp'||e.key==='w'||e.key==='W')&&!e.repeat) jump();
    if((e.key==='f'||e.key==='F')&&!e.repeat) shoot();
    if(e.key==='Escape') close();
  };

  const keyUp = e => {
    if(e.key==='a'||e.key==='A'||e.key==='ArrowLeft') input.left=false;
    if(e.key==='d'||e.key==='D'||e.key==='ArrowRight') input.right=false;
  };

  const open = () => {
    lastFocus=document.activeElement;
    modal.hidden=false;
    document.body.classList.add('ms-demo-open');
    input.left=false; input.right=false;
    resetGame();
    playing=true;
    last=performance.now();
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(frame);
    document.addEventListener('keydown',keyDown);
    document.addEventListener('keyup',keyUp);
    modal.querySelector('.ms-demo-close')?.focus();
  };

  function close(){
    playing=false;
    cancelAnimationFrame(raf);
    input.left=false; input.right=false;
    modal.hidden=true;
    document.body.classList.remove('ms-demo-open');
    document.removeEventListener('keydown',keyDown);
    document.removeEventListener('keyup',keyUp);
    if(lastFocus && typeof lastFocus.focus==='function') lastFocus.focus();
  }

  openers.forEach(opener=>opener.addEventListener('click',open));
  closeButtons.forEach(button=>button.addEventListener('click',close));
})();