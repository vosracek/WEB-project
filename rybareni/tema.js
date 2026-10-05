/* tema.js – hlavní okno: použije vylepšení na celý web (RGB, barva, režim, pozadí), přijímá tokeny z miniher */
const BASE_HUE=200;               /* základní odstín webu (modrá) */
function tokUi(){
  const s=VY.load();
  const n=document.getElementById("whoName"),t=document.getElementById("whoTok"),a=document.getElementById("admTok");
  if(n)n.innerHTML=VY.nameHTML(s);
  if(t)t.textContent="🪙 "+VY.tok().toLocaleString("cs-CZ");
  if(a)a.textContent=VY.tok().toLocaleString("cs-CZ");
}
function applyAll(){
  const s=VY.load(),root=document.documentElement;
  VY.refresh();      /* režim + stopa kurzoru */
  /* barva celého webu */
  const site=document.getElementById("site"),h=VY.hueOf(s.hue.color);
  site.style.filter=(s.hue.own&&s.hue.on&&h!==null)?`hue-rotate(${(h-BASE_HUE+360)%360}deg) saturate(1.15)`:"";
  /* RGB posvícení */
  const r=document.getElementById("rgb"),on=s.rgb.own&&s.rgb.on;
  r.className=on?"on "+s.rgb.mode:"";
  r.style.setProperty("--rgb-t",(12-s.rgb.speed*1.05).toFixed(2)+"s");
  r.style.setProperty("--rgb-s",s.rgb.str);
  r.style.setProperty("--rgb-c",s.rgb.color);
  /* pozadí menu */
  document.getElementById("menu").setAttribute("data-bg",s.bg);
  tokUi();
}
window.addEventListener("message",e=>{
  const d=e.data;if(!d||typeof d!=="object")return;
  if(d.vyEarn&&typeof d.vyEarn.amt==="number"){
    if(VY.earn(String(d.vyEarn.src),d.vyEarn.amt)>0)tokUi();
  }
  if(d.vyChanged){
    applyAll();
    document.querySelectorAll("iframe").forEach(f=>{if(f.getAttribute("src")&&f.contentWindow&&f.contentWindow!==e.source)f.contentWindow.postMessage({vyChanged:1},"*")});
  }
});
/* pasivní příjem z vylepšení „Síť“ */
setInterval(()=>{
  if(document.hidden||document.getElementById("game").style.display!=="none")return;
  if(VY.passive(10)>0){tokUi();const f=document.getElementById("upgFrame");if(f.getAttribute("src")&&f.contentWindow)f.contentWindow.postMessage({vyChanged:1},"*")}
},10000);
applyAll();
