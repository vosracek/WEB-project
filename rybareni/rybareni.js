
const SECRET="NEPTUN", PRICES=[30,80,150,300,600,1000];
const FISH=[
 {n:"Kapr",e:"🐟",w:26,t:[2,4],c:"#7a8b99",r:"Běžná"},
 {n:"Okoun",e:"🐠",w:26,t:[2,5],c:"#7a8b99",r:"Běžná"},
 {n:"Štika",e:"🐟",w:20,t:[3,6],c:"#7a8b99",r:"Běžná"},
 {n:"Pstruh",e:"🐡",w:16,t:[2,5],c:"#7a8b99",r:"Běžná"},
 {n:"Bleskovka",e:"⚡🐟",w:3.5,t:[55,65],c:"#f5c400",r:"Vzácná"},
 {n:"Kemonova ryba",e:"🐺🐟",w:3,t:[85,95],c:"#b5651d",r:"Vzácná"},
 {n:"Radioaktivní ryba",e:"☢️🐟",w:2.5,t:[115,125],c:"#39d353",r:"Epická"},
 {n:"Megalodon",e:"🦈",w:2,t:[190,210],c:"#3a7bd5",r:"Legendární"},
 {n:"Duhová ryba",e:"🌈🐠",w:1,t:[290,310],c:"#d63af9",r:"Mýtická"}
];
const $=id=>document.getElementById(id);
let tokens=0, bought=0, state="idle", t1, t2;
try{tokens=VY.tok();bought=Math.min(PRICES.length,+localStorage.getItem("ry_b")||0)}catch(e){}
function save(){try{localStorage.setItem("ry_tok",tokens);localStorage.setItem("ry_b",bought)}catch(e){}}

const TIP={x:500,y:232}, BOB={x:650,y:352};
function setLine(on){
  const g=$("bobG"); g.style.display=on?"block":"none";
  $("line").setAttribute("d",on?`M${TIP.x} ${TIP.y} Q${(TIP.x+BOB.x)/2} ${BOB.y-20} ${BOB.x} ${BOB.y}`:"");
  g.setAttribute("transform",`translate(${BOB.x},${BOB.y})`);
}
function say(s){$("status").textContent=s}
function ui(){
  const b=$("act");b.classList.toggle("bite",state==="bite");
  b.textContent=state==="idle"?"🎣 Hodit udici":state==="wait"?"⏳ Čekám… (zatáhnout)":"❗ ZATÁHNOUT!";
  $("tok").textContent=tokens;
}
function pick(){
  if(forced!==null)return FISH[forced];
  const tot=FISH.reduce((a,f)=>a+f.w,0);let r=Math.random()*tot;
  for(const f of FISH){if((r-=f.w)<0)return f}return FISH[0];
}
function cast(){
  state="wait";setLine(true);$("bob").classList.remove("dip");say("Čekám, až něco zabere…");ui();
  t1=setTimeout(()=>{
    state="bite";$("bob").classList.add("dip");say("ZABÍRÁ! Rychle zatáhni!");ui();
    t2=setTimeout(()=>{reset("Ryba utekla 😢");},1300);
  },instant?200:1200+Math.random()*3000);
}
function reset(msg){
  clearTimeout(t1);clearTimeout(t2);state="idle";setLine(false);$("bob").classList.remove("dip");say(msg||"Hoď udici a chytej ryby!");ui();
}
function reel(){
  if(state==="idle")return cast();
  if(state==="wait")return reset("Příliš brzy! Počkej, až zabere.");
  clearTimeout(t2);
  const f=pick(), gain=Math.round(f.t[0]+Math.random()*(f.t[1]-f.t[0]));
  tokens+=gain;save();
  const c=$("catch");c.style.setProperty("--c",f.c);c.classList.toggle("rare",f.w<5);
  $("ce").textContent=f.e;$("cn").textContent=f.n;$("cr").textContent=f.r;$("ct").textContent="+"+gain+" 🪙";
  c.classList.add("show");setTimeout(()=>c.classList.remove("show"),f.w<5?2600:1400);
  reset(f.w<5?"Wow, vzácný úlovek! ✨":"Chycena! Hoď znovu.");renderShop();
}
$("act").onclick=reel;
addEventListener("keydown",e=>{if(e.code==="Space"&&document.activeElement.tagName!=="INPUT"&&!$("adm").contains(document.activeElement)&&!$("menu").classList.contains("show")){e.preventDefault();reel()}});

