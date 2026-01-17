/* app.js */
"use strict";

/* ===== Config ===== */
const SRC="manual_copy", LIM=120, H=["company_name","street","zip","city","phone","email","website","source","notes"];
const SOCIAL=["facebook.com","fb.com","instagram.com","linkedin.com","tiktok.com","youtube.com","youtu.be","xing.com","twitter.com","x.com","pinterest.com"];
const START=[/^google\s*maps$/i,/^apple\s*maps$/i,/^impressum$/i,/^kontakt$/i,/^contact$/i];
const SEP=/^(\-{3,}|={3,}|\*{3,}|•{3,}|_{3,})$/;
const JUNK=[/^bewertungen?\b/i,/^öffnungszeiten?\b/i,/^ust-?id\b/i,/^ustid\b/i,/^umsatzsteuer\b/i,/^handelsregister\b/i,/^registergericht\b/i,/^hrb\b/i,/^hra\b/i,/^impressum\s*:/i,/^datenschutz\s*:/i,/^route\b/i,/^speichern\b/i,/^teilen\b/i,/^in\s+der\s+nähe\b/i,/^cookie\b/i,/^navigation\b/i];
const NOISE=[/cookie(s)?/i,/consent/i,/datenschutz/i,/privacy/i,/\b(alle\s*rechte\s*vorbehalten|copyright|©)\b/i,/\b(navigation|menu|menü)\b/i,/\b(home|startseite|kontakt|leistungen|über uns|karriere|jobs|blog|news|shop|warenkorb)\b/i,/\b(standort(e)?|route|anfahrt)\b/i,/\b(google\s*analytics|matomo|tracking)\b/i,/\b(javascript|css|html)\b/i,/\b(accept|ablehnen|zustimmen|weiter)\b/i,/newsletter/i,/haftung/i,/urheber/i,/verantwortlich/i,/redaktionell/i];
const IMPR=[/\bust-?id\b/i,/\bregistergericht\b/i,/\bhandelsregister\b/i,/\bhrb\b/i,/\bhra\b/i,/\bvertretungsberechtigt\b/i,/\bgeschäftsführer\b/i,/\binhaber\b/i];

/* ===== DOM ===== */
const $=id=>document.getElementById(id);
const inEl=$("in"), maxEl=$("max"), zipEl=$("zip"), sortEl=$("sort");
const go=$("go"), exp=$("exp"), cpy=$("cpy"), clr=$("clr");
const st=$("st"), hint=$("hint"), th=$("th"), tb=$("tb");
const err=$("err"), errMsg=$("errMsg");
const bd=$("bd"), x=$("x"), x2=$("x2"), ms=$("ms"), kv=$("kv"), bp=$("bp"), cr=$("cr"), saveFix=$("saveFix");
const normBtn=$("normBtn"), saveBtn=$("saveBtn"), loadFile=$("loadFile"), autoPill=$("autoPill");
const fltOn=$("fltOn"), fltE=$("fltE"), fltP=$("fltP"), fltS=$("fltS"), onlyG=$("onlyG");
const flowOn=$("flowOn");

/* ===== Utils ===== */
const clamp=s=>{s=(s||"").trim();return s.length<=LIM?s:s.slice(0,LIM-1).trim()+"…";};
const esc=s=>(s??"").toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const escRe=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const now=()=>Date.now();

