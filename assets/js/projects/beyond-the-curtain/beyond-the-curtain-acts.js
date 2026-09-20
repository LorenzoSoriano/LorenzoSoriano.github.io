(() => {
  const root=document.querySelector('[data-beyond-act-tabs]');
  if(!root) return;

  const tabs=[...root.querySelectorAll('[data-beyond-act-tab]')];
  const panels=[...root.querySelectorAll('[data-beyond-act-panel]')];

  const activate=(value,{focus=false}={})=>{
    const id=String(value);

    tabs.forEach(tab=>{
      const active=tab.dataset.beyondActTab===id;
      tab.classList.toggle('is-active',active);
      tab.setAttribute('aria-selected',active?'true':'false');
      tab.tabIndex=active?0:-1;
      if(active && focus) tab.focus({preventScroll:true});
    });

    panels.forEach(panel=>{
      const active=panel.dataset.beyondActPanel===id;
      panel.hidden=!active;
      panel.classList.toggle('is-active',active);
    });

    root.dataset.activeAct=id;
  };

  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>{
      activate(tab.dataset.beyondActTab);
    });

    tab.addEventListener('keydown',event=>{
      let next=null;

      if(event.key==='ArrowRight' || event.key==='ArrowDown'){
        next=(index+1)%tabs.length;
      }else if(event.key==='ArrowLeft' || event.key==='ArrowUp'){
        next=(index-1+tabs.length)%tabs.length;
      }else if(event.key==='Home'){
        next=0;
      }else if(event.key==='End'){
        next=tabs.length-1;
      }

      if(next===null) return;
      event.preventDefault();
      activate(tabs[next].dataset.beyondActTab,{focus:true});
    });
  });

  activate(
    root.querySelector('[data-beyond-act-tab].is-active')?.dataset.beyondActTab || '1'
  );
})();