const GUNIMG=GUN_IMAGES;
const W=960,H=540,HORIZON=330,CAR_EDGE=628;
const $=id=>document.getElementById(id);
const cv=$("cv"),ctx=cv.getContext("2d",{alpha:false});
let S=1,OX=0,OY=0,DPR=1,bgDirty=true;
/* zápis do DOMu jen při změně hodnoty (šetří výkon) */
const cache={};
function setT(id,v){if(cache[id]!==v){cache[id]=v;$(id).textContent=v}}
function setW(id,v){if(cache[id]!==v){cache[id]=v;$(id).style.width=v}}
function setOp(id,v){if(cache[id]!==v){cache[id]=v;$(id).style.opacity=v}}
function resize(){DPR=Math.min(1.5,devicePixelRatio||1);const w=innerWidth,h=innerHeight;cv.width=Math.round(w*DPR);cv.height=Math.round(h*DPR);S=Math.min(w/W,h/H);OX=(w-W*S)/2;OY=(h-H*S)/2;bgDirty=true}
addEventListener("resize",resize);resize();

/* ---------- předrenderované sprity (rychlejší než gradienty každý snímek) ---------- */
function mkSprite(sz,stops){const c=document.createElement("canvas");c.width=c.height=sz;const g=c.getContext("2d"),r=sz/2,gr=g.createRadialGradient(r,r,0,r,r,r);for(const [o,col] of stops)gr.addColorStop(o,col);g.fillStyle=gr;g.fillRect(0,0,sz,sz);return c}
const FLAME_HOT=mkSprite(64,[[0,"#fff6b0"],[.5,"#ff7a1a"],[1,"rgba(209,32,0,0)"]]);
const FLAME_COOL=mkSprite(64,[[0,"#ffd23a"],[.5,"#ff7a1a"],[1,"rgba(209,32,0,0)"]]);
const SMOKE_SP=mkSprite(64,[[0,"rgba(26,15,12,1)"],[.6,"rgba(26,15,12,.7)"],[1,"rgba(26,15,12,0)"]]);
/* ---------- zbraně (rate = ran/s, dmg = poškození, cyc = reálná kadence) ---------- */
const WEAPONS=[
 {id:"rev",name:"Revolver .44 Magnum",price:0,dmg:70,rate:2,mag:6,reload:2.6,auto:false,spread:.012,pierce:1,len:54,ax:.14,ay:.6,shake:2,real:"Reálně ~2 rány/s (dvojčinný), 6 nábojů"},
 {id:"deagle",name:"Desert Eagle .50 AE",price:400,dmg:130,rate:3,mag:7,reload:2.0,auto:false,spread:.014,pierce:1,len:58,ax:.2,ay:.55,shake:3.5,real:"Samonabíjecí, ~3 rány/s, 7 nábojů, mohutný zákop"},
 {id:"ak",name:"AK-47",price:1200,dmg:32,rate:10,mag:30,reload:2.4,auto:true,spread:.03,pierce:1,len:108,ax:.3,ay:.5,shake:1.6,real:"7,62×39 mm, kadence ~600 ran/min (10/s), zásobník 30"},
 {id:"sniper",name:"Odstřelovačka (AWM)",price:2500,dmg:400,rate:.85,mag:5,reload:3.2,auto:false,spread:0,pierce:3,len:140,ax:.3,ay:.45,shake:5,real:"Opakovačka, ~50 výstřelů/min, 5 nábojů, projde až 3 zombie"},
 {id:"minigun",name:"Minigun M134",price:6000,dmg:16,rate:50,mag:200,reload:6,auto:true,spread:.05,pierce:1,len:96,ax:.85,ay:.55,shake:1.2,spin:true,real:"7,62×51 mm, až 3 000–6 000 ran/min (zde 3 000), roztáčí se ~0,5 s"}
];
const IMG={};for(const w of WEAPONS){const i=new Image();i.src=GUNIMG[w.id];IMG[w.id]=i}
const money0=()=>{try{return +localStorage.getItem("zb_money")||0}catch(e){return 0}};
let money=money0(),owned=["rev"];
try{const o=JSON.parse(localStorage.getItem("zb_owned")||"null");if(Array.isArray(o)&&o.includes("rev"))owned=o}catch(e){}
function persist(){try{localStorage.setItem("zb_money",money);localStorage.setItem("zb_owned",JSON.stringify(owned))}catch(e){}}
let cur="rev";const ammo={};const wmap={};for(const w of WEAPONS){ammo[w.id]=w.mag;wmap[w.id]=w}

/* ---------- audio ---------- */
let AC=null,master=null,nbuf=null;
function initAudio(){
  if(AC){if(AC.state==="suspended")AC.resume();return}
  try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){return}
  const comp=AC.createDynamicsCompressor();master=AC.createGain();master.gain.value=.7;master.connect(comp);comp.connect(AC.destination);
  nbuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=nbuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
}
function noise(dur,type,f,q,g,when){if(!AC)return;const t=AC.currentTime+(when||0);
  const s=AC.createBufferSource();s.buffer=nbuf;const fl=AC.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;
  const gn=AC.createGain();gn.gain.setValueAtTime(g,t);gn.gain.exponentialRampToValueAtTime(.001,t+dur);
  s.connect(fl);fl.connect(gn);gn.connect(master);s.start(t,Math.random()*.5,dur+.02)}
function tone(f1,f2,dur,type,g,when){if(!AC)return;const t=AC.currentTime+(when||0);
  const o=AC.createOscillator();o.type=type;o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+dur);
  const gn=AC.createGain();gn.gain.setValueAtTime(g,t);gn.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(gn);gn.connect(master);o.start(t);o.stop(t+dur+.02)}
