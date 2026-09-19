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
  const gravityJumpButton = stage.querySelector('[data-game-gravity-jump]');
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
  const COYOTE_TIME_SECONDS = 0.14;
  const EXTRA_AIR_JUMPS = 1;
  const PLAYER_DEATH_DELAY = 2.0;
  const DRONE_TRIGGER_RANGE = 58;
  const DRONE_WINDUP_SECONDS = 0.55;
  const DRONE_EXPLOSION_RANGE = 82;
  const RUMBLER_RUMBLE_RANGE = 190;
  const WEBCASTER_STUN_SECONDS = 1.5;

  const input = {
    left:false,right:false,up:false,down:false,
    moveX:0,moveY:0
  };
  const aim = { x:850, y:floorY-180, active:false, dx:1, dy:0, source:'mouse' };

  const isTouchDevice = () =>
    window.matchMedia('(pointer: coarse)').matches ||
    navigator.maxTouchPoints > 0;

  const isMobileGameplay = () =>
    isTouchDevice() && stage.classList.contains('is-mobile-game');

  const MOBILE_GRAVITY_ASSIST_DOT = 0.80;
  const MOBILE_SHOT_ASSIST_HALF_ANGLE = 10 * Math.PI / 180;
  const MOBILE_SHOT_ASSIST_DOT = Math.cos(MOBILE_SHOT_ASSIST_HALF_ANGLE);

  const mobileAssist = {
    rawX:1,
    rawY:0,
    mag:0,
    hiddenShotTarget:null
  };

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
    { x:355, y:1348, w:180, h:16, kind:'platform', gravity:true, faces:['top','bottom'], zone:3 },
    { x:210, y:1314, w:132, h:14, kind:'platform', gravity:true, faces:['top','bottom'], zone:3 },

    // Arena B: route crosses back left without an occluding wall.
    { x:120, y:1260, w:330, h:18, kind:'platform', gravity:true, faces:['top','bottom'], zone:3 },
    { x:285, y:1165, w:150, h:16, kind:'platform', gravity:true, faces:['top','bottom'], zone:3 },
    { x:485, y:1085, w:270, h:18, kind:'platform', gravity:true, faces:['top','bottom'], zone:3 },
    { x:700, y:995, w:165, h:16, kind:'platform', gravity:true, faces:['top','bottom'], zone:4 },

    // Arena C: long combat floor with an optional upper underside route.
    { x:790, y:900, w:400, h:18, kind:'platform', gravity:true, faces:['top','bottom'], zone:4 },
    { x:1000, y:805, w:150, h:16, kind:'platform', gravity:true, faces:['top','bottom'], zone:4 },
    { x:570, y:705, w:240, h:18, kind:'platform', gravity:true, faces:['top','bottom'], zone:4 },
    { x:505, y:620, w:155, h:15, kind:'platform', gravity:true, faces:['top','bottom'], zone:5 },

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

    // Arena A room: lower-left entry, upper-left exit.
    { x:700, y:1500, w:24, h:105, kind:'bulkhead', gravity:false, zone:2 },
    { x:1180, y:1415, w:42, h:190, kind:'bulkhead', gravity:false, zone:2 },
    { x:820, y:1415, w:402, h:24, kind:'bulkhead', gravity:false, zone:2 },

    // Arena B room: enter from below, leave through the upper-right opening.
    { x:100, y:1095, w:24, h:165, kind:'bulkhead', gravity:false, zone:3 },
    { x:450, y:1185, w:30, h:75, kind:'bulkhead', gravity:false, zone:3 },
    { x:100, y:1095, w:290, h:22, kind:'bulkhead', gravity:false, zone:3 },

    // Arena C room: lower-left entry, upper-left exit toward the maintenance link.
    { x:760, y:825, w:30, h:75, kind:'bulkhead', gravity:false, zone:4 },
    { x:1190, y:730, w:32, h:170, kind:'bulkhead', gravity:false, zone:4 },
    { x:900, y:730, w:322, h:22, kind:'bulkhead', gravity:false, zone:4 },
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

  const levelBands = [
    { top:1780, bottom:2080, label:'01 · ENTRY' },
    { top:1395, bottom:1780, label:'02 · ARENA A' },
    { top:1050, bottom:1395, label:'03 · ARENA B' },
    { top:690, bottom:1050, label:'04 · ARENA C' },
    { top:350, bottom:690, label:'05 · FINAL ASCENT' },
    { top:170, bottom:350, label:'06 · EXIT' }
  ];

  const roomSections = [
    {
      id:'A',
      x:700, y:1415, w:522, h:190,
      entry:{x:700,y:1500,w:120,h:105},
      exit:{x:700,y:1415,w:120,h:85},
      label:'COMBAT MODULE A'
    },
    {
      id:'B',
      x:100, y:1095, w:380, h:165,
      entry:{x:390,y:1185,w:90,h:75},
      exit:{x:390,y:1095,w:90,h:90},
      label:'COMBAT MODULE B'
    },
    {
      id:'C',
      x:760, y:730, w:462, h:170,
      entry:{x:760,y:825,w:140,h:75},
      exit:{x:760,y:730,w:140,h:95},
      label:'COMBAT MODULE C'
    }
  ];

  const fillerSections = [
    {
      type:'tunnel',
      x:168, y:1278, w:430, h:118,
      label:'SERVICE TUNNEL',
      ribs:7
    },
    {
      type:'tunnel',
      x:405, y:570, w:455, h:145,
      label:'MAINTENANCE LINK',
      ribs:8
    }
  ];

  const checkpointConfig = {
    x:585,
    y:1027,
    w:96,
    h:58,
    respawnX:620,
    respawnY:1047
  };

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
    enemyTraps:[],
    enemyEffects:[],
    pickups:[],
    enemyId:0,
    playerDead:false,
    deathTimer:0,
    pendingFullReset:false,
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
      cleared:false,
      coreDropped:false
    })),
    checkpoint:{...checkpointConfig,active:false},
    camera:{ y:Math.max(0,floorY-H+70), targetY:Math.max(0,floorY-H+70) },
    player:{
      x:74, y:floorY-38, w:26, h:38,
      vx:0, vy:0, grounded:true,
      facing:1, invuln:0,
      stunned:0,
      coyoteTimer:COYOTE_TIME_SECONDS,
      airJumps:EXTRA_AIR_JUMPS,
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
    const spawn=state.checkpoint?.active
      ? {x:state.checkpoint.respawnX,y:state.checkpoint.respawnY}
      : {x:74,y:floorY-38};

    Object.assign(state.player,{
      x:spawn.x, y:spawn.y, vx:0, vy:0,
      grounded:true, facing:1, invuln:1.0,
      stunned:0,
      coyoteTimer:COYOTE_TIME_SECONDS,
      airJumps:EXTRA_AIR_JUMPS,
      surface:'floor', attachedSolid:null, attachedFace:null
    });
    state.gravityJump=null;

    if(state.camera){
      const spawnCameraY=clamp(
        spawn.y+state.player.h*.5-H*.60,
        0,
        Math.max(0,WORLD_H-H)
      );
      state.camera.y=spawnCameraY;
      state.camera.targetY=spawnCameraY;
    }

    aim.x=spawn.x+230;
    aim.y=spawn.y-72;
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
      cleared:false,
      coreDropped:false
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
    state.enemyTraps.length=0;
    state.enemyEffects.length=0;
    state.pickups.length=0;
    state.enemyId=0;
    state.playerDead=false;
    state.deathTimer=0;
    state.pendingFullReset=false;
    state.won=false;
    state.paused=false;
    state.message='';
    state.messageTimer=0;
    state.gravityTarget=null;
    state.gravityJump=null;
    mobileAssist.mag=0;
    mobileAssist.hiddenShotTarget=null;
    state.checkpoint.active=false;
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
    if(type==='webcaster') return { w:34,h:42,hp:1,speed:42,color:'#68405f',accent:'#b98cff' };
    return { w:36,h:50,hp:1,speed:22,color:'#704b39',accent:'#f4d75c' };
  };

  const getWebcasterNavBounds = (encounter, enemy) => {
    const padX=14;
    const padY=10;

    if(
      Number.isFinite(encounter.zoneX) &&
      Number.isFinite(encounter.zoneY) &&
      Number.isFinite(encounter.zoneW) &&
      Number.isFinite(encounter.zoneH)
    ){
      return {
        x:encounter.zoneX+padX,
        y:encounter.zoneY+padY,
        w:Math.max(enemy.w+28,encounter.zoneW-padX*2),
        h:Math.max(enemy.h+24,encounter.zoneH-padY*2)
      };
    }

    const platformY=encounter.platformY ?? doorPlatform.y;
    const minX=encounter.minX ?? doorPlatform.x;
    const maxX=encounter.maxX ?? (doorPlatform.x+doorPlatform.w);
    const top=Math.max(80,platformY-178);

    return {
      x:minX+padX,
      y:top,
      w:Math.max(enemy.w+28,maxX-minX-padX*2),
      h:Math.max(enemy.h+30,platformY-top-18)
    };
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
      summon:3.4,
      trap:3.2 + (state.enemyId%3)*.55,
      rumble:2.0 + (state.enemyId%3)*.45,
      jumpTimer:1.5 + (state.enemyId%4)*.35,
      jumpState:null,
      selfDestruct:false,
      selfDestructTimer:0
    };
    if(type==='webcaster'){
      const nav=getWebcasterNavBounds(encounter,enemy);
      enemy.backWall=nav;
      enemy.x=clamp(
        spawnX-enemy.w*.5,
        nav.x,
        nav.x+nav.w-enemy.w
      );
      enemy.y=clamp(
        homeY-enemy.h-58-(state.enemyId%3)*18,
        nav.y,
        nav.y+nav.h-enemy.h
      );
      enemy.backWallOffset=(state.enemyId%2===0?1:-1)*(48+(state.enemyId%3)*14);
      enemy.webTargetX=enemy.x;
      enemy.webTargetY=enemy.y;
      enemy.webRepath=0;
      enemy.webPath=[];
      enemy.webPathIndex=0;
    }

    state.enemies.push(enemy);
    return enemy;
  };

  const dropZoneCore = zone => {
    if(zone.coreDropped) return;

    zone.coreDropped=true;

    const dropX=clamp(
      zone.zoneX+zone.zoneW*.5-10,
      zone.minX+12,
      zone.maxX-32
    );

    state.pickups.push({
      type:'core',
      sourceZone:zone.id,
      x:dropX,
      y:zone.zoneY+24,
      w:20,
      h:20,
      phase:0,
      falling:true,
      vy:-30,
      gravity:650,
      landY:zone.platformY-20
    });

    state.message=`ZONE ${zone.id} CLEARED · CORE DROPPED`;
    state.messageTimer=1.8;

    state.enemyEffects.push({
      type:'coreReward',
      x:dropX+10,
      y:zone.zoneY+34,
      age:0,
      duration:.72,
      radius:58
    });
  };

  const removeEnemy = (enemy,{awardScore=true}={}) => {
    const idx=state.enemies.indexOf(enemy);
    if(idx<0) return false;

    state.enemies.splice(idx,1);
    if(awardScore) state.score+=enemy.waveEnemy?120:55;

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
            dropZoneCore(zone);
          }
        }
      }
    }

    return true;
  };

  const damageEnemy = (enemy, amount=1) => {
    enemy.hp-=amount;
    if(enemy.hp>0) return false;
    return removeEnemy(enemy,{awardScore:true});
  };

  const beginPlayerDeath = fullReset => {
    if(state.playerDead) return;

    state.playerDead=true;
    state.deathTimer=PLAYER_DEATH_DELAY;
    state.pendingFullReset=!!fullReset;
    state.gravityJump=null;
    state.enemyShots.length=0;
    state.enemyTraps.length=0;

    const p=state.player;
    p.vx=0;
    p.vy=0;
    p.stunned=0;
    p.grounded=false;
    p.surface='air';
    p.attachedSolid=null;
    p.attachedFace=null;

    input.left=false;
    input.right=false;
    input.up=false;
    input.down=false;
    input.moveX=0;
    input.moveY=0;
  };

  const playerHit = () => {
    if(
      state.playerDead ||
      state.player.invuln>0 ||
      state.won ||
      state.gravityJump
    ) return;

    state.cores--;
    state.flash=.34;
    state.message=state.cores<=0 ? 'RUN LOST' : 'WARP CORE LOST';
    state.messageTimer=PLAYER_DEATH_DELAY;

    beginPlayerDeath(state.cores<=0);
  };

  const updatePlayerDeath = dt => {
    if(!state.playerDead) return false;

    state.deathTimer=Math.max(0,state.deathTimer-dt);
    if(state.deathTimer>0) return true;

    if(state.pendingFullReset){
      resetGame();
      return true;
    }

    state.playerDead=false;
    state.pendingFullReset=false;
    resetPlayer();
    return true;
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
    if(!state.active || state.won || state.gravityJump || state.playerDead || state.player.stunned>0) return;

    const p=state.player;
    const groundedJump=p.grounded || p.coyoteTimer>0;

    if(p.surface==='left' || p.surface==='right'){
      const outward=p.surface==='left' ? -1 : 1;
      p.x+=outward*9;
      p.vx=outward*220;
      p.vy=-325;
      p.grounded=false;
      p.coyoteTimer=0;
      p.surface='air';
      p.attachedSolid=null;
      p.attachedFace=null;
      state.actionPulse=.22;
      return;
    }

    if(p.surface==='bottom'){
      p.y+=9;
      p.vy=320;
      p.grounded=false;
      p.coyoteTimer=0;
      p.surface='air';
      p.attachedSolid=null;
      p.attachedFace=null;
      state.actionPulse=.22;
      return;
    }

    if(groundedJump){
      p.vy=-450;
      p.grounded=false;
      p.coyoteTimer=0;
      p.surface='air';
      p.attachedSolid=null;
      p.attachedFace=null;
      state.actionPulse=.18;
      return;
    }

    if(p.airJumps<=0) return;

    p.airJumps--;
    p.vy=-420;
    p.grounded=false;
    p.coyoteTimer=0;
    p.surface='air';
    p.attachedSolid=null;
    p.attachedFace=null;
    state.actionPulse=.22;
    navigator.vibrate?.(7);
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
    const mobileDirectional=
      isMobileGameplay() &&
      mobileAssist.mag>.08;

    const rawLen=Math.hypot(mobileAssist.rawX,mobileAssist.rawY)||1;
    const rawX=mobileAssist.rawX/rawLen;
    const rawY=mobileAssist.rawY/rawLen;

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

        let score;

        if(mobileDirectional){
          const ndx=dx/(dist||1);
          const ndy=dy/(dist||1);
          const dot=ndx*rawX+ndy*rawY;

          if(dot<MOBILE_GRAVITY_ASSIST_DOT) continue;

          score=
            (1-dot)*560 +
            dist*.10 +
            pointerDistance*.08 +
            (sameSurface?70:0);
        }else{
          score=pointerDistance + dist*.08 + (sameSurface?55:0);
        }

        if(!best || score<best.score){
          best={
            ...candidate,
            dist,
            score,
            mobileAssisted:mobileDirectional
          };
        }
      }
    }

    return best;
  };

  const gravityJump = () => {
    if(!state.active || state.won || state.gravityJump || !state.player.grounded || state.playerDead || state.player.stunned>0) return;

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
    if(!state.active || state.won || state.ammo<=0 || state.playerDead || state.player.stunned>0) return;

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

  const mobileShotLineClear = (sx,sy,tx,ty) => {
    const dist=Math.hypot(tx-sx,ty-sy);
    const steps=Math.max(4,Math.ceil(dist/10));

    for(let i=1;i<steps;i++){
      const t=i/steps;
      const x=lerp(sx,tx,t);
      const y=lerp(sy,ty,t);

      for(const solid of getBulletSolids()){
        if(circleRect(x,y,3,solid)) return false;
      }
    }

    return true;
  };

  const resolveMobileShotTarget = (tx,ty) => {
    mobileAssist.hiddenShotTarget=null;

    if(
      !isMobileGameplay() ||
      aim.source!=='stick' ||
      state.playerDead ||
      state.won
    ){
      return {x:tx,y:ty,assisted:false};
    }

    const p=state.player;
    const sx=p.x+p.w*.54;
    const sy=p.y+p.h*.38;

    let aimX=tx-sx;
    let aimY=ty-sy;
    const aimLen=Math.hypot(aimX,aimY);

    if(aimLen<8) return {x:tx,y:ty,assisted:false};

    aimX/=aimLen;
    aimY/=aimLen;

    let best=null;

    for(const enemy of state.enemies){
      const cx=enemy.x+enemy.w*.5;
      const cy=enemy.y+enemy.h*.42;
      const dx=cx-sx;
      const dy=cy-sy;
      const dist=Math.hypot(dx,dy);

      if(dist<34 || dist>560) continue;

      const ex=dx/(dist||1);
      const ey=dy/(dist||1);
      const dot=aimX*ex+aimY*ey;

      // Roughly ±10° around the visible reticle direction.
      if(dot<MOBILE_SHOT_ASSIST_DOT) continue;
      if(!mobileShotLineClear(sx,sy,cx,cy)) continue;

      const angularError=Math.acos(clamp(dot,-1,1));
      const score=
        angularError*1000 +
        dist*.035;

      if(!best || score<best.score){
        best={
          enemy,
          x:cx,
          y:cy,
          score,
          angularError
        };
      }
    }

    if(!best) return {x:tx,y:ty,assisted:false};

    // This target is intentionally never drawn. The visible crosshair stays
    // exactly where the player's thumb put it; only the fired shot uses it.
    mobileAssist.hiddenShotTarget=best;

    return {
      x:best.x,
      y:best.y,
      assisted:true
    };
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
    const playerY=p.y+p.h*.5;

    // Base anticipation follows vertical motion. Rising keeps the player lower
    // on screen so the route above remains visible; falling reveals more below.
    const velocityLook=clamp(p.vy*.15,-92,72);
    let focusY=playerY+velocityLook;

    // Aim contributes only a restrained amount so combat is readable without
    // making the camera chase the reticle.
    if(aim.active){
      const aimDelta=clamp(aim.y-playerY,-360,360);
      focusY+=aimDelta*.10;
    }

    // Gravity traversal gets stronger framing because the destination is part
    // of the player's immediate action.
    const gravityFocus=state.gravityJump?.target || state.gravityTarget;
    if(gravityFocus){
      const gravityDelta=clamp(gravityFocus.cy-playerY,-420,420);
      focusY+=gravityDelta*(state.gravityJump?.target ? .28 : .14);
    }

    // During combat, gently include the local enemy cluster. Only nearby units
    // contribute, preventing enemies in another floor from pulling the view.
    let enemyY=0;
    let enemyCount=0;
    for(const enemy of state.enemies){
      const cy=enemy.y+enemy.h*.5;
      if(Math.abs(cy-playerY)>360) continue;
      enemyY+=cy;
      enemyCount++;
    }

    if(enemyCount){
      const clusterY=enemyY/enemyCount;
      const enemyDelta=clamp(clusterY-playerY,-250,250);
      focusY+=enemyDelta*.16;
    }

    let anchor=.59;
    if(p.vy<-90) anchor=.65;
    else if(p.vy>150) anchor=.52;
    if(state.gravityJump) anchor=.61;

    const desired=clamp(
      focusY-H*anchor,
      0,
      Math.max(0,WORLD_H-H)
    );

    state.camera.targetY=desired;

    if(snap){
      state.camera.y=desired;
      return;
    }

    const distance=Math.abs(state.camera.targetY-state.camera.y);
    const followRate=distance>150 ? 6.4 : 4.6;
    const alpha=1-Math.exp(-dt*followRate);
    const previousY=state.camera.y;

    // A small dead zone prevents micro-jitter while idling on a platform.
    if(distance>2.5){
      state.camera.y=lerp(
        state.camera.y,
        state.camera.targetY,
        alpha
      );
    }

    if(aim.source==='mouse'){
      aim.y+=state.camera.y-previousY;
    }
  };

  const updatePickups = (dt,scale) => {
    const step=dt*scale;

    for(const pickup of state.pickups){
      if(!pickup.falling) continue;

      pickup.vy+=pickup.gravity*step;
      pickup.y+=pickup.vy*step;

      if(pickup.y>=pickup.landY){
        pickup.y=pickup.landY;
        pickup.vy=0;
        pickup.falling=false;

        state.enemyEffects.push({
          type:'coreReward',
          x:pickup.x+pickup.w*.5,
          y:pickup.y+pickup.h*.5,
          age:0,
          duration:.42,
          radius:30
        });
      }
    }
  };

  const checkPlayerProgress = () => {
    const p=state.player;

    if(!state.checkpoint.active && rectHit(p,state.checkpoint)){
      state.checkpoint.active=true;
      state.score+=100;
      state.message='CHECKPOINT ACTIVE';
      state.messageTimer=1.5;
      state.enemyEffects.push({
        type:'checkpoint',
        x:state.checkpoint.x+state.checkpoint.w*.5,
        y:state.checkpoint.y+state.checkpoint.h*.5,
        age:0,
        duration:.8,
        radius:70
      });
    }

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
    p.stunned=Math.max(0,p.stunned-dt);

    if(p.stunned>0){
      p.vx=lerp(p.vx,0,1-Math.exp(-dt*18));

      if(!p.grounded && p.surface==='air'){
        p.vy=Math.min(640,p.vy+920*dt);
        resolvePlayerY(p.vy*dt);
      }

      return;
    }

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
        p.coyoteTimer=COYOTE_TIME_SECONDS;
        p.airJumps=EXTRA_AIR_JUMPS;
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
      p.coyoteTimer=COYOTE_TIME_SECONDS;
      p.airJumps=EXTRA_AIR_JUMPS;
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
      p.coyoteTimer=COYOTE_TIME_SECONDS;
      p.airJumps=EXTRA_AIR_JUMPS;
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
      p.coyoteTimer=COYOTE_TIME_SECONDS;
      p.airJumps=EXTRA_AIR_JUMPS;
      p.surface='floor';
      p.attachedSolid=null;
      p.attachedFace=null;
    }else{
      p.coyoteTimer=Math.max(0,p.coyoteTimer-dt);
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

  const shootEnemyProjectile = (enemy, speed=220, kind='normal') => {
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
      kind,
      color:kind==='web'?'#b98cff':'#f4d75c'
    });
  };

  const shootWebcasterSpread = enemy => {
    const p=state.player;
    const sx=enemy.x+enemy.w*.5;
    const sy=enemy.y+enemy.h*.38;
    const base=Math.atan2(
      (p.y+p.h*.45)-sy,
      (p.x+p.w*.5)-sx
    );

    for(const offset of [-0.16,0,0.16]){
      const angle=base+offset;
      state.enemyShots.push({
        x:sx,
        y:sy,
        dx:Math.cos(angle),
        dy:Math.sin(angle),
        speed:205,
        r:5,
        kind:'web',
        color:'#b98cff'
      });
    }
  };

  const throwWebcasterTrap = enemy => {
    const p=state.player;
    const sx=enemy.x+enemy.w*.5;
    const sy=enemy.y+enemy.h*.42;
    const tx=p.x+p.w*.5;
    const ty=p.y+p.h*.72;
    const gravity=760;
    const distance=Math.hypot(tx-sx,ty-sy);
    const flight=clamp(distance/360,.52,.92);

    const vx=(tx-sx)/flight;
    const vy=(ty-sy-.5*gravity*flight*flight)/flight;

    state.enemyTraps.push({
      mode:'projectile',
      x:sx-6,
      y:sy-6,
      px:sx-6,
      py:sy-6,
      w:12,
      h:12,
      vx:clamp(vx,-390,390),
      vy:clamp(vy,-520,260),
      gravity,
      flightLife:2.25,
      deployedW:38,
      deployedH:8,
      arm:.55,
      life:5.5,
      stun:WEBCASTER_STUN_SECONDS,
      phase:0,
      owner:enemy.id
    });
  };

  const explodeDrone = enemy => {
    const cx=enemy.x+enemy.w*.5;
    const cy=enemy.y+enemy.h*.5;
    const p=state.player;
    const px=p.x+p.w*.5;
    const py=p.y+p.h*.5;

    state.enemyEffects.push({
      type:'explosion',
      x:cx,
      y:cy,
      age:0,
      duration:.38,
      radius:DRONE_EXPLOSION_RANGE
    });

    if(Math.hypot(px-cx,py-cy)<=DRONE_EXPLOSION_RANGE){
      playerHit();
    }

    removeEnemy(enemy,{awardScore:false});
  };

  const magneticPlayerAttached = p =>
    p.surface==='left' ||
    p.surface==='right' ||
    p.surface==='bottom';

  const knockPlayerFromMagneticSurface = enemy => {
    const p=state.player;
    if(!magneticPlayerAttached(p)) return false;

    const ex=enemy.x+enemy.w*.5;
    const ey=enemy.y+enemy.h*.5;
    const px=p.x+p.w*.5;
    const py=p.y+p.h*.5;
    const dist=Math.hypot(px-ex,py-ey);

    if(dist>RUMBLER_RUMBLE_RANGE) return false;

    const direction=px<ex?-1:1;
    p.x+=direction*7;
    p.vx=direction*155;
    p.vy=185;
    p.grounded=false;
    p.coyoteTimer=0;
    p.surface='air';
    p.attachedSolid=null;
    p.attachedFace=null;
    enemy.rumbleFlash=.24;

    state.enemyEffects.push({
      type:'rumble',
      x:ex,
      y:enemy.homeY,
      age:0,
      duration:.34,
      radius:74
    });

    navigator.vibrate?.(18);
    return true;
  };

  const platformForEnemy = enemy => {
    let best=null;
    let delta=Infinity;

    for(const solid of staticSolids){
      if(solid.kind!=='platform') continue;
      const d=Math.abs(solid.y-enemy.homeY);
      if(d<delta && enemy.x+enemy.w*.5>=solid.x-40 && enemy.x+enemy.w*.5<=solid.x+solid.w+40){
        best=solid;
        delta=d;
      }
    }

    return best;
  };

  const rumblerArcClear = (enemy,target,targetX) => {
    const source=platformForEnemy(enemy);
    const fromX=enemy.x;
    const fromY=enemy.y;
    const toX=targetX;
    const toY=target.y-enemy.h;

    for(let i=1;i<12;i++){
      const t=i/12;
      const x=lerp(fromX,toX,t);
      const y=lerp(fromY,toY,t)-Math.sin(Math.PI*t)*72;
      const test={x,y,w:enemy.w,h:enemy.h};

      for(const solid of staticSolids){
        if(solid===source || solid===target) continue;
        if(rectHit(test,solid)) return false;
      }
    }

    return true;
  };

  const findRumblerJumpTarget = enemy => {
    const p=state.player;
    const ex=enemy.x+enemy.w*.5;
    let best=null;

    for(const solid of staticSolids){
      if(solid.kind!=='platform') continue;
      if(Math.abs(solid.y-enemy.homeY)<14) continue;

      const cx=clamp(
        p.x+p.w*.5,
        solid.x+enemy.w*.5+6,
        solid.x+solid.w-enemy.w*.5-6
      );
      const dx=cx-ex;
      const dy=solid.y-enemy.homeY;
      const distance=Math.hypot(dx,dy);

      if(distance>350 || Math.abs(dy)>235) continue;

      const targetX=cx-enemy.w*.5;
      if(!rumblerArcClear(enemy,solid,targetX)) continue;

      const score=
        Math.abs((p.y+p.h)-solid.y)*1.15 +
        Math.abs((p.x+p.w*.5)-cx)*.28 +
        distance*.08;

      if(!best || score<best.score){
        best={solid,x:targetX,y:solid.y-enemy.h,score};
      }
    }

    return best;
  };

  const startRumblerJump = (enemy,target) => {
    if(!target) return false;

    enemy.jumpState={
      fromX:enemy.x,
      fromY:enemy.y,
      toX:target.x,
      toY:target.y,
      target:target.solid,
      t:0,
      duration:.62
    };

    return true;
  };

  const updateEnemyTraps = (dt,scale) => {
    const p=state.player;

    for(let i=state.enemyTraps.length-1;i>=0;i--){
      const trap=state.enemyTraps[i];
      const step=dt*scale;

      if(trap.mode==='projectile'){
        trap.phase+=step*9;
        trap.flightLife-=step;
        trap.px=trap.x;
        trap.py=trap.y;

        trap.vy+=trap.gravity*step;
        trap.x+=trap.vx*step;
        trap.y+=trap.vy*step;

        let landedOn=null;
        const previousBottom=trap.py+trap.h;
        const currentBottom=trap.y+trap.h;

        if(trap.vy>=0){
          for(const solid of staticSolids){
            if(!['floor','platform','block'].includes(solid.kind)) continue;
            if(trap.x+trap.w<solid.x || trap.x>solid.x+solid.w) continue;
            if(previousBottom>solid.y+3 || currentBottom<solid.y) continue;

            if(!landedOn || solid.y<landedOn.y) landedOn=solid;
          }
        }

        if(landedOn){
          const width=trap.deployedW;
          const height=trap.deployedH;
          const center=clamp(
            trap.x+trap.w*.5,
            landedOn.x+width*.5+3,
            landedOn.x+landedOn.w-width*.5-3
          );

          trap.mode='deployed';
          trap.x=center-width*.5;
          trap.y=landedOn.y-height;
          trap.w=width;
          trap.h=height;
          trap.vx=0;
          trap.vy=0;
          trap.phase=0;
          continue;
        }

        if(
          trap.flightLife<=0 ||
          trap.x<-80 ||
          trap.x>W+80 ||
          trap.y>WORLD_H+80 ||
          trap.y<-160
        ){
          state.enemyTraps.splice(i,1);
        }

        continue;
      }

      trap.phase+=step*5;
      trap.arm=Math.max(0,trap.arm-step);
      trap.life-=step;

      if(trap.life<=0){
        state.enemyTraps.splice(i,1);
        continue;
      }

      if(
        !state.playerDead &&
        trap.arm<=0 &&
        rectHit(p,{x:trap.x,y:trap.y-6,w:trap.w,h:14})
      ){
        p.stunned=Math.max(p.stunned,trap.stun);
        p.vx=0;
        state.flash=.12;
        navigator.vibrate?.(25);
        state.enemyTraps.splice(i,1);
      }
    }
  };

  const updateEnemyEffects = dt => {
    for(let i=state.enemyEffects.length-1;i>=0;i--){
      const effect=state.enemyEffects[i];
      effect.age+=dt;
      if(effect.age>=effect.duration) state.enemyEffects.splice(i,1);
    }
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

  const enemyShotLineClear = (sx,sy,tx,ty) => {
    const dist=Math.hypot(tx-sx,ty-sy);
    const steps=Math.max(4,Math.ceil(dist/12));

    for(let i=1;i<steps;i++){
      const t=i/steps;
      const x=lerp(sx,tx,t);
      const y=lerp(sy,ty,t);

      for(const solid of staticSolids){
        if(circleRect(x,y,3,solid)) return false;
      }

      if(state.door.active && circleRect(x,y,3,state.door)) return false;
    }

    return true;
  };

  const webcasterHasLineOfSight = enemy => {
    const p=state.player;
    return enemyShotLineClear(
      enemy.x+enemy.w*.5,
      enemy.y+enemy.h*.38,
      p.x+p.w*.5,
      p.y+p.h*.45
    );
  };

  const webcasterPositionBlocked = (enemy,x,y) => {
    const margin=4;
    const body={x,y,w:enemy.w,h:enemy.h};

    for(const solid of staticSolids){
      const expanded={
        x:solid.x-margin,
        y:solid.y-margin,
        w:solid.w+margin*2,
        h:solid.h+margin*2
      };
      if(rectHit(body,expanded)) return true;
    }

    if(state.door.active){
      const expandedDoor={
        x:state.door.x-margin,
        y:state.door.y-margin,
        w:state.door.w+margin*2,
        h:state.door.h+margin*2
      };
      if(rectHit(body,expandedDoor)) return true;
    }

    return false;
  };

  const buildWebcasterPath = (enemy,targetX,targetY) => {
    const nav=enemy.backWall;
    if(!nav) return [];

    const step=24;
    const cols=Math.max(1,Math.floor((nav.w-enemy.w)/step)+1);
    const rows=Math.max(1,Math.floor((nav.h-enemy.h)/step)+1);

    const nodes=[];
    for(let gy=0;gy<rows;gy++){
      for(let gx=0;gx<cols;gx++){
        const x=clamp(nav.x+gx*step,nav.x,nav.x+nav.w-enemy.w);
        const y=clamp(nav.y+gy*step,nav.y,nav.y+nav.h-enemy.h);
        nodes.push({
          gx,gy,x,y,
          blocked:webcasterPositionBlocked(enemy,x,y)
        });
      }
    }

    const nodeAt=(gx,gy)=>
      gx<0||gy<0||gx>=cols||gy>=rows
        ? null
        : nodes[gy*cols+gx];

    const nearestWalkable=(x,y)=>{
      let best=null;
      let bestDist=Infinity;
      for(const node of nodes){
        if(node.blocked) continue;
        const d=(node.x-x)*(node.x-x)+(node.y-y)*(node.y-y);
        if(d<bestDist){
          best=node;
          bestDist=d;
        }
      }
      return best;
    };

    const start=nearestWalkable(enemy.x,enemy.y);
    const goal=nearestWalkable(targetX,targetY);
    if(!start || !goal) return [];

    const key=node=>node.gx+','+node.gy;
    const open=[start];
    const openKeys=new Set([key(start)]);
    const came=new Map();
    const gScore=new Map([[key(start),0]]);
    const fScore=new Map([[key(start),Math.hypot(goal.gx-start.gx,goal.gy-start.gy)]]);
    const dirs=[
      [1,0],[-1,0],[0,1],[0,-1],
      [1,1],[1,-1],[-1,1],[-1,-1]
    ];

    while(open.length){
      let bestIndex=0;
      for(let i=1;i<open.length;i++){
        const ai=fScore.get(key(open[i])) ?? Infinity;
        const bi=fScore.get(key(open[bestIndex])) ?? Infinity;
        if(ai<bi) bestIndex=i;
      }

      const current=open.splice(bestIndex,1)[0];
      const currentKey=key(current);
      openKeys.delete(currentKey);

      if(current===goal){
        const path=[];
        let cursor=current;
        let cursorKey=currentKey;

        while(cursor){
          path.push({x:cursor.x,y:cursor.y});
          const previousKey=came.get(cursorKey);
          if(!previousKey) break;
          const [pgx,pgy]=previousKey.split(',').map(Number);
          cursor=nodeAt(pgx,pgy);
          cursorKey=previousKey;
        }

        path.reverse();
        if(path.length && Math.hypot(path[0].x-enemy.x,path[0].y-enemy.y)<10){
          path.shift();
        }
        return path;
      }

      for(const [dx,dy] of dirs){
        const neighbor=nodeAt(current.gx+dx,current.gy+dy);
        if(!neighbor || neighbor.blocked) continue;

        if(dx!==0 && dy!==0){
          const sideA=nodeAt(current.gx+dx,current.gy);
          const sideB=nodeAt(current.gx,current.gy+dy);
          if(!sideA || !sideB || sideA.blocked || sideB.blocked) continue;
        }

        const neighborKey=key(neighbor);
        const stepCost=(dx!==0 && dy!==0)?1.414:1;
        const tentative=(gScore.get(currentKey) ?? Infinity)+stepCost;

        if(tentative >= (gScore.get(neighborKey) ?? Infinity)) continue;

        came.set(neighborKey,currentKey);
        gScore.set(neighborKey,tentative);
        fScore.set(
          neighborKey,
          tentative+Math.hypot(goal.gx-neighbor.gx,goal.gy-neighbor.gy)
        );

        if(!openKeys.has(neighborKey)){
          open.push(neighbor);
          openKeys.add(neighborKey);
        }
      }
    }

    return [];
  };

  const findWebcasterFiringPoint = enemy => {
    const nav=enemy.backWall;
    const p=state.player;
    const px=p.x+p.w*.5;
    const py=p.y+p.h*.45;
    const ex=enemy.x+enemy.w*.5;
    const ey=enemy.y+enemy.h*.5;
    const currentDistance=Math.hypot(px-ex,py-ey);
    const tooFar=currentDistance>330;

    const offsets=[
      [-270,-76],[-235,-30],[-200,34],
      [200,-76],[235,-30],[270,34],
      [-160,-104],[160,-104],
      [-130,70],[130,70],
      [0,-112]
    ];

    const candidates=[
      {cx:ex,cy:ey},
      ...offsets.map(([ox,oy])=>({cx:px+ox,cy:py+oy}))
    ];

    if(tooFar){
      candidates.push({
        cx:lerp(ex,px,.78),
        cy:lerp(ey,py,.78)
      });
    }

    let best=null;

    for(const candidate of candidates){
      const cx=clamp(
        candidate.cx,
        nav.x+enemy.w*.5,
        nav.x+nav.w-enemy.w*.5
      );
      const cy=clamp(
        candidate.cy,
        nav.y+enemy.h*.5,
        nav.y+nav.h-enemy.h*.5
      );
      const x=cx-enemy.w*.5;
      const y=cy-enemy.h*.5;

      if(webcasterPositionBlocked(enemy,x,y)) continue;

      const path=buildWebcasterPath(enemy,x,y);
      const alreadyThere=Math.hypot(x-enemy.x,y-enemy.y)<12;
      if(!alreadyThere && path.length===0) continue;

      const playerDistance=Math.hypot(px-cx,py-cy);
      const clear=enemyShotLineClear(cx,cy,px,py);
      const pathDistance=path.reduce((total,node,index)=>{
        const prev=index===0
          ? {x:enemy.x,y:enemy.y}
          : path[index-1];
        return total+Math.hypot(node.x-prev.x,node.y-prev.y);
      },0);

      const preferred=tooFar ? 220 : 205;
      const rangePenalty=Math.abs(playerDistance-preferred);
      const tooClosePenalty=playerDistance<120 ? (120-playerDistance)*3 : 0;
      const tooFarPenalty=playerDistance>310 ? (playerDistance-310)*4 : 0;
      const sightPenalty=clear ? 0 : 760;
      const pathPenalty=pathDistance*.08;
      const score=
        sightPenalty+
        rangePenalty+
        tooClosePenalty+
        tooFarPenalty+
        pathPenalty;

      if(!best || score<best.score){
        best={x,y,clear,score,path};
      }
    }

    return best;
  };

  const moveWebcasterOnBackWall = (enemy,dt,scale) => {
    const nav=enemy.backWall;
    if(!nav) return;

    const p=state.player;
    const px=p.x+p.w*.5;
    const py=p.y+p.h*.45;
    const ex=enemy.x+enemy.w*.5;
    const ey=enemy.y+enemy.h*.5;
    const playerDistance=Math.hypot(px-ex,py-ey);
    const tooFar=playerDistance>330;
    const lostSight=!webcasterHasLineOfSight(enemy);

    enemy.webRepath=Math.max(0,(enemy.webRepath||0)-dt*scale);

    const pathFinished=
      !enemy.webPath ||
      enemy.webPathIndex>=enemy.webPath.length;

    if(enemy.webRepath<=0 || tooFar || lostSight || pathFinished){
      const target=findWebcasterFiringPoint(enemy);
      if(target){
        enemy.webTargetX=target.x;
        enemy.webTargetY=target.y;
        enemy.webPath=target.path || [];
        enemy.webPathIndex=0;
      }
      enemy.webRepath=tooFar || lostSight ? .18 : .46;
    }

    let waypoint=null;
    if(enemy.webPath && enemy.webPathIndex<enemy.webPath.length){
      waypoint=enemy.webPath[enemy.webPathIndex];
    }else{
      waypoint={x:enemy.webTargetX,y:enemy.webTargetY};
    }

    const dx=waypoint.x-enemy.x;
    const dy=waypoint.y-enemy.y;
    const len=Math.hypot(dx,dy);

    if(len<5){
      if(enemy.webPath && enemy.webPathIndex<enemy.webPath.length){
        enemy.webPathIndex++;
      }
    }else{
      const chaseMultiplier=tooFar ? 1.52 : 1;
      const move=Math.min(len,enemy.speed*chaseMultiplier*dt*scale);
      const nx=enemy.x+dx/len*move;
      const ny=enemy.y+dy/len*move;

      if(!webcasterPositionBlocked(enemy,nx,ny)){
        enemy.x=nx;
        enemy.y=ny;
      }else{
        enemy.webPath=[];
        enemy.webPathIndex=0;
        enemy.webRepath=0;
      }
    }

    enemy.x=clamp(enemy.x,nav.x,nav.x+nav.w-enemy.w);
    enemy.y=clamp(enemy.y,nav.y,nav.y+nav.h-enemy.h);
  };

  const updateEnemies = (dt,scale) => {
    const p=state.player;

    for(const enemy of [...state.enemies]){
      if(!state.enemies.includes(enemy)) continue;

      enemy.phase+=dt*scale*2.4;
      enemy.rumbleFlash=Math.max(0,(enemy.rumbleFlash||0)-dt);

      if(enemy.type==='drone'){
        const dx=(p.x+p.w*.5)-(enemy.x+enemy.w*.5);
        const dy=(p.y+p.h*.45)-(enemy.y+enemy.h*.5);
        const len=Math.hypot(dx,dy)||1;

        if(enemy.selfDestruct){
          enemy.selfDestructTimer-=dt*scale;
          enemy.phase+=dt*scale*8;

          if(enemy.selfDestructTimer<=0){
            explodeDrone(enemy);
            continue;
          }
        }else{
          if(!state.playerDead && len<=DRONE_TRIGGER_RANGE){
            enemy.selfDestruct=true;
            enemy.selfDestructTimer=DRONE_WINDUP_SECONDS;
            enemy.vx=0;
            enemy.vy=0;
            navigator.vibrate?.(10);
          }else{
            enemy.x+=dx/len*enemy.speed*dt*scale;
            enemy.y+=dy/len*enemy.speed*dt*scale;
            enemy.y+=Math.sin(enemy.phase)*12*dt*scale;
          }
        }
      }else if(enemy.type==='webcaster'){
        moveWebcasterOnBackWall(enemy,dt,scale);

        enemy.attack-=dt*scale;
        enemy.trap-=dt*scale;

        if(enemy.attack<=0 && !state.playerDead){
          if(webcasterHasLineOfSight(enemy)){
            shootWebcasterSpread(enemy);
            enemy.attack=2.15;
          }else{
            enemy.attack=.18;
          }
        }

        if(enemy.trap<=0 && !state.playerDead){
          throwWebcasterTrap(enemy);
          enemy.trap=4.6;
        }
      }else if(enemy.type==='summoner'){
        enemy.x=Math.max(enemy.minX+20,enemy.x-enemy.speed*dt*scale);
        enemy.y=enemy.homeY-enemy.h;
        enemy.attack-=dt*scale;
        enemy.summon-=dt*scale;

        if(enemy.attack<=0 && !state.playerDead){
          shootEnemyProjectile(enemy,180,'normal');
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
      }else if(enemy.type==='rumbler'){
        enemy.attack-=dt*scale;
        enemy.rumble-=dt*scale;
        enemy.jumpTimer-=dt*scale;

        if(enemy.jumpState){
          const jump=enemy.jumpState;
          jump.t=Math.min(1,jump.t+(dt*scale)/jump.duration);
          const t=jump.t;
          enemy.x=lerp(jump.fromX,jump.toX,t);
          enemy.y=lerp(jump.fromY,jump.toY,t)-Math.sin(Math.PI*t)*72;

          if(t>=1){
            enemy.x=jump.toX;
            enemy.y=jump.toY;
            enemy.homeY=jump.target.y;
            enemy.minX=jump.target.x;
            enemy.maxX=jump.target.x+jump.target.w;
            enemy.jumpState=null;
            enemy.jumpTimer=1.7;
          }
        }else{
          const direction=p.x<enemy.x?-1:1;
          enemy.x+=direction*enemy.speed*dt*scale;
          enemy.x=clamp(enemy.x,enemy.minX,enemy.maxX-enemy.w);
          enemy.y=enemy.homeY-enemy.h;

          const px=p.x+p.w*.5;
          const py=p.y+p.h*.5;
          const ex=enemy.x+enemy.w*.5;
          const ey=enemy.y+enemy.h*.5;
          const dist=Math.hypot(px-ex,py-ey);

          if(enemy.attack<=0 && dist<52 && !state.playerDead){
            playerHit();
            enemy.attack=1.35;
          }

          if(enemy.rumble<=0){
            knockPlayerFromMagneticSurface(enemy);
            enemy.rumble=3.25;
          }

          if(enemy.jumpTimer<=0){
            const target=findRumblerJumpTarget(enemy);
            if(!startRumblerJump(enemy,target)) enemy.jumpTimer=.75;
          }
        }
      }else{
        const direction=p.x<enemy.x?-1:1;
        enemy.x+=direction*enemy.speed*dt*scale;
        enemy.x=clamp(enemy.x,enemy.minX,enemy.maxX-enemy.w);
        enemy.y=enemy.homeY-enemy.h;
      }

      if(!state.playerDead && rectHit(p,enemy)){
        if(enemy.type==='drone'){
          if(!enemy.selfDestruct){
            enemy.selfDestruct=true;
            enemy.selfDestructTimer=Math.min(.22,DRONE_WINDUP_SECONDS);
          }else{
            enemy.selfDestructTimer=Math.min(enemy.selfDestructTimer,.18);
          }
        }else if(enemy.type!=='rumbler'){
          playerHit();
        }
      }
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

      if(!remove && !state.playerDead && circleRect(shot.x,shot.y,shot.r,p)){
        remove=true;
        playerHit();
      }

      if(remove) state.enemyShots.splice(i,1);
    }

    updateEnemyTraps(dt,scale);
  };

  const drawBackground = () => {
    const cam=state.camera.y;
    const climb=1-clamp(cam/Math.max(1,WORLD_H-H),0,1);

    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,climb>.68?'#101b32':'#10192d');
    g.addColorStop(.58,'#0b1426');
    g.addColorStop(1,'#060d19');
    ctx.fillStyle=g;
    ctx.fillRect(0,0,W,H);

    const glow=ctx.createRadialGradient(W*.72,120+climb*70,12,W*.72,120+climb*70,520);
    glow.addColorStop(0,'rgba(244,151,77,.13)');
    glow.addColorStop(1,'rgba(244,151,77,0)');
    ctx.fillStyle=glow;
    ctx.fillRect(0,0,W,H);

    // Dark side walls and a brighter central shaft make the playable lane obvious.
    ctx.fillStyle='rgba(3,8,18,.52)';
    ctx.fillRect(0,0,72,H);
    ctx.fillRect(W-72,0,72,H);

    ctx.fillStyle='rgba(27,40,70,.20)';
    ctx.fillRect(92,0,W-184,H);

    ctx.strokeStyle='rgba(114,213,233,.10)';
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(92,0);ctx.lineTo(92,H);
    ctx.moveTo(W-92,0);ctx.lineTo(W-92,H);
    ctx.stroke();

    // Far machinery moves slowly, keeping depth without obscuring gameplay.
    const farOffset=(cam*.09)%250;
    ctx.fillStyle='rgba(18,28,50,.62)';
    for(let y=-250+farOffset;y<H+250;y+=250){
      ctx.fillRect(38,y,32,155);
      ctx.fillRect(W-70,y+82,32,155);
      ctx.fillRect(112,y+34,W-224,5);
    }

    // Maintenance lights establish a vertical rhythm.
    const lightOffset=-(cam*.14)%120;
    for(let y=lightOffset-120;y<H+120;y+=120){
      ctx.fillStyle='rgba(114,213,233,.065)';
      ctx.fillRect(106,y,W-212,1);
      ctx.fillStyle='rgba(244,215,92,.14)';
      ctx.fillRect(109,y-2,20,4);
      ctx.fillRect(W-129,y-2,20,4);
    }

    // Very subtle grid only inside the shaft.
    ctx.strokeStyle='rgba(114,213,233,.035)';
    ctx.lineWidth=1;
    for(let x=120;x<W-120;x+=80){
      ctx.beginPath();
      ctx.moveTo(x,0);
      ctx.lineTo(x,H);
      ctx.stroke();
    }
  };

  const drawSolids = () => {
    for(const solid of staticSolids){
      const raised=solid===doorPlatform;
      const wall=solid.kind==='wall';
      const bulkhead=solid.kind==='bulkhead';
      const zoneBlock=solid.kind==='block' || bulkhead;

      const g=ctx.createLinearGradient(solid.x,solid.y,solid.x,solid.y+Math.max(solid.h,24));
      g.addColorStop(
        0,
        raised
          ? '#303b57'
          : bulkhead
            ? '#18243a'
            : zoneBlock
              ? '#1c2740'
              : wall
                ? '#2a334b'
                : '#27324b'
      );
      g.addColorStop(
        1,
        solid.kind==='floor'
          ? '#111a2d'
          : bulkhead
            ? '#0d1526'
            : zoneBlock
              ? '#111a2d'
              : '#172139'
      );
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
        ctx.fillRect(solid.x,solid.y,solid.w,3);

        if(bulkhead){
          ctx.fillStyle='rgba(114,213,233,.16)';
          ctx.fillRect(solid.x,solid.y,solid.w,2);
          ctx.fillRect(solid.x,solid.y+solid.h-2,solid.w,2);

          if(solid.h>solid.w){
            ctx.fillStyle='rgba(255,255,255,.035)';
            for(let y=solid.y+12;y<solid.y+solid.h-10;y+=26){
              ctx.fillRect(solid.x+5,y,Math.max(0,solid.w-10),2);
            }
          }else{
            ctx.fillStyle='rgba(255,255,255,.04)';
            for(let x=solid.x+14;x<solid.x+solid.w-10;x+=34){
              ctx.fillRect(x,solid.y+6,16,Math.max(0,solid.h-12));
            }
          }
        }else{
          // Massive architectural blocks frame the main vertical shaft.
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

  const drawRoomSections = () => {
    ctx.save();

    for(const room of roomSections){
      const zone=state.combatZones.find(item=>item.id===room.id);
      const active=zone?.triggered && !zone?.cleared;
      const cleared=!!zone?.cleared;

      const g=ctx.createLinearGradient(room.x,room.y,room.x,room.y+room.h);
      g.addColorStop(
        0,
        active
          ? 'rgba(55,31,39,.42)'
          : cleared
            ? 'rgba(17,48,58,.25)'
            : 'rgba(18,29,50,.40)'
      );
      g.addColorStop(1,'rgba(7,13,27,.18)');
      ctx.fillStyle=g;
      ctx.fillRect(room.x,room.y,room.w,room.h);

      // Recessed back-wall panels make the enclosure read as a room.
      ctx.strokeStyle=active
        ? 'rgba(255,135,88,.13)'
        : cleared
          ? 'rgba(114,213,233,.12)'
          : 'rgba(140,160,205,.08)';
      ctx.lineWidth=1;

      for(let x=room.x+26;x<room.x+room.w-20;x+=72){
        ctx.strokeRect(x,room.y+18,54,room.h-36);
      }

      // Entry/exit apertures are intentionally brighter than the shell.
      for(const aperture of [room.entry,room.exit]){
        ctx.fillStyle='rgba(114,213,233,.045)';
        ctx.fillRect(aperture.x,aperture.y,aperture.w,aperture.h);

        ctx.strokeStyle='rgba(114,213,233,.18)';
        ctx.setLineDash([5,5]);
        ctx.strokeRect(
          aperture.x+.5,
          aperture.y+.5,
          aperture.w-1,
          aperture.h-1
        );
        ctx.setLineDash([]);
      }

      ctx.fillStyle=active
        ? 'rgba(255,160,118,.42)'
        : 'rgba(194,211,239,.22)';
      ctx.font='700 7px monospace';
      ctx.fillText(room.label,room.x+18,room.y+14);
    }

    ctx.restore();
  };

  const drawFillerSections = () => {
    ctx.save();

    for(const section of fillerSections){
      const x=section.x;
      const y=section.y;
      const w=section.w;
      const h=section.h;

      const g=ctx.createLinearGradient(x,y,x,y+h);
      g.addColorStop(0,'rgba(20,31,54,.82)');
      g.addColorStop(1,'rgba(8,16,31,.68)');
      ctx.fillStyle=g;
      ctx.fillRect(x,y,w,h);

      ctx.strokeStyle='rgba(114,213,233,.18)';
      ctx.lineWidth=2;
      ctx.strokeRect(x+.5,y+.5,w-1,h-1);

      ctx.fillStyle='rgba(114,213,233,.08)';
      ctx.fillRect(x,y+14,w,3);
      ctx.fillRect(x,y+h-17,w,3);

      const ribs=Math.max(3,section.ribs||6);
      for(let i=1;i<ribs;i++){
        const rx=x+(w/ribs)*i;
        ctx.fillStyle='rgba(114,213,233,.055)';
        ctx.fillRect(rx-2,y+16,4,h-32);
      }

      // Recessed pipes/cable trays sell the tunnel without adding collision.
      ctx.strokeStyle='rgba(244,215,92,.16)';
      ctx.lineWidth=3;
      ctx.beginPath();
      ctx.moveTo(x+24,y+28);
      ctx.lineTo(x+w-28,y+28);
      ctx.stroke();

      ctx.strokeStyle='rgba(121,108,240,.18)';
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(x+28,y+h-30);
      ctx.lineTo(x+w-24,y+h-30);
      ctx.stroke();

      ctx.fillStyle='rgba(210,224,246,.24)';
      ctx.font='700 7px monospace';
      ctx.fillText(section.label,x+16,y+12);
    }

    ctx.restore();
  };

  const drawLevelSections = () => {
    ctx.save();

    for(let i=0;i<levelBands.length;i++){
      const band=levelBands[i];
      ctx.fillStyle=i%2===0
        ? 'rgba(114,213,233,.018)'
        : 'rgba(121,108,240,.018)';
      ctx.fillRect(30,band.top,W-60,band.bottom-band.top);

      ctx.fillStyle='rgba(185,205,235,.18)';
      ctx.font='700 8px monospace';
      ctx.fillText(band.label,56,band.top+24);

      ctx.fillStyle='rgba(114,213,233,.055)';
      ctx.fillRect(48,band.top+38,3,Math.max(0,band.bottom-band.top-54));
      ctx.fillRect(W-51,band.top+38,3,Math.max(0,band.bottom-band.top-54));
    }

    for(const section of levelSections){
      const y=section.y;

      ctx.fillStyle='rgba(114,213,233,.055)';
      ctx.fillRect(28,y-3,W-56,6);

      ctx.strokeStyle='rgba(114,213,233,.11)';
      ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(46,y);
      ctx.lineTo(W-46,y);
      ctx.stroke();

      ctx.fillStyle='rgba(114,213,233,.22)';
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

  const drawCheckpoint = () => {
    const cp=state.checkpoint;
    const cx=cp.x+cp.w*.5;
    const baseY=cp.y+cp.h;
    const active=cp.active;
    const pulse=4+Math.sin(performance.now()*.007)*2;

    ctx.save();

    ctx.fillStyle=active?'rgba(114,213,233,.10)':'rgba(244,215,92,.055)';
    ctx.fillRect(cp.x,cp.y,cp.w,cp.h);

    ctx.strokeStyle=active?'rgba(114,213,233,.58)':'rgba(244,215,92,.34)';
    ctx.setLineDash([6,5]);
    ctx.strokeRect(cp.x+.5,cp.y+.5,cp.w-1,cp.h-1);
    ctx.setLineDash([]);

    ctx.fillStyle=active?'#72d5e9':'#f4d75c';
    ctx.fillRect(cx-2,cp.y+12,4,cp.h-18);

    ctx.beginPath();
    ctx.arc(cx,cp.y+14,8+pulse,0,Math.PI*2);
    ctx.strokeStyle=active?'rgba(114,213,233,.72)':'rgba(244,215,92,.62)';
    ctx.stroke();

    ctx.fillStyle=active?'rgba(114,213,233,.92)':'rgba(244,215,92,.85)';
    ctx.font='700 9px monospace';
    ctx.textAlign='center';
    ctx.fillText(active?'CHECKPOINT ACTIVE':'CHECKPOINT',cx,cp.y-10);

    ctx.fillStyle=active?'rgba(114,213,233,.32)':'rgba(244,215,92,.20)';
    ctx.fillRect(cp.x-7,baseY-3,cp.w+14,3);

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

    if(p.stunned>0){
      const spark=.55+Math.sin(performance.now()*.045)*.35;
      ctx.strokeStyle='rgba(185,140,255,'+spark.toFixed(2)+')';
      ctx.lineWidth=1.5;
      ctx.beginPath();
      ctx.moveTo(-p.w*.5-5,-8);
      ctx.lineTo(-p.w*.5+2,-13);
      ctx.lineTo(0,-7);
      ctx.lineTo(5,-14);
      ctx.lineTo(p.w*.5+5,-8);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0,0,Math.max(p.w,p.h)*.62,0,Math.PI*2);
      ctx.strokeStyle='rgba(185,140,255,.32)';
      ctx.stroke();
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

    if(p.stunned>0 && !state.playerDead){
      ctx.save();
      ctx.strokeStyle='rgba(185,140,255,.92)';
      ctx.lineWidth=1.5;
      const pulse=Math.sin(performance.now()*.018)*2;

      for(const offset of [-1,1]){
        ctx.beginPath();
        ctx.moveTo(cx+offset*10,cy-18);
        ctx.lineTo(cx+offset*(15+pulse),cy-8);
        ctx.lineTo(cx+offset*9,cy+1);
        ctx.lineTo(cx+offset*(14-pulse),cy+11);
        ctx.stroke();
      }

      ctx.restore();
    }

    if(state.playerDead){
      const fade=clamp(state.deathTimer/PLAYER_DEATH_DELAY,0,1);
      ctx.save();
      ctx.globalAlpha=.25+.45*fade;
      ctx.strokeStyle='rgba(114,213,233,.70)';
      ctx.beginPath();
      ctx.arc(cx,cy,18+(1-fade)*22,0,Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }
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

        if(e.selfDestruct){
          const progress=clamp(1-e.selfDestructTimer/DRONE_WINDUP_SECONDS,0,1);
          const pulse=5+Math.sin(performance.now()*.028)*2;

          ctx.beginPath();
          ctx.arc(e.x+e.w*.5,e.y+e.h*.5,14+pulse+progress*4,0,Math.PI*2);
          ctx.strokeStyle='rgba(255,111,76,'+(0.38+progress*.52).toFixed(2)+')';
          ctx.lineWidth=2;
          ctx.stroke();

          ctx.fillStyle='rgba(255,232,117,'+(0.18+progress*.55).toFixed(2)+')';
          ctx.fillRect(e.x+e.w*.5-2,e.y+3,4,e.h-6);
        }
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

        if((e.rumbleFlash||0)>0){
          ctx.fillStyle='rgba(255,232,117,.72)';
          ctx.fillRect(e.x+2,e.y+e.h-6,e.w-4,3);
        }
      }

      if(e.maxHp>1){
        ctx.fillStyle='rgba(255,255,255,.16)';
        ctx.fillRect(e.x,e.y-7,e.w,3);
        ctx.fillStyle=e.accent;
        ctx.fillRect(e.x,e.y-7,e.w*(e.hp/e.maxHp),3);
      }
    }
  };

  const drawEnemyTraps = () => {
    for(const trap of state.enemyTraps){
      if(trap.mode==='projectile'){
        const cx=trap.x+trap.w*.5;
        const cy=trap.y+trap.h*.5;

        ctx.save();
        ctx.strokeStyle='rgba(185,140,255,.24)';
        ctx.lineWidth=1.5;
        ctx.beginPath();
        ctx.moveTo(trap.px+trap.w*.5,trap.py+trap.h*.5);
        ctx.lineTo(cx,cy);
        ctx.stroke();

        ctx.translate(cx,cy);
        ctx.rotate(trap.phase);
        ctx.fillStyle='rgba(185,140,255,.82)';
        ctx.fillRect(-5,-3,10,6);
        ctx.strokeStyle='rgba(224,207,255,.92)';
        ctx.strokeRect(-5.5,-3.5,11,7);
        ctx.restore();
        continue;
      }

      const armed=trap.arm<=0;
      const pulse=.55+Math.sin(trap.phase*2)*.18;

      ctx.save();
      ctx.fillStyle=armed?'rgba(185,140,255,.26)':'rgba(185,140,255,.10)';
      ctx.fillRect(trap.x,trap.y,trap.w,trap.h);

      ctx.strokeStyle=armed?'rgba(185,140,255,.88)':'rgba(185,140,255,.35)';
      ctx.lineWidth=1.5;
      ctx.strokeRect(trap.x+.5,trap.y+.5,trap.w-1,trap.h-1);

      if(armed){
        ctx.strokeStyle='rgba(215,191,255,'+pulse.toFixed(2)+')';
        ctx.beginPath();
        ctx.moveTo(trap.x+3,trap.y+1);
        ctx.lineTo(trap.x+10,trap.y-7);
        ctx.lineTo(trap.x+16,trap.y+1);
        ctx.lineTo(trap.x+23,trap.y-8);
        ctx.lineTo(trap.x+30,trap.y+1);
        ctx.lineTo(trap.x+35,trap.y-5);
        ctx.stroke();
      }

      ctx.restore();
    }
  };

  const drawEnemyEffects = () => {
    for(const effect of state.enemyEffects){
      const t=clamp(effect.age/effect.duration,0,1);

      if(effect.type==='explosion'){
        const radius=lerp(10,effect.radius,t);
        ctx.save();
        ctx.globalAlpha=1-t;

        ctx.beginPath();
        ctx.arc(effect.x,effect.y,radius,0,Math.PI*2);
        ctx.strokeStyle='#ff8758';
        ctx.lineWidth=3;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(effect.x,effect.y,radius*.55,0,Math.PI*2);
        ctx.strokeStyle='rgba(255,232,117,.78)';
        ctx.lineWidth=2;
        ctx.stroke();

        ctx.restore();
      }else if(effect.type==='rumble'){
        ctx.save();
        ctx.globalAlpha=1-t;

        const width=lerp(18,effect.radius,t);
        ctx.strokeStyle='rgba(255,135,88,.82)';
        ctx.lineWidth=3;
        ctx.beginPath();
        ctx.moveTo(effect.x-width,effect.y-2);
        ctx.lineTo(effect.x-width*.45,effect.y-10);
        ctx.lineTo(effect.x,effect.y-3);
        ctx.lineTo(effect.x+width*.45,effect.y-10);
        ctx.lineTo(effect.x+width,effect.y-2);
        ctx.stroke();

        ctx.restore();
      }else if(effect.type==='coreReward' || effect.type==='checkpoint'){
        ctx.save();
        ctx.globalAlpha=1-t;

        const radius=lerp(12,effect.radius,t);
        ctx.beginPath();
        ctx.arc(effect.x,effect.y,radius,0,Math.PI*2);
        ctx.strokeStyle=effect.type==='checkpoint'
          ? 'rgba(114,213,233,.90)'
          : 'rgba(244,215,92,.92)';
        ctx.lineWidth=2.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(effect.x,effect.y,radius*.48,0,Math.PI*2);
        ctx.strokeStyle=effect.type==='checkpoint'
          ? 'rgba(185,236,255,.55)'
          : 'rgba(255,238,140,.58)';
        ctx.lineWidth=1.5;
        ctx.stroke();

        ctx.restore();
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
      const bob=p.falling ? 0 : Math.sin(p.phase)*3;
      const cy=p.y+p.h/2+bob;

      if(p.falling){
        ctx.strokeStyle='rgba(244,215,92,.18)';
        ctx.lineWidth=1.5;
        ctx.beginPath();
        ctx.moveTo(cx,cy-18);
        ctx.lineTo(cx,cy-7);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(cx,cy,9,0,Math.PI*2);
      ctx.fillStyle='#f4d75c';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx,cy,p.falling?17:15,0,Math.PI*2);
      ctx.strokeStyle=p.falling
        ? 'rgba(244,215,92,.52)'
        : 'rgba(244,215,92,.32)';
      ctx.stroke();
    }
  };

  const drawCrosshair = () => {
    const gravityLock=
      isMobileGameplay() &&
      !!state.gravityTarget &&
      state.player.grounded;

    const stroke=gravityLock
      ? 'rgba(114,213,233,.92)'
      : 'rgba(255,255,255,.72)';

    ctx.save();
    ctx.translate(aim.x,aim.y);
    ctx.strokeStyle=stroke;
    ctx.lineWidth=gravityLock ? 1.6 : 1;

    ctx.beginPath();
    ctx.arc(0,0,8,0,Math.PI*2);
    ctx.moveTo(-13,0);ctx.lineTo(-5,0);
    ctx.moveTo(5,0);ctx.lineTo(13,0);
    ctx.moveTo(0,-13);ctx.lineTo(0,-5);
    ctx.moveTo(0,5);ctx.lineTo(0,13);
    ctx.stroke();

    if(gravityLock){
      const pulse=11+Math.sin(performance.now()*.012)*2;
      ctx.beginPath();
      ctx.arc(0,0,pulse,0,Math.PI*2);
      ctx.globalAlpha=.42;
      ctx.stroke();
    }

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

    if(state.playerDead){
      const progress=1-clamp(state.deathTimer/PLAYER_DEATH_DELAY,0,1);
      ctx.fillStyle='rgba(5,9,18,'+(0.10+progress*.34).toFixed(2)+')';
      ctx.fillRect(0,0,W,H);

      ctx.fillStyle='rgba(255,255,255,'+(0.30+progress*.38).toFixed(2)+')';
      ctx.font='700 9px monospace';
      ctx.textAlign='center';
      ctx.fillText(
        state.pendingFullReset ? 'SYSTEM REWIND' : 'RECALIBRATING',
        W/2,
        H/2+64
      );
      ctx.textAlign='left';
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
    drawRoomSections();
    drawFillerSections();
    drawSolids();
    drawStartZone();
    drawCheckpoint();
    drawCombatZones();
    drawEnemySpawners();
    drawDoor();
    drawGoal();
    drawPickups();
    drawEnemyTraps();
    drawEnemies();
    drawEnemyEffects();
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
    updateEnemyEffects(dt);

    const wasDead=state.playerDead;
    if(wasDead) updatePlayerDeath(dt);
    const deathHolding=wasDead || state.playerDead;

    const moving=
      input.left||input.right||input.up||input.down||
      Math.abs(input.moveX)>.06||Math.abs(input.moveY)>.06||
      !state.player.grounded||
      state.actionPulse>0||
      !!state.gravityJump;

    const scale=state.won||deathHolding
      ? 0
      : (state.player.stunned>0 ? 1 : (moving?1:.22));

    if(!state.won && !deathHolding){
      updateGravityCharges(dt);
      updatePlayer(dt);
      updateCombatZones(dt,scale);
      updateDoor(dt,scale);
      updateEnemies(dt,scale);
      updatePickups(dt,scale);
      updateBullets(dt,scale);
    }

    updateCamera(dt);
    positionAimFromStick(dt);
    updateHud(scale);
    render(scale);
    state.raf=requestAnimationFrame(frame);
  };

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

  jumpButton?.addEventListener('pointerdown',event=>{
    if(!state.active || state.paused) return;
    event.preventDefault();
    jump();
    navigator.vibrate?.(7);
  });

  gravityJumpButton?.addEventListener('pointerdown',event=>{
    if(!state.active || state.paused) return;
    event.preventDefault();
    gravityJump();
    navigator.vibrate?.(10);
  });

  fireButton?.addEventListener('pointerdown',event=>{
    if(state.paused) return;
    event.preventDefault();

    const shotTarget=resolveMobileShotTarget(aim.x,aim.y);
    fireToward(shotTarget.x,shotTarget.y);
    navigator.vibrate?.(8);
  });

  const applyStickDeadzone = (x,y,dead=.14,exponent=1) => {
    const mag=Math.hypot(x,y);
    if(mag<=dead) return {x:0,y:0,mag:0};

    const linear=clamp((mag-dead)/(1-dead),0,1);
    const scaled=Math.pow(linear,exponent);
    const nx=x/(mag||1);
    const ny=y/(mag||1);
    return {x:nx*scaled,y:ny*scaled,mag:scaled};
  };

  const setupStick = (element,knob,onMove,onEnd,options={}) => {
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
      last=applyStickDeadzone(
        rawX,
        rawY,
        options.deadzone ?? .14,
        options.exponent ?? 1
      );
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

  const aimStickState={
    active:false,
    targetX:1,
    targetY:0,
    currentX:1,
    currentY:0,
    mag:0
  };

  const positionAimFromStick = (dt=0,snap=false) => {
    if(!aimStickState.active) return;

    const rate=18+aimStickState.mag*18;
    const alpha=snap ? 1 : (1-Math.exp(-Math.max(0,dt)*rate));

    aimStickState.currentX=lerp(
      aimStickState.currentX,
      aimStickState.targetX,
      alpha
    );
    aimStickState.currentY=lerp(
      aimStickState.currentY,
      aimStickState.targetY,
      alpha
    );

    const dirLen=Math.hypot(
      aimStickState.currentX,
      aimStickState.currentY
    )||1;

    aimStickState.currentX/=dirLen;
    aimStickState.currentY/=dirLen;

    aim.dx=aimStickState.currentX;
    aim.dy=aimStickState.currentY;

    const pcx=state.player.x+state.player.w*.5;
    const pcy=state.player.y+state.player.h*.5;

    const reach=175+aimStickState.mag*335;
    aim.x=pcx+aim.dx*reach;
    aim.y=pcy+aim.dy*reach;
    aim.active=true;
    aim.source='stick';
  };

  const setAimStickTarget = (x,y,mag,snap=false) => {
    if(mag<=.01) return;

    const len=Math.hypot(x,y)||1;
    const wasActive=aimStickState.active;

    aimStickState.targetX=x/len;
    aimStickState.targetY=y/len;
    aimStickState.mag=mag;
    aimStickState.active=true;

    mobileAssist.rawX=aimStickState.targetX;
    mobileAssist.rawY=aimStickState.targetY;
    mobileAssist.mag=mag;

    if(!wasActive || snap){
      aimStickState.currentX=aimStickState.targetX;
      aimStickState.currentY=aimStickState.targetY;
    }

    positionAimFromStick(0,snap || !wasActive);
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
      if(mag<.015) return;

      setAimStickTarget(x,y,mag,false);
      aimStick?.classList.toggle('is-armed',mag>.20);
    },
    (x,y,mag)=>{
      aimStick?.classList.remove('is-armed');

      // The right stick only defines direction. Fire and gravity jump use
      // the dedicated left-side buttons, so releasing aim never triggers an action.
      if(mag>.015) setAimStickTarget(x,y,mag,true);

      aimStickState.active=false;
      mobileAssist.mag=0;
      mobileAssist.hiddenShotTarget=null;
    },
    {
      deadzone:.085,
      exponent:1.42
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