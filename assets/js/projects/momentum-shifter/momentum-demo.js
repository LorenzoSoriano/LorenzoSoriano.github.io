(() => {
  const seals = Array.from(document.querySelectorAll('[data-demo-seal]'));
  const stage = document.querySelector('[data-momentum-game]');
  const canvas = document.querySelector('[data-momentum-game-canvas]');
  if (seals.length !== 6 || !stage || !canvas) return;

  const ctx = canvas.getContext('2d');
  const ammoPips = Array.from(stage.querySelectorAll('[data-game-ammo-pips] i'));
  const lifeEls = Array.from(stage.querySelectorAll('[data-game-cores] i'));

  const exitButton = stage.querySelector('[data-game-exit]');
  const pauseButton = stage.querySelector('[data-game-pause]');
  const pausePanel = stage.querySelector('[data-game-pause-panel]');
  const resumeButton = stage.querySelector('[data-game-resume]');
  const jumpButton = stage.querySelector('[data-game-jump]');
  const fireButton = stage.querySelector('[data-game-fire]');

  const moveStick = stage.querySelector('[data-game-move-stick]');
  const moveKnob = stage.querySelector('[data-game-move-knob]');
  const aimStick = stage.querySelector('[data-game-aim-stick]');
  const aimKnob = stage.querySelector('[data-game-aim-knob]');

  const W = canvas.width;
  const H = canvas.height;
  const WORLD_H = 2200;
  const floorY = 2080;
  const BULLET_RETURN_SECONDS = 10;
  const GRAVITY_MAX_CHARGES = 3;
  const GRAVITY_RECHARGE_SECONDS = 3;

  const input = {
    left:false,right:false,up:false,down:false,
    moveX:0,moveY:0
  };
  const aim = { x:850, y:floorY-180, active:false, dx:1, dy:0, source:'mouse' };

  // Visible-route layout: every mandatory magnetic jump has an unobstructed
  // next surface within range. Solid architecture frames the route instead of
  // sitting between consecutive traversal targets.
  const doorPlatform = {
    x:720, y:365, w:520, h:18,
    kind:'platform', gravity:true, faces:['top','bottom'], zone:6
  };

  const staticSolids = [
    { x:0, y:floorY, w:W, h:WORLD_H-floorY, kind:'floor', gravity:true, faces:['top'], zone:0 },

    // Entry: broad, readable ascent.
    { x:145, y:1935, w:300, h:18, kind:'platform', gravity:true, faces:['top','bottom'], zone:1 },
    { x:445, y:1775, w:260, h:18, kind:'platform', gravity:true, faces:['top','bottom'], zone:1 },
    { x:555, y:1695, w:120, h:16, kind:'platform', gravity:true, faces:['top','bottom'], zone:1 },

    // Arena A: landing is visible from the previous deck; optional upper shelf stays inside the arena.
    { x:735, y:1605, w:445, h:18, kind:'platform', gravity:true, faces:['top','bottom'], zone:2 },
    { x:900, y:1505, w:160, h:16, kind:'platform', gravity:true, faces:['top','bottom'], zone:2 },
    { x:460, y:1435, w:250, h:18, kind:'platform', gravity:true, faces:['top','bottom'], zone:2 },

    // Arena B: route crosses back left without an occluding wall.
    { x:120, y:1260, w:330, h:18, kind:'platform', gravity:true, faces:['top','bottom'], zone:3 },
    { x:285, y:1165, w:150, h:16, kind:'platform', gravity:true, faces:['top','bottom'], zone:3 },
    { x:485, y:1085, w:270, h:18, kind:'platform', gravity:true, faces:['top','bottom'], zone:3 },

    // Arena C: long combat floor with an optional upper underside route.
    { x:790, y:900, w:400, h:18, kind:'platform', gravity:true, faces:['top','bottom'], zone:4 },
    { x:1000, y:805, w:150, h:16, kind:'platform', gravity:true, faces:['top','bottom'], zone:4 },
    { x:570, y:705, w:240, h:18, kind:'platform', gravity:true, faces:['top','bottom'], zone:4 },

    // Final ascent: short, fully visible chain into the gate.
    { x:430, y:540, w:220, h:18, kind:'platform', gravity:true, faces:['top','bottom'], zone:5 },
    { x:630, y:450, w:150, h:16, kind:'platform', gravity:true, faces:['top','bottom'], zone:5 },

    // Optional magnetic side surfaces. They sit beside, never across, the critical sight-lines.
    { x:90, y:1810, w:22, h:125, kind:'wall', gravity:true, faces:['left','right'], zone:1 },
    { x:1195, y:1485, w:22, h:120, kind:'wall', gravity:true, faces:['left','right'], zone:2 },
    { x:82, y:1160, w:22, h:100, kind:'wall', gravity:true, faces:['left','right'], zone:3 },
    { x:1200, y:790, w:22, h:110, kind:'wall', gravity:true, faces:['left','right'], zone:4 },
    { x:385, y:540, w:22, h:165, kind:'wall', gravity:true, faces:['left','right'], zone:5 },

    // Architectural masses frame shafts/corridors while leaving the centre line open.
    { x:0, y:1840, w:50, h:240, kind:'block', gravity:true, faces:['top','right'], zone:1 },
    { x:1205, y:1660, w:75, h:150, kind:'block', gravity:true, faces:['top','left'], zone:2 },
    { x:0, y:1395, w:105, h:160, kind:'block', gravity:true, faces:['top','right'], zone:2 },
    { x:1170, y:1110, w:110, h:165, kind:'block', gravity:true, faces:['top','left'], zone:3 },
    { x:0, y:810, w:135, h:175, kind:'block', gravity:true, faces:['top','right'], zone:4 },
    { x:1165, y:625, w:115, h:150, kind:'block', gravity:true, faces:['top','left'], zone:4 },
    { x:0, y:350, w:210, h:170, kind:'block', gravity:true, faces:['top','right'], zone:5 },
    { x:1115, y:215, w:165, h:105, kind:'block', gravity:true, faces:['top','left'], zone:6 },

    doorPlatform
  ];

  // Used only to place subtle architectural separators; no in-world section text.
  const levelSections = [
    { y:2020 }, { y:1780 }, { y:1588 }, { y:1245 }, { y:885 }, { y:690 }, { y:350 }
  ];

  const startZone = {
    x:36,
    y:floorY-76,
    w:172,
    h:76
  };

  const goal = {
    x:1182,
    y:doorPlatform.y-76,
    w:52,
    h:76
  };

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

  const combatZones = [
    {
      id:'A',
      label:'ENEMY ZONE A',
      triggerY:1645,
      platformY:1605,
      minX:735,
      maxX:1180,
      spawnX:1140,
      spawnPoints:[775,1140],
      maxAlive:2,
      zoneX:720,
      zoneY:1490,
      zoneW:480,
      zoneH:135,
      wave:['drone','webcaster','rumbler','drone']
    },
    {
      id:'B',
      label:'ENEMY ZONE B',
      triggerY:1300,
      platformY:1260,
      minX:120,
      maxX:450,
      spawnX:410,
      spawnPoints:[160,410],
      maxAlive:2,
      zoneX:105,
      zoneY:1150,
      zoneW:360,
      zoneH:130,
      wave:['rumbler','drone','webcaster','drone']
    },
    {
      id:'C',
      label:'ENEMY ZONE C',
      triggerY:940,
      platformY:900,
      minX:790,
      maxX:1190,
      spawnX:1150,
      spawnPoints:[830,990,1150],
      maxAlive:3,
      zoneX:775,
      zoneY:790,
      zoneW:440,
      zoneH:130,
      wave:['drone','webcaster','drone','summoner','rumbler']
    }
  ];

  const state = {
    active:false,
    paused:false,
    raf:0,
    last:0,
    ammo:6,
    ammoSlots:Array.from({length:6},()=>({available:true})),
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
    gravityTarget:null,
    gravityJump:null,
    gravityCharges:{
      max:GRAVITY_MAX_CHARGES,
      current:GRAVITY_MAX_CHARGES,
      recharge:GRAVITY_RECHARGE_SECONDS,
      queue:[]
    },
    combatZones:combatZones.map(zone=>({
      ...zone,
      total:zone.wave.length,
      remaining:zone.wave.length,
      spawned:0,
      timer:.6,
      triggered:false,
      cleared:false
    })),
    camera:{ y:Math.max(0,floorY-H+70), targetY:Math.max(0,floorY-H+70) },
    player:{
      x:74, y:floorY-38, w:26, h:38,
      vx:0, vy:0, grounded:true,
      facing:1, invuln:0,
      surface:'floor',
      attachedSolid:null,
      attachedFace:null
    },
    door:{
      id:'final',
      x:1082, y:250, w:74, h:115,
      platformY:doorPlatform.y,
      minX:doorPlatform.x+8,
      maxX:doorPlatform.x+doorPlatform.w-8,
      spawnX:1070,
      spawnPoints:[745,930,1110],
      maxAlive:3,
      total:wave.length,
      remaining:wave.length,
      spawned:0,
      timer:.8,
      active:true,
      coreDropped:false
    }
  };

  const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
  const lerp = (a,b,t) => a+(b-a)*t;
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
      grounded:true, facing:1, invuln:1.0,
      surface:'floor', attachedSolid:null, attachedFace:null
    });
    state.gravityJump=null;

    if(state.camera){
      state.camera.y=Math.max(0,floorY-H+70);
      state.camera.targetY=state.camera.y;
    }

    aim.x=300;
    aim.y=floorY-110;
    aim.dx=1;
    aim.dy=0;
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

  const resetCombatZones = () => {
    state.combatZones=combatZones.map(zone=>({
      ...zone,
      total:zone.wave.length,
      remaining:zone.wave.length,
      spawned:0,
      timer:.6,
      triggered:false,
      cleared:false
    }));
  };

  const allEnemyZonesCleared = () =>
    state.combatZones.every(zone=>zone.cleared) && !state.door.active;

  const resetAmmoSlots = () => {
    for(const slot of state.ammoSlots) slot.available=true;
  };

  const resetGravityCharges = () => {
    state.gravityCharges.current=state.gravityCharges.max;
    state.gravityCharges.queue.length=0;
  };

  const updateGravityCharges = dt => {
    if(state.gravityCharges.queue.length===0) return;

    for(const recharge of state.gravityCharges.queue){
      recharge.remaining=Math.max(0,recharge.remaining-dt);
    }

    for(let i=state.gravityCharges.queue.length-1;i>=0;i--){
      if(state.gravityCharges.queue[i].remaining>0) continue;
      state.gravityCharges.queue.splice(i,1);
      state.gravityCharges.current=Math.min(
        state.gravityCharges.max,
        state.gravityCharges.current+1
      );
    }
  };

  const resetGame = () => {
    state.ammo=6;
    resetAmmoSlots();
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
    state.paused=false;
    state.message='';
    state.messageTimer=0;
    state.gravityTarget=null;
    state.gravityJump=null;
    resetGravityCharges();
    state.camera.y=Math.max(0,floorY-H+70);
    state.camera.targetY=state.camera.y;
    resetDoor();
    resetCombatZones();
    resetPlayer();
    updateHud(.22);
  };

  const enemySpec = type => {
    if(type==='rumbler') return { w:40,h:48,hp:2,speed:52,color:'#9b4347',accent:'#ff8758' };
    if(type==='drone') return { w:34,h:24,hp:1,speed:112,color:'#6b3140',accent:'#ff6f4c' };
    if(type==='webcaster') return { w:34,h:42,hp:1,speed:26,color:'#68405f',accent:'#b98cff' };
    return { w:36,h:50,hp:1,speed:22,color:'#704b39',accent:'#f4d75c' };
  };

  const spawnEnemy = (type, waveEnemy=true, source=null) => {
    const spec=enemySpec(type);
    const flying=type==='drone';
    const encounter=source || state.door;
    const homeY=encounter.platformY ?? doorPlatform.y;
    const minX=encounter.minX ?? doorPlatform.x+8;
    const maxX=encounter.maxX ?? doorPlatform.x+doorPlatform.w-8;

    const points=encounter.spawnPoints?.length
      ? encounter.spawnPoints
      : [encounter.spawnX ?? state.door.x-48];

    const spawnIndex=(encounter.spawned ?? state.enemyId)%points.length;
    const spawnX=points[spawnIndex];

    const enemy={
      id:++state.enemyId,
      type,
      waveEnemy,
      encounterId:waveEnemy ? encounter.id : null,
      x:spawnX,
      y:flying ? homeY-95 : homeY-spec.h,
      w:spec.w,h:spec.h,
      hp:spec.hp,maxHp:spec.hp,
      speed:spec.speed,
      color:spec.color,
      accent:spec.accent,
      flying,
      homeY,
      minX,
      maxX,
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

    if(enemy.waveEnemy && enemy.encounterId){
      if(enemy.encounterId==='final'){
        state.door.remaining=Math.max(0,state.door.remaining-1);

        if(state.door.remaining===0){
          state.door.active=false;
          state.score+=500;
          state.message=state.combatZones.every(zone=>zone.cleared)
            ? 'DOOR CLEARED · REACH END'
            : 'DOOR CLEARED · ENEMY ZONES REMAIN';
          state.messageTimer=2.2;

          if(!state.door.coreDropped){
            state.door.coreDropped=true;
            state.pickups.push({
              type:'core',
              x:state.door.x-46,
              y:doorPlatform.y-28,
              w:20,h:20,
              phase:0
            });
          }
        }
      }else{
        const zone=state.combatZones.find(item=>item.id===enemy.encounterId);
        if(zone){
          zone.remaining=Math.max(0,zone.remaining-1);

          if(zone.remaining===0){
            zone.cleared=true;
            state.score+=250;
          }
        }
      }
    }

    return true;
  };

  const playerHit = () => {
    if(state.player.invuln>0 || state.won || state.gravityJump) return;

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
      resetAmmoSlots();
      state.cores=3;
      resetDoor();
      resetCombatZones();
      resetGravityCharges();
    }

    resetPlayer();
  };

  const updateHud = scale => {
    lifeEls.forEach((life,index)=>{
      const active=index<state.cores;
      life.classList.toggle('is-active',active);
      life.classList.toggle('is-lost',!active);
    });

    ammoPips.forEach((pip,index)=>{
      const slot=state.ammoSlots[index];
      const bullet=state.bullets.find(item=>item.slotIndex===index);
      const available=slot?.available!==false;
      const timer=pip.querySelector('em');

      pip.classList.toggle('is-ready',available);
      pip.classList.toggle('is-cooling',!available);

      if(timer){
        if(available){
          timer.textContent='';
        }else if(bullet){
          const remaining=Math.max(0,bullet.returnAfter-bullet.wait);
          timer.textContent=remaining.toFixed(1)+'s';
        }else{
          timer.textContent='0.0s';
        }
      }
    });

    const slowed=scale<.6;
    stage.classList.toggle('is-time-slow',slowed);
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
    if(!state.active || state.won || state.gravityJump || !state.player.grounded) return;

    const p=state.player;

    if(p.surface==='left' || p.surface==='right'){
      const outward=p.surface==='left' ? -1 : 1;
      p.x+=outward*9;
      p.vx=outward*220;
      p.vy=-300;
      p.grounded=false;
      p.surface='air';
      p.attachedSolid=null;
      p.attachedFace=null;
      state.actionPulse=.22;
      return;
    }

    if(p.surface==='bottom'){
      p.y+=9;
      p.vy=300;
      p.grounded=false;
      p.surface='air';
      p.attachedSolid=null;
      p.attachedFace=null;
      state.actionPulse=.22;
      return;
    }

    p.vy=-450;
    p.grounded=false;
    p.surface='air';
    p.attachedSolid=null;
    p.attachedFace=null;
    state.actionPulse=.18;
  };

  const lineClear = (sx,sy,tx,ty,targetSolid) => {
    const dist=Math.hypot(tx-sx,ty-sy);
    const steps=Math.max(3,Math.ceil(dist/9));

    for(let i=1;i<steps;i++){
      const t=i/steps;
      const x=lerp(sx,tx,t);
      const y=lerp(sy,ty,t);

      for(const solid of getPlayerSolids()){
        const leavingCurrentSurface=
          solid===state.player.attachedSolid &&
          i<=1;

        const touchingDestinationEdge=
          solid===targetSolid &&
          i>=steps-2;

        if(leavingCurrentSurface || touchingDestinationEdge) continue;
        if(circleRect(x,y,4,solid)) return false;
      }
    }

    return true;
  };

  const magneticFacesFor = solid => solid.faces || (solid.kind==='wall' ? ['left','right'] : ['top']);

  const getMagneticCandidate = (solid,face,tx,ty,p) => {
    if(face==='top' || face==='bottom'){
      const cx=clamp(tx,solid.x+p.w*.5,solid.x+solid.w-p.w*.5);

      if(face==='top'){
        return {
          solid,face,
          x:cx-p.w*.5,
          y:solid.y-p.h,
          cx,
          cy:solid.y-p.h*.5
        };
      }

      return {
        solid,face,
        x:cx-p.w*.5,
        y:solid.y+solid.h,
        cx,
        cy:solid.y+solid.h+p.h*.5
      };
    }

    const cy=clamp(ty,solid.y+p.h*.5,solid.y+solid.h-p.h*.5);

    if(face==='left'){
      return {
        solid,face,
        x:solid.x-p.w,
        y:cy-p.h*.5,
        cx:solid.x-p.w*.5,
        cy
      };
    }

    return {
      solid,face,
      x:solid.x+solid.w,
      y:cy-p.h*.5,
      cx:solid.x+solid.w+p.w*.5,
      cy
    };
  };

  const findGravityTarget = (tx,ty) => {
    const p=state.player;
    const sx=p.x+p.w*.5;
    const sy=p.y+p.h*.5;
    const maxRange=500;
    let best=null;

    for(const solid of staticSolids){
      if(!solid.gravity) continue;

      for(const face of magneticFacesFor(solid)){
        const candidate=getMagneticCandidate(solid,face,tx,ty,p);
        const dx=candidate.cx-sx;
        const dy=candidate.cy-sy;
        const dist=Math.hypot(dx,dy);

        if(dist<48 || dist>maxRange) continue;
        if(!lineClear(sx,sy,candidate.cx,candidate.cy,solid)) continue;

        const pointerDistance=Math.hypot(tx-candidate.cx,ty-candidate.cy);
        const sameSurface=p.attachedSolid===solid && p.attachedFace===face;
        const score=pointerDistance + dist*.08 + (sameSurface?55:0);

        if(!best || score<best.score){
          best={...candidate,dist,score};
        }
      }
    }

    return best;
  };

  const gravityJump = () => {
    if(!state.active || state.won || state.gravityJump || !state.player.grounded) return;

    if(state.gravityCharges.current<=0){
      state.message='MAGNETIC CHARGES EMPTY';
      state.messageTimer=.8;
      return;
    }

    const target=findGravityTarget(aim.x,aim.y);
    if(!target){
      state.message='NO VISIBLE MAGNETIC TARGET';
      state.messageTimer=.8;
      return;
    }

    const p=state.player;
    const distance=Math.hypot(target.x-p.x,target.y-p.y);

    state.gravityCharges.current--;
    state.gravityCharges.queue.push({
      remaining:state.gravityCharges.recharge
    });

    state.gravityJump={
      fromX:p.x,
      fromY:p.y,
      toX:target.x,
      toY:target.y,
      t:0,
      duration:clamp(distance/800,.22,.62),
      target
    };

    p.vx=0;
    p.vy=0;
    p.grounded=false;
    p.surface='air';
    p.attachedSolid=null;
    p.attachedFace=null;
    state.actionPulse=.45;
    navigator.vibrate?.(10);
  };

  const fireToward = (tx,ty) => {
    if(!state.active || state.won || state.ammo<=0) return;

    const slotIndex=state.ammoSlots.findIndex(slot=>slot.available);
    if(slotIndex<0) return;

    const p=state.player;
    const sx=p.x+p.w*.54;
    const sy=p.y+p.h*.38;

    let dx=tx-sx;
    let dy=ty-sy;
    const len=Math.hypot(dx,dy);
    if(len<8) return;

    dx/=len;
    dy/=len;

    aim.dx=dx;
    aim.dy=dy;
    p.facing=dx>=0?1:-1;
    state.ammoSlots[slotIndex].available=false;
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
      returnAfter:BULLET_RETURN_SECONDS,
      slotIndex,
      returnHits:new Set()
    });
  };

  const pointerToWorld = event => {
    const rect=canvas.getBoundingClientRect();
    return {
      x:(event.clientX-rect.left)/rect.width*W,
      y:(event.clientY-rect.top)/rect.height*H + state.camera.y
    };
  };

  const updateCamera = (dt, snap=false) => {
    const p=state.player;
    const lookAhead=state.gravityJump ? -70 : (p.vy<0 ? -45 : 0);
    const desired=clamp(
      p.y+p.h*.5-H*.60+lookAhead,
      0,
      Math.max(0,WORLD_H-H)
    );

    state.camera.targetY=desired;

    if(snap){
      state.camera.y=desired;
      return;
    }

    const alpha=1-Math.exp(-dt*5.2);
    const previousY=state.camera.y;
    state.camera.y=lerp(state.camera.y,state.camera.targetY,alpha);

    if(aim.source==='mouse'){
      aim.y+=state.camera.y-previousY;
    }
  };

  const checkPlayerProgress = () => {
    const p=state.player;

    for(let i=state.pickups.length-1;i>=0;i--){
      const pickup=state.pickups[i];

      if(rectHit(p,pickup)){
        state.pickups.splice(i,1);

        if(pickup.type==='core'){
          if(state.cores<3){
            state.cores++;
            state.message='WARP CORE';
          }else{
            state.score+=250;
            state.message='CORE OVERFLOW +250';
          }
          state.messageTimer=1.2;
        }
      }
    }

    if(allEnemyZonesCleared() && rectHit(p,goal)){
      state.won=true;
      state.message='SECTOR COMPLETE';
      state.messageTimer=999;
    }
  };

  const updatePlayer = dt => {
    const p=state.player;
    p.invuln=Math.max(0,p.invuln-dt);

    if(state.gravityJump){
      const g=state.gravityJump;
      g.t=Math.min(1,g.t+dt/g.duration);

      p.x=lerp(g.fromX,g.toX,g.t);
      p.y=lerp(g.fromY,g.toY,g.t);

      if(g.t>=1){
        p.x=g.toX;
        p.y=g.toY;
        p.vx=0;
        p.vy=0;
        p.grounded=true;
        p.surface=g.target.face==='top' ? 'floor' : g.target.face;
        p.attachedSolid=g.target.solid;
        p.attachedFace=g.target.face;
        state.gravityJump=null;
        checkPlayerProgress();
      }
      return;
    }

    if((p.surface==='left' || p.surface==='right') && p.attachedSolid){
      const solid=p.attachedSolid;
      const keyboardY=(input.down?1:0)-(input.up?1:0);
      const keyboardX=(input.right?1:0)-(input.left?1:0);
      const analogY=Math.abs(input.moveY)>.06 ? input.moveY : keyboardY;
      const analogX=Math.abs(input.moveX)>.06 ? input.moveX : keyboardX;
      const tangent=Math.abs(analogY)>.08 ? analogY : -analogX;

      p.vx=0;
      p.vy=0;
      p.grounded=true;
      p.x=p.surface==='left' ? solid.x-p.w : solid.x+solid.w;

      if(Math.abs(tangent)>.06){
        p.y+=tangent*205*dt;
        state.actionPulse=.10;
      }

      p.y=clamp(p.y,solid.y,solid.y+solid.h-p.h);
      checkPlayerProgress();
      return;
    }

    if(p.surface==='bottom' && p.attachedSolid){
      const solid=p.attachedSolid;
      const keyboardAxis=(input.right?1:0)-(input.left?1:0);
      const axis=Math.abs(input.moveX)>.06 ? input.moveX : keyboardAxis;

      p.vx=0;
      p.vy=0;
      p.grounded=true;
      p.y=solid.y+solid.h;

      if(Math.abs(axis)>.06){
        p.x+=axis*215*dt;
        p.facing=axis>=0?1:-1;
        state.actionPulse=.10;
      }

      p.x=clamp(p.x,solid.x,solid.x+solid.w-p.w);
      checkPlayerProgress();
      return;
    }

    const keyboardAxis=(input.right?1:0)-(input.left?1:0);
    const axis=Math.abs(input.moveX)>.06 ? input.moveX : keyboardAxis;
    const targetVx=axis*235;
    const moveAlpha=1-Math.exp(-dt*16);
    p.vx=lerp(p.vx,targetVx,moveAlpha);

    if(Math.abs(axis)>.06){
      p.facing=axis>=0?1:-1;
      state.actionPulse=.10;
    }

    resolvePlayerX(p.vx*dt);

    p.vy+=920*dt;
    p.vy=Math.min(p.vy,640);
    resolvePlayerY(p.vy*dt);

    p.x=clamp(p.x,4,W-p.w-4);

    if(p.grounded){
      p.surface='floor';
      p.attachedSolid=null;
      p.attachedFace=null;
    }else{
      p.surface='air';
    }

    if(p.y>WORLD_H+80) playerHit();

    checkPlayerProgress();
  };

  const stopBullet = b => {
    b.mode='stuck';
    b.dx=0;
    b.dy=0;
  };

  const updateOutgoingBullet = (b,dt,scale) => {
    const travel=b.speed*dt*scale;
    const steps=Math.max(1,Math.ceil(travel/7));
    const step=travel/steps;

    for(let s=0;s<steps;s++){
      b.px=b.x;
      b.py=b.y;

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
        b.x=nx;
        b.y=ny;
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

      if(hitSurface || nx<b.r || nx>W-b.r || ny<b.r || ny>WORLD_H-b.r){
        b.x=clamp(nx,b.r,W-b.r);
        b.y=clamp(ny,b.r,WORLD_H-b.r);
        stopBullet(b);
        return;
      }

      b.x=nx;
      b.y=ny;
    }
  };

  const updateBullets = (dt,scale) => {
    const p=state.player;

    for(let i=state.bullets.length-1;i>=0;i--){
      const b=state.bullets[i];

      if(b.mode!=='return'){
        b.wait+=dt*scale;
        if(b.wait>=b.returnAfter) b.mode='return';
      }

      if(b.mode==='out'){
        updateOutgoingBullet(b,dt,scale);
      }else if(b.mode==='stuck'){
        // The bullet remains embedded until its individual return timer expires.
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
          if(Number.isInteger(b.slotIndex) && state.ammoSlots[b.slotIndex]){
            state.ammoSlots[b.slotIndex].available=true;
          }
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

    dx/=len;
    dy/=len;

    state.enemyShots.push({
      x:sx,y:sy,dx,dy,speed,r:5,
      color:enemy.type==='webcaster'?'#b98cff':'#f4d75c'
    });
  };

  const updateCombatZones = (dt,scale) => {
    for(const zone of state.combatZones){
      if(zone.cleared) continue;

      if(!zone.triggered && state.player.y<=zone.triggerY){
        zone.triggered=true;
        zone.timer=.35;
      }

      if(!zone.triggered || zone.spawned>=zone.total) continue;

      zone.timer-=dt*scale;
      const alive=state.enemies.filter(enemy=>
        enemy.waveEnemy && enemy.encounterId===zone.id
      ).length;

      if(zone.timer<=0 && alive<(zone.maxAlive||2)){
        const type=zone.wave[zone.spawned];
        spawnEnemy(type,true,zone);
        zone.spawned++;
        zone.timer=1.15;
      }
    }
  };

  const updateDoor = (dt,scale) => {
    const d=state.door;
    if(!d.active || d.spawned>=d.total) return;
    if(state.player.y>650) return;
    if(state.combatZones.some(zone=>!zone.cleared)) return;

    d.timer-=dt*scale;
    const aliveWave=state.enemies.filter(enemy=>
      enemy.waveEnemy && enemy.encounterId==='final'
    ).length;

    if(d.timer<=0 && aliveWave<(d.maxAlive||3)){
      const type=wave[d.spawned];
      spawnEnemy(type,true,d);
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
        enemy.x=Math.max(enemy.minX,enemy.x-enemy.speed*dt*scale);
        enemy.y=enemy.homeY-enemy.h;
        enemy.attack-=dt*scale;

        if(enemy.attack<=0){
          shootEnemyProjectile(enemy,205);
          enemy.attack=2.0;
        }
      }else if(enemy.type==='summoner'){
        enemy.x=Math.max(enemy.minX+20,enemy.x-enemy.speed*dt*scale);
        enemy.y=enemy.homeY-enemy.h;
        enemy.attack-=dt*scale;
        enemy.summon-=dt*scale;

        if(enemy.attack<=0){
          shootEnemyProjectile(enemy,180);
          enemy.attack=2.5;
        }

        if(enemy.summon<=0 && state.enemies.filter(e=>!e.waveEnemy).length<3){
          const source={
            id:enemy.encounterId || 'summon',
            platformY:enemy.homeY,
            minX:enemy.minX,
            maxX:enemy.maxX,
            spawnX:enemy.x
          };
          const summoned=spawnEnemy('drone',false,source);
          summoned.x=enemy.x-20;
          summoned.y=enemy.y-45;
          enemy.summon=3.8;
        }
      }else{
        const direction=p.x<enemy.x?-1:1;
        enemy.x+=direction*enemy.speed*dt*scale;
        enemy.x=clamp(enemy.x,enemy.minX,enemy.maxX-enemy.w);
        enemy.y=enemy.homeY-enemy.h;
      }

      if(rectHit(p,enemy)) playerHit();
    }

    for(let i=state.enemyShots.length-1;i>=0;i--){
      const shot=state.enemyShots[i];
      const move=shot.speed*dt*scale;

      shot.x+=shot.dx*move;
      shot.y+=shot.dy*move;

      let remove=shot.x<0||shot.x>W||shot.y<0||shot.y>WORLD_H;

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
    const cam=state.camera.y;
    const climb=1-clamp(cam/Math.max(1,WORLD_H-H),0,1);

    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,climb>.68?'#101b32':'#111a30');
    g.addColorStop(.58,'#0c1427');
    g.addColorStop(1,'#070e1b');
    ctx.fillStyle=g;
    ctx.fillRect(0,0,W,H);

    const glowY=110+climb*80;
    const glow=ctx.createRadialGradient(1080,glowY,10,1080,glowY,470);
    glow.addColorStop(0,'rgba(241,132,70,.18)');
    glow.addColorStop(1,'rgba(241,132,70,0)');
    ctx.fillStyle=glow;
    ctx.fillRect(620,0,660,520);

    const farOffset=(cam*.10)%210;
    for(let i=0;i<18;i++){
      const x=i*82-30;
      const towerH=210+(i%5)*56;
      const base=H+70-farOffset;
      ctx.fillStyle=i%2?'#10182a':'#0c1424';
      ctx.fillRect(x,base-towerH,62,towerH+80);

      ctx.fillStyle='rgba(244,151,77,.09)';
      for(let y=base-towerH+26;y<base-24;y+=38){
        if((i+Math.round(y))%4!==0) ctx.fillRect(x+13,y,5,14);
      }
    }

    // Interior shaft silhouettes move more slowly than gameplay geometry.
    const shaftOffset=(cam*.22)%260;
    ctx.fillStyle='rgba(28,39,65,.52)';
    for(let y=-260+shaftOffset;y<H+260;y+=260){
      ctx.fillRect(78,y,16,170);
      ctx.fillRect(W-98,y+68,16,170);
      ctx.fillRect(95,y+28,W-190,6);
    }

    ctx.strokeStyle='rgba(114,213,233,.055)';
    ctx.lineWidth=1;

    for(let x=0;x<W;x+=40){
      ctx.beginPath();
      ctx.moveTo(x,0);
      ctx.lineTo(x,H);
      ctx.stroke();
    }

    const gridOffset=-(cam*.18)%40;
    for(let y=gridOffset-40;y<H+40;y+=40){
      ctx.beginPath();
      ctx.moveTo(0,y);
      ctx.lineTo(W,y);
      ctx.stroke();
    }
  };

  const drawSolids = () => {
    for(const solid of staticSolids){
      const raised=solid===doorPlatform;
      const wall=solid.kind==='wall';
      const zoneBlock=solid.kind==='block';

      const g=ctx.createLinearGradient(solid.x,solid.y,solid.x,solid.y+Math.max(solid.h,24));
      g.addColorStop(0,raised?'#303b57':zoneBlock?'#1c2740':wall?'#2a334b':'#27324b');
      g.addColorStop(1,solid.kind==='floor'?'#111a2d':zoneBlock?'#111a2d':'#172139');
      ctx.fillStyle=g;
      ctx.fillRect(solid.x,solid.y,solid.w,solid.h);

      ctx.save();
      ctx.globalAlpha=.86;
      ctx.fillStyle=raised?'#ff8758':'#72d5e9';

      if(wall){
        ctx.fillRect(solid.x,solid.y,2,solid.h);
        ctx.fillRect(solid.x+solid.w-2,solid.y,2,solid.h);

        for(let y=solid.y+12;y<solid.y+solid.h-8;y+=24){
          ctx.fillStyle='rgba(114,213,233,.20)';
          ctx.fillRect(solid.x+5,y,solid.w-10,3);
        }
      }else if(zoneBlock){
        // Massive architectural blocks define tunnel edges but keep the playable lane open.
        ctx.fillRect(solid.x,solid.y,solid.w,3);

        if(solid.faces?.includes('left')) ctx.fillRect(solid.x,solid.y,3,solid.h);
        if(solid.faces?.includes('right')) ctx.fillRect(solid.x+solid.w-3,solid.y,3,solid.h);

        for(let y=solid.y+18;y<solid.y+solid.h-10;y+=32){
          ctx.fillStyle='rgba(114,213,233,.075)';
          ctx.fillRect(solid.x+10,y,Math.max(0,solid.w-20),2);
        }

        ctx.fillStyle='rgba(255,255,255,.035)';
        for(let x=solid.x+16;x<solid.x+solid.w-12;x+=38){
          ctx.fillRect(x,solid.y+10,14,Math.max(0,solid.h-20));
        }
      }else{
        ctx.fillRect(solid.x,solid.y,solid.w,2);
        if(solid.kind==='platform'){
          ctx.fillStyle='rgba(114,213,233,.36)';
          ctx.fillRect(solid.x,solid.y+solid.h-2,solid.w,2);
        }

        for(let x=solid.x+14;x<solid.x+solid.w-10;x+=30){
          ctx.fillStyle=raised?'rgba(255,135,88,.18)':'rgba(114,213,233,.14)';
          ctx.fillRect(x,solid.y+6,14,3);
        }
      }
      ctx.restore();
    }

    // Decorative structural ribs divide the vertical climb into readable floors.
    ctx.save();
    ctx.fillStyle='rgba(20,29,51,.88)';
    for(const section of levelSections){
      const y=section.y+58;
      ctx.fillRect(24,y,W-48,4);
      ctx.fillRect(48,y-54,8,58);
      ctx.fillRect(W-56,y-54,8,58);
    }
    ctx.restore();
  };

  const drawLevelSections = () => {
    ctx.save();

    for(const section of levelSections){
      const y=section.y;

      ctx.fillStyle='rgba(114,213,233,.035)';
      ctx.fillRect(28,y-3,W-56,6);

      ctx.strokeStyle='rgba(114,213,233,.07)';
      ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(46,y);
      ctx.lineTo(W-46,y);
      ctx.stroke();

      ctx.fillStyle='rgba(114,213,233,.14)';
      ctx.fillRect(46,y-9,3,18);
      ctx.fillRect(W-49,y-9,3,18);
    }

    ctx.restore();
  };

  const drawStartZone = () => {
    const cx=startZone.x+startZone.w*.5;

    ctx.save();
    ctx.fillStyle='rgba(114,213,233,.055)';
    ctx.fillRect(startZone.x,startZone.y,startZone.w,startZone.h);

    ctx.strokeStyle='rgba(114,213,233,.28)';
    ctx.setLineDash([7,6]);
    ctx.strokeRect(startZone.x+.5,startZone.y+.5,startZone.w-1,startZone.h-1);
    ctx.setLineDash([]);

    ctx.fillStyle='rgba(114,213,233,.82)';
    ctx.font='700 10px monospace';
    ctx.textAlign='center';
    ctx.fillText('START',cx,startZone.y+18);

    ctx.fillStyle='rgba(255,255,255,.28)';
    ctx.font='700 8px monospace';
    ctx.fillText('ENTRY POINT',cx,startZone.y+34);

    ctx.beginPath();
    ctx.moveTo(cx-9,startZone.y+52);
    ctx.lineTo(cx,startZone.y+43);
    ctx.lineTo(cx+9,startZone.y+52);
    ctx.strokeStyle='rgba(114,213,233,.52)';
    ctx.stroke();

    ctx.textAlign='left';
    ctx.restore();
  };

  const drawCombatZones = () => {
    ctx.save();

    for(const zone of state.combatZones){
      const triggered=zone.triggered;
      const cleared=zone.cleared;
      const pulse=.06+Math.sin(performance.now()*.004+zone.id.charCodeAt(0))*.015;

      ctx.fillStyle=cleared
        ? 'rgba(114,213,233,.018)'
        : triggered
          ? 'rgba(255,123,88,'+Math.max(.025,pulse)+')'
          : 'rgba(255,255,255,.008)';
      ctx.fillRect(zone.zoneX,zone.zoneY,zone.zoneW,zone.zoneH);

      ctx.strokeStyle=cleared
        ? 'rgba(114,213,233,.16)'
        : triggered
          ? 'rgba(255,123,88,.24)'
          : 'rgba(255,255,255,.045)';
      ctx.lineWidth=1;
      ctx.strokeRect(zone.zoneX+.5,zone.zoneY+.5,zone.zoneW-1,zone.zoneH-1);
    }

    ctx.restore();
  };

  const drawEnemySpawners = () => {
    ctx.save();

    const drawPad = (x,y,status,label) => {
      const active=status==='active';
      const cleared=status==='cleared';
      const locked=status==='locked';

      ctx.fillStyle='#101827';
      ctx.fillRect(x-14,y-31,28,31);

      ctx.fillStyle=cleared
        ? 'rgba(114,213,233,.72)'
        : active
          ? 'rgba(255,123,88,.88)'
          : locked
            ? 'rgba(255,255,255,.10)'
            : 'rgba(255,123,88,.30)';
      ctx.fillRect(x-10,y-27,20,3);

      ctx.strokeStyle=cleared
        ? 'rgba(114,213,233,.40)'
        : active
          ? 'rgba(255,123,88,.52)'
          : 'rgba(255,255,255,.12)';
      ctx.strokeRect(x-13.5,y-30.5,27,30);

      ctx.fillStyle='rgba(255,255,255,.18)';
      ctx.fillRect(x-6,y-21,12,13);

      if(active){
        const pulse=5+Math.sin(performance.now()*.009+x)*2;
        ctx.beginPath();
        ctx.arc(x,y-27,pulse,0,Math.PI*2);
        ctx.strokeStyle='rgba(255,123,88,.25)';
        ctx.stroke();
      }

      if(label){
        ctx.fillStyle=cleared?'rgba(114,213,233,.45)':'rgba(255,255,255,.24)';
        ctx.font='700 6px monospace';
        ctx.textAlign='center';
        ctx.fillText(label,x,y-36);
        ctx.textAlign='left';
      }
    };

    for(const zone of state.combatZones){
      const status=zone.cleared ? 'cleared' : zone.triggered ? 'active' : 'idle';
      zone.spawnPoints?.forEach((x,index)=>{
        drawPad(x,zone.platformY,status,null);
      });
    }

    const finalUnlocked=state.combatZones.every(zone=>zone.cleared);
    const finalStatus=!finalUnlocked
      ? 'locked'
      : state.door.active
        ? 'active'
        : 'cleared';

    state.door.spawnPoints?.forEach((x,index)=>{
      drawPad(x,state.door.platformY,finalStatus,null);
    });

    ctx.restore();
  };

  const drawGoal = () => {
    const active=allEnemyZonesCleared();
    const cx=goal.x+goal.w*.5;
    const base=goal.y+goal.h;

    ctx.save();

    ctx.fillStyle=active?'rgba(114,213,233,.10)':'rgba(255,123,88,.06)';
    ctx.fillRect(goal.x,goal.y,goal.w,goal.h);

    ctx.strokeStyle=active?'rgba(114,213,233,.72)':'rgba(255,123,88,.32)';
    ctx.lineWidth=2;
    ctx.strokeRect(goal.x+.5,goal.y+.5,goal.w-1,goal.h-1);

    ctx.beginPath();
    ctx.arc(cx,goal.y+22,active?12:8,0,Math.PI*2);
    ctx.strokeStyle=active?'#72d5e9':'rgba(255,123,88,.55)';
    ctx.stroke();

    if(active){
      const pulse=8+Math.sin(performance.now()*.006)*3;
      ctx.beginPath();
      ctx.arc(cx,goal.y+22,17+pulse,0,Math.PI*2);
      ctx.strokeStyle='rgba(114,213,233,.16)';
      ctx.stroke();

      ctx.fillStyle='#72d5e9';
      ctx.font='700 10px monospace';
      ctx.textAlign='center';
      ctx.fillText('END',cx,goal.y-11);

      ctx.fillStyle='rgba(255,255,255,.35)';
      ctx.font='700 8px monospace';
      ctx.fillText('SECTOR EXIT',cx,goal.y+50);
    }else{
      ctx.fillStyle='rgba(255,154,114,.58)';
      ctx.font='700 9px monospace';
      ctx.textAlign='center';
      ctx.fillText('END LOCKED',cx,goal.y-11);
    }

    ctx.fillStyle=active?'rgba(114,213,233,.30)':'rgba(255,123,88,.16)';
    ctx.fillRect(goal.x-8,base-3,goal.w+16,3);

    ctx.textAlign='left';
    ctx.restore();
  };

  const drawDoorIcon = (type,cx,cy) => {
    ctx.save();
    ctx.translate(cx,cy);
    ctx.strokeStyle='#72d5e9';
    ctx.fillStyle='#72d5e9';
    ctx.lineWidth=2;

    if(type==='drone'){
      ctx.beginPath();
      ctx.arc(0,0,7,0,Math.PI*2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-13,0);ctx.lineTo(-7,0);
      ctx.moveTo(7,0);ctx.lineTo(13,0);
      ctx.stroke();
    }else if(type==='webcaster'){
      ctx.strokeRect(-7,-6,14,12);
      for(const sx of [-1,1]){
        ctx.beginPath();
        ctx.moveTo(sx*6,3);ctx.lineTo(sx*13,9);
        ctx.moveTo(sx*6,-2);ctx.lineTo(sx*13,-8);
        ctx.stroke();
      }
    }else if(type==='summoner'){
      ctx.strokeRect(-6,-9,12,18);
      ctx.beginPath();
      ctx.arc(0,-13,4,0,Math.PI*2);
      ctx.stroke();
    }else{
      ctx.strokeRect(-9,-8,18,16);
      ctx.fillRect(-12,5,5,5);
      ctx.fillRect(7,5,5,5);
    }

    ctx.restore();
  };

  const drawDoor = () => {
    const d=state.door;

    ctx.fillStyle='#27324d';
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

  const drawGravityPreview = () => {
    if(state.won) return;

    const p=state.player;
    const target=state.gravityJump
      ? state.gravityJump.target
      : (p.grounded ? findGravityTarget(aim.x,aim.y) : null);

    state.gravityTarget=target;
    if(!target) return;

    const hasCharge=state.gravityCharges.current>0 || !!state.gravityJump;
    const pulse=2+Math.sin(performance.now()*.009)*2;

    ctx.save();

    ctx.beginPath();
    ctx.arc(target.cx,target.cy,10+pulse,0,Math.PI*2);
    ctx.strokeStyle=hasCharge
      ? 'rgba(114,213,233,.88)'
      : 'rgba(255,255,255,.20)';
    ctx.lineWidth=2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(target.cx,target.cy,3.5,0,Math.PI*2);
    ctx.fillStyle=hasCharge?'#72d5e9':'rgba(255,255,255,.28)';
    ctx.fill();

    ctx.strokeStyle=hasCharge
      ? 'rgba(114,213,233,.52)'
      : 'rgba(255,255,255,.16)';
    ctx.lineWidth=2;
    ctx.beginPath();

    if(target.face==='left' || target.face==='right'){
      ctx.moveTo(target.cx,target.cy-14);
      ctx.lineTo(target.cx,target.cy+14);
    }else{
      ctx.moveTo(target.cx-14,target.cy);
      ctx.lineTo(target.cx+14,target.cy);
    }
    ctx.stroke();

    ctx.restore();
  };

  const drawPlayer = () => {
    const p=state.player;
    const cx=p.x+p.w*.5;
    const cy=p.y+p.h*.5;
    const angle=p.surface==='left'
      ? -Math.PI*.5
      : p.surface==='right'
        ? Math.PI*.5
        : p.surface==='bottom'
          ? Math.PI
          : 0;

    ctx.save();
    if(p.invuln>0 && Math.floor(p.invuln*12)%2===0) ctx.globalAlpha=.35;

    ctx.translate(cx,cy);
    ctx.rotate(angle);

    ctx.fillStyle='#e9edf5';
    ctx.fillRect(-p.w*.5,-p.h*.5,p.w,p.h);

    ctx.fillStyle='#111827';
    ctx.fillRect(-p.w*.5+4,-p.h*.5+8,p.w-8,9);

    ctx.fillStyle='#5ea0f0';
    ctx.fillRect(-p.w*.5+5,p.h*.5-5,p.w-10,3);

    if(p.surface==='left' || p.surface==='right' || p.surface==='bottom'){
      ctx.fillStyle='rgba(114,213,233,.72)';
      ctx.fillRect(-p.w*.5+4,p.h*.5-2,p.w-8,2);
    }

    ctx.restore();

    const dx=aim.x-cx;
    const dy=aim.y-cy;
    const len=Math.hypot(dx,dy)||1;
    const ax=dx/len;
    const ay=dy/len;

    ctx.strokeStyle='#f4d75c';
    ctx.lineWidth=4;
    ctx.beginPath();
    ctx.moveTo(cx,cy-3);
    ctx.lineTo(cx+ax*16,cy-3+ay*16);
    ctx.stroke();
  };


  const drawGravityChargesUnderPlayer = () => {
    const p=state.player;
    const cx=p.x+p.w*.5;
    const y=p.y+p.h+13;
    const size=7;
    const gap=5;
    const total=state.gravityCharges.max*size+(state.gravityCharges.max-1)*gap;
    const startX=cx-total*.5;

    ctx.save();

    for(let index=0;index<state.gravityCharges.max;index++){
      const x=startX+index*(size+gap);
      const active=index<state.gravityCharges.current;
      const rechargeIndex=index-state.gravityCharges.current;
      const recharge=!active && rechargeIndex>=0
        ? state.gravityCharges.queue[rechargeIndex]
        : null;
      const progress=recharge
        ? clamp(1-recharge.remaining/state.gravityCharges.recharge,0,1)
        : 0;

      ctx.save();
      ctx.translate(x+size*.5,y+size*.5);
      ctx.rotate(Math.PI*.25);

      ctx.strokeStyle=active
        ? 'rgba(159,234,248,.92)'
        : 'rgba(159,234,248,.30)';
      ctx.lineWidth=1.25;
      ctx.strokeRect(-size*.5,-size*.5,size,size);

      if(active || progress>0){
        const fill=size*(active?1:progress);
        ctx.beginPath();
        ctx.rect(-size*.5,size*.5-fill,size,fill);
        ctx.clip();
        ctx.fillStyle=active
          ? 'rgba(114,213,233,.90)'
          : 'rgba(114,213,233,.55)';
        ctx.fillRect(-size*.5,-size*.5,size,size);
      }

      ctx.restore();
    }

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
        ctx.beginPath();
        ctx.moveTo(b.px,b.py);
        ctx.lineTo(b.x,b.y);
        ctx.stroke();
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

    ctx.save();
    ctx.translate(0,-state.camera.y);
    drawLevelSections();
    drawSolids();
    drawStartZone();
    drawCombatZones();
    drawEnemySpawners();
    drawDoor();
    drawGoal();
    drawPickups();
    drawEnemies();
    drawEnemyShots();
    drawBullets();
    drawGravityPreview();
    drawPlayer();
    drawGravityChargesUnderPlayer();
    drawCrosshair();
    ctx.restore();

    drawOverlay(scale);
  };

  const frame = now => {
    if(!state.active) return;

    const dt=Math.min(.033,(now-state.last)/1000 || .016);
    state.last=now;

    if(state.paused){
      render(.22);
      state.raf=requestAnimationFrame(frame);
      return;
    }

    state.actionPulse=Math.max(0,state.actionPulse-dt);
    state.flash=Math.max(0,state.flash-dt);
    state.messageTimer=Math.max(0,state.messageTimer-dt);

    const moving=input.left||input.right||input.up||input.down||Math.abs(input.moveX)>.06||Math.abs(input.moveY)>.06||!state.player.grounded||state.actionPulse>0||!!state.gravityJump;
    const scale=state.won?0:(moving?1:.22);

    if(!state.won){
      updateGravityCharges(dt);
      updatePlayer(dt);
      updateCombatZones(dt,scale);
      updateDoor(dt,scale);
      updateEnemies(dt,scale);
      updateBullets(dt,scale);
    }

    updateCamera(dt);
    updateHud(scale);
    render(scale);
    state.raf=requestAnimationFrame(frame);
  };

  const isTouchDevice = () =>
    window.matchMedia('(pointer: coarse)').matches ||
    navigator.maxTouchPoints > 0;

  const enterMobileLandscape = async () => {
    if(!isTouchDevice()) return;

    try{
      if(!document.fullscreenElement && stage.requestFullscreen){
        await stage.requestFullscreen({ navigationUI:'hide' });
      }
    }catch(_){}

    try{
      if(screen.orientation?.lock){
        await screen.orientation.lock('landscape');
      }
    }catch(_){}

    stage.classList.toggle('is-mobile-game',true);
  };

  const leaveMobileLandscape = async () => {
    try{ screen.orientation?.unlock?.(); }catch(_){}
    try{
      if(document.fullscreenElement && document.exitFullscreen){
        await document.exitFullscreen();
      }
    }catch(_){}
    stage.classList.remove('is-mobile-game');
  };

  const setPaused = value => {
    if(!state.active) return;
    state.paused=!!value;
    input.left=false;
    input.right=false;
    input.up=false;
    input.down=false;
    input.moveX=0;
    input.moveY=0;
    if(pausePanel) pausePanel.hidden=!state.paused;
    stage.classList.toggle('is-paused',state.paused);
  };

  const startGame = async () => {
    if(state.active) return;

    state.active=true;
    stage.hidden=false;
    document.body.classList.add('ms-game-active');
    input.left=false;
    input.right=false;
    input.up=false;
    input.down=false;
    input.moveX=0;
    input.moveY=0;
    resetGame();

    await enterMobileLandscape();

    state.last=performance.now();
    cancelAnimationFrame(state.raf);
    state.raf=requestAnimationFrame(frame);
  };

  const stopGame = async () => {
    if(!state.active) return;

    state.active=false;
    state.paused=false;
    cancelAnimationFrame(state.raf);
    input.left=false;
    input.right=false;
    input.up=false;
    input.down=false;
    input.moveX=0;
    input.moveY=0;
    stage.hidden=true;
    pausePanel && (pausePanel.hidden=true);
    document.body.classList.remove('ms-game-active');
    await leaveMobileLandscape();
  };

  const onKeyDown = event => {
    if(!state.active) return;

    if(state.paused && event.key!=='Escape'){
      if((event.key==='p'||event.key==='P')&&!event.repeat) setPaused(false);
      return;
    }

    if(['ArrowLeft','ArrowRight','ArrowUp',' ','Spacebar'].includes(event.key)){
      event.preventDefault();
    }

    if(event.key==='Escape'){
      stopGame();
      return;
    }

    if((event.key==='p'||event.key==='P')&&!event.repeat){
      setPaused(!state.paused);
      return;
    }

    if(state.won && (event.key==='r'||event.key==='R')){
      resetGame();
      return;
    }

    if(event.key==='a'||event.key==='A'||event.key==='ArrowLeft') input.left=true;
    if(event.key==='d'||event.key==='D'||event.key==='ArrowRight') input.right=true;
    if(event.key==='w'||event.key==='W'||event.key==='ArrowUp') input.up=true;
    if(event.key==='s'||event.key==='S'||event.key==='ArrowDown') input.down=true;

    if((event.key===' '||event.key==='Spacebar')&&!event.repeat){
      jump();
    }

    if((event.key==='g'||event.key==='G'||event.key==='Shift')&&!event.repeat){
      gravityJump();
    }
  };

  const onKeyUp = event => {
    if(event.key==='a'||event.key==='A'||event.key==='ArrowLeft') input.left=false;
    if(event.key==='d'||event.key==='D'||event.key==='ArrowRight') input.right=false;
    if(event.key==='w'||event.key==='W'||event.key==='ArrowUp') input.up=false;
    if(event.key==='s'||event.key==='S'||event.key==='ArrowDown') input.down=false;
  };

  canvas.addEventListener('pointermove',event=>{
    if(!state.active || state.paused || event.pointerType==='touch') return;

    const p=pointerToWorld(event);
    aim.x=p.x;
    aim.y=p.y;
    aim.active=true;
    aim.source='mouse';

    const pcx=state.player.x+state.player.w*.5;
    const pcy=state.player.y+state.player.h*.5;
    const dx=aim.x-pcx;
    const dy=aim.y-pcy;
    const len=Math.hypot(dx,dy)||1;
    aim.dx=dx/len;
    aim.dy=dy/len;
  });

  canvas.addEventListener('pointerdown',event=>{
    if(!state.active || state.paused) return;

    if(event.pointerType==='touch') return;

    event.preventDefault();
    const p=pointerToWorld(event);
    aim.x=p.x;
    aim.y=p.y;

    if(event.button===0){
      fireToward(p.x,p.y);
    }else if(event.button===2){
      gravityJump();
    }
  });

  canvas.addEventListener('contextmenu',event=>event.preventDefault());

  document.addEventListener('keydown',onKeyDown);
  document.addEventListener('keyup',onKeyUp);

  exitButton?.addEventListener('pointerdown',event=>{
    event.preventDefault();
    stopGame();
  });

  pauseButton?.addEventListener('pointerdown',event=>{
    event.preventDefault();
    setPaused(!state.paused);
  });

  resumeButton?.addEventListener('pointerdown',event=>{
    event.preventDefault();
    setPaused(false);
  });

  let jumpHoldTimer=0;
  let jumpHeldAt=0;
  let jumpHoldPointer=null;
  let suppressAimReleaseUntil=0;

  const clearJumpHold = () => {
    window.clearTimeout(jumpHoldTimer);
    jumpHoldTimer=0;
    jumpButton?.classList.remove('is-charging');
  };

  jumpButton?.addEventListener('pointerdown',event=>{
    if(!state.active || state.paused) return;
    event.preventDefault();

    jumpHoldPointer=event.pointerId;
    jumpHeldAt=performance.now();
    suppressAimReleaseUntil=Infinity;
    jumpButton.setPointerCapture?.(event.pointerId);
    jumpButton.classList.add('is-charging');

    jumpHoldTimer=window.setTimeout(()=>{
      jumpButton.classList.add('is-ready');
    },320);
  });

  const releaseJump = event => {
    if(jumpHoldPointer!==event.pointerId) return;
    event.preventDefault();

    const held=performance.now()-jumpHeldAt;
    jumpHoldPointer=null;
    suppressAimReleaseUntil=performance.now()+180;
    clearJumpHold();
    jumpButton?.classList.remove('is-ready');

    suppressAimReleaseUntil=performance.now()+220;

    if(held>=320) gravityJump();
    else jump();
  };

  jumpButton?.addEventListener('pointerup',releaseJump);
  jumpButton?.addEventListener('pointercancel',event=>{
    if(jumpHoldPointer!==event.pointerId) return;
    jumpHoldPointer=null;
    clearJumpHold();
    jumpButton?.classList.remove('is-ready');
  });

  fireButton?.addEventListener('pointerdown',event=>{
    if(state.paused) return;
    event.preventDefault();
    fireToward(aim.x,aim.y);
    navigator.vibrate?.(8);
  });

  const applyStickDeadzone = (x,y,dead=.14) => {
    const mag=Math.hypot(x,y);
    if(mag<=dead) return {x:0,y:0,mag:0};

    const scaled=clamp((mag-dead)/(1-dead),0,1);
    const nx=x/(mag||1);
    const ny=y/(mag||1);
    return {x:nx*scaled,y:ny*scaled,mag:scaled};
  };

  const setupStick = (element,knob,onMove,onEnd) => {
    if(!element || !knob) return;

    let pointerId=null;
    let last={x:0,y:0,mag:0};

    const update = event => {
      const rect=element.getBoundingClientRect();
      const cx=rect.left+rect.width*.5;
      const cy=rect.top+rect.height*.5;
      let dx=event.clientX-cx;
      let dy=event.clientY-cy;
      const max=rect.width*.39;
      const len=Math.hypot(dx,dy);

      if(len>max){
        dx=dx/len*max;
        dy=dy/len*max;
      }

      knob.style.transform=`translate(${dx}px,${dy}px)`;

      const rawX=dx/max;
      const rawY=dy/max;
      last=applyStickDeadzone(rawX,rawY);
      onMove(last.x,last.y,last.mag);
    };

    element.addEventListener('pointerdown',event=>{
      if(state.paused) return;
      event.preventDefault();
      pointerId=event.pointerId;
      element.setPointerCapture?.(pointerId);
      update(event);
    });

    element.addEventListener('pointermove',event=>{
      if(pointerId!==event.pointerId) return;
      event.preventDefault();
      update(event);
    });

    const end = event => {
      if(pointerId!==event.pointerId) return;
      pointerId=null;
      knob.style.transform='translate(0px,0px)';
      onEnd(last.x,last.y,last.mag);
      last={x:0,y:0,mag:0};
    };

    element.addEventListener('pointerup',end);
    element.addEventListener('pointercancel',end);
  };

  setupStick(
    moveStick,
    moveKnob,
    (x,y)=>{
      input.moveX=x;
      input.moveY=y;
    },
    ()=>{
      input.moveX=0;
      input.moveY=0;
    }
  );

  setupStick(
    aimStick,
    aimKnob,
    (x,y,mag)=>{
      if(mag<.05) return;

      const len=Math.hypot(x,y)||1;
      aim.dx=x/len;
      aim.dy=y/len;

      const pcx=state.player.x+state.player.w*.5;
      const pcy=state.player.y+state.player.h*.5;
      const reach=360+mag*110;
      aim.x=pcx+aim.dx*reach;
      aim.y=pcy+aim.dy*reach;
      aim.active=true;
      aim.source='stick';
      aimStick?.classList.toggle('is-armed',mag>.28);
    },
    (_x,_y,mag)=>{
      aimStick?.classList.remove('is-armed');

      // One-thumb shooting: drag the aim stick, then release to fire.
      if(
        mag>.28 &&
        jumpHoldPointer===null &&
        performance.now()>=suppressAimReleaseUntil &&
        !state.paused
      ){
        fireToward(aim.x,aim.y);
        navigator.vibrate?.(8);
      }
    }
  );

  let pressed=0;

  seals.forEach(seal=>{
    seal.addEventListener('click',()=>{
      if(seal.disabled) return;

      seal.classList.add('is-pressed');
      seal.disabled=true;
      seal.setAttribute('aria-pressed','true');
      pressed++;

      if(pressed===seals.length){
        document.querySelector('[data-demo-sequence]')?.classList.add('is-complete');
        startGame();
      }
    });
  });
})();