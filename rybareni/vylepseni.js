/* vylepseni.js – obchod s vylepšeními (tokeny z miniher) */
const $=id=>document.getElementById(id);
let tab="srv";

function toast(t){const e=$("toast");e.textContent=t;e.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove("show"),1800)}
function commit(){VY.notify();render()}
const fmt=n=>Math.round(n).toLocaleString("cs-CZ");
const btnBuy=(price,attrs)=>`<button class="btn${VY.tok()<price?" low":""}" ${attrs}>Koupit – ${fmt(price)} 🪙</button>`;
const owned=`<button class="btn ok" disabled>✔ Vlastníš</button>`;

/* ---------- záložky ---------- */
function tabSrv(s){
 const lv=VY.srvLevel(s);
 let h=`<div class="card wide"><div class="row sp"><h3>Úroveň serveru ${lv} / ${VY.SRV.length*VY.SRV_MAX}</h3><span class="mut">Tokeny z miniher ×${VY.mult(s).toFixed(1)} · pasivně ${VY.passivePerMin(s)} / min</span></div>
 <small>Vylepšuješ celý server – bonusy platí ve všech minihrách. Tokeny získáš hraním (viz záložka Bonusy).</small></div>`;
 h+=`<h2>Vylepšení serveru</h2><div class="grid">`;
 for(const d of VY.SRV){
  const l=s.srv[d.id],max=l>=VY.SRV_MAX,c=VY.srvCost(d.id,l);
  h+=`<div class="card"><div class="row sp"><h3>${d.e} ${d.n}</h3><b>${l}/${VY.SRV_MAX}</b></div>
  <div class="pips">${Array.from({length:VY.SRV_MAX},(_,i)=>`<i class="${i<l?"on":""}"></i>`).join("")}</div>
  <small>Teď: ${l?d.d(l):"bez bonusu"}${max?"":`<br>Další: ${d.d(l+1)}`}</small>
  ${max?`<button class="btn ok" disabled>MAX</button>`:btnBuy(c,`data-a="srv" data-id="${d.id}"`)}</div>`;
 }
 return h+`</div>`;
}

function tabLook(s){
 const seg=(a,cur,opts)=>`<div class="seg">${opts.map(o=>`<button class="${cur===o[0]?"on":""}" data-a="${a}" data-v="${o[0]}">${o[1]}</button>`).join("")}</div>`;
 let h=`<h2>Režim</h2><div class="card">${seg("theme",s.theme,[["auto","🖥️ Auto"],["light","☀️ Světlý"],["dark","🌙 Tmavý"]])}
 <small>Světlý/tmavý režim se projeví v menu, obchodě a panelech. Samotné minihry mají vlastní vzhled.</small></div>`;

 h+=`<h2>Efekty celého webu</h2><div class="grid">`;
 /* RGB */
 h+=`<div class="card"><h3>🌈 RGB posvícení</h3><small>Světelný rámeček kolem celého webu.</small>`;
 if(!s.rgb.own)h+=btnBuy(VY.PRICES.rgb,`data-a="buy" data-k="rgb"`);
 else h+=`<label class="switch"><input type="checkbox" data-a="tg" data-p="rgb.on" ${s.rgb.on?"checked":""}> Zapnuto</label>
  <label class="f">Režim<select data-a="sel" data-p="rgb.mode">${[["rainbow","Duha (přelévání)"],["static","Jedna barva"],["pulse","Pulzování"]].map(o=>`<option value="${o[0]}" ${s.rgb.mode===o[0]?"selected":""}>${o[1]}</option>`).join("")}</select></label>
  <label class="f">Barva (pro jednu barvu / pulz)<input type="color" data-a="in" data-p="rgb.color" value="${s.rgb.color}"></label>
  <label class="f">Rychlost<input type="range" min="1" max="10" data-a="in" data-p="rgb.speed" value="${s.rgb.speed}"></label>
  <label class="f">Síla záře<input type="range" min="1" max="6" data-a="in" data-p="rgb.str" value="${s.rgb.str}"></label>`;
 h+=`</div>`;
 /* barva webu */
 const sw=["#ff2d75","#ff7a1a","#f2c200","#2ecc71","#00bcd4","#3b82f6","#8b5cf6","#e040fb"];
 h+=`<div class="card"><h3>🎨 Barva celého webu</h3><small>Přebarví menu, hry i panely podle tebe.</small>`;
 if(!s.hue.own)h+=btnBuy(VY.PRICES.hue,`data-a="buy" data-k="hue"`);
 else h+=`<label class="switch"><input type="checkbox" data-a="tg" data-p="hue.on" ${s.hue.on?"checked":""}> Zapnuto</label>
  <label class="f">Vlastní barva<input type="color" data-a="in" data-p="hue.color" value="${s.hue.color}"></label>
  <div class="sw">${sw.map(c=>`<button style="background:${c}" data-a="hue" data-v="${c}" title="${c}"></button>`).join("")}</div>`;
 h+=`</div>`;
 /* stopa kurzoru */
 h+=`<div class="card"><h3>✨ Stopa kurzoru</h3><small>Za myší (prstem) zůstává světelná stopa.</small>`;
 if(!s.trail.own)h+=btnBuy(VY.PRICES.trail,`data-a="buy" data-k="trail"`);
 else h+=`<label class="switch"><input type="checkbox" data-a="tg" data-p="trail.on" ${s.trail.on?"checked":""}> Zapnuto</label>
  <label class="f">Styl<select data-a="sel" data-p="trail.mode">${[["rainbow","Duhové tečky"],["bubbles","Bubliny 🫧"]].map(o=>`<option value="${o[0]}" ${s.trail.mode===o[0]?"selected":""}>${o[1]}</option>`).join("")}</select></label>`;
 h+=`</div></div>`;

 h+=`<h2>Pozadí menu</h2><div class="grid">`;
 for(const b of VY.BGS){
  const o=s.own.bg.includes(b.id),eq=s.bg===b.id;
  h+=`<div class="card${eq?" eq":""}"><div class="big">${b.e}</div><h3>${b.n}</h3>
  ${o?`<button class="btn${eq?" ok":" alt"}" ${eq?"disabled":`data-a="equip" data-k="bg" data-id="${b.id}"`}>${eq?"✔ Používáš":"Použít"}</button>`:btnBuy(b.p,`data-a="buy" data-k="bg" data-id="${b.id}"`)}</div>`;
 }
 return h+`</div>`;
}

