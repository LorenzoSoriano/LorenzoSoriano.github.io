(() => {
  if (window.ContactBrickTouchControls) return;

  const state = {
    active:false,
    pointerId:null,
    currentX:0,
    targetX:0,
    lastTime:0,
    raf:0
  };

  function gameRoot(){
    return document.querySelector('.brick-egg-layer');
  }

  function isTouchPointer(event){
    return event.pointerType === 'touch' || (event.pointerType === 'pen' && matchMedia('(pointer:coarse)').matches);
  }

  function emitThumbPosition(x){
    const root=gameRoot();
    if(!root) return;
    const safeX=Math.max(0,Math.min(window.innerWidth,x));
    const event=new PointerEvent('pointerdown',{
      bubbles:false,
      cancelable:false,
      pointerType:'touch',
      clientX:safeX,
      clientY:Math.max(0,window.innerHeight-34),
      isPrimary:true
    });
    root.dispatchEvent(event);
  }

  function frame(time){
    if(!state.active){state.raf=0;return}
    const dt=Math.min(.05,Math.max(.001,(time-state.lastTime)/1000||.016));
    state.lastTime=time;

    // Critically smooth the paddle toward the thumb instead of snapping every frame.
    const alpha=1-Math.exp(-dt/.045);
    state.currentX+=(state.targetX-state.currentX)*alpha;
    if(Math.abs(state.targetX-state.currentX)<.12)state.currentX=state.targetX;
    emitThumbPosition(state.currentX);
    state.raf=requestAnimationFrame(frame);
  }

  function startLoop(){
    if(state.raf)return;
    state.lastTime=performance.now();
    state.raf=requestAnimationFrame(frame);
  }

  document.addEventListener('pointerdown',event=>{
    if(!event.isTrusted||!isTouchPointer(event))return;
    const root=gameRoot();
    if(!root||!root.contains(event.target))return;
    state.active=true;
    state.pointerId=event.pointerId;
    state.currentX=event.clientX;
    state.targetX=event.clientX;
    startLoop();
  },{capture:true,passive:true});

  document.addEventListener('pointermove',event=>{
    if(!event.isTrusted||!state.active||event.pointerId!==state.pointerId||!isTouchPointer(event))return;
    state.targetX=event.clientX;
  },{capture:true,passive:true});

  function finish(event){
    if(!state.active)return;
    if(event?.pointerId!=null&&event.pointerId!==state.pointerId)return;
    state.active=false;
    state.pointerId=null;
  }

  document.addEventListener('pointerup',finish,{capture:true,passive:true});
  document.addEventListener('pointercancel',finish,{capture:true,passive:true});

  window.ContactBrickTouchControls={stop:()=>finish()};
})();
