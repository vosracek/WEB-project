"use strict";
/* Pizzerie – tycoon. Pec → kuchař → pás → balení → police → prodavač → zákazníci.
   Všechno vylepšuješ v obchodě (🛒). Pohled shora na kuchyň je kreslený do canvasu. */
const $=id=>document.getElementById(id),cv=$("c"),ctx=cv.getContext("2d");
const R=Math.random,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,fmt=n=>Math.round(n).toLocaleString("cs-CZ");
const ADM_PW="perofacky";

/* ---------- data: vylepšení (každé má 5 úrovní, úroveň 0 je základ) ---------- */
const OVEN=[
 {n:"Cihlová pec",slots:1,bake:10,chef:230},
 {n:"Lepší tah komína",slots:1,bake:8,chef:260,price:150},
 {n:"Druhá komora",slots:2,bake:8,chef:290,price:650},
 {n:"Konvekční ohřev",slots:2,bake:6,chef:340,price:2400},
 {n:"Třetí komora",slots:3,bake:5.5,chef:400,price:8500},
 {n:"Neapolská pec 450 °C",slots:3,bake:4,chef:480,price:28000}
];
const BELT=[
 {n:"Základní pás",speed:50,pack:2.4},
 {n:"Silnější motor",speed:65,pack:2.0,price:130},
 {n:"Hladké válečky",speed:85,pack:1.6,price:520},
 {n:"Automatické balení",speed:110,pack:1.2,price:2000},
 {n:"Servo pohon",speed:140,pack:0.9,price:7000},
 {n:"Turbo pás",speed:180,pack:0.6,price:24000}
];
const SELL=[
 {n:"Brigádník",sale:4,cap:4,bonus:0},
 {n:"Zaškolený prodavač",sale:3.2,cap:6,bonus:5,price:120},
 {n:"Usměvavý prodavač",sale:2.5,cap:8,bonus:10,price:480},
 {n:"Zkušený obchodník",sale:1.8,cap:12,bonus:18,price:1800},
 {n:"Vedoucí směny",sale:1.3,cap:16,bonus:28,price:6500},
 {n:"Mistr prodeje",sale:0.9,cap:20,bonus:40,price:22000}
];
const PZ=[
 {id:"mar",n:"Margherita",unlock:0,sell:30,cost:10,w:10,q:[160,480,1450,4300,13000]},
 {id:"pep",n:"Salámová",unlock:400,sell:55,cost:19,w:8,q:[360,1000,3000,8800,26000]},
 {id:"veg",n:"Zeleninová",unlock:1800,sell:90,cost:31,w:6,q:[800,2400,7200,21000,60000]},
 {id:"cap",n:"Capricciosa",unlock:6500,sell:150,cost:52,w:5,q:[1800,5300,15000,44000,128000]},
 {id:"qua",n:"Quattro Stagioni",unlock:20000,sell:260,cost:90,w:4,q:[4400,13000,38000,112000,320000]}
];
const QN=["Základní recept","Čerstvé suroviny","Domácí těsto","Prémiový sýr","Šéfova receptura","Michelin"];
const IMG=PZ.map(p=>{const i=new Image();i.src=PIZZA_IMG[p.id];return i});
const BURN=7;            // za kolik sekund po upečení se pizza v peci spálí
const SP=84;             // minimální rozestup pizz na pásu (px)

/* ---------- uložený postup ---------- */
let S={lv:{oven:0,belt:0,sell:0},pz:PZ.map((_,i)=>({u:i?0:1,q:0,e:1})),rep:50,sold:0,earned:0,burnt:0,lost:0};
let money=80,god=false,noRent=false,gameSpd=1,paused=false;
try{
 const m=localStorage.getItem("pz_m");if(m!==null)money=+m||0;
 const j=JSON.parse(localStorage.getItem("pz_s")||"null");
 if(j){S.lv=Object.assign(S.lv,j.lv);if(Array.isArray(j.pz))j.pz.forEach((p,i)=>{if(S.pz[i])Object.assign(S.pz[i],p)});
  for(const k of["rep","sold","earned","burnt","lost"])if(typeof j[k]==="number")S[k]=j[k]}
}catch(e){}
S.pz[0].u=1;
function save(){try{localStorage.setItem("pz_m",money);localStorage.setItem("pz_s",JSON.stringify(S))}catch(e){}}

/* ---------- odvozené hodnoty ---------- */
const D=()=>{const o=OVEN[S.lv.oven],b=BELT[S.lv.belt],s=SELL[S.lv.sell];return{slots:o.slots,bake:o.bake,chef:o.chef,speed:b.speed,packT:b.pack,saleT:s.sale,cap:s.cap,bonus:s.bonus}};
const sellPrice=t=>Math.round(PZ[t].sell*(1+.22*S.pz[t].q)*(1+D().bonus/100));
const costOf=t=>god?0:Math.round(PZ[t].cost*(1+.10*S.pz[t].q));
const menu=()=>PZ.map((_,i)=>i).filter(i=>S.pz[i].u&&S.pz[i].e);
function demandRate(){            // zákazníků za sekundu
 const m=menu(),n=m.length||1,avgQ=m.reduce((a,i)=>a+S.pz[i].q,0)/n;
 return (1/9)*(.4+S.rep/80)*(1+.4*(n-1))*(1+.1*avgQ);
}
const rentAmt=()=>{const ls=S.lv.oven+S.lv.belt+S.lv.sell,un=S.pz.filter(p=>p.u).length;return Math.round(4*Math.pow(1.38,ls)*(1+.15*(un-1)))};

/* ---------- rozložení kuchyně (světové souřadnice, na šířku 1100×640) ---------- */
const WW=1100,WH=640;
const SX=235,SYS=[265,190,340];              // sloty v peci
const STAND_X=338;                            // kde stojí kuchař u pece
const AX=410,AY=265,LB=330,PX=AX+LB;          // začátek pásu, délka pásu, místo balení
const CHEF_BELT_X=350;
const shelfPos=i=>({x:926+(i%2)*34,y:112+Math.floor(i/2)*40});
const SELLER_X=868,SELLER_HOME=320;
const QX=1032,qY=i=>320+56*i,QMAX=6;

/* ---------- běh hry ---------- */
const slots=[0,1,2].map(()=>({st:"empty",t:0,w:0,type:0}));
const belt=[];                 // {p,type,rot} – [0] je nejblíž konci
let pack=null;                 // {t,type}
const slides=[];               // krabice jedoucí na polici
const shelf=[];                // typy pizz v krabicích na polici
const queue=[],leaving=[];     // zákazníci
const fx=[];                   // plovoucí texty
const chef={x:CHEF_BELT_X,y:AY,ang:0,mode:"idle",k:0,carry:-1,pickT:1,from:null,res:false,walk:0};
const sel={x:SELLER_X,y:SELLER_HOME,mode:"idle",c:null,t:0,box:-1};
let beltOff=0,nextSpawn=3,rentT=20,tAll=0,noMoneyT=0,saveT=0,hudT=0,fireT=0;
let soldWin=[];                // časy prodejů pro "za minutu"

