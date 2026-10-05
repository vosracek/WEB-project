"use strict";
/* ===== Ztroskotanec – příběhová hra (SVG scény + WebAudio zvuky) ===== */
const $=id=>document.getElementById(id);
let fl={},cur=null,typT=null,muted=false,uid=0,found=[],t0=0;
try{found=JSON.parse(localStorage.getItem("ost_end")||"[]")}catch(e){}

/* ---------- ZVUK ---------- */
let AC,MG,NB,ambN=[],ambT=[];
function audio(){
  if(AC)return;
  AC=new(window.AudioContext||window.webkitAudioContext)();
  MG=AC.createGain();MG.gain.value=.7;MG.connect(AC.destination);
  NB=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);
  const d=NB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
}
function nz(){const s=AC.createBufferSource();s.buffer=NB;s.loop=true;s.start();return s}
function env(g,v,a,dur){g.gain.setValueAtTime(0,AC.currentTime);g.gain.linearRampToValueAtTime(v,AC.currentTime+a);g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+dur)}
function tone(f1,f2,dur,v,type){
  const o=AC.createOscillator(),g=AC.createGain();o.type=type||"sine";
  o.frequency.setValueAtTime(f1,AC.currentTime);o.frequency.exponentialRampToValueAtTime(f2,AC.currentTime+dur);
  env(g,v,.01,dur);o.connect(g);g.connect(MG);o.start();o.stop(AC.currentTime+dur+.05);
}
function burst(freq,dur,v){
  const s=AC.createBufferSource();s.buffer=NB;const f=AC.createBiquadFilter(),g=AC.createGain();
  f.type="lowpass";f.frequency.value=freq;env(g,v,.005,dur);s.connect(f);f.connect(g);g.connect(MG);s.start(0,Math.random());s.stop(AC.currentTime+dur+.1);
}
const SFX={
  shot(){if(!AC||muted)return;burst(2500,.5,1);tone(160,35,.35,.9,"triangle");setTimeout(()=>burst(700,1.2,.25),120)},
  thunder(){if(!AC||muted)return;burst(300,2.5,.9);tone(70,30,2,.4,"sawtooth")},
  thud(){if(!AC||muted)return;tone(120,50,.2,.8);burst(400,.15,.4)},
  squeal(){if(!AC||muted)return;tone(900,300,.4,.3,"sawtooth")},
  horn(){if(!AC||muted)return;tone(130,125,2.2,.4,"sawtooth");tone(196,190,2.2,.25,"sawtooth")},
  win(){if(!AC||muted)return;[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,f,.9,.25,"triangle"),i*220))},
  lose(){if(!AC||muted)return;[392,349,311,262].forEach((f,i)=>setTimeout(()=>tone(f,f*.98,1,.25,"triangle"),i*350))}
};
function bird(){if(!AC||muted)return;const n=1+Math.random()*3|0,b=1800+Math.random()*1800;
  for(let i=0;i<n;i++)setTimeout(()=>tone(b,b*1.6,.12,.12),i*140)}
const AMB={
  waves(v){const n=nz(),f=AC.createBiquadFilter(),g=AC.createGain(),l=AC.createOscillator(),lg=AC.createGain();
    f.type="lowpass";f.frequency.value=600;g.gain.value=v*.25;l.frequency.value=.13;lg.gain.value=v*.2;
    l.connect(lg);lg.connect(g.gain);l.start();n.connect(f);f.connect(g);g.connect(MG);ambN.push(n,l)},
  storm(){AMB.waves(1.6);const n=nz(),f=AC.createBiquadFilter(),g=AC.createGain();f.type="bandpass";f.frequency.value=1200;g.gain.value=.25;
    n.connect(f);f.connect(g);g.connect(MG);ambN.push(n);ambT.push(setInterval(()=>Math.random()<.5&&SFX.thunder(),6000))},
  birds(){ambT.push(setInterval(bird,1400))},
  drums(r){ambT.push(setInterval(()=>{if(AC&&!muted){tone(95,45,.25,.7);setTimeout(()=>tone(110,50,.2,.5),r*.5)}},r))},
  fire(){const n=nz(),f=AC.createBiquadFilter(),g=AC.createGain();f.type="highpass";f.frequency.value=3000;g.gain.value=.06;
    n.connect(f);f.connect(g);g.connect(MG);ambN.push(n);ambT.push(setInterval(()=>AC&&!muted&&burst(5000,.05,.25),260))},
  night(){ambT.push(setInterval(()=>AC&&!muted&&tone(4200,4300,.08,.05),420))}
};
function setAmb(list){
  ambN.forEach(n=>{try{n.stop()}catch(e){}});ambN=[];ambT.forEach(clearInterval);ambT=[];
  if(!AC)return;(list||[]).forEach(a=>{const[k,p]=a.split(":");AMB[k](p?+p:1)})
}
$("snd").onclick=()=>{muted=!muted;$("snd").textContent=muted?"🔇":"🔊";if(AC)MG.gain.value=muted?0:.7};