function tabProf(s){
 let h=`<h2>Přezdívka</h2><div class="card"><div class="row"><input type="text" id="nick" maxlength="16" placeholder="Tvoje přezdívka" value="${VY.esc(s.nick)}" style="flex:1;min-width:160px"><button class="btn" data-a="nick">Uložit</button></div>
 <small>2–16 znaků (písmena, čísla, mezera, _ . -). Zobrazí se v žebříčku, jakmile se otevře.</small>
 <div class="nm">Náhled: ${VY.nameHTML(s)}</div></div>`;
 h+=`<h2>Styl jména</h2><div class="grid">
 <div class="card${!s.ns?" eq":""}"><div class="nm"><span class="vy-nm">${VY.esc(s.nick||"Hráč")}</span></div><h3>Základní</h3>
 <button class="btn${!s.ns?" ok":" alt"}" ${!s.ns?"disabled":`data-a="equip" data-k="ns" data-id=""`}>${!s.ns?"✔ Používáš":"Použít"}</button></div>`;
 for(const n of VY.NS){
  const o=s.own.ns.includes(n.id),eq=s.ns===n.id;
  h+=`<div class="card${eq?" eq":""}"><div class="nm"><span class="vy-nm vy-nm-${n.id}">${VY.esc(s.nick||"Hráč")}</span></div><h3>${n.n}</h3>
  ${o?`<button class="btn${eq?" ok":" alt"}" ${eq?"disabled":`data-a="equip" data-k="ns" data-id="${n.id}"`}>${eq?"✔ Používáš":"Použít"}</button>`:btnBuy(n.p,`data-a="buy" data-k="ns" data-id="${n.id}"`)}</div>`;
 }
 h+=`</div><h2>Odznak před jménem</h2><div class="grid">
 <div class="card${!s.badge?" eq":""}"><div class="big">∅</div><h3>Bez odznaku</h3>
 <button class="btn${!s.badge?" ok":" alt"}" ${!s.badge?"disabled":`data-a="equip" data-k="badge" data-id=""`}>${!s.badge?"✔ Používáš":"Použít"}</button></div>`;
 for(const b of VY.BADGES){
  const o=s.own.badge.includes(b.id),eq=s.badge===b.id;
  h+=`<div class="card${eq?" eq":""}"><div class="big">${b.e}</div>
  ${o?`<button class="btn${eq?" ok":" alt"}" ${eq?"disabled":`data-a="equip" data-k="badge" data-id="${b.id}"`}>${eq?"✔ Používáš":"Použít"}</button>`:btnBuy(b.p,`data-a="buy" data-k="badge" data-id="${b.id}"`)}</div>`;
 }
 return h+`</div>`;
}

function tabAdm(s){
 let h=`<h2>Admin panely minihr</h2><p class="hint">Koupený admin panel se v dané minihře otevře bez hesla.</p><div class="grid">`;
 for(const a of VY.ADM){
  const o=s.own.adm.includes(a.id);
  h+=`<div class="card"><div class="big">${a.e}</div><h3>${a.n}</h3><small>${a.how}</small>
  ${o?owned:btnBuy(a.p,`data-a="buy" data-k="adm" data-id="${a.id}"`)}</div>`;
 }
 return h+`</div>`;
}