function toast(txt,cls){
 const t=$("toast"),d=document.createElement("div");d.textContent=txt;if(cls)d.className=cls;t.appendChild(d);
 while(t.children.length>3)t.firstChild.remove();setTimeout(()=>d.remove(),3200);
}
function addFx(x,y,txt,col){fx.push({x,y,t:0,txt,col:col||"#fff"})}

function counts(){
 const c=PZ.map(()=>0);
 for(const s of slots)if(s.st==="bake"||s.st==="ready")c[s.type]++;
 for(const b of belt)c[b.type]++;
 if(pack)c[pack.type]++;
 for(const s of slides)c[s.type]++;
 for(const t of shelf)c[t]++;
 if(chef.carry>=0)c[chef.carry]++;
 return c;
}
function chooseType(){
 const m=menu();if(!m.length)return -1;
 const c=counts(),tot=c.reduce((a,b)=>a+b,0);
 if(tot>=D().cap)return -1;                       // police je plná, nepeču dál
 const tw=m.reduce((a,i)=>a+PZ[i].w,0);let best=-1,bs=-1;
 for(const i of m){
  const wait=queue.filter(q=>q.type===i).length;
  const sc=(3*PZ[i].w/tw+2*wait)/(c[i]+1);
  if(sc>bs){bs=sc;best=i}
 }
 return best;
}
const beltFree=()=>!chef.res&&belt.every(b=>b.p>=SP);

function moveTo(v,to,step){return Math.abs(to-v)<=step?to:v+Math.sign(to-v)*step}

function updOven(dt){
 const d=D();
 for(let k=0;k<d.slots;k++){
  const s=slots[k];
  if(s.st==="empty"){
   const t=chooseType();
   if(t>=0){
    const c=costOf(t);
    if(money>=c){money-=c;Object.assign(s,{st:"bake",t:0,w:0,type:t})}
    else if(tAll-noMoneyT>20){noMoneyT=tAll;toast("Nemáš peníze na suroviny! 😬","bad")}
   }
  }else if(s.st==="bake"){
   s.t+=dt;if(s.t>=d.bake){s.st="ready";s.w=0}
  }else if(s.st==="ready"){
   s.w+=dt;
   if(s.w>=BURN){
    s.st="burnt";s.t=0;S.burnt++;S.rep=clamp(S.rep-2,0,100);
    addFx(SX,SYS[k]-40,"🔥 Spálená!","#ff8a80");toast("Pizza se spálila v peci! Kuchař nestíhá – pás je plný nebo obsazený.","bad");
   }
  }else if(s.st==="burnt"){s.t+=dt;if(s.t>1.8)s.st="empty"}
 }
 for(let k=d.slots;k<3;k++)if(slots[k].st!=="empty")slots[k].st="empty";
}

function updChef(dt){
 const d=D();let tx=chef.x,ty=chef.y,moving=false;
 if(chef.pickT<1)chef.pickT=Math.min(1,chef.pickT+dt*5);
 if(chef.mode==="idle"){
  tx=CHEF_BELT_X;ty=AY;
  let bk=-1,bw=-1;
  for(let k=0;k<d.slots;k++)if(slots[k].st==="ready"&&slots[k].w>bw){bw=slots[k].w;bk=k}
  if(bk>=0&&beltFree()){chef.mode="toOven";chef.k=bk;chef.res=true}
 }
 if(chef.mode==="toOven"){
  tx=STAND_X;ty=SYS[chef.k];
  if(Math.hypot(tx-chef.x,ty-chef.y)<3){
   const s=slots[chef.k];
   if(s.st==="ready"){chef.carry=s.type;s.st="empty";chef.pickT=0;chef.from={x:SX,y:SYS[chef.k]};chef.mode="toBelt"}
   else{chef.mode="idle";chef.res=false}
  }
 }
 if(chef.mode==="toBelt"){
  tx=CHEF_BELT_X;ty=AY;
  if(Math.hypot(tx-chef.x,ty-chef.y)<3){
   if(belt.every(b=>b.p>=SP)){belt.push({p:0,type:chef.carry,rot:R()*6.28});chef.carry=-1;chef.mode="idle";chef.res=false}
   else{tx=chef.x;ty=chef.y}
  }
 }
 const dx=tx-chef.x,dy=ty-chef.y,dist=Math.hypot(dx,dy);
 if(dist>2){
  const st=Math.min(dist,d.chef*dt);chef.x+=dx/dist*st;chef.y+=dy/dist*st;moving=true;chef.walk+=dt*10;
  const a=Math.atan2(dy,dx);let da=a-chef.ang;while(da>Math.PI)da-=6.283;while(da<-Math.PI)da+=6.283;chef.ang+=da*Math.min(1,dt*14);
 }else{
  const a=chef.mode==="toOven"?Math.PI:0;let da=a-chef.ang;while(da>Math.PI)da-=6.283;while(da<-Math.PI)da+=6.283;chef.ang+=da*Math.min(1,dt*10);
 }
}

function updBelt(dt){
 const d=D();
 beltOff=(beltOff+d.speed*dt)%40;
 for(let i=0;i<belt.length;i++){
  const mx=i===0?LB:belt[i-1].p-SP;
  belt[i].p=Math.min(mx,belt[i].p+d.speed*dt);
 }
 if(!pack&&belt.length&&belt[0].p>=LB-.5&&shelf.length+slides.length<d.cap){
  pack={t:0,type:belt[0].type,rot:belt[0].rot};belt.shift();
 }
 if(pack){
  pack.t+=dt;
  if(pack.t>=d.packT){slides.push({t:0,dur:.7,type:pack.type});pack=null}
 }
 for(let i=0;i<slides.length;i++){
  const s=slides[i];s.t+=dt;
 }
 while(slides.length&&slides[0].t>=slides[0].dur){shelf.push(slides[0].type);slides.shift()}
}

