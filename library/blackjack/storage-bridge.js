// Lumina V83 storage adapter. The sandbox never receives parent DOM or storage access.
'use strict';
const LuminaLibraryStorage = (()=>{
  const known = new Set(['lumina-blackjack-v1','lumina-blackjack-v1-labor-progress-v10']);
  const embedded = window.parent !== window;
  const data = Object.create(null);
  let started = false;
  const base = new URL('.',document.currentScript.src).href;
  function send(action,key,value){
    if(!embedded || !known.has(key))return;
    try{window.parent.postMessage({type:'lumina-v83-library-storage',action,key,value},'*')}catch(_){}
  }
  function store(){try{return window.localStorage}catch(_){return null}}
  const api={
    getItem(key){
      if(!known.has(key))return null;
      if(embedded)return Object.hasOwn(data,key)?data[key]:null;
      try{return store()?.getItem(key)??null}catch(_){return null}
    },
    setItem(key,value){
      if(!known.has(key))return;
      const val=String(value);
      if(embedded){data[key]=val;send('set',key,val)}
      else{try{store()?.setItem(key,val)}catch(_){}}
    },
    removeItem(key){
      if(!known.has(key))return;
      if(embedded){delete data[key];send('remove',key)}
      else{try{store()?.removeItem(key)}catch(_){}}
    }
  };
  async function start(){
    if(started)return;
    started=true;
    for(const name of ['ui-layout.js','blackjack.js']){
      await new Promise((resolve,reject)=>{
        const script=document.createElement('script');script.src=base+name;script.async=false;
        script.onload=resolve;script.onerror=()=>reject(Error('Could not load '+name));
        document.body.append(script);
      });
    }
    document.documentElement.dataset.luminaBlackjackReady='yes';
  }
  if(embedded){
    window.addEventListener('message',event=>{
      if(event.source!==window.parent||event.data?.type!=='lumina-v83-library-seed')return;
      for(const key of known){
        const value=event.data.values?.[key];
        if(typeof value==='string')data[key]=value;
      }
      start().catch(error=>{document.body.dataset.loadError=error.message;console.error(error)});
    });
    window.parent.postMessage({type:'lumina-v83-library-ready'},'*');
  }else{
    start().catch(error=>{document.body.dataset.loadError=error.message;console.error(error)});
  }
  return api;
})();