const click=(w)=>{tone(1300,600,.03,"square",.12,w);noise(.02,"highpass",4000,.7,.18,w)};
const thunk=(w)=>{tone(220,80,.09,"square",.25,w);noise(.07,"lowpass",1500,.7,.3,w)};
function groan(vol,pitch){if(!AC)return;const t=AC.currentTime,dur=.7+Math.random()*.7,f=(75+Math.random()*50)*(pitch||1);
  const o=AC.createOscillator();o.type="sawtooth";o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.6,t+dur);
  const l=AC.createOscillator(),lg=AC.createGain();l.frequency.value=5+Math.random()*3;lg.gain.value=f*.08;l.connect(lg);lg.connect(o.frequency);
  const fl=AC.createBiquadFilter();fl.type="lowpass";fl.frequency.value=420;
  const gn=AC.createGain();gn.gain.setValueAtTime(.001,t);gn.gain.linearRampToValueAtTime(vol,t+.12);gn.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(fl);fl.connect(gn);gn.connect(master);o.start(t);l.start(t);o.stop(t+dur);l.stop(t+dur)}
let lastMg=0,lastHit=0;
function sfxShot(id){
  if(id==="minigun"){const n=performance.now();if(n-lastMg<34)return;lastMg=n}
  if(id==="rev"){noise(.28,"lowpass",2800,.7,.9);noise(.08,"highpass",2500,.7,.5);tone(140,45,.25,"sine",.8)}
  else if(id==="deagle"){noise(.4,"lowpass",2200,.7,1);noise(.1,"highpass",3000,.7,.6);tone(110,35,.35,"sine",1);noise(.3,"lowpass",900,.7,.25,.09)}
  else if(id==="ak"){noise(.14,"bandpass",1600,.8,.7);noise(.05,"highpass",3000,.7,.4);tone(130,50,.12,"sine",.6)}
  else if(id==="minigun"){noise(.05,"bandpass",1400,.8,.3);tone(180,80,.05,"square",.1)}
  else if(id==="sniper"){noise(.7,"lowpass",1800,.6,1.1);noise(.15,"highpass",2500,.7,.7);tone(90,28,.55,"sine",1.1);noise(.5,"lowpass",700,.7,.3,.12);click(.55);thunk(.85)}
}
function sfxReload(id){
  if(id==="rev"){for(let i=0;i<6;i++)click(.3+i*.25);thunk(1.9)}
  else if(id==="deagle"){thunk(.1);thunk(1.0);click(1.6);thunk(1.75)}
  else if(id==="ak"){thunk(.1);thunk(1.2);click(1.9);thunk(2.05)}
  else if(id==="minigun"){tone(200,60,1.2,"sawtooth",.12);thunk(.5);thunk(3);thunk(4.2);tone(60,200,1.2,"sawtooth",.1,4.6)}
  else if(id==="sniper"){click(.2);thunk(.7);thunk(1.6);click(2.4);thunk(2.8)}
}
let whirr=null;
function setWhirr(v){if(!AC)return;if(!whirr){const o=AC.createOscillator();o.type="sawtooth";const g=AC.createGain();g.gain.value=0;const f=AC.createBiquadFilter();f.type="lowpass";f.frequency.value=600;o.connect(f);f.connect(g);g.connect(master);o.start();whirr={o,g}}
  whirr.o.frequency.value=50+v*220;whirr.g.gain.value=v*.05}
const sfxHit=()=>{const n=performance.now();if(n-lastHit<45)return;lastHit=n;noise(.08,"lowpass",700,.7,.4);tone(110,60,.08,"sine",.3)};
const sfxDie=()=>{groan(.22,.7);noise(.15,"lowpass",500,.7,.5,.05);tone(90,35,.2,"sine",.5,.05)};
const sfxCoin=()=>{tone(988,988,.07,"square",.07);tone(1319,1319,.12,"square",.07,.07)};
const sfxRoar=()=>{tone(75,32,1.8,"sawtooth",.35);noise(1.6,"lowpass",450,.7,.6);tone(60,28,1.8,"sawtooth",.3,.25)};
const sfxHurt=()=>{noise(.25,"lowpass",300,.7,.8);tone(90,40,.2,"sine",.6)};
setInterval(()=>{if(!AC||!running||shopOpen||adminOpen||paused)return;if(Math.random()<.6)noise(.03+Math.random()*.04,"highpass",1500+Math.random()*3000,.7,.02+Math.random()*.05)},110);

/* ---------- stav hry ---------- */
let running=false,shopOpen=false,over=false,adminOpen=false,paused=false;
let zs=[],parts=[],smokes=[],tracers=[],floats=[],flames=[];
let hp=100,kills=0,time=0,spawnT=1,bossT=0,bossNext=40,bossN=0,bossRef=null;
let aim={x:300,y:380},firing=false,trigger=false,trigT=0,cd=0,reloadT=0,reloadDur=0,spin=0,kick=0,shake=0,flash=0,bannerT=0,hurtF=0;
const MUZ={x:0,y:0};
const PIV={x:730,y:274};

/* ohně */
const EM=[[130,250,1.2],[165,215,1.6],[205,230,1.4],[250,250,1.1],[150,300,1],[230,300,1],[400,300,1.2],[440,290,1],[470,310,.9],[560,335,.7],[60,335,.8],[690,340,.5],[300,338,.7],[520,338,.6]];
function emitFlame(x,y,k){if(flames.length>230)return;flames.push({x:x+(Math.random()-.5)*28*k,y,vx:(Math.random()-.5)*14,vy:-(30+Math.random()*50)*k,r:(8+Math.random()*12)*k,life:.6+Math.random()*.6,age:0})}
function emitSmoke(x,y,k){if(smokes.length<90)smokes.push({x,y,vx:8+Math.random()*10,vy:-(14+Math.random()*12),r:14+Math.random()*16,age:0,life:4+Math.random()*3,k:k||1})}