function newCustomer(){
 const m=menu(),tw=m.reduce((a,i)=>a+PZ[i].w,0);let r=R()*tw,type=m[0];
 for(const i of m){if((r-=PZ[i].w)<0){type=i;break}}
 const pat=42+R()*16;
 return{x:QX+(R()*14-7),y:WH+50,type,pat,max:pat,arr:false,busy:false,
  coat:["#3b82f6","#e11d48","#10b981","#f59e0b","#8b5cf6","#06b6d4","#ec4899","#84cc16"][Math.floor(R()*8)],
  hair:["#2b1b12","#6b4423","#d9b36b","#9a9a9a","#111","#a0522d"][Math.floor(R()*6)],
  skin:["#f2c79b","#e0a77a","#b97c53","#8d5a3b"][Math.floor(R()*4)],ang:-Math.PI/2,walk:R()*6};
}
function leave(c,angry){
 const i=queue.indexOf(c);if(i>=0)queue.splice(i,1);
 c.out=true;c.angry=!!angry;c.tx=WW+90;c.ty=c.y;leaving.push(c);
}
function updCustomers(dt){
 nextSpawn-=dt;
 if(nextSpawn<=0){
  if(queue.length<QMAX&&menu().length)queue.push(newCustomer());
  nextSpawn=(1/demandRate())*(.55+.9*R());
 }
 queue.forEach((c,i)=>{
  const ty=qY(i),dx=QX-c.x,dy=ty-c.y,dist=Math.hypot(dx,dy);
  if(dist>2){const st=Math.min(dist,130*dt);c.x+=dx/dist*st;c.y+=dy/dist*st;c.ang=Math.atan2(dy,dx);c.walk+=dt*9}
  else c.ang=Math.PI;
  c.arr=dist<16;
  if(c.arr&&!c.busy){
   c.pat-=dt;
   if(c.pat<=0){S.rep=clamp(S.rep-5,0,100);S.lost++;addFx(c.x,c.y-40,"😠","#fff");leave(c,true)}
  }
 });
 for(let i=leaving.length-1;i>=0;i--){
  const c=leaving[i],dx=c.tx-c.x,dy=c.ty-c.y,dist=Math.hypot(dx,dy);
  if(dist<4){leaving.splice(i,1);continue}
  const st=Math.min(dist,150*dt);c.x+=dx/dist*st;c.y+=dy/dist*st;c.ang=Math.atan2(dy,dx);c.walk+=dt*9;
 }
}
function updSeller(dt){
 const d=D(),sp=300;
 if(sel.mode==="idle"||sel.mode==="back"){
  const c=queue.find(q=>q.arr&&!q.busy&&shelf.includes(q.type));
  if(c){sel.c=c;c.busy=true;sel.mode="go"}
 }
 if(sel.mode==="go"){
  const ty=clamp(sel.c.y,110,540);sel.y=moveTo(sel.y,ty,sp*dt);
  if(Math.abs(sel.y-ty)<2){
   const i=shelf.indexOf(sel.c.type);
   if(i<0){sel.c.busy=false;sel.c=null;sel.mode="back"}
   else{shelf.splice(i,1);sel.box=sel.c.type;sel.mode="serve";sel.t=0}
  }
 }else if(sel.mode==="serve"){
  sel.t+=dt;
  if(sel.t>=d.saleT){
   const c=sel.c,price=sellPrice(c.type);
   money+=price;if(window.vyEarn)vyEarn("piz",price);S.sold++;S.earned+=price;soldWin.push(tAll);
   S.rep=clamp(S.rep+(c.pat/c.max>.5?1:.4),0,100);
   addFx(c.x-30,c.y-30,"+"+fmt(price)+" 💰","#9dffb0");
   c.carry=c.type;leave(c,false);sel.c=null;sel.box=-1;sel.mode="back";
  }
 }else{
  sel.y=moveTo(sel.y,SELLER_HOME,sp*dt);if(sel.y===SELLER_HOME)sel.mode="idle";
 }
}
function upd(dt){
 tAll+=dt;
 updOven(dt);updChef(dt);updBelt(dt);updCustomers(dt);updSeller(dt);
 rentT-=dt;
 if(rentT<=0){
  rentT+=20;
  if(!noRent){const r=rentAmt();
   if(money>=r){money-=r}
   else{money=0;S.rep=clamp(S.rep-3,0,100);toast("Nemáš na nájem! Pověst klesla.","bad")}
  }
 }
 for(let i=fx.length-1;i>=0;i--){fx[i].t+=dt;if(fx[i].t>1.4)fx.splice(i,1)}
 while(soldWin.length&&soldWin[0]<tAll-60)soldWin.shift();
}

/* ---------- kreslení ---------- */
let W,H,DPR,sc=1,ox=0,oy=0,rot=0,bgc=null;
const BGS=1.6;
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function resize(){
 DPR=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;
 cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
 rot=W<H?1:0;
 sc=rot?Math.min(W/WH,H/WW):Math.min(W/WW,H/WH);
 ox=((rot?W-WH*sc:W-WW*sc))/2;oy=((rot?H-WW*sc:H-WH*sc))/2;
}
addEventListener("resize",resize);

