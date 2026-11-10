
(()=>{'use strict';
  const layer=document.getElementById('v82LibraryLayer');
  const home=document.getElementById('v82LibraryHome');
  const player=document.getElementById('v82LibraryPlayer');
  const frame=document.getElementById('v82BlackjackFrame');
  const back=document.getElementById('v82LibraryBack');
  const title=document.getElementById('v82LibraryTitle');
  const subtitle=document.getElementById('v82LibrarySubtitle');
  const trigger=document.getElementById('v82OpenLibrary');
  const keys=['lumina-blackjack-v1','lumina-blackjack-v1-labor-progress-v10'];
  const fallback=Object.create(null);
  const gameURL=new URL("library/blackjack/index.html",document.baseURI).href;
  let lastFocus=null;
  let opened=false;
  function readLocal(key){try{return localStorage.getItem(key)}catch(_){return fallback[key]||null}}
  function writeLocal(key,value){try{localStorage.setItem(key,value)}catch(_){fallback[key]=value}}
  function deleteLocal(key){try{localStorage.removeItem(key)}catch(_){delete fallback[key]}}
  function seed(){const values=Object.create(null);for(const key of keys){const val=readLocal(key);if(typeof val==='string')values[key]=val;}return values;}
  function homeView(){
    opened=false;
    player.hidden=true;
    frame.removeAttribute('src');
    home.hidden=false;
    back.hidden=true;
    title.textContent='Library';subtitle.textContent='Your collection';
  }
  function openLibrary(){
    lastFocus=document.activeElement;
    layer.hidden=false;
    homeView();
    try{document.getElementById('mobileShade')?.click()}catch(_){}
    document.getElementById('v82BlackjackOpen').focus();
  }
  function closeLibrary(){
    homeView();layer.hidden=true;
    if(lastFocus&&typeof lastFocus.focus==='function')lastFocus.focus();
  }
  function play(){
    opened=true;
    home.hidden=true;
    player.hidden=false;
    back.hidden=false;
    title.textContent='Blackjack';subtitle.textContent='Virtual table';
    frame.src=gameURL;
    back.focus();
  }
  trigger.addEventListener('click',openLibrary);
  document.getElementById('v82BlackjackOpen').addEventListener('click',play);
  document.getElementById('v82LibraryClose').addEventListener('click',closeLibrary);
  back.addEventListener('click',homeView);
  document.addEventListener('keydown',e=>{
    if(layer.hidden)return;
    if(e.key==='Escape' && !opened){e.preventDefault();closeLibrary();}
  });
  window.addEventListener('message',e=>{
    if(layer.hidden||!opened||e.source!==frame.contentWindow)return;
    const d=e.data;
    if(!d)return;
    if(d.type==='lumina-v83-library-ready'){
      try{frame.contentWindow.postMessage({type:'lumina-v83-library-seed',values:seed()},'*');}catch(_){}
      return;
    }
    if(d.type!=='lumina-v83-library-storage'||!keys.includes(d.key))return;
    if(d.action==='set'&&typeof d.value==='string'&&d.value.length<250000)writeLocal(d.key,d.value);
    if(d.action==='remove')deleteLocal(d.key);
  });
  window.luminaLibrary={open:openLibrary,back:homeView,close:closeLibrary};
  document.documentElement.dataset.luminaV83Ready='yes';
})();
