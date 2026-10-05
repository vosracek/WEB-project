const $=id=>document.getElementById(id),S=['🍒','🍋','🔔','⭐','💎','7️⃣','🃏'],N=7,L=42,MULT=[5,8,15,25,50,100],BETS=[10,50,100,500,1000];
let bal=1000,bi=0,spinning=false,bonus=false,free=0,clov,mt;
const pos=[0,0,0],reels=[...document.querySelectorAll('.reel')],fx=$('fx'),sleep=ms=>new Promise(r=>setTimeout(r,ms)),fmt=n=>n.toLocaleString('cs-CZ');
['b1','b2'].forEach(i=>$(i).innerHTML='<i></i>'.repeat(14));
reels.forEach((r,i)=>{let h='<div class="strip">';for(let k=0;k<L+3;k++)h+=`<div class="sym">${S[k%N]}</div>`;r.innerHTML=h+'</div>';pos[i]=Math.floor(Math.random()*N)});
const setPos=(r,p)=>{reels[r].firstChild.style.transform=`translateY(${-(p%L)*reels[r].clientHeight/3}px)`};
const setAll=()=>reels.forEach((_,i)=>setPos(i,pos[i]));setAll();addEventListener('resize',setAll);
function upd(){$('bal').textContent=fmt(bal)+' Kč';$('bet').textContent=BETS[bi];$('mach').classList.toggle('bonus',bonus);$('fbox').style.display=bonus?'block':'none';$('fr').textContent=free}
upd();
$('m').onclick=()=>{if(!bonus&&bi>0){bi--;upd()}};$('p').onclick=()=>{if(!bonus&&bi<BETS.length-1){bi++;upd()}};
function msg(h,ms=2600){const b=$('banner');b.innerHTML=h;b.classList.add('on');clearTimeout(mt);mt=setTimeout(()=>b.classList.remove('on'),ms)}
function spinTo(r,t,dur,travel){return new Promise(res=>{const p0=pos[r];let e=Math.ceil(p0+travel);while((e+1)%N!==t)e++;const t0=performance.now(),el=reels[r];el.firstChild.classList.add('fast');
(function f(now){const k=Math.min(1,(now-t0)/dur);setPos(r,p0+(e-p0)*(1-Math.pow(1-k,4)));if(k>.75)el.firstChild.classList.remove('fast');
if(k<1)requestAnimationFrame(f);else{pos[r]=e%L;setPos(r,pos[r]);res()}})(t0)})}
function outcome(){if(!bonus&&Math.random()<.03)return[6,6,6];
if(Math.random()<(bonus?.34:.17)){const w=[30,25,18,12,8,4];let x=Math.random()*97,i=0;while(x>w[i]){x-=w[i];i++}return[i,i,i]}
let a;do{a=[0,1,2].map(()=>Math.floor(Math.random()*N))}while(a[0]==a[1]&&a[1]==a[2]);return a}
async function pull(auto){if(spinning||(bonus&&!auto))return;const bet=BETS[bi];
if(!bonus){if(bal<bet){msg('Nedostatek peněz 💸<br><small style="font-size:40%">otevři admin panel</small>',1800);return}bal-=bet}
spinning=true;upd();document.querySelectorAll('.win').forEach(e=>e.classList.remove('win'));
$('lev').classList.add('pull');setTimeout(()=>$('lev').classList.remove('pull'),450);
const o=outcome();await Promise.all(o.map((s,i)=>spinTo(i,s,2200+i*800,30+i*14)));
const same=o[0]==o[1]&&o[1]==o[2];
if(same)reels.forEach((r,i)=>r.firstChild.children[(pos[i]+1)%L].classList.add('win'));
spinning=false;
if(same&&o[0]<6){const w=bet*MULT[o[0]];bal+=w;if(window.vyEarn)vyEarn("arc",w);celebrate(w)}
upd();if(same&&o[0]==6&&!bonus)startBonus()}
function celebrate(w){$('win').textContent=fmt(w);const t=w>=20000?'MEGA JACKPOT':w>=10000?'OBROVSKÁ VÝHRA':w>=5000?'VELKÁ VÝHRA':w>=2500?'SUPER VÝHRA':'VÝHRA';
msg(`${t}<br>${fmt(w)} Kč`,4000);w>=20000?tower():w>=10000?tanks():w>=5000?planes():coins(w>=2500?150:25)}
function tw(a){bal+=a;upd();celebrate(a)}function addM(a){bal+=a||0;upd()}
async function startBonus(){if(bonus)return;bonus=true;free=10;upd();msg('🃏 BONUS! 🃏<br>10× zdarma<br><small style="font-size:45%">2× větší šance na výhru 🍀</small>',3200);clov=setInterval(clover,110);await sleep(3400);
while(free>0){while(spinning)await sleep(200);free--;upd();await pull(true);await sleep(2200)}
clearInterval(clov);bonus=false;upd();msg('Bonus skončil',2500)}
$('lev').onclick=()=>pull(false);
addEventListener('keydown',e=>{if(e.code==='Space'&&e.target.tagName!=='INPUT'){e.preventDefault();pull(false)}});
const cv=document.createElement('canvas');cv.style.cssText='position:absolute;inset:0;width:100%;height:100%';fx.appendChild(cv);
const g=cv.getContext('2d'),R=Math.random,rr=(a,b)=>a+R()*(b-a),TAU=Math.PI*2;let P=[],run=0,last=0,W=0,H=0;
function sz(){const d=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*d;cv.height=H*d;g.setTransform(d,0,0,d,0,0)}sz();addEventListener('resize',sz);
function add(p){P.push(Object.assign({x:0,y:0,vx:0,vy:0,r:0,vr:0,g:0,t:0,life:5,s:1,z:0},p));if(!run){run=1;last=performance.now();requestAnimationFrame(loop)}}
function loop(n){const dt=Math.min(.05,(n-last)/1000);last=n;g.clearRect(0,0,W,H);
P.forEach(p=>{p.t+=dt;p.upd&&p.upd(p,dt);p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=p.vr*dt});
P=P.filter(p=>p.t<p.life&&!(p.y>H+260&&p.vy>0)&&p.x>-520&&p.x<W+520);
P.sort((a,b)=>a.z-b.z).forEach(p=>{g.save();g.translate(p.x,p.y);g.rotate(p.r);g.scale(p.s,p.s);g.globalAlpha=Math.min(1,(p.life-p.t)*2.5);p.d(p);g.restore()});
if(P.length)requestAnimationFrame(loop);else{run=0;g.clearRect(0,0,W,H)}}
const KS=()=>Math.min(1,W/720);
/* ---- grafika ---- */
function bundle(){for(let i=4;i>0;i--){g.fillStyle=i%2?'#14532b':'#1d7a3f';g.fillRect(-60,-30+i*3,120,60)}
g.fillStyle='#47c576';g.fillRect(-60,-30,120,60);g.strokeStyle='#c8f7d8';g.lineWidth=2;g.strokeRect(-52,-23,104,46);
g.fillStyle='#2b9a55';g.beginPath();g.arc(-32,0,14,0,TAU);g.fill();g.beginPath();g.arc(32,0,14,0,TAU);g.fill();
g.fillStyle='#0f4a25';g.font='900 20px Impact,sans-serif';g.textAlign='center';g.fillText('$',-32,7);g.fillText('$',32,7);
g.fillStyle='#f3efdc';g.fillRect(-11,-31,22,62);g.fillStyle='#d83a3a';g.fillRect(-11,-3,22,6)}
function bill(){g.fillStyle='#2b8a4a';g.fillRect(-23,-11,46,22);g.strokeStyle='#b8f0c8';g.lineWidth=1.5;g.strokeRect(-19,-7,38,14);g.fillStyle='#1c6b38';g.beginPath();g.arc(0,0,6,0,TAU);g.fill()}
function coin(p){g.scale(Math.max(.12,Math.abs(Math.cos(p.t*p.w+p.ph))),1);const k=p.k,q=g.createRadialGradient(-k*.3,-k*.3,1,0,0,k);q.addColorStop(0,'#fff6b0');q.addColorStop(.6,'#ffc400');q.addColorStop(1,'#b8860b');g.fillStyle=q;g.beginPath();g.arc(0,0,k,0,TAU);g.fill();g.strokeStyle='#8a6500';g.lineWidth=2;g.stroke();g.beginPath();g.arc(0,0,k*.66,0,TAU);g.stroke()}
function clv(){g.fillStyle='#22b85a';g.strokeStyle='#138a40';g.lineWidth=1.5;for(let k=0;k<4;k++){g.save();g.rotate(k*Math.PI/2+Math.PI/4);g.beginPath();g.moveTo(0,0);g.bezierCurveTo(-16,-8,-18,-32,0,-22);g.bezierCurveTo(18,-32,16,-8,0,0);g.fill();g.beginPath();g.moveTo(0,-2);g.lineTo(0,-18);g.stroke();g.restore()}g.lineWidth=3;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(10,24,4,38);g.stroke()}
const puff=x=>add({x:x[0],y:x[1],vx:rr(-20,20),vy:rr(-12,12),life:1.3,z:1,d:p=>{g.fillStyle='rgba(240,240,250,'+.45*(1-p.t/p.life)+')';g.beginPath();g.arc(0,0,7+p.t*26,0,TAU);g.fill()}});
const spark=(x,y,a,v,c,gr=260)=>add({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:gr,life:1.5,z:6,c,d:p=>{g.fillStyle=p.c;g.beginPath();g.arc(0,0,3.2,0,TAU);g.fill()}});
const drop=(x,y,vx,big=1)=>add({x,y,vx,vy:rr(-30,50),g:560,r:rr(-.6,.6),vr:rr(-2.5,2.5),s:rr(.55,1.05)*big*KS(),life:7,z:4,d:bundle});
const flutter=(x,y)=>add({x,y,vx:rr(-90,90),vy:rr(-40,30),g:150,r:rr(0,6),vr:rr(-5,5),s:rr(.8,1.3)*KS(),life:6,z:3,d:bill});
/* ---- letadla ---- */
const PL={
jet(c){g.fillStyle='#ffa53b';g.beginPath();g.moveTo(-92,0);g.lineTo(-126-R()*26,-4);g.lineTo(-126-R()*26,4);g.fill();
g.fillStyle=c[1];g.beginPath();g.moveTo(-70,-10);g.lineTo(-104,-46);g.lineTo(-88,-46);g.lineTo(-44,-10);g.fill();g.beginPath();g.moveTo(25,4);g.lineTo(-38,44);g.lineTo(-62,44);g.lineTo(-30,4);g.fill();
g.fillStyle=c[0];g.beginPath();g.moveTo(118,5);g.quadraticCurveTo(80,-16,20,-16);g.lineTo(-96,-9);g.lineTo(-96,9);g.lineTo(20,13);g.quadraticCurveTo(80,14,118,5);g.fill();
g.fillStyle=c[2];g.fillRect(-30,-10,12,19);g.fillStyle='#8fe0ff';g.beginPath();g.ellipse(52,-13,24,8,0,Math.PI,0);g.fill()},
prop(c,t){g.fillStyle=c[1];g.beginPath();g.moveTo(-80,-4);g.lineTo(-106,-32);g.lineTo(-92,-32);g.lineTo(-62,-4);g.fill();
g.fillStyle=c[0];g.beginPath();g.moveTo(84,0);g.quadraticCurveTo(70,-20,20,-18);g.lineTo(-90,-5);g.lineTo(-90,5);g.lineTo(20,16);g.quadraticCurveTo(70,18,84,6);g.fill();
g.fillStyle=c[1];g.fillRect(-28,-52,84,9);g.fillRect(-34,16,92,9);g.strokeStyle='#553';g.lineWidth=3;g.beginPath();g.moveTo(-14,-44);g.lineTo(-18,16);g.moveTo(42,-44);g.lineTo(46,16);g.stroke();
g.fillStyle='#ffe6a0';g.beginPath();g.arc(0,-18,11,Math.PI,0);g.fill();g.fillStyle='#222';g.beginPath();g.arc(30,32,8,0,TAU);g.fill();g.fillRect(84,-4,8,8);
g.fillStyle='#ffffff66';g.beginPath();g.ellipse(94,0,4+Math.abs(Math.sin(t*50))*4,30,0,0,TAU);g.fill()},
liner(c){g.fillStyle=c[1];g.beginPath();g.moveTo(-120,-10);g.lineTo(-152,-62);g.lineTo(-130,-62);g.lineTo(-84,-10);g.fill();
g.fillStyle='#b9c4d2';g.beginPath();g.moveTo(40,8);g.lineTo(-40,58);g.lineTo(-64,58);g.lineTo(-22,8);g.fill();g.fillStyle='#7f8b9a';g.beginPath();g.roundRect(-16,36,40,16,8);g.fill();
g.fillStyle=c[0];g.beginPath();g.moveTo(150,6);g.quadraticCurveTo(140,-22,100,-22);g.lineTo(-130,-14);g.lineTo(-150,-4);g.lineTo(-130,14);g.lineTo(100,18);g.quadraticCurveTo(140,18,150,6);g.fill();
g.fillStyle=c[1];g.fillRect(-120,3,250,5);g.fillStyle='#8fd0ff';for(let i=0;i<14;i++)g.fillRect(-100+i*15,-10,7,7);g.beginPath();g.moveTo(118,-16);g.lineTo(138,-14);g.lineTo(128,-7);g.lineTo(112,-7);g.fill()}};
const COL=[['#d9342b','#f2f2f2','#ffd23f'],['#ffd23f','#c0392b','#fff'],['#f5f7fa','#1f5fbf','#fff'],['#2d8a4f','#e8d9a0','#fff'],['#2f7fd9','#fff','#ffd23f']];
function planes(n=6){for(let i=0;i<n;i++)setTimeout(()=>{const dir=i%2?-1:1,ty=['jet','prop','liner'][i%3],k=KS()*rr(.8,1.1),c=COL[i%COL.length];
add({x:dir>0?-300:W+300,y:H*(.08+(i*.13)%.55),vx:dir*rr(260,420),s:k,life:10,z:5,dir,ty,c,tb:0,tp:0,d:p=>{g.scale(p.dir,1);g.translate(0,Math.sin(p.t*3+i)*3);PL[p.ty](p.c,p.t)},
upd:(p,dt)=>{p.tb-=dt;p.tp-=dt;if(p.tp<=0){p.tp=.05;puff([p.x-p.dir*130*p.s,p.y])}if(p.tb<=0){p.tb=.4;drop(p.x,p.y+26*p.s,p.vx*.6,1.1);if(R()<.6)flutter(p.x,p.y+20*p.s)}}})},i*650)}
/* ---- tanky ---- */
function tanks(){for(let i=0;i<4;i++)setTimeout(()=>{const dir=i%2?-1:1,k=KS()*(1-i*.04);
add({x:dir>0?-220:W+220,y:H-52-(i%2)*6,vx:dir*rr(110,150),s:k,life:14,z:2+i%2,dir,ft:.3,rec:0,d:p=>{g.scale(p.dir,1);
g.fillStyle='#1c1c1c';g.beginPath();g.roundRect(-80,8,160,32,16);g.fill();
for(let j=0;j<5;j++){const x=-56+j*28,a=p.t*7;g.fillStyle='#555';g.beginPath();g.arc(x,24,10,0,TAU);g.fill();g.strokeStyle='#aaa';g.lineWidth=2;g.beginPath();g.moveTo(x,24);g.lineTo(x+Math.cos(a)*8,24+Math.sin(a)*8);g.stroke()}
g.fillStyle='#4a6536';g.beginPath();g.moveTo(-74,10);g.lineTo(-58,-14);g.lineTo(62,-14);g.lineTo(78,10);g.fill();g.fillStyle='#ffffff22';g.fillRect(-56,-14,116,5);
g.fillStyle='#3a4a2a';g.fillRect(24-p.rec,-31,74,9);g.fillRect(96-p.rec,-33,9,13);
g.fillStyle='#5d7d43';g.beginPath();g.roundRect(-30,-40,64,28,11);g.fill();g.fillStyle='#ffd23f';g.beginPath();g.arc(-8,-26,6,0,TAU);g.fill();
if(p.rec>9){g.fillStyle='#ffd27a';g.beginPath();g.moveTo(106,-27);g.lineTo(140,-44);g.lineTo(128,-27);g.lineTo(142,-12);g.fill()}},
upd:(p,dt)=>{p.rec*=.86;p.ft-=dt;if(p.ft<=0){p.ft=rr(.55,.85);p.rec=16;const mx=p.x+p.dir*104*p.s,my=p.y-27*p.s;puff([mx,my]);
add({x:mx,y:my,vx:p.dir*rr(240,560),vy:-rr(560,860),g:900,r:rr(0,6),vr:rr(-7,7),s:rr(.5,.85)*KS(),life:7,z:4,d:bundle})}}})},i*700);
rain(26,4500)}
function rain(n,ms){for(let i=0;i<n;i++)setTimeout(()=>{add({x:rr(0,W),y:-80,vx:rr(-40,40),vy:rr(120,300),g:320,r:rr(0,6),vr:rr(-3,3),s:rr(.5,1)*KS(),life:8,z:3,d:bundle});if(R()<.5)flutter(rr(0,W),-30)},i*ms/n)}
/* ---- mince, mrakodrap, jetel ---- */
function coins(n){const m=$('mach').getBoundingClientRect(),cx=m.left+m.width/2,cy=m.top+m.height*.5;
for(let i=0;i<n;i++){const up=i%2&&n>=25,k=rr(10,22);add({x:up?cx:rr(0,W),y:up?cy:-rr(40,1300),vx:up?rr(-420,420):rr(-30,30),vy:up?-rr(500,1000):rr(40,200),g:up?1300:600,w:rr(6,12),ph:R()*6,k:k*(KS()*.4+.6),r:rr(0,6),vr:rr(-3,3),life:6,z:1,d:coin})}
if(n>=100){rain(10,2500);for(let i=0;i<12;i++)flutter(cx+rr(-80,80),cy)}else for(let i=0;i<6;i++)flutter(cx+rr(-60,60),cy)}
function boom(x,y){const c=['#ffd23f','#ff5d8f','#57e6ff','#7dff6b','#fff'][(R()*5)|0];for(let i=0;i<46;i++)spark(x,y,R()*TAU,rr(120,380),c)}
function tower(){const N=30;add({x:W/2,y:H,life:10,z:2,s:Math.min(1.15,H/760),d:p=>{const n=Math.min(N,Math.floor(p.t*8));
for(let i=0;i<n;i++){const w=170-i*3.4,y=-(i+1)*24;const q=g.createLinearGradient(-w/2,0,w/2,0);q.addColorStop(0,'#b8860b');q.addColorStop(.5,'#ffe27a');q.addColorStop(1,'#a8740a');g.fillStyle=q;g.fillRect(-w/2,y,w,24);g.strokeStyle='#6b4a00';g.lineWidth=1;g.strokeRect(-w/2,y,w,24);
for(let j=0;j<6;j++){g.fillStyle=Math.sin(p.t*3+i*j)>-.3?'#fff8c4':'#6b5a20';g.fillRect(-w/2+8+j*(w-16)/6,y+6,(w-16)/6-6,12)}}
if(n>=N){g.fillStyle='#ffd34d';g.beginPath();g.moveTo(-10,-N*24);g.lineTo(0,-N*24-90);g.lineTo(10,-N*24);g.fill();g.fillStyle=Math.sin(p.t*8)>0?'#f22':'#611';g.beginPath();g.arc(0,-N*24-94,5,0,TAU);g.fill()}}});
for(let i=0;i<22;i++)setTimeout(()=>boom(rr(.1,.9)*W,rr(.08,.42)*H),1800+i*330);
setTimeout(()=>{planes(6);rain(40,5000);coins(120)},N*130)}
function clover(){const s=R()<.4;add({x:s?-50:rr(0,W),y:s?rr(0,H):-50,vx:s?rr(90,200):rr(-60,60),vy:s?rr(-30,60):rr(90,200),r:0,vr:rr(-3,3),s:rr(.6,1.5),life:9,z:1,d:clv})}

const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
$('bub').onclick=()=>{if(window.vyHas&&vyHas('arc')){$('bbox').classList.remove('on');$('admin').classList.toggle('on');return}$('bbox').classList.toggle('on');$('pw').focus()};
$('pw').onkeydown=e=>{if(e.key!=='Enter')return;const ok=norm(e.target.value)==='perofacky';e.target.value='';
if(ok){$('bbox').classList.remove('on');$('admin').classList.add('on')}else e.target.placeholder='Zpráva odeslána 🙂'};