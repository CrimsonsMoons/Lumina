
(()=>{'use strict';
  const mask=document.getElementById('luminaShield');
  let manualCover=false,autoCover=false,idleCover=false;
  const IDLE_MS=2*60*1000;
  let idleTimer=null;
  function paint(){
    mask.hidden=!(manualCover||autoCover||idleCover);
    document.documentElement.classList.toggle('lumina-auto-covered',autoCover&&!manualCover&&!idleCover);
  }
  function resetIdle(){
    if(idleTimer)clearTimeout(idleTimer);
    // Do not unlock a privacy cover just because a key was pressed or mouse moved.
    if(!idleCover)idleTimer=setTimeout(()=>{if(!document.hidden && document.hasFocus()){
      idleCover=true;paint();document.getElementById('unshieldBtn').focus();
    }},IDLE_MS);
  }
  const cover=()=>{manualCover=true;paint();document.getElementById('unshieldBtn').focus();};
  const uncover=()=>{manualCover=false;idleCover=false;paint();resetIdle();document.getElementById('shieldBtn').focus();};
  function syncAutoCover(){
    autoCover=document.hidden||!document.hasFocus();
    paint();
    if(!autoCover)resetIdle();
  }
  document.getElementById('shieldBtn').addEventListener('click',cover);
  document.getElementById('unshieldBtn').addEventListener('click',uncover);
  document.addEventListener('keydown',e=>{
    if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='l'){
      e.preventDefault();manualCover?uncover():cover();
    }
  });
  document.addEventListener('visibilitychange',syncAutoCover);
  window.addEventListener('blur',syncAutoCover);
  window.addEventListener('focus',()=>setTimeout(syncAutoCover,0));
  for(const ev of ['pointerdown','pointermove','keydown','touchstart','scroll']){
    window.addEventListener(ev,()=>{if(!idleCover)resetIdle()},{passive:true});
  }
  resetIdle();
  // A privacy overlay cannot stop installed spyware or malicious browser extensions.
})();