function tabBonus(s){
 const can=s.daily.last!==VY.today(),r=VY.dailyReward(s);
 let h=`<h2>Denní odměna</h2><div class="card"><div class="row sp"><div><h3>🎁 +${r} 🪙</h3><small>Série: ${s.daily.last===VY.yesterday()||!can?s.daily.streak:0} dní (každý den v řadě = +10, max 7 dní). Cache zvyšuje odměnu.</small></div>
 <button class="btn${can?"":" ok"}" ${can?`data-a="daily"`:"disabled"}>${can?"Vyzvednout":"✔ Dnes vyzvednuto"}</button></div></div>`;
 h+=`<h2>Jak získat tokeny</h2><div class="card">`;
 for(const k in VY.GAMES)h+=`<div class="stat"><span>${VY.GAMES[k]}</span><span class="mut">1 🪙 za ${Math.round(1/VY.RATE[k])} 💰 · max ${VY.CAP[k]} 🪙 / událost</span></div>`;
 h+=`<div class="stat"><span>🌐 Pasivně (Síť)</span><span class="mut">${VY.passivePerMin(s)} 🪙 / min, když máš web otevřený</span></div></div>
 <h2>Statistiky</h2><div class="card"><div class="stat"><span>Získáno celkem</span><b>${fmt(s.earned)} 🪙</b></div>
 <div class="stat"><span>Násobič z Výkonu serveru</span><b>×${VY.mult(s).toFixed(1)}</b></div></div>`;
 return h;
}

function render(){
 const s=VY.load();
 $("bal").textContent=fmt(VY.tok());
 document.querySelectorAll("#tabs button").forEach(b=>b.classList.toggle("on",b.dataset.tab===tab));
 const y=document.scrollingElement.scrollTop;
 $("view").innerHTML=({srv:tabSrv,look:tabLook,prof:tabProf,adm:tabAdm,bonus:tabBonus})[tab](s);
 document.scrollingElement.scrollTop=y;
}

/* ---------- akce ---------- */
const OWNLIST={ns:()=>VY.NS,badge:()=>VY.BADGES,bg:()=>VY.BGS,adm:()=>VY.ADM};
function buy(k,id){
 const s=VY.load(),flag=["rgb","hue","trail"].includes(k);
 const p=flag?VY.PRICES[k]:OWNLIST[k]().find(x=>x.id===id).p;
 if(flag?s[k].own:s.own[k].includes(id))return;
 if(!VY.spend(p)){toast("Nedostatek tokenů 🪙 – zahraj si minihry");return}
 if(flag){s[k].own=1;s[k].on=1}else s.own[k].push(id);
 VY.save(s);toast("Zakoupeno ✔");commit();
}
function setPath(p,v){
 const s=VY.load(),a=p.split(".");s[a[0]][a[1]]=v;VY.save(s);VY.notify();
}
document.addEventListener("click",e=>{
 const t=e.target.closest("[data-tab],[data-a]");if(!t)return;
 if(t.dataset.tab){tab=t.dataset.tab;render();return}
 const a=t.dataset.a,s=VY.load();
 if(a==="buy")buy(t.dataset.k,t.dataset.id);
 else if(a==="srv"){
  const id=t.dataset.id,l=s.srv[id];if(l>=VY.SRV_MAX)return;
  if(!VY.spend(VY.srvCost(id,l))){toast("Nedostatek tokenů 🪙 – zahraj si minihry");return}
  s.srv[id]++;VY.save(s);toast("Server vylepšen ✔");commit();
 }
 else if(a==="equip"){const k=t.dataset.k;s[k]=t.dataset.id;VY.save(s);commit()}
 else if(a==="theme"){s.theme=t.dataset.v;VY.save(s);commit()}
 else if(a==="hue"){s.hue.color=t.dataset.v;s.hue.on=1;VY.save(s);commit()}
 else if(a==="nick"){
  const v=$("nick").value.trim().replace(/\s+/g," ");
  if(!/^[\p{L}\p{N} _.\-]{2,16}$/u.test(v)){toast("Přezdívka: 2–16 znaků (písmena, čísla, _ . -)");return}
  s.nick=v;VY.save(s);toast("Přezdívka uložena ✔");commit();
 }
 else if(a==="daily"){
  if(s.daily.last===VY.today())return;
  const r=VY.dailyReward(s);
  s.daily={last:VY.today(),streak:s.daily.last===VY.yesterday()?s.daily.streak+1:1};
  s.earned+=r;VY.save(s);VY.addTok(r);toast("+"+r+" 🪙");commit();
 }
});
document.addEventListener("change",e=>{
 const t=e.target,a=t.dataset.a;if(!a)return;
 if(a==="tg"){setPath(t.dataset.p,t.checked?1:0);render()}
 else if(a==="sel"){setPath(t.dataset.p,t.value);render()}
});
document.addEventListener("input",e=>{
 const t=e.target;if(t.dataset.a==="in")setPath(t.dataset.p,t.type==="range"?+t.value:t.value);
});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="nick"){e.preventDefault();document.querySelector('[data-a="nick"]').click()}});

/* zpráva z hlavního okna (např. admin přidal tokeny): při ovládání posuvníku jen obnov zůstatek */
window.onVyChange=()=>{
 const a=document.activeElement;
 if(a&&(a.tagName==="INPUT"||a.tagName==="SELECT"))$("bal").textContent=fmt(VY.tok());
 else render();
};
render();
