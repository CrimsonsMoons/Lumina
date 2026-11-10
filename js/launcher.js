
    // GEMINI KEY: reversible obfuscation for convenience only, NOT secure encryption.
    // WARNING: anyone can recover the key from a public GitHub Pages site.
    // A configured API key is included for personal use; public HTML cannot keep a key secret.
    const OBFUSCATED_GEMINI_KEY = "";
    function decodeObfuscatedKey(){
      const encodedBytes=atob(OBFUSCATED_GEMINI_KEY);
      let result='';
      for(let i=0;i<encodedBytes.length;i++){
        const mask=(157 + 29*i + ((i*i)%251)) & 255;
        result+=String.fromCharCode(encodedBytes.charCodeAt(i)^mask);
      }
      return result;
    }
    const MY_GEMINI_API_KEY = typeof window.LUMINA_PERSONAL_KEY==='string' ? window.LUMINA_PERSONAL_KEY : decodeObfuscatedKey();
  // Workspace is now a separate hosted HTML document.

  let cachedAppSource=null;
  let sourcePromise=null;
  function prefetchApp(){
    if(sourcePromise)return sourcePromise;
    sourcePromise=fetch(new URL('workspace/index.html',document.baseURI),{cache:'no-cache'})
      .then(response=>{if(!response.ok)throw Error('Could not load workspace: HTTP '+response.status);return response.text()})
      .then(html=>{if(!html.includes('id="promptInput"'))throw Error('Workspace HTML incomplete');cachedAppSource=html;return html})
      .catch(error=>{sourcePromise=null;throw error});
    return sourcePromise;
  }
  prefetchApp().catch(()=>{});
  function decodeApp(){
    if(cachedAppSource!==null)return cachedAppSource;
    throw Error('Workspace is loading. Try again after the files finish downloading.');
  }
  function configuredKey(){
    const value=typeof MY_GEMINI_API_KEY==='string'?MY_GEMINI_API_KEY.trim():'';
    return value && value!=='PASTE_YOUR_GEMINI_API_KEY_HERE'?value:'';
  }
  function key(){return document.getElementById('geminiKey').value.trim()||configuredKey();}
  function appHTML(){
    let html=decodeApp();
    const baseURL=new URL('./',location.href).href;
    html=html.replace('<base href="../">','<base href="'+baseURL.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'">');
    const preset=key();
    const marker='const HTML_GEMINI_API_KEY = "PASTE_YOUR_GEMINI_API_KEY_HERE";';
    if(!html.includes(marker))throw Error('Lumina app configuration missing.');
    const encoded=JSON.stringify(preset).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
    html=html.replace(marker,'const HTML_GEMINI_API_KEY = '+encoded+';');
    // Persist the user's launch choice before the workspace loads.
    const privateFlag=document.getElementById('privateMode').checked?'1':'0';
    html=html.replace('</head>',"<script>try{localStorage.setItem('lumina_privacy_mode_v2','"+privateFlag+"')}catch(e){}<\/script></head>");
    // In-app escape hatch: auto-launch opens a second tab, so the user
    // must still be able to turn it OFF from inside the running workspace.
    // Add one small control beside the existing floating-chat settings.
    const autoSettingScript=`<script>(function(){
      const pref='lumina_launcher_auto_blank_v833';
      function init(){
        const anchor=document.getElementById('pipPopoutSideBtn');
        if(!anchor||document.getElementById('autoBlankAppBtn'))return;
        const btn=document.createElement('button');
        btn.type='button';btn.id='autoBlankAppBtn';btn.className='side-help';
        function refresh(){
          let on=false;
          try{on=localStorage.getItem(pref)==='1'}
          catch(_){
            btn.textContent='Auto-open preference unavailable (storage blocked)';
            btn.disabled=true;
            btn.title='This browser session does not allow local storage; automatic launch preferences cannot be saved.';
            return;
          }
          btn.textContent='↗ Auto-open about:blank: '+(on?'On':'Off');
          btn.setAttribute('aria-pressed',String(on));
          btn.title='Attempt to open an about:blank workspace on your next visit. Default is off; browsers may block automatic pop-ups.';
        }
        btn.addEventListener('click',()=>{
          try{localStorage.setItem(pref,btn.getAttribute('aria-pressed')==='true'?'0':'1')}catch(_){}
          refresh();
        });
        anchor.before(btn);refresh();
      }
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
      else init();
    })();<\/script>`;
    html=html.replace('</body>',autoSettingScript+'</body>');
    return html;
  }

  // V27: the HTTPS launcher itself owns a complete Lumina Document PiP.
  // No intermediate about:blank popup, cross-window message relay, or extension.
  // Browser policies still govern whether the API is available, and this window
  // cannot survive closing or navigating away from the launcher.
  let standalonePip=null;
  let standalonePipOpening=false;
  function mountStandaloneLumina(win){
    const d=win.document;
    const parsed=new DOMParser().parseFromString(appHTML(),'text/html');
    d.documentElement.lang='en';
    // Avoid document.open/document.write inside a browser-owned PiP document:
    // import the markup and explicitly recreate scripts so they execute in the
    // correct realm and in document order.
    d.head.replaceChildren();
    d.body.replaceChildren();
    function appendClones(target,source){
      for(const node of Array.from(source.childNodes)){
        if(node.nodeType===1 && node.tagName==='SCRIPT'){
          const script=d.createElement('script');
          for(const a of node.attributes)script.setAttribute(a.name,a.value);
          script.textContent=node.textContent;
          target.append(script);
        }else{target.append(d.importNode(node,true));}
      }
    }
    appendClones(d.head,parsed.head);
    appendClones(d.body,parsed.body);
    const css=d.createElement('style');
    css.textContent='#pipComposerBtn,#pipTopBtn,#pipSideBtn,#pipPopoutSideBtn{display:none!important}';
    d.head.append(css);
    d.title='Lumina floating workspace';
    if(typeof win.luminaFloatingChat?.hostSnapshot!=='function')
      throw Error('Lumina did not initialize inside the floating window.');
  }
  function openLauncherFullPopout(reason=''){
    const status=document.getElementById('status');let win;
    try{win=window.open('about:blank','lumina-main-workspace','popup=yes,width=1120,height=780,scrollbars=yes,resizable=yes');}
    catch(e){console.warn('Full Lumina pop-out blocked:',e);}
    if(!win){status.textContent=(reason?reason+' ':'')+'Popup blocked. Allow pop-ups for this site, then click Float Lumina over tabs again.';return false;}
    try{win.document.open();win.document.write(appHTML());win.document.close();win.focus();
      status.textContent=(reason?reason+' ':'')+'The full Lumina workspace opened in a regular window. It cannot be guaranteed always-on-top; keep the launcher open.';
      return true;
    }catch(e){status.textContent='Full workspace pop-out failed: '+(e?.message||String(e));try{win.close()}catch(_){}return false;}
  }
  async function openStandalonePip(){
    const button=document.getElementById('quickPip');
    const status=document.getElementById('status');
    if(standalonePipOpening)return;
    if(standalonePip && !standalonePip.closed){
      status.textContent='Floating Lumina is already open. Use its window above your other tabs.';
      try{standalonePip.focus()}catch(_){}
      return;
    }
    if(!window.isSecureContext || typeof window.documentPictureInPicture?.requestWindow!=='function'){
      openLauncherFullPopout('Native Picture-in-Picture is not available here.');
      return;
    }
    standalonePipOpening=true;
    button.disabled=true;
    let win;
    try{
      // Request the window immediately in the click handler to retain browser
      // transient activation. Do not await initialization before this request.
      win=await window.documentPictureInPicture.requestWindow({width:470,height:640,disallowReturnToOpener:true});
      if(!win || win.closed)throw Error('The browser returned a closed floating window.');
      standalonePip=win;
      const started=Date.now();
      win.addEventListener('pagehide',()=>{
        if(standalonePip===win)standalonePip=null;
        const secs=((Date.now()-started)/1000).toFixed(1);
        status.textContent='Floating Lumina closed after '+secs+'s. To reopen it, click Float Lumina over tabs. The launcher must remain open.';
      },{once:true});
      mountStandaloneLumina(win);
      status.textContent='Floating Lumina is open. You can switch tabs; leave this launcher open to keep the floating workspace alive.';
    }catch(e){
      const detail=(e?.name||'Error')+': '+(e?.message||'No details from browser');
      status.textContent='Native Picture-in-Picture could not open ('+detail+'). You can retry Float Lumina over tabs to use the full-window fallback if native PiP is unavailable.';
      // RequestWindow may have used the transient activation: try the pop-out,
      // and show the retry instruction if the browser blocks it.
      if(!win || win.closed)openLauncherFullPopout('Native PiP rejected.');
      if(win && !win.closed){
        try{win.document.body.textContent='Lumina could not initialize: '+detail;}catch(_){}
      }
    }finally{button.disabled=false;standalonePipOpening=false;}
  }
  document.getElementById('quickPip').addEventListener('click',openStandalonePip);
  function updateKey(){
    const k=configuredKey();
    if(k){document.getElementById('geminiKey').value=k;document.getElementById('keyInfo').textContent='Key loaded from this HTML. It can be extracted from public source code; replace it before publishing.';document.getElementById('status').textContent='Preconfigured key detected — launcher ready.';}
  }
  updateKey();
  document.getElementById('keyInfo').textContent='Enter your personal Gemini API key. It stays in this browser session unless you choose to save it in Lumina.';
  document.getElementById('wipeLauncher').addEventListener('click',()=>{
    if(!confirm('Clear Lumina local chats, drafts and saved settings for this browser? The API key built into public HTML cannot be erased by this button.'))return;
    try{for(const storage of [localStorage,sessionStorage])for(let i=storage.length-1;i>=0;i--){const key=storage.key(i);if(key && key.startsWith('lumina_'))storage.removeItem(key)}}catch(_){}
    document.getElementById('status').textContent='Locally saved Lumina data cleared. The HTML source was not changed.';
  });
  document.getElementById('toggleKey').addEventListener('click',()=>{const el=document.getElementById('geminiKey');el.type=el.type==='password'?'text':'password';document.getElementById('toggleKey').textContent=el.type==='password'?'Show':'Hide';document.getElementById('toggleKey').setAttribute('aria-pressed',String(el.type==='text'));});
  let blankLuminaWindow=null;
  let blankHostedPip=null;
  let blankPipOpenedAt=0;
  let blankPipOpening=false;
  function setBlankHostMessage(message,level='neutral'){
    const el=document.getElementById('blankHostStatus');
    if(el){el.textContent=message;el.dataset.level=level;el.style.color=level==='bad'?'#f6b4b4':level==='good'?'#bde9d5':'#b8c5c0';}
  }
  function blankReady(){
    try{return !!(blankLuminaWindow && !blankLuminaWindow.closed &&
      typeof blankLuminaWindow.luminaFloatingChat?.hostSnapshot==='function' && typeof blankLuminaWindow.luminaFloatingChat?.hostAction==='function');}
    catch(_){return false;}
  }
  function pipSupport(){
    return {
      secure:!!window.isSecureContext,
      api:typeof window.documentPictureInPicture?.requestWindow==='function',
      launcher:location.protocol==='https:'||location.hostname==='localhost',
      child:blankReady(),
      childClosed:blankLuminaWindow?blankLuminaWindow.closed:null,
      pipOpen:!!(blankHostedPip && !blankHostedPip.closed)
    };
  }
  // Browser policy and feature availability are surfaced, not bypassed.
  function showPipDiagnostics(){
    const s=pipSupport();
    const details=[];
    if(!s.secure)details.push('Launcher is not in a secure browser context');
    if(!s.api)details.push('Document PiP API unavailable or disabled');
    if(!s.child)details.push('Blank Lumina session not connected');
    if(!details.length){
      setBlankHostMessage('Connected. Click Enable floating chat on this launcher. Keep both tabs open; your browser must permit Document PiP.');
    }else{
      setBlankHostMessage('Unavailable: '+details.join(' · ')+'.', 'bad');
    }
  }
  window.luminaHostPiP={
    offer:(child)=>{
      if(child && blankLuminaWindow && child!==blankLuminaWindow)return;
      const tools=document.getElementById('blankHostTools');if(tools)tools.hidden=false;
      showPipDiagnostics();
    },
    diagnostics:pipSupport
  };
  // V24: HTTPS-owned PiP surface. No DOM nodes or event handlers are moved
  // from about:blank, and the API key never moves into this host page.
  function mountStableHostedChat(win){
    const d=win.document;
    const s=d.createElement('style');
    s.textContent=`:root{color-scheme:dark;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
      *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:#151515;color:#eee;overflow:hidden}
      #hostPip{height:100dvh;display:flex;flex-direction:column;min-height:0}
      .lpHead{padding:12px 13px;border-bottom:1px solid #303030;background:#1b1b1b;display:flex;align-items:center;gap:9px}
      .lpSymbol{height:28px;width:28px;background:#f3f3f3;color:#151515;display:grid;place-items:center;border-radius:10px;font-size:20px}
      .lpNames{flex:1;min-width:0}.lpName{font-weight:750;font-size:14px}.lpSub{color:#a7a7a7;font-size:10px;margin-top:2px}
      select{background:#282828;color:#eee;border:1px solid #434343;padding:7px 4px;border-radius:9px;min-width:0;max-width:124px;font-size:11px}
      .lpFeed{flex:1;overflow:auto;min-height:0;padding:15px;overscroll-behavior:contain}
      .lpEntry{margin-bottom:16px;animation:lpIn .17s ease-out both}.lpEntry[data-role=user]{margin-left:25px;background:#292929;border:1px solid #3b3b3b;padding:11px;border-radius:13px}
      .lpFrom{color:#a0a0a0;text-transform:uppercase;letter-spacing:1.2px;font-size:9px;font-weight:700;margin-bottom:5px}
      .lpBody{font-size:12.5px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere;user-select:text}
      .lpFoot{border-top:1px solid #303030;background:#1a1a1a;padding:10px 12px max(12px,env(safe-area-inset-bottom))}
      .lpStat{font-size:10px;color:#b8b8b8;margin:0 0 9px;min-height:12px}.lpStat[data-error=true]{color:#f6acac}
      .lpErr{background:#2a1c1c;color:#ffd3ce;border:1px solid #754646;border-radius:9px;padding:9px;font-size:11px;line-height:1.4;margin-bottom:9px}
      .lpWrite{display:flex;gap:7px;align-items:flex-end}
      #lpInput{resize:none;flex:1;min-width:0;max-height:124px;min-height:54px;background:#242424;color:#fff;border:1px solid #444;border-radius:11px;font:12px/1.5 system-ui,sans-serif;padding:10px;outline:none}
      #lpInput:focus{border-color:#aaa}button{cursor:pointer;font:inherit;border-radius:10px;border:1px solid #474747;background:#292929;color:#eee;padding:9px 11px;font-size:11px;flex:none}
      #lpSend{background:#f1f1f1;color:#101010;border:0;font-weight:750;padding:16px 12px}
      .lpActions{display:flex;gap:6px;justify-content:space-between;margin-top:8px;align-items:center}
      .lpSmall{font-size:10px;color:#bdbdbd}.lpButtons{display:flex;gap:5px;flex-wrap:wrap}
      [hidden]{display:none!important}@keyframes lpIn{from{opacity:.35;transform:translateY(5px)}to{opacity:1;transform:none}}
      @media(prefers-reduced-motion:reduce){*{animation:none!important;scroll-behavior:auto!important}}
    `;
    d.head.append(s);
    d.body.replaceChildren();
    const root=d.createElement('div');root.id='hostPip';
    root.innerHTML=`<header class="lpHead"><div class="lpSymbol" aria-hidden="true">✦</div><div class="lpNames"><div class="lpName">Lumina</div><div class="lpSub">Cross-tab floating chat</div></div><select id="lpMode" aria-label="Response mode"><option value="fast">Fast</option><option value="balanced">Balanced</option><option value="think">Deep Think</option><option value="search">Web Search</option><option value="research">Deep Research</option></select></header>
      <main class="lpFeed" id="lpFeed" role="log" aria-label="Conversation"><p class="lpSmall">Connecting to your blank-mode chat…</p></main>
      <footer class="lpFoot"><p class="lpStat" id="lpStatus">Connecting…</p><div class="lpErr" id="lpError" hidden><span id="lpErrorText"></span><div class="lpButtons"><button id="lpRetry">Retry</button><button id="lpRetryPlain">No web search</button></div></div>
      <div class="lpWrite"><textarea id="lpInput" placeholder="Ask Lumina anything…" aria-label="Message" spellcheck="true"></textarea><button id="lpSend">Send</button></div>
      <div class="lpActions"><div class="lpButtons"><button id="lpNew">New chat</button><button id="lpShare">Share screen</button></div><button id="lpMain">Main chat ↗</button></div></footer>`;
    d.body.append(root);
    const $=id=>d.getElementById(id);
    const status=$('lpStatus'),feed=$('lpFeed'),inp=$('lpInput');
    let lastSignature='',lastMode='',lastBusy=false;
    const child=()=>{
      try{return blankReady()?blankLuminaWindow.luminaFloatingChat:null}catch(_){return null}
    };
    const action=(type,value)=>{
      try{
        const bridge=child();if(!bridge)throw Error('Blank chat disconnected. Leave both tabs open.');
        const result=bridge.hostAction(type,value);
        if(result?.ok===false)throw Error(result.message||'Action was not accepted.');
        return true;
      }catch(e){status.dataset.error='true';status.textContent=e?.message||'Chat unavailable';return false;}
    };
    const submit=()=>{
      if(lastBusy){action('stop');return;}
      const message=inp.value.trim();if(!message)return;
      if(action('send',message))inp.value='';
    };
    $('lpSend').addEventListener('click',submit);
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();submit();}});
    $('lpMode').addEventListener('change',e=>action('mode',e.target.value));
    $('lpNew').addEventListener('click',()=>action('new'));
    $('lpShare').addEventListener('click',()=>action('share'));
    $('lpRetry').addEventListener('click',()=>action('retry'));
    $('lpRetryPlain').addEventListener('click',()=>action('retryPlain'));
    $('lpMain').addEventListener('click',()=>{try{blankLuminaWindow?.focus()}catch(_){}});
    function sync(){
      let data;
      try{data=child()?.hostSnapshot();}catch(_){data=null}
      if(!data){status.dataset.error='true';status.textContent='Disconnected from blank chat. Keep the original two tabs open.';lastBusy=false;$('lpSend').textContent='Send';return;}
      status.dataset.error='false';status.textContent=data.busy?'● Gemini is responding…':data.sharing?'● Screen sharing is active':'● Connected to blank-mode Lumina';
      lastBusy=!!data.busy;$('lpSend').textContent=data.busy?'Stop':'Send';
      if(data.mode!==lastMode){$('lpMode').value=data.mode||'fast';lastMode=data.mode;}
      $('lpShare').textContent=data.sharing?'Stop sharing':'Share screen';
      $('lpError').hidden=!data.error;
      if(data.error){$('lpErrorText').textContent=data.error.kind==='quota'?'Gemini rate limit: '+data.error.text:data.error.text;}
      const messages=data.messages||[];
      const sig=JSON.stringify([data.chatId,messages]);
      if(sig!==lastSignature){
        const stick=feed.scrollHeight-feed.scrollTop-feed.clientHeight<90;
        const list=d.createDocumentFragment();
        if(!messages.length){const p=d.createElement('p');p.className='lpSmall';p.textContent='Your assistant is ready. Ask anything.';list.append(p);}
        for(const m of messages){
          const el=d.createElement('section');el.className='lpEntry';el.dataset.role=m.role;
          const tag=d.createElement('div');tag.className='lpFrom';tag.textContent=m.role==='user'?'YOU':'LUMINA';
          const body=d.createElement('div');body.className='lpBody';body.textContent=m.content||(m.loading?'Thinking…':'');
          el.append(tag,body);list.append(el);
        }
        feed.replaceChildren(list);if(stick)feed.scrollTop=feed.scrollHeight;
        lastSignature=sig;
      }
    }
    sync();
    const timer=window.setInterval(()=>{if(win.closed){window.clearInterval(timer);return;}sync()},220);
    win.addEventListener('pagehide',()=>{window.clearInterval(timer)},{once:true});
  }

  async function enableBlankHostedPip(){
    const button=document.getElementById('blankHostFloat');
    if(blankPipOpening)return;
    if(blankHostedPip && !blankHostedPip.closed){
      setBlankHostMessage('The floating window is already open. Find the Lumina mini chat above your other windows.','good');
      return;
    }
    const support=pipSupport();
    if(!support.child || !support.secure || !support.api){showPipDiagnostics();return;}
    blankPipOpening=true;button.disabled=true;
    let win;
    try{
      // A user click on the HTTPS host gives requestWindow transient activation.
      win=await window.documentPictureInPicture.requestWindow({width:420,height:590,disallowReturnToOpener:true});
      blankPipOpenedAt=Date.now();
      blankHostedPip=win;
      // Attach close detection *before* installing the chat UI.
      win.addEventListener('pagehide',()=>{
        const elapsed=((Date.now()-blankPipOpenedAt)/1000).toFixed(1);
        if(blankHostedPip===win)blankHostedPip=null;
        const reason=!blankReady()?'The blank chat disconnected.':
          !document.documentElement.isConnected?'The launcher navigated away.':
          'The browser or a close control dismissed the PiP window.';
        setBlankHostMessage('Floating chat closed after '+elapsed+'s. '+reason+' If it closes instantly, check Chrome/Edge Picture-in-Picture permissions or browser policies.','bad');
      },{once:true});
      if(!blankReady()){
        // If the chat disconnects during creation, show an explanation *in the
        // PiP window* instead of immediately calling window.close().
        win.document.body.textContent='Lumina blank-tab session disconnected. Return to the launcher and reopen Lumina.';
        setBlankHostMessage('Floating window opened, but your blank-tab session disconnected. Reopen Lumina in blank mode.','bad');
        return;
      }
      mountStableHostedChat(win);
      // No focus() call and no DOM writes from the blank document. The HTTPS
      // launcher controls this PiP window's entire UI/lifecycle.
      setBlankHostMessage('Floating chat opened by this launcher. You can now switch tabs; keep the launcher and blank chat open.','good');
      // Check for an instant browser closure after the PiP creation promise.
      setTimeout(()=>{
        if(blankHostedPip===win && win.closed){
          blankHostedPip=null;
          setBlankHostMessage('PiP opened but closed immediately. The browser may be restricting this feature. Check Chrome/Edge PiP permissions or managed browser policy.','bad');
        }
      },800);
    }catch(e){
      if(win && !win.closed){
        try{win.document.body.textContent='Lumina could not initialize the floating chat: '+(e?.message||String(e));}catch(_){}
      }
      setBlankHostMessage('Floating chat failed ('+(e?.name||'Error')+'): '+(e?.message||'Browser policy or permission may be blocking PiP.'),'bad');
    }finally{button.disabled=false;blankPipOpening=false;}
  }
  document.getElementById('blankHostFloat').addEventListener('click',enableBlankHostedPip);
  // V35: Safely replace the launcher DOM instead of writing to a document
  // while Chromium may still be parsing the original launcher. This avoids
  // both the blank-page navigation race and the launcher+workspace stacking bug.
  let launchingWorkspace=false;
  async function loadWorkspaceInPlace(){
    if(launchingWorkspace)return false;
    try{await prefetchApp()}catch(error){showLaunchStatus(error.message);return false;}
    const status=document.getElementById('status');
    let parsed;
    try{
      parsed=new DOMParser().parseFromString(appHTML(),'text/html');
      if(!parsed.getElementById('promptInput') || !parsed.querySelector('.app'))
        throw new Error('Workspace markup is incomplete.');
    }catch(error){
      if(status)status.textContent='Could not prepare Lumina: '+error.message;
      return false;
    }
    launchingWorkspace=true;
    try{
      const incoming=document.importNode(parsed.documentElement,true);
      // Root replacement removes the launcher, its styles and its controls.
      // The app gets the complete viewport, not a second section below it.
      document.documentElement.replaceWith(incoming);
      // Scripts imported from DOMParser are inert. Recreate each script in
      // original document order so Lumina initializes after its DOM exists.
      for(const inert of Array.from(document.querySelectorAll('script'))){
        const script=document.createElement('script');
        for(const attr of Array.from(inert.attributes))
          script.setAttribute(attr.name,attr.value);
        if(!inert.hasAttribute('src'))script.textContent=inert.textContent;
        else script.async=false;
        inert.replaceWith(script);
      }
      document.documentElement.dataset.luminaWorkspace='ready';
      return true;
    }catch(error){
      launchingWorkspace=false;
      console.error('Lumina startup failed:',error);
      const target=document.getElementById('status')||document.body;
      if(target)target.textContent='Could not start Lumina: '+error.message;
      return false;
    }
  }
  // V61: A true about:blank document is reliably available only in the
  // NEW browsing context created synchronously by the user's click. There is
  // no same-tab about:blank injection here: `_self` does not create one.
  // V37: about:blank is created synchronously from the user's click.
  // An automatic attempt on page load can be blocked by Chromium even with
  // an existing preference; checkbox activation now launches immediately,
  // so the FIRST visit has a legitimate popup-opening user gesture.
  let blankLuminaPopup=null;
  let blankLaunchGeneration=0;
  const popupBlockedHelp=document.getElementById('popupBlockedHelp');
  const launcherCloseFallback=document.getElementById('launcherCloseFallback');
  function showBlockedHelp(isBlocked){
    if(popupBlockedHelp)popupBlockedHelp.hidden=!isBlocked;
  }
  function showLaunchStatus(message){
    const status=document.getElementById('status');
    if(status)status.textContent=message;
  }

  // V64: Local launch telemetry only. No keys, chat contents or full URLs recorded.
  const launchDebug={version:83.3, attempt:0, events:[], timings:{}, outcome:'not-started', offlineChecks:[], openedVia:'', browser:'',runtimeErrors:0,
    starterClose:{status:'not-attempted',attempts:0,reason:'',afterReadyMs:null}};
  let launchTick=performance.now();
  let lastLaunchStart=launchTick;
  function elapsedMs(from=lastLaunchStart){return Math.max(0,Math.round((performance.now()-from)*10)/10);}
  function scrubDiagnostic(s){return String(s??'').replace(/AIza[0-9A-Za-z_-]+/g,'[REDACTED_KEY]').slice(0,200);}
  function launchEvent(stage,detail=''){
    const at=elapsedMs();
    launchDebug.events.push({atMs:at,stage,detail:scrubDiagnostic(detail)});
    if(launchDebug.events.length>80)launchDebug.events.shift();
    const target=document.getElementById('diagPhase');
    const label=document.getElementById('diagElapsed');
    const log=document.getElementById('diagLog');
    if(target)target.textContent=stage+(detail?' · '+scrubDiagnostic(detail):'');
    if(label)label.textContent=at.toFixed(1)+' ms';
    if(log){log.textContent=launchDebug.events.slice(-14).map(e=>e.atMs.toFixed(1).padStart(7)+' ms  '+e.stage+(e.detail?' — '+e.detail:'')).join('\n');log.scrollTop=log.scrollHeight;}
  }
  function launchDuration(name,from){launchDebug.timings[name]=elapsedMs(from);return launchDebug.timings[name];}
  function popupURLKind(popup){
    try{const v=popup.location.href;if(v==='about:blank')return 'about:blank';
      return 'different ('+(v.split(':')[0]||'unknown')+' protocol)';
    }catch(_){return 'unreadable (browser access restriction)';}
  }
  function makeLaunchReport(){
    return JSON.stringify({
      version:launchDebug.version,attempt:launchDebug.attempt,
      context:{protocol:location.protocol,secureContext:window.isSecureContext,storageAvailable:storageAvailableForLaunch()},
      openedVia:launchDebug.openedVia,outcome:launchDebug.outcome,runtimeErrorCount:launchDebug.runtimeErrors,starterClose:launchDebug.starterClose,
      timingsMs:launchDebug.timings,events:launchDebug.events,offlineChecks:launchDebug.offlineChecks,
      generatedAt:new Date().toISOString(),
      note:'All timings measured locally. Does not measure Gemini server response time. No API keys, conversation contents or full URLs are included.'
    },null,2);
  }
  function storageAvailableForLaunch(){try{const k='lumina_v67_storage_probe';localStorage.setItem(k,'1');localStorage.removeItem(k);return true;}catch(_){return false;}}
  document.getElementById('copyLaunchReport').addEventListener('click',async()=>{
    const data=makeLaunchReport();
    try{await navigator.clipboard.writeText(data);document.getElementById('diagCheckResults').textContent='Diagnostic report copied.';}
    catch(_){
      try{const t=document.createElement('textarea');t.value=data;t.style.cssText='position:fixed;left:-200vw;top:0';document.body.append(t);t.select();
        const ok=document.execCommand('copy');t.remove();document.getElementById('diagCheckResults').textContent=ok?'Diagnostic report copied.':'Clipboard blocked. Use Save report instead.';
      }catch(_){document.getElementById('diagCheckResults').textContent='Clipboard blocked. Use Save report instead.';}
    }
  });
  document.getElementById('saveLaunchReport').addEventListener('click',()=>{
    try{const blob=new Blob([makeLaunchReport()],{type:'application/json'});const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download='lumina-v67-launch-diagnostics.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
      document.getElementById('diagCheckResults').textContent='Saved diagnostic report. No API key or chat contents included.';
    }catch(e){document.getElementById('diagCheckResults').textContent='Download blocked: '+scrubDiagnostic(e?.name||'browser error');}
  });
  document.getElementById('runLaunchChecks').addEventListener('click',()=>{
    const checks=[];
    const run=(name,fn)=>{const t=performance.now();try{const detail=fn();checks.push({name,passed:true,durationMs:Math.round((performance.now()-t)*10)/10,detail:String(detail||'').slice(0,100)});}catch(e){checks.push({name,passed:false,durationMs:Math.round((performance.now()-t)*10)/10,error:scrubDiagnostic(e?.message||'Failure')});}};
    let html='';let parsed=null;
    run('High-resolution timing',()=>{if(typeof performance.now!=='function')throw Error('Timing API missing');return 'performance.now available';});
    run('Load modular workspace',()=>{html=appHTML();if(html.length<1000)throw Error('Short workspace');return html.length+' HTML characters';});
    run('Parse workspace HTML',()=>{parsed=new DOMParser().parseFromString(html,'text/html');if(!parsed.documentElement)throw Error('DOM parse failed');return 'HTML parsed';});
    run('Check chat UI',()=>{if(!parsed?.getElementById('promptInput')||!parsed.querySelector('.app'))throw Error('Chat UI missing');return 'Chat UI present';});
    run('Check scripts',()=>{const scripts=parsed?.querySelectorAll('script').length||0;if(scripts<2)throw Error('Expected app scripts missing');return scripts+' scripts';});
    run('Storage probe',()=>{if(!storageAvailableForLaunch())throw Error('Browser storage unavailable');return 'Local storage writable';});
    run('Popup capability',()=>{if(typeof window.open!=='function')throw Error('window.open unavailable');return 'Popup API exists; actual permission needs a launch click';});
    launchDebug.offlineChecks=checks;
    const pass=checks.filter(x=>x.passed).length;
    const output='Offline checks: '+pass+'/'+checks.length+' passed\n'+checks.map(x=>(x.passed?'✓ ':'✗ ')+x.name+' ('+x.durationMs.toFixed(1)+' ms)'+(x.error?' — '+x.error:'')).join('\n');
    document.getElementById('diagCheckResults').textContent=output;
    return checks;
  });

  function blankTabReady(win){
    if(!win||win.closed)return false;
    try{return win.location.href==='about:blank' &&
       win.document.documentElement.dataset.luminaScriptsInstalled==='yes' &&
       !!(win.document.querySelector('.app')&&win.document.getElementById('promptInput'));}
    catch(_){return false;}
  }
  document.getElementById('focusBlankWorkspace').addEventListener('click',()=>{
    if(blankLuminaPopup&&!blankLuminaPopup.closed){
      try{blankLuminaPopup.focus();}catch(_){}
      showLaunchStatus(blankTabReady(blankLuminaPopup)
        ? 'Lumina is open in about:blank. The launcher is staying open until you close it.'
        : 'The tab is still open but its workspace is not ready. Click Open about:blank now to reload the app in that tab.');
    }else{
      showLaunchStatus('The blank tab is no longer open. Click Open about:blank now to start a fresh one.');
    }
  });
  function setCloseOutcome(text){
    const el=document.getElementById('closeOutcomeInfo');
    if(el)el.textContent=text;
  }
  // A browser-owned starter tab is generally not script-closable. A click on
  // a page button does NOT change that permission. Never repeatedly retry it.
  function starterMightBeScriptClosable(){
    try{return window.opener!==null && window.history.length<=1;}
    catch(_){return false;}
  }
  function showStarterCloseBlocked(popup){
    const msg='Lumina is ready. The starter tab must be closed with Ctrl+W (Cmd+W on Mac). Browser rules prevent this page from closing itself.';
    if(launcherCloseFallback)launcherCloseFallback.hidden=false;
    setCloseOutcome(msg);
    showLaunchStatus(msg);
    // Do not inject an overlay into the working Lumina tab.
  }
  function finishStarterAfterReady(popup,generation,initiator){
    if(generation!==blankLaunchGeneration)return;
    if(!blankTabReady(popup)||popupURLKind(popup)!=='about:blank'||launchDebug.runtimeErrors>0){
      launchDebug.starterClose.status='skipped-not-ready';
      launchDebug.starterClose.reason='Workspace not confirmed ready, URL changed, or runtime error recorded';
      launchEvent('Starter close skipped',launchDebug.starterClose.reason);
      if(launcherCloseFallback)launcherCloseFallback.hidden=false;
      return;
    }
    // opener is only a conservative eligibility hint, NOT a browser grant.
    // Normal directly opened GitHub Pages tabs have no opener.
    if(!starterMightBeScriptClosable()){
      launchDebug.starterClose.status='manual-required';
      launchDebug.starterClose.reason='Starter was not identified as a script-opened tab';
      launchEvent('Starter close requires manual action','Browser-owned tab; use Ctrl+W or Cmd+W');
      showStarterCloseBlocked(popup);
      return;
    }
    if(launchDebug.starterClose.attempts){
      launchEvent('Starter close skipped','Already tried closing this launch');return;
    }
    launchDebug.starterClose.attempts=1;
    launchDebug.starterClose.status='attempted';
    launchDebug.starterClose.reason=initiator;
    launchDebug.starterClose.afterReadyMs=elapsedMs();
    launchEvent('Starter close requested','Script-opened starter eligible; ONLY launcher window.close()');
    // close() has no success return; if this timer runs the page survived.
    setTimeout(()=>{
      if(generation!==blankLaunchGeneration)return;
      launchDebug.starterClose.status='likely-blocked';
      launchDebug.starterClose.reason='Starter still active after close request';
      launchEvent('Starter close blocked or ignored','Use Ctrl+W or Cmd+W; no further retries');
      showStarterCloseBlocked(popup);
    },700);
    try{window.close();}
    catch(error){
      launchDebug.starterClose.status='exception';
      launchDebug.starterClose.reason=scrubDiagnostic(error?.name||'Browser refused close');
      launchEvent('Starter close exception',launchDebug.starterClose.reason);
      showStarterCloseBlocked(popup);
    }
  }
  document.getElementById('closeStarterAgain').addEventListener('click',()=>{
    // Explain the actual browser action instead of calling window.close()
    // again after Chromium has already refused it.
    launchEvent('Starter close instructions','Press Ctrl+W or Cmd+W in this tab');
    const msg='With this starter tab active, press Ctrl+W on Windows/ChromeOS/Linux or Cmd+W on Mac. Your Lumina workspace stays open in the other tab.';
    setCloseOutcome(msg);showLaunchStatus(msg);
  });

  function showBlankLoadFailure(popup,reason){
    // Keep the existing browsing context and URL; never close the tab.
    try{
      const d=popup.document;
      const body=d.body || d.documentElement.appendChild(d.createElement('body'));
      body.replaceChildren();
      d.title='Lumina launch error';
      body.style.cssText='min-height:100vh;margin:0;background:#101010;color:#eee;display:grid;place-items:center;font:14px/1.6 system-ui;padding:24px;box-sizing:border-box';
      const section=d.createElement('section');section.style.maxWidth='610px';
      const h=d.createElement('h1');h.textContent='Lumina could not finish opening';
      const p=d.createElement('p');p.id='luminaLaunchError';p.textContent=scrubDiagnostic(reason);
      const note=d.createElement('p');note.textContent='The tab remains open. Switch back to the starter tab, open Launch diagnostics, and save the report. Then retry.';
      const detail=d.createElement('pre');detail.style.cssText='white-space:pre-wrap;background:#202020;border-radius:8px;padding:12px;color:#bbb';
      detail.textContent=launchDebug.events.slice(-8).map(e=>e.atMs+' ms · '+e.stage).join('\n');
      section.append(h,p,note,detail);body.append(section);
    }catch(e){launchEvent('Could not display error in popup',e?.name||'restricted');}
  }
  function blankWorkspacePresent(popup){
    try{return !!(popup.document.querySelector('.app')&&popup.document.getElementById('promptInput'));}
    catch(_){return false;}
  }
  function watchBlankTab(popup,generation){
    let checks=0;
    const check=()=>{
      if(generation!==blankLaunchGeneration)return;
      try{if(popup.closed){launchDebug.outcome='closed-by-browser';launchEvent('Popup disappeared','Launcher did not close it');
        if(launcherCloseFallback)launcherCloseFallback.hidden=true;
        showLaunchStatus('The popup closed unexpectedly. Lumina did not close it. Chrome, an extension, or managed-browser policy may be responsible.');return;}}
      catch(e){launchEvent('Could not inspect popup',e?.name||'restricted');}
      if(blankTabReady(popup)){
        launchDuration('workspaceReady',lastLaunchStart);
        launchDebug.outcome=launchDebug.runtimeErrors?'ready-with-script-errors':(popupURLKind(popup)==='about:blank'?'ready-about-blank':'ready-with-url-change');
        launchEvent('Chat workspace ready','Total '+launchDebug.timings.workspaceReady.toFixed(1)+' ms; URL '+popupURLKind(popup));
        showBlockedHelp(false);
        const exact=popupURLKind(popup)==='about:blank';
        showLaunchStatus(launchDebug.runtimeErrors?'Lumina markup opened, but '+launchDebug.runtimeErrors+' script error(s) occurred. See Launch diagnostics.':(exact?'Lumina is running in about:blank. Launch time: '+launchDebug.timings.workspaceReady.toFixed(1)+' ms. Check Launch diagnostics for details.':'Lumina is open, but its browser URL is different from about:blank. The app remains usable; see Launch diagnostics.'));
        // Finish only after the workspace is ready; never touch the workspace tab.
        // Browser-owned starter tabs require a real browser close command.
        finishStarterAfterReady(popup,generation,'automatic-after-ready');
        return;
      }
      if(++checks<45){setTimeout(check,100);return;}
      launchDebug.outcome='timeout';launchEvent('Startup timed out','No chat UI after '+elapsedMs().toFixed(1)+' ms');
      showLaunchStatus('The popup opened but the chat UI did not become ready. It was not closed. Save a Launch diagnostics report and use Start in this tab if needed.');
      if(launcherCloseFallback)launcherCloseFallback.hidden=false;
    };
    setTimeout(check,80);
  }
  function loadAppWithoutNavigation(popup,html){
    // DO NOT call popup.document.open/write/close; on some hosted Chromium
    // contexts those APIs alter the popup document URL. DOM replacement keeps
    // the original about:blank browsing context and origin instead.
    const parseStart=performance.now();
    const parsed=new DOMParser().parseFromString(html,'text/html');
    if(!parsed.getElementById('promptInput')||!parsed.querySelector('.app'))throw Error('Workspace markup is incomplete.');
    launchDuration('parseHTML',parseStart);launchEvent('Workspace parsed',launchDebug.timings.parseHTML+' ms');
    const mountStart=performance.now();
    const d=popup.document;
    const incoming=d.importNode(parsed.documentElement,true);
    d.documentElement.replaceWith(incoming);
    launchDuration('mountDOM',mountStart);launchEvent('Workspace DOM mounted',launchDebug.timings.mountDOM+' ms');
    const scripts=Array.from(d.querySelectorAll('script'));
    launchEvent('Starting scripts',scripts.length+' app scripts');
    const scriptStart=performance.now();
    const scriptLoads=[];
    for(const inert of scripts){
      const script=d.createElement('script');
      for(const attr of Array.from(inert.attributes))script.setAttribute(attr.name,attr.value);
      if(inert.hasAttribute('src')){
        script.async=false;
        scriptLoads.push(new Promise((resolve,reject)=>{
          script.onload=resolve;
          script.onerror=()=>reject(Error('Workspace asset failed: '+inert.getAttribute('src')));
        }));
      }else{script.textContent=inert.textContent;}
      inert.replaceWith(script);
    }
    launchDuration('executeScripts',scriptStart);
    launchEvent('Workspace scripts requested',scriptLoads.length+' external scripts');
    try{d.documentElement.dataset.luminaWorkspace='ready';}catch(_){}
    Promise.all(scriptLoads).then(()=>{
      if(!popup.closed && d.documentElement.dataset.luminaV83Ready==='yes'){
        d.documentElement.dataset.luminaScriptsInstalled='yes';
        launchEvent('Workspace scripts ready',scriptLoads.length+' loaded');
      }else{
        launchEvent('Workspace initialization incomplete','Library did not initialize');
      }
    }).catch(error=>{
      launchDebug.runtimeErrors++;
      launchEvent('Workspace script load failed',error.message);
      showLaunchStatus('Lumina assets could not finish loading. Use the launcher diagnostics.');
    });
  }
  function openWorkspaceInBlankTab(source='manual'){
    lastLaunchStart=performance.now();
    launchDebug.attempt+=1;launchDebug.events=[];launchDebug.timings={};launchDebug.outcome='starting';launchDebug.openedVia=source;launchDebug.runtimeErrors=0;
    launchDebug.starterClose={status:'not-attempted',attempts:0,reason:'',afterReadyMs:null};
    launchEvent('Launch requested',source);
    showBlockedHelp(false);
    if(launcherCloseFallback)launcherCloseFallback.hidden=true;
    let popup=null;let reuse=false;
    if(blankLuminaPopup&&!blankLuminaPopup.closed){
      popup=blankLuminaPopup;reuse=true;
      if(blankTabReady(popup)){
        try{popup.focus();}catch(_){}
        launchDebug.outcome='already-open';launchEvent('Existing tab focused',popupURLKind(popup));
        showLaunchStatus('Lumina is already open in about:blank. Switched to it.');
        const existingGeneration=blankLaunchGeneration;
        finishStarterAfterReady(popup,existingGeneration,'already-open');
        return true;
      }
    }
    const popupStart=performance.now();
    if(!popup){try{popup=window.open('about:blank','_blank');}catch(e){launchEvent('Popup request threw',e?.name||'unknown');}}
    launchDuration('openPopup',popupStart);
    if(!popup||popup.closed){
      launchDebug.outcome='popup-blocked';launchEvent('Popup blocked',launchDebug.timings.openPopup.toFixed(1)+' ms');
      showBlockedHelp(true);
      showLaunchStatus(source==='automatic'
        ?'Chrome blocked the automatic popup. Click Open about:blank now; you can also use Start in this tab.'
        :'Chrome blocked the popup. Allow popups for this site or choose Start in this tab.');
      return false;
    }
    blankLuminaPopup=popup;
    const generation=++blankLaunchGeneration;
    launchEvent('Popup acquired','Open: '+launchDebug.timings.openPopup.toFixed(1)+' ms; URL '+popupURLKind(popup));
    try{
      if(!popup.__luminaV67LaunchHandlers){
        popup.__luminaV67LaunchHandlers=true;
        popup.addEventListener('error',e=>{launchDebug.runtimeErrors++;launchEvent('Workspace runtime error',e?.error?.name||'Script error');});
        popup.addEventListener('unhandledrejection',e=>{launchDebug.runtimeErrors++;launchEvent('Unhandled promise rejection',e?.reason?.name||'Rejected promise');});
        popup.addEventListener('securitypolicyviolation',e=>{launchDebug.runtimeErrors++;launchEvent('Browser CSP restriction',e?.violatedDirective||'Blocked by CSP');});
      }
    }catch(_){launchEvent('Popup error monitoring unavailable','Browser restriction');}

    prefetchApp().then(()=>{
      if(popup.closed||generation!==blankLaunchGeneration)return;
      const startDecode=performance.now();
      const html=appHTML();
      launchDuration('decodeAndConfigure',startDecode);
      launchEvent('Workspace source ready',launchDebug.timings.decodeAndConfigure+' ms');
      loadAppWithoutNavigation(popup,html);
      launchDebug.timings.initialization=elapsedMs();
      launchEvent('Launch injected','URL '+popupURLKind(popup));
      try{popup.focus()}catch(_){}
      showLaunchStatus(reuse?'Reloading Lumina in the existing tab…':'Lumina tab opened. Verifying startup and URL…');
      watchBlankTab(popup,generation);
    }).catch(error=>{
      launchDebug.outcome='startup-error';
      launchEvent('Launch error',error?.name||'Error');
      showBlankLoadFailure(popup,error?.message||String(error));
      try{popup.focus()}catch(_){}
      showLaunchStatus('Lumina could not finish starting ('+scrubDiagnostic(error?.name||'Error')+'). The popup remains open. See Launch diagnostics and save the report.');
      if(launcherCloseFallback)launcherCloseFallback.hidden=false;
    });
    return true;
  }
  try{document.getElementById('privateMode').checked=localStorage.getItem('lumina_privacy_mode_v2')==='1'}catch(_){}
  // V83.3: Show the launcher first. Automatic about:blank is opt-in;
  // browser popup restrictions still apply. Never silently replace the page.
  // Chrome normally blocks it without user activation; do not bypass browser
  // security or falsely claim success. Manual click remains the fallback.
  const AUTO_START_PREF='lumina_launcher_auto_blank_v833';
  const autoBlankToggle=document.getElementById('autoOpen');
  try{autoBlankToggle.checked=localStorage.getItem(AUTO_START_PREF)==='1';}
  catch(_){autoBlankToggle.checked=false;}
  autoBlankToggle.addEventListener('change',()=>{
    const enabled=autoBlankToggle.checked;
    try{localStorage.setItem(AUTO_START_PREF,enabled?'1':'0');}catch(_){}
    if(!enabled){
      showBlockedHelp(false);
      showLaunchStatus('Automatic about:blank launch is off. The launcher will stay visible until you click Start.');
      return;
    }
    showLaunchStatus('Automatic about:blank launch enabled; trying it now…');
    openWorkspaceInBlankTab('manual'); // Checkbox change has a real user gesture.
  });
  document.getElementById('launch').addEventListener('click',()=>openWorkspaceInBlankTab('manual'));
  document.getElementById('openSeparateTab').addEventListener('click',()=>openWorkspaceInBlankTab('manual'));
  document.getElementById('openInTab').addEventListener('click',loadWorkspaceInPlace);
  const directRequested=new URLSearchParams(location.search).get('direct')==='1';
  const launcherRequested=new URLSearchParams(location.search).get('launcher')==='1';
  if(directRequested||launcherRequested){
    showLaunchStatus('Launcher is open on request. Select how you want to start Lumina.');
  }
  document.getElementById('nativePipProbe').addEventListener('click',async()=>{
    const target=document.getElementById('status');
    if(!window.isSecureContext||typeof window.documentPictureInPicture?.requestWindow!=='function'){
      target.textContent='Native PiP unavailable in this browser context. Chrome or its administrator controls this feature.';return;
    }
    try{
      // RequestWindow is the very first awaited operation after this click.
      const win=await window.documentPictureInPicture.requestWindow({width:370,height:250});
      const t=Date.now();
      const p=win.document.createElement('div');p.style.cssText='min-height:95vh;background:#141414;color:white;display:grid;place-items:center;text-align:center;padding:25px;font:14px system-ui';
      p.textContent='Native PiP opened successfully. This is a diagnostic window; close it with the browser’s own close control.';
      win.document.body.style.margin='0';win.document.body.append(p);
      target.textContent='Native Document PiP opened. Switch tabs to test whether it stays visible.';
      win.addEventListener('pagehide',()=>{target.textContent='Native PiP closed after '+((Date.now()-t)/1000).toFixed(1)+'s. If that happened without a click, your browser may be ending the session.';},{once:true});
    }catch(e){target.textContent='Native PiP rejected: '+(e?.name||'Error')+' — '+(e?.message||'No detail supplied by the browser');}
  });

  document.getElementById('checkPipSupport').addEventListener('click',()=>{
    const secure=window.isSecureContext===true;
    const api=typeof window.documentPictureInPicture?.requestWindow==='function';
    const result=secure&&api
      ? 'Document PiP API detected. Click Float Lumina over tabs to test the direct floating workspace; actual permission is determined by your browser.'
      : 'Native floating unavailable in this context: '+[!secure?'not a secure context':null,!api?'Document PiP API missing or disabled':null].filter(Boolean).join('; ')+'. Try the hosted HTTPS version in current Chrome or Edge.';
    document.getElementById('status').textContent=result;
  });
  // Try immediately when a user visits the site; do not wait for the load
  // event or for a second visit. Only one automatic attempt per navigation.
  // ?launcher=1 and ?direct=1 intentionally keep the landing page visible.
  if(!directRequested&&!launcherRequested&&autoBlankToggle.checked){
    openWorkspaceInBlankTab('automatic');
  }else if(!directRequested&&!launcherRequested){
    showLaunchStatus('Automatic about:blank launch is disabled. Click Open about:blank now when you want to start.');
  }