function deEnt(s){return (s||"").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'");}
function san(raw){
  return deEnt(raw||"")
    .replace(/\u00AD/g,"")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g,"")
    .replace(/[\u2010-\u2015\u2212]/g,"-")
    .replace(/\u2028|\u2029/g,"\n")
    .replace(/[\u2022\u25CF\u25CB\u25A0\u25AA]/g,"•")
    .replace(/[★☆]+/g,"")
    .replace(/\u00A0/g," ")
    .replace(/[ \t]+/g," ");
}
function norm(s){return san(s).replace(/\s+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();}
function stripInline(l){
  l=san(l||"").trim();
  l=l.replace(/\bBewertungen?\b\s*:?.*$/i,"").trim();
  l=l.replace(/\b(Route|Speichern|Teilen|In der Nähe)\b.*$/i,"").trim();
  l=l.replace(/\bÖffnungszeiten?\b\s*:?.*$/i,"").trim();
  return l;
}
function stripLbl(s){return (s||"").replace(/^\s*(tel\.?|telefon|phone|mobil|fax)\s*[:\-]\s*/i,"")
  .replace(/^\s*(e-?mail)\s*[:\-]\s*/i,"").replace(/^\s*(web(site)?|internet|url)\s*[:\-]\s*/i,"").trim();}
function dom(url){if(!url) return ""; let u=url.trim().replace(/^https?:\/\//i,"").replace(/^www\./i,""); return (u.split("/")[0]||"").toLowerCase();}
function isSocial(u){const d=dom(u);return d?SOCIAL.some(h=>d===h||d.endsWith("."+h)):false;}
function nPhone(raw){if(!raw) return ""; let s=stripLbl(stripInline(raw)); return s.replace(/[^\d +\/\-]/g,"").replace(/[ ]{2,}/g," ").trim();}
function nWeb(raw){if(!raw) return ""; let s=stripLbl(stripInline(raw)).trim(); return s.replace(/^[\(\[\{<]+/,"").replace(/[\)\]\}>.,;!]+$/,"").replace(/(\?.*)$/,"");}

/* ===== Token lists ===== */
function linesToTokens(v){return (v||"").split(/\n+/).map(x=>x.trim()).filter(Boolean).slice(0,300);}
function mkTokenRes(){
  const bl=linesToTokens($("bl").value), wl=linesToTokens($("wl").value);
  return {bl,wl,blRe:bl.map(t=>new RegExp(escRe(t),"i")),wlRe:wl.map(t=>new RegExp(escRe(t),"i"))};
}
let TOK=mkTokenRes();

/* ===== Noise filter ===== */
function isJ(l){
  l=stripInline(l);
  if(!l||l.length<=2) return true;
  if(/^[\-\–\—\•\|\/\\\s]+$/.test(l)) return true;
  if(TOK.blRe.some(r=>r.test(l))) return true;
  if(JUNK.some(r=>r.test(l))) return true;
  for(const r of NOISE) if(r.test(l)&&l.length<180) return true;
  return false;
}

/* ===== Email (robust) ===== */
function emailVariants(t){
  t=san(t||""); const v=[];
  v.push(t,t.replace(/\r/g,""),t.replace(/\n+/g," "));
  v.push(t.replace(/-\s*\n\s*/g,""));
  v.push(t.replace(/@\s*\n\s*/g,"@").replace(/\.\s*\n\s*/g,"."));
  v.push(t.replace(/\s*@\s*/g,"@").replace(/\s*\.\s*/g,"."));
  v.push(t.replace(/\(\s*at\s*\)|\[\s*at\s*\]|\s+at\s+|\s*\{at\}\s*/ig,"@")
         .replace(/\(\s*dot\s*\)|\[\s*dot\s*\]|\s+dot\s+|\s*\{dot\}\s*/ig,".")
         .replace(/\s*@\s*/g,"@").replace(/\s*\.\s*/g,"."));
  v.push(t.replace(/＠/g,"@").replace(/[。｡]/g,"."));
  v.push(t.replace(/\s+/g,""));
  v.push(t.replace(/mailto:/ig," "));
  return v;
}
function cleanEmail(s){
  s=(s||"").toLowerCase().replace(/mailto:/g,"");
  s=s.replace(/^[^\w]+|[^\w]+$/g,"").replace(/[>,;)\]]+$/g,"");
  s=stripLbl(s).replace(/\s*@\s*/g,"@").replace(/\s*\.\s*/g,".").replace(/＠/g,"@").replace(/[。｡]/g,".").trim();
  return s;
}
function findEmails(t){
  const found=new Set(), re=/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,24}/gi;
  for(const src of emailVariants(t)) (src.match(re)||[]).forEach(x=>found.add(cleanEmail(x)));
  const L=san(t||"").split("\n").map(x=>x.trim()).filter(Boolean);
  for(let i=0;i<L.length;i++){
    const a=L[i], b=L[i+1]||"", c=L[i+2]||"";
    const j=[a+" "+b, a+" "+b+" "+c, a+b, a+b+c].join(" ");
    (j.match(re)||[]).forEach(x=>found.add(cleanEmail(x)));
  }
  let valid=[...found].filter(e=>/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,24}$/.test(e) && !/\.{2,}/.test(e));
  valid.sort((A,B)=>{
    const sc=x=>(/(^|@)(info|kontakt|office|mail|service|hallo|hello|vertrieb|support)\b/.test(x)?2:0)+1;
    return sc(B)-sc(A);
  });
  return valid;
}