function renderShop(){
  $("slots").innerHTML=[...SECRET].map((ch,i)=>`<div class="slot ${i<bought?"on":""}">${i<bought?ch:"?"}</div>`).join("");
  const b=$("buy");
  if(bought>=PRICES.length){b.textContent="Kód je kompletní ✔ Najdi 🔑";b.disabled=true}
  else{const p=PRICES[bought];b.textContent=`Koupit znak ${bought+1}/${PRICES.length} – ${p} 🪙`;b.disabled=tokens<p}
  ui();
}
$("buy").onclick=()=>{if(bought<PRICES.length&&tokens>=PRICES[bought]){tokens-=PRICES[bought];bought++;save();renderShop()}};
function toggle(id,other){$(other).classList.remove("open");$(id).classList.toggle("open")}
$("shopB").onclick=()=>toggle("shop","keyP");
$("keyB").onclick=()=>{toggle("keyP","shop");$("code").focus()};

function tryCode(){
  const v=$("code").value.trim().toUpperCase();
  if(v===SECRET){
    reset();$("game").style.display="none";$("menu").classList.add("show");
  }else{
    const c=$("code");c.classList.remove("bad");void c.offsetWidth;c.classList.add("bad");
    $("keyMsg").textContent="Špatný kód. Kup další znaky v obchodě.";
  }
}
$("ok").onclick=tryCode;
$("code").addEventListener("keydown",e=>{if(e.key==="Enter")tryCode()});

const TILES=[["🎮","Arkády"],["🏆","Žebříček"],["🐙","Akvárium"],["🧟","Expedice"],["🚗","Dálnice"],["🍕","Pizzerie"],["🛠️","Vylepšení"],["🏝️","Ostrov"]];
$("grid").innerHTML=TILES.map(t=>{const id=t[1]==="Vylepšení"?"tileUp":t[1]==="Arkády"?"tileArc":t[1]==="Akvárium"?"tileAqua":t[1]==="Expedice"?"tileExp":t[1]==="Dálnice"?"tileHwy":t[1]==="Pizzerie"?"tilePiz":t[1]==="Ostrov"?"tileOst":"";
 return id?`<div class="tile link" id="${id}"><div class="i">${t[0]}</div><b>${t[1]}</b><span>${t[1]==="Vylepšení"?"Otevřít":"Hrát"}</span></div>`
 :`<div class="tile"><div class="i">${t[0]}</div><b>${t[1]}</b><span>Coming soon</span></div>`}).join("");
