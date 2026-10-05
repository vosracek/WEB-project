const $=id=>document.getElementById(id),cv=$("c"),ctx=cv.getContext("2d"),R=Math.random,TAU=Math.PI*2;
let W,H,DPR,S,FLOOR,SAND,money=0,best=0,hits=0,streak=0,autoT=0,autoAcc=0,pointT=0,px=0,py=0,armA=1.5,T=0;
try{money=+localStorage.getItem("ak_m")||0;best=+localStorage.getItem("ak_b")||0;hits=+localStorage.getItem("ak_h")||0}catch(e){}
const save=()=>{try{localStorage.setItem("ak_m",money);localStorage.setItem("ak_b",best);localStorage.setItem("ak_h",hits)}catch(e){}};
const AUTO_COST=1000,AUTO_SEC=60;
const SP={
 klaun:{n:"Klaun",v:2,L:46,Hh:26,spd:40,c1:"#ff8a1f",c2:"#d94a08",c3:"#ffd9a0"},
 tang:{n:"Tang",v:3,L:60,Hh:36,spd:48,c1:"#2f9bff",c2:"#0a2fa8",c3:"#8fd0ff",ct:"#ffd21f"},
 motyl:{n:"Motýlí ryba",v:2,L:54,Hh:40,spd:34,c1:"#ffe45c",c2:"#f0a000",c3:"#fff7c8"},
 medusa:{n:"Medúza",v:9,L:62,Hh:80,spd:10},
 rejnok:{n:"Rejnok",v:16,L:170,Hh:110,spd:26},
 zralok:{n:"Žralok",v:28,L:240,Hh:84,spd:50}
};
const fish=[],fx=[],txt=[],bub=[],deco=[],far=[];
function resize(){DPR=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);
 S=Math.max(.6,Math.min(1.35,Math.min(W,H*1.6)/900));FLOOR=H*.86;SAND=H*.75;
 deco.length=0;for(let i=0;i<9;i++)deco.push({t:["coral","weed","weed","rock","coral"][i%5],x:W*(i+.3+R()*.4)/9,c:["#ff5d8f","#ff9f43","#b76cff","#ff6b6b"][i%4],s:.7+R()*.6,ph:R()*6});}
