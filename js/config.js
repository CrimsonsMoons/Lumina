// PRIVATE - Contains a reversible copy of your Gemini key. Never upload this file to a public repository.
(()=>{
  const encoded="3Or1vEN/Pdfzuk4Mz8WgSBjAqXoe6HcQ+oQJ/5pmz5UV+1BFlhDqLua5B6w8iVvSW8pCjTQ=";
  let value='';
  const bytes=atob(encoded);
  for(let i=0;i<bytes.length;i++){
    const mask=(157 + 29*i + ((i*i)%251)) & 255;
    value+=String.fromCharCode(bytes.charCodeAt(i)^mask);
  }
  window.LUMINA_PERSONAL_KEY=value;
})();