/* ---- Ostrov (příběhová hra) ---- */
$("tileOst").onclick=()=>{const f=$("ostFrame");if(!f.getAttribute("src"))f.src="ostrov.html";$("ost").classList.add("show");document.body.classList.add("ovl")};
$("ostBack").onclick=()=>{$("ost").classList.remove("show");document.body.classList.remove("ovl");const f=$("ostFrame");f.removeAttribute("src");f.src="about:blank";f.removeAttribute("src")};
/* ---- Admin panel ---- */
const ADM_PW="nemamradsmace";
let forced=null, instant=false;
function openMenu(){reset();$("game").style.display="none";$("menu").classList.add("show")}
$("fsel").innerHTML='<option value="">Náhodně</option>'+FISH.map((f,i)=>`<option value="${i}">${f.e} ${f.n}</option>`).join("");
$("fsel").onchange=e=>{forced=e.target.value===""?null:+e.target.value};
$("aInst").onchange=e=>{instant=e.target.checked};
$("admB").onclick=()=>{$("adm").classList.toggle("open");if($("admLogin").style.display!=="none")$("admPw").focus()};
function admLogin(){
  if($("admPw").value.trim()===ADM_PW){
    $("admLogin").style.display="none";$("admTools").style.display="block";$("admPw").value="";
  }else{
    const p=$("admPw");p.classList.remove("bad");void p.offsetWidth;p.classList.add("bad");
  }
}
$("admGo").onclick=admLogin;
$("admPw").addEventListener("keydown",e=>{if(e.key==="Enter")admLogin()});
const num=()=>{const n=parseInt($("admNum").value,10);return isNaN(n)?0:n};
function syncTok(){tokens=VY.tok()}
function tokChanged(){save();renderShop();if(window.tokUi)tokUi();const f=$("upgFrame");if(f&&f.getAttribute("src")&&f.contentWindow)f.contentWindow.postMessage({vyChanged:1},"*")}
$("aAdd").onclick=()=>{syncTok();tokens=Math.max(0,tokens+num());tokChanged()};
$("aSet").onclick=()=>{syncTok();tokens=Math.max(0,num());tokChanged()};
document.querySelectorAll(".aQ").forEach(b=>b.onclick=()=>{syncTok();tokens=Math.max(0,tokens+(+b.dataset.n));tokChanged();$("aOut").textContent="Tokeny: +"+b.dataset.n+" 🪙"});
$("aUpAll").onclick=()=>{
  const s=VY.load();
  for(const k of ["rgb","hue","trail"]){s[k].own=1}
  s.own.ns=VY.NS.map(x=>x.id);s.own.badge=VY.BADGES.map(x=>x.id);s.own.bg=VY.BGS.map(x=>x.id);s.own.adm=VY.ADM.map(x=>x.id);
  for(const d of VY.SRV)s.srv[d.id]=VY.SRV_MAX;
  VY.save(s);tokChanged();if(window.applyAll)applyAll();$("aOut").textContent="Vylepšení: vše odemčeno."};
$("aUpReset").onclick=()=>{if(!confirm("Opravdu smazat všechna vylepšení (tokeny zůstanou)?"))return;VY.reset();tokChanged();if(window.applyAll)applyAll();$("aOut").textContent="Vylepšení resetována."};
$("aCode").onclick=()=>{bought=PRICES.length;save();renderShop();$("aOut").textContent="Kód odemčen."};
$("aShow").onclick=()=>{$("aOut").textContent="Kód: "+SECRET};
$("aMenu").onclick=()=>{$("adm").classList.remove("open");openMenu()};
$("aReset").onclick=()=>{tokens=0;bought=0;save();location.reload()};
$("aOut2").onclick=()=>{$("admTools").style.display="none";$("admLogin").style.display="block";$("adm").classList.remove("open");forced=null;instant=false;$("fsel").value="";$("aInst").checked=false;$("aOut").textContent=""};

/* ---- Arkády ---- */
function openArcade(){
  const f=$("arcFrame");if(!f.getAttribute("src"))f.src="arkady.html";
  $("arcade").classList.add("show");document.body.classList.add("inArcade","ovl");
  $("adm").classList.remove("open");
}
function closeArcade(){
  $("arcade").classList.remove("show");document.body.classList.remove("inArcade","ovl");
}
$("arcBack").onclick=closeArcade;
$("tileArc").onclick=openArcade;
/* ---- Akvárium ---- */
function openAquarium(){const f=$("aquaFrame");if(!f.getAttribute("src"))f.src="akvarium.html";$("aqua").classList.add("show");document.body.classList.add("ovl")}
$("tileAqua").onclick=openAquarium;
$("aquaBack").onclick=()=>{$("aqua").classList.remove("show");document.body.classList.remove("ovl")};
$("aAq").onclick=()=>{const n=num()||1000,f=$("aquaFrame");
  if(f.getAttribute("src")&&f.contentWindow)f.contentWindow.postMessage({addMoney:n},"*");
  else{try{localStorage.setItem("ak_m",(+localStorage.getItem("ak_m")||0)+n)}catch(e){}}
  $("aOut").textContent="Akvárium: +"+n+" 💰"};

