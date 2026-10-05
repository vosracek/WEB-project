"use strict";
/* Dálnice – auto jede samo (hráč neřídí), klikáním přidáváš plyn.
   Za každé předjeté auto dostaneš peníze. V obchodě kupuješ rychlejší auta. */
const $=id=>document.getElementById(id),cv=$("c"),ctx=cv.getContext("2d");
const R=Math.random,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),fmt=n=>Math.round(n).toLocaleString("cs-CZ");

/* ---------- auta ----------
   top = nejvyšší rychlost km/h, t100 = zrychlení 0–100 km/h (údaje výrobců)
   mult = herní bonus k výdělku, pay = odměna za předjetí, tw = jak často jezdí v provozu */
const CARS=[
 {id:"bmw", n:"BMW M3 (E46)",               top:250,t100:5.2,price:0,     mult:1,  w:1.78,pay:10,tw:35,info:"řadová šestka 3,2 l, 343 k; rychlost omezena na 250"},
 {id:"audi",n:"Audi A6 Avant 3.0 TFSI",     top:250,t100:5.6,price:2500,  mult:2,w:1.87,pay:15,tw:35,info:"V6 3,0 TFSI, 310 k, quattro"},
 {id:"hur", n:"Lamborghini Huracán LP 610-4",top:325,t100:3.2,price:15000, mult:3,w:1.92,pay:40,tw:14,info:"V10 5,2 l, 610 k, rychlost přes 325"},
 {id:"sv",  n:"Lamborghini Aventador SV",   top:350,t100:2.8,price:50000, mult:4.5,  w:2.03,pay:60,tw:10,info:"V12 6,5 l, 750 k, rychlost přes 350"},
 {id:"lafe",n:"Ferrari LaFerrari",          top:350,t100:2.9,price:120000, mult:6,  w:1.99,pay:90,tw:6, info:"V12 + elektromotor, 963 k, 0–100 pod 3 s"}
];
const IMG={};for(const c of CARS){const im=new Image();im.src=CAR_IMG[c.id];IMG[c.id]=im}
const ADM_PW="perofacky";

/* ---------- uložený postup ---------- */
let money=0,owned={bmw:1},carId="bmw",total=0,bestKmh=0,dirty=false,god=false;
try{
 money=+localStorage.getItem("hw_m")||0;total=+localStorage.getItem("hw_n")||0;bestKmh=+localStorage.getItem("hw_b")||0;
 owned=JSON.parse(localStorage.getItem("hw_own")||'{"bmw":1}');owned.bmw=1;
 carId=localStorage.getItem("hw_car")||"bmw";if(!CARS.some(c=>c.id===carId))carId="bmw";
}catch(e){}
function save(){dirty=false;try{localStorage.setItem("hw_m",money);localStorage.setItem("hw_n",total);localStorage.setItem("hw_b",bestKmh);localStorage.setItem("hw_own",JSON.stringify(owned));localStorage.setItem("hw_car",carId)}catch(e){}}
const cur=()=>CARS.find(c=>c.id===carId);

/* ---------- svět ---------- */
const LW=3.6,CAMH=2.7,CAMBACK=8,SPAWN=560,DRAW=520,LANE_KMH=[125,100,78];
let W,H,DPR,U,F,HOR,camX=0,groundG,T_NOW=0,paused=false,shopOpen=false;
const bg=document.createElement("canvas");
const P={z:0,x:0,lane:1,v:0,des:0,boost:0,cool:0,aiT:0,capV:1e9,lead:null,tilt:0};
const T=[];                     // provoz: {lane,zr,v,m,pz}
const fx=[],rip=[];             // plovoucí texty a kliknutí
let chain=0,lastOv=-99;
const laneX=L=>(L-1)*LW;