function buildBG(){
 const c=document.createElement("canvas");c.width=WW*BGS;c.height=WH*BGS;const g=c.getContext("2d");g.scale(BGS,BGS);
 /* podlaha kuchyně */
 for(let y=0;y<WH;y+=40)for(let x=0;x<905;x+=40){g.fillStyle=((x+y)/40)%2?"#cfd3d3":"#e3e5e4";g.fillRect(x,y,40,40)}
 g.strokeStyle="#0000001c";g.lineWidth=1;
 for(let x=0;x<=905;x+=40){g.beginPath();g.moveTo(x,0);g.lineTo(x,WH);g.stroke()}
 for(let y=0;y<=WH;y+=40){g.beginPath();g.moveTo(0,y);g.lineTo(905,y);g.stroke()}
 /* zadní stěna */
 g.fillStyle="#efe6d3";g.fillRect(0,0,905,74);
 g.fillStyle="#d8ccb4";for(let x=0;x<905;x+=37){g.fillRect(x,0,1.5,74)}for(let y=18;y<74;y+=18)g.fillRect(0,y,905,1.5);
 g.fillStyle="#00000030";g.fillRect(0,74,905,8);
 g.fillStyle="#8a5a44";g.fillRect(0,0,30,WH);g.fillStyle="#00000030";g.fillRect(30,0,6,WH);
 /* pánve na zdi */
 for(let i=0;i<4;i++){const x=70+i*58;g.fillStyle="#2c2c30";g.beginPath();g.arc(x,32,17,0,7);g.fill();g.fillStyle="#44444a";g.beginPath();g.arc(x,32,12,0,7);g.fill();g.fillStyle="#2c2c30";rr(g,x-4,44,8,22,3);g.fill()}
 /* bedny s rajčaty */
 g.fillStyle="#a8743f";rr(g,320,8,100,58,6);g.fill();g.fillStyle="#7d5428";rr(g,326,13,88,48,4);g.fill();
 for(let i=0;i<14;i++){g.fillStyle=i%3?"#e0301e":"#c1281a";g.beginPath();g.arc(336+(i%5)*17+R()*4,24+Math.floor(i/5)*15,8,0,7);g.fill();g.fillStyle="#3a8a2c";g.fillRect(332+(i%5)*17,21+Math.floor(i/5)*15,4,3)}
 /* pytle s moukou */
 for(let i=0;i<2;i++){const x=450+i*54;g.fillStyle="#e9dcc0";rr(g,x,8,46,58,10);g.fill();g.strokeStyle="#b9a67a";g.lineWidth=2;g.stroke();g.fillStyle="#c0392b";g.fillRect(x+8,26,30,8)}
 /* lednice */
 const fg=g.createLinearGradient(0,0,0,74);fg.addColorStop(0,"#dfe5e8");fg.addColorStop(1,"#98a2a8");
 g.fillStyle=fg;rr(g,580,4,150,66,8);g.fill();g.strokeStyle="#6a747a";g.lineWidth=2;g.stroke();g.fillStyle="#6a747a";g.fillRect(654,6,3,62);g.fillRect(645,22,5,26);g.fillRect(661,22,5,26);
 /* květináče s bylinkami */
 for(let i=0;i<3;i++){const x=770+i*40;g.fillStyle="#b4562f";g.beginPath();g.arc(x,38,15,0,7);g.fill();g.fillStyle="#2f9a3f";for(let k=0;k<7;k++){g.beginPath();g.arc(x+Math.cos(k)*7,38+Math.sin(k)*7,6,0,7);g.fill()}}
 /* spodní pracovní stůl */
 const tg=g.createLinearGradient(0,548,0,626);tg.addColorStop(0,"#eef1f2");tg.addColorStop(1,"#a9b2b7");
 g.fillStyle="#00000030";rr(g,34,552,620,84,10);g.fill();
 g.fillStyle=tg;rr(g,30,546,620,80,10);g.fill();g.strokeStyle="#7b858b";g.lineWidth=3;g.stroke();
 for(let i=0;i<5;i++){const x=80+i*52,y=586;g.fillStyle="#ffffff90";g.beginPath();g.arc(x,y,24,0,7);g.fill();g.fillStyle="#f6e8c3";g.beginPath();g.arc(x,y,17,0,7);g.fill();g.fillStyle="#00000012";g.beginPath();g.arc(x+3,y+3,13,0,7);g.fill()}
 g.fillStyle="#b88a52";rr(g,360,566,150,22,11);g.fill();g.fillRect(350,572,12,10);g.fillRect(508,572,12,10);
 g.fillStyle="#8c8f93";g.beginPath();g.arc(560,590,28,0,7);g.fill();g.fillStyle="#c9291a";g.beginPath();g.arc(560,590,22,0,7);g.fill();g.fillStyle="#e24b3b";g.beginPath();g.arc(555,584,9,0,7);g.fill();
 g.fillStyle="#b88a52";rr(g,420,596,100,24,5);g.fill();for(let i=0;i<5;i++){g.fillStyle="#2f9a3f";g.beginPath();g.ellipse(435+i*18,608,8,5,i,0,7);g.fill()}
 /* zásoba krabic */
 for(let i=0;i<3;i++)for(let j=0;j<2;j++){const x=690+j*84,y=536+i*8;g.fillStyle="#b88c56";rr(g,x,y,76,76,4);g.fill();g.strokeStyle="#7f5d30";g.lineWidth=2;g.stroke();g.fillStyle="#c8a066";g.fillRect(x+34,y,8,76)}
 /* podložka a kluzák na krabice */
 g.fillStyle="#3a3f45";rr(g,792,AY-28,118,56,6);g.fill();g.strokeStyle="#555c63";g.lineWidth=3;
 for(let x=800;x<905;x+=14){g.beginPath();g.moveTo(x,AY-24);g.lineTo(x,AY+24);g.stroke()}
 /* pult */
 const cg=g.createLinearGradient(905,0,975,0);cg.addColorStop(0,"#9aa3a8");cg.addColorStop(.5,"#e6eaec");cg.addColorStop(1,"#9aa3a8");
 g.fillStyle="#00000040";rr(g,903,84,76,474,8);g.fill();
 g.fillStyle=cg;rr(g,900,80,76,472,8);g.fill();g.strokeStyle="#5f686d";g.lineWidth=3;g.stroke();
 /* pokladna */
 g.fillStyle="#2b2f33";rr(g,914,500,48,42,6);g.fill();g.fillStyle="#7dd3a8";rr(g,920,506,36,16,3);g.fill();g.fillStyle="#6b7378";for(let i=0;i<3;i++)for(let j=0;j<2;j++)g.fillRect(920+i*13,527+j*7,9,5);
 /* jídelna: dřevěná podlaha */
 g.fillStyle="#a4703f";g.fillRect(975,0,125,WH);
 for(let x=975,i=0;x<1100;x+=31,i++){g.fillStyle=i%2?"#b27d49":"#9a6738";g.fillRect(x,0,31,WH)}
 g.strokeStyle="#00000030";g.lineWidth=1.5;for(let x=975;x<=1100;x+=31){g.beginPath();g.moveTo(x,0);g.lineTo(x,WH);g.stroke()}
 for(let y=60;y<WH;y+=130)for(let x=975,i=0;x<1100;x+=31,i++){g.beginPath();g.moveTo(x,y+(i%2)*60);g.lineTo(x+31,y+(i%2)*60);g.stroke()}
 g.fillStyle="#00000028";g.fillRect(975,0,10,WH);
 g.fillStyle="#7a2a22";rr(g,1000,586,90,50,8);g.fill();g.strokeStyle="#c9a24a";g.lineWidth=3;g.stroke();
 g.fillStyle="#6b4a2a";g.beginPath();g.arc(1070,40,24,0,7);g.fill();g.fillStyle="#2f9a3f";for(let k=0;k<8;k++){g.beginPath();g.arc(1070+Math.cos(k*.8)*15,40+Math.sin(k*.8)*15,12,0,7);g.fill()}
 /* pec – cihlové tělo */
 g.fillStyle="#00000038";rr(g,36,116,270,310,22);g.fill();
 const og=g.createLinearGradient(30,110,300,420);og.addColorStop(0,"#a24a32");og.addColorStop(1,"#7a2f1f");
 g.fillStyle=og;rr(g,30,110,270,310,22);g.fill();
 g.strokeStyle="#3c140c66";g.lineWidth=2;
 for(let y=122,r=0;y<418;y+=16,r++){g.beginPath();g.moveTo(34,y);g.lineTo(296,y);g.stroke();for(let x=34+(r%2)*20;x<296;x+=40){g.beginPath();g.moveTo(x,y);g.lineTo(x,y+16);g.stroke()}}
 g.strokeStyle="#4a1a10";g.lineWidth=4;rr(g,30,110,270,310,22);g.stroke();
 /* komora */
 g.fillStyle="#150a07";rr(g,62,140,232,250,16);g.fill();
 g.strokeStyle="#55575c";g.lineWidth=7;rr(g,62,140,232,250,16);g.stroke();
 g.strokeStyle="#8d9096";g.lineWidth=2;rr(g,59,137,238,256,18);g.stroke();
 /* komín nahoře */
 g.fillStyle="#3a3a40";rr(g,78,78,56,32,6);g.fill();g.fillStyle="#111";rr(g,86,84,40,20,4);g.fill();
 cv.bg=null;
 return c;
}

function upright(x,y,fn){ctx.save();ctx.translate(x,y);if(rot)ctx.rotate(-Math.PI/2);fn();ctx.restore()}