function spawn(sp,n){for(let i=0;i<n;i++)fish.push({sp,x:R()*W,y:H*(.12+R()*.55),z:.85+R()*.3,d:R()<.5?-1:1,face:1,th:0,ph:R()*6,t:R()*9,cd:0,burst:0,vx:0,vy:0})}
resize();spawn("klaun",4);spawn("tang",3);spawn("motyl",3);spawn("medusa",2);spawn("rejnok",1);spawn("zralok",1);
for(let i=0;i<5;i++)far.push({x:R()*1000,y:.15+R()*.5,s:.6+R()*.8,v:8+R()*10});
for(let i=0;i<40;i++)bub.push({x:R(),y:R(),r:1+R()*3,v:.03+R()*.05});
resize();addEventListener("resize",resize);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function upd(dt){
 T+=dt;pointT-=dt;
 for(const f of fish){const s=SP[f.sp];f.t+=dt;f.cd-=dt;f.burst=Math.max(0,f.burst-dt*1.1);
  if(f.sp==="medusa"){f.ph+=dt*2;f.y+=(-Math.max(0,Math.sin(f.ph))*38+9)*dt;f.x+=Math.sin(f.t*.3)*10*dt+f.d*4*dt;f.vx=f.d;f.vy=0;
   if(f.x<60||f.x>W-60)f.d*=-1;f.y=clamp(f.y,H*.1,H*.66);continue}
  const sp=s.spd*S*(.75+.25*Math.sin(f.t*.7+f.ph))*(1+f.burst*3.2);
  f.th=clamp(f.th+(R()-.5)*dt*2.2,-.55,.55);
  if(f.y<H*.1)f.th=.35;if(f.y>H*.66)f.th=-.35;
  const m=f.sp==="zralok"||f.sp==="rejnok"?120*S:70*S;
  if(f.x<m&&f.d<0)f.d=1;if(f.x>W-m&&f.d>0)f.d=-1;if(R()<dt*.03)f.d*=-1;
  f.vx=f.d*sp*Math.cos(f.th);f.vy=sp*Math.sin(f.th);f.x+=f.vx*dt;f.y+=f.vy*dt;
  f.face+=(f.d-f.face)*Math.min(1,dt*3.5);f.ph+=dt*(3+sp*.09);}
 for(const b of bub){b.y-=b.v*dt;if(b.y<-.02){b.y=1.02;b.x=R()}}
 for(const a of [fx,txt])for(let i=a.length-1;i>=0;i--){a[i].t+=dt;if(a[i].t>1)a.splice(i,1)}
 if(autoT>0){autoT-=dt;autoAcc+=dt;if(autoAcc>.45){autoAcc=0;const c=fish.filter(f=>f.cd<=0&&f.x>0&&f.x<W);if(c.length){const f=c[(R()*c.length)|0];tap(f.x,f.y,true)}}if(autoT<=0){autoT=0;hud()}}
}
function rad(f){const s=SP[f.sp],z=f.z*S;return f.sp==="medusa"?[s.L*.5*z,s.Hh*.5*z]:[s.L*.5*z,s.Hh*.55*z]}
function tap(x,y,auto){
 pointT=.4;px=x;py=y;let hit=null;
 for(const f of fish){if(f.cd>0)continue;const r=rad(f);if(((x-f.x)/r[0])**2+((y-f.y)/r[1])**2<1&&(!hit||f.z>=hit.z))hit=f}
 if(hit){streak++;hits++;best=Math.max(best,streak);const mult=Math.min(3,1+Math.floor(streak/5)*.1),g=Math.round(SP[hit.sp].v*mult);
  money+=g;if(window.vyEarn)vyEarn("akv",g);hit.cd=1.6;hit.burst=1;fx.push({x:hit.x,y:hit.y,t:0,c:"#fff"});txt.push({x:hit.x,y:hit.y,t:0,s:"+"+g,c:mult>1?"#ffd166":"#fff"});
  for(let i=0;i<5;i++)bub.push({x:hit.x/W+(R()-.5)*.03,y:hit.y/H+(R()-.5)*.03,r:1+R()*3,v:.06+R()*.06});save()}
 else if(!auto){if(streak>2)txt.push({x,y,t:0,s:"streak ztracen",c:"#ff8a8a"});streak=0;fx.push({x,y,t:0,c:"#7fd6ff"})}
 hud();
}
cv.addEventListener("pointerdown",e=>{const r=cv.getBoundingClientRect();tap(e.clientX-r.left,e.clientY-r.top,false)});
function hud(){
 const mult=Math.min(3,1+Math.floor(streak/5)*.1);
 $("money").textContent=money;$("streak").textContent="🔥 Streak: "+streak+(mult>1?"  ×"+mult.toFixed(1):"");
 $("stats").textContent="Trefeno celkem: "+hits+" · Rekord: "+best;
 $("auto").style.display=autoT>0?"block":"none";$("autoT").textContent="🤖 Auto-klik: "+Math.ceil(autoT)+" s";$("autoBar").style.width=Math.min(100,autoT/AUTO_SEC*100)+"%";
 const b=$("buy");b.textContent="Koupit za "+AUTO_COST+" 💰";b.disabled=money<AUTO_COST;$("shopMsg").textContent=autoT>0?"Aktivní ještě "+Math.ceil(autoT)+" s.":"";
}
$("shopB").onclick=()=>$("shop").classList.toggle("open");
$("buy").onclick=()=>{if(money>=AUTO_COST){money-=AUTO_COST;autoT+=AUTO_SEC;save();hud()}};
addEventListener("message",e=>{if(e.data&&typeof e.data.addMoney==="number"){money=Math.max(0,money+e.data.addMoney);save();hud()}});

/* ---------- admin panel (po zakoupení ve Vylepšení) ---------- */
const admOn=()=>window.vyHas&&vyHas("akv");
function admVis(){$("admB").style.display=admOn()?"block":"none";if(!admOn())$("adm").classList.remove("open")}
window.onVyChange=admVis;admVis();
$("admB").onclick=()=>$("adm").classList.toggle("open");
const admAdd=n=>{if(!admOn())return;money=Math.max(0,money+n);save();hud();$("aOut").textContent="Peníze: "+Math.round(money)};
$("aAdd").onclick=()=>admAdd(parseInt($("admNum").value,10)||0);
$("aSet").onclick=()=>admAdd((parseInt($("admNum").value,10)||0)-money);
$("aM1").onclick=()=>admAdd(1000);$("aM2").onclick=()=>admAdd(100000);