function resize(){
 DPR=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;
 cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);
 U=Math.min(H,W*.62);F=1.45*U;HOR=H*.85-CAMH*F/CAMBACK;
 groundG=ctx.createLinearGradient(0,HOR,0,H);groundG.addColorStop(0,"#2a2233");groundG.addColorStop(.25,"#171a26");groundG.addColorStop(1,"#0d1018");
 buildBg();
}
/* pozadí: západ slunce a vzdálené město (kreslí se jednou) */
function buildBg(){
 bg.width=Math.ceil(W*DPR);bg.height=Math.ceil((HOR+4)*DPR);
 const g=bg.getContext("2d");g.setTransform(DPR,0,0,DPR,0,0);
 const s=g.createLinearGradient(0,0,0,HOR);
 s.addColorStop(0,"#0a1440");s.addColorStop(.45,"#4a2f82");s.addColorStop(.78,"#d9607a");s.addColorStop(1,"#ffb070");
 g.fillStyle=s;g.fillRect(0,0,W,HOR+4);
 g.fillStyle="#fff";for(let i=0;i<50;i++){g.globalAlpha=.25+R()*.6;g.fillRect(R()*W,R()*HOR*.5,1.3,1.3)}g.globalAlpha=1;
 const sx=W*.6,sr=U*.14,sy=HOR-sr*.25,sg=g.createRadialGradient(sx,sy,sr*.2,sx,sy,sr*3.2);
 sg.addColorStop(0,"#fff0b8cc");sg.addColorStop(.3,"#ffa25c55");sg.addColorStop(1,"#ff7a4a00");
 g.fillStyle=sg;g.fillRect(0,0,W,HOR+4);
 g.fillStyle="#ffe7a6";g.beginPath();g.arc(sx,sy,sr,0,7);g.fill();
 const L=[["#3a2a63",.12,.03,.07],["#21183f",.07,.02,.05],["#140f2b",.035,.015,.04]];
 L.forEach(([col,hh,wmin,wmax],li)=>{
  let x=-10;
  while(x<W){const w=W*(wmin+R()*(wmax-wmin)),h=U*hh*(.4+R()*1.3);
   g.fillStyle=col;g.fillRect(x,HOR-h,w+1,h+4);
   if(li===2)for(let k=0;k<h/8;k++)if(R()<.4){g.fillStyle="#ffd27acc";g.fillRect(x+R()*(w-3),HOR-h+k*8+2,2,2)}
   x+=w+R()*W*.008}
 });
}

/* ---------- budovy po stranách dálnice ---------- */
const PAL=[[46,40,82],[56,46,92],[36,38,70],[66,48,88],[40,34,62],[52,52,86]];
const FOG=[255,150,110],BRIDGE_EVERY=900,BRIDGE_OFF=444;
const hitBridge=(z,d)=>{const r=(((z-BRIDGE_OFF)%BRIDGE_EVERY)+BRIDGE_EVERY)%BRIDGE_EVERY;return r<26||r+d>BRIDGE_EVERY};
const B=[];const grp={};
function initB(b,side,layer,z){
 b.side=side;b.layer=layer;
 if(layer===0){b.xi=10.5+R()*2;b.bw=9+R()*14;b.d=14+R()*26;b.h=9+R()*36}
 else{b.xi=32+R()*10;b.bw=20+R()*26;b.d=24+R()*30;b.h=50+R()*120}
 b.xo=b.xi+b.bw;
 while(hitBridge(z,b.d))z+=6;
 b.z=z;b.col=PAL[(R()*PAL.length)|0].map(v=>v+((R()*14)|0)-7);
 b.cols=Math.max(2,Math.floor(b.bw/3.2));b.rows=Math.max(2,Math.floor(b.h/3.6));b.dc=Math.max(2,Math.floor(b.d/4));
 b.lit=new Uint8Array(b.cols*b.rows);b.litS=new Uint8Array(b.dc*b.rows);
 for(let i=0;i<b.lit.length;i++)b.lit[i]=R()<.32?(R()<.8?1:2):0;
 for(let i=0;i<b.litS.length;i++)b.litS[i]=R()<.3?(R()<.8?1:2):0;
 grp[side+"_"+layer]=z+b.d+(layer?R()*10:R()*6);
}
for(const side of[-1,1])for(const layer of[0,1]){
 grp[side+"_"+layer]=-40;
 while(grp[side+"_"+layer]<SPAWN+80){const b={};initB(b,side,layer,grp[side+"_"+layer]);B.push(b)}
}
function recycleB(){
 for(const b of B)if(b.z+b.d-P.z<-CAMBACK-4){const key=b.side+"_"+b.layer;initB(b,b.side,b.layer,grp[key])}
}

/* ---------- provoz ---------- */
const TW=CARS.reduce((a,c)=>a+c.tw,0);
function pickModel(){let r=R()*TW;for(let i=0;i<CARS.length;i++){if((r-=CARS[i].tw)<0)return i}return 0}
function spawnTraffic(first){
 const dens=first?1:.7+clamp(P.v*3.6,100,350)/200; // čím rychleji jedeš, tím řidší provoz

 const far=[first?20:-1e9,first?20:-1e9,first?20:-1e9];
 if(!first)for(const c of T)if(c.zr>far[c.lane])far[c.lane]=c.zr;
 for(let L=0;L<3;L++){
  if(far[L]<-1e8)far[L]=SPAWN-140;
  for(;;){
   const z=far[L]+(85+R()*140)*dens;if(z>SPAWN)break;
   T.push({lane:L,zr:z,pz:z,m:pickModel(),v:(LANE_KMH[L]+(R()*20-10))/3.6});far[L]=z;
  }
 }
}