function pizzaAt(x,y,r,t,a,alpha){
 const im=IMG[t];ctx.save();ctx.translate(x,y);ctx.rotate(a||0);
 ctx.shadowColor="#0007";ctx.shadowBlur=8;ctx.shadowOffsetY=3;
 if(alpha!==undefined)ctx.globalAlpha=alpha;
 if(im.complete&&im.naturalWidth)ctx.drawImage(im,-r,-r,r*2,r*2);
 else{ctx.fillStyle="#e8b04a";ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill()}
 ctx.restore();
}
function boxAt(x,y,s,t,open){
 ctx.save();ctx.translate(x,y);
 ctx.shadowColor="#0006";ctx.shadowBlur=6;ctx.shadowOffsetY=2;
 ctx.fillStyle="#c79a5e";rr(ctx,-s/2,-s/2,s,s,s*.07);ctx.fill();ctx.shadowColor="transparent";
 ctx.strokeStyle="#8a6330";ctx.lineWidth=Math.max(1,s*.03);ctx.stroke();
 ctx.fillStyle="#d8b073";ctx.fillRect(-s*.07,-s/2,s*.14,s);
 ctx.strokeStyle="#00000022";ctx.beginPath();ctx.moveTo(-s/2,0);ctx.lineTo(s/2,0);ctx.stroke();
 if(t>=0){const im=IMG[t],q=s*.36;ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(0,0,q*.62,0,7);ctx.fill();
  if(im.complete)ctx.drawImage(im,-q*.55,-q*.55,q*1.1,q*1.1)}
 ctx.restore();
}

/* člověk shora; ang = kam kouká, o = vzhled */
function person(x,y,ang,o){
 ctx.save();ctx.translate(x,y);ctx.rotate(ang);
 const bob=Math.sin(o.walk||0)*(o.moving?1.6:0);
 ctx.fillStyle="#0003";ctx.beginPath();ctx.ellipse(1,2,13,22,0,0,7);ctx.fill();
 /* ruce */
 const reach=o.reach||0;
 ctx.strokeStyle=o.coat;ctx.lineWidth=7;ctx.lineCap="round";
 ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(8+reach+bob,-9);ctx.stroke();
 ctx.beginPath();ctx.moveTo(0,15);ctx.lineTo(8+reach-bob,9);ctx.stroke();
 ctx.fillStyle=o.skin;ctx.beginPath();ctx.arc(9+reach+bob,-9,4,0,7);ctx.fill();ctx.beginPath();ctx.arc(9+reach-bob,9,4,0,7);ctx.fill();
 /* ramena */
 ctx.fillStyle=o.coat;ctx.beginPath();ctx.ellipse(0,0,11,19,0,0,7);ctx.fill();
 if(o.apron){ctx.fillStyle=o.apron;ctx.beginPath();ctx.ellipse(3,0,6,11,0,0,7);ctx.fill()}
 /* hlava */
 ctx.fillStyle=o.skin;ctx.beginPath();ctx.arc(2,0,9.5,0,7);ctx.fill();
 if(o.hat){
  ctx.fillStyle="#fff";ctx.strokeStyle="#c8c8c8";ctx.lineWidth=1.5;
  for(let i=0;i<6;i++){const a=i*1.047;ctx.beginPath();ctx.arc(Math.cos(a)*6,Math.sin(a)*6,5.5,0,7);ctx.fill();ctx.stroke()}
  ctx.beginPath();ctx.arc(0,0,7,0,7);ctx.fill();
 }else{
  ctx.fillStyle=o.hair;ctx.beginPath();ctx.arc(-1,0,9.8,Math.PI*.55,Math.PI*1.45);ctx.lineTo(-1,0);ctx.fill();
  ctx.beginPath();ctx.arc(0,0,8,0,7);ctx.globalAlpha=.0;ctx.fill();ctx.globalAlpha=1;
 }
 ctx.restore();
}

function drawBelt(){
 const d=D();
 ctx.fillStyle="#00000040";rr(ctx,396,AY-41,408,92,10);ctx.fill();
 ctx.fillStyle="#24282d";rr(ctx,392,AY-46,408,92,10);ctx.fill();
 /* žluté okraje */
 ctx.fillStyle="#e2b72b";ctx.fillRect(396,AY-46,400,5);ctx.fillRect(396,AY+41,400,5);
 ctx.fillStyle="#3b4148";rr(ctx,396,AY-40,400,80,4);ctx.fill();
 ctx.save();ctx.beginPath();ctx.rect(396,AY-40,400,80);ctx.clip();
 ctx.strokeStyle="#59616a";ctx.lineWidth=3;
 for(let x=396-40+beltOff;x<800;x+=40){ctx.beginPath();ctx.moveTo(x,AY-36);ctx.lineTo(x+18,AY);ctx.lineTo(x,AY+36);ctx.stroke()}
 ctx.restore();
 /* válce na koncích */
 for(const x of[396,796]){const g=ctx.createLinearGradient(x-6,0,x+6,0);g.addColorStop(0,"#777");g.addColorStop(.5,"#ddd");g.addColorStop(1,"#777");ctx.fillStyle=g;ctx.fillRect(x-6,AY-42,12,84)}
 /* diody úrovně pásu */
 for(let i=0;i<5;i++){ctx.fillStyle=i<S.lv.belt?"#39d353":"#2a3b2e";ctx.beginPath();ctx.arc(430+i*16,AY-56,4.5,0,7);ctx.fill()}
 /* balicí stroj */
 ctx.fillStyle="#6f7780";rr(ctx,PX-46,AY-58,12,116,4);ctx.fill();rr(ctx,PX+34,AY-58,12,116,4);ctx.fill();
 ctx.fillStyle="#9aa4ad";rr(ctx,PX-46,AY-58,12,10,3);ctx.fill();rr(ctx,PX+34,AY-58,12,10,3);ctx.fill();
 ctx.fillStyle=pack?"#ffb02e":"#39d353";ctx.beginPath();ctx.arc(PX+40,AY-64,5,0,7);ctx.fill();
}

