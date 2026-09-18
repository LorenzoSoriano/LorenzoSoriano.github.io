(() => {
  const seals = Array.from(document.querySelectorAll('[data-demo-seal]'));
  const stage = document.querySelector('[data-momentum-game]');
  const canvas = document.querySelector('[data-momentum-game-canvas]');
  if (seals.length !== 6 || !stage || !canvas) return;

  const ctx = canvas.getContext('2d');
  const ammoEl = stage.querySelector('[data-game-ammo]');
  const coresEl = stage.querySelector('[data-game-cores]');
  const timeEl = stage.querySelector('[data-game-time]');
  const doorEl = stage.querySelector('[data-game-door]');
  const scoreEl = stage.querySelector('[data-game-score]');

  const W = canvas.width;
  const H = canvas.height;
  const floorY = 650;

  const input = { left:false, right:false };
  const aim = { x:860, y:350, active:false };

  const staticSolids = [
    { x:0, y:floorY, w:W, h:H-floorY, kind:'floor' },
    { x:160, y:550, w:220, h:18, kind:'platform' },
    { x:455, y:470, w:170, h:18, kind:'platform' },
    { x:710, y:565, w:160, h:18, kind:'platform' },
    { x:850, y:405, w:175, h:18, kind:'platform' },
    { x:1045, y:515, w:115, h:18, kind:'platform' },
    { x:625, y:330, w:22, h:138, kind:'wall' }
  ];

  const wave = [
    'rumbler',
    'drone',
    'webcaster',
    'drone',
    'rumbler',
    'summoner',
    'webcaster',
    'drone'
  ];

  const state = {
    active:false,
    raf:0,
    last:0,
    ammo:6,
    cores:3,
    score:0,
    actionPulse:0,
    flash:0,
    bullets:[],
    enemies:[],
    enemyShots:[],
    pickups:[],
    enemyId:0,
    won:false,
    message:'',
    messageTimer:0,
    player:{
      x:74, y:floorY-38, w:26, h:38,
      vx:0, vy:0, grounded:true,
      facing:1, invuln:0
    },
    door:{
      x:1165, y:535, w:78, h:115,
      total:wave.length,
      remaining:wave.length,
      spawned:0,
      timer:.8,
      active:true,
      coreDropped:false
    }
  };

  const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
  const rectHit = (a,b) =>
    a.x < b.x+b.w && a.x+a.w > b.x &&
    a.y < b.y+b.h && a.y+a.h > b.y;

  const circleRect = (x,y,r,rect) => {
    const cx = clamp(x,rect.x,rect.x+rect.w);
    const cy = clamp(y,rect.y,rect.y+rect.h);
    const dx = x-cx;
    const dy = y-cy;
    return dx*dx+dy*dy <= r*r;
  };

  const getPlayerSolids = () => {
    if (state.door.active) {
      return staticSolids.concat([{x:state.door.x,y:state.door.y,w:state.door.w,h:state.door.h,kind:'door'}]);
    }
    return staticSolids;
  };

  const getBulletSolids = () => {
    const solids = staticSolids.slice();
    if (state.door.active) solids.push({x:state.door.x,y:state.door.y,w:state.door.w,h:state.door.h,kind:'door'});
    return solids;
  };

  const resetPlayer = () => {
    Object.assign(state.player,{
      x:74, y:floorY-38, vx:0, vy:0,
      grounded:true, facing:1, invuln:1.2
    });
  };

  const resetDoor = () => {
    Object.assign(state.door,{
      total:wave.length,
      remaining:wave.length,
      spawned:0,
      timer:.8,
      active:true,
      coreDropped:false
    });
  };

  const resetGame = () => {
    state.ammo=6;
    state.cores=3;
    state.score=0;
    state.actionPulse=0;
    state.flash=0;
    state.bullets.length=0;
    state.enemies.length=0;
    state.enemyShots.length=0;
    state.pickups.length=0;
    state.enemyId=0;
    state.won=false;
    state.message='';
    state.messageTimer=0;
    resetDoor();
    resetPlayer();
    updateHud(.22);
  };

  const enemySpec = type => {
    if(type==='rumbler') return { w:40,h:48,hp:2,speed:52,color:'#9b4347',accent:'#ff8758' };
    if(type==='drone') return { w:34,h:24,hp:1,speed:104,color:'#6b3140',accent:'#ff6f4c' };
    if(type==='webcaster') return { w:34,h:42,hp:1,speed:30,color:'#68405f',accent:'#b98cff' };
    return { w:36,h:50,hp:1,speed:25,color:'#704b39',accent:'#f4d75c' };
  };

  const spawnEnemy = (type, waveEnemy=true) => {
    const spec=enemySpec(type);
    const flying=type==='drone';
    const enemy={
      id:++state.enemyId,
      type,
      waveEnemy,
      x:state.door.x-44,
      y:flying?430:floorY-spec.h,
      w:spec.w,h:spec.h,
      hp:spec.hp,maxHp:spec.hp,
      speed:spec.speed,
      color:spec.color,
      accent:spec.accent,
      flying,
      phase:state.enemyId*.8,
      attack:1.2 + (state.enemyId%3)*.28,
      summon:3.4
    };
    state.enemies.push(enemy);
    return enemy;
  };

  const damageEnemy = (enemy, amount=1) => {
    enemy.hp-=amount;
    if(enemy.hp>0) return false;

    const idx=state.enemies.indexOf(enemy);
    if(idx>=0) state.enemies.splice(idx,1);
    state.score+=enemy.waveEnemy?120:55;

    if(enemy.waveEnemy){
      state.door.remaining=Math.max(0,state.door.remaining-1);
      if(state.door.remaining===0){
        state.door.active=false;
        state.score+=500;
        state.message='DOOR CLEARED';
        state.messageTimer=2.2;
        if(!state.door.coreDropped){
          state.door.coreDropped=true;
          state.pickups.push({
            type:'core',
            x:state.door.x-46,
            y:floorY-32,
            w:20,h:20,
            phase:0
          });
        }
      }
    }
    return true;
  };

  const playerHit = () => {
    if(state.player.invuln>0 || state.won) return;
    state.cores--;
    state.flash=.34;
    state.message='WARP CORE LOST';
    state.messageTimer=1.1;

    if(state.cores<=0){
      state.message='RUN RESET';
      state.messageTimer=1.5;
      state.bullets.length=0;
      state.enemies.length=0;
      state.enemyShots.length=0;
      state.pickups.length=0;
      state.ammo=6;
      state.cores=3;
      resetDoor();
    }
    resetPlayer();
  };

  const updateHud = scale => {
    ammoEl.textContent=String(state.ammo);
    coresEl.textContent=String(state.cores);
    doorEl.textContent=state.door.active ? String(state.door.remaining).padStart(2,'0') : 'OPEN';
    scoreEl.textContent=String(state.score);
    timeEl.textContent=scale<.6?'SLOW':'NORMAL';
    timeEl.style.color=scale<.6?'#72d5e9':'#ffe875';
    doorEl.style.color=state.door.active?'#ff9366':'#72d5e9';
  };

  const resolvePlayerX = dx => {
    const p=state.player;
    p.x+=dx;
    for(const solid of getPlayerSolids()){
      if(!rectHit(p,solid)) continue;
      if(dx>0) p.x=solid.x-p.w;
      else if(dx<0) p.x=solid.x+solid.w;
    }
  };

  const resolvePlayerY = dy => {
    const p=state.player;
    p.y+=dy;
    p.grounded=false;

    for(const solid of getPlayerSolids()){
      if(!rectHit(p,solid)) continue;
      if(dy>0){
        p.y=solid.y-p.h;
        p.vy=0;
        p.grounded=true;
      }else if(dy<0){
        p.y=solid.y+solid.h;
        p.vy=0;
      }
    }
  };

  const jump = () => {
    if(!state.active || state.won || !state.player.grounded) return;
    state.player.vy=-410;
    state.player.grounded=false;
    state.actionPulse=.18;
  };

  const fireToward = (tx,ty) => {
    if(!state.active || state.won || state.ammo<=0) return;

    const p=state.player;
    const sx=p.x+p.w*.54;
    const sy=p.y+p.h*.38;
    let dx=tx-sx;
    let dy=ty-sy;
    const len=Math.hypot(dx,dy);
    if(len<8) return;
    dx/=len;dy/=len;

    state.player.facing=dx>=0?1:-1;
    state.ammo--;
    state.actionPulse=.26;

    state.bullets.push({
      x:sx,y:sy,
      px:sx,py:sy,
      dx,dy,
      speed:820,
      r:4,
      mode:'out',
      wait:0,
      returnAfter:1.85,
      returnHits:new Set()
    });
  };

  const pointerToWorld = event => {
    const rect=canvas.getBoundingClientRect();
    return {
      x:(event.clientX-rect.left)/rect.width*W,
      y:(event.clientY-rect.top)/rect.height*H
    };
  };

  const updatePlayer = dt => {
    const p=state.player;
    p.invuln=Math.max(0,p.invuln-dt);

    const axis=(input.right?1:0)-(input.left?1:0);
    p.vx=axis*225;
    if(axis!==0){
      p.facing=axis;
      state.actionPulse=.10;
    }

    resolvePlayerX(p.vx*dt);

    p.vy+=920*dt;
    p.vy=Math.min(p.vy,640);
    resolvePlayerY(p.vy*dt);

    p.x=clamp(p.x,4,W-p.w-4);

    if(p.y>H+80) playerHit();

    if(!state.door.active && p.x>W-48){
      state.won=true;
      state.message='SECTOR CLEAR';
      state.messageTimer=999;
    }

    for(let i=state.pickups.length-1;i>=0;i--){
      const pickup=state.pickups[i];
      if(rectHit(p,pickup)){
        state.pickups.splice(i,1);
        if(pickup.type==='core'){
          if(state.cores<3) state.cores++;
          else state.score+=250;
          state.message=state.cores<3?'WARP CORE':'CORE OVERFLOW +250';
          state.messageTimer=1.2;
        }
      }
    }
  };

  const stopBullet = b => {
    b.mode='stuck';
    b.wait=0;
    b.dx=0;
    b.dy=0;
  };

  const updateOutgoingBullet = (b,dt,scale) => {
    const travel=b.speed*dt*scale;
    const steps=Math.max(1,Math.ceil(travel/7));
    const step=travel/steps;

    for(let s=0;s<steps;s++){
      b.px=b.x;b.py=b.y;
      const nx=b.x+b.dx*step;
      const ny=b.y+b.dy*step;

      let hitEnemy=null;
      for(const enemy of state.enemies){
        if(circleRect(nx,ny,b.r,enemy)){
          hitEnemy=enemy;
          break;
        }
      }

      if(hitEnemy){
        b.x=nx;b.y=ny;
        damageEnemy(hitEnemy);
        stopBullet(b);
        return;
      }

      let hitSurface=false;
      for(const solid of getBulletSolids()){
        if(circleRect(nx,ny,b.r,solid)){
          hitSurface=true;
          break;
        }
      }

      if(hitSurface || nx<b.r || nx>W-b.r || ny<b.r || ny>H-b.r){
        b.x=clamp(nx,b.r,W-b.r);
        b.y=clamp(ny,b.r,H-b.r);
        stopBullet(b);
        return;
      }

      b.x=nx;b.y=ny;
    }
  };

  const updateBullets = (dt,scale) => {
    const p=state.player;

    for(let i=state.bullets.length-1;i>=0;i--){
      const b=state.bullets[i];

      if(b.mode==='out'){
        updateOutgoingBullet(b,dt,scale);
      }else if(b.mode==='stuck'){
        b.wait+=dt*scale;
        if(b.wait>=b.returnAfter) b.mode='return';
      }else{
        const tx=p.x+p.w*.52;
        const ty=p.y+p.h*.40;
        const dx=tx-b.x;
        const dy=ty-b.y;
        const dist=Math.hypot(dx,dy)||1;
        const move=620*dt*scale;
        b.x+=dx/dist*move;
        b.y+=dy/dist*move;

        for(const enemy of [...state.enemies]){
          if(b.returnHits.has(enemy.id)) continue;
          if(circleRect(b.x,b.y,b.r+1,enemy)){
            b.returnHits.add(enemy.id);
            damageEnemy(enemy);
          }
        }

        if(dist<12){
          state.bullets.splice(i,1);
          state.ammo=Math.min(6,state.ammo+1);
        }
      }
    }
  };

  const shootEnemyProjectile = (enemy, speed=220) => {
    const p=state.player;
    const sx=enemy.x+enemy.w*.5;
    const sy=enemy.y+enemy.h*.4;
    let dx=(p.x+p.w*.5)-sx;
    let dy=(p.y+p.h*.45)-sy;
    const len=Math.hypot(dx,dy)||1;
    dx/=len;dy/=len;

    state.enemyShots.push({
      x:sx,y:sy,dx,dy,speed,r:5,
      color:enemy.type==='webcaster'?'#b98cff':'#f4d75c'
    });
  };

  const updateDoor = (dt,scale) => {
    const d=state.door;
    if(!d.active || d.spawned>=d.total) return;

    d.timer-=dt*scale;
    const aliveWave=state.enemies.filter(e=>e.waveEnemy).length;
    if(d.timer<=0 && aliveWave<3){
      const type=wave[d.spawned];
      spawnEnemy(type,true);
      d.spawned++;
      d.timer=1.28;
    }
  };

  const updateEnemies = (dt,scale) => {
    const p=state.player;

    for(const enemy of [...state.enemies]){
      enemy.phase+=dt*scale*2.4;

      if(enemy.type==='drone'){
        const dx=(p.x+p.w*.5)-(enemy.x+enemy.w*.5);
        const dy=(p.y+p.h*.45)-(enemy.y+enemy.h*.5);
        const len=Math.hypot(dx,dy)||1;
        enemy.x+=dx/len*enemy.speed*dt*scale;
        enemy.y+=dy/len*enemy.speed*dt*scale;
        enemy.y+=Math.sin(enemy.phase)*12*dt*scale;
      }else if(enemy.type==='webcaster'){
        if(enemy.x>930) enemy.x-=enemy.speed*dt*scale;
        enemy.attack-=dt*scale;
        if(enemy.attack<=0){
          shootEnemyProjectile(enemy,205);
          enemy.attack=2.0;
        }
      }else if(enemy.type==='summoner'){
        if(enemy.x>1000) enemy.x-=enemy.speed*dt*scale;
        enemy.attack-=dt*scale;
        enemy.summon-=dt*scale;
        if(enemy.attack<=0){
          shootEnemyProjectile(enemy,180);
          enemy.attack=2.5;
        }
        if(enemy.summon<=0 && state.enemies.filter(e=>!e.waveEnemy).length<2){
          const summoned=spawnEnemy('drone',false);
          summoned.x=enemy.x-20;
          summoned.y=enemy.y-45;
          enemy.summon=3.8;
        }
      }else{
        const direction=p.x<enemy.x?-1:1;
        enemy.x+=direction*enemy.speed*dt*scale;
      }

      if(rectHit(p,enemy)){
        playerHit();
      }
    }

    for(let i=state.enemyShots.length-1;i>=0;i--){
      const shot=state.enemyShots[i];
      const move=shot.speed*dt*scale;
      shot.x+=shot.dx*move;
      shot.y+=shot.dy*move;

      let remove=shot.x<0||shot.x>W||shot.y<0||shot.y>H;
      if(!remove){
        for(const solid of staticSolids){
          if(circleRect(shot.x,shot.y,shot.r,solid)){
            remove=true;
            break;
          }
        }
      }

      if(!remove && circleRect(shot.x,shot.y,shot.r,p)){
        remove=true;
        playerHit();
      }

      if(remove) state.enemyShots.splice(i,1);
    }
  };

  const drawBackground = () => {
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#111a30');
    g.addColorStop(.58,'#0c1427');
    g.addColorStop(1,'#070e1b');
    ctx.fillStyle=g;
    ctx.fillRect(0,0,W,H);

    const glow=ctx.createRadialGradient(1080,120,10,1080,120,430);
    glow.addColorStop(0,'rgba(241,132,70,.19)');
    glow.addColorStop(1,'rgba(241,132,70,0)');
    ctx.fillStyle=glow;
    ctx.fillRect(650,0,630,480);

    for(let i=0;i<18;i++){
      const x=i*82-30;
      const h=170+(i%5)*48;
      ctx.fillStyle=i%2?'#10182a':'#0c1424';
      ctx.fillRect(x,220-h*.6,62,h+290);
      ctx.fillStyle='rgba(244,151,77,.10)';
      for(let y=165;y<520;y+=38){
        if((i+y)%4!==0) ctx.fillRect(x+13,y,5,15);
      }
    }

    ctx.strokeStyle='rgba(114,213,233,.055)';
    ctx.lineWidth=1;
    for(let x=0;x<W;x+=40){
      ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();
    }
    for(let y=0;y<H;y+=40){
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
    }
  };

  const drawSolids = () => {
    for(const solid of staticSolids){
      ctx.fillStyle=solid.kind==='floor'?'#161f35':'#222d48';
      ctx.fillRect(solid.x,solid.y,solid.w,solid.h);
      ctx.fillStyle=solid.kind==='wall'?'#f4d75c':'#5ea0f0';
      ctx.globalAlpha=.68;
      if(solid.kind==='wall') ctx.fillRect(solid.x,solid.y,2,solid.h);
      else ctx.fillRect(solid.x,solid.y,solid.w,2);
      ctx.globalAlpha=1;
    }
  };

  const drawDoorIcon = (type,cx,cy) => {
    ctx.save();
    ctx.translate(cx,cy);
    ctx.strokeStyle='#72d5e9';
    ctx.fillStyle='#72d5e9';
    ctx.lineWidth=2;

    if(type==='drone'){
      ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(-13,0);ctx.lineTo(-7,0);ctx.moveTo(7,0);ctx.lineTo(13,0);ctx.stroke();
    }else if(type==='webcaster'){
      ctx.strokeRect(-7,-6,14,12);
      for(const sx of [-1,1]){
        ctx.beginPath();ctx.moveTo(sx*6,3);ctx.lineTo(sx*13,9);ctx.moveTo(sx*6,-2);ctx.lineTo(sx*13,-8);ctx.stroke();
      }
    }else if(type==='summoner'){
      ctx.strokeRect(-6,-9,12,18);
      ctx.beginPath();ctx.arc(0,-13,4,0,Math.PI*2);ctx.stroke();
    }else{
      ctx.strokeRect(-9,-8,18,16);
      ctx.fillRect(-12,5,5,5);
      ctx.fillRect(7,5,5,5);
    }
    ctx.restore();
  };

  const drawDoor = () => {
    const d=state.door;
    const frame='#27324d';

    ctx.fillStyle=frame;
    ctx.fillRect(d.x,d.y,d.w,d.h);

    if(d.active){
      ctx.fillStyle='#101827';
      ctx.fillRect(d.x+14,d.y+22,d.w-28,d.h-22);
      ctx.fillStyle='#ff7b58';
      ctx.fillRect(d.x+9,d.y+14,d.w-18,4);
    }else{
      ctx.fillStyle='#07101f';
      ctx.fillRect(d.x+22,d.y+18,d.w-44,d.h-18);
      ctx.fillStyle='#72d5e9';
      ctx.fillRect(d.x+9,d.y+14,d.w-18,3);
    }

    // Physical screen above the door.
    const sx=d.x-20;
    const sy=d.y-55;
    const sw=d.w+40;
    const sh=44;
    ctx.fillStyle='#08101f';
    ctx.fillRect(sx,sy,sw,sh);
    ctx.strokeStyle=d.active?'rgba(255,123,88,.58)':'rgba(114,213,233,.58)';
    ctx.strokeRect(sx+.5,sy+.5,sw-1,sh-1);

    ctx.fillStyle='rgba(255,255,255,.42)';
    ctx.font='700 9px monospace';
    ctx.fillText(d.active?'ENEMIES':'STATUS',sx+10,sy+14);

    ctx.fillStyle=d.active?'#ff9a72':'#72d5e9';
    ctx.font='700 21px monospace';
    ctx.fillText(d.active?String(d.remaining).padStart(2,'0'):'OPEN',sx+10,sy+36);

    if(d.active){
      const next=wave[Math.min(d.spawned,wave.length-1)];
      drawDoorIcon(next,sx+sw-27,sy+23);
    }
  };

  const drawPlayer = () => {
    const p=state.player;
    ctx.save();
    if(p.invuln>0 && Math.floor(p.invuln*12)%2===0) ctx.globalAlpha=.35;

    ctx.fillStyle='#e9edf5';
    ctx.fillRect(p.x,p.y,p.w,p.h);
    ctx.fillStyle='#111827';
    ctx.fillRect(p.x+4,p.y+8,p.w-8,9);
    ctx.fillStyle='#5ea0f0';
    ctx.fillRect(p.x+5,p.y+p.h-5,p.w-10,3);

    const cx=p.x+p.w*.55;
    const cy=p.y+p.h*.38;
    const dx=aim.x-cx;
    const dy=aim.y-cy;
    const len=Math.hypot(dx,dy)||1;
    const ax=dx/len;
    const ay=dy/len;
    ctx.strokeStyle='#f4d75c';
    ctx.lineWidth=4;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.lineTo(cx+ax*15,cy+ay*15);
    ctx.stroke();
    ctx.restore();
  };

  const drawEnemies = () => {
    for(const e of state.enemies){
      ctx.fillStyle=e.color;
      ctx.fillRect(e.x,e.y,e.w,e.h);
      ctx.fillStyle=e.accent;

      if(e.type==='drone'){
        ctx.fillRect(e.x+10,e.y+7,e.w-20,6);
        ctx.fillRect(e.x-7,e.y+10,7,3);
        ctx.fillRect(e.x+e.w,e.y+10,7,3);
      }else if(e.type==='webcaster'){
        ctx.fillRect(e.x+5,e.y+6,e.w-10,4);
        ctx.fillRect(e.x-5,e.y+8,5,2);
        ctx.fillRect(e.x+e.w,e.y+8,5,2);
        ctx.fillRect(e.x-5,e.y+27,5,2);
        ctx.fillRect(e.x+e.w,e.y+27,5,2);
      }else if(e.type==='summoner'){
        ctx.fillRect(e.x+e.w/2-2,e.y+5,4,e.h-10);
        ctx.fillRect(e.x+5,e.y+8,e.w-10,4);
      }else{
        ctx.fillRect(e.x+7,e.y+7,e.w-14,5);
        ctx.fillRect(e.x+4,e.y+e.h-9,8,7);
        ctx.fillRect(e.x+e.w-12,e.y+e.h-9,8,7);
      }

      if(e.maxHp>1){
        ctx.fillStyle='rgba(255,255,255,.16)';
        ctx.fillRect(e.x,e.y-7,e.w,3);
        ctx.fillStyle=e.accent;
        ctx.fillRect(e.x,e.y-7,e.w*(e.hp/e.maxHp),3);
      }
    }
  };

  const drawEnemyShots = () => {
    for(const shot of state.enemyShots){
      ctx.beginPath();
      ctx.arc(shot.x,shot.y,shot.r,0,Math.PI*2);
      ctx.fillStyle=shot.color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(shot.x,shot.y,shot.r+4,0,Math.PI*2);
      ctx.strokeStyle=shot.color+'66';
      ctx.stroke();
    }
  };

  const drawBullets = () => {
    for(const b of state.bullets){
      if(b.mode==='out'){
        ctx.strokeStyle='rgba(244,215,92,.22)';
        ctx.beginPath();ctx.moveTo(b.px,b.py);ctx.lineTo(b.x,b.y);ctx.stroke();
      }else if(b.mode==='return'){
        ctx.strokeStyle='rgba(114,213,233,.20)';
        ctx.beginPath();
        ctx.moveTo(b.x,b.y);
        ctx.lineTo(state.player.x+state.player.w*.5,state.player.y+state.player.h*.4);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
      ctx.fillStyle=b.mode==='out'?'#ffe875':b.mode==='stuck'?'#9b8cff':'#72d5e9';
      ctx.fill();

      if(b.mode==='stuck'){
        const progress=clamp(b.wait/b.returnAfter,0,1);
        ctx.strokeStyle='rgba(155,140,255,.38)';
        ctx.lineWidth=2;
        ctx.beginPath();
        ctx.arc(b.x,b.y,8,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);
        ctx.stroke();
      }
    }
  };

  const drawPickups = () => {
    for(const p of state.pickups){
      p.phase+=.04;
      const cx=p.x+p.w/2;
      const cy=p.y+p.h/2+Math.sin(p.phase)*3;
      ctx.beginPath();
      ctx.arc(cx,cy,9,0,Math.PI*2);
      ctx.fillStyle='#f4d75c';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx,cy,15,0,Math.PI*2);
      ctx.strokeStyle='rgba(244,215,92,.32)';
      ctx.stroke();
    }
  };

  const drawCrosshair = () => {
    ctx.save();
    ctx.translate(aim.x,aim.y);
    ctx.strokeStyle='rgba(255,255,255,.72)';
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.arc(0,0,8,0,Math.PI*2);
    ctx.moveTo(-13,0);ctx.lineTo(-5,0);
    ctx.moveTo(5,0);ctx.lineTo(13,0);
    ctx.moveTo(0,-13);ctx.lineTo(0,-5);
    ctx.moveTo(0,5);ctx.lineTo(0,13);
    ctx.stroke();
    ctx.restore();
  };

  const drawOverlay = scale => {
    if(scale<.6){
      ctx.fillStyle='rgba(94,160,240,.045)';
      ctx.fillRect(0,0,W,H);
    }

    if(state.flash>0){
      ctx.fillStyle='rgba(255,64,64,.14)';
      ctx.fillRect(0,0,W,H);
    }

    if(state.messageTimer>0 && state.message){
      ctx.fillStyle='rgba(7,13,27,.78)';
      ctx.fillRect(W/2-150,88,300,48);
      ctx.strokeStyle='rgba(114,213,233,.18)';
      ctx.strokeRect(W/2-149.5,88.5,299,47);
      ctx.fillStyle='#fff';
      ctx.font='700 17px monospace';
      ctx.textAlign='center';
      ctx.fillText(state.message,W/2,118);
      ctx.textAlign='left';
    }

    if(state.won){
      ctx.fillStyle='rgba(7,13,27,.72)';
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#72d5e9';
      ctx.font='700 12px monospace';
      ctx.textAlign='center';
      ctx.fillText('SECTOR CLEAR',W/2,H/2-24);
      ctx.fillStyle='#fff';
      ctx.font='700 30px sans-serif';
      ctx.fillText('Momentum restored.',W/2,H/2+14);
      ctx.fillStyle='rgba(255,255,255,.56)';
      ctx.font='600 11px monospace';
      ctx.fillText('R to replay  •  ESC to return to portfolio',W/2,H/2+48);
      ctx.textAlign='left';
    }
  };

  const render = scale => {
    drawBackground();
    drawSolids();
    drawDoor();
    drawPickups();
    drawEnemies();
    drawEnemyShots();
    drawBullets();
    drawPlayer();
    drawCrosshair();
    drawOverlay(scale);
  };

  const frame = now => {
    if(!state.active) return;

    const dt=Math.min(.033,(now-state.last)/1000 || .016);
    state.last=now;
    state.actionPulse=Math.max(0,state.actionPulse-dt);
    state.flash=Math.max(0,state.flash-dt);
    state.messageTimer=Math.max(0,state.messageTimer-dt);

    const moving=input.left||input.right||!state.player.grounded||state.actionPulse>0;
    const scale=state.won?0:(moving?1:.22);

    if(!state.won){
      updatePlayer(dt);
      updateDoor(dt,scale);
      updateEnemies(dt,scale);
      updateBullets(dt,scale);
    }

    updateHud(scale);
    render(scale);
    state.raf=requestAnimationFrame(frame);
  };

  const startGame = () => {
    if(state.active) return;
    state.active=true;
    stage.hidden=false;
    document.body.classList.add('ms-game-active');
    input.left=false;
    input.right=false;
    resetGame();
    state.last=performance.now();
    cancelAnimationFrame(state.raf);
    state.raf=requestAnimationFrame(frame);
  };

  const stopGame = () => {
    if(!state.active) return;
    state.active=false;
    cancelAnimationFrame(state.raf);
    input.left=false;
    input.right=false;
    stage.hidden=true;
    document.body.classList.remove('ms-game-active');
  };

  const onKeyDown = event => {
    if(!state.active) return;

    if(['ArrowLeft','ArrowRight','ArrowUp',' ','Spacebar'].includes(event.key)){
      event.preventDefault();
    }

    if(event.key==='Escape'){
      stopGame();
      return;
    }

    if(state.won && (event.key==='r'||event.key==='R')){
      resetGame();
      return;
    }

    if(event.key==='a'||event.key==='A'||event.key==='ArrowLeft') input.left=true;
    if(event.key==='d'||event.key==='D'||event.key==='ArrowRight') input.right=true;

    if((event.key===' '||event.key==='Spacebar'||event.key==='ArrowUp'||event.key==='w'||event.key==='W')&&!event.repeat){
      jump();
    }
  };

  const onKeyUp = event => {
    if(event.key==='a'||event.key==='A'||event.key==='ArrowLeft') input.left=false;
    if(event.key==='d'||event.key==='D'||event.key==='ArrowRight') input.right=false;
  };

  canvas.addEventListener('pointermove',event=>{
    if(!state.active) return;
    const p=pointerToWorld(event);
    aim.x=p.x;
    aim.y=p.y;
    aim.active=true;
  });

  canvas.addEventListener('pointerdown',event=>{
    if(!state.active || event.button!==0) return;
    event.preventDefault();
    const p=pointerToWorld(event);
    aim.x=p.x;
    aim.y=p.y;
    fireToward(p.x,p.y);
  });

  canvas.addEventListener('contextmenu',event=>event.preventDefault());
  document.addEventListener('keydown',onKeyDown);
  document.addEventListener('keyup',onKeyUp);

  let pressed=0;
  seals.forEach(seal=>{
    seal.addEventListener('click',()=>{
      if(seal.disabled) return;
      seal.classList.add('is-pressed');
      seal.disabled=true;
      seal.setAttribute('aria-pressed','true');
      pressed++;

      if(pressed===seals.length){
        const sequence=document.querySelector('[data-demo-sequence]');
        sequence?.classList.add('is-complete');
        window.setTimeout(startGame,280);
      }
    });
  });
})();