/* ---------- zombíci ---------- */
const SKIN=["#7fa56a","#8fae72","#6f9a7a","#a2b47c","#7a9a5c"];
const SHIRT=["#8a2b2b","#355c7a","#6b6b2e","#444","#7a4a2b","#2f5a3a","#c9c9c9","#7a2f6b"];
const PANTS=["#2b3a55","#3a3a3a","#4a3a2a","#1f2d3d","#5a4a3a"];
const HAIR=["#2b1d12","#111","#5a3b1c","#8a8a8a","#6b2a10"];
function mkZ(type){
  const lane=352+Math.random()*92;
  const base={type,x:-50-Math.random()*40,y:lane,ph:Math.random()*6,dead:0,hit:0,atk:0,
    skin:SKIN[Math.random()*SKIN.length|0],shirt:SHIRT[Math.random()*SHIRT.length|0],pants:PANTS[Math.random()*PANTS.length|0],hair:HAIR[Math.random()*HAIR.length|0],stain:Math.random()<.6,bald:Math.random()<.25};
  if(type==="walk")Object.assign(base,{hp:100,max:100,sp:26+Math.random()*14,sc:1,rew:10,dps:5});
  if(type==="run")Object.assign(base,{hp:60,max:60,sp:75+Math.random()*25,sc:.95,rew:16,dps:4,lean:.35});
  if(type==="brute")Object.assign(base,{hp:380,max:380,sp:18+Math.random()*6,sc:1.4,rew:45,dps:12,shirt:"#3a2a2a"});
  if(type==="boss"){const m=1+bossN*.6;Object.assign(base,{hp:1800*m,max:1800*m,sp:14,sc:2.3,rew:Math.round(800*(1+bossN*.4)),dps:28,skin:"#5e7d4f",shirt:"#2a1515",y:395,boss:1})}
  return base;
}
function spawn(){
  if(zs.filter(z=>!z.dead).length>=26)return;
  const r=Math.random();let t="walk";
  if(time>25&&r<Math.min(.3,(time-25)/200))t="run";
  else if(time>60&&r>.88)t="brute";
  const z=mkZ(t);zs.push(z);if(Math.random()<.25)groan(.06,1)
}
function spawnBoss(){const z=mkZ("boss");zs.push(z);bossRef=z;bossN++;$("bossN").textContent="Boss #"+bossN;$("boss").style.display="block";
  banner("⚠ ZOMBIE BOSS SE BLÍŽÍ ⚠",3.2);sfxRoar();shake=10}

