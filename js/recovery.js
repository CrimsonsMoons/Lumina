
(()=>{'use strict';
  const STORAGE='lumina_recovery_v1',ITERATIONS=210000;
  const $=id=>document.getElementById(id);
  const dialog=$('recoveryDialog'),status=$('recoveryState'),openButton=$('recoveryBtn');
  const input=$('recoveryPassphrase'),confirmInput=$('recoveryConfirm'),confirmWrap=$('recoveryConfirmWrap');
  const primary=$('recoveryPrimary'),lock=$('recoveryLock'),erase=$('recoveryErase'),feedback=$('recoveryFeedback');
  let key=null,salt=null,timer=null,serial=Promise.resolve(),epoch=0;
  const encode=new TextEncoder(),decode=new TextDecoder();
  const to64=bytes=>btoa(String.fromCharCode(...bytes));
  const from64=str=>Uint8Array.from(atob(str),ch=>ch.charCodeAt(0));
  function stored(){try{const x=JSON.parse(localStorage.getItem(STORAGE)||'null');return x&&x.v===1&&x.salt&&x.iv&&x.data?x:null;}catch(_){return null;}}
  function update(){const has=!!stored(),active=!!key;status.textContent=active?'On':has?'Locked':'Off';
    openButton.title=active?'Encrypted recovery is enabled on this tab':has?'Encrypted backup available—unlock to restore':'Enable opt-in encrypted recovery';}
  async function derive(pass,s){const km=await crypto.subtle.importKey('raw',encode.encode(pass),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt:s,iterations:ITERATIONS,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
  function schedule(){if(!key||!salt)return;clearTimeout(timer);timer=setTimeout(()=>{const generation=epoch;serial=serial.then(()=>write(generation)).catch(()=>{});},650);}
  async function write(generation=epoch){if(!key||!salt||generation!==epoch)return;
    const bridge=window.luminaRecoveryBridge;if(!bridge)return;
    const json=JSON.stringify(bridge.snapshot({includeHistory:false}));if(json.length>1200000){feedback.textContent='Backup too large. Export old conversations and clear unused chats.';return;}
    const iv=crypto.getRandomValues(new Uint8Array(12));const cypher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encode.encode(json));
    if(generation!==epoch||!key)return;
    try{localStorage.setItem(STORAGE,JSON.stringify({v:1,salt:to64(salt),iv:to64(iv),data:to64(new Uint8Array(cypher)),at:Date.now()}));update();}
    catch(_){feedback.textContent='Backup unavailable: browser storage is full or disabled.';}
  }
  function mode(){const has=!!stored(),active=!!key;
    confirmWrap.hidden=has;primary.hidden=active;primary.textContent=has?'Unlock & restore':'Enable encrypted backup';
    lock.hidden=!active;erase.hidden=!has;
    $('recoveryDescription').textContent=active?'Encrypted backup is active. Text changes are saved automatically. Lock the backup when you finish.':has?'An encrypted recovery backup exists on this browser. Enter its passphrase to restore.':'Choose a passphrase to protect an opt-in backup of your current text chats and drafts.';
    input.value='';confirmInput.value='';input.disabled=active;feedback.textContent='';
    if(!dialog.open)dialog.showModal();if(!active)input.focus();
  }
  async function enable(){const pass=input.value;if(pass.length<12){feedback.textContent='Use a passphrase of at least 12 characters.';return;}
    if(!stored()&&pass!==confirmInput.value){feedback.textContent='Passphrases do not match.';return;}
    primary.disabled=true;feedback.textContent='Preparing encryption…';
    try{
      const existing=stored();const s=existing?from64(existing.salt):crypto.getRandomValues(new Uint8Array(16));
      const k=await derive(pass,s);
      if(existing){
        let plain;try{plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(existing.iv)},k,from64(existing.data));}
        catch(_){throw Error('Incorrect passphrase or unreadable backup.');}
        const snapshot=JSON.parse(decode.decode(plain));
        const current=window.luminaRecoveryBridge?.snapshot();
        const nonempty=Boolean(current?.draft?.trim()||current?.prompt?.trim()||current?.chats?.some(c=>c.messages?.length));
        if(nonempty&&!confirm('Restore the saved session? It will replace the current unsaved workspace text.'))return;
        window.luminaRecoveryBridge.restore(snapshot);
        feedback.textContent='Encrypted session restored. Backups are now active.';
      }else{feedback.textContent='Encrypted recovery enabled. Remember your passphrase.';}
      key=k;salt=s;epoch++;await write(epoch);update();input.value='';confirmInput.value='';mode();
      feedback.textContent=existing?'Saved session restored. Encrypted backups are active.':'Encrypted backup created. Changes will save automatically.';
    }catch(err){feedback.textContent=err?.message||'Unable to enable recovery.';}
    finally{primary.disabled=false;}
  }
  function lockBackup(){clearTimeout(timer);epoch++;key=null;salt=null;update();mode();feedback.textContent='Backup locked. Re-enter your passphrase to restore.';}
  function wipe(){clearTimeout(timer);epoch++;key=null;salt=null;try{localStorage.removeItem(STORAGE);}catch(_){}update();}
  function deleteBackup(){if(!confirm('Delete the encrypted recovery backup from this browser? This cannot be undone.'))return;wipe();mode();feedback.textContent='Encrypted backup deleted.';}
  openButton.addEventListener('click',mode);primary.addEventListener('click',enable);lock.addEventListener('click',lockBackup);erase.addEventListener('click',deleteBackup);
  $('recoveryClose').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{input.value='';confirmInput.value='';});
  $('promptInput').addEventListener('input',schedule);
  $('recoveryPassphrase').addEventListener('keydown',e=>{if(e.key==='Enter'&&!primary.hidden)enable();});
  window.luminaEncryptedRecovery={schedule,wipe};update();
  // Browser termination is not interceptable; snapshots are written during normal editing.
})();