function drawOven(){
 const d=D();fireT+=.016;
 /* záře */
 const gl=ctx.createRadialGradient(100,265,10,100,265,250);gl.addColorStop(0,"rgba(255,140,30,.55)");gl.addColorStop(1,"rgba(255,90,0,0)");
 ctx.save();ctx.beginPath();rr(ctx,62,140,232,250,16);ctx.clip();
 ctx.fillStyle=gl;ctx.fillRect(62,140,232,250);
 /* oheň */
 for(let i=0;i<7;i++){
  const fy=190+i*14,f=Math.sin(fireT*7+i*1.9)*.5+.5,h=22+f*14+Math.sin(fireT*11+i)*4;
  const g=ctx.createRadialGradient(84,fy,2,84,fy,h);g.addColorStop(0,"#fff3a8");g.addColorStop(.35,"#ffb02e");g.addColorStop(1,"rgba(255,70,0,0)");
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(84+f*4,fy,h,0,7);ctx.fill();
 }
 ctx.fillStyle="#2a1a12";ctx.beginPath();ctx.ellipse(76,265,16,70,0,0,7);ctx.fill();
 /* polena */
 ctx.strokeStyle="#5c3a20";ctx.lineWidth=7;ctx.lineCap="round";for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(66,205+i*20);ctx.lineTo(92,215+i*20);ctx.stroke()}
 /* kameny pro sloty */
 for(let k=0;k<d.slots;k++){const y=SYS[k];ctx.fillStyle="#463329";ctx.beginPath();ctx.arc(SX,y,41,0,7);ctx.fill();ctx.strokeStyle="#6b5143";ctx.lineWidth=3;ctx.stroke()}
 ctx.restore();
 /* diody úrovně pece */
 for(let i=0;i<5;i++){ctx.fillStyle=i<S.lv.oven?"#ffb02e":"#4a2a1a";ctx.beginPath();ctx.arc(150+i*16,128,4.5,0,7);ctx.fill()}
 /* pizzy v peci */
 for(let k=0;k<d.slots;k++){
  const s=slots[k],y=SYS[k];
  if(s.st==="bake"||s.st==="ready"){
   const f=s.st==="bake"?s.t/d.bake:1;
   ctx.fillStyle="#e9d8a6";ctx.beginPath();ctx.arc(SX,y,33,0,7);ctx.fill();
   pizzaAt(SX,y,33,s.type,k,.25+.75*f);
   if(s.st==="ready"){ctx.fillStyle="rgba(20,8,0,"+(.5*s.w/BURN)+")";ctx.beginPath();ctx.arc(SX,y,33,0,7);ctx.fill()}
   ctx.lineWidth=4;ctx.lineCap="round";
   ctx.strokeStyle="#ffffff30";ctx.beginPath();ctx.arc(SX,y,39,0,7);ctx.stroke();
   if(s.st==="bake"){ctx.strokeStyle="#ffd166";ctx.beginPath();ctx.arc(SX,y,39,-Math.PI/2,-Math.PI/2+6.283*f);ctx.stroke()}
   else{ctx.strokeStyle=s.w>BURN*.6?"#ff4d4d":"#39d353";ctx.beginPath();ctx.arc(SX,y,39,-Math.PI/2,-Math.PI/2+6.283*(1-s.w/BURN));ctx.stroke()}
  }else if(s.st==="burnt"){
   ctx.fillStyle="#1a1a1a";ctx.beginPath();ctx.arc(SX,y,33,0,7);ctx.fill();
   ctx.fillStyle="#555";for(let i=0;i<8;i++){ctx.beginPath();ctx.arc(SX+Math.cos(i*2.3)*18,y+Math.sin(i*1.7)*18,4,0,7);ctx.fill()}
   upright(SX,y-4+Math.sin(tAll*6)*2,()=>{ctx.font="22px system-ui";ctx.textAlign="center";ctx.fillText("💨",0,-30)});
  }
 }
}

function drawChef(){
 const d=D(),c=chef;
 const moving=c.mode!=="idle"&&Math.hypot(c.x-(c.mode==="toOven"?STAND_X:CHEF_BELT_X),c.y-(c.mode==="toOven"?SYS[c.k]:AY))>3;
 /* pizza na lopatě */
 if(c.carry>=0){
  const px=c.x+Math.cos(c.ang)*56,py=c.y+Math.sin(c.ang)*56;
  let x=px,y=py;
  if(c.pickT<1&&c.from){x=lerp(c.from.x,px,c.pickT);y=lerp(c.from.y,py,c.pickT)}
  ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.ang);ctx.fillStyle="#b88a52";ctx.fillRect(10,-3,64,6);ctx.restore();
  ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.ang);ctx.fillStyle="#c9a064";ctx.beginPath();ctx.arc(56,0,38,0,7);ctx.fill();ctx.restore();
  pizzaAt(x,y,33,c.carry,c.ang);
 }
 person(c.x,c.y,c.ang,{coat:"#f4f4f4",apron:"#c0392b",skin:"#f2c79b",hat:true,walk:c.walk,moving,reach:c.carry>=0?16:2});
}
function drawSeller(){
 const t=sel.mode==="serve"?sel.t/D().saleT:0;
 const reach=sel.mode==="serve"?Math.sin(Math.min(1,t*1.2)*Math.PI)*26+6:2;
 person(sel.x,sel.y,0,{coat:"#2563eb",apron:"#e5e7eb",skin:"#e0a77a",hair:"#3b2a1a",walk:tAll*9,moving:sel.mode==="go"||sel.mode==="back",reach});
 if(sel.mode==="serve"&&sel.box>=0)boxAt(sel.x+22+reach,sel.y,26,sel.box);
 /* diody úrovně prodavače */
 for(let i=0;i<5;i++){ctx.fillStyle=i<S.lv.sell?"#47b4ff":"#26384a";ctx.beginPath();ctx.arc(920+i*10,94,3.6,0,7);ctx.fill()}
}
function drawShelf(){
 const d=D();
 for(let i=0;i<d.cap;i++){const p=shelfPos(i);ctx.strokeStyle="#00000030";ctx.lineWidth=1.5;ctx.setLineDash([3,3]);rr(ctx,p.x-14,p.y-14,28,28,3);ctx.stroke();ctx.setLineDash([])}
 shelf.forEach((t,i)=>{const p=shelfPos(i);boxAt(p.x,p.y,28,t)});
 /* krabice klouzající z balení na polici */
 slides.forEach((s,i)=>{
  const dest=shelfPos(shelf.length+i),u=clamp(s.t/s.dur,0,1);let x,y,sz;
  if(u<.6){const v=u/.6;x=lerp(PX,905,v);y=AY;sz=lerp(70,40,v)}
  else{const v=(u-.6)/.4;x=lerp(905,dest.x,v);y=lerp(AY,dest.y,v);sz=lerp(40,28,v)}
  boxAt(x,y,sz,s.type);
 });
}
function drawPack(){
 if(!pack)return;
 const d=D(),u=clamp(pack.t/d.packT,0,1),s=70;
 ctx.save();ctx.translate(PX,AY);
 ctx.fillStyle="#a8814d";rr(ctx,-s/2,-s/2,s,s,4);ctx.fill();
 ctx.restore();
 pizzaAt(PX,AY,30,pack.type,pack.rot);
 if(u>.35){
  const f=(u-.35)/.65,h=f*s/2;
  ctx.save();ctx.translate(PX,AY);ctx.fillStyle="#d4ab6c";ctx.strokeStyle="#8a6330";ctx.lineWidth=1.5;
  ctx.fillRect(-s/2,-s/2,s,h);ctx.fillRect(-s/2,s/2-h,s,h);ctx.strokeRect(-s/2,-s/2,s,h);ctx.strokeRect(-s/2,s/2-h,s,h);
  ctx.fillStyle="#c79a5e";ctx.fillRect(-s/2,-s/2,h,s);ctx.fillRect(s/2-h,-s/2,h,s);ctx.strokeRect(-s/2,-s/2,h,s);ctx.strokeRect(s/2-h,-s/2,h,s);
  if(f>.98){ctx.fillStyle="#e4cba0";ctx.fillRect(-5,-s/2,10,s)}
  ctx.restore();
 }
}
function drawCustomer(c){
 const moving=Math.hypot((c.out?c.tx:QX)-c.x,(c.out?c.ty:0)-c.y)>3;
 person(c.x,c.y,c.ang,{coat:c.coat,skin:c.skin,hair:c.hair,walk:c.walk,moving:true,reach:c.carry>=0?10:0});
 if(c.carry>=0)boxAt(c.x+Math.cos(c.ang)*20,c.y+Math.sin(c.ang)*20,24,c.carry);
}
function drawBubble(c){
 if(c.out)return;
 upright(c.x,c.y,()=>{
  const f=clamp(c.pat/c.max,0,1),col=f>.5?"#39d353":f>.25?"#ffb02e":"#ff4d4d";
  ctx.translate(0,-38);
  ctx.fillStyle="#fffffff0";ctx.strokeStyle="#0003";ctx.lineWidth=1.5;rr(ctx,-24,-24,48,46,10);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(-5,22);ctx.lineTo(0,29);ctx.lineTo(5,22);ctx.fill();
  const im=IMG[c.type];if(im.complete)ctx.drawImage(im,-17,-21,34,34);
  ctx.fillStyle="#0002";rr(ctx,-18,14,36,5,2.5);ctx.fill();ctx.fillStyle=col;rr(ctx,-18,14,Math.max(3,36*f),5,2.5);ctx.fill();
 });
}