function drawZombie(z){
  const sc=z.sc*(0.85+(z.y-350)/100*.3);
  ctx.save();ctx.translate(z.x,z.y);ctx.scale(sc,sc);
  let alpha=1;
  if(z.dead){const p=Math.min(1,z.dead/.45);ctx.rotate(-p*1.45);alpha=Math.max(0,1-(z.dead-.6)/.6)}
  ctx.globalAlpha=alpha;
  const sw=z.dead?0:Math.sin(z.ph*(z.type==="run"?1.6:1));
  const cs=z.dead?0:Math.cos(z.ph);
  const bob=z.dead?0:Math.abs(Math.sin(z.ph))*2;
  const skin=z.hit>0?"#d9e8c0":z.skin;
  ctx.lineCap="round";
  // nohy
  ctx.strokeStyle=z.pants;ctx.lineWidth=7;
  ctx.beginPath();ctx.moveTo(-2,-27-bob);ctx.lineTo(-2+sw*10,-2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(2,-27-bob);ctx.lineTo(2-sw*10,-2);ctx.stroke();
  ctx.fillStyle="#1a1410";ctx.fillRect(-2+sw*10-4,-4,9,4);ctx.fillRect(2-sw*10-4,-4,9,4);
  ctx.save();ctx.translate(0,-27-bob);ctx.rotate((z.lean||.08)+(z.dead?0:cs*.03));ctx.translate(0,27+bob);
  // zadní ruka
  ctx.strokeStyle=skin;ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(1,-46-bob);ctx.lineTo(19,-43-bob+cs*3);ctx.stroke();
  // trup
  ctx.fillStyle=z.shirt;ctx.beginPath();ctx.roundRect(-8,-52-bob,17,27,4);ctx.fill();
  ctx.fillStyle="#0004";ctx.beginPath();ctx.moveTo(-8,-28-bob);ctx.lineTo(-5,-24-bob);ctx.lineTo(-2,-28-bob);ctx.lineTo(2,-24-bob);ctx.lineTo(5,-28-bob);ctx.lineTo(9,-25-bob);ctx.lineTo(9,-27-bob);ctx.fill();
  if(z.stain){ctx.fillStyle="#7a0f0f";ctx.beginPath();ctx.ellipse(1,-40-bob,5,7,.4,0,7);ctx.fill()}
  // hlava
  ctx.fillStyle=skin;ctx.beginPath();ctx.arc(2,-60-bob,8,0,7);ctx.fill();
  if(!z.bald){ctx.fillStyle=z.hair;ctx.beginPath();ctx.arc(1,-63-bob,8,Math.PI*1.05,Math.PI*1.95);ctx.fill()}
  ctx.fillStyle=z.boss?"#ff2a1a":"#e8e0a0";ctx.fillRect(5,-63-bob,2.6,2.6);ctx.fillRect(1,-63-bob,2.2,2.2);
  ctx.fillStyle="#2a0a0a";ctx.fillRect(3,-56-bob,5,2.5);
  // přední ruka
  ctx.strokeStyle=skin;ctx.lineWidth=5.5;
  ctx.beginPath();ctx.moveTo(3,-45-bob);ctx.lineTo(22,-46-bob-cs*3);ctx.stroke();
  if(z.boss){ctx.fillStyle="#555";ctx.beginPath();ctx.moveTo(-10,-52-bob);ctx.lineTo(-14,-64-bob);ctx.lineTo(-3,-54-bob);ctx.fill();ctx.beginPath();ctx.moveTo(10,-52-bob);ctx.lineTo(15,-64-bob);ctx.lineTo(4,-54-bob);ctx.fill()}
  ctx.restore();ctx.restore();ctx.globalAlpha=1;
}
function hitbox(z){const sc=z.sc*(0.85+(z.y-350)/100*.3);return{x1:z.x-13*sc-2,x2:z.x+16*sc+2,y1:z.y-68*sc,y2:z.y,h:68*sc,sc}}

/* ---------- střelba ---------- */
function rayBox(ox,oy,dx,dy,b){
  let t1=0,t2=1800;
  if(Math.abs(dx)<1e-9){if(ox<b.x1||ox>b.x2)return null}else{let a=(b.x1-ox)/dx,c=(b.x2-ox)/dx;if(a>c)[a,c]=[c,a];t1=Math.max(t1,a);t2=Math.min(t2,c)}
  if(Math.abs(dy)<1e-9){if(oy<b.y1||oy>b.y2)return null}else{let a=(b.y1-oy)/dy,c=(b.y2-oy)/dy;if(a>c)[a,c]=[c,a];t1=Math.max(t1,a);t2=Math.min(t2,c)}
  return t1<=t2?t1:null;
}
function muzzle(w){
  const a=Math.atan2(aim.y-PIV.y,aim.x-PIV.x);const d=(1-w.ax)*w.len+8-kick*4;
  MUZ.x=PIV.x+Math.cos(a)*d;MUZ.y=PIV.y+Math.sin(a)*d;return a
}
function shoot(w){
  const a0=muzzle(w),a=a0+(Math.random()-.5)*2*w.spread;
  const dx=Math.cos(a),dy=Math.sin(a);
  const hits=[];
  for(const z of zs){if(z.dead)continue;const b=hitbox(z);const t=rayBox(MUZ.x,MUZ.y,dx,dy,b);if(t!==null)hits.push({z,t,b})}
  hits.sort((p,q)=>p.t-q.t);
  let end=1400,n=0;
  for(const h of hits){
    if(n>=w.pierce)break;
    const py=MUZ.y+dy*h.t;const head=py<h.b.y1+h.b.h*.24;
    const dmg=w.dmg*(head?(h.z.boss?1.5:2):1)*(n?0.75:1);
    damage(h.z,dmg,MUZ.x+dx*h.t,py,head);n++;end=h.t;
  }
  if(n<1)end=1400;
  tracers.push({x1:MUZ.x,y1:MUZ.y,x2:MUZ.x+dx*end,y2:MUZ.y+dy*end,life:w.id==="sniper"?.14:.06,k:w.id==="minigun"?.7:1});
  flash=.05;kick=1;shake=Math.max(shake,w.shake);ammo[w.id]--;
  sfxShot(w.id);
  for(let i=0;i<3&&parts.length<320;i++)parts.push({x:MUZ.x,y:MUZ.y,vx:Math.cos(a)*(120+Math.random()*120)+(Math.random()-.5)*40,vy:Math.sin(a)*(120+Math.random()*120)+(Math.random()-.5)*40,life:.12,age:0,c:"#ffd27a",r:2});
}
function damage(z,d,px,py,head){
  z.hp-=d;z.hit=.08;z.x-=(z.boss?.4:2);sfxHit();
  for(let i=0,n=(wmap[cur].rate>8?2:6);i<n&&parts.length<320;i++)parts.push({x:px,y:py,vx:(Math.random()-.3)*120,vy:(Math.random()-.8)*120,life:.5,age:0,c:"#8a0f0f",r:1.6+Math.random()*1.6,g:400});
  if(head)floats.push({x:px,y:py-8,t:"💥",life:.5,age:0,s:14});
  if(z.hp<=0&&!z.dead){
    z.dead=.001;kills++;money+=z.rew;if(window.vyEarn)vyEarn("zom",z.rew);persist();sfxDie();sfxCoin();
    floats.push({x:z.x,y:z.y-70,t:"+"+z.rew+" 💰",life:1,age:0,s:z.boss?26:16});
    for(let i=0;i<10;i++)parts.push({x:z.x,y:z.y-30,vx:(Math.random()-.5)*160,vy:-Math.random()*160,life:.7,age:0,c:"#8a0f0f",r:2+Math.random()*2,g:400});
    if(z.boss){bossRef=null;$("boss").style.display="none";bossT=0;bossNext=50;banner("☠ BOSS PORAŽEN! +"+z.rew+" 💰",2.4);shake=8}
    uiMoney();
  }
}
function startReload(){
  const w=wmap[cur];if(reloadT>0||ammo[cur]>=w.mag)return;
  reloadT=reloadDur=w.reload;sfxReload(cur)
}

/* ---------- UI ---------- */
function banner(t,s){const b=$("banner");b.textContent=t;b.classList.add("show");bannerT=s}
function uiMoney(){$("money").textContent=money;renderShop()}
function uiSlots(){
  $("slots").innerHTML=WEAPONS.filter(w=>owned.includes(w.id)).map((w,i)=>`<div class="ws ${w.id===cur?"on":""}" data-id="${w.id}"><b>${i+1}</b><img src="${GUNIMG[w.id]}"></div>`).join("");
  document.querySelectorAll(".ws").forEach(e=>e.onclick=()=>equip(e.dataset.id))
}
function equip(id){if(!owned.includes(id)||id===cur)return;cur=id;reloadT=0;spin=0;setWhirr(0);cd=0;uiSlots();renderShop()}
function renderShop(){
  $("items").innerHTML=WEAPONS.map(w=>{
    const has=owned.includes(w.id),dps=Math.round(w.dmg*w.rate);
    const btn=has?(w.id===cur?`<button class="eq" disabled>✔ Vybavená</button>`:`<button class="eq" data-eq="${w.id}">Vzít do ruky</button>`):`<button data-buy="${w.id}" ${money<w.price?"disabled":""}>Koupit – ${w.price} 💰</button>`;
    return `<div class="it"><img src="${GUNIMG[w.id]}"><div><b>${w.name}</b><small>Poškození ${w.dmg} · ${w.rate<1?w.rate.toFixed(2):w.rate} ran/s · DPS ~${dps}<br>Zásobník ${w.mag} · přebití ${w.reload} s<br>${w.real}</small>${btn}</div></div>`}).join("")+
  `<div class="it"><div style="font-size:2.6rem;text-align:center">🩹</div><div><b>Lékárnička</b><small>Doplní 50 ❤️</small><button data-med ${money<150||hp>=100?"disabled":""}>Koupit – 150 💰</button></div></div>`;
  document.querySelectorAll("[data-buy]").forEach(b=>b.onclick=()=>{const w=wmap[b.dataset.buy];if(money>=w.price&&!owned.includes(w.id)){money-=w.price;owned.push(w.id);persist();cur=w.id;reloadT=0;uiSlots();uiMoney()}});
  document.querySelectorAll("[data-eq]").forEach(b=>b.onclick=()=>equip(b.dataset.eq));
  document.querySelectorAll("[data-med]").forEach(b=>b.onclick=()=>{if(money>=150&&hp<100){money-=150;hp=Math.min(100,hp+50);setW("hpF",hp+"%");persist();uiMoney()}})
}
$("shopB").onclick=()=>{shopOpen=!shopOpen;$("shop").classList.toggle("open",shopOpen);if(shopOpen){firing=false;setWhirr(0);renderShop()}};
$("rb").onclick=startReload;
$("go").onclick=()=>{initAudio();$("start").classList.remove("show");reset();running=true};
$("again").onclick=()=>{initAudio();$("over").classList.remove("show");reset();running=true};
function reset(){zs=[];parts=[];tracers=[];floats=[];hp=100;kills=0;time=0;spawnT=1;bossT=0;bossNext=40;bossN=0;bossRef=null;over=false;reloadT=0;spin=0;
  for(const w of WEAPONS)ammo[w.id]=w.mag;setW("hpF","100%");$("boss").style.display="none";uiSlots();uiMoney()}
addEventListener("message",e=>{
  const d=e.data;if(!d)return;
  if(typeof d.pause==="boolean"){paused=d.pause;firing=false;setWhirr(0);if(AC){try{paused?AC.suspend():AC.resume()}catch(_){}}}
  const n=+d.addMoney;if(n){money+=n;persist();uiMoney()}
});

/* ---------- admin panel (heslo: perofacky) ---------- */
const normP=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
const admNum=()=>{const v=parseInt($("admNum").value,10);return isNaN(v)?0:v};
const admMsg=t=>{$("admOut").textContent=t};
function setAdm(open){
  adminOpen=open;$("adm").classList.toggle("open",open);
  if(open){firing=false;setWhirr(0);shopOpen=false;$("shop").classList.remove("open");if($("admLogin").style.display!=="none")$("admPw").focus()}
}
function admTry(){
  const p=$("admPw");
  if(normP(p.value)==="perofacky"){$("admLogin").style.display="none";$("admTools").style.display="block";p.value="";p.classList.remove("bad");admMsg("")}
  else{p.classList.remove("bad");void p.offsetWidth;p.classList.add("bad")}
}
$("admB").onclick=()=>setAdm(!adminOpen);
$("admGo").onclick=admTry;
$("admPw").addEventListener("keydown",e=>{if(e.key==="Enter")admTry()});
$("aAdd").onclick=()=>{const n=admNum();money=Math.max(0,money+n);persist();uiMoney();admMsg("Přidáno "+n+" 💰 (máš "+money+")")};
$("aSet").onclick=()=>{money=Math.max(0,admNum());persist();uiMoney();admMsg("Peníze nastaveny na "+money+" 💰")};
$("aAll").onclick=()=>{owned=WEAPONS.map(w=>w.id);persist();uiSlots();renderShop();admMsg("Všechny zbraně odemčeny")};
$("aHeal").onclick=()=>{hp=100;setW("hpF","100%");admMsg("Zdraví doplněno")};
$("aBoss").onclick=()=>{if(!running||over)admMsg("Nejdřív spusť hru");else if(bossRef)admMsg("Boss už žije");else{spawnBoss();admMsg("Boss přivolán")}};
$("aOff").onclick=()=>{$("admTools").style.display="none";$("admLogin").style.display="block";admMsg("");setAdm(false)};

/* ---------- vstup ---------- */
function setAim(e){const r=cv.getBoundingClientRect();aim.x=(e.clientX-r.left-OX)/S;aim.y=(e.clientY-r.top-OY)/S}
cv.addEventListener("pointerdown",e=>{initAudio();setAim(e);firing=true;trigger=true;trigT=.25;try{cv.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()});
cv.addEventListener("pointermove",e=>setAim(e));
const up=()=>{firing=false};cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",up);
addEventListener("keydown",e=>{
  if(e.repeat||(e.target&&e.target.tagName==="INPUT"))return;
  if(e.key==="r"||e.key==="R")startReload();
  const n=+e.key;if(n>=1&&n<=9){const list=WEAPONS.filter(w=>owned.includes(w.id));if(list[n-1])equip(list[n-1].id)}
});

/* ---------- update ---------- */
function update(dt){
  // pozadí: plameny a kouř běží vždy
  for(const [x,y,k] of EM){if(Math.random()<dt*15*k)emitFlame(x,y,k);if(Math.random()<dt*2.5)emitSmoke(x,y-30,k)}
  if(Math.random()<dt*4)emitSmoke(700,340,.6);if(Math.random()<dt*10)emitFlame(696,342,.35);
  for(const f of flames){f.age+=dt;f.x+=f.vx*dt;f.y+=f.vy*dt}flames=flames.filter(f=>f.age<f.life);
  for(const s of smokes){s.age+=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.r+=dt*6}smokes=smokes.filter(s=>s.age<s.life);
  for(const p of parts){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.g)p.vy+=p.g*dt}parts=parts.filter(p=>p.age<p.life);
  for(const t of tracers)t.life-=dt;tracers=tracers.filter(t=>t.life>0);
  for(const f of floats){f.age+=dt;f.y-=dt*28}floats=floats.filter(f=>f.age<f.life);
  shake=Math.max(0,shake-dt*30);kick=Math.max(0,kick-dt*8);flash=Math.max(0,flash-dt);hurtF=Math.max(0,hurtF-dt*2);
  if(bannerT>0){bannerT-=dt;if(bannerT<=0)$("banner").classList.remove("show")}
  setOp("flash",Math.round(hurtF*45)/100);
  if(!running||shopOpen||adminOpen||paused||over)return;
  time+=dt;
  // zombie spawn
  spawnT-=dt;if(spawnT<=0){spawn();if(Math.random()<.15&&time>40)spawn();spawnT=Math.max(.5,2.4-time*.012)*(.7+Math.random()*.6)}
  if(!bossRef){bossT+=dt;if(bossT>=bossNext)spawnBoss()}
  // zombie pohyb
  for(const z of zs){
    z.hit=Math.max(0,z.hit-dt);
    if(z.dead){z.dead+=dt;continue}
    if(z.x+16*z.sc<CAR_EDGE-(z.y>390?0:10)){z.x+=z.sp*dt;z.ph+=dt*z.sp*.22}
    else{z.ph+=dt*2;z.atk+=dt;if(z.atk>=1){z.atk=0;hp-=z.dps;hurtF=1;sfxHurt();if(Math.random()<.5)groan(.1,z.boss?.6:1);if(hp<=0){hp=0;gameOver()}}}
    if(Math.random()<dt*.12)groan(.04+Math.min(.12,(z.x+50)/3000),z.boss?.6:(z.type==="brute"?.8:1))
  }
  zs=zs.filter(z=>!z.dead||z.dead<1.3);
  // zbraň
  const w=wmap[cur];
  if(reloadT>0){reloadT-=dt;if(reloadT<=0){reloadT=0;ammo[cur]=w.mag}}
  if(w.spin){spin=Math.max(0,Math.min(1,spin+(firing&&reloadT<=0&&ammo[cur]>0?dt*2:-dt*1.6)));setWhirr(spin)}
  cd-=dt;
  trigT-=dt;const want=w.auto?firing:trigT>0;
  if(want&&reloadT<=0){
    if(ammo[cur]<=0){if(trigger||w.auto){if(trigger)click();startReload()}}
    else if(!w.spin||spin>=1){
      let guard=0;
      while(cd<=0&&ammo[cur]>0&&guard++<4){shoot(w);cd+=1/w.rate;if(!w.auto){trigT=0;break}}
      if(ammo[cur]<=0)startReload();
    }
  }
  if(cd<-.1)cd=-.1;
  trigger=false;
  // HUD
  setW("hpF",hp+"%");setT("kills",kills);setT("tm",Math.floor(time));
  setT("am",reloadT>0?"Přebíjím…":ammo[cur]+" / "+w.mag);
  setW("rlF",reloadT>0?Math.round((1-reloadT/reloadDur)*100)+"%":"0%");
  if(bossRef){setW("bossF",Math.max(0,Math.round(bossRef.hp/bossRef.max*1000)/10)+"%");setT("bossT",Math.max(0,Math.ceil(bossRef.hp))+" / "+Math.ceil(bossRef.max)+" ❤")}
}
function gameOver(){over=true;setWhirr(0);firing=false;$("ovT").textContent="Přežil jsi "+Math.floor(time)+" s a zabil "+kills+" zombíků. Peníze i zbraně ti zůstávají.";$("over").classList.add("show");renderShop()}

/* ---------- kreslení ---------- */
function drawFlame(f){const p=f.age/f.life;ctx.globalAlpha=(1-p)*.85;const r=f.r*(1-p*.6);ctx.drawImage(p<.3?FLAME_HOT:FLAME_COOL,f.x-r,f.y-r,r*2,r*2)}
function drawBg(ctx){
  const g=ctx.createLinearGradient(0,0,0,HORIZON);g.addColorStop(0,"#1c0806");g.addColorStop(.55,"#5a1a0c");g.addColorStop(1,"#d9601f");
  ctx.fillStyle=g;ctx.fillRect(-300,-300,W+600,HORIZON+300);
  // hvězdy/měsíc červený
  ctx.fillStyle="#ff9a5a";ctx.globalAlpha=.55;ctx.beginPath();ctx.arc(820,70,28,0,7);ctx.fill();ctx.globalAlpha=1;
  // dálkové kopce
  ctx.fillStyle="#2a0f08";ctx.beginPath();ctx.moveTo(-300,HORIZON);for(let x=-300;x<=W+300;x+=60)ctx.lineTo(x,HORIZON-22-Math.sin(x*.013)*14-Math.sin(x*.04)*6);ctx.lineTo(W+300,HORIZON);ctx.fill();
  // stromy
  ctx.strokeStyle="#140603";ctx.lineWidth=3;for(const x of [40,340,520,600,880]){ctx.beginPath();ctx.moveTo(x,HORIZON);ctx.lineTo(x,HORIZON-50);ctx.moveTo(x,HORIZON-30);ctx.lineTo(x+14,HORIZON-46);ctx.moveTo(x,HORIZON-38);ctx.lineTo(x-12,HORIZON-54);ctx.stroke()}
  // stodola
  ctx.fillStyle="#3b1408";ctx.fillRect(90,228,190,106);ctx.fillStyle="#2a0d05";ctx.beginPath();ctx.moveTo(80,230);ctx.lineTo(185,170);ctx.lineTo(290,230);ctx.fill();
  ctx.fillStyle="#140603";ctx.fillRect(150,268,70,66);ctx.strokeStyle="#5a2310";ctx.lineWidth=2;ctx.strokeRect(150,268,70,66);ctx.beginPath();ctx.moveTo(185,268);ctx.lineTo(185,334);ctx.stroke();
  // dům
  ctx.fillStyle="#3a2412";ctx.fillRect(380,270,110,64);ctx.fillStyle="#22100a";ctx.beginPath();ctx.moveTo(372,272);ctx.lineTo(435,232);ctx.lineTo(498,272);ctx.fill();
  ctx.fillStyle="#ffb24a";ctx.fillRect(398,288,18,20);ctx.fillRect(454,288,18,20);
  // silo
  ctx.fillStyle="#2a1810";ctx.fillRect(310,250,34,84);ctx.beginPath();ctx.ellipse(327,250,17,10,0,Math.PI,0);ctx.fill();
  // plot
  ctx.strokeStyle="#2a1208";ctx.lineWidth=3;for(let x=0;x<W;x+=46){ctx.beginPath();ctx.moveTo(x,HORIZON+4);ctx.lineTo(x,HORIZON+22-(x%3)*3);ctx.stroke()}
  ctx.beginPath();ctx.moveTo(0,HORIZON+10);ctx.lineTo(W,HORIZON+10);ctx.stroke();
  // země
  const gr=ctx.createLinearGradient(0,HORIZON,0,H);gr.addColorStop(0,"#3a1c0e");gr.addColorStop(1,"#1a0c06");
  ctx.fillStyle=gr;ctx.fillRect(-300,HORIZON+26,W+600,H-HORIZON+400);ctx.fillRect(-300,HORIZON,W+600,30);
  ctx.fillStyle="#2a1409";ctx.fillRect(-300,HORIZON+26,W+600,3);
  // cesta
  ctx.fillStyle="#4a2a14";ctx.beginPath();ctx.moveTo(-300,362);ctx.lineTo(W+300,350);ctx.lineTo(W+300,450);ctx.lineTo(-300,470);ctx.fill();
  // seno a bedny
  for(const [x,y] of [[60,500],[130,490],[860,505]]){ctx.fillStyle="#8a6a2a";ctx.fillRect(x,y-22,44,22);ctx.fillStyle="#6a4e1c";ctx.fillRect(x,y-22,44,4);ctx.fillRect(x,y-11,44,3)}
  // záře
  ctx.globalCompositeOperation="lighter";
  for(const [x,y,r] of [[185,250,300],[435,290,220],[60,330,160]]){const gg=ctx.createRadialGradient(x,y,0,x,y,r);gg.addColorStop(0,"rgba(255,120,30,.28)");gg.addColorStop(1,"rgba(255,80,0,0)");ctx.fillStyle=gg;ctx.fillRect(x-r,y-r,2*r,2*r)}
  ctx.globalCompositeOperation="source-over";
}
/* statické pozadí se vykreslí jednou do offscreen canvasu */
const BG_W=W+600,BG_H=H+730;let bgC=null;
function renderBg(){const k=Math.min(S*DPR,1.5);bgC=document.createElement("canvas");bgC.width=Math.ceil(BG_W*k);bgC.height=Math.ceil(BG_H*k);
  const c=bgC.getContext("2d");c.setTransform(k,0,0,k,300*k,300*k);drawBg(c);bgDirty=false}
function drawCar(){
  ctx.save();
  ctx.fillStyle="#0006";ctx.beginPath();ctx.ellipse(722,392,110,10,0,0,7);ctx.fill();
  // kola (jedno chybí)
  ctx.fillStyle="#111";ctx.beginPath();ctx.arc(660,388,19,0,7);ctx.fill();ctx.fillStyle="#555";ctx.beginPath();ctx.arc(660,388,8,0,7);ctx.fill();
  ctx.fillStyle="#111";ctx.beginPath();ctx.ellipse(790,392,16,12,.3,0,7);ctx.fill();
  // karoserie
  ctx.fillStyle="#6b1f1a";ctx.beginPath();ctx.moveTo(618,388);ctx.lineTo(620,345);ctx.lineTo(660,336);ctx.lineTo(676,304);ctx.lineTo(775,304);ctx.lineTo(795,336);ctx.lineTo(830,344);ctx.lineTo(832,388);ctx.closePath();ctx.fill();
  ctx.fillStyle="#3a0f0c";ctx.fillRect(618,372,214,16);
  // okna
  ctx.fillStyle="#1a1a22";ctx.beginPath();ctx.moveTo(684,334);ctx.lineTo(694,312);ctx.lineTo(722,312);ctx.lineTo(722,334);ctx.fill();ctx.beginPath();ctx.moveTo(732,334);ctx.lineTo(732,312);ctx.lineTo(768,312);ctx.lineTo(782,334);ctx.fill();
  ctx.strokeStyle="#9ab";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(700,322);ctx.lineTo(712,314);ctx.stroke();
  // promáčknutá kapota + škrábance
  ctx.strokeStyle="#00000066";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(624,352);ctx.lineTo(650,348);ctx.lineTo(640,360);ctx.stroke();
  ctx.fillStyle="#2a2a2a";ctx.fillRect(610,364,14,8);
  ctx.restore();
}
function drawFarmer(){
  const x=PIV.x+6,y=300;
  const a=muzzle(wmap[cur]);
  ctx.save();ctx.lineCap="round";
  // nohy
  ctx.strokeStyle="#2b4a8a";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(x-4,y-24);ctx.lineTo(x-7,y-2);ctx.moveTo(x+5,y-24);ctx.lineTo(x+8,y-2);ctx.stroke();
  ctx.fillStyle="#3a2412";ctx.fillRect(x-13,y-4,12,5);ctx.fillRect(x+3,y-4,12,5);
  // kostkovaná košile + montérky
  ctx.fillStyle="#c23b2a";ctx.beginPath();ctx.roundRect(x-11,y-52,22,30,5);ctx.fill();
  ctx.strokeStyle="#7a1f14";ctx.lineWidth=1;for(let i=-8;i<=8;i+=5){ctx.beginPath();ctx.moveTo(x+i,y-51);ctx.lineTo(x+i,y-23);ctx.stroke()}for(let j=-48;j<=-26;j+=6){ctx.beginPath();ctx.moveTo(x-10,y+j);ctx.lineTo(x+10,y+j);ctx.stroke()}
  ctx.fillStyle="#2b4a8a";ctx.fillRect(x-11,y-36,22,14);ctx.fillRect(x-8,y-50,4,16);ctx.fillRect(x+4,y-50,4,16);
  // hlava a slaměný klobouk
  ctx.fillStyle="#f2c79b";ctx.beginPath();ctx.arc(x-1,y-62,9,0,7);ctx.fill();
  ctx.fillStyle="#2a1a10";ctx.fillRect(x-7,y-61,3,2);ctx.fillRect(x-1,y-61,3,2);
  ctx.fillStyle="#e3c15a";ctx.beginPath();ctx.ellipse(x-1,y-69,19,4,0,0,7);ctx.fill();ctx.beginPath();ctx.arc(x-1,y-70,10,Math.PI,0);ctx.fill();
  ctx.fillStyle="#8a4b1f";ctx.fillRect(x-10,y-72,18,3);
  // zbraň
  const w=wmap[cur],im=IMG[cur];
  if(im.complete&&im.naturalWidth){
    const h=w.len*im.naturalHeight/im.naturalWidth;
    ctx.save();ctx.translate(PIV.x,PIV.y);ctx.rotate(a);ctx.translate(-kick*4,0);if(Math.cos(a)<0)ctx.scale(1,-1);
    ctx.drawImage(im,-w.ax*w.len+8,-w.ay*h,w.len,h);
    ctx.restore();
  }
  // ruka
  ctx.strokeStyle="#c23b2a";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(PIV.x+3,PIV.y-2);ctx.lineTo(PIV.x+Math.cos(a)*14,PIV.y+Math.sin(a)*14);ctx.stroke();
  ctx.strokeStyle="#f2c79b";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(PIV.x+Math.cos(a)*12,PIV.y+Math.sin(a)*12);ctx.lineTo(PIV.x+Math.cos(a)*18,PIV.y+Math.sin(a)*18);ctx.stroke();
  ctx.restore();
}
function draw(){
  const w=innerWidth,h=innerHeight;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle="#140603";ctx.fillRect(0,0,w,h);
  const sx=(Math.random()-.5)*shake,sy=(Math.random()-.5)*shake;
  ctx.setTransform(DPR*S,0,0,DPR*S,(OX+sx)*DPR,(OY+sy)*DPR);
  if(bgDirty||!bgC)renderBg();
  ctx.drawImage(bgC,-300,-300,BG_W,BG_H);
  // kouř (za zombíky)
  for(const s of smokes){const p=s.age/s.life;ctx.globalAlpha=Math.sin(p*Math.PI)*.3;ctx.drawImage(SMOKE_SP,s.x-s.r,s.y-s.r,s.r*2,s.r*2)}ctx.globalAlpha=1;
  // plameny
  ctx.globalCompositeOperation="lighter";for(const f of flames)drawFlame(f);ctx.globalCompositeOperation="source-over";ctx.globalAlpha=1;
  // zombíci a auto seřazeni podle hloubky
  const order=zs.slice().sort((p,q)=>p.y-q.y);let carDone=false;
  for(const z of order){if(!carDone&&z.y>392){drawCar();drawFarmer();carDone=true}drawZombie(z)}
  if(!carDone){drawCar();drawFarmer()}
  // kouř z auta před
  // stopy střel
  ctx.lineCap="round";
  for(const t of tracers){ctx.globalAlpha=Math.min(1,t.life*12)*t.k;ctx.strokeStyle="#ffe9a0";ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(t.x1,t.y1);ctx.lineTo(t.x2,t.y2);ctx.stroke()}ctx.globalAlpha=1;
  // záblesk
  if(flash>0){ctx.globalCompositeOperation="lighter";const g=ctx.createRadialGradient(MUZ.x,MUZ.y,0,MUZ.x,MUZ.y,30);g.addColorStop(0,"#fff7c0");g.addColorStop(.4,"#ffb030");g.addColorStop(1,"#ff600000");ctx.fillStyle=g;ctx.beginPath();ctx.arc(MUZ.x,MUZ.y,30,0,7);ctx.fill();ctx.globalCompositeOperation="source-over"}
  // částice
  for(const p of parts){ctx.globalAlpha=1-p.age/p.life;ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill()}ctx.globalAlpha=1;
  // plovoucí texty
  ctx.textAlign="center";for(const f of floats){ctx.globalAlpha=1-f.age/f.life;ctx.font="800 "+f.s+"px system-ui";ctx.fillStyle="#ffe27a";ctx.strokeStyle="#000";ctx.lineWidth=3;ctx.strokeText(f.t,f.x,f.y);ctx.fillText(f.t,f.x,f.y)}ctx.globalAlpha=1;
  // zaměřovač
  if(running&&!over){ctx.strokeStyle="#fff";ctx.globalAlpha=.8;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(aim.x,aim.y,9,0,7);ctx.moveTo(aim.x-14,aim.y);ctx.lineTo(aim.x-5,aim.y);ctx.moveTo(aim.x+5,aim.y);ctx.lineTo(aim.x+14,aim.y);ctx.moveTo(aim.x,aim.y-14);ctx.lineTo(aim.x,aim.y-5);ctx.moveTo(aim.x,aim.y+5);ctx.lineTo(aim.x,aim.y+14);ctx.stroke();ctx.globalAlpha=1}
  // kouř před (lehký)
}
let last=performance.now();
function loop(n){const dt=Math.min(.05,(n-last)/1000);last=n;try{update(dt);draw()}catch(e){console.error(e)}requestAnimationFrame(loop)}
uiSlots();renderShop();uiMoney();requestAnimationFrame(loop);