/* ---------- auto hráče: samo vybírá pruh, hráč jen klikáním přidává plyn ---------- */
function nearestAhead(L){let b=null;for(const c of T){if(c.lane!==L||c.zr<-3)continue;if(!b||c.zr<b.zr)b=c}return b}
function laneFree(L){
 for(const c of T){if(c.lane!==L)continue;
  const lo=-10-Math.max(0,c.v-P.v)*1.2,hi=10+Math.max(0,P.v-c.v)*1.25;
  if(c.zr>lo&&c.zr<hi)return false}
 return true;
}
function laneScore(L){ // za jak dlouho (s) bychom při své snaze o rychlost narazili na auto v pruhu; víc = lepší
 const c=nearestAhead(L);if(!c)return 1e9;
 const d=P.des-c.v;return d<=.5?1e9:c.zr/d;
}
function ai(dt){
 P.cool-=dt;P.aiT-=dt;if(P.aiT>0)return;P.aiT=.12;
 const nl=clamp(Math.round(P.x/LW+1),0,2);
 let a=nearestAhead(P.lane);
 if(nl!==P.lane){const b=nearestAhead(nl);if(b&&(!a||b.zr<a.zr))a=b}
 P.lead=a;P.capV=1e9;
 if(!a)return;
 const closing=Math.max(0,P.v-a.v),need=12+closing*1.25,look=70+closing*3;
 if(a.zr<look&&P.cool<=0){
  let bestL=P.lane,bestS=laneScore(P.lane)*1.35+.25;
  for(const L of[P.lane-1,P.lane+1]){
   if(L<0||L>2||!laneFree(L))continue;
   const sc=laneScore(L);if(sc>bestS){bestS=sc;bestL=L}
  }
  if(bestL!==P.lane){P.lane=bestL;P.cool=.7}
 }
 if(a.zr<need)P.capV=a.v+Math.max(0,a.zr-12)*.35;
 if(a.zr<7)P.capV=Math.min(P.capV,a.v*.9);
}

/* ---------- fyzika ---------- */
const BOOST_DECAY=38;
const maxBoost=()=>{const c=cur();return c.top-c.top*.4};
function kick(x,y){
 const c=cur();P.boost=Math.min(maxBoost(),P.boost+c.top*.09);
 rip.push({x,y,t:0});$("hint").style.display="none";
}
function award(c){
 const m=CARS[c.m],car=cur();
 chain=(T_NOW-lastOv<2.8)?chain+1:1;lastOv=T_NOW;
 const cm=1+Math.min(10,chain-1)*.1,g=Math.max(1,Math.round(m.pay*car.mult*cm));
 money+=g;if(window.vyEarn)vyEarn("hwy",g);total++;dirty=true;
 const k=F/CAMBACK;
 fx.push({x:W/2+(laneX(c.lane)-camX)*k,y:HOR+CAMH*k-k*1.4,t:0,s:"+"+fmt(g),c:cm>1.05?"#ffd166":"#fff"});
}
function update(dt){
 const car=cur();T_NOW+=dt;
 P.boost=Math.max(0,P.boost-BOOST_DECAY*dt);
 const cruise=car.top*.4;
 let targetK=god?car.top:Math.min(car.top,cruise+P.boost);
 P.des=Math.min(targetK,1e3)/3.6;
 ai(dt);
 let vk=P.v*3.6;
 const tk=Math.min(targetK,P.capV*3.6);
 if(vk<tk){const a0=(100/car.t100)*1.35;vk=Math.min(tk,vk+a0*Math.max(.12,1-Math.pow(vk/car.top,2.2))*dt)}
 else vk=Math.max(tk,vk-(P.capV<1e8&&P.capV*3.6<vk?90:32)*dt);
 P.v=vk/3.6;
 if(vk>bestKmh){bestKmh=Math.round(vk);dirty=true}
 // bezpečnostní brzda: nikdy neprojet autem před sebou
 for(const c of T){if((c.lane===P.lane||c.lane===clamp(Math.round(P.x/LW+1),0,2))&&c.zr>0&&c.zr<6&&c.v<P.v)P.v=c.v}
 P.z+=P.v*dt;
 const tx=laneX(P.lane);P.x+=(tx-P.x)*Math.min(1,dt*4.2);P.tilt=(tx-P.x)*.022;
 camX=P.x*.55;
 // provoz
 for(const c of T){c.pz=c.zr;c.zr+=(c.v-P.v)*dt}
 for(let L=0;L<3;L++){ // auta v jednom pruhu drží odstup
  const a=T.filter(c=>c.lane===L).sort((p,q)=>p.zr-q.zr);
  for(let i=0;i<a.length-1;i++){const c=a[i],l=a[i+1],gap=l.zr-c.zr;
   if(gap<24+Math.max(0,c.v-l.v)*1.2)c.v=Math.min(c.v,l.v);
   if(gap<14)c.zr=l.zr-14}
 }
 for(let i=T.length-1;i>=0;i--){const c=T[i];
  if(c.pz>0&&c.zr<=0)award(c);
  if(c.zr<-16||c.zr>SPAWN+80)T.splice(i,1)}
 spawnTraffic(false);recycleB();
 for(const a of[fx,rip])for(let i=a.length-1;i>=0;i--){a[i].t+=dt;if(a[i].t>1)a.splice(i,1)}
 if(chain&&T_NOW-lastOv>2.8)chain=0;
}

