/* tokeny.js – sdílený modul: tokeny, ceny vylepšení, uložení, světlý/tmavý režim, stopa kurzoru.
   Načítá ho index.html, vylepseni.html i všechny minihry (minihry z něj používají jen vyEarn / vyHas). */
(function(){
"use strict";
const KEY="vy_s", TOK="ry_tok", TOP=(window.parent===window);

/* ---------- katalog ---------- */
const RATE={arc:.02,akv:.05,zom:.1,hwy:.08,piz:.08};      /* tokenů za 1 💰 / Kč ve hře */
const CAP ={arc:25,akv:20,zom:120,hwy:40,piz:40};          /* max tokenů za jednu událost */
const GAMES={arc:"🎮 Arkády",akv:"🐙 Akvárium",zom:"🧟 Zombie expedice",hwy:"🚗 Dálnice",piz:"🍕 Pizzerie"};
const SRV_MAX=10;
const SRV=[
 {id:"cpu",e:"🖥️",n:"Výkon serveru",base:150,d:l=>`+${l*10} % tokenů z miniher`},
 {id:"net",e:"📡",n:"Síť",base:200,d:l=>`+${l*3} tokenů za minutu pasivně`},
 {id:"cache",e:"💾",n:"Cache",base:120,d:l=>`+${l*25} tokenů k denní odměně`}
];
const NS=[
 {id:"gold",n:"Zlaté jméno",p:300},
 {id:"plat",n:"Platinové jméno",p:800},
 {id:"dia",n:"Diamantové jméno",p:1800},
 {id:"rain",n:"Duhové jméno",p:3500}
];
const BADGES=[
 {id:"fish",e:"🐟",p:100},{id:"star",e:"⭐",p:150},{id:"fire",e:"🔥",p:200},
 {id:"rocket",e:"🚀",p:250},{id:"skull",e:"💀",p:250},{id:"crown",e:"👑",p:400}
];
const BGS=[
 {id:"ocean",e:"🌊",n:"Oceán",p:0},{id:"sunset",e:"🌇",n:"Západ slunce",p:250},
 {id:"forest",e:"🌲",n:"Les",p:250},{id:"space",e:"🌌",n:"Vesmír",p:350}
];
const ADM=[
 {id:"akv",e:"🐙",n:"Admin panel – Akvárium",p:600,how:"V akváriu se objeví ⚙ vpravo nahoře."},
 {id:"arc",e:"🎮",n:"Admin panel – Arkády",p:800,how:"V arkádách otevři bublinu 💬 – panel se otevře rovnou."},
 {id:"hwy",e:"🚗",n:"Admin panel – Dálnice",p:1500,how:"V dálnici klikni na ⚙ – bez hesla."},
 {id:"zom",e:"🧟",n:"Admin panel – Zombie expedice",p:1500,how:"V expedici klikni na ⚙ – bez hesla."},
 {id:"piz",e:"🍕",n:"Admin panel – Pizzerie",p:2000,how:"V pizzerii klikni na ⚙ – bez hesla."}
];
const PRICES={rgb:500,hue:400,trail:350};

/* ---------- uložení ---------- */
function defaults(){return{
 srv:{cpu:0,net:0,cache:0},
 rgb:{own:0,on:0,mode:"rainbow",color:"#00e5ff",speed:5,str:3},
 hue:{own:0,on:0,color:"#ff2d75"},
 trail:{own:0,on:0,mode:"rainbow"},
 theme:"dark",nick:"",ns:"",badge:"",bg:"ocean",
 own:{ns:[],badge:[],bg:["ocean"],adm:[]},
 daily:{last:"",streak:0},acc:{},earned:0
}}
function merge(d,s){
 if(!s||typeof s!=="object")return d;
 for(const k in s){
  if(d[k]&&typeof d[k]==="object"&&!Array.isArray(d[k])&&s[k]&&typeof s[k]==="object")merge(d[k],s[k]);
  else d[k]=s[k];
 }
 return d;
}
function load(){let s=null;try{s=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){}return merge(defaults(),s)}
function save(s){try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}}
function tok(){try{return Math.max(0,Math.floor(+localStorage.getItem(TOK)||0))}catch(e){return 0}}
function setTok(n){try{localStorage.setItem(TOK,Math.max(0,Math.floor(n)))}catch(e){}}
function addTok(n){const v=tok()+Math.floor(n);setTok(v);return Math.max(0,v)}
function spend(n){if(tok()<n)return false;setTok(tok()-n);return true}
function reset(){try{localStorage.removeItem(KEY)}catch(e){}}

/* ---------- výpočty ---------- */
const mult=s=>1+.1*(s||load()).srv.cpu;
const passivePerMin=s=>3*(s||load()).srv.net;
const srvLevel=s=>{s=s||load();return s.srv.cpu+s.srv.net+s.srv.cache};
const srvCost=(id,lv)=>{const d=SRV.find(x=>x.id===id);return Math.round(d.base*Math.pow(1.6,lv)/5)*5};
const today=()=>{const d=new Date();return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()};
const yesterday=()=>{const d=new Date(Date.now()-864e5);return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()};
const dailyReward=s=>{s=s||load();const st=s.daily.last===yesterday()?s.daily.streak+1:1;return 50+25*s.srv.cache+Math.min(st,7)*10};

/* odměna za hru (běží v hlavním okně, minihry sem posílají zprávu) */
function earn(src,amt){
 if(!(src in RATE)||!(amt>0))return 0;
 const s=load(),t=Math.min(CAP[src],amt*RATE[src])*mult(s);
 s.acc[src]=(s.acc[src]||0)+t;
 const w=Math.floor(s.acc[src]);s.acc[src]-=w;
 if(w>0){s.earned+=w;addTok(w)}
 save(s);return w;
}
function passive(sec){
 const s=load(),p=passivePerMin(s);if(!p)return 0;
 s.acc.pas=(s.acc.pas||0)+p/60*sec;
 const w=Math.floor(s.acc.pas);s.acc.pas-=w;
 if(w>0){s.earned+=w;addTok(w)}
 save(s);return w;
}

/* ---------- jméno, vzhled ---------- */
const esc=t=>String(t).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function nameHTML(s,custom){
 s=s||load();const n=custom||s.nick||"Hráč";
 const b=BADGES.find(x=>x.id===s.badge);
 return(b?b.e+" ":"")+`<span class="vy-nm${s.ns?" vy-nm-"+s.ns:""}">${esc(n)}</span>`;
}
function hueOf(hex){
 const m=/^#?([0-9a-f]{6})$/i.exec(hex||"");if(!m)return null;
 const n=parseInt(m[1],16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
 if(!d)return null;
 let h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;
 h=Math.round(h*60);return h<0?h+360:h;
}
function applyTheme(){
 const s=load();let m=s.theme;
 if(m!=="light"&&m!=="dark")m=matchMedia("(prefers-color-scheme:light)").matches?"light":"dark";
 document.documentElement.setAttribute("data-theme",m);
 return m;
}
try{matchMedia("(prefers-color-scheme:light)").addEventListener("change",()=>{if(load().theme==="auto")applyTheme()})}catch(e){}

/* ---------- stopa kurzoru (běží v každé stránce, která načte tento soubor) ---------- */
let trail=null,lastT=0;
function refresh(){
 const s=load();trail=(s.trail.own&&s.trail.on)?s.trail.mode:null;
 applyTheme();autoAdm();
}
addEventListener("pointermove",ev=>{
 if(!trail||!document.body)return;
 const n=performance.now();if(n-lastT<35)return;lastT=n;
 const d=document.createElement("div"),h=Math.round((Date.now()/6)%360),bub=trail==="bubbles";
 d.style.cssText=`position:fixed;left:${ev.clientX}px;top:${ev.clientY}px;pointer-events:none;z-index:2147483000;border-radius:50%;`+
  (bub?`width:12px;height:12px;margin:-6px 0 0 -6px;border:2px solid #bfeaff;background:#ffffff33`
      :`width:10px;height:10px;margin:-5px 0 0 -5px;background:hsl(${h} 100% 60%);box-shadow:0 0 10px hsl(${h} 100% 60%)`);
 document.body.appendChild(d);
 d.animate(bub?[{opacity:.9,transform:"translateY(0) scale(1)"},{opacity:0,transform:"translateY(-26px) scale(1.4)"}]
              :[{opacity:.9,transform:"scale(1)"},{opacity:0,transform:"scale(.2) translateY(12px)"}],{duration:bub?800:600}).onfinish=()=>d.remove();
},{passive:true});

/* ---------- komunikace mezi okny ---------- */
function notify(){
 refresh();            /* použije režim + stopu kurzoru i v tomto okně */
 try{if(!TOP)parent.postMessage({vyChanged:1},"*")}catch(e){}
}
addEventListener("message",e=>{
 const d=e.data;if(!d||typeof d!=="object")return;
 if(d.vyChanged&&!TOP){refresh();if(typeof window.onVyChange==="function")window.onVyChange()}
});

/* ---------- pro minihry ---------- */
const FILE={"zombie.html":"zom","dalnice.html":"hwy","pizza.html":"piz","arkady.html":"arc","akvarium.html":"akv"};
const GAME=FILE[(location.pathname.split("/").pop()||"").toLowerCase()]||"";
const has=(kind,id)=>load().own[kind].includes(id);
function autoAdm(){           /* koupený admin panel = přihlášení bez hesla */
 if(!GAME||!has("adm",GAME))return;
 const l=document.getElementById("admLogin"),t=document.getElementById("admTools");
 if(l&&t){l.style.display="none";t.style.display="block"}
}
window.vyEarn=function(src,amt){
 if(TOP){earn(src,amt);return}
 try{parent.postMessage({vyEarn:{src:src,amt:amt}},"*")}catch(e){}
};
window.vyHas=function(id){return has("adm",id)};

window.VY={KEY,RATE,CAP,GAMES,SRV,SRV_MAX,NS,BADGES,BGS,ADM,PRICES,
 load,save,tok,setTok,addTok,spend,reset,mult,passivePerMin,srvLevel,srvCost,today,yesterday,dailyReward,
 earn,passive,nameHTML,hueOf,applyTheme,notify,refresh,esc,TOP};

applyTheme();
if(GAME){
 refresh();
 const b=document.getElementById("admB");
 if(b)b.addEventListener("click",()=>setTimeout(autoAdm,0));
}else if(!TOP){refresh()}
})();