/* ===== Websites ===== */
function validDomCand(d){
  d=d.toLowerCase().replace(/^[.]+|[.]+$/g,"");
  if(d.length<6||!d.includes(".")) return false;
  const tld=d.split(".").pop();
  if(!tld||tld.length<2||tld.length>24||!/^[a-z]{2,24}$/.test(tld)) return false;
  if(d==="e.k"||d.endsWith(".ek")) return false;
  return true;
}
function findWebsites(text){
  const t=san(text||""), urls=new Set();
  (t.match(/\bhttps?:\/\/[^\s<>"')]+/gi)||[]).forEach(u=>urls.add(u));
  (t.match(/\bwww\.[^\s<>"')]+\b/gi)||[]).forEach(u=>urls.add(u));
  (t.match(/\b(?![A-Z0-9._%+-]+@)([a-z0-9-]+(?:\.[a-z0-9-]+)+)\b/gi)||[]).forEach(d=>{
    if(/\.(png|jpg|jpeg|gif|svg|pdf|css|js)$/i.test(d)) return;
    if(/(cookie|privacy|datenschutz|impressum)/i.test(d)) return;
    if(!validDomCand(d)) return;
    const dd=d.toLowerCase();
    if(new RegExp("@\\s*"+escRe(dd)+"\\b","i").test(t)) return;
    urls.add(d);
  });
  const list=[...urls].map(nWeb).filter(Boolean);
  const by=new Map(), sc=x=>(/^https?:\/\//i.test(x)?2:0)+(/^www\./i.test(x)?1:0);
  for(const u of list){const d=dom(u); if(!d) continue; const p=by.get(d); if(!p||sc(u)>sc(p)) by.set(d,u);}
  return [...by.values()];
}
function uniqDomains(urls){const s=new Set(); for(const u of (urls||[])){const d=dom(u); if(d) s.add(d);} return [...s];}

/* ===== Address ===== */
function zipCity(text){
  const t=stripInline(san(text||""));
  const re=/\b(\d{5})\s+([A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß\.\- ]{2,})\b/g; let m;
  while((m=re.exec(t))!==null){
    const zip=m[1]; let city=(m[2]||"").trim().split("\n")[0].trim();
    city=city.replace(/\b(Tel|Telefon|Phone|E-Mail|Email|Web|Website|Route|Öffnungszeiten)\b.*$/i,"").trim();
    if(city.length>=2&&!/\d/.test(city)) return {zip,city};
  }
  return {zip:"",city:""};
}
function streetZipCityLine(line){
  const l=stripInline(san(line||"")).trim();
  const m=l.match(/^(.+?),\s*(\d{5})\s+(.+)$/);
  if(!m) return null;
  const street=m[1].trim(), zip=m[2].trim();
  const city=m[3].trim().replace(/\b(Tel|Telefon|Phone|E-Mail|Email|Web|Website)\b.*$/i,"").trim();
  return (street&&zip&&city)?{street,zip,city}:null;
}
function looksStreet(line){
  const l=stripInline(san(line||"")).trim();
  if(!l||isJ(l)) return false;
  if(!/\b\d+[a-zA-Z]?\b/.test(l)) return false;
  const suf=/\b(straße|strasse|str\.?|str|weg|platz|allee|gasse|ring|damm|ufer|promenade|chaussee|berg|hof|plan|markt|zeile|gürtel|kai|brücke|bruecke|steig|pfad)\b/i;
  if(suf.test(l)) return true;
  return l.split(/\s+/).filter(Boolean).length<=8;
}
function findStreetZipCity(lines){
  for(const raw of lines){
    if(isJ(raw)) continue;
    const p=streetZipCityLine(raw);
    if(p && /[A-Za-zÄÖÜäöüß]/.test(p.street)) return {...p,_line:raw};
  }
  return null;
}
function findStreet(text){
  const lines=(text||"").split(/\n/).map(l=>l.trim()).filter(Boolean);
  const comb=findStreetZipCity(lines); if(comb) return comb.street;
  for(const l of lines) if(looksStreet(l)) return stripInline(san(l)).trim().replace(/^\s*(adresse|anschrift)\s*[:\-]\s*/i,"");
  for(const line of lines){
    const l=stripInline(san(line)).trim();
    if(!l||isJ(l)) continue;
    if(/,/.test(l)&&/\b\d+[a-zA-Z]?\b/.test(l)&&!/@/.test(l)) return l.split(",")[0].trim();
  }
  return "";
}
function phones(text){
  const t=stripInline(san(text||"")), c=new Set();
  let m; const re1=/(?:tel\.?|telefon|phone|mobil|fax)\s*[:\-]?\s*([+\d][\d \-\/]{6,})/gi;
  while((m=re1.exec(t))!==null) c.add(nPhone(m[1]));
  (t.match(/\b(?:\+49|0)\s*[\d][\d \-\/]{6,}\b/g)||[]).forEach(p=>c.add(nPhone(p)));
  const arr=[...c].filter(Boolean);
  arr.sort((a,b)=>((b.startsWith("+49")?1:0)-(a.startsWith("+49")?1:0))||(b.length-a.length));
  return arr;
}
function isAddr(line){
  const l=stripInline(san(line||"")).trim();
  return !!(l && (/\d{5}\s+\S+/.test(l) || streetZipCityLine(l) || looksStreet(l)));
}
function isContact(line){
  const l=stripInline(san(line||"")).trim();
  return !!(l && (/@/.test(l) || /(tel|telefon|phone|mobil|fax)\b/i.test(l) || /\+49|(^|\s)0\d{2,}/.test(l) || /https?:\/\//i.test(l) || /\bwww\./i.test(l)));
}
function looksName(line){
  const l=stripInline(san(line||"")).trim();
  if(!l||l.length<2||l.length>160) return false;
  if(START.some(r=>r.test(l))) return false;
  if(isJ(l)) return false;
  if(/^[A-Za-zÄÖÜäöüß ]{2,25}\s*:\s*/.test(l)) return false;
  if(isAddr(l)||isContact(l)) return false;
  if(TOK.wlRe.some(r=>r.test(l))) return true;
  return /[A-Za-zÄÖÜäöüß]/.test(l);
}

/* ===== Split blocks ===== */
function splitBlocks(raw){
  const t=norm(raw); if(!t) return [];
  const lines=t.split("\n").map(l=>l.trim());
  const blocks=[]; let cur=[];
  const push=()=>{const b=cur.join("\n").trim(); if(b) blocks.push(b); cur=[];};
  const core=arr=>{const s=arr.join("\n"); return /\b\d{5}\b/.test(s)||/@/.test(s)||/(tel|telefon|phone|mobil|fax)\b/i.test(s)||/\+49|(^|\s)0\d{2,}/.test(s)||/https?:\/\//i.test(s)||/\bwww\./i.test(s);};
  for(const line of lines){
    if(!line){push();continue;}
    if(SEP.test(line)){push();continue;}
    if(START.some(r=>r.test(line))){if(cur.length) push(); cur.push(line); continue;}
    if(looksName(line) && cur.length && core(cur)) push();
    cur.push(line);
  }
  push(); return blocks;
}
function flowSplit(raw){
  let t=norm(raw); if(!t) return "";
  const reps=[
    [/(\b\d{5}\s+[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß\- ]{1,}\b)(?=\s+[A-ZÄÖÜ][^.\n]{2,60}\b(?:GmbH|UG|e\.K\.|KG|GbR|OHG|AG|Praxis|Bau|Elektro|Service|Studio|Hotel|Kanzlei)\b)/g,"$1\n\n"],
    [/(\b(?:tel\.?|telefon|phone|mobil|fax)\s*[:\-]?\s*[+\d][\d \-\/]{6,})(?=\s+[A-ZÄÖÜ])/ig,"$1\n\n"],
    [/(\b[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,24}\b)(?=\s+[A-ZÄÖÜ])/ig,"$1\n\n"],
    [/(\bhttps?:\/\/[^\s<>"')]+\b)(?=\s+[A-ZÄÖÜ])/ig,"$1\n\n"],
    [/(\bwww\.[^\s<>"')]+\b)(?=\s+[A-ZÄÖÜ])/ig,"$1\n\n"],
  ];
  for(const [re,rep] of reps) t=t.replace(re,rep);
  return t.replace(/\n{3,}/g,"\n\n").trim();
}
function normalizeParagraphs(raw){
  const t=norm(raw); if(!t) return "";
  const lines=t.split("\n");
  let out=[], cur=[];
  const core=arr=>{const s=arr.join("\n"); return /\b\d{5}\b/.test(s)||/@/.test(s)||/(tel|telefon|phone|mobil|fax)\b/i.test(s)||/\+49|(^|\s)0\d{2,}/.test(s)||/https?:\/\//i.test(s)||/\bwww\./i.test(s);};
  for(let i=0;i<lines.length;i++){
    const ln=lines[i].trim();
    if(!ln){ out.push(""); cur=[]; continue; }
    if(SEP.test(ln)){ out.push("",ln,""); cur=[]; continue; }
    if(looksName(ln) && cur.length && core(cur) && out[out.length-1]!=="") out.push("");
    out.push(lines[i]); cur.push(ln);
  }
  return out.join("\n").replace(/\n{3,}/g,"\n\n").trim();
}

/* ===== Highlight ===== */
function hiBlock(raw, used){
  const usedSet=new Set(Object.values(used||{}).filter(Boolean).map(x=>stripInline(san(x)).trim()));
  return (raw||"").split("\n").map(l=>{
    const s=stripInline(san(l.trim())).trim();
    return (s && usedSet.has(s))?`<mark>${esc(l.trim())}</mark>`:esc(l.trim());
  }).join("\n");
}

/* ===== CSV ===== */
function csvEsc(v){v=(v??"").toString();return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
function zipFmt(z,mode){z=(z||"").trim(); if(!z) return ""; return mode==="excel_text"?"'"+z:z;}
function rowLine(r,zipMode){return H.map(k=>k==="zip"?csvEsc(zipFmt(r.zip||"",zipMode)):csvEsc(r[k]||"")).join(",");}
function toCSV(rows,zipMode){const out=[H.join(",")]; for(const r of rows) out.push(rowLine(r,zipMode)); return out.join("\n");}
function dl(name,content){
  const blob=new Blob(["\uFEFF"+content],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function clip(text){
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return true;}
  const ta=document.createElement("textarea"); ta.value=text; document.body.appendChild(ta); ta.select();
  const ok=document.execCommand("copy"); ta.remove(); return ok;
}

/* ===== Neighbor street inference ===== */
function inferStreet(lines, zip, city){
  if(!zip||!city) return {street:"",used:""};
  const re=new RegExp("\\b"+escRe(zip)+"\\b\\s+"+escRe(city)+"\\b","i");
  const idx=lines.findIndex(l=>re.test(stripInline(san(l))));
  if(idx<0) return {street:"",used:""};
  const same=streetZipCityLine(lines[idx]); if(same) return {street:same.street,used:lines[idx]};
  for(const back of [1,2]){
    const j=idx-back;
    if(j>=0 && looksStreet(lines[j])) return {street:stripInline(san(lines[j])).trim(),used:lines[j]};
  }
  return {street:"",used:""};
}

/* ===== Strict Ampel ===== */
function missCount(r){
  let m=0; ["company_name","street","zip","city","phone","email","website"].forEach(k=>{ if(!((r[k]||"").trim())) m++; });
  return m;
}
function qStrict(r){const m=missCount(r); return m===0?"g":(m<=2?"y":"r");}

/* ===== Extract ===== */
function extract(block){
  const raw=(block||"").split("\n").map(l=>l.trim()).filter(Boolean);
  const lines=raw.map(l=>stripInline(san(l))).filter(Boolean);

  const kept=[]; let impr=false;
  for(const l of lines){
    if(IMPR.some(r=>r.test(l))) impr=true;
    if(isJ(l)) continue;
    kept.push(l);
  }
  if(!kept.length) return null;

  const keptText=kept.join("\n");
  const em=findEmails(keptText);
  const ph=phones(keptText);
  const webs=findWebsites(keptText).filter(u=>!isSocial(u));
  const uweb=uniqDomains(webs);

  let street="",zip="",city="", addrUsed="";
  const comb=findStreetZipCity(kept);
  if(comb){street=comb.street;zip=comb.zip;city=comb.city;addrUsed=comb._line||"";}
  else{
    const zc=zipCity(keptText); zip=zc.zip; city=zc.city;
    const nb=inferStreet(kept,zip,city);
    if(nb.street){street=nb.street;addrUsed=nb.used;}
    else{
      street=findStreet(keptText);
      const re=new RegExp("\\b"+escRe(zip)+"\\b\\s+"+escRe(city)+"\\b","i");
      const hit=kept.find(l=>re.test(stripInline(san(l))));
      if(hit) addrUsed=hit;
      if(!addrUsed && street){
        const h2=kept.find(l=>stripInline(san(l)).toLowerCase().includes(street.toLowerCase()));
        if(h2) addrUsed=h2;
      }
    }
  }

  let name="", nameUsed="";
  for(const l of kept){ if(looksName(l)){name=l;nameUsed=l;break;} }

  const email=em[0]||"", phone=ph[0]||"", website=webs[0]||"";
  const hasAddr=!!((zip&&city)||street);
  const c=(phone?1:0)+(email?1:0)+(website?1:0);
  if(!((hasAddr&&c>=1)||(name&&c>=1)||(name&&hasAddr))) return null;

  const notes=[];
  if(impr) notes.push("Impressum gefunden");
  if(!name) notes.push("Name unklar");
  if(!hasAddr) notes.push("Adresse unklar");
  if(!email) notes.push("keine Email");
  if(ph.length>1) notes.push("mehrere Nummern");
  if(em.length>1) notes.push("mehrere Emails");
  if(uweb.length>1) notes.push("mehrere Domains");

  const phoneLine=phone?(kept.find(l=>/tel|telefon|phone|mobil|fax/i.test(l)&&nPhone(l).includes(nPhone(phone)))||kept.find(l=>nPhone(l)===nPhone(phone))||""):"";
  const emailLine=email?(kept.find(l=>/mail/i.test(l)&&l.toLowerCase().includes(email))||kept.find(l=>l.toLowerCase().includes(email))||""):"";
  let webLine="";
  if(website){
    const d=dom(website);
    webLine=kept.find(l=>(/\bwebsite\b|web\s*:/i.test(l)) && findWebsites(l).some(u=>dom(u)===d))
      ||kept.find(l=>/https?:\/\//i.test(l) && findWebsites(l).some(u=>dom(u)===d))
      ||kept.find(l=>/\bwww\./i.test(l) && findWebsites(l).some(u=>dom(u)===d))
      ||kept.find(l=>findWebsites(l).some(u=>dom(u)===d))||"";
  }

  const r={company_name:name,street,zip,city,phone,email,website,source:SRC,notes:clamp(notes.join(", "))};
  r._q=qStrict(r);
  return {r,d:{raw:block,used:{nameLine:nameUsed,addressLine:addrUsed,phoneLine,emailLine,websiteLine:webLine}}};
}

/* ===== Dedupe ===== */
function nk(s){return (s||"").toLowerCase().replace(/[^a-z0-9äöüß]+/gi," ").replace(/\s+/g," ").trim();}
function recKey(r){
  const d=nk(dom(r.website)), p=nk(r.phone), n=nk(r.company_name), z=nk((r.zip||"")+" "+(r.city||""));
  if(d) return "d:"+d; if(p) return "p:"+p; if(n&&z) return "nzc:"+n+"|"+z; if(n) return "n:"+n;
  return "u:"+Math.random().toString(36).slice(2);
}
function merge(a,b){
  const o={...a};
  for(const k of H){ if(k==="notes") continue; if(!o[k] && b[k]) o[k]=b[k]; }
  const s=new Set();
  [a.notes,b.notes].forEach(n=>(n||"").split(",").map(x=>x.trim()).filter(Boolean).forEach(x=>s.add(x)));
  s.add("merged"); o.notes=clamp([...s].join(", "));
  o._q=qStrict(o);
  return o;
}
function dedupe(rows){
  const m=new Map();
  for(const r of rows){ const k=recKey(r); m.set(k, m.has(k)?merge(m.get(k),r):r); }
  return [...m.values()];
}
function parseAll(raw){
  const blocks=splitBlocks(raw);
  const rows=[], dbg=[]; let skipped=0;
  for(const b of blocks){ const out=extract(b); if(out){rows.push(out.r); dbg.push(out);} else skipped++; }
  const ded=dedupe(rows);
  return {blocks:blocks.length, extracted:rows.length, deduped:ded.length, skipped, ded, dbg};
}

/* ===== Duplicate flags (preview) ===== */
function normNameCity(r){return (nk(r.company_name)+" "+nk(r.city)+" "+nk(r.zip)).trim();}
function dupFlags(dbg){
  const byPhone=new Map(), byDom=new Map(), byNC=new Map();
  const flags=new Array(dbg.length).fill(false);
  for(let i=0;i<dbg.length;i++){
    const r=dbg[i].r, p=nk(r.phone), d=nk(dom(r.website)), nc=normNameCity(r);
    if(p){ (byPhone.get(p)||byPhone.set(p,[]).get(p)).push(i); }
    if(d){ (byDom.get(d)||byDom.set(d,[]).get(d)).push(i); }
    if(nc && r.company_name && (r.city||r.zip)){ (byNC.get(nc)||byNC.set(nc,[]).get(nc)).push(i); }
  }
  const mark=arr=>{ if(arr.length>1) arr.forEach(i=>flags[i]=true); };
  byPhone.forEach(mark); byDom.forEach(mark); byNC.forEach(mark);
  return flags;
}

/* ===== Session save/load (fixes by key) ===== */
function buildFixes(dbg){const fixes={}; for(const it of dbg) fixes[recKey(it.r)]={...it.r}; return fixes;}
function applyFixes(result, fixes){
  if(!fixes) return result;
  for(const it of result.dbg){
    const k=recKey(it.r);
    if(fixes[k]){
      const src=fixes[k];
      for(const f of H.concat(["_q"])) if(src[f]!==undefined) it.r[f]=src[f];
      it.r._q=qStrict(it.r);
    }
  }
  result.ded=dedupe(result.dbg.map(x=>x.r));
  result.deduped=result.ded.length;
  return result;
}

/* ===== UI helpers ===== */
let last=null, sel=null, selIdx=-1, debT=0, lastAutoAt=0, lastSessionFixes=null;

function showErr(e){errMsg.textContent=(e&&e.message)?e.message:String(e); err.style.display="block";}
function clearErr(){err.style.display="none"; errMsg.textContent="";}

function renderStats(r){
  const items=[
    ["Blöcke erkannt",r.blocks],
    ["Extrahiert (vor Dedupe)",r.extracted],
    ["Nach Dedupe/Merge",r.deduped],
    ["Übersprungen (Müll/zu wenig Signale)",r.skipped]
  ];
  st.innerHTML=items.map(([k,v])=>`<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");
}
function renderHint(r){
  const pill=zipEl.value==="excel_text"
    ?`<span class="pill"><span class="dot y"></span>PLZ: Excel-safe</span>`
    :`<span class="pill"><span class="dot y"></span>PLZ: Plain</span>`;
  hint.innerHTML=r?.dbg?.length
    ?`<span class="pill"><span class="dot g"></span>OK</span> – ${r.dbg.length} Blöcke · Export: <b>${r.deduped}</b> Datensätze · ${pill}`
    :`<span class="badge"><span class="dot r"></span>Keine Datensätze</span>`;
}

function baseDbg(){ return last?.dbg?last.dbg.slice():[]; }
function filteredDbg(){
  let dbg=baseDbg();
  if(!dbg.length) return dbg;
  if(fltOn.checked){
    const needE=fltE.checked, needP=fltP.checked, needS=fltS.checked;
    dbg=dbg.filter(it=>{
      const r=it.r;
      return (needE && !r.email)||(needP && !r.phone)||(needS && !r.street);
    });
  }
  if(onlyG.checked) dbg=dbg.filter(it=>(it.r._q||qStrict(it.r))==="g");
  return dbg;
}
function sortDbg(dbg){
  const mode=sortEl.value, dup=dupFlags(dbg);
  const qv=q=>q==="g"?2:q==="y"?1:0;
  const name=r=>(nk(r.company_name)||""), city=r=>(nk(r.city)||"");
  const idx=new Map(dbg.map((it,i)=>[it,i]));
  const isD=it=>dup[idx.get(it)]?1:0;
  if(mode==="dup") return dbg.sort((A,B)=>isD(B)-isD(A) || missCount(B.r)-missCount(A.r));
  if(mode==="name") return dbg.sort((A,B)=>name(A.r).localeCompare(name(B.r))||city(A.r).localeCompare(city(B.r)));
  if(mode==="city") return dbg.sort((A,B)=>city(A.r).localeCompare(city(B.r))||name(A.r).localeCompare(name(B.r)));
  if(mode==="qasc") return dbg.sort((A,B)=>qv(A.r._q||qStrict(A.r))-qv(B.r._q||qStrict(B.r)));
  return dbg.sort((A,B)=>qv(B.r._q||qStrict(B.r))-qv(A.r._q||qStrict(A.r)));
}

function renderTable(){
  let dbg=filteredDbg();
  const mode=zipEl.value;
  dbg=sortDbg(dbg);
  const dup=dupFlags(dbg);

  const cols=["q","dup"].concat(H);
  th.innerHTML=cols.map(h=>`<th>${h}</th>`).join("");
  tb.innerHTML="";

  const n=Math.min(160, dbg.length);
  for(let i=0;i<n;i++){
    const it=dbg[i], r=it.r;
    const tr=document.createElement("tr");
    const q=r._q||qStrict(r);
    const qCell=`<span class="pill"><span class="dot ${q}"></span>${q==="g"?"Grün":q==="y"?"Gelb":"Rot"}</span>`;
    const dCell=dup[i]?`<span class="badge">⚠️ ähnlich</span>`:`<span class="muted">—</span>`;
    tr.innerHTML=[`<td>${qCell}</td>`,`<td>${dCell}</td>`].concat(H.map(h=>{
      let v=r[h]||""; if(h==="zip") v=zipFmt(v,mode);
      return `<td title="${esc(String(v))}">${esc(String(v))}</td>`;
    })).join("");
    tr.addEventListener("click",()=>openDbgFromView(it));
    tb.appendChild(tr);
  }
}

/* ===== Modal ===== */
function openDbgFromView(it){
  if(!it||!last?.dbg) return;
  sel=it; selIdx=last.dbg.indexOf(it);
  openDbg(selIdx);
}
function openDbg(idx){
  if(!last?.dbg?.[idx]) return;
  sel=last.dbg[idx]; selIdx=idx;
  const r=sel.r, u=sel.d.used||{}, mode=zipEl.value;
  ms.textContent=r.company_name?`– ${r.company_name}`:`– (Name leer)`;

  const fields=[
    ["company_name","Firma",r.company_name],
    ["street","Straße",r.street],
    ["zip","PLZ",zipFmt(r.zip,mode)],
    ["city","Ort",r.city],
    ["phone","Telefon",r.phone],
    ["email","Email",r.email],
    ["website","Website",r.website],
    ["notes","Notes",r.notes],
  ];
  kv.innerHTML=
    fields.map(([k,ph,v])=>`<div class="k">${esc(k)}</div><div class="v"><input data-k="${esc(k)}" value="${esc(v||"")}" placeholder="${esc(ph)}"></div>`).join("")+
    [
      ["Used line (Name)",u.nameLine||"(keine)"],
      ["Used line (Adresse)",u.addressLine||"(keine)"],
      ["Used line (Telefon)",u.phoneLine||"(keine)"],
      ["Used line (Email)",u.emailLine||"(keine)"],
      ["Used line (Website)",u.websiteLine||"(keine)"]
    ].map(([k,v])=>`<div class="k muted">${esc(k)}</div><div class="v muted">${esc(v||"")}</div>`).join("");

  bp.innerHTML=hiBlock(sel.d.raw||"", u);
  bd.classList.add("show");
  bd.style.display="block";
}
function closeDbg(){
  bd.classList.remove("show");
  setTimeout(()=>{ bd.style.display="none"; },160);
  sel=null; selIdx=-1;
}
x.addEventListener("click",closeDbg);
x2.addEventListener("click",closeDbg);
bd.addEventListener("click",e=>{ if(e.target===bd) closeDbg(); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape" && bd.style.display==="block") closeDbg(); });

saveFix.addEventListener("click",()=>{
  if(!sel) return;
  const inputs=[...kv.querySelectorAll("input[data-k]")];
  const r=sel.r;
  for(const inp of inputs){
    const k=inp.dataset.k;
    let v=inp.value||"";
    if(k==="zip"){ v=v.trim(); if(v.startsWith("'")) v=v.slice(1); v=v.replace(/[^\d]/g,"").slice(0,5); }
    if(k==="email") v=cleanEmail(v);
    r[k]=v;
  }
  r._q=qStrict(r);
  last.ded=dedupe(last.dbg.map(x=>x.r));
  last.deduped=last.ded.length;
  renderStats(last); renderTable(); renderHint(last);
  exp.disabled=!last.ded.length; cpy.disabled=!last.ded.length;
  saveFix.textContent="Gespeichert ✓";
  setTimeout(()=>saveFix.textContent="Speichern",900);
});
cr.addEventListener("click", async ()=>{
  if(!sel) return;
  const ok=await clip(rowLine(sel.r, zipEl.value));
  cr.textContent=ok?"Kopiert ✓":"Kopieren fehlgeschlagen";
  setTimeout(()=>cr.textContent="Zeile als CSV kopieren",1100);
});

/* ===== Analysis ===== */
function setAuto(state){
  autoPill.innerHTML=state
    ?`<span class="dot g"></span>Auto`
    :`<span class="dot y"></span>Auto`;
}
function analyze(source){
  TOK=mkTokenRes();
  clearErr();
  let raw=inEl.value||"";
  if(flowOn.checked) raw=flowSplit(raw);
  last=parseAll(raw);
  if(lastSessionFixes) last=applyFixes(last, lastSessionFixes);
  renderStats(last); renderTable(); renderHint(last);
  exp.disabled=!last.ded.length; cpy.disabled=!last.ded.length;
  if(source==="auto"){
    setAuto(true); lastAutoAt=now();
    setTimeout(()=>{ if(now()-lastAutoAt>800) setAuto(false); },850);
  }
}
go.addEventListener("click",()=>{ try{analyze("btn");}catch(e){showErr(e);} });

/* debounce auto */
function armAuto(){
  clearTimeout(debT);
  debT=setTimeout(()=>{ try{analyze("auto");}catch(e){showErr(e);} },650);
}
inEl.addEventListener("input",armAuto);
$("bl").addEventListener("input",armAuto);
$("wl").addEventListener("input",armAuto);

/* rerender only */
[fltOn,fltE,fltP,fltS,zipEl,sortEl,onlyG,flowOn].forEach(el=>el.addEventListener("change",()=>{ if(last){renderTable(); renderHint(last);} }));

/* export/copy */
exp.addEventListener("click",()=>{
  try{
    clearErr();
    if(!last?.ded?.length) return;
    const max=Math.max(1, parseInt(maxEl.value,10)||500);
    for(let i=0,n=1;i<last.ded.length;i+=max,n++) dl(`leads${n}.csv`, toCSV(last.ded.slice(i,i+max), zipEl.value));
  }catch(e){showErr(e);}
});
cpy.addEventListener("click", async ()=>{
  try{
    clearErr();
    if(!last?.ded?.length) return;
    const ok=await clip(toCSV(last.ded, zipEl.value));
    hint.innerHTML=ok
      ?`<span class="pill"><span class="dot g"></span>CSV kopiert</span>`
      :`<span class="badge"><span class="dot r"></span>Kopieren nicht möglich – nutze Export</span>`;
  }catch(e){showErr(e);}
});
clr.addEventListener("click",()=>{
  clearErr();
  inEl.value=""; st.innerHTML=""; th.innerHTML=""; tb.innerHTML=""; hint.innerHTML="";
  exp.disabled=true; cpy.disabled=true; last=null; lastSessionFixes=null; closeDbg();
});

/* normalize paragraphs */
normBtn.addEventListener("click",()=>{
  let t=inEl.value||"";
  if(flowOn.checked) t=flowSplit(t);
  inEl.value=normalizeParagraphs(t);
  try{analyze("btn");}catch(e){showErr(e);}
});

/* session save/load */
function dlJson(name,obj){
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
saveBtn.addEventListener("click",()=>{
  const session={
    v:3, ts:new Date().toISOString(),
    input: inEl.value||"",
    settings:{
      max:maxEl.value, zip:zipEl.value, bl:$("bl").value||"", wl:$("wl").value||"",
      flow:flowOn.checked, sort:sortEl.value, onlyG:onlyG.checked,
      fltOn:fltOn.checked, fltE:fltE.checked, fltP:fltP.checked, fltS:fltS.checked
    },
    fixes: last?.dbg?buildFixes(last.dbg):{}
  };
  dlJson(`lead_session_${Date.now()}.json`, session);
});
loadFile.addEventListener("change",async ()=>{
  const f=loadFile.files?.[0]; if(!f) return;
  try{
    const s=JSON.parse(await f.text());
    inEl.value=s.input||"";
    maxEl.value=s.settings?.max||"5000";
    zipEl.value=s.settings?.zip||"excel_text";
    $("bl").value=s.settings?.bl||"";
    $("wl").value=s.settings?.wl||"";
    flowOn.checked=!!s.settings?.flow;
    sortEl.value=s.settings?.sort||"qdesc";
    onlyG.checked=!!s.settings?.onlyG;
    fltOn.checked=!!s.settings?.fltOn;
    fltE.checked=s.settings?.fltE!==undefined?!!s.settings.fltE:true;
    fltP.checked=s.settings?.fltP!==undefined?!!s.settings.fltP:true;
    fltS.checked=s.settings?.fltS!==undefined?!!s.settings.fltS:true;
    lastSessionFixes=s.fixes||null;
    analyze("btn");
  }catch(e){showErr(e);}
  loadFile.value="";
});

/* initial */
setAuto(false);