/* ---------- kreslení ---------- */
const mix=(c,t)=>`rgb(${(c[0]+(FOG[0]-c[0])*t)|0},${(c[1]+(FOG[1]-c[1])*t)|0},${(c[2]+(FOG[2]-c[2])*t)|0})`;
const PX=(x,zr)=>{const k=F/(zr+CAMBACK);return W/2+(x-camX)*k};
const PY=(y,zr)=>{const k=F/(zr+CAMBACK);return HOR+(CAMH-y)*k};
function quad(x1,z1,x2,z2,y1,y2){ // plocha od x1 do x2 a od z1 do z2 ve výšce y1..y2 (na zemi y1=y2=0)
 const a=F/(z1+CAMBACK),b=F/(z2+CAMBACK),cx=W/2;
 ctx.beginPath();ctx.moveTo(cx+(x1-camX)*a,HOR+(CAMH-y1)*a);ctx.lineTo(cx+(x2-camX)*a,HOR+(CAMH-y1)*a);
 ctx.lineTo(cx+(x2-camX)*b,HOR+(CAMH-y2)*b);ctx.lineTo(cx+(x1-camX)*b,HOR+(CAMH-y2)*b);ctx.closePath();
}
function wall(x,z0,z1,ya,yb){ // svislá stěna podél dálnice
 const a=F/(z0+CAMBACK),b=F/(z1+CAMBACK),cx=W/2,X0=cx+(x-camX)*a,X1=cx+(x-camX)*b;
 ctx.beginPath();ctx.moveTo(X0,HOR+(CAMH-ya)*a);ctx.lineTo(X0,HOR+(CAMH-yb)*a);ctx.lineTo(X1,HOR+(CAMH-yb)*b);ctx.lineTo(X1,HOR+(CAMH-ya)*b);ctx.closePath();
}
const ZMIN=-CAMBACK+1.4;
function road(){
 const SEG=16,k0=Math.floor((P.z+ZMIN)/SEG),k1=Math.floor((P.z+DRAW)/SEG),hw=LW*1.5;
 for(let k=k1;k>=k0;k--){
  const z0=Math.max(ZMIN,k*SEG-P.z),z1=k*SEG+SEG-P.z+.6,ev=k&1;
  ctx.fillStyle=ev?"#2f333d":"#2a2d36";quad(-hw,z0,hw,z1,0,0);ctx.fill();
  ctx.fillStyle="#22242c";quad(-hw-1.9,z0,-hw,z1,0,0);ctx.fill();quad(hw,z0,hw+1.9,z1,0,0);ctx.fill();
  ctx.fillStyle="#2b2f3b";quad(-hw-4.9,z0,-hw-1.9,z1,0,0);ctx.fill();quad(hw+1.9,z0,hw+4.9,z1,0,0);ctx.fill();
  ctx.fillStyle=ev?"#767d8c":"#646b79";wall(hw+1.95,z0,z1,.3,.85);ctx.fill();wall(-hw-1.95,z0,z1,.3,.85);ctx.fill();
  ctx.fillStyle="#e8edf5";quad(-hw-.16,z0,-hw+.16,z1,0,0);ctx.fill();quad(hw-.16,z0,hw+.16,z1,0,0);ctx.fill();
 }
 // přerušované dělicí čáry
 ctx.fillStyle="#f2f5fa";
 const D=12,d0=Math.floor((P.z+ZMIN)/D),d1=Math.floor((P.z+DRAW)/D);
 for(let d=d1;d>=d0;d--){const z0=Math.max(ZMIN,d*D-P.z),z1=d*D+4.2-P.z;if(z1<ZMIN)continue;
  for(const x of[-LW/2,LW/2]){quad(x-.1,z0,x+.1,z1,0,0);ctx.fill()}}
}
const fogT=zr=>Math.min(.88,Math.pow(clamp((zr-30)/DRAW,0,1),.85)*.95);
function drawBuilding(b){
 const zr=b.z-P.z,zf=zr+b.d;if(zf<ZMIN||zr>DRAW)return;
 const zn=Math.max(zr,ZMIN),t=fogT(zr),cx=W/2,s=b.side;
 const xi=s*b.xi,xo=s*b.xo,k1=F/(zn+CAMBACK),k2=F/(zf+CAMBACK);
 const Xi1=cx+(xi-camX)*k1,Xi2=cx+(xi-camX)*k2,Xo1=cx+(xo-camX)*k1;
 const yb1=HOR+CAMH*k1,yt1=yb1-b.h*k1,yb2=HOR+CAMH*k2,yt2=yb2-b.h*k2;
 // strana k dálnici (osvětlená západem)
 const warm=[b.col[0]+38,b.col[1]+18,b.col[2]+4];
 ctx.fillStyle=mix(warm,t);ctx.beginPath();ctx.moveTo(Xi1,yb1);ctx.lineTo(Xi2,yb2);ctx.lineTo(Xi2,yt2);ctx.lineTo(Xi1,yt1);ctx.closePath();ctx.fill();
 // čelo budovy (ve stínu)
 if(zr>=ZMIN){ctx.fillStyle=mix([b.col[0]-14,b.col[1]-14,b.col[2]-8],t);
  ctx.fillRect(Math.min(Xi1,Xo1),yt1,Math.abs(Xo1-Xi1),yb1-yt1);}
 if(t>.7||k1*3.2<3)return;
 // okna na boční stěně
 const rowH=3.6;
 ctx.fillStyle=`rgba(255,214,130,${(.9-t).toFixed(2)})`;ctx.beginPath();
 for(let r=0;r<b.rows;r++)for(let c=0;c<b.dc;c++){if(b.litS[r*b.dc+c]!==1)continue;
  const za=zr+(c+.2)*b.d/b.dc,zb=zr+(c+.8)*b.d/b.dc;if(zb<ZMIN)continue;const za2=Math.max(za,ZMIN);
  const ka=F/(za2+CAMBACK),kb=F/(zb+CAMBACK),ya=1.2+r*rowH,yh=ya+1.5;
  ctx.moveTo(cx+(xi-camX)*ka,HOR+(CAMH-ya)*ka);ctx.lineTo(cx+(xi-camX)*kb,HOR+(CAMH-ya)*kb);
  ctx.lineTo(cx+(xi-camX)*kb,HOR+(CAMH-yh)*kb);ctx.lineTo(cx+(xi-camX)*ka,HOR+(CAMH-yh)*ka);ctx.closePath()}
 ctx.fill();
 // okna na čele
 if(zr>=ZMIN&&Math.abs(Xo1-Xi1)>16){
  const cw=b.bw/b.cols,dir=s>0?1:-1;
  for(let pass=1;pass<=2;pass++){
   ctx.fillStyle=pass===1?`rgba(255,214,130,${(.9-t).toFixed(2)})`:`rgba(170,210,255,${(.8-t).toFixed(2)})`;ctx.beginPath();
   for(let r=0;r<b.rows;r++)for(let c=0;c<b.cols;c++){if(b.lit[r*b.cols+c]!==pass)continue;
    const x0=xi+dir*(c+.22)*cw,x1=xi+dir*(c+.78)*cw,ya=1.2+r*rowH,yh=ya+1.6;
    const a=cx+(x0-camX)*k1,b2=cx+(x1-camX)*k1;
    ctx.rect(Math.min(a,b2),HOR+(CAMH-yh)*k1,Math.abs(b2-a),1.6*k1)}
   ctx.fill();
  }
 }
}
function drawBridge(zb){
 const zr=zb-P.z;if(zr+12<ZMIN||zr>DRAW)return;
 const zn=Math.max(zr,ZMIN),t=fogT(zr),cx=W/2,k=F/(zn+CAMBACK),k2=F/(zr+12+CAMBACK);
 const Y=(h,kk)=>HOR+(CAMH-h)*kk,XL=cx+(-70-camX)*k,XR=cx+(70-camX)*k;
 // spodek mostu
 ctx.fillStyle=mix([34,34,48],t);ctx.beginPath();ctx.moveTo(XL,Y(5.6,k));ctx.lineTo(XR,Y(5.6,k));
 ctx.lineTo(cx+(70-camX)*k2,Y(5.6,k2));ctx.lineTo(cx+(-70-camX)*k2,Y(5.6,k2));ctx.closePath();ctx.fill();
 // čelo mostu
 if(zr>=ZMIN){ctx.fillStyle=mix([58,58,76],t);ctx.fillRect(XL,Y(7,k),XR-XL,Y(5.6,k)-Y(7,k));
  ctx.fillStyle=mix([120,124,140],t);ctx.fillRect(XL,Y(7.5,k),XR-XL,Y(7,k)-Y(7.5,k));
  ctx.fillStyle=mix([48,48,64],t);
  for(const x of[-9.3,9.3]){const a=cx+(x-camX)*k;ctx.fillRect(a-.8*k,Y(5.6,k),1.6*k,Y(0,k)-Y(5.6,k))}}
}
function drawLamp(side,zabs){
 const zr=zabs-P.z;if(zr<ZMIN||zr>DRAW*.8)return;
 const k=F/(zr+CAMBACK),cx=W/2,t=fogT(zr),px=cx+(side*8.3-camX)*k,ax=cx+(side*6.3-camX)*k,
  yb=HOR+CAMH*k,yt=HOR+(CAMH-7.6)*k;
 ctx.strokeStyle=mix([20,20,30],t);ctx.lineWidth=Math.max(1,.22*k);
 ctx.beginPath();ctx.moveTo(px,yb);ctx.lineTo(px,yt);ctx.lineTo(ax,yt);ctx.stroke();
 const r=Math.max(3,2.6*k),g=ctx.createRadialGradient(ax,yt,0,ax,yt,r*4);
 g.addColorStop(0,"rgba(255,236,170,.95)");g.addColorStop(.25,"rgba(255,190,100,.35)");g.addColorStop(1,"rgba(255,160,80,0)");
 ctx.fillStyle=g;ctx.fillRect(ax-r*4,yt-r*4,r*8,r*8);
}
function drawCar(img,w,x,zr,alpha,tilt,bob,glow,isP){
 if(!img.naturalWidth)return;
 const k=F/(zr+CAMBACK),wp=w*k,hp=wp*img.naturalHeight/img.naturalWidth;
 const X=W/2+(x-camX)*k,Y=HOR+CAMH*k+(bob||0);
 ctx.globalAlpha=alpha;
 ctx.fillStyle="rgba(0,0,0,.5)";ctx.beginPath();ctx.ellipse(X,Y-hp*.02,wp*.56,hp*.11,0,0,7);ctx.fill();
 if(isP){const g=ctx.createRadialGradient(X,Y,0,X,Y,wp*.85);g.addColorStop(0,"rgba(255,176,46,.55)");g.addColorStop(1,"rgba(255,176,46,0)");
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(X,Y,wp*.85,hp*.22,0,0,7);ctx.fill()}
 ctx.save();ctx.translate(X,Y);ctx.rotate(tilt||0);
 ctx.drawImage(img,-wp/2,-hp,wp,hp);
 if(glow>0.02){ // plamen z výfuků při plném plynu
  ctx.globalCompositeOperation="lighter";
  for(const fxp of[-.26,.26]){const gx=fxp*wp,gy=-hp*.11,r=wp*.11*(.5+glow);
   const g=ctx.createRadialGradient(gx,gy,0,gx,gy,r*2.2);g.addColorStop(0,`rgba(120,220,255,${.9*glow})`);g.addColorStop(.4,`rgba(255,150,60,${.55*glow})`);g.addColorStop(1,"rgba(255,80,0,0)");
   ctx.fillStyle=g;ctx.fillRect(gx-r*2.2,gy-r*2.2,r*4.4,r*4.4)}
 }
 ctx.restore();ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";
}
const streaks=Array.from({length:34},()=>({a:R()*6.283,o:R(),l:.4+R()*.6}));
function draw(dt){
 const vk=P.v*3.6,cx=W/2,car=cur();
 ctx.drawImage(bg,0,0,W,HOR+4);
 ctx.fillStyle=groundG;ctx.fillRect(0,HOR,W,H-HOR);
 // věže v pozadí
 for(const b of B)if(b.layer===1)drawBuilding(b);
 road();
 // seznam předmětů seřazený od nejvzdálenějšího
 const items=[];
 for(const b of B)if(b.layer===0)items.push({z:b.z,t:0,o:b});
 const l0=Math.ceil((P.z+ZMIN)/36)*36;
 for(let z=l0;z<P.z+DRAW*.8;z+=36){items.push({z:z-P.z,t:1,o:z,s:-1});items.push({z:z-P.z,t:1,o:z,s:1})}
 const b0=Math.floor((P.z-BRIDGE_OFF+ZMIN-14)/BRIDGE_EVERY);
 for(let n=b0;n<=b0+2;n++){const zb=n*BRIDGE_EVERY+BRIDGE_OFF;if(zb-P.z<DRAW)items.push({z:zb-P.z,t:2,o:zb})}
 for(const c of T)items.push({z:c.zr,t:3,o:c});
 items.push({z:0,t:4});
 for(const it of items)it.z=it.t===0?it.o.z-P.z:it.z;
 items.sort((a,b)=>b.z-a.z);
 for(const it of items){
  if(it.t===0)drawBuilding(it.o);
  else if(it.t===1)drawLamp(it.s,it.o);
  else if(it.t===2)drawBridge(it.o);
  else if(it.t===3){const c=it.o;if(c.zr>DRAW||c.zr<ZMIN)continue;const m=CARS[c.m];
   drawCar(IMG[m.id],m.w,laneX(c.lane),c.zr,1-fogT(c.zr)*.75);}
  else{const bob=Math.sin(T_NOW*(14+vk*.05))*Math.min(1.6,vk/110);
   drawCar(IMG[car.id],car.w,P.x,0,1,P.tilt,bob,clamp((P.boost+(god?80:0))/60,0,1),true)}
 }
 // čáry rychlosti
 if(vk>140){const a=clamp((vk-140)/200,0,.5);ctx.lineWidth=1.5;
  for(const s of streaks){s.o=(s.o+dt*(.6+vk/260))%1;const r0=s.o*s.o,r1=Math.min(1,r0+.12*s.l);
   const ox=cx,oy=HOR,rx=W*.75,ry=(H-HOR)*1.25;
   ctx.strokeStyle=`rgba(255,240,220,${(a*(.3+r0)).toFixed(3)})`;ctx.beginPath();
   ctx.moveTo(ox+Math.cos(s.a)*rx*r0,oy+Math.abs(Math.sin(s.a))*ry*r0);ctx.lineTo(ox+Math.cos(s.a)*rx*r1,oy+Math.abs(Math.sin(s.a))*ry*r1);ctx.stroke()}}
 // kliknutí a výdělky
 for(const r of rip){ctx.strokeStyle=`rgba(255,200,110,${1-r.t})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(r.x,r.y,10+r.t*50,0,7);ctx.stroke()}
 ctx.textAlign="center";ctx.font="800 "+Math.round(Math.max(16,U*.04))+"px system-ui,sans-serif";
 for(const f of fx){ctx.globalAlpha=1-f.t*f.t;ctx.lineWidth=4;ctx.strokeStyle="#000a";ctx.strokeText(f.s,f.x,f.y-f.t*U*.16);ctx.fillStyle=f.c;ctx.fillText(f.s,f.x,f.y-f.t*U*.16)}
 ctx.globalAlpha=1;
}

/* ---------- ovládání: jen klikání = plyn ---------- */
cv.addEventListener("pointerdown",e=>{if(paused)return;const r=cv.getBoundingClientRect();kick(e.clientX-r.left,e.clientY-r.top)});
addEventListener("keydown",e=>{if(e.repeat||paused||document.activeElement.tagName==="INPUT"||document.activeElement.tagName==="SELECT")return;
 if(["Space","Enter","ArrowUp","KeyW"].includes(e.code)){e.preventDefault();kick(W/2,H*.75)}});

/* ---------- HUD ---------- */
let hudT=0,lastSpd=-1,saveT=0;
function hud(force){
 const car=cur(),vk=Math.round(P.v*3.6);
 $("money").textContent=fmt(money);
 if(vk!==lastSpd){$("spd").textContent=vk;lastSpd=vk}
 $("spdBar").style.width=Math.min(100,vk/car.top*100)+"%";
 $("nitBar").style.width=Math.min(100,(god?1:P.boost/maxBoost())*100)+"%";
 $("combo").textContent=chain>1?"🔥 Série "+chain+" · ×"+(1+Math.min(10,chain-1)*.1).toFixed(1):"";
 $("stats").textContent="Předjeto celkem: "+fmt(total)+" · Rekord: "+bestKmh+" km/h";
 $("carName").textContent=car.n+" · bonus ×"+car.mult;
 if(force)renderShop();
}

/* ---------- obchod ---------- */
function renderShop(){
 $("items").innerHTML=CARS.map(c=>{
  const own=!!owned[c.id],on=c.id===carId;
  const btn=on?`<button class="on" disabled>Jedeš v něm ✔</button>`:own?`<button data-drive="${c.id}">Nasednout</button>`
   :`<button data-buy="${c.id}" ${money<c.price?"disabled":""}>Koupit za ${fmt(c.price)} 💰</button>`;
  return `<div class="item${on?" cur":""}"><img src="${CAR_IMG[c.id]}" alt=""><div><b>${c.n}</b>
   <div class="sp">🏁 ${c.top} km/h · ⏱ 0–100: ${String(c.t100).replace(".",",")} s · 💰 bonus ×${c.mult}<br>${c.info}</div>${btn}</div></div>`}).join("");
}
$("items").addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.buy){const c=CARS.find(x=>x.id===b.dataset.buy);if(c&&money>=c.price&&!owned[c.id]){money-=c.price;owned[c.id]=1;carId=c.id;save()}}
 if(b.dataset.drive&&owned[b.dataset.drive]){carId=b.dataset.drive;save()}
 P.boost=Math.min(P.boost,maxBoost());hud(true);
});
$("shopB").onclick=()=>{shopOpen=!shopOpen;$("shop").classList.toggle("open",shopOpen);$("adm").classList.remove("open");if(shopOpen)renderShop()};

/* ---------- admin ---------- */
$("aCar").innerHTML=CARS.map(c=>`<option value="${c.id}">${c.n}</option>`).join("");
$("admB").onclick=()=>{$("adm").classList.toggle("open");if($("admLogin").style.display!=="none")$("admPw").focus()};
function admLogin(){
 if($("admPw").value.trim()===ADM_PW){$("admLogin").style.display="none";$("admTools").style.display="block";$("admPw").value=""}
 else{const p=$("admPw");p.classList.remove("bad");void p.offsetWidth;p.classList.add("bad")}
}
$("admGo").onclick=admLogin;$("admPw").addEventListener("keydown",e=>{if(e.key==="Enter")admLogin()});
const num=()=>{const n=parseInt($("admNum").value,10);return isNaN(n)?0:n};
$("aAdd").onclick=()=>{money=Math.max(0,money+num());save();hud(true);$("aOut").textContent="Peníze: "+fmt(money)};
$("aSet").onclick=()=>{money=Math.max(0,num());save();hud(true);$("aOut").textContent="Peníze: "+fmt(money)};
$("aDrive").onclick=()=>{carId=$("aCar").value;owned[carId]=1;save();hud(true);$("aOut").textContent="Nasedl jsi do: "+cur().n};
$("aAll").onclick=()=>{for(const c of CARS)owned[c.id]=1;save();hud(true);$("aOut").textContent="Všechna auta odemčena."};
$("aNit").onchange=e=>{god=e.target.checked};
$("aReset").onclick=()=>{money=0;owned={bmw:1};carId="bmw";total=0;bestKmh=0;save();location.reload()};
$("aOut2").onclick=()=>{$("admTools").style.display="none";$("admLogin").style.display="block";$("adm").classList.remove("open");god=false;$("aNit").checked=false;$("aOut").textContent=""};

/* zprávy z hlavního menu (přidání peněz z admin panelu, pauza) */
addEventListener("message",e=>{const d=e.data;if(!d)return;
 if(typeof d.addMoney==="number"){money=Math.max(0,money+d.addMoney);save();hud(true)}
 if(typeof d.pause==="boolean")paused=d.pause;
});

/* ---------- smyčka ---------- */
let last=performance.now();
function loop(now){
 const dt=Math.min(.05,(now-last)/1000);last=now;
 if(!paused&&!shopOpen)update(dt);
 draw(paused||shopOpen?0:dt);
 hudT-=dt;if(hudT<=0){hudT=.1;hud(false)}
 saveT-=dt;if(dirty&&saveT<=0){saveT=1.5;save()}
 requestAnimationFrame(loop);
}
addEventListener("resize",resize);
addEventListener("pagehide",save);
resize();P.v=cur().top*.4/3.6;P.x=0;spawnTraffic(true);hud(true);
requestAnimationFrame(loop);