function openZombie(){const f=$("zombFrame");if(!f.getAttribute("src"))f.src="zombie.html";else if(f.contentWindow)f.contentWindow.postMessage({pause:false},"*");$("zomb").classList.add("show");document.body.classList.add("ovl","inArcade")}
$("tileExp").onclick=openZombie;
$("zombBack").onclick=()=>{const f=$("zombFrame");if(f.contentWindow)f.contentWindow.postMessage({pause:true},"*");$("zomb").classList.remove("show");document.body.classList.remove("ovl","inArcade")};
$("aZ").onclick=()=>{const n=num()||1000,f=$("zombFrame");
  if(f.getAttribute("src")&&f.contentWindow)f.contentWindow.postMessage({addMoney:n},"*");
  else{try{localStorage.setItem("zb_money",(+localStorage.getItem("zb_money")||0)+n)}catch(e){}}
  $("aOut").textContent="Zombie: +"+n+" 💰"};

/* ---- Dálnice ---- */
function openHighway(){const f=$("hwyFrame");if(!f.getAttribute("src"))f.src="dalnice.html";else if(f.contentWindow)f.contentWindow.postMessage({pause:false},"*");$("hwy").classList.add("show");document.body.classList.add("ovl","inArcade")}
$("tileHwy").onclick=openHighway;
$("hwyBack").onclick=()=>{const f=$("hwyFrame");if(f.contentWindow)f.contentWindow.postMessage({pause:true},"*");$("hwy").classList.remove("show");document.body.classList.remove("ovl","inArcade")};
$("aHw").onclick=()=>{const n=num()||1000,f=$("hwyFrame");
  if(f.getAttribute("src")&&f.contentWindow)f.contentWindow.postMessage({addMoney:n},"*");
  else{try{localStorage.setItem("hw_m",(+localStorage.getItem("hw_m")||0)+n)}catch(e){}}
  $("aOut").textContent="Dálnice: +"+n+" 💰"};

/* ---- Pizzerie ---- */
function openPizza(){const f=$("pizFrame");if(!f.getAttribute("src"))f.src="pizza.html";else if(f.contentWindow)f.contentWindow.postMessage({pause:false},"*");$("piz").classList.add("show");document.body.classList.add("ovl","inArcade")}
$("tilePiz").onclick=openPizza;
$("pizBack").onclick=()=>{const f=$("pizFrame");if(f.contentWindow)f.contentWindow.postMessage({pause:true},"*");$("piz").classList.remove("show");document.body.classList.remove("ovl","inArcade")};
$("aPz").onclick=()=>{const n=num()||1000,f=$("pizFrame");
  if(f.getAttribute("src")&&f.contentWindow)f.contentWindow.postMessage({addMoney:n},"*");
  else{try{localStorage.setItem("pz_m",(localStorage.getItem("pz_m")===null?80:+localStorage.getItem("pz_m")||0)+n)}catch(e){}}
  $("aOut").textContent="Pizzerie: +"+n+" 💰"};

/* ---- Vylepšení ---- */
function openUpg(){const f=$("upgFrame");if(!f.getAttribute("src"))f.src="vylepseni.html";else if(f.contentWindow)f.contentWindow.postMessage({vyChanged:1},"*");$("upg").classList.add("show");document.body.classList.add("ovl")}
$("tileUp").onclick=openUpg;
$("upgBack").onclick=()=>{$("upg").classList.remove("show");document.body.classList.remove("ovl");if(window.tokUi)tokUi()};

setLine(false);renderShop();