/* ---------- kreslení ---------- */
function bg(){
 let g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#0f7fb0");g.addColorStop(.5,"#0a4672");g.addColorStop(1,"#041a36");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 for(let i=0;i<5;i++){const x=W*(i*.22+.02)+Math.sin(T*.2+i)*30;ctx.globalAlpha=.05+.04*Math.sin(T*.5+i*1.7);ctx.fillStyle="#d6f6ff";
  ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+80,0);ctx.lineTo(x+80-W*.22,SAND);ctx.lineTo(x-W*.22-40,SAND);ctx.fill()}
 ctx.globalAlpha=1;
 for(const f of far){const x=((f.x+T*f.v)%(W+200))-100,y=H*f.y+Math.sin(T*.4+f.s*5)*10,l=70*f.s;ctx.fillStyle="#0a2c4e55";
  ctx.beginPath();ctx.ellipse(x,y,l,l*.28,0,0,TAU);ctx.moveTo(x-l*.8,y);ctx.lineTo(x-l*1.3,y-l*.3);ctx.lineTo(x-l*1.3,y+l*.3);ctx.fill()}
 g=ctx.createLinearGradient(0,SAND-20,0,FLOOR);g.addColorStop(0,"#d8c48e");g.addColorStop(1,"#8a7549");ctx.fillStyle=g;
 ctx.beginPath();ctx.moveTo(0,FLOOR);ctx.lineTo(0,SAND+10);ctx.bezierCurveTo(W*.25,SAND-30,W*.5,SAND+25,W*.75,SAND-10);ctx.quadraticCurveTo(W*.9,SAND-25,W,SAND+5);ctx.lineTo(W,FLOOR);ctx.fill();
 for(const d of deco){const y=SAND+10+Math.sin(d.x/W*6)*8,k=d.s*S,sw=Math.sin(T*.8+d.ph);
  if(d.t==="rock"){ctx.fillStyle="#3b4a57";ctx.beginPath();ctx.ellipse(d.x,y+4,34*k,20*k,0,0,TAU);ctx.fill();ctx.fillStyle="#56697a";ctx.beginPath();ctx.ellipse(d.x-6*k,y-2*k,22*k,11*k,0,0,TAU);ctx.fill()}
  else if(d.t==="weed"){for(let j=-1;j<2;j++){ctx.strokeStyle=["#2f9e5b","#47c97a","#1f7f49"][j+1];ctx.lineWidth=6*k;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(d.x+j*12,y);
   ctx.bezierCurveTo(d.x+j*12+sw*18*k,y-50*k,d.x+j*12-sw*18*k,y-100*k,d.x+j*12+sw*26*k,y-(130+j*20)*k);ctx.stroke()}}
  else{ctx.strokeStyle=d.c;ctx.lineCap="round";br(d.x,y,-Math.PI/2,46*k,4,sw,7*k)}}
}
function br(x,y,a,l,dp,sw,w){if(!dp)return;const x2=x+Math.cos(a)*l,y2=y+Math.sin(a)*l;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();br(x2,y2,a-.45+sw*.06,l*.72,dp-1,sw,w*.7);br(x2,y2,a+.45+sw*.06,l*.72,dp-1,sw,w*.7)}
function bony(f,s,L,Hh){
 const w=Math.sin(f.ph)*.28;
 ctx.save();ctx.translate(-L*.4,0);ctx.rotate(w);ctx.fillStyle=s.ct||s.c2;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-L*.12,-Hh*.2,-L*.3,-Hh*.5);ctx.quadraticCurveTo(-L*.18,0,-L*.3,Hh*.5);ctx.quadraticCurveTo(-L*.12,Hh*.2,0,0);ctx.fill();ctx.restore();
 ctx.fillStyle=s.c2;ctx.beginPath();ctx.moveTo(-L*.3,-Hh*.35);ctx.quadraticCurveTo(0,-Hh*.85,L*.22,-Hh*.4);ctx.fill();
 ctx.beginPath();ctx.moveTo(-L*.05,Hh*.4);ctx.quadraticCurveTo(-L*.12,Hh*.72,-L*.22,Hh*.4);ctx.fill();
 const g=ctx.createLinearGradient(0,-Hh/2,0,Hh/2);g.addColorStop(0,s.c2);g.addColorStop(.4,s.c1);g.addColorStop(1,s.c3);ctx.fillStyle=g;
 ctx.beginPath();ctx.moveTo(-L*.45,0);ctx.bezierCurveTo(-L*.2,-Hh*.62,L*.25,-Hh*.6,L*.5,-Hh*.05);ctx.bezierCurveTo(L*.52,Hh*.2,L*.3,Hh*.5,0,Hh*.5);ctx.bezierCurveTo(-L*.25,Hh*.5,-L*.4,Hh*.2,-L*.45,0);ctx.fill();
 ctx.save();ctx.clip();
 if(f.sp==="klaun")for(const x of [.3,-.02,-.32]){ctx.fillStyle="#111";ctx.fillRect(L*x-L*.07,-Hh,L*.14,Hh*2);ctx.fillStyle="#fff";ctx.fillRect(L*x-L*.045,-Hh,L*.09,Hh*2)}
 if(f.sp==="tang"){ctx.strokeStyle="#081a6b";ctx.lineWidth=Hh*.2;ctx.beginPath();ctx.moveTo(L*.3,-Hh*.3);ctx.bezierCurveTo(L*.1,-Hh*.4,-L*.05,Hh*.1,-L*.45,-Hh*.05);ctx.stroke()}
 if(f.sp==="motyl"){ctx.fillStyle="#1a1a1a";ctx.fillRect(L*.27,-Hh,L*.07,Hh*2);ctx.fillStyle="#f08a00";ctx.fillRect(-L*.1,-Hh,L*.05,Hh*2)}
 ctx.fillStyle="#ffffff30";ctx.beginPath();ctx.ellipse(0,-Hh*.25,L*.3,Hh*.12,0,0,TAU);ctx.fill();ctx.restore();
 ctx.fillStyle=s.c1+"cc";ctx.save();ctx.translate(L*.1,Hh*.12);ctx.rotate(Math.sin(f.ph*2)*.5);ctx.beginPath();ctx.ellipse(-L*.06,Hh*.08,L*.1,Hh*.12,.6,0,TAU);ctx.fill();ctx.restore();
 eye(L*.33,-Hh*.08,Hh*.12);
}
function eye(x,y,r){ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.fillStyle="#0a0a0a";ctx.beginPath();ctx.arc(x+r*.2,y,r*.6,0,TAU);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(x+r*.35,y-r*.25,r*.2,0,TAU);ctx.fill()}
function shark(f,L,Hh){
 const w=Math.sin(f.ph)*.22;
 ctx.save();ctx.translate(-L*.42,0);ctx.rotate(w);ctx.fillStyle="#536d86";ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-L*.1,-Hh*.3,-L*.24,-Hh*.85);ctx.quadraticCurveTo(-L*.17,-Hh*.1,-L*.22,0);ctx.quadraticCurveTo(-L*.14,Hh*.25,-L*.1,Hh*.4);ctx.quadraticCurveTo(-L*.05,Hh*.15,0,0);ctx.fill();ctx.restore();
 const g=ctx.createLinearGradient(0,-Hh/2,0,Hh/2);g.addColorStop(0,"#4c6680");g.addColorStop(.55,"#8ba6bd");g.addColorStop(.62,"#eef5fa");g.addColorStop(1,"#ffffff");ctx.fillStyle=g;
 ctx.beginPath();ctx.moveTo(-L*.45,0);ctx.bezierCurveTo(-L*.2,-Hh*.5,L*.2,-Hh*.5,L*.5,-Hh*.02);ctx.bezierCurveTo(L*.5,Hh*.08,L*.2,Hh*.45,-L*.05,Hh*.4);ctx.bezierCurveTo(-L*.3,Hh*.3,-L*.4,Hh*.1,-L*.45,0);ctx.fill();
 ctx.fillStyle="#4c6680";ctx.beginPath();ctx.moveTo(-L*.02,-Hh*.42);ctx.quadraticCurveTo(-L*.08,-Hh*.8,-L*.2,-Hh*.95);ctx.quadraticCurveTo(-L*.15,-Hh*.6,-L*.2,-Hh*.4);ctx.fill();
 ctx.beginPath();ctx.moveTo(L*.12,Hh*.3);ctx.quadraticCurveTo(L*.05,Hh*.8,-L*.12,Hh*.85);ctx.quadraticCurveTo(-L*.04,Hh*.5,-L*.08,Hh*.3);ctx.fill();
 ctx.strokeStyle="#33485e";ctx.lineWidth=1.5;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(L*.2-i*L*.03,-Hh*.1);ctx.lineTo(L*.19-i*L*.03,Hh*.12);ctx.stroke()}
 ctx.beginPath();ctx.moveTo(L*.48,Hh*.04);ctx.quadraticCurveTo(L*.35,Hh*.14,L*.26,Hh*.08);ctx.stroke();eye(L*.36,-Hh*.06,Hh*.05);
}
function ray(f,L,Hh){
 const a=Math.sin(f.t*1.6)*Hh*.35;
 ctx.strokeStyle="#3e5a78";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-L*.3,0);ctx.quadraticCurveTo(-L*.6,Math.sin(f.t*2)*8,-L*.85,Math.sin(f.t*2+1)*12);ctx.stroke();
 const g=ctx.createLinearGradient(0,-Hh/2,0,Hh/2);g.addColorStop(0,"#2c4a6b");g.addColorStop(1,"#9bb4cb");ctx.fillStyle=g;
 ctx.beginPath();ctx.moveTo(L*.5,0);ctx.bezierCurveTo(L*.25,-Hh*.2,-L*.05,-Hh*.5-a,-L*.3,-Hh*.6-a);ctx.quadraticCurveTo(-L*.25,-Hh*.1,-L*.32,0);ctx.quadraticCurveTo(-L*.25,Hh*.1,-L*.3,Hh*.6+a);ctx.bezierCurveTo(-L*.05,Hh*.5+a,L*.25,Hh*.2,L*.5,0);ctx.fill();
 ctx.fillStyle="#ffffff24";ctx.beginPath();ctx.ellipse(L*.05,0,L*.22,Hh*.12,0,0,TAU);ctx.fill();eye(L*.36,-Hh*.08,Hh*.05);eye(L*.36,Hh*.08,Hh*.05);
}
function medusa(f,L,Hh){
 const p=Math.sin(f.ph),bw=L*(1+p*.1),bh=Hh*.45*(1-p*.14);
 ctx.strokeStyle="#ff9de2aa";ctx.lineWidth=2;ctx.lineCap="round";
 for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(i*bw*.13,0);for(let k=1;k<=6;k++)ctx.lineTo(i*bw*.13+Math.sin(f.t*2-k*.8+i)*4,k*Hh*.09);ctx.stroke()}
 const g=ctx.createRadialGradient(0,-bh*.3,2,0,0,bw*.6);g.addColorStop(0,"#ffd6f6dd");g.addColorStop(1,"#a45cff88");ctx.fillStyle=g;
 ctx.beginPath();ctx.moveTo(-bw/2,0);ctx.bezierCurveTo(-bw/2,-bh*1.4,bw/2,-bh*1.4,bw/2,0);ctx.quadraticCurveTo(0,bh*.3,-bw/2,0);ctx.fill();
 ctx.fillStyle="#fff5";ctx.beginPath();ctx.ellipse(-bw*.15,-bh*.65,bw*.14,bh*.12,-.5,0,TAU);ctx.fill();
}
function drawFish(f){
 const s=SP[f.sp],z=f.z*S,L=s.L*z,Hh=s.Hh*z;
 ctx.save();ctx.translate(f.x,f.y);if(f.cd>0)ctx.globalAlpha=.8;
 if(f.sp==="medusa")medusa(f,L,Hh);
 else{ctx.rotate(Math.atan2(f.vy,Math.abs(f.vx)+.01)*f.face);ctx.scale(f.face,1);
  f.sp==="zralok"?shark(f,L,Hh):f.sp==="rejnok"?ray(f,L,Hh):bony(f,s,L,Hh)}
 ctx.restore();
}
function me(){
 const k=clamp(H*.27,100,200)/150,cx=W*.5,fy=FLOOR+(H-FLOOR)*.62,sw=Math.sin(T*1.3)*1.2;
 const tx=(px-cx)/k,ty=(py-fy)/k,ta=pointT>0?Math.atan2(ty+102,tx-22):1.35;armA+=(ta-armA)*.25;
 ctx.save();ctx.translate(cx,fy);ctx.scale(k,k);
 ctx.fillStyle="#0007";ctx.beginPath();ctx.ellipse(0,2,36,7,0,0,TAU);ctx.fill();
 ctx.fillStyle="#1b2b4b";ctx.fillRect(-15,-58,13,52);ctx.fillRect(2,-58,13,52);ctx.fillStyle="#0d1424";ctx.fillRect(-17,-8,17,8);ctx.fillRect(1,-8,17,8);
 ctx.translate(sw,0);
 ctx.fillStyle="#22508a";ctx.beginPath();ctx.ellipse(0,-112,17,9,0,0,TAU);ctx.fill();
 ctx.fillStyle="#2a64ad";ctx.beginPath();ctx.roundRect(-22,-110,44,58,11);ctx.fill();ctx.strokeStyle="#8fd6ff99";ctx.lineWidth=2;ctx.stroke();
 ctx.beginPath();ctx.roundRect(-31,-106,10,42,5);ctx.fill();ctx.fillStyle="#e8b894";ctx.beginPath();ctx.arc(-26,-62,5.5,0,TAU);ctx.fill();
 ctx.save();ctx.translate(22,-102);ctx.rotate(armA);ctx.strokeStyle="#2a64ad";ctx.lineWidth=10;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(34,0);ctx.stroke();
 ctx.fillStyle="#e8b894";ctx.beginPath();ctx.arc(38,0,5.5,0,TAU);ctx.fill();ctx.restore();
 ctx.fillStyle="#e8b894";ctx.beginPath();ctx.arc(0,-126,13,0,TAU);ctx.fill();ctx.fillStyle="#3a2a20";ctx.beginPath();ctx.arc(0,-128,14,Math.PI*.95,Math.PI*2.05);ctx.fill();ctx.fillRect(-13,-130,26,10);
 ctx.strokeStyle="#8fd6ff88";ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,-128,14,Math.PI*1.1,Math.PI*1.6);ctx.stroke();
 ctx.restore();
}
function frame(){
 bg();
 for(const f of [...fish].sort((a,b)=>a.z-b.z))drawFish(f);
 for(const b of bub){ctx.strokeStyle="#ffffff66";ctx.lineWidth=1;ctx.beginPath();ctx.arc(b.x*W+Math.sin(T+b.y*9)*4,b.y*H,b.r,0,TAU);ctx.stroke();ctx.fillStyle="#ffffff22";ctx.fill()}
 for(const e of fx){ctx.strokeStyle=e.c;ctx.globalAlpha=1-e.t;ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,10+e.t*50,0,TAU);ctx.stroke()}
 ctx.globalAlpha=1;ctx.font="800 22px system-ui,sans-serif";ctx.textAlign="center";
 for(const t of txt){ctx.globalAlpha=1-t.t;ctx.fillStyle="#000a";ctx.fillText(t.s,t.x+1,t.y-t.t*50+1);ctx.fillStyle=t.c;ctx.fillText(t.s,t.x,t.y-t.t*50)}
 ctx.globalAlpha=1;
 const v=ctx.createRadialGradient(W/2,H*.45,H*.3,W/2,H*.5,Math.max(W,H)*.75);v.addColorStop(0,"#0000");v.addColorStop(1,"#00081888");ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
 ctx.fillStyle="#ffffff0d";ctx.beginPath();ctx.moveTo(W*.1,0);ctx.lineTo(W*.22,0);ctx.lineTo(W*.05,FLOOR);ctx.lineTo(-W*.07,FLOOR);ctx.fill();
 ctx.fillStyle="#0a121a";ctx.fillRect(0,0,W,7);ctx.fillRect(0,0,6,FLOOR);ctx.fillRect(W-6,0,6,FLOOR);
 const fg=ctx.createLinearGradient(0,FLOOR,0,H);fg.addColorStop(0,"#26384a");fg.addColorStop(1,"#0a1118");ctx.fillStyle=fg;ctx.fillRect(0,FLOOR,W,H-FLOOR);
 ctx.fillStyle="#7fd6ff66";ctx.fillRect(0,FLOOR,W,2);ctx.fillStyle="#2f9bff22";ctx.beginPath();ctx.ellipse(W/2,FLOOR+(H-FLOOR)*.6,W*.3,(H-FLOOR)*.3,0,0,TAU);ctx.fill();
 me();
}
let last=performance.now();
function loop(n){const dt=Math.min(.05,(n-last)/1000);last=n;upd(dt);frame();if(Math.floor(n/250)!==Math.floor((n-dt*1000)/250))hud();requestAnimationFrame(loop)}
hud();requestAnimationFrame(loop);