function frame(){
 const g=ctx;
 g.setTransform(1,0,0,1,0,0);g.fillStyle="#2b2420";g.fillRect(0,0,cv.width,cv.height);
 if(!bgc)bgc=buildBG();
 if(rot)g.setTransform(0,sc*DPR,-sc*DPR,0,(ox+sc*WH)*DPR,oy*DPR);
 else g.setTransform(sc*DPR,0,0,sc*DPR,ox*DPR,oy*DPR);
 g.drawImage(bgc,0,0,WW,WH);
 drawOven();drawBelt();drawShelf();
 /* pizzy na pásu */
 for(const b of belt)pizzaAt(AX+b.p,AY,33,b.type,b.rot);
 drawPack();
 drawChef();drawSeller();
 for(const c of leaving)drawCustomer(c);
 for(const c of queue)drawCustomer(c);
 for(const c of queue)drawBubble(c);
 for(const f of fx){
  upright(f.x,f.y-f.t*40,()=>{g.globalAlpha=clamp(1.6-f.t,0,1);g.font="800 17px system-ui,sans-serif";g.textAlign="center";g.lineWidth=4;g.strokeStyle="#000a";g.strokeText(f.txt,0,0);g.fillStyle=f.col;g.fillText(f.txt,0,0);g.globalAlpha=1});
 }
}

/* ---------- HUD ---------- */
function flowRates(){
 const d=D();
 return{
  dem:demandRate()*60,
  oven:d.slots/d.bake*60,
  belt:d.speed/SP*60,
  pack:60/(d.packT+.15),
  sell:60/(d.saleT+.7)
 };
}
function hud(){
 $("money").textContent=fmt(money);
 $("repBar").style.width=S.rep+"%";$("repTxt").textContent=Math.round(S.rep);
 const c=counts().reduce((a,b)=>a+b,0);
 $("stats").textContent=`Prodáno ${fmt(S.sold)} ks · ${soldWin.length}/min · v provozu ${c}/${D().cap}`+(queue.length?` · fronta ${queue.length}`:"");
 $("rent").textContent=noRent?"Nájem vypnut (admin)":`Nájem ${fmt(rentAmt())} 💰 za ${Math.ceil(rentT)} s`;
}

/* ---------- obchod ---------- */
let tab="oven",sig="";
const UP={oven:OVEN,belt:BELT,sell:SELL};
const FIELDS={
 oven:[["slots","komor",v=>v],["bake","pečení",v=>v+" s"],["chef","kuchař",v=>Math.round(v/230*100)+" %"]],
 belt:[["speed","rychlost pásu",v=>Math.round(v/50*100)+" %"],["pack","balení",v=>v+" s"]],
 sell:[["sale","prodej",v=>v+" s"],["cap","police",v=>v+" krabic"],["bonus","příplatek",v=>"+"+v+" %"]]
};
function specHTML(key,i){
 const L=UP[key],cur=L[i],prev=L[i-1];
 return FIELDS[key].map(f=>{const v=f[2](cur[f[0]]);return prev&&prev[f[0]]!==cur[f[0]]?`<u>${f[1]} ${v}</u>`:`${f[1]} ${v}`}).join(" · ");
}
function renderList(){
 const el=$("list");let h="";
 if(tab==="pizza"){
  h+=`<p class="note" style="margin:4px 0 2px;font-size:.74rem;color:var(--muted)">Zákazníci si objednávají jen to, co je na jídelníčku. Víc druhů a lepší recepty = větší poptávka. Lepší recept zdražuje suroviny, ale prodejní cena roste rychleji.</p>`;
  PZ.forEach((p,i)=>{
   const s=S.pz[i],img=PIZZA_IMG[p.id];
   if(!s.u){
    h+=`<div class="pz lock"><img src="${img}" alt=""><div><b>${p.n}</b><div class="sp">Prodej ${p.sell} 💰 · suroviny ${p.cost} 💰 · zisk ${p.sell-p.cost} 💰 za kus</div><div class="r"><button class="buy" data-unlock="${i}" data-price="${p.unlock}">Odemknout – ${fmt(p.unlock)} 💰</button></div></div></div>`;
   }else{
    const pr=sellPrice(i),co=Math.round(p.cost*(1+.10*s.q)),max=s.q>=5;
    const npr=Math.round(p.sell*(1+.22*(s.q+1))*(1+D().bonus/100)),nco=Math.round(p.cost*(1+.10*(s.q+1)));
    h+=`<div class="pz"><img src="${img}" alt=""><div><b>${p.n}</b> <span class="pips">${"★".repeat(s.q)}${"☆".repeat(5-s.q)}</span>
     <div class="sp">${QN[s.q]} · prodej <u>${fmt(pr)} 💰</u> · suroviny ${co} 💰 · zisk ${fmt(pr-co)} 💰/ks</div>
     <div class="r">${max?`<span class="ok">Nejlepší recept ✔</span>`:`<button class="buy" data-q="${i}" data-price="${p.q[s.q]}">${QN[s.q+1]} – ${fmt(p.q[s.q])} 💰<br><small style="color:#4a2a00">prodej → ${fmt(npr)}, suroviny → ${nco}</small></button>`}
     <label class="sw"><input type="checkbox" data-tog="${i}" ${s.e?"checked":""}> Na jídelníčku</label></div></div></div>`;
   }
  });
 }else{
  const L=UP[tab],cur=S.lv[tab];
  for(let i=0;i<L.length;i++){
   const done=i<=cur,next=i===cur+1;
   h+=`<div class="lv ${done?"done":next?"next":"lock"}"><div class="no">${done?"✓":i}</div><div><b>${i===0?"Základ: ":""}${L[i].n}</b><div class="sp">${specHTML(tab,i)}</div></div>
    ${done?`<span class="ok">${i===cur?"Aktuální":""}</span>`:`<button data-buy="${tab}:${i}" data-price="${L[i].price}" ${next?"":"disabled data-lock=1"}>${fmt(L[i].price)} 💰</button>`}</div>`;
  }
 }
 el.innerHTML=h;refreshBtns();
}
function refreshBtns(){
 document.querySelectorAll("#list button[data-price]").forEach(b=>{if(b.dataset.lock)return;b.disabled=money<+b.dataset.price});
}
function renderFlow(){
 const r=flowRates(),rows=[["Poptávka",r.dem,"dem"],["Pec",r.oven],["Pás",r.belt],["Balení",r.pack],["Prodavač",r.sell]];
 const cap=rows.slice(1),mn=cap.reduce((a,b)=>b[1]<a[1]?b:a),mx=Math.max(...rows.map(x=>x[1]));
 let msg;
 if(r.dem<=mn[1]*.9)msg=`Zatím víc zvládneš, než zákazníci chtějí. Přidej pizzy na jídelníček, vylepši recepty a drž dobrou pověst.`;
 else msg=`Úzké hrdlo: <b>${mn[0]}</b> – tady vylepšuj, jinak zákazníci čekají a odcházejí.`;
 $("flow").innerHTML=`<h4>📊 Průtok (pizz za minutu)</h4>`+rows.map(x=>`<div class="fl ${x[2]||""} ${x[0]===mn[0]&&r.dem>mn[1]*.9?"min":""}"><span>${x[0]}</span><div class="bar"><i style="width:${Math.min(100,x[1]/mx*100)}%"></i></div><em>${x[1].toFixed(1)}</em></div>`).join("")+`<p>${msg}</p>`;
}
function openShop(on){
 $("shop").classList.toggle("open",on);if(on){$("adm").classList.remove("open");sig="";renderShop(true)}
}
function renderShop(force){
 if(!$("shop").classList.contains("open"))return;
 renderFlow();
 const s=JSON.stringify([tab,S.lv,S.pz]);
 if(s!==sig||force){sig=s;renderList()}else refreshBtns();
 document.querySelectorAll("#tabs button").forEach(b=>b.classList.toggle("on",b.dataset.tab===tab));
}
$("shopB").onclick=()=>openShop(!$("shop").classList.contains("open"));
$("tabs").onclick=e=>{const b=e.target.closest("button");if(!b)return;tab=b.dataset.tab;sig="";renderShop(true)};
$("list").onclick=e=>{
 const b=e.target.closest("button");if(!b||b.disabled)return;const price=+b.dataset.price;
 if(money<price)return;
 if(b.dataset.buy){const[k,i]=b.dataset.buy.split(":");if(+i===S.lv[k]+1){money-=price;S.lv[k]=+i;toast("Vylepšeno: "+UP[k][+i].n,"good")}else return}
 else if(b.dataset.unlock){const i=+b.dataset.unlock;if(!S.pz[i].u){money-=price;S.pz[i].u=1;S.pz[i].e=1;toast("Nová pizza na jídelníčku: "+PZ[i].n,"good")}}
 else if(b.dataset.q){const i=+b.dataset.q;if(S.pz[i].q<5){money-=price;S.pz[i].q++;toast(PZ[i].n+": "+QN[S.pz[i].q],"good")}}
 save();hud();renderShop(true);
};
$("list").onchange=e=>{
 const t=e.target.dataset.tog;if(t===undefined)return;const i=+t;
 if(!e.target.checked&&menu().length<=1){e.target.checked=true;toast("Na jídelníčku musí zůstat aspoň jedna pizza.","bad");return}
 S.pz[i].e=e.target.checked?1:0;save();
};