/* ---------- KRESLENÍ ---------- */
const SK=(a,b)=>{const i="g"+uid++;return`<defs><linearGradient id="${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="800" height="450" fill="url(#${i})"/>`};
const WV=(y,c,o=1,s=6)=>`<g class="wv" style="animation-duration:${s}s"><path d="M-100 ${y}${"q25 -10 50 0 t50 0 ".repeat(18)}V460H-100Z" fill="${c}" opacity="${o}"/></g>`;
const SUN=(x,y,r,c)=>`<circle class="glow" cx="${x}" cy="${y}" r="${r*2}" fill="${c}" opacity=".25"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
const CL=(y,c="#fff",o=.85)=>`<g class="cl" opacity="${o}" fill="${c}"><ellipse cx="0" cy="${y}" rx="70" ry="18"/><ellipse cx="40" cy="${y-12}" rx="45" ry="16"/><ellipse cx="-40" cy="${y-8}" rx="35" ry="13"/></g>`;
const STARS=()=>Array.from({length:45},(_,i)=>`<circle class="tw" style="animation-delay:${i%7*.3}s" cx="${(i*97)%800}" cy="${(i*53)%230}" r="${i%3?1:1.8}" fill="#fff"/>`).join("");
const MOON=()=>`<circle cx="650" cy="80" r="70" fill="#cfe0ff" opacity=".12"/><circle cx="650" cy="80" r="34" fill="#f4f1de"/><circle cx="638" cy="72" r="6" fill="#d9d4bd"/>`;
const PALM=(x,y,s=1,c="#2f9e44",tr="#6b4423")=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0Q14 -60 4 -125" stroke="${tr}" stroke-width="10" fill="none" stroke-linecap="round"/><g class="sway" style="transform-origin:4px -125px;transform-box:view-box"><g fill="${c}"><path d="M4-125Q-40-160-90-105Q-40-130 4-125Z"/><path d="M4-125Q45-165 95-108Q45-133 4-125Z"/><path d="M4-125Q-25-185-60-170Q-15-158 4-125Z"/><path d="M4-125Q32-185 68-168Q22-158 4-125Z"/></g><circle cx="0" cy="-122" r="5" fill="#5a3a1a"/><circle cx="9" cy="-120" r="5" fill="#5a3a1a"/></g></g>`;
const MAN=(x,y,s=1,f=1)=>`<g transform="translate(${x} ${y}) scale(${f*s} ${s})"><rect x="-8" y="-14" width="7" height="15" fill="#3b4a6b"/><rect x="1" y="-14" width="7" height="15" fill="#3b4a6b"/><rect x="-10" y="-40" width="20" height="28" rx="7" fill="#c0463b"/><path d="M-10 -22l-6 14M10 -22l6 14" stroke="#f2c79b" stroke-width="5" stroke-linecap="round"/><circle cy="-50" r="10" fill="#f2c79b"/><path d="M-11 -53q11 -16 22 0z" fill="#4a3220"/></g>`;
const NAT=(x,y,s=1,f=1)=>`<g transform="translate(${x} ${y}) scale(${f*s} ${s})"><g class="run"><rect x="-8" y="-14" width="7" height="15" fill="#6b3d1f"/><rect x="1" y="-14" width="7" height="15" fill="#6b3d1f"/><path d="M-11 -16h22l-3 10h-16z" fill="#3a8f3a"/><rect x="-9" y="-40" width="18" height="26" rx="6" fill="#8a5028"/><path d="M-9 -28l-8 -10M9 -28l14 -16" stroke="#8a5028" stroke-width="5" stroke-linecap="round"/><path d="M23 -70V6" stroke="#4a3018" stroke-width="3"/><path d="M23 -70l-4 -12 8 0z" fill="#ddd"/><circle cy="-50" r="10" fill="#8a5028"/><path d="M-5 -52h10M-4 -47h8" stroke="#f7e07a" stroke-width="2"/><path d="M-10 -58l-4 -18 6 12 3 -16 3 16 6 -12 -4 18z" fill="#e63946"/><path d="M-3 -58l0 -20 4 18z" fill="#f4d35e"/></g></g>`;
const BOAR=(x,y,s=1,dead=0)=>`<g transform="translate(${x} ${y}) scale(${s})"><g class="${dead?"dead":"snort"}"><rect x="-38" y="-18" width="9" height="20" fill="#2e2018"/><rect x="22" y="-18" width="9" height="20" fill="#2e2018"/><ellipse cx="0" cy="-32" rx="46" ry="28" fill="#4a3426"/><path d="M-30 -52l8 -12 8 12 8 -12 8 12 8 -12 8 12" stroke="#2e2018" stroke-width="4" fill="none"/><circle cx="-44" cy="-30" r="17" fill="#5a4030"/><ellipse cx="-58" cy="-26" rx="8" ry="7" fill="#c98a7a"/><path d="M-52 -20q-8 8 -14 -2" stroke="#fff" stroke-width="3" fill="none"/><circle cx="-47" cy="-38" r="2.5" fill="#fff"/><path d="M-36 -44l-4 -12 10 6z" fill="#3a2a1e"/></g></g>`;
const FIRE=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><circle cy="-30" r="70" fill="#ff8c1a" opacity=".18" class="glow"/><path d="M-30 0l60 -10M-30 -10l60 10" stroke="#5a3418" stroke-width="9" stroke-linecap="round"/><path class="fl" d="M-18 -8Q-26 -40 0 -62Q-4 -36 18 -8Z" fill="#ff6a00"/><path class="fl" style="animation-delay:.1s" d="M-10 -8Q-14 -30 2 -46Q4 -28 12 -8Z" fill="#ffc300"/><path class="fl" style="animation-delay:.2s" d="M-4 -8Q-4 -20 2 -28Q6 -18 6 -8Z" fill="#fff3a0"/></g>`;
const SHIP=(c="#6b3d1f")=>`<path d="M-110 0H110L85 45H-85Z" fill="${c}"/><path d="M-110 0H110L106 9H-106Z" fill="#a0642f"/><rect x="-50" y="-30" width="55" height="30" fill="#c9a36a"/><rect x="-40" y="-22" width="12" height="12" fill="#2b4a6b"/><rect x="-20" y="-22" width="12" height="12" fill="#2b4a6b"/><path d="M40 0V-130" stroke="#3b2a1a" stroke-width="5"/><path d="M42 -125Q95 -85 42 -20Z" fill="#eee"/><path d="M38 -125Q-5 -90 38 -25Z" fill="#ddd"/><path d="M40 -130l30 8 -30 8z" fill="#c1121f"/>`;
const SAND=(c="#e8c98a")=>`<path d="M0 380Q300 340 520 365T800 350V450H0Z" fill="${c}"/><path d="M0 395Q300 360 520 385T800 372V450H0Z" fill="#00000012"/>`;
const HILLS=(c1,c2)=>`<path d="M0 300Q120 210 260 290T520 270T800 300V450H0Z" fill="${c1}"/><path d="M0 340Q200 270 400 330T800 320V450H0Z" fill="${c2}"/>`;
const GULL=n=>Array.from({length:n},(_,i)=>`<g class="fly" style="animation-delay:-${i*5}s;animation-duration:${14+i*3}s"><path d="M0 ${60+i*25}q8 -9 16 0q8 -9 16 0" stroke="#fff" stroke-width="2.5" fill="none"/></g>`).join("");
const JUNGLE=()=>SK("#2f6b3a","#0f2a18")+`<g opacity=".35"><path d="M120 0L220 450H60Z M520 0L640 450H430Z" fill="#fff6b0"/></g>`+[40,200,330,560,700,780].map((x,i)=>PALM(x,470,1.7+i%2*.4,"#1f7a34","#3e2a16")).join("")+`<rect y="380" width="800" height="70" fill="#1a3a1e"/><g stroke="#2d7a3a" stroke-width="3" fill="none"><path d="M150 0q-20 80 10 160M450 0q30 90 -8 170M640 0q-30 70 4 140"/></g>`;
const NIGHT=()=>SK("#050a1c","#14284a")+STARS()+MOON()+WV(300,"#0b1f3d",.9,9)+SAND("#4d4636");
const SEA=(a,b)=>SK(a,b);

/* ---------- SCÉNY ---------- */
const nat3=()=>[0,1,2].map(i=>`<g class="come" style="--dx:${500+i*90}px;animation-delay:${i*.3}s">${NAT(560-i*70,400+i*8,1.5,-1)}</g>`).join("");
const S={
intro:{amb:["storm"],rain:1,
 art:()=>SK("#2a3550","#0a1020")+CL(70,"#333b50",.9)+CL(120,"#2a3145",.9)+WV(300,"#14304f",1,4)+`<g class="sail"><g transform="translate(300 285)"><g class="sinkG" id="shipS"><g class="rock">${SHIP()}</g></g></g></g>`+WV(335,"#0c2038",1,3)+WV(380,"#08162a",1,2.2),
 on(){setTimeout(()=>{flash();SFX.thunder()},2500);setTimeout(()=>{flash();SFX.thunder()},7000);
  setTimeout(()=>{const s=$("shipS");if(s)s.classList.add("sink")},10000)},
 t:"Bouře trhá palubu na kusy. Loď Mořská víla narazila na útes a těžce se naklání. Kapitán křičí rozkazy, ale vítr je přehlušuje. Voda ti sahá po kolena a v dešti je vidět jen tmavý stín ostrova.",
 ch:[["Skočit do rozbouřeného moře","beach"],["Chytit se prkna a plout","beach",{plank:1}]]},
beach:{amb:["waves","birds"],
 art:()=>SEA("#ffcf99","#6fd0f0")+SUN(620,120,38,"#fff3a6")+CL(90)+GULL(3)+WV(250,"#3aa5cc",.8,9)+WV(275,"#2a86b5",.9,6)+SAND()+PALM(90,400,1.3)+PALM(720,395,1.6)+`<g transform="translate(330 400) rotate(-90)">${MAN(0,0,1.3)}</g><path d="M470 395l40 -10 30 12z" fill="#7a4a22"/><rect x="560" y="388" width="46" height="8" rx="3" fill="#8a5a2c"/>`,
 t:"Probudíš se na teplém písku. Slaná chuť na rtech, hukot vln, nikde ani živáčka. Moře vyplavilo kusy vraku a ty víš, že bez jídla a vody dlouho nevydržíš.",
 ch:[["Prohledat vrak na břehu","wreck"],["Vydat se do džungle","jungle"]]},
wreck:{amb:["waves","birds"],
 art:()=>SEA("#ffc98a","#6fd0f0")+SUN(150,140,36,"#fff3a6")+CL(100)+WV(255,"#3aa5cc",.8,9)+WV(280,"#2a86b5",.9,6)+SAND()+`<g transform="translate(430 380) rotate(-12)">${SHIP("#4b2c14")}</g>`+MAN(250,410,1.4)+PALM(740,395,1.5),
 t:"V rozbité kajutě najdeš starou pušku, tři náboje a láhev vody. Zbraň je těžká a mokrá, ale funguje. Z džungle se ozve ptačí křik, skoro jako by ti někdo odpovídal.",
 set:{gun:1},ch:[["Jít do džungle","jungle"]]},
jungle:{amb:["birds","waves:.3"],
 art:()=>JUNGLE()+BOAR(520,420,1.8)+MAN(180,430,1.8),
 t:"Džungle je hustá a plná křiku ptáků. Na mýtině stojí divoký kanec. Znamená jídlo na několik dní, ale je to i nebezpečný protivník s ostrými kly.",
 ch:[["Zabít kance","hunt"],["Ustoupit a hledat ovoce","fruit"]]},
hunt:{amb:["birds:.5"],
 art:()=>JUNGLE()+BOAR(540,425,1.8,1)+MAN(260,430,1.8),
 on(){if(fl.gun){setTimeout(()=>{SFX.shot();flash()},1200);setTimeout(SFX.squeal,1500)}else{setTimeout(SFX.thud,1500);setTimeout(SFX.squeal,1700)}},
 t:()=>fl.gun?"Opřeš pušku o rameno, zadržíš dech a vystřelíš. Výstřel vyplaší všechny ptáky široko daleko a kanec padne. Máš maso na několik dní. Jenže ten rachot se musel nést celým ostrovem.":"Sevřeš oštěp z ostré větve a zaútočíš. Po zoufalém boji kanec padne. Jsi poraněný a vyčerpaný, ale máš maso na několik dní.",
 set:{meat:1},ch:[["Zpátky na pláž, večer se blíží","camp"]]},
fruit:{amb:["birds","waves:.3"],
 art:()=>JUNGLE()+MAN(300,430,1.8)+`<g fill="#f4d35e"><ellipse cx="560" cy="150" rx="8" ry="20"/><ellipse cx="580" cy="158" rx="8" ry="20"/><circle cx="640" cy="130" r="14" fill="#7a4a22"/></g>`,
 t:"Najdeš pár kokosů a divoké banány. Žaludek ti trochu uleví, ale sil ubývá a kanec zmizel v houští. Slunce zapadá.",
 ch:[["Zpátky na pláž","camp"]]},
camp:{amb:["fire","drums:1500","waves:.5","night"],
 art:()=>NIGHT()+PALM(90,410,1.5,"#0e3a22","#1a1208")+PALM(730,400,1.7,"#0e3a22","#1a1208")+FIRE(400,410,1.5)+MAN(330,415,1.6),
 t:"Setmělo se. Rozděláš oheň a v dálce zaslechneš bubny, pomalé a hluboké, z nitra ostrova. Někdo tu není sám. Stíny mezi palmami se jako by hýbaly.",
 ch:[["Nechat oheň hořet jako signál","signal"],["Zhasnout oheň a schovat se","hide"]]},
signal:{amb:["fire","drums:700","night"],
 art:()=>NIGHT()+PALM(90,410,1.5,"#0e3a22","#1a1208")+FIRE(380,410,1.5)+MAN(300,415,1.6)+nat3(),
 on(){setTimeout(()=>SFX.horn(),1500)},
 t:"Plameny osvítí pláž a z tmy vystoupí domorodci s oštěpy a malovanými tvářemi. Obklopí tě. Vůdce vyřkne něco, čemu nerozumíš. Srdce ti buší jako ty bubny.",
 ch:[["Nabídnout jim maso z kance","END2",0,"meat"],["Vystřelit varovný výstřel","chase",{shot:1},"gun"],["Utéct do džungle","chase"]]},
hide:{amb:["drums:2200","night","waves:.5"],
 art:()=>NIGHT()+PALM(60,410,1.6,"#0e3a22","#1a1208")+`<g class="walk" style="animation-duration:14s"><g>${NAT(0,395,1.2,-1)}</g><g>${NAT(70,400,1.2,-1)}</g><circle cx="-20" cy="320" r="40" fill="#ff8c1a" opacity=".3" class="glow"/><circle cx="-20" cy="340" r="9" fill="#ffb347"/></g>`+`<path d="M0 450V400Q100 370 200 410T400 400V450Z" fill="#0b2012"/>`+MAN(130,425,1.2),
 t:"Zasypeš oheň pískem a schováš se do křoví. Domorodci projdou kolem pláže s pochodněmi a jejich stíny tančí mezi palmami. Dlouhé hodiny se neodvážíš ani dýchat. Ráno je pláž prázdná.",
 ch:[["Postavit vor a odplout","raft"],["Vylézt na kopec hledat loď","hill"]]},
hill:{amb:["birds","waves:.6"],
 art:()=>SEA("#ffd9a0","#5ec6ea")+SUN(520,150,40,"#fff3a6")+CL(80)+WV(280,"#3aa5cc",.9,10)+`<g class="drift" opacity=".9"><g transform="translate(300 270) scale(.35)">${SHIP("#6b3d1f")}</g></g>`+HILLS("#2e8f4a","#1f6b36")+`<path d="M0 450V380Q200 340 330 390Q500 430 800 400V450Z" fill="#7a5a3a"/>`+PALM(90,420,1.8)+MAN(400,400,2),
 t:"Na vrcholu kopce vidíš celé pobřeží. Na obzoru je plachta! Loď je daleko, ale máš dost dřeva na signální oheň. Jenže z pralesa se ozve křik, domorodci tě našli.",
 ch:[["Zapálit signální oheň","END1"],["Utéct dolů do džungle","chase"]]},
chase:{amb:["drums:450","birds:.5"],
 art:()=>JUNGLE()+`<g class="chs">${NAT(130,430,1.9)}${NAT(40,438,1.8)}</g>`+MAN(500,440,1.9)+`<path d="M640 120Q700 260 640 450H800V120Z" fill="#1a1e24"/><path d="M0 395Q120 380 160 410T320 400V450H0Z" fill="#00000033"/><path d="M700 330Q760 360 800 330V450H690Z" fill="#2a7fb8"/>`,
 on(){if(fl.shot){setTimeout(()=>{SFX.shot();flash()},500)}},
 t:"Běžíš džunglí, větve tě bičují přes obličej. Za zády slyšíš dupot a pokřik. Před tebou se otevře temná jeskyně a vpravo zurčí rozvodněná řeka.",
 ch:[["Schovat se v jeskyni","cave"],["Skočit do řeky","raft"],["Postavit se jim s oštěpem","END3"]]},
cave:{amb:["waves:.4"],
 art:()=>SK("#0a0c14","#1b1f33")+`<path d="M0 0H800V450H0Z" fill="#12141f"/><path d="M0 450V250Q120 100 400 80T800 250V450Z" fill="#232739"/><path d="M110 450V280Q200 170 400 160T690 280V450Z" fill="#0b0d16"/><g fill="#6ee7ff" class="tw"><path d="M180 200l10 -40 10 40z M600 230l8 -34 8 34z M420 140l8 -26 8 26z"/></g><rect x="320" y="370" width="90" height="50" rx="6" fill="#7a4a22"/><path d="M320 380h90" stroke="#f4d35e" stroke-width="5"/><g fill="#f4d35e" class="tw"><circle cx="340" cy="365" r="6"/><circle cx="365" cy="360" r="7"/><circle cx="392" cy="366" r="6"/></g>`+MAN(220,430,1.9),
 t:"Vklouzneš do vlhké jeskyně. Domorodci zastaví u vchodu, chvíli se dohadují a pak odejdou, jeskyně je pro ně posvátná a zakázaná. V hlubině najdeš pirátskou truhlu plnou zlata a čistý pramen.",
 ch:[["Zůstat a vybudovat si domov","END5"],["Vzít zlato a postavit vor","raft"]]},
raft:{amb:["waves","birds:.4"],
 art:()=>SEA("#ff9a5c","#3a5ba0")+SUN(400,270,50,"#ffe08a")+CL(90,"#ffd2b0",.6)+WV(290,"#2b6fa3",.9,10)+WV(320,"#1c4f80",1,7)+`<g class="rock"><g transform="translate(330 330)"><rect x="-90" y="0" width="180" height="16" rx="6" fill="#8a5a2c"/><path d="M-90 8h180M-60 0v16M0 0v16M60 0v16" stroke="#5a3a1a" stroke-width="3"/><path d="M0 0V-90" stroke="#3b2a1a" stroke-width="4"/><path d="M2 -88Q50 -50 2 -10Z" fill="#f1e7d0"/>${MAN(-40,2,1.2)}</g></g>`+WV(370,"#123a66",1,5),
 t:"Z kmenů a lián splácáš pevný vor. Pracuješ do západu slunce a vlny ho unášejí na širé moře. Ostrov se zmenšuje, ale oceán je nekonečný a nevíš, kudy se dát.",
 ch:[["Plout za hvězdami na východ","END4"],["Plout k tmavým bouřkovým mrakům","END3",{storm:1}]]}
};
/* ---------- KONCE ---------- */
const E={
END1:{n:1,ico:"🚢",h:"Záchrana",win:1,sky:["#ffd9a0","#5ec6ea"],amb:["waves","birds:.5"],
 art:()=>SEA("#ffd9a0","#5ec6ea")+SUN(560,140,40,"#fff3a6")+CL(80)+WV(270,"#3aa5cc",.9,10)+`<g class="arr"><g transform="translate(250 300) scale(.8)"><g class="rock">${SHIP()}</g></g></g>`+WV(330,"#2a86b5",.9,6)+SAND()+FIRE(620,400,1.4)+`<path d="M620 330q10 -80 -20 -150q40 50 20 150" fill="#999" opacity=".4"/>`+MAN(520,410,1.7),
 p:"Oheň vyletí k obloze a kouř je vidět na míle daleko. Loď obrátí kurz. Domorodci vyběhnou z džungle, ale spatří velkou plachetnici a zmizí mezi stromy. Za hodinu už stojíš na palubě s dekou přes ramena. Přežil jsi."},
END2:{n:2,ico:"👑",h:"Přítel ostrova",win:1,amb:["fire","drums:900","night"],
 art:()=>NIGHT()+PALM(70,410,1.5,"#0e3a22","#1a1208")+FIRE(400,410,1.6)+[200,280,520,600].map((x,i)=>`<g class="dance" style="animation-delay:${i*.12}s">${NAT(x,420,1.6,i%2?1:-1)}</g>`).join("")+MAN(400,425,1.7),
 p:"Vůdce ochutná maso, usměje se a zvedne oštěp k nebi. Bubny znějí rychleji a rychleji. Z nepřítele se stal host a z hosta bratr. Naučí tě lovit, tkát i číst z hvězd a po letech se z tebe stane jejich moudrý náčelník."},
END3:{n:3,ico:"💀",h:"Konec cesty",amb:["storm"],rain:1,
 art:()=>SK("#151a28","#05070c")+CL(80,"#232a3c",.9)+WV(320,"#0a1424",1,3)+WV(370,"#050a14",1,2)+`<g class="rock"><g transform="translate(300 340)"><rect x="-70" y="0" width="140" height="12" rx="4" fill="#4b2c14"/></g></g>`,
 p:()=>fl.storm?"Mraky se sevřou, vlna zvedne vor a rozlomí ho vedví. Poslední, co vidíš, je černá obloha plná blesků. Moře si tě vzalo.":"Oštěp se v tvých rukou zdá lehký jako stéblo. Domorodců je příliš mnoho a džungle je jejich domov. Bubny utichnou a ty už se nikdy nevrátíš domů."},
END4:{n:4,ico:"🧭",h:"Cesta domů",win:1,amb:["waves","birds:.4"],
 art:()=>SEA("#1a2a5a","#ff9a5c")+STARS()+SUN(400,300,46,"#ffe08a")+WV(300,"#274e8a",.9,10)+`<g class="drift"><g class="rock"><g transform="translate(330 335)"><rect x="-90" y="0" width="180" height="16" rx="6" fill="#8a5a2c"/><path d="M0 0V-90" stroke="#3b2a1a" stroke-width="4"/><path d="M2 -88Q50 -50 2 -10Z" fill="#f1e7d0"/>${MAN(-40,2,1.2)}</g></g></g>`+WV(370,"#123a66",1,6)+`<g fill="#ffd36b"><rect x="690" y="285" width="8" height="14"/><rect x="705" y="280" width="8" height="19"/><rect x="722" y="287" width="8" height="12"/></g><path d="M670 300h80v10h-80z" fill="#333"/>`,
 p:"Tři dny ti hvězdy ukazují cestu, pak tě za úsvitu spatří rybáři. V přístavu na tebe všichni zírají, jako bys byl duch. Měl jsi štěstí a odvahu a nikdy nezapomeneš, že mapu někdy píše jen vítr."},
END5:{n:5,ico:"🏝️",h:"Robinson",win:1,amb:["waves","birds","fire:.6"],
 art:()=>SEA("#ff9a5c","#7a4fa0")+SUN(250,260,50,"#ffe08a")+WV(300,"#c9673f",.8,10)+SAND("#d9a86a")+`<path d="M520 400l70 -80 70 80z" fill="#7a5a2a"/><rect x="545" y="380" width="30" height="20" fill="#3b2a1a"/><path d="M515 402l75 -85 75 85" stroke="#4a3418" stroke-width="5" fill="none"/>`+PALM(710,405,1.4)+FIRE(440,410,1)+MAN(380,412,1.6),
 p:"Postavíš si chatu u pramene, vypěstuješ zahrádku a naučíš se rybařit. Domorodci tě nechají na pokoji. Zlato v jeskyni ti k ničemu není, ale klid je k nezaplacení. Z trosečníka se stal pán ostrova."}
};
/* ---------- ENGINE ---------- */
function flash(){const f=$("flash");f.classList.remove("z");void f.offsetWidth;f.classList.add("z")}
function show(id){
  const e=E[id],s=e||S[id];cur=id;clearInterval(typT);
  if(s.set)Object.assign(fl,s.set);
  const d=document.createElement("div");d.className="sc";d.innerHTML=`<svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">${s.art()}</svg>`;
  $("stage").appendChild(d);requestAnimationFrame(()=>requestAnimationFrame(()=>d.classList.add("in")));
  [...$("stage").children].slice(0,-1).forEach(o=>setTimeout(()=>o.remove(),1500));
  $("rain").classList.toggle("on",!!s.rain);
  setAmb(s.amb);if(s.on)s.on();
  $("ch").classList.remove("show");$("ch").innerHTML="";
  if(e){$("prog").textContent="";setTimeout(()=>ending(id),4500);$("box").style.opacity=0;return}
  $("box").style.opacity=1;$("prog").textContent="⏱ "+Math.floor((Date.now()-t0)/60000)+" min";
  const txt=typeof s.t==="function"?s.t():s.t;
  let i=0;$("txt").textContent="";
  const fin=()=>{clearInterval(typT);$("txt").textContent=txt;
    (s.ch||[]).filter(c=>!c[3]||fl[c[3]]).forEach(c=>{const b=document.createElement("button");b.textContent=c[0];
      b.onclick=()=>{if(c[2])Object.assign(fl,c[2]);show(c[1])};$("ch").appendChild(b)});
    $("ch").classList.add("show");$("box").onclick=null};
  typT=setInterval(()=>{$("txt").textContent=txt.slice(0,++i);if(i>=txt.length)fin()},32);
  $("box").onclick=fin;
}
function ending(id){
  const e=E[id];if(cur!==id)return;
  if(e.win)SFX.win();else SFX.lose();
  if(!found.includes(e.n)){found.push(e.n);try{localStorage.setItem("ost_end",JSON.stringify(found))}catch(x){}}
  $("eN").textContent="KONEC "+e.n+" / 5";$("eT").textContent=e.ico+" "+e.h;
  $("eP").textContent=typeof e.p==="function"?e.p():e.p;
  $("eF").innerHTML=[1,2,3,4,5].map(n=>`<span class="${found.includes(n)?"on":""}">${E["END"+n].ico}</span>`).join("");
  $("end").classList.add("show");
}
function start(){audio();if(AC.state==="suspended")AC.resume();fl={};t0=Date.now();$("start").classList.remove("show");$("end").classList.remove("show");show("intro")}
$("go").onclick=start;$("again").onclick=start;