/* ---------- admin ---------- */
$("admB").onclick=()=>{$("adm").classList.toggle("open");openShopClose();if($("admLogin").style.display!=="none")$("admPw").focus()};
function openShopClose(){$("shop").classList.remove("open")}
function admLogin(){
 if($("admPw").value.trim()===ADM_PW){$("admLogin").style.display="none";$("admTools").style.display="block";$("admPw").value=""}
 else{const p=$("admPw");p.classList.remove("bad");void p.offsetWidth;p.classList.add("bad")}
}
$("admGo").onclick=admLogin;$("admPw").addEventListener("keydown",e=>{if(e.key==="Enter")admLogin()});
const num=()=>{const n=parseInt($("admNum").value,10);return isNaN(n)?0:n};
const out=t=>$("aOut").textContent=t;
$("aAdd").onclick=()=>{money=Math.max(0,money+num());save();hud();renderShop();out("Peníze: "+fmt(money))};
$("aSet").onclick=()=>{money=Math.max(0,num());save();hud();renderShop();out("Peníze: "+fmt(money))};
$("aUnl").onclick=()=>{S.pz.forEach(p=>{p.u=1});save();renderShop(true);out("Všechny pizzy odemčeny.")};
$("aMax").onclick=()=>{S.lv.oven=S.lv.belt=S.lv.sell=5;S.pz.forEach(p=>{p.u=1;p.q=5});save();renderShop(true);out("Vše na maximu.")};
$("aRep").onclick=()=>{S.rep=100;hud();out("Pověst 100.")};
$("aSpd").onchange=e=>{gameSpd=+e.target.value;out("Rychlost ×"+gameSpd)};
$("aFree").onchange=e=>{god=e.target.checked};
$("aNoRent").onchange=e=>{noRent=e.target.checked;hud()};
$("aReset").onclick=()=>{if(!confirm("Opravdu smazat celý postup pizzerie?"))return;try{localStorage.removeItem("pz_m");localStorage.removeItem("pz_s")}catch(e){}location.reload()};
$("aOut2").onclick=()=>{$("admTools").style.display="none";$("admLogin").style.display="block";$("adm").classList.remove("open");god=false;noRent=false;gameSpd=1;$("aFree").checked=false;$("aNoRent").checked=false;$("aSpd").value="1";out("")};

/* zprávy z hlavního menu (přidání peněz z admin panelu, pauza) */
addEventListener("message",e=>{
 const d=e.data||{};
 if(typeof d.addMoney==="number"){money=Math.max(0,money+d.addMoney);save();hud();renderShop()}
 if(typeof d.pause==="boolean")paused=d.pause;
});
addEventListener("pagehide",save);

/* ---------- smyčka ---------- */
let last=performance.now();
function loop(now){
 let dt=Math.min(.1,(now-last)/1000);last=now;
 if(!paused){
  dt*=gameSpd;const n=Math.max(1,Math.ceil(dt/.05));
  for(let i=0;i<n;i++)upd(dt/n);
  saveT-=dt;if(saveT<=0){saveT=2;save()}
  hudT-=dt;if(hudT<=0){hudT=.25;hud();renderShop();
   const aff=!$("shop").classList.contains("open")&&(
    [["oven",OVEN],["belt",BELT],["sell",SELL]].some(([k,L])=>S.lv[k]<5&&money>=L[S.lv[k]+1].price)||
    PZ.some((p,i)=>!S.pz[i].u&&money>=p.unlock)||PZ.some((p,i)=>S.pz[i].u&&S.pz[i].q<5&&money>=p.q[S.pz[i].q]));
   $("shopB").classList.toggle("pulse",aff);
  }
 }
 frame();
 requestAnimationFrame(loop);
}
resize();hud();
requestAnimationFrame(loop);
