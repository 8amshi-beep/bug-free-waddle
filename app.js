/* app logic */
"use strict";

/* ---------- 工具 ---------- */
const $ = id => document.getElementById(id);
const imgFile = w => "images/" + w.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_") + ".jpg";
const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const shuffle = a => { a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const pick = (arr,n,excl) => shuffle(arr.filter(x=>x!==excl)).slice(0,n);

let AUDIO_RATE = parseFloat(localStorage.getItem("lexi_audio_rate")||"1")||1;
if(AUDIO_RATE === 0.8) AUDIO_RATE = 0.75; // 0.75x 已随新语音包恢复（0.8 曾为临时替代）
function setAudioRate(r){ AUDIO_RATE = r; try{localStorage.setItem("lexi_audio_rate", r);}catch(e){} AU.playbackRate = r; }
function speak(text, onend){
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = 0.9 * AUDIO_RATE;
    const vs = speechSynthesis.getVoices().filter(v=>v.lang&&v.lang.toLowerCase().startsWith("en"));
    if(vs.length) u.voice = vs[0];
    if(onend) u.onend = onend;
    speechSynthesis.speak(u);
  }catch(e){ if(onend) setTimeout(onend, 0); }
}
if("speechSynthesis" in window) speechSynthesis.getVoices();

/* ---------- 神经语音包：预生成 MP3 优先，缺失/失败回退系统 TTS ---------- */
const AU = new Audio();
AU.preload = "auto";
try{ AU.preservesPitch = true; }catch(e){} // 慢速时保持音调自然
function stopAudio(){
  try{ AU.pause(); }catch(e){}
  AU.onended = null; AU.onerror = null;
  try{ speechSynthesis.cancel(); }catch(e){}
}
function playMp3(src, onend, fallback){
  stopAudio();
  let done = false;
  const finish = ()=>{ if(done) return; done = true; AU.onended=null; AU.onerror=null; if(onend) onend(); };
  AU.onended = finish;
  AU.onerror = ()=>{ if(fallback) speak(fallback, onend); else finish(); };
  AU.src = src;
  AU.playbackRate = AUDIO_RATE;
  try{
    const pr = AU.play();
    if(pr && pr.catch) pr.catch(()=>{ if(fallback) speak(fallback, onend); else finish(); });
  }catch(e){ if(fallback) speak(fallback, onend); else finish(); }
}
const audW = w => "audio/w/" + w.toLowerCase().trim().replace(/[^a-z0-9]+/g,"_") + ".mp3";
const audS = i => "audio/s/" + i + ".mp3";
const audP = id => "audio/p/" + id + ".mp3";
const audPS = (id,pi,si) => "audio/p/" + id + "_" + pi + "_" + si + ".mp3";
let curPassageId = null;
function sayWord(w, onend){ playMp3(audW(w), onend, w); }
function saySenIdx(i, onend){
  const s = ALLSEN[i];
  const t = s ? s.en.replace(/____/g," ").replace(/\s+/g," ").trim() : "";
  playMp3(audS(i), onend, t);
}
function sayPassage(id, onend){
  const p = PASSAGES.find(x=>x.id===id);
  playMp3(audP(id), onend, p ? p.text.join(" ") : "");
}
function sayPassageSen(id, pi, si, onend){
  const p = PASSAGES.find(x=>x.id===id);
  let t = "";
  if(p && p.text[pi]){
    const m = p.text[pi].match(/[^.!?]+[.!?]+["\u201d']?/g) || [p.text[pi]];
    t = (m[si] || "").trim();
  }
  playMp3(audPS(id,pi,si), onend, t);
}
/* 答题后：播完单词发音再进下一题 */
function sayWordThenNext(w, ok){
  let done = false;
  const go = ()=>{ if(done || !G) return; done = true; G.i++; nextQ(); };
  sayWord(w, ()=> setTimeout(go, ok?350:900));
  setTimeout(go, 8000);
}
/* 答题后：播完句子发音再进下一题 */
function saySenThenNext(i, ok){
  let done = false;
  const go = ()=>{ if(done || !G) return; done = true; G.i++; nextQ(); };
  saySenIdx(i, ()=> setTimeout(go, ok?350:900));
  setTimeout(go, 15000);
}



/* ---------- 数据存储（按空间隔离：en=英语 / nurs=护理预科） ---------- */
let SPACE = "en";
try{ const sp = localStorage.getItem("lexi_space"); if(sp==="nurs"||sp==="en") SPACE = sp; }catch(e){}
const lsKey = () => "lexi_v2_" + SPACE;
const DEF_S = () => ({ goal:20, day:{date:"",words:[]}, learned:{}, wrong:{}, wrongSen:{}, wrongGram:{},
  total:{q:0,a:0}, streak:{last:"",days:0},
  diff:"auto", unlocked:1, ws:{}, gs:{}, nurs:{} });
let S = DEF_S();
function loadState(){ try{ const raw = localStorage.getItem(lsKey()); if(raw) S = Object.assign(DEF_S(), JSON.parse(raw)); }catch(e){ S = DEF_S(); } }
loadState();
function save(){ try{ localStorage.setItem(lsKey(), JSON.stringify(S)); }catch(e){} }
function switchSpace(sp, force){
  if(sp===SPACE && !force) return;
  save();
  SPACE = sp;
  try{ localStorage.setItem("lexi_space", sp); }catch(e){}
  loadState();
  renderSpace();
  save();
}
function renderSpace(){
  applyNursLangText();
  document.body.classList.remove("on-entry");
  document.body.classList.toggle("space-nurs", SPACE==="nurs");
  document.body.classList.toggle("space-en", SPACE!=="nurs");
  const isNurs = SPACE==="nurs";
  const isKids = SPACE==="kids";
  document.querySelectorAll(".tabbar, .sidebar").forEach(el=>el.style.display = isKids ? "none" : "");
  document.querySelectorAll(".sp-en").forEach(el=>el.style.display = isNurs ? "none" : "");
  document.querySelectorAll(".sp-nurs").forEach(el=>el.style.display = isNurs ? "" : "none");
  document.querySelectorAll(".tabbar span[data-v], .sidebar span[data-v]").forEach(s=>s.classList.remove("on"));
  document.querySelectorAll(".view").forEach(x=>x.classList.remove("on"));
  if(isKids){
    $("v-kids").classList.add("on");
    if(typeof renderKidsHome === "function") renderKidsHome();
  }else if(isNurs){
    document.querySelector('.tabbar span[data-v="v-nurs"]').classList.add("on");
    $("v-nurs").classList.add("on");
    renderToday();
  }else{
    document.querySelector('.tabbar span[data-v="v-home"]').classList.add("on");
    const sb = document.querySelector('.sidebar span[data-v="v-home"]');
    if(sb) sb.classList.add("on");
    $("v-home").classList.add("on");
    renderHome();
  }
  stopAudio();
}
const today = () => new Date().toISOString().slice(0,10);
function touchDay(){
  const t = today();
  if(S.day.date !== t){ S.day = {date:t, words:[]}; }
  if(S.streak.last !== t){
    const y = new Date(Date.now()-864e5).toISOString().slice(0,10);
    S.streak.days = (S.streak.last === y) ? S.streak.days+1 : 1;
    S.streak.last = t;
  }
}
function markSeen(w){
  touchDay();
  if(!S.day.words.includes(w)) S.day.words.push(w);
  save(); renderHome();
}
function markLearned(w){
  if(!S.learned[w]){ S.learned[w] = today(); }
  markSeen(w);
}
function addWrong(w, zh, c){
  if(!S.wrong[w]){ S.wrong[w] = {zh, c, ts:Date.now()}; save(); renderWrong(); }
}
function removeWrong(w){ if(S.wrong[w]){ delete S.wrong[w]; save(); renderWrong(); } }

/* ---------- 类目 ---------- */
const CATS = [
  {id:"nce1",zh:"新概念一册"},
  {id:"animals",zh:"动物"},{id:"food",zh:"食物"},{id:"drinks",zh:"饮品"},{id:"body",zh:"身体"},
  {id:"clothes",zh:"服装"},{id:"home",zh:"家居"},{id:"nature",zh:"自然"},{id:"vehicles",zh:"交通"},
  {id:"places",zh:"场所"},{id:"jobs",zh:"职业"},{id:"school",zh:"学校"},{id:"sports",zh:"运动"},
  {id:"verbs",zh:"动词"},{id:"adjectives",zh:"形容词"},{id:"people",zh:"人物"},{id:"colors",zh:"颜色形状"},
  {id:"music",zh:"音乐"},{id:"toys",zh:"玩具"},{id:"tools",zh:"工具"},
  {id:"time",zh:"时间日期"},{id:"numbers",zh:"数字数量"},
  {id:"function",zh:"功能词"},
  {id:"phrases",zh:"常用词组"}
];
const catZh = id => (CATS.find(c=>c.id===id)||{zh:id}).zh;
const wordsOf = cat => WORDS.filter(x=>x.c===cat);

/* ---------- 导航（底部 Tab + 侧边栏） ---------- */
/* 考试路线图（时间线） */
function renderRoadTo(el){
  const steps = [
    {u:"Unit 1", ch:"Ch 1–5 · 人体概述", ch_en:"Ch 1–5 · Body Overview", cur:true, items:[
      {t:"Quiz 1", w:"6%", d:"闭卷 50 题 / 60 分钟 · 一次机会", d_en:"Closed book · 50 Qs / 60 min · one attempt"}]},
    {u:"Unit 2", ch:"Ch 6–10 · 骨骼与肌肉", ch_en:"Ch 6–10 · Skeleton & Muscles", items:[
      {t:"Assignment 1", w:"5%", d:"简答题 · 覆盖 Ch 1–10", d_en:"Short answer · covers Ch 1–10"},
      {t:"Quiz 2", w:"6%", d:"闭卷 50 题 / 60 分钟", d_en:"Closed book · 50 Qs / 60 min"},
      {t:"Midterm 1", w:"16%", d:"考 Unit 1–2 · 需提前约考", d_en:"Covers Unit 1–2 · book ahead", big:true}]},
    {u:"Unit 3", ch:"Ch 11–15 · 神经系统", ch_en:"Ch 11–15 · Nervous System", items:[
      {t:"Quiz 3", w:"6%", d:"闭卷 50 题 / 60 分钟", d_en:"Closed book · 50 Qs / 60 min"}]},
    {u:"Unit 4", ch:"Ch 16–20 · 感觉·内分泌·心血管", ch_en:"Ch 16–20 · Senses, Endocrine & Cardiovascular", items:[
      {t:"Assignment 2", w:"5%", d:"简答题 · 覆盖 Ch 11–20", d_en:"Short answer · covers Ch 11–20"},
      {t:"Quiz 4", w:"6%", d:"闭卷 50 题 / 60 分钟", d_en:"Closed book · 50 Qs / 60 min"},
      {t:"Midterm 2", w:"16%", d:"考 Unit 3–4 · 需提前约考", d_en:"Covers Unit 3–4 · book ahead", big:true}]},
    {u:"Unit 5", ch:"Ch 21–24 · 循环·呼吸·消化", ch_en:"Ch 21–24 · Circulation, Breathing & Digestion", items:[
      {t:"Quiz 5", w:"6%", d:"闭卷 50 题 / 60 分钟", d_en:"Closed book · 50 Qs / 60 min"}]},
    {u:"Unit 6", ch:"Ch 25–29 · 泌尿·生殖·发育", ch_en:"Ch 25–29 · Urinary, Reproductive & Development", items:[
      {t:"Assignment 3", w:"5%", d:"简答题 · 覆盖 Ch 21–29", d_en:"Short answer · covers Ch 21–29"},
      {t:"Quiz 6", w:"6%", d:"闭卷 50 题 / 60 分钟", d_en:"Closed book · 50 Qs / 60 min"},
      {t:"Final Exam", w:"16%", d:"考 Unit 5–6 · 需提前约考", d_en:"Covers Unit 5–6 · book ahead", big:true}]}
  ];
  const EN = NURS_LANG==="en";
  const html = steps.map(s=>`
    <div style="display:flex;gap:12px;margin-bottom:6px">
      <div style="display:flex;flex-direction:column;align-items:center;flex:none">
        <div style="width:16px;height:16px;border-radius:50%;background:${s.cur?"var(--blue)":"#D8E2F0"};${s.cur?"box-shadow:0 0 0 5px rgba(47,125,225,.18)":""}margin-top:4px"></div>
        <div style="width:2px;flex:1;background:#E3EAF5;min-height:24px"></div>
      </div>
      <div class="gcard" style="flex:1;padding:14px;margin-bottom:14px;${s.cur?"border:1.5px solid var(--blue)":""}">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="font-weight:800;font-size:15px">${s.u}</div>
          ${s.cur?`<span style="font-size:11px;background:var(--blue);color:#fff;border-radius:8px;padding:2px 8px">${nt("road_cur")}</span>`:""}
        </div>
        <div style="font-size:12px;color:var(--sub);margin:2px 0 8px">${EN&&s.ch_en?s.ch_en:s.ch}</div>
        ${s.items.map(it=>`
          <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:${it.big?"#EEF4FF":"var(--bg)"};border-radius:10px;margin-bottom:6px">
            <div style="font-weight:700;font-size:13px;${it.big?"color:var(--blue)":""}">${it.t}</div>
            <div style="font-size:11px;background:#fff;border:1px solid var(--hair);border-radius:8px;padding:1px 7px;color:var(--sub)">${it.w}</div>
            <div style="font-size:11px;color:var(--sub);flex:1">${EN&&it.d_en?it.d_en:it.d}</div>
          </div>`).join("")}
      </div>
    </div>`).join("");
  // Quiz 1 倒计时
  let qd = "";
  try{
    const qs = localStorage.getItem("lexi_quiz1_date");
    if(qs){
      const days = Math.ceil((new Date(qs+"T00:00:00") - new Date(new Date().toDateString()))/864e5);
      const pg = nursProg();
      const left = Math.max(0, 100 - pg.score);
      const perDay = days>0 ? Math.ceil(left/days) : left;
      qd = `<div class="card" style="padding:16px;margin-bottom:14px;background:linear-gradient(135deg,#E9F2FE,#D9E9FC);border:none">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="font-size:28px">⏳</div>
          <div style="flex:1">
            <div style="font-weight:800;font-size:16px">${days>0?`${nt("quiz_countdown")} <span style="color:var(--blue)">${days}</span> ${nt("quiz_days")}`:(days===0?nt("quiz_today"):nt("quiz_past"))}</div>
            <div style="font-size:12px;color:var(--sub);margin-top:2px">${days>0?`${nt("quiz_gap")} ${pg.score} ${nt("quiz_to_goal")} ${left} ${nt("quiz_pts")}${perDay} ${nt("quiz_per_day")}`:""}</div>
          </div>
          <button class="btn ghost" id="quizDateBtn" style="padding:6px 12px;font-size:12px">${nt("quiz_change")}</button>
        </div></div>`;
    }else{
      qd = `<div class="card" style="padding:16px;margin-bottom:14px;display:flex;align-items:center;gap:10px">
        <div style="font-size:28px">📅</div>
        <div style="flex:1"><div style="font-weight:700">${nt("quiz_set_date")}</div><div style="font-size:12px;color:var(--sub)">${nt("quiz_set_sub")}</div></div>
        <input type="date" id="quizDateInput" style="padding:8px;border:1px solid var(--hair);border-radius:10px;font-size:14px">
      </div>`;
    }
  }catch(e){}
  el.innerHTML = qd + html + `
    <div class="card" style="padding:14px;font-size:12px;color:var(--sub);line-height:1.8">
      💡 95+ 策略：Quiz/Assignment 共 52%，目标拿 97%（≈50.4 分）；三次大考共 48%，拿 93% 即可总评 95。<br>
      每次约考前，先在本站把对应章节测验刷到 95%+ 再上考场。
    </div>`;
  const qdi = el.querySelector("#quizDateInput");
  if(qdi) qdi.addEventListener("change", ()=>{ try{localStorage.setItem("lexi_quiz1_date", qdi.value);}catch(e){} renderRoad(); });
  const qdb = el.querySelector("#quizDateBtn");
  if(qdb) qdb.addEventListener("click", ()=>{ try{localStorage.removeItem("lexi_quiz1_date");}catch(e){} renderRoad(); });
}
function renderRoad(){ renderRoadTo($("roadBody")); }
let EN_PHASE_NAV = false; // startEnPhase 发起的导航不结算
function go(v){
  // 英语空间：回到首页时结算阶段时间
  if(SPACE!=="nurs" && !EN_PHASE_NAV) enPhaseEnd();
  // 离开闪卡/每日练习页面时恢复底部栏
  if(v!=="v-nurs" && v!=="v-daily") document.body.classList.remove("hide-tabbar");
  document.querySelectorAll(".tabbar span[data-v], .sidebar span[data-v]").forEach(s=>
    s.classList.toggle("on", s.dataset.v===v));
  document.querySelectorAll(".view").forEach(x=>x.classList.remove("on"));
  $(v).classList.add("on");
  if(v==="v-home" && SPACE!=="nurs"){ renderEnToday(); renderHomeQuick(); }
  if(v==="v-practice") renderPractice();
  if(v==="v-mine") renderMine();
  if(v==="v-wrong") renderWrong();
  if(v==="v-set") renderSettings();
  if(v==="v-read") renderRead();
  if(v==="v-road") renderRoad();
  if(v==="v-courses") renderCourses();
  if(v==="v-progress") renderProgress();
  if(v==="v-daily"){ if(DAILY && DAILY.i < DAILY.items.length) renderDailyItem(); else { DAILY=null; renderDaily(); } }
  stopAudio();
  readState.playing = false;
  window.scrollTo(0,0);
  try{ if(typeof EarPlayer!=='undefined' && EarPlayer.updateMini) EarPlayer.updateMini(); }catch(e){}
}
document.querySelectorAll(".tabbar span[data-v], .sidebar span[data-v]").forEach(el=>{
  el.addEventListener("click", ()=> go(el.dataset.v));
});

/* ---------- 首页 ---------- */
const MODES = [
  {id:"pic2word", t:"看图选词", s:"看图选出正确的单词", g:"◐", art:"a1"},
  {id:"word2pic", t:"看词选图", s:"看单词选出正确的图", g:"▦", art:"a2"},
  {id:"listen",   t:"听音辨词", s:"听发音选出听到的词", g:"♪", art:"a3"},
  {id:"spelling", t:"拼写挑战", s:"听发音拼出完整单词", g:"✎", art:"a4"},
  {id:"cloze",    t:"选词填空", s:"句子挖空选词填入", g:"▭", art:"a5"},
  {id:"grammar",  t:"语法练习", s:"单项选择讲规则", g:"✦", art:"a6"},
  {id:"feynman",  t:"费曼复述", s:"讲出来才是真学会", g:"❝", art:"a7"},
  {id:"aichat",   t:"AI对话", s:"和AI用英语聊天", g:"💬", art:"a8"}
];
/* 每个模式的专属示意图形 */
const MART = {
pic2word:"mode-pic2word.jpg",
word2pic:"mode-word2pic.jpg",
listen:"mode-listen.jpg",
spelling:"mode-spelling.jpg",
cloze:"mode-cloze.jpg",
grammar:"mode-grammar.jpg",
feynman:"mode-feynman.jpg",
aichat:"mode-listen.jpg"
};
const QUIZZES = [
  {id:"day",   t:"每日测验", n:"10 题 · 单词+句子+语法", count:10},
  {id:"week",  t:"每周测验", n:"20 题 · 综合能力检测", count:20},
  {id:"month", t:"每月测验", n:"30 题 · 阶段学习报告", count:30}
];
/* 句子库（含新分类）与语法库 */
const ALLSEN = (typeof SENTENCES2!=="undefined") ? SENTENCES.concat(SENTENCES2) : SENTENCES;
const GRAMMARQ = (typeof GRAMMAR!=="undefined") ? GRAMMAR : [];
/* 语法难度:1初级 2中级 3高级（按题库主题顺序标注） */
GRAMMARQ.forEach((g,i)=>{
  g.d = i<20?2 : i<30?1 : i<40?1 : i<50?2 : i<60?2 : i<70?2 : i<78?3 : i<86?3 : i<94?1 : 3;
});
/* 单词难度:1初级高频 2中级 3高级低频 */
const tierOf = w => (typeof TIERS!=="undefined" && TIERS[w]) || 3;
const DIFFS = [
  {id:"auto", t:"智能"},
  {id:"1", t:"初级"},
  {id:"2", t:"中级"},
  {id:"3", t:"高级"}
];
function allowedTiers(){
  if(S.diff==="1") return [1];
  if(S.diff==="2") return [1,2];
  if(S.diff==="3") return [1,2,3];
  const u = S.unlocked||1;
  return [1,2,3].filter(t=>t<=u);
}
/* 答题统计:单词/语法各记尝试数与答对数 */
function statWord(w, ok){
  if(!w) return;
  const s = S.ws[w] || (S.ws[w] = {q:0, a:0});
  s.q++; if(ok) s.a++;
}
function statGram(i, ok){
  const s = S.gs[i] || (S.gs[i] = {q:0, a:0});
  s.q++; if(ok) s.a++;
}
const SEN_CATS = [
  {id:"all", zh:"全部"}, {id:"basic", zh:"基础日常"}, {id:"idioms", zh:"地道表达"},
  {id:"spoken", zh:"日常口语"}, {id:"work", zh:"工作英语"}, {id:"emotion", zh:"情感话题"}
];
function senCat(s){ return s.cat || "basic"; }
/* 单词速查表（选词填空用） */
const WSET = new Set(WORDS.map(x=>x.w));
const WLOW = {}; WORDS.forEach(x=>{ const k=x.w.toLowerCase(); if(!WLOW[k]) WLOW[k]=x; });
const WZH = {}; WORDS.forEach(x=>{ WZH[x.w]=x.zh; });
/* 只有含词库单词的句子才适合做选词填空 */
const CLOZEABLE = ALLSEN.filter(s=>{
  const toks = s.en.replace(/[?!.,;:'"“”]/g,"").split(/\s+/);
  return toks.some(t=> WLOW[t.toLowerCase()] && t.length>2);
});

/* 选项中文默认隐藏：点“译”显示；答题后自动全部显示 */
function zhHTML(zh){
  return `<span class="trbtn">译</span><span class="zhx" hidden>${esc(zh)}</span>`;
}
function bindTrbtn(B){
  B.querySelectorAll(".trbtn").forEach(b=> b.addEventListener("click", e=>{
    e.stopPropagation();
    const z = b.parentElement.querySelector(".zhx");
    const show = z.hidden;
    z.hidden = !show;
    b.classList.toggle("on", show);
    b.textContent = show? "收起" : "译";
  }));
}
function revealAllZh(B){
  B.querySelectorAll(".zhx").forEach(z=>{ z.hidden = false; });
  B.querySelectorAll(".trbtn").forEach(b=>{ b.classList.add("on"); b.textContent="译"; });
}
/* ---------- 英语空间 120分钟驾驶舱 ---------- */
// 答题界面下方的今日阶段进度条
function renderGamePhaseBar(){
  const bar = $("gamePhaseBar");
  if(!bar) return;
  const d = enToday();
  const names = {review:"复习",newwords:"新词",sentences:"句子",practice:"练习",reading:"跟读",fix:"错题"};
  bar.innerHTML = EN_PHASES.map(p=>{
    const done = (d.min&&d.min[p.id])||0;
    const pct = Math.min(100, Math.round(done/p.min*100));
    const isDone = done >= p.min;
    return `<div style="flex:1;min-width:0;text-align:center">
      <div style="font-size:10px;color:${isDone?"#34C759":"#8E8E93"};margin-bottom:3px;white-space:nowrap">${names[p.id]}${isDone?" ✓":""}</div>
      <div style="height:3px;background:rgba(0,0,0,.08);border-radius:2px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${isDone?"#34C759":"#007AFF"};border-radius:2px"></div></div>
    </div>`;
  }).join("");
}
function renderEnToday(){
  const d = enToday();
  const total = enTotalMin();
  const pct = Math.min(100, Math.round(total/120*100));
  const dt = new Date();
  const dateStr = (dt.getMonth()+1)+"月"+dt.getDate()+"日 星期"+"日一二三四五六".charAt(dt.getDay());
  const phases = EN_PHASES.map(p=>{
    const done = (d.min&&d.min[p.id])||0;
    const isDone = done >= p.min;
    const names = {review:"到期复习",newwords:"新词学习",
      sentences:"句子练习",practice:"综合练习",
      reading:"短文跟读",fix:"错题修复"};
    return `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;${isDone?"opacity:.6":""}">
      <div style="flex:1;min-width:0">
        <div style="font-size:15px;font-weight:600">${names[p.id]} ${isDone?'<span style="color:#34C759">✓</span>':""}</div>
        <div style="font-size:12px;color:#8E8E93">${done}/${p.min} 分钟</div>
      </div>
      <button data-enphase="${p.id}" class="ghover" style="flex:none;padding:8px 18px;font-size:13px;font-weight:700;border:none;border-radius:12px;background:#007AFF;color:#fff;cursor:pointer">${isDone?"再练":"开始"}</button>
    </div>`;
  }).join("");
  // 第一个未完成阶段
  const nextP = EN_PHASES.find(p => ((d.min&&d.min[p.id])||0) < p.min);
  const nextName = nextP ? {review:"到期复习",newwords:"新词学习",sentences:"句子练习",practice:"综合练习",reading:"短文跟读",fix:"错题修复"}[nextP.id] : "";
  // Hero: 毛玻璃拼色
  $("enTodayCockpit").innerHTML = `
    <div class="gcard" style="padding:22px 20px;background:linear-gradient(135deg,rgba(227,237,255,.7),rgba(237,231,255,.7));position:relative;overflow:hidden">
      <div style="font-size:12px;color:#636366;font-weight:600;margin-bottom:6px">${dateStr}</div>
      <div style="font-size:22px;font-weight:800;color:#1C1C1E;margin-bottom:4px">今日学习</div>
      <div style="font-size:13px;color:#636366;margin-bottom:14px">${total} / 120 分钟${total>=120?' · <span style="color:#34C759;font-weight:700">已完成 ✓</span>':""}</div>
      <div style="height:6px;background:rgba(0,0,0,.07);border-radius:4px;overflow:hidden;margin-bottom:16px"><div style="height:100%;width:${pct}%;background:#007AFF;border-radius:4px"></div></div>
      <button id="enSmartStart" class="ghover" style="width:100%;padding:14px;font-size:15px;font-weight:700;border:1px solid rgba(255,255,255,.7);border-radius:14px;background:rgba(255,255,255,.65);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);color:#007AFF;cursor:pointer;box-shadow:0 4px 16px rgba(0,122,255,.12)">开始今日学习</button>
    </div>`;
  const tp = $("todayPhases");
  tp.innerHTML = `<div class="gcard" style="padding:10px;overflow:hidden;margin-top:14px">
    ${nextP ? `<button id="todayContinue" class="ghover" style="width:100%;margin-bottom:8px;padding:13px;font-size:15px;font-weight:700;border:none;border-radius:14px;background:#007AFF;color:#fff;cursor:pointer">继续：${nextName} →</button>` : `<div style="text-align:center;padding:12px;font-size:14px;color:#34C759;font-weight:700">今日全部完成 ✓</div>`}
    ${phases}
  </div>`;
  const tc = $("todayContinue");
  if(tc) tc.addEventListener("click", ()=> startEnPhase(nextP.id));
  tp.querySelectorAll("[data-enphase]").forEach(b=>b.addEventListener("click", (e)=>{
    e.stopPropagation();
    startEnPhase(b.dataset.enphase);
  }));
  $("enSmartStart").addEventListener("click", ()=>{
    const dd = enToday();
    const next = EN_PHASES.find(p => ((dd.min&&dd.min[p.id])||0) < p.min) || EN_PHASES[0];
    startEnPhase(next.id);
  });
  tp.style.display = "none";
}
function startEnPhase(pid){
  enPhaseStart(pid);
  EN_PHASE_NAV = true;
  try{
    // 跳转到对应功能
    if(pid==="review"){
      const wp = weakWordsPool();
      if(wp && wp.length>=4){
        startGame("pic2word", null, wp);
      }else{
        // 错题不足4个：保留错题 + 自适应补足到10个
        const weak = wp || [];
        const used = new Set(weak.map(x=>x.w));
        const fill = shuffle(WORDS.filter(x=>!used.has(x.w))).slice(0, 10-weak.length);
        startGame("pic2word", null, weak.concat(fill));
      }
    }
    else if(pid==="newwords"){ startGame("pic2word"); }  // 新词学习：直接开一局看图识词（2026-10-17）
    else if(pid==="sentences"){ go("v-sen"); }
    else if(pid==="practice"){ startGame("cloze"); }  // 综合练习：直接开一局选词填空（2026-10-17）
    else if(pid==="reading"){ go("v-read"); }
    else if(pid==="fix"){ go("v-wrong"); }
  }finally{
    EN_PHASE_NAV = false;
  }
}
function weakWordsPool(){
  // 薄弱词优先：错题本词转成词对象
  const ws = Object.keys(S.wrong||{});
  if(!ws.length) return null;
  return ws.map(w=>({w, zh:S.wrong[w].zh, c:S.wrong[w].c}));
}
const MODE_COLORS = {pic2word:["#FFE8D6","#E8930C"],word2pic:["#E4E4FF","#5856D6"],listen:["#FFE8D6","#E8930C"],spelling:["#FFE0E6","#FF2D55"],cloze:["#DFF7E4","#0E7A3D"],grammar:["#EDE7FF","#AF52DE"],feynman:["#D6F5F3","#00968B"]};
function renderHome(){
  touchDay();
  enToday();
  renderEnToday();
  renderHomeQuick();
  const nw = Object.keys(S.wrong).length;
  const wb = $("wrongBadge");
  if(wb){ wb.style.display = nw? "inline-block":"none"; wb.textContent = nw>99? "99+": nw; }
}
function renderHomeQuick(){
  // 首页 2x2 网格快捷卡
  const quick = ["pic2word","listen","spelling","cloze"];
  $("homeQuick").innerHTML = quick.map(id=>{
    const m = MODES.find(x=>x.id===id);
    const [bg, fg] = MODE_COLORS[id] || ["#E8F0FE","#007AFF"];
    return `<div data-mode="${m.id}" class="gcard ghover" style="padding:20px 12px;text-align:center;background:linear-gradient(135deg,${bg}66,rgba(255,255,255,.5))">
      <div style="width:48px;height:48px;border-radius:15px;background:${bg};color:${fg};font-size:22px;display:flex;align-items:center;justify-content:center;margin:0 auto 10px">${m.g}</div>
      <div style="font-size:14px;font-weight:700;color:#1C1C1E">${m.t}</div>
      <div style="font-size:11px;color:#8E8E93;margin-top:2px">${m.s.split("，")[0]}</div>
    </div>`;
  }).join("");
  $("homeQuick").querySelectorAll("[data-mode]").forEach(el=>
    el.addEventListener("click", ()=> startGame(el.dataset.mode, null)));
}
function renderPractice(){
  // 练习页：完整模式 + 测验 + 分类
  $("diffChipsP").innerHTML = DIFFS.map(d=>
    `<span class="chip${S.diff===d.id?" on":""}" data-d="${d.id}">${d.t}</span>`).join("");
  $("diffChipsP").querySelectorAll(".chip").forEach(el=>
    el.addEventListener("click", ()=>{ S.diff = el.dataset.d; save(); renderPractice(); }));
  $("diffInfoP").textContent = S.diff==="auto"
    ? `智能进阶：已解锁${TIERNAME[S.unlocked||1]}词汇 · 当前级别正确率达 80% 自动解锁下一级`
    : `手动难度：${TIERNAME[S.diff]}词汇 · 切到"智能"可自动进阶`;
  // 挑战模式 3x3 网格
  $("practiceModes").innerHTML = MODES.map(m=>{
    const [bg, fg] = MODE_COLORS[m.id] || ["#E8F0FE","#007AFF"];
    return `<div data-mode="${m.id}" class="gcard ghover" style="padding:16px 8px;text-align:center;background:linear-gradient(135deg,${bg}55,rgba(255,255,255,.5))">
      <div style="width:42px;height:42px;border-radius:13px;background:${bg};color:${fg};font-size:19px;display:flex;align-items:center;justify-content:center;margin:0 auto 8px">${m.g}</div>
      <div style="font-size:13px;font-weight:700;color:#1C1C1E">${m.t}</div>
    </div>`;
  }).join("");
  $("practiceModes").querySelectorAll("[data-mode]").forEach(el=>
    el.addEventListener("click", ()=> startGame(el.dataset.mode, null)));
  // 阶段测验 / 单词分类：并排卡片，点击弹列表
  $("quizCardSub").textContent = QUIZZES.length + " 套测验";
  $("catCardSub").textContent = CATS.length + " 个分类";
  $("quizCard").onclick = ()=>{
    $("sheetTitle").textContent = "阶段测验";
    $("sheetBody").innerHTML = QUIZZES.map(q=>{
      const last = S.quiz && S.quiz["last_"+q.id];
      const info = last? `${last.right}/${last.total}` : "";
      return `<div data-q="${q.id}" class="ghover" style="display:flex;align-items:center;padding:12px;border-radius:12px">
        <div style="flex:1"><div style="font-size:15px;font-weight:600">${q.t}</div><div style="font-size:12px;color:#8E8E93">${q.n}</div></div>
        ${info?`<div style="font-size:13px;color:#8E8E93">${info}</div>`:""}
        <div style="color:#C7C7CC;font-size:18px;margin-left:8px">›</div>
      </div>`;
    }).join("");
    $("sheetBody").querySelectorAll("[data-q]").forEach(el=>
      el.addEventListener("click", ()=>{ closeSheet(); startQuiz(el.dataset.q); }));
    openSheet();
  };
  $("catCard").onclick = ()=>{
    $("sheetTitle").textContent = "单词分类";
    $("sheetBody").innerHTML = CATS.map(cc=>{
      const ws = wordsOf(cc.id);
      return `<div data-cat="${cc.id}" class="ghover" style="display:flex;align-items:center;padding:11px 12px;border-radius:12px">
        <div style="flex:1;font-size:15px">${cc.zh}</div>
        <div style="font-size:13px;color:#8E8E93">${ws.length}词</div>
        <div style="color:#C7C7CC;font-size:18px;margin-left:8px">›</div>
      </div>`;
    }).join("");
    $("sheetBody").querySelectorAll("[data-cat]").forEach(el=>
      el.addEventListener("click", ()=>{ closeSheet(); openCatSheet(el.dataset.cat); }));
    openSheet();
  };
}
function renderMine(){
  const days = S.streak.days||0;
  const totalQ = S.total.q||0, totalA = S.total.a||0;
  const acc = totalQ? Math.round(totalA/totalQ*100):0;
  const words = Object.keys(S.learned||{}).length;
  const nw = Object.keys(S.wrong||{}).length;
  $("mineBody").innerHTML = `
    <div class="gcard" style="padding:22px 20px;background:linear-gradient(135deg,rgba(227,237,255,.7),rgba(237,231,255,.7));margin-bottom:16px">
      <div style="font-size:13px;color:#636366;margin-bottom:12px">学习统计</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;text-align:center">
        <div><div style="font-size:26px;font-weight:800;color:#1C1C1E">${days}</div><div style="font-size:12px;color:#636366">连续天数</div></div>
        <div><div style="font-size:26px;font-weight:800;color:#1C1C1E">${words}</div><div style="font-size:12px;color:#636366">已学单词</div></div>
        <div><div style="font-size:26px;font-weight:800;color:#1C1C1E">${acc}%</div><div style="font-size:12px;color:#636366">正确率</div></div>
      </div>
    </div>
    <div class="gcard" style="padding:6px;overflow:hidden;margin-bottom:16px">
      <div data-go="v-wrong" class="ghover" style="display:flex;align-items:center;padding:13px 14px;border-radius:14px">
        <div style="flex:1;font-size:15px;font-weight:600">错题本</div>
        ${nw?`<div style="font-size:13px;color:#FF3B30;font-weight:700">${nw}</div>`:""}
        <div style="color:#C7C7CC;font-size:18px;margin-left:8px">›</div>
      </div>
    </div>
    <div class="gcard" style="padding:6px;overflow:hidden">
      <div data-go="v-set" class="ghover" style="display:flex;align-items:center;padding:13px 14px;border-radius:14px">
        <div style="flex:1;font-size:15px">设置</div>
        <div style="color:#C7C7CC;font-size:18px">›</div>
      </div>
      <div id="mineSwitch" class="ghover" style="display:flex;align-items:center;padding:13px 14px;border-radius:14px">
        <div style="flex:1;font-size:15px">切换空间</div>
        <div style="color:#C7C7CC;font-size:18px">›</div>
      </div>
    </div>`;
  $("mineBody").querySelectorAll("[data-go]").forEach(el=>
    el.addEventListener("click", ()=> go(el.dataset.go)));
  $("mineSwitch").addEventListener("click", goEntry);
  updateSideStreak();
}
function updateSideStreak(){
  if(SPACE==="nurs"){
    const nst = nursState(), td = nst.today||{min:{}};
    const nmin = Object.values(td.min||{}).reduce((a,b)=>a+(b||0),0);
    $("sideStreak").innerHTML = NURS_LANG==="zh"
      ? `🔥 连续 ${S.streak.days} 天<br>今日护理 ${nmin} / 120 分钟`
      : `🔥 ${S.streak.days}-day streak<br>Today's nursing ${nmin} / 120 min`;
  }else{
    $("sideStreak").innerHTML = "🔥 连续 " + S.streak.days + " 天<br>今日英语 " + enTotalMin() + " / 120 分钟";
  }
}
/* 新概念一册:按书中顺序分18组 */
function nceGroups(){
  const gs = [];
  for(let g=1; g<=18; g++){
    const ws = WORDS.filter(x=>x.c==="nce1" && x.g===g);
    if(ws.length) gs.push({g, n: ws.length, first: ws[0].w, last: ws[ws.length-1].w});
  }
  return gs;
}
function openCatSheet(cat, ncePool, nceLabel){
  const c = CATS.find(x=>x.id===cat);
  if(cat==="nce1" && !ncePool){
    const gs = nceGroups();
    const total = WORDS.filter(x=>x.c==="nce1").length;
    $("sheetTitle").textContent = "新概念一册 · 选择分组";
    const rowHtml = (ng, t, sub)=>`<div data-ng="${ng}" class="ghover" style="display:flex;align-items:center;padding:11px 12px;border-radius:12px">
        <div style="flex:1"><div style="font-size:15px;font-weight:${ng===0?600:400}">${t}</div><div style="font-size:12px;color:#8E8E93">${sub}</div></div>
        <div style="color:#C7C7CC;font-size:18px;margin-left:8px">›</div></div>`;
    $("sheetBody").innerHTML = rowHtml(0, `全部 ${total} 词`, "按书中顺序累计复习") +
      gs.map(gg=>rowHtml(gg.g, `第 ${gg.g} 组 · ${gg.n} 词`, `${esc(gg.first)} — ${esc(gg.last)}`)).join("");
    $("sheet").classList.add("on");
    $("sheetBody").querySelectorAll("[data-ng]").forEach(el=>
      el.addEventListener("click", ()=>{
        const g = +el.dataset.ng;
        const pool = g===0 ? WORDS.filter(x=>x.c==="nce1") : WORDS.filter(x=>x.c==="nce1" && x.g===g);
        openCatSheet("nce1", pool, g===0 ? "全部" : "第 "+g+" 组");
      }));
    return;
  }
  $("sheetTitle").textContent = c.zh + (nceLabel ? " · "+nceLabel : "") + " · 选择玩法";
  $("sheetBody").innerHTML = `<div class="mode-grid">` + MODES.map(m=>
    `<div class="mode-card card" data-m="${m.id}">
       <div class="mart ${m.art} sheet-mart"><img src="images/${MART[m.id]}" alt="${m.t}" loading="lazy"></div>
       <div class="mt" style="font-size:14px">${m.t}</div><div class="ms" style="padding-bottom:10px">${m.s}</div>
     </div>`).join("") + `</div>`;
  $("sheet").classList.add("on");
  document.querySelectorAll("#sheetBody .mode-card").forEach(b=>
    b.addEventListener("click", ()=>{ closeSheet(); startGame(b.dataset.m, cat, ncePool||null, !!ncePool); }));
}
function closeSheet(){ $("sheet").classList.remove("on"); }
function openSheet(){ $("sheet").classList.add("on"); }

/* ---------- 短文跟读 ---------- */
const READ_LV = [{id:0,t:"全部"},{id:1,t:"初级"},{id:2,t:"中级"},{id:3,t:"高级"}];
const readState = { playing:false, timer:null };
const readWordsCount = p => p.text.join(" ").split(/\s+/).filter(Boolean).length;
const splitSens = t => (t.match(/[^.!?]+[.!?]+["”']?/g) || [t]).map(s=>s.trim()).filter(Boolean);

function renderRead(){
  if(S.readLv === undefined) S.readLv = 0;
  if(!S.readDone) S.readDone = {};
  const list = PASSAGES.filter(p => !S.readLv || p.lv === S.readLv);
  const done = Object.keys(S.readDone).length;
  $("readCount").textContent = `共 ${PASSAGES.length} 篇 · 已读 ${done} 篇`;
  $("readChips").innerHTML = READ_LV.map(d=>
    `<span class="chip${S.readLv===d.id?" on":""}" data-rl="${d.id}">${d.t}</span>`).join("");
  document.querySelectorAll("#readChips .chip").forEach(el=>
    el.addEventListener("click", ()=>{ S.readLv = +el.dataset.rl; save(); renderRead(); }));
  $("readList").innerHTML = list.map((p,i)=>
    `<div class="read-card card" data-r="${p.id}">
       <div class="read-idx">${S.readDone[p.id]?"✓":(i+1)}</div>
       <div><div class="rt">${esc(p.t)}</div><div class="rz">${esc(p.zh)} · ${esc(p.d)}</div></div>
       <div class="rm"><span class="lv-badge lv${p.lv}">${TIERNAME[p.lv]}</span><br>${readWordsCount(p)} 词</div>
     </div>`).join("");
  document.querySelectorAll("#readList .read-card").forEach(el=>
    el.addEventListener("click", ()=> openRead(el.dataset.r)));
  $("readListWrap").style.display = "";
  $("readDetail").style.display = "none";
  document.querySelector("#v-read > .big-title").style.display = "";
  $("readCount").style.display = "";
  $("readChips").style.display = "";
  stopRead();
}

function readWords(p){
  const t = p.text.join(" ").toLowerCase();
  const out = [], seen = {};
  for(const x of WORDS){
    const w = x.w.toLowerCase();
    if(w.length < 4 || /[^a-z]/.test(w) || seen[w]) continue;
    try{ if(new RegExp("\\b"+w+"\\b").test(t)){ out.push(x); seen[w] = 1; if(out.length >= 10) break; } }catch(e){}
  }
  return out;
}

function openRead(id){
  const p = PASSAGES.find(x=>x.id===id); if(!p) return;
  stopRead();
  curPassageId = p.id;
  const paras = p.text.map((t,pi)=>{
    const sens = splitSens(t).map((s,si)=>
      `<span class="sen" data-pi="${pi}" data-si="${si}" data-t="${esc(s)}">${esc(s)}</span>`).join(" ");
    return `<p class="rpara">${sens}</p><p class="rtrans" hidden>${esc(p.trans[pi]||"")}</p>`;
  }).join("");
  const words = readWords(p);
  const isDone = S.readDone && S.readDone[p.id];
  $("readDetail").innerHTML = `
    <div class="rback" id="readBack" role="button" tabindex="0">‹ 返回</div>
    <div class="big-title" style="font-size:24px">${esc(p.t)}</div>
    <div class="hello" style="margin:4px 0 0">${esc(p.zh)} · ${esc(p.d)} · <span class="lv-badge lv${p.lv}">${TIERNAME[p.lv]}</span> · ${readWordsCount(p)} 词</div>
    <div class="read-ctrl">
      <button class="btn primary" id="readAllBtn">🔊 朗读全文</button>
      <button class="btn" id="followBtn">▶ 分句跟读</button>
      <button class="btn" id="transBtn">译</button>
    </div>
    <div class="card" style="padding:16px 18px">${paras}</div>
    <div class="sec">重点词汇 <span style="font-weight:400;color:var(--sub)">· 点击发音</span></div>
    <div>${words.map(w=>`<span class="wchip" data-w="${esc(w.w)}"><b>${esc(w.w)}</b> ${esc(w.zh)}</span>`).join("") || '<div class="hello">暂无</div>'}</div>
    <button class="btn primary" id="doneBtn" style="width:100%;margin-top:14px">${isDone?"✓ 已读完，再读一遍":"标为已读"}</button>`;
  $("readListWrap").style.display = "none";
  $("readDetail").style.display = "";
  document.querySelector("#v-read > .big-title").style.display = "none";
  $("readCount").style.display = "none";
  $("readChips").style.display = "none";
  window.scrollTo(0,0);
  const goBack = ()=>{ stopRead(); renderRead(); };
  $("readBack").addEventListener("click", goBack);
  $("readBack").addEventListener("keydown", e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); goBack(); } });
  $("readAllBtn").onclick = ()=>{ stopRead(); curPassageId=p.id; sayPassage(p.id); };
  $("followBtn").onclick = ()=>{ readState.playing ? stopRead() : startFollow(); };
  $("transBtn").onclick = ()=>{
    const hs = [...document.querySelectorAll("#readDetail .rtrans")];
    const show = hs.length && hs[0].hidden;
    hs.forEach(x=> x.hidden = !show);
    $("transBtn").classList.toggle("primary", !!show);
  };
  document.querySelectorAll("#readDetail .sen").forEach(el=>
    el.addEventListener("click", ()=>{ stopRead(); playSen(+el.dataset.pi, +el.dataset.si, false); }));
  document.querySelectorAll("#readDetail .wchip").forEach(el=>
    el.addEventListener("click", ()=> sayWord(el.dataset.w)));
  $("doneBtn").onclick = ()=>{
    S.readDone = S.readDone || {};
    if(S.readDone[p.id]) delete S.readDone[p.id]; else S.readDone[p.id] = 1;
    save(); openRead(p.id);
  };
}

const allSens = () => [...document.querySelectorAll("#readDetail .sen")];
function markSen(pi, si){
  const sens = allSens();
  sens.forEach(s=>s.classList.toggle("playing", s.dataset.pi==pi && s.dataset.si==si));
  const el = sens.find(s=>s.dataset.pi==pi && s.dataset.si==si);
  if(el) el.scrollIntoView({block:"center", behavior:"smooth"});
}
function playSen(pi, si, follow){
  const sens = allSens();
  const el = sens.find(s=>s.dataset.pi==pi && s.dataset.si==si);
  if(!el){ stopRead(); return; }
  markSen(pi, si);
  sayPassageSen(curPassageId, pi, si, ()=>{
    if(!follow || !readState.playing) return;
    const idx = sens.indexOf(el);
    if(idx < 0 || idx+1 >= sens.length){ stopRead(); return; }
    readState.timer = setTimeout(()=>{
      if(!readState.playing) return;
      const nx = allSens()[idx+1];
      if(nx) playSen(+nx.dataset.pi, +nx.dataset.si, true); else stopRead();
    }, 1200);
  });
}
function startFollow(){
  readState.playing = true;
  const b = $("followBtn");
  if(b){ b.textContent = "⏸ 停止跟读"; b.classList.add("primary"); }
  playSen(0, 0, true);
}
function stopRead(){
  readState.playing = false;
  clearTimeout(readState.timer);
  stopAudio();
  allSens().forEach(s=>s.classList.remove("playing"));
  const b = $("followBtn");
  if(b){ b.textContent = "▶ 分句跟读"; b.classList.remove("primary"); }
}
$("sheetMask").addEventListener("click", closeSheet);

/* ---------- 游戏引擎 ---------- */
let G = null;
function startGame(mode, cat, poolOverride, useAdaptive){
  if(mode==="feynman") return startFeynman();
  if(mode==="aichat") return startAIChat();
  let pool = poolOverride || (cat? wordsOf(cat) : WORDS);
  let qs;
  if(mode==="cloze"){ pool = CLOZEABLE; qs = shuffle(CLOZEABLE).slice(0,10); }
  else if(mode==="grammar"){
    if(!GRAMMARQ.length){ alert("语法题库加载中，请稍后再试"); return; }
    pool = GRAMMARQ; qs = pickGrammar(10);
  }
  else if(poolOverride && !useAdaptive){ qs = shuffle(pool).slice(0,10); } // 错题练习:原样出题
  else { qs = adaptivePool(10, pool); }
  if(qs.length < 4){ alert("这个分类单词太少，换个分类或难度试试"); return; }
  G = { mode, cat, pool, poolOv: poolOverride||null, useAdaptive: !!useAdaptive, qs, i:0, score:0, right:0, newToday:0 };
  $("gameView").classList.add("on");
  document.body.style.overflow = "hidden";
  renderGamePhaseBar();
  nextQ();
}
/* ============ AI 对话导师 ============ */
const AI_SCENARIOS = [
  {id:"greet", t:"日常问候", d:"打招呼、聊天气", icon:"👋",
   open:"Hi there! I'm your AI speaking partner. How are you doing today?",
   flows:[
     {k:["good","great","fine","well","nice","ok"], r:"That's great to hear! What did you do today?"},
     {k:["bad","tired","sad","busy"], r:"I see. Hope things get better! What made your day busy?"},
     {k:["weather"], r:"Good topic! How is the weather in your city today?"},
     {k:["hi","hello","hey"], r:"Hello! Nice to meet you. Tell me a little about yourself."},
   ],
   fallback:"Interesting! Can you tell me more about that?"},
  {id:"intro", t:"自我介绍", d:"介绍自己和家人", icon:"🙋",
   open:"Let's practice self-introduction! Tell me, what is your name and where are you from?",
   flows:[
     {k:["name is","i'm","my name"], r:"Nice to meet you! What do you do for work or study?"},
     {k:["from","live in"], r:"Cool! What do you like most about living there?"},
     {k:["work","job","study","student"], r:"Sounds interesting! What does a typical day look like for you?"},
     {k:["family","wife","husband","child","son","daughter"], r:"Family is important! How many people are in your family?"},
   ],
   fallback:"Good! Try adding more details, like your hobbies or your job."},
  {id:"food", t:"餐厅点餐", d:"点菜、问价格", icon:"🍔",
   open:"Welcome to Lexi Restaurant! I'm your waiter. What would you like to order today?",
   flows:[
     {k:["menu"], r:"Sure! We have burgers, pasta, salad, and fish. What sounds good?"},
     {k:["burger","pasta","salad","fish","chicken","rice","noodle"], r:"Great choice! Would you like anything to drink with that?"},
     {k:["water","coffee","tea","juice","cola","drink"], r:"Got it! Anything for dessert?"},
     {k:["cake","ice cream","dessert","no ","nothing"], r:"Perfect! Your total is $25. Cash or card?"},
     {k:["cash","card","pay"], r:"Thank you! Your food will be ready in 10 minutes. Enjoy!"},
     {k:["price","cost","how much"], r:"The burger is $12, pasta is $15, and salad is $10."},
   ],
   fallback:"Sorry, we don't have that today. Would you like a burger or pasta instead?"},
  {id:"travel", t:"旅行英语", d:"问路、订酒店", icon:"✈️",
   open:"You are traveling! You arrive at a hotel. What would you like to say to the receptionist?",
   flows:[
     {k:["room","book","reservation","check in"], r:"Welcome! May I have your name for the reservation?"},
     {k:["name is","i'm"], r:"Thank you! Your room is on the 3rd floor. Breakfast is from 7 to 10. Anything else?"},
     {k:["where","how","direction"], r:"Go straight and turn left at the corner. It's about 5 minutes on foot."},
     {k:["price","cost","how much"], r:"It's $80 per night, including breakfast."},
     {k:["thank"], r:"You're welcome! Enjoy your stay!"},
   ],
   fallback:"Could you say that again? Try asking about the room, the price, or directions."},
];
let AICHAT = null;
function startAIChat(){
  AICHAT = { sc:null, turn:0, rec:null, listening:false };
  let v = $("aiChatView");
  if(!v){
    v = document.createElement("div");
    v.id = "aiChatView";
    v.style.cssText = "position:fixed;inset:0;z-index:90;background:linear-gradient(160deg,#F8F9FA,#EDE9FE);display:none;flex-direction:column;overflow:hidden";
    v.innerHTML = `
      <div style="display:flex;align-items:center;padding:14px 18px;background:rgba(255,255,255,.65);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid rgba(0,0,0,.06)">
        <button id="aichatClose" style="border:none;background:none;font-size:24px;cursor:pointer;color:#333">‹</button>
        <div style="font-size:17px;font-weight:700;margin-left:6px">💬 AI 对话</div>
      </div>
      <div id="aichatBody" style="flex:1;overflow-y:auto;padding:18px;max-width:640px;margin:0 auto;width:100%;box-sizing:border-box"></div>
      <div style="padding:14px 18px 22px;max-width:640px;margin:0 auto;width:100%;box-sizing:border-box">
        <div id="aichatInterim" style="min-height:22px;font-size:14px;color:#8E8E93;text-align:center;margin-bottom:8px"></div>
        <div style="display:flex;gap:10px;align-items:center">
          <input id="aichatInput" placeholder="Type in English or tap 🎤 to speak…" style="flex:1;padding:13px 16px;border-radius:14px;border:1px solid rgba(0,0,0,.1);font-size:15px;background:rgba(255,255,255,.8);outline:none"/>
          <button id="aichatSend" class="ghover" style="width:48px;height:48px;border-radius:50%;border:none;background:#007AFF;color:#fff;font-size:18px;cursor:pointer;flex:none">➤</button>
          <button id="aichatMic" class="ghover" style="width:56px;height:56px;border-radius:50%;border:none;background:linear-gradient(135deg,#007AFF,#5856D6);color:#fff;font-size:24px;cursor:pointer;flex:none;box-shadow:0 6px 20px rgba(0,122,255,.35)">🎤</button>
        </div>
        <div style="text-align:center;font-size:12px;color:#8E8E93;margin-top:8px">识别不准？直接打字，照样练</div>
      </div>`;
    document.body.appendChild(v);
    $("aichatClose").onclick = stopAIChat;
    $("aichatSend").onclick = ()=>{ const t=$("aichatInput").value.trim(); if(t){ $("aichatInput").value=""; aiRespond(t); } };
    $("aichatInput").addEventListener("keydown", e=>{ if(e.key==="Enter"){ $("aichatSend").click(); } });
    $("aichatMic").onclick = ()=>{ AICHAT.listening? aiStopRec() : aiStartRec(); };
  }
  v.style.display = "flex";
  document.body.style.overflow = "hidden";
  aiShowScenarios();
}
function stopAIChat(){
  aiStopRec();
  const v = $("aiChatView");
  if(v) v.style.display = "none";
  document.body.style.overflow = "";
  AICHAT = null;
}
function aiShowScenarios(){
  const b = $("aichatBody");
  b.innerHTML = `
    <div style="text-align:center;margin:20px 0">
      <div style="font-size:44px;margin-bottom:12px">🤖</div>
      <div style="font-size:20px;font-weight:800;margin-bottom:6px">选个场景开始聊</div>
      <div style="font-size:14px;color:#8E8E93">全英文对话，AI 会纠正你的表达</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      ${AI_SCENARIOS.map(s=>`
        <div class="gcard ghover" data-sc="${s.id}" style="padding:20px;text-align:center;cursor:pointer">
          <div style="font-size:36px;margin-bottom:8px">${s.icon}</div>
          <div style="font-size:16px;font-weight:700">${s.t}</div>
          <div style="font-size:12px;color:#8E8E93;margin-top:4px">${s.d}</div>
        </div>`).join("")}
    </div>`;
  b.querySelectorAll("[data-sc]").forEach(el=>el.addEventListener("click", ()=>{
    AICHAT.sc = AI_SCENARIOS.find(x=>x.id===el.dataset.sc);
    AICHAT.turn = 0;
    $("aichatBody").innerHTML = "";
    aiSay(AICHAT.sc.open);
  }));
}
function aiMsg(who, html){
  const b = $("aichatBody");
  const d = document.createElement("div");
  if(who==="ai"){
    d.style.cssText = "background:rgba(255,255,255,.8);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.6);border-radius:18px 18px 18px 6px;padding:12px 16px;margin-bottom:12px;max-width:88%;font-size:15px;line-height:1.65;box-shadow:0 4px 14px rgba(0,0,0,.06)";
  } else {
    d.style.cssText = "background:linear-gradient(135deg,#007AFF,#5856D6);color:#fff;border-radius:18px 18px 6px 18px;padding:12px 16px;margin-bottom:12px;margin-left:auto;max-width:88%;font-size:15px;line-height:1.65;box-shadow:0 4px 14px rgba(0,122,255,.25)";
  }
  d.innerHTML = html;
  b.appendChild(d);
  b.scrollTop = b.scrollHeight;
}
function aiSay(text){
  aiMsg("ai", esc(text));
  // TTS 朗读
  saySen(text);
}
// Gemini API
function gemKey(){ return localStorage.getItem("lexi_gemini_key")||""; }
async function gemChat(messages){
  const key = gemKey();
  if(!key) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(()=>ctrl.abort(), 25000);
  try{
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${key}`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      signal: ctrl.signal,
      body: JSON.stringify({
        contents: messages.map(m=>({role:m.role==="ai"?"model":"user", parts:[{text:m.text}]})),
        systemInstruction: {parts:[{text:"You are an English conversation partner for a Chinese learner. Rules: 1) Always reply in natural, friendly English, 2-4 sentences. 2) If the user writes in Chinese, reply in English and gently encourage them to try English. 3) If the user makes an English grammar mistake, add a short correction starting with 💡 on a new line. 4) Keep it conversational, ask a follow-up question."}]},
        generationConfig:{maxOutputTokens:200, temperature:0.7}
      })
    });
    clearTimeout(timer);
    if(!r.ok) return null;
    const j = await r.json();
    if(j.candidates && j.candidates[0] && j.candidates[0].content)
      return j.candidates[0].content.parts.map(p=>p.text).join("");
    return null;
  }catch(e){ clearTimeout(timer); return null; }
}
// 规则回退（API 失败时用）
function aiRuleReply(userText){
  const sc = AICHAT.sc;
  const low = userText.toLowerCase();
  let reply = sc.fallback;
  for(const f of sc.flows){
    if(f.k.some(k=>low.includes(k))){ reply = f.r; break; }
  }
  return reply;
}
function aiRespond(userText){
  aiMsg("user", esc(userText));
  AICHAT.turn++;
  // 记录对话历史
  if(!AICHAT.hist) AICHAT.hist = [];
  AICHAT.hist.push({role:"user", text:userText});
  // 有 Gemini key 就用真 AI
  if(gemKey()){
    $("aichatInterim").textContent = "🤖 AI 思考中…";
    const msgs = [];
    if(AICHAT.sc) msgs.push({role:"user", text:`[Scenario: ${AICHAT.sc.t}] ${AICHAT.sc.open}`});
    msgs.push(...AICHAT.hist.slice(-10));
    gemChat(msgs).then(reply=>{
      $("aichatInterim").textContent = "";
      if(reply){
        AICHAT.hist.push({role:"ai", text:reply});
        aiSay(reply);
      } else {
        // API 失败 → 无缝回退规则
        const rb = aiRuleReply(userText);
        AICHAT.hist.push({role:"ai", text:rb});
        aiSay(rb);
      }
    });
    // 计入学习
    S.total.q++;
    if(userText.split(/\s+/).length>=3) S.total.a++;
    save();
    return;
  }
  // 无 key：规则回退
  const sc = AICHAT.sc;
  const low = userText.toLowerCase();
  let tip = "";
  if(/^i am go |^i go to yesterday|^he go /.test(low)) tip = `<div style="font-size:12px;color:#8E8E93;margin-top:8px;padding-top:8px;border-top:1px solid rgba(0,0,0,.08)">💡 小提示：注意时态哦</div>`;
  let reply = sc.fallback;
  for(const f of sc.flows){
    if(f.k.some(k=>low.includes(k))){ reply = f.r; break; }
  }
  setTimeout(()=>{
    if(AICHAT.turn>=6){
      aiSay(reply + " " + "We've chatted a lot! Want to try another scenario? Tap ‹ to go back.");
    } else {
      aiSay(reply + tip);
    }
  }, 800);
  // 计入学习
  S.total.q++;
  if(userText.split(/\s+/).length>=3) S.total.a++;
  save();
}
// 语音识别（增强版）
function aiStartRec(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    $("aichatInterim").textContent = "浏览器不支持语音，请直接打字";
    $("aichatInput").focus();
    return;
  }
  const rec = new SR();
  rec.lang = "en-US";
  rec.interimResults = true;   // 显示中间结果
  rec.maxAlternatives = 3;
  rec.continuous = false;
  AICHAT.rec = rec;
  AICHAT.listening = true;
  const mic = $("aichatMic");
  mic.style.background = "linear-gradient(135deg,#FF3B30,#FF9500)";
  mic.textContent = "⏹";
  $("aichatInterim").textContent = "🎤 请说英语…";
  let finalText = "";
  rec.onresult = (e)=>{
    let interim = "";
    for(let i=e.resultIndex; i<e.results.length; i++){
      const t = e.results[i][0].transcript;
      if(e.results[i].isFinal) finalText += t;
      else interim += t;
    }
    $("aichatInterim").textContent = interim || finalText || "🎤 请说英语…";
    if(finalText){ $("aichatInterim").textContent = "✓ " + finalText; }
  };
  rec.onerror = (e)=>{
    aiStopRec();
    if(e.error==="no-speech") $("aichatInterim").textContent = "没听到声音，再试一次或直接打字";
    else if(e.error==="not-allowed") $("aichatInterim").textContent = "麦克风被拒绝，请检查权限或直接打字";
    else $("aichatInterim").textContent = "识别出错，直接打字吧";
  };
  rec.onend = ()=>{
    const wasListening = AICHAT && AICHAT.listening;
    aiStopRec();
    if(wasListening && finalText.trim()){
      aiRespond(finalText.trim());
      $("aichatInterim").textContent = "";
    } else if(wasListening){
      $("aichatInterim").textContent = "没听清，再说一次或打字";
    }
  };
  try{ rec.start(); }catch(e){ aiStopRec(); }
}
function aiStopRec(){
  if(!AICHAT) return;
  AICHAT.listening = false;
  try{ if(AICHAT.rec) AICHAT.rec.abort(); }catch(e){}
  const mic = $("aichatMic");
  if(mic){ mic.style.background = "linear-gradient(135deg,#007AFF,#5856D6)"; mic.textContent = "🎤"; }
}
function endGame(){
  if(SPACE!=="nurs") enPhaseEnd();
  if(SPACE!=="nurs") renderEnToday();
  $("gameView").classList.remove("on");
  document.body.style.overflow = "";
  stopAudio();
  G = null;
}
$("gClose").addEventListener("click", endGame);

function gHead(){
  $("gProg").style.width = (G.i/G.qs.length*100) + "%";
  $("gScore").textContent = G.score;
}
function nextQ(){
  if(G.i >= G.qs.length){ return showResult(); }
  gHead();
  const q = G.qs[G.i];
  const B = $("gBody"); B.innerHTML = "";
  B.classList.toggle("split", G.mode!=="spelling" && window.innerWidth>=768);
  if(G.mode==="quiz"){ return nextQuizQ(B, q); }
  if(q && q.w) markSeen(q.w);
  if(G.mode==="pic2word") qPic2Word(B,q);
  else if(G.mode==="word2pic") qWord2Pic(B,q);
  else if(G.mode==="listen") qListen(B,q);
  else if(G.mode==="spelling") qSpelling(B,q);
  else if(G.mode==="sentence") qSentence(B,q);
  else if(G.mode==="cloze") qCloze(B,q);
  else if(G.mode==="grammar") qGrammar(B,q);
  else if(G.mode==="feynman") qFeynman(B,q);
}
function imgTag(w, cls){
  return `<img src="${imgFile(w)}" class="${cls||""}" alt="" onerror="this.outerHTML='<div class=&quot;img-ph&quot;>图片生成中…</div>'">`;
}
function onAnswer(ok, w, zh, c){
  S.total.q++; if(ok){ S.total.a++; G.score += 10; G.right++; markLearned(w); }
  else addWrong(w, zh, c);
  statWord(w, ok);
  save();
}

/* ---------- 自适应出题引擎 ---------- */
/* 同难度干扰项优先（避免用生僻词当陪衬导致靠眼熟猜答案） */
function pickDistractors(pool, q, n){
  const t = tierOf(q.w);
  let cand = pool.filter(x=>x!==q && x.w!==q.w && tierOf(x.w)===t);
  if(cand.length<n) cand = pool.filter(x=>x!==q && x.w!==q.w);
  return shuffle(cand).slice(0,n);
}
/* 自适应组卷:薄弱 40% + 新词 40% + 复习 20%, 按难度过滤 */
function adaptivePool(n, basePool){
  const tiers = allowedTiers();
  let cand = basePool.filter(x=>tiers.includes(tierOf(x.w)));
  if(cand.length<4) cand = basePool;
  const weak=[], fresh=[], rest=[];
  cand.forEach(x=>{
    const s=S.ws[x.w];
    if(!s||!s.q) fresh.push(x);
    else if(s.a/s.q<0.7) weak.push(x);
    else rest.push(x);
  });
  const out=[], used=new Set();
  const pushFrom=(arr,k)=>{
    for(const x of shuffle(arr)){
      if(out.length>=k) break;
      if(used.has(x.w)) continue;
      used.add(x.w); out.push(x);
    }
  };
  pushFrom(weak, Math.ceil(n*0.4));
  pushFrom(fresh, Math.ceil(n*0.4));
  pushFrom(rest, n);
  pushFrom(cand, n);
  return out.slice(0,n);
}
/* 语法组卷:同上逻辑 */
function pickGrammar(n){
  const tiers = allowedTiers();
  let cand = GRAMMARQ.map((g,i)=>i).filter(i=>tiers.includes(GRAMMARQ[i].d));
  if(cand.length<4) cand = GRAMMARQ.map((g,i)=>i);
  const weak=[], fresh=[], rest=[];
  cand.forEach(i=>{
    const s=S.gs[i];
    if(!s||!s.q) fresh.push(i);
    else if(s.a/s.q<0.7) weak.push(i);
    else rest.push(i);
  });
  const out=[], used=new Set();
  const pushFrom=(arr,k)=>{
    for(const i of shuffle(arr)){
      if(out.length>=k) break;
      if(used.has(i)) continue;
      used.add(i); out.push(i);
    }
  };
  pushFrom(weak, Math.ceil(n*0.4));
  pushFrom(fresh, Math.ceil(n*0.4));
  pushFrom(rest, n);
  pushFrom(cand, n);
  return out.slice(0,n).map(i=>GRAMMARQ[i]);
}
/* 智能模式:当前等级掌握 80% 且练过 20 个词 → 解锁下一级 */
const TIERNAME = {1:"初级",2:"中级",3:"高级"};
function maybeUnlock(){
  if(S.diff!=="auto") return 0;
  const t = S.unlocked||1;
  if(t>=3) return 0;
  const seen = new Set();
  WORDS.forEach(x=>{ if(tierOf(x.w)===t && S.ws[x.w] && S.ws[x.w].q>0) seen.add(x.w); });
  if(seen.size<20) return 0;
  let acc=0;
  seen.forEach(w=>{ acc += S.ws[w].a/S.ws[w].q; });
  if(acc/seen.size>=0.8){ S.unlocked=t+1; save(); return t+1; }
  return 0;
}

const TYPO_CATS = new Set(["time","numbers","function","phrases"]);  // 排印图：单词烧在图里
function qPic2Word(B, q){
  // 排除排印图分类，避免答案剧透
  const pool = G.pool.filter(w=>!TYPO_CATS.has(w.c));
  const qq = TYPO_CATS.has(q.c) ? pool[Math.floor(Math.random()*pool.length)] : q;
  const opts = shuffle([qq, ...pickDistractors(pool,qq,3)]);
  // 避免中文相同的干扰项
  const seen = new Set([qq.zh]);
  const clean = [qq];
  for(const o of opts){ if(o===qq||seen.has(o.zh)) continue; seen.add(o.zh); clean.push(o); if(clean.length===4) break; }
  let guard = 0;
  while(clean.length<4 && guard++<200){
    const f = pickDistractors(pool,qq,1)[0] || pick(pool,1,qq)[0];
    if(!f||clean.includes(f)||f.w===qq.w||seen.has(f.zh)) continue;
    seen.add(f.zh); clean.push(f);
  }
  B.innerHTML = `<div class="q-card card">${imgTag(qq.w)}
      <div class="q-sub">点击图片可朗读 · 看图选择正确的单词 · <span class="spk" id="qSpk">🔊 听发音</span></div></div>
    <div class="opts">${shuffle(clean).map(o=>
      `<div class="opt" data-w="${esc(o.w)}"><b>${esc(o.w)}</b><br>${zhHTML(o.zh)}</div>`).join("")}</div>`;
  $("qSpk").addEventListener("click", e=>{ e.stopPropagation(); sayWord(qq.w); });
  const qImg = B.querySelector(".q-card img");
  if(qImg){ qImg.style.cursor="pointer"; qImg.title="点击朗读"; qImg.addEventListener("click", e=>{ e.stopPropagation(); sayWord(qq.w); }); }
  bindTrbtn(B);
  B.querySelectorAll(".opt").forEach(el=> el.addEventListener("click", ()=>{
    if(el.classList.contains("right")||el.classList.contains("wrong")) return;
    const ok = el.dataset.w===qq.w;
    el.classList.add(ok?"right":"wrong");
    if(!ok) B.querySelector(`[data-w="${CSS.escape(qq.w)}"]`).classList.add("right");
    revealAllZh(B);
    onAnswer(ok, qq.w, qq.zh, qq.c);
    sayWordThenNext(qq.w, ok);
  }, {once:false}));
}

function qWord2Pic(B, q){
  const opts = shuffle([q, ...pickDistractors(G.pool,q,3)]);
  B.innerHTML = `<div class="q-card card">
      <div class="q-word">${esc(q.w)}</div>
      <div class="q-sub"><span class="spk" id="qSpk">🔊 听发音</span> · 选择正确的图片</div></div>
    <div class="opts">${shuffle(opts).map(o=>
      `<div class="opt" data-w="${esc(o.w)}">${imgTag(o.w)}<br>${zhHTML(o.zh)}</div>`).join("")}</div>`;
  $("qSpk").addEventListener("click", e=>{ e.stopPropagation(); sayWord(q.w); });
  sayWord(q.w);
  bindTrbtn(B);
  B.querySelectorAll(".opt").forEach(el=> el.addEventListener("click", ()=>{
    if(el.classList.contains("right")||el.classList.contains("wrong")) return;
    const ok = el.dataset.w===q.w;
    el.classList.add(ok?"right":"wrong");
    if(!ok) B.querySelector(`[data-w="${CSS.escape(q.w)}"]`).classList.add("right");
    revealAllZh(B);
    onAnswer(ok, q.w, q.zh, q.c);
    sayWordThenNext(q.w, ok);
  }));
}

function qListen(B, q){
  const opts = shuffle([q, ...pickDistractors(G.pool,q,3)]);
  B.innerHTML = `<div class="q-card card">
      <div class="big-spk" id="qSpk">♪</div>
      <div class="q-sub">仔细听，选择你听到的单词 · <span class="spk" id="qSpk2">再听一遍</span></div></div>
    <div class="opts">${shuffle(opts).map(o=>
      `<div class="opt" data-w="${esc(o.w)}"><b>${esc(o.w)}</b><br>${zhHTML(o.zh)}</div>`).join("")}</div>`;
  const play = ()=>sayWord(q.w);
  $("qSpk").addEventListener("click", play); $("qSpk2").addEventListener("click", play);
  setTimeout(play, 400);
  bindTrbtn(B);
  B.querySelectorAll(".opt").forEach(el=> el.addEventListener("click", ()=>{
    if(el.classList.contains("right")||el.classList.contains("wrong")) return;
    const ok = el.dataset.w===q.w;
    el.classList.add(ok?"right":"wrong");
    if(!ok) B.querySelector(`[data-w="${CSS.escape(q.w)}"]`).classList.add("right");
    revealAllZh(B);
    onAnswer(ok, q.w, q.zh, q.c);
    sayWordThenNext(q.w, ok);
  }));
}

function qSpelling(B, q){
  const word = q.w.replace(/[^a-z]/gi,"").toLowerCase();
  // 降低难度：预填首字母（长词预填前2个）
  const prefill = word.length >= 7 ? 2 : 1;
  const letters = shuffle(word.slice(prefill).split(""));
  B.innerHTML = `<div class="q-card card">${imgTag(q.w)}
      <div class="q-sub">看图拼出这个单词 · “${esc(q.zh)}” · <span class="spk" id="qSpk">🔊 听发音</span>
      <span class="spk" id="qHint" style="margin-left:8px">💡 提示 (<span id="hintLeft">2</span>)</span></div></div>
    <div class="answer-slots" id="slots">${word.split("").map(()=>'<div class="slot"></div>').join("")}</div>
    <div class="letters" id="letters">${letters.map((l,i)=>`<div class="letter" data-i="${i}">${l}</div>`).join("")}</div>`;
  $("qSpk").addEventListener("click", ()=>sayWord(q.w));
  const slots = B.querySelectorAll(".slot"), btns = B.querySelectorAll(".letter");
  let pos = prefill, wrong = false, hints = 2;
  // 预填
  for(let i=0;i<prefill;i++){ slots[i].textContent = word[i]; slots[i].classList.add("fill"); slots[i].style.opacity=".55"; }
  function finishSpell(){
    onAnswer(!wrong, q.w, q.zh, q.c);
    B.querySelector(".q-card").style.border = "2px solid " + (!wrong? "#34C759":"#FF3B30");
    setTimeout(()=>{ G.i++; nextQ(); }, 900);
  }
  let lastTap = 0;
  const dedup = ()=>{ const n=Date.now(); if(n-lastTap<400) return true; lastTap=n; return false; };
  const onLetter = (b)=>{
    if(dedup()) return;
    if(b.classList.contains("used")||pos>=word.length) return;
    const l = word[pos];
    if(b.textContent===l){
      slots[pos].textContent = l; slots[pos].classList.add("fill");
      b.classList.add("used"); pos++;
      if(pos===word.length) finishSpell();
    } else { wrong = true; b.classList.add("wrong"); setTimeout(()=>b.classList.remove("wrong"),350); }
  };
  btns.forEach(b=>{
    b.addEventListener("click", ()=>onLetter(b));
    // 桌面端兜底：部分自动化/浏览器 click 不触发时用 pointerdown
    b.addEventListener("pointerdown", (e)=>{ if(e.pointerType==="mouse") onLetter(b); });
  });
  // 提示按钮同样加 pointerdown 兜底
  const hintBtn = $("qHint");
  const onHint = ()=>{
    if(dedup()) return;
    if(hints<=0 || pos>=word.length) return;
    hints--; $("hintLeft").textContent = hints;
    const target = word[pos];
    const btn = [...btns].find(x=>!x.classList.contains("used") && x.textContent===target);
    if(btn){ btn.classList.add("used"); }
    slots[pos].textContent = target; slots[pos].classList.add("fill");
    pos++;
    if(pos===word.length) finishSpell();
  };
  hintBtn.addEventListener("click", onHint);
  hintBtn.addEventListener("pointerdown", (e)=>{ if(e.pointerType==="mouse"){ e.preventDefault(); onHint(); } });
  // 监听器都绑完再播发音
  setTimeout(()=>sayWord(q.w), 50);
}

function qSentence(B, s){
  const idx = ALLSEN.indexOf(s);
  const distract = shuffle(ALLSEN.filter(x=>x!==s)).slice(0,3);
  const opts = shuffle([s, ...distract]);
  // 句子中的词库单词：答题计入单词统计，与单词学习打通
  const vocab = [...new Set(s.en.replace(/[?!.,;:'"“”]/g,"").split(/\s+/)
    .map(t=>WLOW[t.toLowerCase()]).filter(Boolean).map(e=>e.w))];
  B.innerHTML = `<div class="q-card card">
      <div style="font-size:19px;font-weight:700;line-height:1.7">${esc(s.zh)}</div>
      <div class="q-sub">选择正确的英文表达</div></div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px" id="senOpts">
      ${opts.map(o=>`<div class="opt" data-ok="${o===s?1:0}" style="text-align:left;padding:14px 16px;font-size:15px">${esc(o.en)}</div>`).join("")}
    </div>`;
  B.querySelectorAll("#senOpts .opt").forEach(el=> el.addEventListener("click", ()=>{
    if(el.classList.contains("right")||el.classList.contains("wrong")) return;
    const ok = el.dataset.ok==="1";
    el.classList.add(ok?"right":"wrong");
    if(!ok) B.querySelector('[data-ok="1"]').classList.add("right");
    S.total.q++; if(ok){S.total.a++;G.score+=10;G.right++;} else { S.wrongSen[idx]={ts:Date.now()}; }
    // 融汇贯通：句子里练到的单词同步更新单词统计与今日进度
    touchDay();
    vocab.forEach(w=>{
      statWord(w, ok);
      if(!S.day.words.includes(w)) S.day.words.push(w);
    });
    save();
    saySenThenNext(idx, ok); // 播报正确英文句子，播完再进下一题
  }));
}

/* 选词填空：句子挖空，从单词库找可挖的词 */
function qCloze(B, s){
  const idx = ALLSEN.indexOf(s);
  const clean = s.en.replace(/[?!.,;:'"“”]/g,"");
  const toks = clean.split(/\s+/);
  let cands = toks.filter(t=> WLOW[t.toLowerCase()] && t.length>2);
  const tiers = allowedTiers();
  const inTier = cands.filter(t=> tiers.includes(tierOf(WLOW[t.toLowerCase()].w)));
  if(inTier.length) cands = inTier;
  const target = cands[Math.floor(Math.random()*cands.length)];
  const entry = WLOW[target.toLowerCase()];
  const key = entry.w, zhT = entry.zh;
  const blanked = s.en.replace(new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"), "i"),
    `<span class="blank">&nbsp;</span>`);
  const tTier = tierOf(key);
  let distPool = WORDS.filter(x=> x.w!==key && tierOf(x.w)===tTier);
  if(distPool.length<12) distPool = WORDS.filter(x=>x.w!==key);
  const sameInit = distPool.filter(x=> x.w[0]===key[0]);
  const dist = shuffle(sameInit.length>=3? sameInit : distPool).slice(0,3);
  const opts = shuffle([{w:key, zh:zhT}, ...dist.map(x=>({w:x.w, zh:x.zh}))]);
  B.innerHTML = `<div class="q-card card">
      <div class="cloze-en">${blanked}</div>
      <div class="q-sub">${esc(s.zh)} · <span class="spk" id="qSpk">🔊 朗读句子</span></div></div>
    <div class="opts">${opts.map(o=>
      `<div class="opt" data-w="${esc(o.w)}"><b>${esc(o.w)}</b><br>${zhHTML(o.zh||"")}</div>`).join("")}</div>`;
  $("qSpk").addEventListener("click", e=>{ e.stopPropagation(); saySenIdx(idx); });
  bindTrbtn(B);
  B.querySelectorAll(".opt").forEach(el=> el.addEventListener("click", ()=>{
    if(el.classList.contains("right")||el.classList.contains("wrong")) return;
    const ok = el.dataset.w===key;
    el.classList.add(ok?"right":"wrong");
    if(!ok) B.querySelector(`[data-w="${CSS.escape(key)}"]`).classList.add("right");
    revealAllZh(B);
    S.total.q++; if(ok){ S.total.a++; G.score+=10; G.right++; markLearned(key); }
    else { addWrong(key, zhT, ""); S.wrongSen["c"+idx]={ts:Date.now()}; }
    save();
    saySenThenNext(idx, ok); // 答题后朗读完整正确句子，播完再进下一题
  }));
}

/* 语法练习 */
function qGrammar(B, g){
  const idx = GRAMMARQ.indexOf(g);
  const shown = g.q.replace("___", `<span class="blank">&nbsp;</span>`);
  B.innerHTML = `<div class="q-card card">
      <div class="cloze-en">${shown}</div>
      <div class="q-sub">选择正确的答案</div></div>
    <div class="opts">${shuffle(g.options.map((t,i)=>({t, i}))).map(o=>
      `<div class="opt" data-i="${o.i}" style="font-size:18px"><b>${esc(o.t)}</b></div>`).join("")}</div>
    <div class="tip" id="gTip" hidden>💡 ${esc(g.tip)}</div>`;
  B.querySelectorAll(".opt").forEach(el=> el.addEventListener("click", ()=>{
    if(el.classList.contains("right")||el.classList.contains("wrong")) return;
    const ok = +el.dataset.i===g.a;
    el.classList.add(ok?"right":"wrong");
    if(!ok) B.querySelector(`[data-i="${g.a}"]`).classList.add("right");
    $("gTip").hidden = false;
    S.total.q++; if(ok){ S.total.a++; G.score+=10; G.right++; }
    else { S.wrongGram = S.wrongGram||{}; S.wrongGram[idx]={ts:Date.now()}; }
    statGram(idx, ok);
    save();
    /* 答题后不再自动跳转：显示"下一题"按钮，看完解析再手动进下一题 */
    if(!$("gNext")){
      const nb = document.createElement("button");
      nb.className = "btn primary"; nb.id = "gNext"; nb.textContent = "下一题 →";
      nb.style.marginTop = "14px";
      nb.addEventListener("click", ()=>{ G.i++; nextQ(); });
      B.appendChild(nb);
      nb.scrollIntoView({block:"nearest", behavior:"smooth"});
    }
  }));
}

/* ---------- 费曼复述：主动回忆 → 对照答案 → 自评查漏 ---------- */
function startFeynman(){
  const tiers = allowedTiers();
  const items = [], seenW = new Set();
  // 单词:错题 + 薄弱优先, 不足用同难度新词补
  const weakW = shuffle(WORDS.filter(x=>{
    const s=S.ws[x.w]; return s&&s.q>0&&s.a/s.q<0.7&&tiers.includes(tierOf(x.w));
  }));
  const wrongW = Object.keys(S.wrong||{});
  const wordItems = [];
  const pushW = x=>{
    if(!x||seenW.has(x.w)||wordItems.length>=6) return;
    seenW.add(x.w); wordItems.push(x);
  };
  wrongW.forEach(w=>{ const v=S.wrong[w]; pushW({w, zh:v.zh, c:v.c}); });
  weakW.forEach(pushW);
  shuffle(WORDS).forEach(x=>{
    if(wordItems.length>=6) return;
    if(!tiers.includes(tierOf(x.w))) return;
    if(S.ws[x.w]&&S.ws[x.w].q>0) return;
    pushW(x);
  });
  wordItems.forEach(w=>items.push({kind:"word", ref:w}));
  // 句子:错句优先
  shuffle(Object.keys(S.wrongSen||{})).slice(0,2).forEach(k=>{
    const s = String(k)[0]==="c" ? ALLSEN[+String(k).slice(1)] : ALLSEN[+k];
    if(s) items.push({kind:"sen", ref:s});
  });
  // 语法:薄弱优先
  shuffle(GRAMMARQ.map((g,i)=>i).filter(i=>{
    const s=S.gs[i]; return s&&s.q>0&&s.a/s.q<0.7&&tiers.includes(GRAMMARQ[i].d);
  })).slice(0,2).forEach(i=>items.push({kind:"gram", ref:GRAMMARQ[i]}));
  const qs = shuffle(items).slice(0,10);
  if(!qs.length){ alert("先去学习一些内容，再来复述吧"); return; }
  G = { mode:"feynman", pool:[], qs, i:0, score:0, right:0 };
  $("gameView").classList.add("on");
  document.body.style.overflow = "hidden";
  nextQ();
}
function qFeynman(B, it){
  const kind = it.kind, ref = it.ref;
  let prompt, answer, speakText;
  if(kind==="word"){
    prompt = `${imgTag(ref.w)}<div class="q-sub">看着图，在心里或大声说出这个单词，再用它造个句子</div>`;
    answer = `<div class="q-word" style="letter-spacing:2px">${esc(ref.w)}</div>
      <div class="q-sub">${esc(ref.zh)} · <span class="spk" id="fSpk">🔊 听发音</span></div>`;
    speakText = ref.w;
  } else if(kind==="sen"){
    prompt = `<div style="font-size:20px;font-weight:700;line-height:1.8">${esc(ref.zh)}</div>
      <div class="q-sub">把这句话翻译成英语，大声说出来</div>`;
    answer = `<div style="font-size:19px;font-weight:700;line-height:1.7">${esc(ref.en)}</div>
      <div class="q-sub"><span class="spk" id="fSpk">🔊 朗读</span></div>`;
    speakText = ref.en;
  } else {
    prompt = `<div class="cloze-en">${ref.q.replace("___",'<span class="blank">&nbsp;</span>')}</div>
      <div class="q-sub">说出答案，并讲出这条语法规则</div>`;
    answer = `<div class="cloze-en">${ref.q.replace("___",`<b style="color:var(--blue)">${esc(ref.options[ref.a])}</b>`)}</div>
      <div class="tip">💡 ${esc(ref.tip)}</div>`;
    speakText = ref.q.replace(/___/g, ref.options[ref.a]);
  }
  B.innerHTML = `<div class="q-card card">${prompt}
      <button class="btn primary" id="fShow" style="margin-top:16px">对照答案</button></div>
    <div id="fAns" hidden></div>`;
  $("fShow").addEventListener("click", ()=>{
    $("fAns").innerHTML = `<div class="card" style="margin-top:14px;padding:18px;text-align:center">${answer}
      <div class="q-sub" style="margin-top:14px">你刚才讲清楚了吗？诚实自评</div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:10px;flex-wrap:wrap">
        <button class="btn ghost" data-r="2">${nt("fy_r2")}</button>
        <button class="btn ghost" data-r="1">${nt("fy_r1")}</button>
        <button class="btn ghost" data-r="0">${nt("fy_r0")}</button></div></div>`;
    $("fAns").hidden = false;
    $("fShow").style.display = "none";
    const spk = $("fSpk");
    const sayRef = ()=>{
      if(kind==="word") sayWord(ref.w);
      else if(kind==="sen"){ const i = ALLSEN.indexOf(ref); i>=0 ? saySenIdx(i) : speak(speakText); }
      else speak(speakText);
    };
    if(spk) spk.addEventListener("click", sayRef);
    sayRef();
    $("fAns").querySelectorAll("[data-r]").forEach(b=> b.addEventListener("click", ()=>{
      onFeynmanRate(it, +b.dataset.r);
      setTimeout(()=>{ G.i++; nextQ(); }, 600);
    }));
  });
}
function onFeynmanRate(it, r){
  const ok = r===2;
  S.total.q++; if(ok){ S.total.a++; G.score+=10; G.right++; }
  if(it.kind==="word"){
    statWord(it.ref.w, ok);
    if(ok) markLearned(it.ref.w);
    else addWrong(it.ref.w, it.ref.zh, it.ref.c||"");
  } else if(it.kind==="gram"){
    const i = GRAMMARQ.indexOf(it.ref);
    statGram(i, ok);
    if(!ok){ S.wrongGram=S.wrongGram||{}; S.wrongGram[i]={ts:Date.now()}; }
  } else {
    const i = ALLSEN.indexOf(it.ref);
    if(!ok) S.wrongSen["c"+i]={ts:Date.now()};
  }
  save();
}

/* ---------- 阶段测验（多邻国式混合题型） ---------- */
function startQuiz(period){
  const meta = QUIZZES.find(x=>x.id===period);
  const N = meta.count;
  const wordModes = ["pic2word","word2pic","listen","spelling"];
  const wq = adaptivePool(Math.round(N*0.45), WORDS)
    .map(w=>({kind:"word", sub:wordModes[Math.floor(Math.random()*wordModes.length)], ref:w}));
  const cq = shuffle(CLOZEABLE).slice(0, Math.round(N*0.30))
    .map(s=>({kind:"cloze", ref:s}));
  const gq = pickGrammar(Math.max(0, N - wq.length - cq.length))
    .map(g=>({kind:"grammar", ref:g}));
  const qs = shuffle([...wq, ...cq, ...gq]);
  if(qs.length < 4){ alert("题库不足，请稍后再试"); return; }
  G = { mode:"quiz", period, pool:WORDS, qs, i:0, score:0, right:0 };
  $("gameView").classList.add("on");
  document.body.style.overflow = "hidden";
  nextQ();
}
function nextQuizQ(B, q){
  if(q.kind==="word"){
    const w = q.ref; markSeen(w.w);
    const m = q.sub;
    if(m==="pic2word") qPic2Word(B,w);
    else if(m==="word2pic") qWord2Pic(B,w);
    else if(m==="listen") qListen(B,w);
    else qSpelling(B,w);
  }
  else if(q.kind==="cloze") qCloze(B, q.ref);
  else if(q.kind==="grammar") qGrammar(B, q.ref);
}

function showResult(){
  const acc = G.qs.length? Math.round(G.right/G.qs.length*100):0;
  $("gProg").style.width = "100%";
  let extra = "";
  const unlocked = maybeUnlock();
  if(unlocked) extra += `<p style="color:var(--blue);font-weight:700">🎉 太棒了！${TIERNAME[unlocked]}词汇已解锁，新单词会逐步加入练习</p>`;
  if(G.mode==="quiz"){
    const rec = { t: Date.now(), period: G.period, right: G.right, total: G.qs.length, acc };
    S.quiz = S.quiz||{history:[]};
    S.quiz.history.push(rec);
    if(S.quiz.history.length>60) S.quiz.history = S.quiz.history.slice(-60);
    S.quiz["last_"+G.period] = { right:G.right, total:G.qs.length, ts:Date.now() };
    save();
    const qn = QUIZZES.find(x=>x.id===G.period).t;
    extra = `<p style="color:var(--sub);font-size:13px">${qn}已记录 · 可在首页查看上次成绩</p>`;
  }
  const mode = G.mode, period = G.period, cat = G.cat, wrongPool = G.wrongMode ? G.pool : null;
  /* 右下角悬浮按钮：直接进入下一个挑战模式 */
  const mi = MODES.findIndex(m=>m.id===mode);
  const nextFab = (mi>=0 && !G.wrongMode) ? (()=>{ const nm = MODES[(mi+1)%MODES.length];
    return `<div class="next-fab" id="nextFab">下一个：${nm.t} →</div>`; })() : "";
  $("gBody").innerHTML = `<div class="result">
    <div class="big">${acc===100?"🎉":acc>=60?"👍":"💪"}</div>
    <h2>${acc===100?"完美！":acc>=60?"不错，继续加油":"多练习就会进步"}</h2>
    <p>答对 ${G.right} / ${G.qs.length} 题 · 正确率 ${acc}%<br>本轮得分 ${G.score} 分</p>
    ${extra}
    <button class="btn primary" id="rAgain">再来一轮</button>
    <button class="btn ghost" id="rBack">返回</button></div>${nextFab}`;
  renderHome();
  $("rAgain").addEventListener("click", ()=>{
    if(wrongPool) startWrongQuiz(wrongPool);
    else if(mode==="quiz") startQuiz(period);
    else startGame(mode, cat||null, G.poolOv||null, G.useAdaptive||false);
  });
  $("rBack").addEventListener("click", endGame);
  const nf = $("nextFab");
  if(nf) nf.addEventListener("click", ()=>{ const nm = MODES[(mi+1)%MODES.length]; startGame(nm.id, null); });
}

/* ---------- 错题本 ---------- */
function renderWrong(){
  const isNurs = (typeof SPACE!=="undefined" && SPACE==="nurs");
  $("wrongNurs").style.display = isNurs ? "" : "none";
  $("wrongEn").style.display = isNurs ? "none" : "";
  if(isNurs){ renderNursWrong(); return; }
  const ws = Object.entries(S.wrong).sort((a,b)=>b[1].ts-a[1].ts);
  $("wrongCountW").textContent = "（"+ws.length+"）";
  $("wrongWords").innerHTML = ws.length? (
    `<button class="btn primary" id="wQuiz" style="margin-bottom:12px">开始错题练习（${Math.min(10,ws.length)} 题）</button>` +
    ws.map(([w,v])=>`<div class="wrong-item card">
      <img src="${imgFile(w)}" alt="" loading="lazy" onerror="this.style.display='none'">
      <div><div class="w">${esc(w)}</div><div class="z">${esc(v.zh)} · ${catZh(v.c)}</div></div>
      <div class="rm" data-w="${esc(w)}">已掌握 ✕</div></div>`).join("")
  ) : `<div class="empty">🎉 错题本是空的<br>答错的单词会自动出现在这里</div>`;
  const wq = $("wQuiz");
  if(wq) wq.addEventListener("click", ()=>{
    const pool = ws.slice(0,20).map(([w,v])=>({w, zh:v.zh, c:v.c}));
    startWrongQuiz(pool);
  });
  document.querySelectorAll("#wrongWords .rm").forEach(el=>
    el.addEventListener("click", ()=> removeWrong(el.dataset.w)));
  const ss = Object.entries(S.wrongSen).sort((a,b)=>b[1].ts-a[1].ts);
  $("wrongCountS").textContent = "（"+ss.length+"）";
  $("wrongSens").innerHTML = ss.length? ss.map(([i])=>{
    const key = String(i);
    const s = key[0]==="c" ? ALLSEN[+key.slice(1)] : ALLSEN[+key];
    if(!s) return "";
    return `<div class="sen-card card"><div class="en">${esc(s.en)}</div><div class="zh">${esc(s.zh)}</div>
      <span class="rm" data-i="${key}" style="color:#8E8E93;font-size:13px;cursor:pointer">已掌握 ✕</span></div>`;
  }).join("") : `<div class="empty">暂无错句</div>`;
  document.querySelectorAll("#wrongSens .rm").forEach(el=>
    el.addEventListener("click", ()=>{ delete S.wrongSen[el.dataset.i]; save(); renderWrong(); }));
  const nw = ws.length;
  $("wrongBadge").style.display = nw? "inline-block":"none";
  $("wrongBadge").textContent = nw>99? "99+": nw;
}
/* 护理错题本 */
function renderNursWrong(){
  const st = nursState();
  const ws = st.wrong.slice().reverse();
  $("wrongNurs").innerHTML = `
    <div class="sec">${nt("wrong_title")} <span>(${ws.length})</span></div>
    ${ws.length?`<button class="btn primary" id="nwGo" style="margin-bottom:12px">${nt("wrong_go")}</button> <button class="btn" id="nwExport" style="margin-bottom:12px">${nt("wrong_export")}</button>`:""}
    ${ws.length? ws.map(w=>{
      const isTF = w.t==="tf";
      // 从当前题库取最新答案（防止题库修复后旧错题答案过期）
      const fresh = NURS_CH1.quiz.find(q=>q.q===w.q);
      const curA = fresh ? fresh.a : w.a;
      const opts = isTF ? (NURS_LANG==="en"?["True","False"]:["正确 True","错误 False"]) : (w.o||[]);
      return `<div class="gcard" style="padding:14px;margin-bottom:10px;border-left:4px solid #FF9500">
        <div style="font-size:12px;color:var(--sub);margin-bottom:4px">${w.g||""} ${nursSecName(w.g)}</div>
        <div style="font-weight:600;font-size:14px;line-height:1.6">${esc(w.q)}</div>
        <div style="font-size:13px;margin-top:6px;color:var(--sub)">${nt("your_ans")}: ${(w.mine>=0&&opts[w.mine])?esc(opts[w.mine]):nt("not_answered")}<br>${nt("correct_ans")}: <b style="color:#34C759">${opts[curA]?esc(opts[curA]):""}</b></div>
        <div class="tip" style="margin-top:8px;font-size:13px">💡 ${esc(w.e||"")}</div>
        <div class="rm" data-q="${esc(w.q)}" style="color:var(--sub);font-size:13px;cursor:pointer;margin-top:8px">${nt("wrong_mastered")}</div>
      </div>`;
    }).join("") : `<div class="empty">${nt("wrong_empty")}<br>${nt("wrong_empty_s")}</div>`}`;
  const g = $("nwGo");
  if(g) g.addEventListener("click", ()=>startDaily());
  const ex = $("nwExport");
  if(ex) ex.addEventListener("click", exportNursWrong);
  $("wrongNurs").querySelectorAll(".rm").forEach(el=>
    el.addEventListener("click", ()=>{ nursWrongFixed(el.dataset.q); renderNursWrong(); }));
  const bd = ws.length? "inline-block":"none", tx = ws.length>99? "99+": ws.length;
  $("wrongBadge").style.display = bd; $("wrongBadge").textContent = tx;
  ["nursWrongBadge","nursWrongBadgeM"].forEach(id=>{ const nb=$(id); if(nb){ nb.style.display=bd; nb.textContent=tx; } });
}
function exportNursWrong(){
  const st = nursState();
  const ws = st.wrong.slice().reverse();
  if(!ws.length) return;
  const date = new Date().toISOString().slice(0,10);
  const title = NURS_LANG==="en" ? "Nursing Mistakes" : "护理预科错题本";
  const items = ws.map((w,i)=>{
    const isTF = w.t==="tf";
    const fresh = NURS_CH1.quiz.find(q=>q.q===w.q);
    const curA = fresh ? fresh.a : w.a;
    const opts = isTF ? ["True","False"] : (w.o||[]);
    const letters = ["A","B","C","D","E","F"];
    const optsHtml = opts.map((o,oi)=>{
      const cls = oi===curA ? "correct" : (oi===w.mine ? "mine" : "");
      const mark = oi===curA ? " ✓" : (oi===w.mine ? " ✗" : "");
      return `<div class="opt ${cls}"><b>${letters[oi]||""}.</b> ${esc(o)}${mark}</div>`;
    }).join("");
    return `<div class="q">
      <div class="meta">${i+1}. ${esc(w.g||"")} ${esc(nursSecName(w.g))}</div>
      <div class="qq">${esc(w.q)}</div>
      ${optsHtml}
      ${w.e?`<div class="exp">💡 ${esc(w.e)}</div>`:""}
    </div>`;
  }).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${esc(title)} ${date}</title>
<style>
body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;max-width:760px;margin:0 auto;padding:24px;color:#1d1d1f}
h1{font-size:22px;border-bottom:2px solid #007AFF;padding-bottom:8px}
.sub{color:#86868b;font-size:13px;margin-bottom:20px}
.q{border:1px solid #e5e5ea;border-radius:10px;padding:14px;margin-bottom:14px;page-break-inside:avoid}
.meta{font-size:12px;color:#86868b;margin-bottom:6px}
.qq{font-weight:600;font-size:15px;line-height:1.6;margin-bottom:8px}
.opt{font-size:14px;padding:4px 0}
.opt.correct{color:#1a7f37;font-weight:600}
.opt.mine{color:#c92a2a;text-decoration:line-through}
.exp{font-size:13px;color:#555;margin-top:8px;background:#f5f5f7;border-radius:8px;padding:8px 10px}
@media print{.q{box-shadow:none}}
</style></head><body>
<h1>${esc(title)}</h1>
<div class="sub">${date} · ${ws.length} ${NURS_LANG==="en"?"mistakes":"道错题"} </div>
${items}
</body></html>`;
  const blob = new Blob([html], {type:"text/html;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "lexi-nurs-wrong-" + date + ".html";
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
}
function startWrongQuiz(pool){
  // 错题练习：答对即从错题本移除
  const qs = shuffle(pool).slice(0,10);
  G = { mode:"pic2word", pool, qs, i:0, score:0, right:0, wrongMode:true };
  $("gameView").classList.add("on");
  document.body.style.overflow = "hidden";
  const origNext = nextQ;
  nextQ();
  // 劫持 onAnswer：答对移除错题
  const _onAnswer = onAnswer;
  onAnswer = function(ok,w,zh,c){ _onAnswer(ok,w,zh,c); if(ok) removeWrong(w); };
  const _show = showResult;
  showResult = function(){ onAnswer = _onAnswer; showResult = _show; _show(); };
}

/* ---------- 句子 ---------- */
let senFilter = "all";
function renderSenList(){
  $("senCount").textContent = ALLSEN.length + " 条 · 点击练习开始挑战";
  $("senChips").innerHTML = SEN_CATS.map(c=>{
    const n = c.id==="all"? ALLSEN.length : ALLSEN.filter(s=>senCat(s)===c.id).length;
    return `<span class="chip${senFilter===c.id?" on":""}" data-c="${c.id}">${c.zh} ${n}</span>`;
  }).join("");
  document.querySelectorAll("#senChips .chip").forEach(el=>
    el.addEventListener("click", ()=>{ senFilter = el.dataset.c; renderSenList(); }));
  const list = ALLSEN.map((s,i)=>({s, i})).filter(({s})=> senFilter==="all" || senCat(s)===senFilter);
  $("senList").innerHTML = list.map(({s,i})=>
    `<div class="sen-card card"><div class="en">${esc(s.en)}</div><div class="zh">${esc(s.zh)}</div>
     <span class="spk" data-i="${i}">🔊 朗读</span></div>`).join("");
  document.querySelectorAll("#senList .spk").forEach(el=>
    el.addEventListener("click", ()=> saySenIdx(+el.dataset.i)));
}
/* 句子练习组卷：优先含薄弱单词的句子，与单词学习联动 */
function senQuizPool(){
  const weak = new Set(Object.keys(S.ws||{}).filter(w=>{ const s=S.ws[w]; return s.q>0&&s.a/s.q<0.7; }));
  const senWords = s => s.en.replace(/[?!.,;:'"“”]/g,"").split(/\s+/)
    .map(t=>WLOW[t.toLowerCase()]).filter(Boolean).map(e=>e.w);
  const withWeak = weak.size? ALLSEN.filter(s=>senWords(s).some(w=>weak.has(w))) : [];
  const qs = [];
  const push = arr=>{ for(const s of shuffle(arr)){ if(qs.length>=10) break; if(!qs.includes(s)) qs.push(s); } };
  push(withWeak); push(ALLSEN);
  return qs;
}
$("senQuizBtn").addEventListener("click", ()=>{
  G = { mode:"sentence", pool:[], qs: senQuizPool(), i:0, score:0, right:0 };
  $("gameView").classList.add("on");
  document.body.style.overflow = "hidden";
  nextQ();
});

/* ---------- 设置 ---------- */
function renderSettings(){
  const gk = $("gemKeyInput");
  if(gk){
    gk.value = gemKey()? "••••••••" : "";
    gk.placeholder = gemKey()? "已保存（重新粘贴可覆盖）" : "粘贴你的 API Key";
    $("gemKeyStatus").textContent = gemKey()? "✓ 已配置，真 AI 已启用" : "未配置，用内置规则回复";
    $("gemKeyStatus").style.color = gemKey()? "#34C759" : "var(--sub)";
  }
  $("goalInput").value = S.goal||20;
  $("stLearned").textContent = Object.keys(S.learned).length;
  $("stAcc").textContent = (S.total.q? Math.round(S.total.a/S.total.q*100):0) + "%";
  $("stStreak").textContent = S.streak.days;
  $("stWrong").textContent = Object.keys(S.wrong).length;
  renderGSync();
}
$("goalInput").addEventListener("change", e=>{
  let v = parseInt(e.target.value,10);
  if(isNaN(v)||v<1) v=1; if(v>200) v=200;
  S.goal = v; e.target.value = v; save(); renderHome();
});
$("resetBtn").addEventListener("click", ()=>{
  if(confirm("确定清除当前空间的全部学习记录吗？")){
    localStorage.removeItem(lsKey()); location.reload();
  }
});
$("rateSelect").value = String(AUDIO_RATE);
$("rateSelect").addEventListener("change", e=>{ setAudioRate(parseFloat(e.target.value)); });
function collectBackup(){
  return { en: localStorage.getItem("lexi_v2_en"), nurs: localStorage.getItem("lexi_v2_nurs"),
    nursLang: localStorage.getItem("lexi_nurs_lang"), quizDate: localStorage.getItem("lexi_quiz1_date"),
    audioRate: localStorage.getItem("lexi_audio_rate"), exportedAt: new Date().toISOString() };
}
function applyBackupData(d){
  if(d.en) localStorage.setItem("lexi_v2_en", d.en);
  if(d.nurs) localStorage.setItem("lexi_v2_nurs", d.nurs);
  if(d.nursLang) localStorage.setItem("lexi_nurs_lang", d.nursLang);
  if(d.quizDate) localStorage.setItem("lexi_quiz1_date", d.quizDate);
  if(d.audioRate) localStorage.setItem("lexi_audio_rate", d.audioRate);
}
$("backupBtn").addEventListener("click", ()=>{
  const data = collectBackup();
  const blob = new Blob([JSON.stringify(data)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "lexi-backup-" + new Date().toISOString().slice(0,10) + ".json";
  a.click();
});
$("restoreBtn").addEventListener("click", ()=>$("restoreFile").click());
const gks = $("gemKeySave");
if(gks) gks.addEventListener("click", ()=>{
  const v = $("gemKeyInput").value.trim();
  if(v && v!=="••••••••"){ localStorage.setItem("lexi_gemini_key", v); }
  renderSettings();
});
$("restoreFile").addEventListener("change", e=>{
  const f = e.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = ()=>{
    try{
      const d = JSON.parse(r.result);
      applyBackupData(d);
      alert(nt("restore_ok"));
      location.reload();
    }catch(err){ alert(nt("restore_bad")); }
  };
  r.readAsText(f);
});

/* ---------- Google Drive 云同步 ---------- */
const GOOGLE_CLIENT_ID = "500960415413-lrmb9p5qarlo234pl857k0uvd0hqj4gf.apps.googleusercontent.com"; // Google OAuth 客户端 ID（Cloud Console 创建）
const GDRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email";
const GSYNC_FILE = "lexi-backup.json";
let gTok = null, gTokExp = 0, gMail = "";

function gsyncReady(){ return typeof google!=="undefined" && google.accounts && google.accounts.oauth2; }

function gEnsureToken(){
  return new Promise((resolve, reject)=>{
    if(gTok && Date.now() < gTokExp - 60000) return resolve(gTok);
    if(!GOOGLE_CLIENT_ID) return reject(new Error("noci"));
    if(!gsyncReady()) return reject(new Error("nogsi"));
    try{
      const tc = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID, scope: GDRIVE_SCOPE,
        callback: (resp)=>{
          if(resp && resp.error) return reject(new Error(resp.error));
          gTok = resp.access_token;
          gTokExp = Date.now() + (resp.expires_in||3600)*1000;
          fetch("https://www.googleapis.com/oauth2/v3/userinfo", {headers:{Authorization:"Bearer "+gTok}})
            .then(r=>r.json()).then(u=>{ gMail = u.email||""; renderGSync(); }).catch(()=>{});
          resolve(gTok);
        }
      });
      tc.requestAccessToken();
    }catch(e){ reject(e); }
  });
}

async function gApi(path, opts){
  opts = opts || {};
  let tok = await gEnsureToken();
  const doFetch = (t)=>fetch("https://www.googleapis.com"+path, {
    method: opts.method||"GET", body: opts.body,
    headers: Object.assign({}, opts.headers||{}, {Authorization:"Bearer "+t})
  });
  let r = await doFetch(tok);
  if(r.status===401){ gTok = null; tok = await gEnsureToken(); r = await doFetch(tok); }
  if(!r.ok) throw new Error("gapi "+r.status);
  return r;
}

async function gFindFile(){
  const r = await gApi("/drive/v3/files?q="+encodeURIComponent("name='"+GSYNC_FILE+"'")+"&spaces=appDataFolder&fields=files(id,modifiedTime)");
  const j = await r.json();
  return (j.files && j.files[0]) || null;
}

async function gUpload(silent){
  const data = collectBackup();
  const json = JSON.stringify(data);
  const meta = {name: GSYNC_FILE, parents:["appDataFolder"]};
  const existing = await gFindFile();
  const boundary = "lexi"+Date.now();
  const body = "--"+boundary+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"
    + JSON.stringify(existing?{}:meta)
    + "\r\n--"+boundary+"\r\nContent-Type: application/json\r\n\r\n"
    + json + "\r\n--"+boundary+"--";
  const url = existing
    ? "/upload/drive/v3/files/"+existing.id+"?uploadType=multipart"
    : "/upload/drive/v3/files?uploadType=multipart";
  await gApi(url, {method: existing?"PATCH":"POST",
    headers:{"Content-Type":"multipart/related; boundary="+boundary}, body});
  const now = new Date().toISOString();
  localStorage.setItem("lexi_gsync_time", now);
  renderGSync();
  if(!silent) alert(nt("g_up_ok"));
}

async function gDownload(){
  const f = await gFindFile();
  if(!f){ alert(nt("g_no_remote")); return; }
  const r = await gApi("/drive/v3/files/"+f.id+"?alt=media");
  const d = await r.json();
  applyBackupData(d);
  localStorage.setItem("lexi_gsync_time", new Date().toISOString());
  alert(nt("g_down_ok"));
  location.reload();
}

async function gConnect(){
  try{
    await gEnsureToken();
    renderGSync(); renderGSyncBtns();
    // 连接后智能处理：云端有、本地空 → 问是否下载；本地有、云端空 → 自动上传
    try{
      const f = await gFindFile();
      const hasLocal = !!(localStorage.getItem("lexi_v2_en")||localStorage.getItem("lexi_v2_nurs"));
      if(f && !hasLocal){
        if(confirm(nt("g_found_remote"))) await gDownload();
      }else if(!f && hasLocal){
        await gUpload(true);
      }
    }catch(e){ console.warn("gsync auto", e); }
  }catch(e){
    alert(nt(e.message==="noci"?"g_noci":"g_fail"));
  }
}
function gDisconnect(){ gTok = null; gMail = ""; renderGSync(); renderGSyncBtns(); }

function renderGSync(){
  const el = $("gSyncBody"); if(!el) return;
  const last = localStorage.getItem("lexi_gsync_time");
  const lastTxt = last ? new Date(last).toLocaleString() : "—";
  if(!GOOGLE_CLIENT_ID){
    el.innerHTML = `<div>${nt("g_noci")}</div>`;
    return;
  }
  if(!gTok){
    el.innerHTML = `<div style="margin-bottom:10px">${nt("g_hint")}</div>
      <button class="btn primary" id="gConnBtn">${nt("g_connect")}</button>`;
    $("gConnBtn").addEventListener("click", gConnect);
    return;
  }
  el.innerHTML = `<div style="margin-bottom:6px">👤 ${esc(gMail||"Google")}</div>
    <div style="margin-bottom:10px;font-size:13px">${nt("g_last")}: ${esc(lastTxt)}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn primary" id="gUpBtn">${nt("g_upload")}</button>
      <button class="btn" id="gDownBtn">${nt("g_download")}</button>
      <button class="btn" id="gDisBtn" style="color:#FF3B30">${nt("g_disconnect")}</button>
    </div>`;
  $("gUpBtn").addEventListener("click", ()=>gUpload().catch(e=>alert(nt("g_fail"))));
  $("gDownBtn").addEventListener("click", ()=>{
    if(confirm(nt("g_down_confirm"))) gDownload().catch(e=>alert(nt("g_fail")));
  });
  $("gDisBtn").addEventListener("click", gDisconnect);
}

/* 顶栏一键同步按钮 */
function renderGSyncBtns(){
  document.querySelectorAll(".gsyncBtn").forEach(b=>{
    b.innerHTML = gTok ? nt("g_sync_btn") : nt("g_sync_btn");
  });
}
async function gQuickSync(btn){
  btn.classList.add("syncing");
  const orig = btn.innerHTML;
  try{
    await gEnsureToken(); // 未连接时直接弹 Google 授权，不跳设置页
    renderGSyncBtns();
    await gUpload(true);
    btn.innerHTML = nt("g_synced");
    setTimeout(()=>{ btn.innerHTML = orig; }, 2000);
  }catch(e){ if(!/popup|cancel|dismiss/i.test(e.message||"")) alert(nt("g_fail")); }
  finally{ btn.classList.remove("syncing"); }
}
/* ---------- 护理预科中英切换 ---------- */
let NURS_LANG = localStorage.getItem("lexi_nurs_lang") || "zh";
const NT = {
zh: {
  nav_chapters:"章节", nav_daily:"每日练习", nav_road:"考试路线", nav_daily_s:"每日", nav_road_s:"路线",
  nurs_title:"护理预科", nurs_subtitle:"BIOL 235 · 95分计划",
  ch1:"第一章", ch1_name:"人体概述", ch1_en:"An Introduction to the Human Body",
  unit_sub:"Unit 1 · 人体概述（Ch.1-5）· 目标 Quiz 1 95+",
  enter:"进入学习 →", learned:"已学", terms_unit:"术语", quiz_best:"测验最佳",
  dashboard:"100 分仪表盘", overall:"综合评分", m_terms:"术语", m_quiz:"测验", m_mock:"模考", m_fey:"费曼",
  mastery:"各节掌握度", weak:"薄弱提醒", not_tested:"未测",
  mod_points:"考点提炼", mod_points_s:"6 节浓缩 · 对照课本",
  learn_group:"学知识", practice_group:"做练习", explore_group:"探索",
  mod_terms:"术语闪卡", mod_terms_s:"50 术语 · 发音",
  mod_listen:"听音辨义", mod_listen_s:"听术语选义", mod_match:"配对挑战", mod_match_s:"图文配对计时赛", match_hint:"左右配对：点左侧英文+右侧中文，配错 +3 秒", match_left:"图片", match_right:"答案", match_miss:"次配错", match_best:"新纪录！", match_best_is:"最佳", match_again:"再来一局",
  mod_quiz:"章节测验", mod_quiz_s:"题库抽 25 题 · 含解析",
  mod_fey:"费曼复述", mod_fey_s:"11 个核心 · 讲出来",
  mod_atlas:"解剖图", mod_atlas_s:"切面 · 方向 · 体腔",
  mod_mock:"模拟考试", mod_mock_s:"50 题 · 60 分钟 · 闭卷",
  mod_body:"人体探秘", mod_body_s:"点器官看名称功能",
  mod_ear:"磨耳朵", mod_ear_s:"听术语+句子 · 息屏可播",
  back:"← 返回章节", start:"开始",
  daily_plan:"今日练习计划", daily_start:"开始今日练习 →",
  daily_fey:"今日费曼", daily_fey_go:"开始复述 →", per_day:"每天 1 个",
  fey_done:"已完成",
  rate_again:"重来", rate_hard:"困难", rate_good:"记得", rate_easy:"简单",
  label_quiz:"标注测验", label_quiz_s:"看图识器官 · 遮住标签来认", label_which:"这是哪个器官？", label_perfect:"全部认对！解剖图过关 🎉", label_retry:"再练一次，加深记忆", label_again:"再来一轮", label_finish:"看结果",
  // --- 首页/仪表盘 ---
  ch_card_tags:"50 术语 · 25 测验 · 6 解剖图 · 7 器官 · 模拟考",
  ch2_todo:"第 2–5 章待补充：完成第一章试点验证后继续。",
  sec_weak:"今日强化建议", weakest:"最弱环节", accuracy:"正确率",
  wrong_left:"道没消灭", terms_due:"个术语到了复习时间",
  // --- 术语闪卡 ---
  terms_done:"个术语过完一遍", terms_next:"去「听音辨义」检验一下，或再来一轮",
  terms_again:"再来一轮", retry_round:"重考", flip_hint:"先在心里说出中文，再点卡片对照", say:"发音",
  tap_word_hint:"点击单词查看释义 ▼",
  rate_q:"这个术语掌握得怎么样？", rate_hint:"按掌握程度安排下次复习时间（间隔重复）",
  // --- 听音辨义 ---
  listen_done:"答对", listen_again:"再来一组", listen_hint:"仔细听，选择正确的中文含义",
  listen_replay:"再听一遍", listen_next:"下一题 →", listen_result:"看结果",
  // --- 章节测验 ---
  quiz_score:"本次得分", quiz_right:"答对", quiz_best:"历史最佳",
  quiz_good:"达到 Quiz 1 的目标线，稳住！ 🎯", quiz_close:"接近了，把错题弄懂再来一次",
  quiz_low:"先回看考点提炼，重点突破后再测", quiz_again:"再测一次",
  q_tf:"判断", q_mc:"单选",
  // --- 模拟考 ---
  mock_title:"模拟考试 · 第一章", mock_qs:"道题（单选 + 判断）", mock_min:"分钟",
  mock_closed:"闭卷", mock_closed_s:"不许翻书，凭真实水平作答",
  mock_noexp:"答题期间不显示解析", mock_nav:"可前后翻题修改",
  mock_auto:"时间到自动交卷；交卷后看成绩 + 逐题解析",
  mock_spec:"与真实 Quiz 1 同规格：50 题 / 60 分钟 / 一次机会",
  mock_best:"历史最佳", mock_start:"开始考试",
  mock_answered:"已答", mock_num:"题号盘（点击跳转 · 蓝色=已答）",
  mock_confirm:"确定交卷吗", mock_unanswered:"题没答",
  mock_timeup:"时间到，自动交卷", mock_result:"模拟考试",
  mock_used:"用时约", mock_min2:"分钟",
  mock_pass:"达到 Quiz 1 目标线，可以约考了！ 🎯",
  mock_near:"接近目标，把下面错题弄懂", mock_far:"先回看考点提炼+解剖图，再回来考",
  your_ans:"你的答案", not_answered:"未作答", correct_ans:"正确答案",
  q_correct:"答对", q_wrong:"答错",
  // --- 费曼 ---
  fey_done_all:"个核心都讲完了", fey_hint:"能讲清楚 = 真学会。考前再串讲一遍",
  fey_again:"再讲一遍", fey_speak:"大声讲出来（可用英语），再对照采分点",
  fey_show:"对照采分点", fey_points:"采分点", fey_rate:"诚实自评：刚才讲清楚了吗",
  fey_clear:"讲清楚了", fey_fuzzy:"有点模糊", fey_missed:"没讲出来",
  // --- 每日练习 ---
  daily_title:"每日练习", daily_back:"返回", daily_done:"今日练习完成",
  daily_stats:"复习术语", daily_qs:"练习题目", daily_fixed:"消灭错题",
  daily_motto:"明天继续，稳态拿分靠的是每天的复利 💪",
  daily_new:"新词", daily_review:"术语复习",
  daily_wrong:"错题重练", daily_weak:"薄弱强化", daily_finish:"完成练习 🎉",
  // --- 错题本 ---
  wrong_title:"护理错题", wrong_go:"开始消灭错题 →", wrong_empty:"🎉 错题本是空的", wrong_go_hint:"点击查看错题详情",
  wrong_empty_s:"章节测验 / 模拟考 / 每日练习答错会自动收录",
  wrong_mastered:"已掌握 ✕", wrong_export:"导出错题 📄",
  // --- 解剖图 ---
  atlas_title:"解剖图对照表 · 第一章", atlas_sub:"中英标注 · 可截图保存对照课本",
  // --- 人体探秘 ---
  body_title:"人体探秘 · 第一章", body_hint:"点一点，认识主要器官",
  // --- 考点提炼 ---
  points_title:"考点提炼 · 第一章",

  // --- 今日驾驶舱 ---
  today:"今日学习", today_goal:"今日目标", min_unit:"分钟",
  start_today:"▶ 开始今日学习",
  phase_recall:"到期复习", phase_recall_s:"到期术语 + 错题重练",
  phase_learn:"新知识", phase_learn_s:"考点提炼 + 术语闪卡",
  phase_understand:"深度理解", phase_understand_s:"解剖图 + 人体探秘 + 费曼",
  phase_practice:"主动回忆", phase_practice_s:"章节测验（先不看解析）",
  phase_english:"护理英语", phase_english_s:"听音辨义 + 标注测验",
  phase_fix:"错题修复", phase_fix_s:"消灭今日错题",
  phase_done:"✓ 完成", phase_start:"开始 →",
  weakest:"当前最薄弱",
  goal_95:"目标 95%", predicted_now:"当前预测", no_risk_yet:"暂无薄弱点数据，多做几道题后自动分析",
  sp_en:"英语", sp_nurs:"护理预科", nav_settings:"设置",
  sess_study:"📖 学习", sess_break:"☕ 休息", sess_seg:"段", sess_end:"结束会话",
  pred_note:"* 预测值，非真实考试成绩",
  today_done_all:"🎉 今日 120 分钟完成！",
  nav_today:"今日", nav_courses:"课程", nav_learn:"学习", nav_progress:"进度", nav_mistakes:"错题",
  // --- 进度页 95 引擎 ---
  prog_goal:"目标", prog_gap:"距 95% 还差", prog_course:"课程进度", prog_mastery:"知识掌握",
  prog_readiness:"考试准备度", prog_retention:"保持度", prog_risks:"风险知识点",
  // --- 各页面标题 ---
  road_title:"考试路线图", road_sub:"官方 LMS 顺序 · 按此节奏备考",
  daily_sub:"120 分钟课程系统 · 自动安排",
  wrong_sub:"答错自动收录 · 答对后移除",
  set_learn:"学习", set_daily_goal:"每日新词目标", set_rate:"发音语速", set_stats:"统计",
  set_rate_slow:"慢速", set_rate_normal:"正常", set_rate_fast:"快速",
  set_words:"已学单词", set_acc:"总正确率", set_streak:"连续学习天数", set_wrong:"错题本单词",
  set_data:"数据", set_backup:"📥 导出备份 (JSON)", set_restore:"📤 导入备份",
  set_reset:"清除全部学习记录", set_footer:"本地离线运行 · 数据保存在本机",
  restore_ok:"备份已恢复，页面将刷新", restore_bad:"备份文件无效",
  g_noci:"云同步尚未配置，请联系管理员填入 Google 客户端 ID", g_fail:"同步失败，请重试",
  g_hint:"登录 Google 后，学习进度自动同步到你的 Google Drive（应用私有空间），换设备不丢失",
  g_connect:"🔗 连接 Google", g_last:"上次同步", g_upload:"⬆️ 上传到云端", g_download:"⬇️ 从云端下载",
  g_disconnect:"断开", g_up_ok:"已上传到云端 ☁️", g_no_remote:"云端还没有备份",
  g_down_ok:"已从云端恢复，页面将刷新", g_found_remote:"云端有备份，是否下载恢复？",
  g_down_confirm:"确定用云端备份覆盖本地数据吗？",
  g_sync_btn:"☁️ 同步", g_synced:"☁️ 已同步 ✓", g_go_settings:"还未连接 Google，去设置页连接吗？",
  // --- Today 仪表盘 ---
  dash_acc_note:"按章节测验 / 模拟考 / 每日练习的答题正确率统计",
  dash_today_focus:"🎯 今日强化建议", dash_weakest:"最弱环节", dash_wrong_left:"错题本还有",
  dash_not_fixed:"道没消灭", dash_terms_due:"个术语到了复习时间", dash_road_hint:"📍 完整备考顺序见导航「考试路线」",
  quiz_countdown:"Quiz 1 还有", quiz_days:"天", quiz_today:"Quiz 1 就是今天，加油！",
  quiz_past:"Quiz 1 日期已过，请更新", quiz_gap:"综合评分", quiz_to_goal:"→ 目标 95，还差",
  quiz_pts:"分，建议每天 +", quiz_per_day:"分", quiz_change:"改日期",
  quiz_set_date:"设置 Quiz 1 考试日期", quiz_set_sub:"开启倒计时，自动规划每日目标",
  // --- 磨耳朵 ---
  ear_title:"磨耳朵 · 第一章", ear_sub:"术语 + 句子循环播放 · 锁屏/息屏可播",
  ear_play:"▶ 播放", ear_pause:"⏸ 暂停", ear_prev:"⏮ 上一条", ear_next:"下一条 ⏭",
  ear_loop_all:"全部循环", ear_loop_one:"单曲循环", ear_once:"顺序播放", ear_loop:"循环模式", ear_settings:"设置",
  ear_speed:"语速", ear_track:"条", ear_quiz_go:"一轮结束 → 开始回忆问答",
  ear_mode:"朗读模式", ear_mode_bi:"双语", ear_mode_en:"纯英文", ear_mode_zhen:"中→英",
  ear_gap:"跟读间隙", ear_sleep:"睡眠定时", ear_min:"分", ear_off:"关",
  ear_fade:"渐进脱钩", ear_fade_2:"2轮后切纯英", ear_round:"轮",
  ear_recall_hint:"心里说出英文…", ear_gap_hint:"跟读…",
  ear_quiz_title:"回忆问答", ear_quiz_hint:"看中文，选出刚才听到的英文",
  ear_quiz_done:"小测完成", ear_wrong_list:"错词", ear_wrong_noted:"已加入复习队列，点词直达闪卡", ear_quiz_again:"再听一轮", ear_listen:"再听一遍",
  en_today:"今日英语 · 120 分钟", en_start:"▶ 开始今日学习",
  en_phase_review:"到期复习", en_phase_review_s:"薄弱词 + SRS 复习",
  en_phase_newwords:"新词学习", en_phase_newwords_s:"看图选词 + 听音辨词",
  en_phase_sentences:"句子练习", en_phase_sentences_s:"句子跟读 + 实用表达",
  en_phase_practice:"综合练习", en_phase_practice_s:"拼写 + 选词填空 + 语法",
  en_phase_reading:"短文跟读", en_phase_reading_s:"短文朗读 + 分句跟读",
  en_phase_fix:"错题修复", en_phase_fix_s:"消灭今日错题",
  en_library:"学习库",
  // --- 路线图 ---
  road_cur:"进行中",
  // --- 每日练习概览 ---
  ov_sys:"120 分钟课程系统 · 系统按你的弱点自动安排", ov_due:"到期术语", ov_wrong:"待消灭错题",
  ov_fresh:"未学术语", ov_weak:"薄弱环节", ov_mix:"组成：错题重练 + 到期术语（间隔重复）+ 薄弱节题目 + 新术语",
  ov_fey1:"每天 1 个", ov_fey2:"天一轮", ov_fey_done:"已完成", ov_mock:"模考记录", ov_correct:"答对",
  // --- 每日练习完成页 ---
  dd_title:"今日练习完成", dd_done:"共完成", dd_items:"项", dd_rev:"复习术语", dd_q:"练习题目", dd_fixed:"消灭错题",
  dd_next:"明天继续，稳态拿分靠的是每天的复利",
  // --- 每日练习做题 ---
  di_prog:"今日练习", di_term:"术语复习", di_fresh:"新词", di_retry:"错题重练", di_weak:"薄弱强化",
  di_finish:"完成练习 🎉", di_next:"下一题 →",
  // --- 解剖图 ---
  at_title:"解剖图对照表 · 第一章", at_sub:"中英标注 · 可截图保存对照课本", at_fig:"图", at_organ:"器官图鉴 · 主要器官中英对照",
  // --- 人体探秘 ---
  ex_title:"人体探秘 · 第一章", ex_hint:"点器官探索，或按顺序导览 · 已探索", ex_tour:"开始导览", ex_tour2:"继续导览",
  ex_legend:"○ 未探索 · ✓ 已探索 · 点击发光点查看", ex_rel:"相关术语 · 点跳转闪卡",
  // --- 考点提炼 ---
  pt_title:"考点提炼 · 第一章",
  // --- 测验/模考 ---
  qz_next:"下一题 →", qz_answered:"已答", qz_palette:"题号盘（点击跳转 · 蓝色=已答）",
  qz_tf:"判断", qz_mc:"单选", qz_submit:"确定交卷吗？", qz_unans:"题没答",
  qz_timeout:"时间到，自动交卷", qz_mock:"模拟考试", qz_score:"本次得分", qz_time:"用时约", qz_best:"历史最佳",
  qz_pass:"达到 Quiz 1 目标线，可以约考了 🎯", qz_close:"接近目标，把下面错题弄懂",
  qz_again:"再考一次", qz_weak_btn:"🎯 强化薄弱点", qz_diag:"本次各节正确率 · 诊断",
  qz_weak:"薄弱点", qz_weak_auto:"已自动收录错题并计入每日练习", qz_weak_keep:"各节都在 75%+，继续保持",
  qz_retry:"先回看考点提炼+解剖图，再回来考",
  qz_review:"逐题解析", qz_your:"你的答案", qz_noans:"未作答", qz_right:"正确答案",
  wg_more:"+{n} 道错题，去「今日」页「错题修复」",
  // --- 费曼 ---
  fy_cores:"个核心都讲完了 🎓", fy_motto:"能讲清楚 = 真学会。考前再串讲一遍。", fy_again:"再讲一遍",
  fy_speak:"大声讲出来（可用英语），再对照采分点", fy_show:"对照采分点", fy_points:"✓ 采分点",
  fy_rate:"诚实自评：刚才讲清楚了吗？", fy_r2:"讲清楚了 👍", fy_r1:"有点模糊 🤔", fy_r0:"没讲出来 👎",
  fy_today:"今日费曼完成 ✓", fy_tom:"讲出来 = 真记住。明天继续下一个",
  // --- 学习会话 ---
  sess_break:"分钟休息时间 ☕ — 站起来活动一下！",

  submit:"交卷", prev:"← 上一题", next:"下一题 →",
  confirm_yes:"确认交卷", continue:"继续作答",
},
en: {
  nav_chapters:"Chapters", nav_daily:"Daily Practice", nav_road:"Roadmap", nav_daily_s:"Daily", nav_road_s:"Route",
  nurs_title:"Nursing Prep", nurs_subtitle:"BIOL 235 · 95+ Plan",
  ch1:"Chapter 1", ch1_name:"Body Overview", ch1_en:"An Introduction to the Human Body",
  unit_sub:"Unit 1 · Body Overview (Ch.1–5) · Goal: Quiz 1 95+",
  enter:"Start Learning →", learned:"Learned", terms_unit:"terms", quiz_best:"Quiz best",
  dashboard:"100-Point Dashboard", overall:"Overall Score", m_terms:"Terms", m_quiz:"Quiz", m_mock:"Mock", m_fey:"Feynman",
  mastery:"Mastery by Section", weak:"Focus Areas", not_tested:"Untested",
  mod_points:"Key Points", mod_points_s:"6 sections · condensed",
  learn_group:"Learn", practice_group:"Practice", explore_group:"Explore",
  mod_terms:"Flashcards", mod_terms_s:"50 terms · audio",
  mod_listen:"Listening", mod_listen_s:"Hear term, pick meaning", mod_match:"Match", mod_match_s:"Timed pairing race", match_hint:"Tap left English + right Chinese to pair. Wrong pair +3s", match_left:"Images", match_right:"Answers", match_miss:"misses", match_best:"New record!", match_best_is:"Best", match_again:"Play again",
  mod_quiz:"Chapter Quiz", mod_quiz_s:"25 from bank · with explanations",
  mod_fey:"Feynman Review", mod_fey_s:"11 topics · explain aloud",
  mod_atlas:"Atlas", mod_atlas_s:"Planes · directions · cavities",
  mod_mock:"Mock Exam", mod_mock_s:"50 Qs · 60 min · closed book",
  mod_body:"Body Explorer", mod_body_s:"Tap organs for names & functions",
  mod_ear:"Ear Training", mod_ear_s:"Terms + sentences · background play",
  back:"← Back", start:"Start",
  daily_plan:"Today's Practice Plan", daily_start:"Start Today's Practice →",
  daily_fey:"Today's Feynman", daily_fey_go:"Start →", per_day:"1 per day",
  fey_done:"Done",
  rate_again:"Again", rate_hard:"Hard", rate_good:"Good", rate_easy:"Easy",
  label_quiz:"Label Quiz", label_quiz_s:"Identify organs with labels hidden", label_which:"Which organ is this?", label_perfect:"Perfect! Anatomy cleared 🎉", label_retry:"Practice again to reinforce", label_again:"Try Again", label_finish:"See Results",
  // --- Home/Dashboard ---
  ch_card_tags:"50 terms · 25 quiz · 6 atlas · 7 organs · mock",
  ch2_todo:"Ch 2–5 coming after Ch.1 pilot validation.",
  sec_weak:"Today's Focus", weakest:"Weakest", accuracy:"accuracy",
  wrong_left:"wrong left", terms_due:"terms due for review",
  // --- Flashcards ---
  terms_done:"terms completed", terms_next:"Try Listening next, or go again",
  terms_again:"Again", retry_round:"Retry", flip_hint:"Recall the Chinese first, then tap to check", say:"🔊 Play",
  tap_word_hint:"Tap word for definition ▼",
  rate_q:"How well do you know this term?", rate_hint:"Schedules next review (spaced repetition)",
  // --- Listening ---
  listen_done:"Correct", listen_again:"Another Round", listen_hint:"Listen carefully, pick the Chinese meaning",
  listen_replay:"Replay", listen_next:"Next →", listen_result:"See Results",
  // --- Quiz ---
  quiz_score:"Your Score", quiz_right:"Correct", quiz_best:"Best",
  quiz_good:"Hit the Quiz 1 target line. Hold it! 🎯", quiz_close:"Close — review mistakes and try again",
  quiz_low:"Review key points first, then retest", quiz_again:"Retake",
  q_tf:"True/False", q_mc:"Multiple Choice",
  // --- Mock ---
  mock_title:"Mock Exam · Chapter 1", mock_qs:"questions (MC + TF)", mock_min:"min",
  mock_closed:"Closed Book", mock_closed_s:"No books — answer at your true level",
  mock_noexp:"No explanations during the exam", mock_nav:"Navigate freely and change answers",
  mock_auto:"Auto-submit at time up; see score + explanations after",
  mock_spec:"Same as real Quiz 1: 50 Qs / 60 min / one attempt",
  mock_best:"Best", mock_start:"Start Exam",
  mock_answered:"Answered", mock_num:"Question navigator (tap to jump · blue=answered)",
  mock_confirm:"Submit the exam?", mock_unanswered:"unanswered",
  mock_timeup:"Time up — auto submitted", mock_result:"Mock Exam",
  mock_used:"Took about", mock_min2:"min",
  mock_pass:"Hit the Quiz 1 target — ready to book! 🎯",
  mock_near:"Close — master the mistakes below", mock_far:"Review key points + atlas first, then retry",
  your_ans:"Your answer", not_answered:"Unanswered", correct_ans:"Correct answer",
  q_correct:"Correct", q_wrong:"Wrong",
  // --- Feynman ---
  fey_done_all:"topics explained", fey_hint:"Can explain = truly learned. Review before exam",
  fey_again:"Explain Again", fey_speak:"Explain aloud (English OK), then check key points",
  fey_show:"Show Key Points", fey_points:"Key Points", fey_rate:"Honest self-check: did you explain it clearly?",
  fey_clear:"Crystal clear", fey_fuzzy:"A bit fuzzy", fey_missed:"Couldn't explain",
  // --- Daily ---
  daily_title:"Daily Practice", daily_back:"Back", daily_done:"Today's Practice Complete",
  daily_stats:"Terms reviewed", daily_qs:"Questions", daily_fixed:"Mistakes fixed",
  daily_motto:"Come back tomorrow — steady compounding wins 💪",
  daily_new:"New", daily_review:"Term Review",
  daily_wrong:"Mistake Review", daily_weak:"Weak Spots", daily_finish:"Done 🎉",
  // --- Wrong book ---
  wrong_title:"Mistakes", wrong_go:"Fix Mistakes →", wrong_empty:"🎉 No mistakes", wrong_go_hint:"Tap to view details",
  wrong_empty_s:"Wrong answers from quizzes feed in automatically",
  wrong_mastered:"Mastered ✕", wrong_export:"Export 📄",
  // --- Atlas ---
  atlas_title:"Anatomy Atlas · Chapter 1", atlas_sub:"Bilingual labels · screenshot to compare with textbook",
  // --- Body ---
  body_title:"Body Explorer · Chapter 1", body_hint:"Tap to learn key organs",
  // --- Points ---
  points_title:"Key Points · Chapter 1",

  // --- Today cockpit ---
  today:"Today's Study", today_goal:"Today's Goal", min_unit:"min",
  start_today:"▶ Start Today's Study",
  phase_recall:"Review", phase_recall_s:"Due terms + mistakes",
  phase_learn:"Learn", phase_learn_s:"Key points + flashcards",
  phase_understand:"Understand", phase_understand_s:"Atlas + explorer + Feynman",
  phase_practice:"Recall", phase_practice_s:"Chapter quiz (no peeking)",
  phase_english:"Nursing English", phase_english_s:"Listening + label quiz",
  phase_fix:"Fix Mistakes", phase_fix_s:"Clear today's mistakes",
  phase_done:"✓ Done", phase_start:"Start →",
  weakest:"Weakest now",
  goal_95:"Goal 95%", predicted_now:"Predicted", no_risk_yet:"No weak-spot data yet — answer a few questions first",
  sp_en:"English", sp_nurs:"Nursing", nav_settings:"Settings",
  sess_study:"📖 Study", sess_break:"☕ Break", sess_seg:"", sess_end:"End session",
  pred_note:"* Predicted, not actual exam score",
  today_done_all:"🎉 120 minutes complete!",
  nav_today:"Today", nav_courses:"Courses", nav_learn:"Learn", nav_progress:"Progress", nav_mistakes:"Mistakes",
  // --- Progress 95 engine ---
  prog_goal:"Goal", prog_gap:"to 95%", prog_course:"Course", prog_mastery:"Mastery",
  prog_readiness:"Readiness", prog_retention:"Retention", prog_risks:"Risk areas",
  // --- Page headers ---
  road_title:"Exam Roadmap", road_sub:"Official LMS order · follow this pace",
  daily_sub:"120-min system · auto-scheduled",
  wrong_sub:"Auto-collected · removed when mastered",
  set_learn:"Learn", set_daily_goal:"Daily new word goal", set_rate:"Speech rate", set_stats:"Stats",
  set_rate_slow:"Slow", set_rate_normal:"Normal", set_rate_fast:"Fast",
  set_words:"Words learned", set_acc:"Accuracy", set_streak:"Day streak", set_wrong:"Wrong words",
  set_data:"Data", set_backup:"📥 Export backup (JSON)", set_restore:"📤 Import backup",
  set_reset:"Clear all learning data", set_footer:"Runs offline · Data stored locally",
  restore_ok:"Backup restored, reloading", restore_bad:"Invalid backup file",
  g_noci:"Cloud sync not configured yet", g_fail:"Sync failed, please retry",
  g_hint:"Sign in with Google to sync your progress to your Google Drive (private app space), never lose data when switching devices",
  g_connect:"🔗 Connect Google", g_last:"Last sync", g_upload:"⬆️ Upload", g_download:"⬇️ Download",
  g_disconnect:"Disconnect", g_up_ok:"Uploaded to cloud ☁️", g_no_remote:"No cloud backup yet",
  g_down_ok:"Restored from cloud, reloading", g_found_remote:"Cloud backup found, download it?",
  g_down_confirm:"Overwrite local data with cloud backup?",
  g_sync_btn:"☁️ Sync", g_synced:"☁️ Synced ✓", g_go_settings:"Google not connected yet. Go to Settings to connect?",
  // --- Today dashboard ---
  dash_acc_note:"Accuracy across chapter quizzes / mocks / daily practice",
  dash_today_focus:"🎯 Today's Focus", dash_weakest:"Weakest", dash_wrong_left:"",
  dash_not_fixed:"mistakes left", dash_terms_due:"terms due for review", dash_road_hint:"📍 Full sequence in Roadmap",
  quiz_countdown:"Quiz 1 in", quiz_days:"days", quiz_today:"Quiz 1 is today — good luck!",
  quiz_past:"Quiz 1 date passed — please update", quiz_gap:"Score", quiz_to_goal:"→ goal 95,",
  quiz_pts:"pts left, +", quiz_per_day:"pts/day suggested", quiz_change:"Change date",
  quiz_set_date:"Set Quiz 1 exam date", quiz_set_sub:"Starts countdown, auto-plans daily goals",
  // --- Ear training ---
  ear_title:"Ear Training · Chapter 1", ear_sub:"Terms + sentences loop · background play",
  ear_play:"▶ Play", ear_pause:"⏸ Pause", ear_prev:"⏮ Prev", ear_next:"Next ⏭",
  ear_loop_all:"Loop All", ear_loop_one:"Loop One", ear_once:"Play Once", ear_loop:"Loop", ear_settings:"Settings",
  ear_speed:"Speed", ear_track:"tracks", ear_quiz_go:"Round done → Start recall quiz",
  ear_mode:"Mode", ear_mode_bi:"Bilingual", ear_mode_en:"English only", ear_mode_zhen:"ZH→EN",
  ear_gap:"Pause", ear_sleep:"Sleep timer", ear_min:"m", ear_off:"Off",
  ear_fade:"Auto-fade", ear_fade_2:"EN after 2 rounds", ear_round:"round",
  ear_recall_hint:"Say it in English…", ear_gap_hint:"Repeat…",
  ear_quiz_title:"Recall Quiz", ear_quiz_hint:"Read the Chinese, pick the English you just heard",
  ear_quiz_done:"Quiz Complete", ear_wrong_list:"Missed", ear_wrong_noted:"added to review. Tap a word for flashcards", ear_quiz_again:"Listen Again", ear_listen:"Replay",
  en_today:"Today's English · 120 min", en_start:"▶ Start Today's Study",
  en_phase_review:"Review", en_phase_review_s:"Weak words + SRS",
  en_phase_newwords:"New Words", en_phase_newwords_s:"Picture & listening",
  en_phase_sentences:"Sentences", en_phase_sentences_s:"Practice & expressions",
  en_phase_practice:"Practice", en_phase_practice_s:"Spelling + cloze + grammar",
  en_phase_reading:"Reading", en_phase_reading_s:"Passages + shadowing",
  en_phase_fix:"Fix Mistakes", en_phase_fix_s:"Clear today's mistakes",
  en_library:"Library",
  // --- Roadmap ---
  road_cur:"In Progress",
  // --- Daily overview ---
  ov_sys:"120-min course system · arranged around your weak spots", ov_due:"Due terms", ov_wrong:"Mistakes to clear",
  ov_fresh:"Unseen terms", ov_weak:"Weak spots", ov_mix:"Mix: mistake retry + due terms (spaced repetition) + weak-section questions + new terms",
  ov_fey1:"1 per day", ov_fey2:"day cycle", ov_fey_done:"completed", ov_mock:"Mock exam history", ov_correct:"Correct",
  // --- Daily completion ---
  dd_title:"Practice Complete", dd_done:"Completed", dd_items:"items", dd_rev:"Terms reviewed", dd_q:"Questions", dd_fixed:"Mistakes fixed",
  dd_next:"Come back tomorrow — steady review compounds into points",
  // --- Daily items ---
  di_prog:"Today's Practice", di_term:"Term Review", di_fresh:"New", di_retry:"Retry Mistakes", di_weak:"Weak-Spot Drill",
  di_finish:"Finish 🎉", di_next:"Next →",
  // --- Atlas ---
  at_title:"Anatomy Atlas · Chapter 1", at_sub:"Bilingual labels · screenshot to compare with the textbook", at_fig:"Fig.", at_organ:"Organ Gallery · key organs",
  // --- Body explorer ---
  ex_title:"Body Explorer · Chapter 1", ex_hint:"Tap an organ, or tour in order · Explored", ex_tour:"Start Tour", ex_tour2:"Resume Tour",
  ex_legend:"○ Unexplored · ✓ Explored · tap a glowing dot", ex_rel:"Related terms · tap to open flashcards",
  // --- Key points ---
  pt_title:"Key Points · Chapter 1",
  // --- Quiz / mock ---
  qz_next:"Next →", qz_answered:"Answered", qz_palette:"Question palette (tap to jump · blue = answered)",
  qz_tf:"True/False", qz_mc:"Multiple choice", qz_submit:"Submit the exam?", qz_unans:"questions unanswered",
  qz_timeout:"Time's up — auto-submitted", qz_mock:"Mock Exam", qz_score:"Your score", qz_time:"Time used", qz_best:"Best",
  qz_pass:"Hit the Quiz 1 target — you can book the exam 🎯", qz_close:"Close — master the mistakes below",
  qz_again:"Retake", qz_weak_btn:"🎯 Drill Weak Spots", qz_diag:"Accuracy by Section · Diagnosis",
  qz_weak:"Weak spots", qz_weak_auto:"mistakes auto-saved and added to daily practice", qz_weak_keep:"All sections 75%+ — keep it up",
  qz_retry:"Review the key points + atlas first, then retake",
  qz_review:"Question-by-Question Review", qz_your:"Your answer", qz_noans:"No answer", qz_right:"Correct answer",
  wg_more:"+{n} more mistakes — clear them in Today's Study → Fix Mistakes",
  // --- Feynman ---
  fy_cores:"key ideas covered 🎓", fy_motto:"If you can explain it, you know it. Review once more before the exam.", fy_again:"Explain Again",
  fy_speak:"Explain out loud (English OK), then check the scoring points", fy_show:"Show Scoring Points", fy_points:"✓ Scoring Points",
  fy_rate:"Honest self-check: did you explain it clearly?", fy_r2:"Crystal clear 👍", fy_r1:"A bit fuzzy 🤔", fy_r0:"Couldn't explain it 👎",
  fy_today:"Today's Feynman Done ✓", fy_tom:"Explained = remembered. Next one tomorrow",
  // --- Study session ---
  sess_break:" min break ☕ — stand up and move!",

  submit:"Submit", prev:"← Prev", next:"Next →",
  confirm_yes:"Confirm Submit", continue:"Keep Working",
}
};
const nt = k => (NT[NURS_LANG] && NT[NURS_LANG][k]) || NT.zh[k] || k;
/* ---------- 今日 120 分钟学习系统 ---------- */
const TODAY_PHASES_BASE = [
  {id:"recall", min:15, icon:"🔁"},
  {id:"learn", min:30, icon:"📖"},
  {id:"understand", min:25, icon:"🧠"},
  {id:"practice", min:20, icon:"✍"},
  {id:"english", min:15, icon:"🔊"},
  {id:"fix", min:15, icon:"🔧"},
];
function todayPhases(){
  // 自适应分配：120 分钟固定，内容动态
  const m = nursMetrics();
  const mastery = m.mastery || 50;
  const phases = TODAY_PHASES_BASE.map(p=>({...p}));
  const byId = id => phases.find(p=>p.id===id);
  if(mastery < 70){
    // 弱：多学少练
    byId("learn").min += 5; byId("understand").min += 5;
    byId("practice").min -= 10;
  }else if(mastery > 85){
    // 强：多练少学
    byId("practice").min += 10;
    byId("learn").min -= 5; byId("understand").min -= 5;
  }
  // 到期多则加复习时间
  const dueN = nursDueTerms().length;
  if(dueN > 20){ byId("recall").min += 5; byId("english").min -= 5; }
  return phases;
}
const TODAY_PHASES = TODAY_PHASES_BASE;  // 兼容旧引用
/* ---------- 英语空间 120分钟 ---------- */
const EN_PHASES = [
  {id:"review",   min:15, icon:"🔁"},
  {id:"newwords", min:30, icon:"📖"},
  {id:"sentences",min:25, icon:"📝"},
  {id:"practice", min:20, icon:"✍️"},
  {id:"reading",  min:15, icon:"🗣️"},
  {id:"fix",      min:15, icon:"❌"},
];
function enToday(){
  const t = today();
  if(!S.day.min) S.day.min = {};
  if(S.day.date !== t){ S.day = {date:t, words:[], min:{}, activePhase:null, phaseStartAt:0}; save(); }
  return S.day;
}
function enTotalMin(){
  const d = enToday();
  return EN_PHASES.reduce((s,p)=>s+((d.min&&d.min[p.id])||0), 0);
}
let EN_SAVE_TIMER = null;
function enPhaseStart(pid){
  const d = enToday();
  enPhaseEnd();
  d.activePhase = pid;
  d.phaseStartAt = Date.now();
  if(!d.lastStart) d.lastStart = {};
  d.lastStart[pid] = Date.now();
  save();
  // 每30秒自动存一次，防止离开时没结算导致错位
  if(EN_SAVE_TIMER) clearInterval(EN_SAVE_TIMER);
  EN_SAVE_TIMER = setInterval(()=>{
    const dd = S.day;
    if(!dd || !dd.activePhase || !dd.phaseStartAt) return;
    const secs = (Date.now() - dd.phaseStartAt)/1000;
    if(secs >= 30){
      const mins = Math.floor(secs/60);
      if(mins > 0){
        if(!dd.min) dd.min = {};
        dd.min[dd.activePhase] = (dd.min[dd.activePhase]||0) + mins;
        dd.phaseStartAt = Date.now();  // 重置，只计新增
        save();
      }
    }
  }, 30000);
}
function enPhaseStopTimer(){
  if(EN_SAVE_TIMER){ clearInterval(EN_SAVE_TIMER); EN_SAVE_TIMER = null; }
}
function enPhaseEnd(){
  enPhaseStopTimer();
  const d = S.day;
  if(!d || !d.activePhase || !d.phaseStartAt) return;
  const pid = d.activePhase;
  const secs = (Date.now() - d.phaseStartAt)/1000;
  d.activePhase = null;
  d.phaseStartAt = 0;
  if(secs >= 10){
    const mins = Math.max(1, Math.round(secs/60));
    if(!d.min) d.min = {};
    d.min[pid] = (d.min[pid]||0) + mins;
  }
  save();
}
function todayState(){
  const st = nursState();
  const t = new Date().toISOString().slice(0,10);
  if(!st.today || st.today.date !== t){
    st.today = { date:t, min:{}, active:null, startAt:0 };
    save();
  }
  return st.today;
}
function todayStats(){
  const st = nursState();
  const t = new Date().toISOString().slice(0,10);
  if(!st.dstats || st.dstats.date !== t){
    st.dstats = { date:t, q:0, qOk:0, terms:0, fixed:0, fey:0 };
    save();
  }
  return st.dstats;
}
function todayTotalMin(){
  const td = todayState();
  return TODAY_PHASES.reduce((s,p)=>s+(td.min[p.id]||0), 0);
}
let NURS_SAVE_TIMER = null;
function todayPhaseStart(pid){
  const td = todayState();
  todayPhaseEnd();  // 先结束之前的
  td.active = pid;
  td.startAt = Date.now();
  if(!td.lastStart) td.lastStart = {};
  td.lastStart[pid] = Date.now();
  save();
  if(NURS_SAVE_TIMER) clearInterval(NURS_SAVE_TIMER);
  NURS_SAVE_TIMER = setInterval(()=>{
    const st = nursState(), tdd = st.today;
    if(!tdd || !tdd.active || !tdd.startAt) return;
    const secs = (Date.now() - tdd.startAt)/1000;
    if(secs >= 30){
      const mins = Math.floor(secs/60);
      if(mins > 0){
        tdd.min[tdd.active] = (tdd.min[tdd.active]||0) + mins;
        tdd.startAt = Date.now();
        save();
      }
    }
  }, 30000);
}
function todayPhaseEnd(){
  if(NURS_SAVE_TIMER){ clearInterval(NURS_SAVE_TIMER); NURS_SAVE_TIMER = null; }
  const st = nursState(), td = st.today;
  if(!td || !td.active || !td.startAt) return;
  const pid = td.active;
  const secs = (Date.now()-td.startAt)/1000;
  td.active = null; td.startAt = 0;
  if(secs >= 10){
    const mins = Math.max(1, Math.round(secs/60));
    td.min[pid] = (td.min[pid]||0) + mins;
  }
  save();
}
function applyNursLangText(){
  document.querySelectorAll("[data-nt]").forEach(el=>{ el.textContent = nt(el.dataset.nt); });
  document.querySelectorAll(".nursLangBtn").forEach(b=>{ b.textContent = NURS_LANG==="zh" ? "EN" : "中"; });
  document.querySelectorAll(".gsyncBtn").forEach(b=>{ b.title = NURS_LANG==="en" ? "Google Cloud Sync" : "Google 云同步"; });
  if(SPACE==="nurs") document.title = NURS_LANG==="en" ? "Nursing Prep · Lexi" : "护理预科 · Lexi";
  if(typeof renderGSyncBtns==="function") renderGSyncBtns(); // ☁️ 同步按钮跟随语言
  // 空间切换器按钮跟随语言
  ["spEnTop","spEnSide"].forEach(id=>{ const e=$(id); if(e) e.textContent = nt("sp_en"); });
  ["spNursTop","spNursSide"].forEach(id=>{ const e=$(id); if(e) e.textContent = nt("sp_nurs"); });
}
function applyNursLang(){
  applyNursLangText();
  if(SPACE!=="nurs") return;
  // 原地重渲染当前视图：切换语言不再跳回 Today
  const cur = document.querySelector('.view.on');
  const vid = cur ? cur.id : 'v-nurs';
  try{
    if(vid==='v-nurs'){ if(NURS_RERENDER) NURS_RERENDER(); else renderToday(); }
    else if(vid==='v-courses') renderCourses();
    else if(vid==='v-learn') renderLearn();
    else if(vid==='v-progress') renderProgress();
    else if(vid==='v-wrong') renderWrong();
    else if(vid==='v-set') renderSettings();
    else if(vid==='v-road') renderRoad();
    else if(vid==='v-daily'){ if(DAILY && DAILY.i < DAILY.items.length) renderDailyItem(); else { DAILY=null; renderDaily(); } }
    else if(vid==='v-ear'){ if(!EarPlayer.quiz) EarPlayer.render(); } // 问答中不打断
  }catch(e){}
}
function toggleNursLang(){
  NURS_LANG = NURS_LANG==="zh" ? "en" : "zh";
  try{ localStorage.setItem("lexi_nurs_lang", NURS_LANG); }catch(e){}
  applyNursLang();
}
/* ---------- 护理预科 ---------- */
// 当前护理模块的重渲染函数：切换语言时原地刷新，不跳回 Today（有状态的测验/播放中则为 null）
let NURS_RERENDER = null;
const nursAud = w => "audio/nurs/ch1/" + w.toLowerCase().trim().replace(/[^a-z0-9]+/g,"_") + ".mp3";
const nursImg = w => "images/nurs/ch1/" + w.toLowerCase().trim().replace(/[^a-z0-9]+/g,"_") + ".jpg";
function sayNursTerm(w, onend){ playMp3(nursAud(w), onend, w); }
/* 中文语音（晓晓）：术语中文释义 t{i}.mp3，考点中文 p{si}_{pi}.mp3 */
const zhTermAud = i => "audio/nurs/ch1/zh/t" + i + ".mp3";
const zhPointAud = (si,pi) => "audio/nurs/ch1/zh/p" + si + "_" + pi + ".mp3";
function sayZhTerm(w){ const i = NURS_CH1.terms.findIndex(t=>t.w===w); if(i>=0) playMp3(zhTermAud(i)); }
function sayZhPoint(si,pi){ playMp3(zhPointAud(si,pi)); }
function nursState(){
  if(!S.nurs) S.nurs = {};
  if(!S.nurs.ch1) S.nurs.ch1 = {terms:{}, quizBest:0, mockBest:0, fey:{}, listen:{}, wrong:[], tagStats:{}, mockHistory:[]};
  const c = S.nurs.ch1;
  // 兼容老数据：terms {word:1} -> {l:2,n:0}
  for(const k in c.terms){ if(typeof c.terms[k]==="number") c.terms[k] = {l:2, n:0}; }
  if(!c.wrong) c.wrong = [];
  if(!c.tagStats) c.tagStats = {};
  if(!c.mockHistory) c.mockHistory = [];
  return c;
}
/* 标签正确率统计 */
function nursTagHit(g, ok){
  if(!g) return;
  const st = nursState();
  const t = st.tagStats[g] || (st.tagStats[g] = {n:0, r:0});
  t.n++; if(ok) t.r++;
  const ds = todayStats(); ds.q++; if(ok) ds.qOk++;
  save();
}
function nursTagAcc(g){
  const t = nursState().tagStats[g];
  return t && t.n>0 ? Math.round(t.r/t.n*100) : -1;
}
/* 错题收录 / 消灭 */
function nursAddWrong(q, mine){
  const st = nursState();
  if(st.wrong.some(w=>w.q===q.q)) return;
  st.wrong.push({q:q.q, o:q.o||null, a:q.a, e:q.e, g:q.g||"", t:q.t||"mc", mine:(mine==null?-1:mine), d:Date.now()});
  if(st.wrong.length>200) st.wrong = st.wrong.slice(-200);
  save();
}
function nursWrongFixed(qtext){
  const st = nursState();
  const before = st.wrong.length;
  st.wrong = st.wrong.filter(w=>w.q!==qtext);
  if(st.wrong.length!==before){ todayStats().fixed++; save(); }
  return before - st.wrong.length;
}
/* 术语间隔重复：SM-2 四档（Again/Hard/Good/Easy） */
const NURS_GAPS = [10*60*1000, 24*3600*1000, 3*24*3600*1000, 7*24*3600*1000, 14*24*3600*1000, 30*24*3600*1000, 60*24*3600*1000];
function nursTermRate(w, lv){
  // lv: 0 重来 / 1 困难 / 2 记得 / 3 简单
  const st = nursState();
  const r = st.terms[w] || {l:0, n:0};
  if(r.ef==null) r.ef = 2.5;  // 兼容老数据
  if(lv===0){ r.l = 0; r.ef = Math.max(1.3, r.ef-0.2); r.leech=(r.leech||0)+1; }
  else if(lv===1){ r.ef = Math.max(1.3, r.ef-0.15); /* l 不变 */ }
  else if(lv===2){ r.l = Math.min(6, r.l+1); }
  else { r.l = Math.min(6, r.l+2); r.ef = Math.min(3.0, r.ef+0.15); }
  const base = NURS_GAPS[Math.min(r.l, NURS_GAPS.length-1)];
  const mult = lv===0 ? 1 : (lv===1 ? 1.2 : r.ef/2.5);
  r.n = Date.now() + base * mult;
  st.terms[w] = r;
  todayStats().terms++;
  save();
}
function nursDueTerms(){
  const st = nursState(), now = Date.now();
  return NURS_CH1.terms.filter(t=>{ const r = st.terms[t.w]; return r && r.n<=now; }).map(t=>t.w);
}
/* 洗牌 */
function nursShuffle(a){ const r=a.slice(); for(let i=r.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=r[i]; r[i]=r[j]; r[j]=t; } return r; }
/* 各节名称 */
const NURS_SECS = {"1.1":"解剖与生理","1.2":"六个结构层次","1.3":"六大生命活动","1.4":"稳态与反馈","1.5":"解剖学术语"};
const NURS_SECS_EN = {"1.1":"Anatomy & Physiology","1.2":"Levels of Organization","1.3":"Life Processes","1.4":"Homeostasis & Feedback","1.5":"Anatomical Terms","1.6":"Aging","1.7":"Medical Imaging"};
const nursSecName = g => NURS_LANG==="en" ? (NURS_SECS_EN[g]||NURS_SECS[g]||"") : (NURS_SECS[g]||"");
function nursMetrics(){
  const st = nursState(), pg = nursProg();
  // 1. 课程进度：已学章节/29
  const coursePct = Math.round(1/29*100);  // 目前只有 Ch1
  // 2. 知识掌握：标签正确率加权
  const tags = Object.keys(st.tagStats||{});
  let mastery = 0;
  if(tags.length){
    mastery = Math.round(tags.reduce((s,g)=>s+nursTagAcc(g),0)/tags.length);
  }
  // 3. 考试准备度：模拟考最佳
  const readiness = st.mockBest||0;
  // 4. 保持度：1 - 到期未复习占比
  const dueN = nursDueTerms().length;
  const totalTerms = NURS_CH1.terms.length;
  const retention = Math.round(Math.max(0, 1 - dueN/Math.max(1,totalTerms))*100);
  // 预测分数：加权
  const predicted = Math.round(mastery*0.3 + readiness*0.4 + retention*0.2 + coursePct*0.1);
  // 风险知识点：正确率<70% 的标签
  const risks = tags.map(g=>({g, acc:nursTagAcc(g)}))
    .filter(x=>x.acc>=0 && x.acc<70)
    .sort((a,b)=>a.acc-b.acc).slice(0,3);
  return { coursePct, mastery, readiness, retention, predicted, risks };
}
function nursProg(){
  const p = nursState();
  const t = NURS_CH1.terms.length;
  const seen = Object.keys(p.terms).length;
  const pct = Math.round(seen/t*100), quizBest = p.quizBest||0, mockBest = p.mockBest||0, feyN = Object.keys(p.fey).length;
  const score = Math.round(pct*0.2 + quizBest*0.2 + mockBest*0.4 + (feyN/NURS_CH1.feynman.length*100)*0.2);
  return { seen, t, pct, quizBest, mockBest, feyN, score };
}
function nursBack(html){
  return `<div style="margin-bottom:12px"><button class="btn ghost" id="nursBackBtn">${nt("back")}</button></div>` + html;
}
function backToToday(){ document.body.classList.remove("hide-tabbar"); todayPhaseEnd(); renderToday(); }
/* ---------- 学习会话：45+10+45+10+10 节奏 ---------- */
const SESSION_PLAN = [
  {t:"study", min:45}, {t:"break", min:10}, {t:"study", min:45}, {t:"break", min:10}, {t:"study", min:10}
];
let SESSION = null;
function sessionStart(){
  if(SESSION && SESSION.timer) return;  // 已有会话在跑，不重复启动
  if(SESSION && SESSION.timer) clearInterval(SESSION.timer);
  SESSION = { idx:0, startAt:Date.now(), timer:null };
  sessionTick();
  SESSION.timer = setInterval(sessionTick, 1000);
  renderSessionWidget();
}
function sessionTick(){
  if(!SESSION) return;
  const plan = SESSION_PLAN[SESSION.idx];
  const elapsed = Math.floor((Date.now()-SESSION.startAt)/1000);
  const remain = plan.min*60 - elapsed;
  if(remain <= 0){
    SESSION.idx++;
    SESSION.startAt = Date.now();
    if(SESSION.idx >= SESSION_PLAN.length){ sessionEnd(); return; }
    const np = SESSION_PLAN[SESSION.idx];
    if(np.t==="break") alert(np.min + nt("sess_break"));
  }
  renderSessionWidget();
  updateStartBtns();
}
/* 今日学习按钮状态：进行中显示计时 */
function updateStartBtns(){
  const txt = ()=>{
    if(!SESSION) return null;
    const el = Math.floor((Date.now()-SESSION.startAt)/1000);
    const mm = String(Math.floor(el/60)).padStart(2,"0"), ss = String(el%60).padStart(2,"0");
    return `⏸ ${nt("start_today")} · ${mm}:${ss}`;
  };
  const t = txt();
  ["enSmartStart","sessStart"].forEach(id=>{
    const b = $(id); if(!b) return;
    if(t){ b.innerHTML = t; b.classList.remove("primary"); b.style.background = "#34C759"; }
    else {
      b.innerHTML = nt("start_today");
      b.classList.add("primary"); b.style.background = "";
    }
  });
}
function sessionEnd(){
  if(SESSION && SESSION.timer) clearInterval(SESSION.timer);
  SESSION = null;
  const w = $("sessionWidget");
  if(w) w.remove();
  updateStartBtns();
}
function renderSessionWidget(){
  return; // 用户要求去掉浮窗：后台计时继续，休息提醒走 alert
  if(!SESSION) return;
  let w = $("sessionWidget");
  if(!w){
    w = document.createElement("div");
    w.id = "sessionWidget";
    w.style.cssText = "position:fixed;bottom:80px;right:16px;z-index:999;background:#fff;border:1px solid var(--hair);border-radius:14px;padding:10px 14px;box-shadow:0 4px 16px rgba(0,0,0,.12);font-size:13px;";
    document.body.appendChild(w);
  }
  const plan = SESSION_PLAN[SESSION.idx];
  const elapsed = Math.floor((Date.now()-SESSION.startAt)/1000);
  const remain = Math.max(0, plan.min*60 - elapsed);
  const mm = String(Math.floor(remain/60)).padStart(2,"0"), ss = String(remain%60).padStart(2,"0");
  const label = plan.t==="break" ? nt("sess_break") : nt("sess_study");
  const totalMin = SESSION_PLAN.filter((p,i)=>i<=SESSION.idx&&p.t==="study").reduce((s,p)=>s+p.min,0);
  w.innerHTML = `<div style="font-weight:700">${label} ${mm}:${ss}</div>
    <div style="font-size:11px;color:var(--sub)">${NURS_LANG==="zh"?`第 ${SESSION.idx+1}/${SESSION_PLAN.length} 段`:`${SESSION.idx+1}/${SESSION_PLAN.length}`}</div>
    <div id="sessEnd" style="color:var(--blue);font-size:12px;cursor:pointer;margin-top:4px">${nt("sess_end")}</div>`;
  $("sessEnd").addEventListener("click", sessionEnd);
}
/* 今日驾驶舱：120 分钟学习系统 */
function renderToday(){
  NURS_RERENDER = renderToday;
  const td = todayState();
  const PHASES = todayPhases();
  const total = todayTotalMin();
  const m = nursMetrics();
  // 95分引擎：浅色拼色 Hero
  const goalBar = `
    <div class="gcard" style="padding:20px;margin-bottom:14px;background:linear-gradient(135deg,rgba(227,237,255,.7),rgba(243,233,255,.7))">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:12px;color:#636366;font-weight:600">🎯 ${nt("goal_95")}</div>
          <div style="font-size:20px;font-weight:800;color:#1C1C1E">${nt("today")} · BIOL 235</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:#636366">${nt("predicted_now")}</div>
          <div style="font-size:30px;font-weight:800;color:${m.predicted>=90?"#34C759":m.predicted>=70?"#FF9500":"#FF3B30"}">${m.predicted}%</div>
        </div>
      </div>
      ${m.risks.length?`<div style="margin-top:12px;font-size:13px;background:rgba(255,255,255,.7);border-radius:12px;padding:10px 12px">
        <div style="font-weight:700;margin-bottom:4px">🔴 ${nt("weakest")}</div>
        ${m.risks.map(r=>`<div style="display:flex;justify-content:space-between;padding:2px 0">
          <span>${r.g} ${nursSecName(r.g)}</span><span style="color:#FF3B30;font-weight:700">${r.acc}%</span>
        </div>`).join("")}
      </div>`:""}
    </div>`;
  const pct = Math.min(100, Math.round(total/120*100));
  const phases = PHASES.map(p=>{
    const done = td.min[p.id]||0;
    const isDone = done >= p.min;
    return `<div data-phase="${p.id}" class="ghover" style="display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:14px;${isDone?"opacity:.55":""}">
      <div style="font-size:24px;flex:none">${p.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:15px">${nt("phase_"+p.id)} ${isDone?'<span style="color:#34C759">✓</span>':""}</div>
        <div style="font-size:12px;color:#8E8E93">${nt("phase_"+p.id+"_s")}</div>
      </div>
      <div style="font-size:13px;color:#8E8E93;flex:none">${done}/${p.min} ${nt("min_unit")}</div>
      <div style="color:#C7C7CC;font-size:18px;flex:none">›</div>
    </div>`;
  }).join("");
  $("nursHome").innerHTML = goalBar + `
    <div class="gcard" style="padding:20px;margin-bottom:14px;background:linear-gradient(135deg,rgba(223,247,228,.7),rgba(227,237,255,.7))">
      <div style="font-size:12px;color:#636366;font-weight:600">${nt("today")} · 120 ${nt("min_unit")}</div>
      <div style="font-size:22px;font-weight:800;color:#1C1C1E;margin:4px 0">${total} / 120 ${nt("min_unit")}${total>=120?' · <span style="color:#34C759">✓</span>':""}</div>
      <div style="height:6px;background:rgba(0,0,0,.07);border-radius:4px;overflow:hidden;margin-bottom:14px"><div style="height:100%;width:${pct}%;background:#34C759;border-radius:4px"></div></div>
      <button id="sessStart" class="ghover" style="width:100%;padding:13px;font-size:15px;font-weight:700;border:1px solid rgba(255,255,255,.7);border-radius:14px;background:rgba(255,255,255,.65);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);color:#007AFF;cursor:pointer;box-shadow:0 4px 16px rgba(0,122,255,.12)">⏱ ${nt("start_today")}</button>
    </div>
    <div style="font-size:20px;font-weight:700;margin:4px 4px 10px">${nt("today")}</div>
    <div class="gcard" style="padding:6px;overflow:hidden;margin-bottom:14px">${phases}</div>
    <div style="text-align:center;margin-top:8px;display:flex;gap:12px;justify-content:center">
      <span id="allMods" style="color:var(--blue);font-size:14px;cursor:pointer">${nt("nav_learn")} →</span>
      <span id="todaySummary" style="color:var(--blue);font-size:14px;cursor:pointer">📊 ${nt("today")} summary →</span>
    </div>`;
  // 阶段直达学习内容（课程系统：点阶段即开始学，不经过模块选择页）
  $("nursHome").querySelectorAll("[data-phase]").forEach(b=>b.addEventListener("click", ()=>{
    const pid = b.dataset.phase;
    todayPhaseStart(pid);
    if(pid==="recall") startDaily();           // 复习 → 每日练习
    else if(pid==="learn") nursPoints();       // 新知识 → 考点提炼
    else if(pid==="understand") nursFeynman(0);// 深度理解 → 费曼复述
    else if(pid==="practice") nursQuizStart(); // 练习 → 章节测验
    else if(pid==="english") nursEarStart();   // 护理英语 → 磨耳朵
    else if(pid==="fix") go("v-progress");     // 错题修复 → 进度页错题区
  }));
  $("allMods").addEventListener("click", ()=>{ todayPhaseEnd(); renderNursCh(); });
  $("sessStart").addEventListener("click", ()=>{
    const td2 = todayState();
    const phs = todayPhases();
    // 按固定顺序找第一个没学完的阶段，直接进学习内容（无计时器）
    const next = phs.find(p => (td2.min[p.id]||0) < p.min) || phs[0];
    todayPhaseStart(next.id);
    if(next.id==="recall") startDaily();
    else if(next.id==="learn") nursPoints();
    else if(next.id==="understand") nursFeynman(0);
    else if(next.id==="practice") nursQuizStart();
    else if(next.id==="english") nursEarStart();
    else if(next.id==="fix") go("v-wrong");
  });
  const sumBtn = $("todaySummary");
  if(sumBtn) sumBtn.addEventListener("click", renderTodaySummary);
}
/* 每日学习总结 */
function renderTodaySummary(){
  const td = todayState(), ds = todayStats(), m = nursMetrics();
  const total = todayTotalMin();
  const qAcc = ds.q ? Math.round(ds.qOk/ds.q*100) : 0;
  const phaseRows = TODAY_PHASES.map(p=>{
    const done = td.min[p.id]||0;
    return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--hair)">
      <span>${p.icon} ${nt("phase_"+p.id)}</span>
      <span style="font-weight:700">${done} / ${p.min} ${nt("min_unit")}</span>
    </div>`;
  }).join("");
  $("nursHome").innerHTML = nursBack(`
    <div class="card" style="padding:24px;text-align:center;margin-bottom:12px">
      <div style="font-size:40px">🎉</div>
      <div style="font-size:20px;font-weight:800;margin:8px 0">${nt("today")} ✓</div>
      <div style="font-size:32px;font-weight:800;color:var(--blue)">${total} / 120 ${nt("min_unit")}</div>
    </div>
    <div class="card" style="padding:16px;margin-bottom:12px">${phaseRows}</div>
    <div class="card" style="padding:16px;margin-bottom:12px">
      <div style="font-weight:700;margin-bottom:8px">📊 ${nt("today")}</div>
      <div style="font-size:14px;line-height:2">
        ✍ ${nt("m_quiz")}: ${ds.qOk} / ${ds.q} (${qAcc}%)<br>
        🗂 ${nt("m_terms")}: ${ds.terms} ${nt("terms_unit")}<br>
        🔧 ${nt("wrong_title")}: ${ds.fixed} fixed<br>
        ❝ Feynman: ${ds.fey}
      </div>
    </div>
    <div class="card" style="padding:16px;background:linear-gradient(135deg,#E9F2FE,#D9E9FC);border:none">
      <div style="font-size:13px;color:var(--sub)">📈 ${nt("overall")} prediction</div>
      <div style="font-size:28px;font-weight:800">${m.predicted}%</div>
      <div style="font-size:11px;color:var(--sub)">* predicted, not actual exam score</div>
    </div>`);
  $("nursBackBtn").addEventListener("click", backToToday);
}
/* 课程视图：章节列表 */
function renderCourses(){
  const pg = nursProg();
  $("coursesBody").innerHTML = `
    <div class="gcard" style="padding:18px;margin-bottom:12px;background:linear-gradient(135deg,rgba(233,242,254,.7),rgba(217,233,252,.7))">
      <div style="font-size:11px;color:var(--blue);font-weight:800;letter-spacing:2px">CHAPTER 1</div>
      <div style="font-size:20px;font-weight:800;margin-top:4px">${nt("ch1_name")}</div>
      <div style="font-size:12.5px;color:var(--sub);margin-top:3px">${nt("ch1_en")}</div>
      <div style="font-size:13px;color:var(--sub);margin-top:8px">${nt("learned")} ${pg.seen}/${pg.t} · ${nt("quiz_best")} ${pg.quizBest}%</div>
    </div>
    <div style="font-size:20px;font-weight:700;margin:16px 4px 10px">📚 ${nt("learn_group")}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      <div class="gcard ghover" id="lmPoints" style="padding:20px 12px;text-align:center"><div style="font-size:32px;margin-bottom:8px">📋</div><div style="font-size:14px;font-weight:700">${nt("mod_points")}</div><div style="font-size:11px;color:var(--sub);margin-top:4px">${nt("mod_points_s")}</div></div>
      <div class="gcard ghover" id="lmTerms" style="padding:20px 12px;text-align:center"><div style="font-size:32px;margin-bottom:8px">🗂</div><div style="font-size:14px;font-weight:700">${nt("mod_terms")}</div><div style="font-size:11px;color:var(--sub);margin-top:4px">${nt("mod_terms_s")}</div></div>
      <div class="gcard ghover" id="lmFey" style="padding:20px 12px;text-align:center"><div style="font-size:32px;margin-bottom:8px">❝</div><div style="font-size:14px;font-weight:700">${nt("mod_fey")}</div><div style="font-size:11px;color:var(--sub);margin-top:4px">${nt("mod_fey_s")}</div></div>
    </div>
    <div style="font-size:20px;font-weight:700;margin:20px 4px 10px">✍️ ${nt("practice_group")}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="gcard ghover" id="lmQuiz" style="padding:20px 12px;text-align:center"><div style="font-size:32px;margin-bottom:8px">✍</div><div style="font-size:14px;font-weight:700">${nt("mod_quiz")}</div><div style="font-size:11px;color:var(--sub);margin-top:4px">${nt("mod_quiz_s")}</div></div>
      <div class="gcard ghover" id="lmMock" style="padding:20px 12px;text-align:center"><div style="font-size:32px;margin-bottom:8px">⏱</div><div style="font-size:14px;font-weight:700">${nt("mod_mock")}</div><div style="font-size:11px;color:var(--sub);margin-top:4px">${nt("mod_mock_s")}</div></div>
      <div class="gcard ghover" id="lmMatch" style="padding:20px 12px;text-align:center"><div style="font-size:32px;margin-bottom:8px">⚡</div><div style="font-size:14px;font-weight:700">${nt("mod_match")}</div><div style="font-size:11px;color:var(--sub);margin-top:4px">${nt("mod_match_s")}</div></div>
      <div class="gcard ghover" id="lmListen" style="padding:20px 12px;text-align:center"><div style="font-size:32px;margin-bottom:8px">🔊</div><div style="font-size:14px;font-weight:700">${nt("mod_listen")}</div><div style="font-size:11px;color:var(--sub);margin-top:4px">${nt("mod_listen_s")}</div></div>
    </div>
    <div style="font-size:20px;font-weight:700;margin:20px 4px 10px">🔍 ${nt("explore_group")}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      <div class="gcard ghover" id="lmAtlas" style="padding:20px 12px;text-align:center"><div style="font-size:32px;margin-bottom:8px">🫀</div><div style="font-size:14px;font-weight:700">${nt("mod_atlas")}</div><div style="font-size:11px;color:var(--sub);margin-top:4px">${nt("mod_atlas_s")}</div></div>
      <div class="gcard ghover" id="lmBody" style="padding:20px 12px;text-align:center"><div style="font-size:32px;margin-bottom:8px">🧍</div><div style="font-size:14px;font-weight:700">${nt("mod_body")}</div><div style="font-size:11px;color:var(--sub);margin-top:4px">${nt("mod_body_s")}</div></div>
      <div class="gcard ghover" id="lmEar" style="padding:20px 12px;text-align:center"><div style="font-size:32px;margin-bottom:8px">🎧</div><div style="font-size:14px;font-weight:700">${nt("mod_ear")}</div><div style="font-size:11px;color:var(--sub);margin-top:4px">${nt("mod_ear_s")}</div></div>
    </div>
    <div class="gcard" style="padding:16px;color:var(--sub);font-size:13px;margin-top:12px">${nt("ch2_todo")}</div>`;
  const goMod = fn => ()=>{ go("v-nurs"); fn(); };
  $("lmPoints").addEventListener("click", goMod(nursPoints));
  $("lmTerms").addEventListener("click", goMod(()=>nursTerms(nursTermsQueue(),0)));
  $("lmListen").addEventListener("click", goMod(nursListen));
  $("lmMatch").addEventListener("click", goMod(nursMatch));
  $("lmQuiz").addEventListener("click", goMod(nursQuizStart));
  $("lmFey").addEventListener("click", goMod(()=>nursFeynman(0)));
  $("lmAtlas").addEventListener("click", goMod(nursAtlas));
  $("lmMock").addEventListener("click", goMod(nursMockIntro));
  $("lmBody").addEventListener("click", goMod(()=>nursBody("heart")));
  $("lmEar").addEventListener("click", nursEarStart);
}
/* renderLearn 已合并进 renderCourses */
/* 进度视图：仪表盘 + 路线图 */
function renderProgress(){
  const pg = nursProg(), m = nursMetrics();
  const st = nursState();
  const wrongN = st.wrong.length;
  // 错题置顶卡（明显位置）
  const wrongTop = `
    <div class="gcard ghover" id="progWrongTop" style="padding:18px;margin-bottom:12px;border-left:5px solid #FF3B30;cursor:pointer">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="font-size:32px">❌</div>
        <div style="flex:1">
          <div style="font-size:16px;font-weight:800">${nt("nav_mistakes")} ${wrongN?`<span style="color:#FF3B30">(${wrongN})</span>`:""}</div>
          <div style="font-size:12px;color:var(--sub);margin-top:2px">${wrongN?nt("wrong_go_hint"):nt("wrong_empty")}</div>
        </div>
        <div style="color:#C7C7CC;font-size:20px">›</div>
      </div>
    </div>`;
  // 95分极简 Hero
  const goalHtml = `
    <div class="gcard" style="padding:20px;margin-bottom:12px;background:linear-gradient(135deg,rgba(233,242,254,.7),rgba(243,233,255,.7))">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:12px;color:var(--sub)">🎯 ${nt("prog_goal")} 95%</div>
          <div style="font-size:38px;font-weight:800;color:${m.predicted>=90?"#34C759":m.predicted>=75?"#FF9500":"#FF3B30"};line-height:1.2">${m.predicted}%</div>
          <div style="font-size:12px;color:var(--sub)">${nt("predicted_now")}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:13px;color:var(--sub)">${nt("prog_gap")}</div>
          <div style="font-size:24px;font-weight:800">${Math.max(0,95-m.predicted)}%</div>
        </div>
      </div>
      ${m.risks.length?`<div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(0,0,0,.06)">
        <div style="font-size:13px;font-weight:700;margin-bottom:6px">🔴 ${nt("prog_risks")}</div>
        ${m.risks.slice(0,3).map(r=>`<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px">
          <span>${r.g} ${nursSecName(r.g)}</span><span style="color:#FF3B30;font-weight:700">${r.acc}%</span>
        </div>`).join("")}
      </div>`:""}
    </div>`;
  $("progressBody").innerHTML = wrongTop + goalHtml + `
    <div class="gcard" style="padding:18px;margin-bottom:12px">
      <div style="font-size:15px;font-weight:700;margin-bottom:12px">${nt("overall")}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;text-align:center">
        <div><div style="font-size:24px;font-weight:800;color:#007AFF">${pg.seen}<span style="font-size:13px;color:var(--sub)">/${pg.t}</span></div><div style="font-size:12px;color:var(--sub)">${nt("m_terms")}</div></div>
        <div><div style="font-size:24px;font-weight:800;color:#007AFF">${pg.quizBest}%</div><div style="font-size:12px;color:var(--sub)">${nt("quiz_best")}</div></div>
        <div><div style="font-size:24px;font-weight:800;color:#007AFF">${pg.feyN}<span style="font-size:13px;color:var(--sub)">/${NURS_CH1.feynman.length}</span></div><div style="font-size:12px;color:var(--sub)">${nt("mod_fey")}</div></div>
      </div>
    </div>
    <div style="font-size:20px;font-weight:700;margin:20px 4px 10px">${nt("nav_mistakes")} <span id="progWrongCount" style="font-size:14px;color:var(--sub);font-weight:400"></span></div>
    <div id="progressWrong"></div>`;
  // 路线图内容复用
  const tmp = document.createElement("div");
  const pwt = $("progWrongTop");
  if(pwt) pwt.addEventListener("click", ()=>{
    const pw = $("progressWrong");
    if(pw) pw.scrollIntoView({behavior:"smooth"});
  });
  renderProgWrong();
}
// 进度页内的错题区（与错题本共用逻辑）
function renderProgWrong(){
  const st = nursState();
  const ws = st.wrong.slice().reverse();
  const el = $("progressWrong");
  if(!el) return;
  $("progWrongCount").textContent = ws.length ? `(${ws.length})` : "";
  el.innerHTML = ws.length ? `
    <div class="gcard ghover" style="padding:14px;margin-bottom:12px;text-align:center;cursor:pointer" id="progWrongGo">
      <div style="font-size:15px;font-weight:700;color:#007AFF">${nt("wrong_go")} →</div>
      <div style="font-size:12px;color:var(--sub);margin-top:4px">${nt("wrong_sub")}</div>
    </div>
    ${ws.slice(0,5).map(w=>{
      const isTF = w.t==="tf";
      const fresh = NURS_CH1.quiz.find(q=>q.q===w.q);
      const curA = fresh ? fresh.a : w.a;
      const opts = isTF ? (NURS_LANG==="en"?["True","False"]:["正确 True","错误 False"]) : (w.o||[]);
      return `<div class="gcard" style="padding:14px;margin-bottom:10px;border-left:4px solid #FF9500">
        <div style="font-size:12px;color:var(--sub);margin-bottom:4px">${w.g||""} ${nursSecName(w.g)}</div>
        <div style="font-weight:600;font-size:14px;line-height:1.6">${esc(w.q)}</div>
        <div style="font-size:13px;margin-top:6px;color:var(--sub)">${nt("correct_ans")}: <b style="color:#34C759">${opts[curA]?esc(opts[curA]):""}</b></div>
      </div>`;
    }).join("")}
    ${ws.length>5?`<div style="text-align:center;padding:8px;font-size:13px;color:var(--sub)">${nt("wg_more").replace("{n}", ws.length-5)}</div>`:""}
  ` : `<div class="gcard" style="padding:20px;text-align:center;color:var(--sub);font-size:13px">${nt("wrong_empty")}</div>`;
  const g = $("progWrongGo");
  if(g) g.addEventListener("click", ()=>startDaily());
}
function renderNursHome(){
  const pg = nursProg();
  $("nursSub").textContent = nt("unit_sub");
  $("nursHome").innerHTML = `
    <div class="nurs-unit">
      <div class="sec">Unit 1</div>
      <div class="card" id="nursCh1" style="padding:0;overflow:hidden;cursor:pointer">
        <div style="background:linear-gradient(135deg,#E9F2FE 0%,#D9E9FC 60%,#CFE3FB 100%);padding:20px;display:flex;align-items:center;gap:14px">
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;color:var(--blue);font-weight:800;letter-spacing:2px">CHAPTER 1</div>
            <div style="font-size:21px;font-weight:800;margin-top:4px">${nt("ch1_name")}</div>
            <div style="font-size:12.5px;color:var(--sub);margin-top:3px">An Introduction to the Human Body</div>
            <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
              ${nt("ch_card_tags").split(" · ").map(c=>`<span style="font-size:11px;background:rgba(255,255,255,.75);border-radius:8px;padding:3px 9px;color:var(--txt);font-weight:600">${c}</span>`).join("")}
            </div>
          </div>
          <div style="position:relative;width:76px;height:76px;flex:none">
            <svg width="76" height="76" viewBox="0 0 76 76">
              <circle cx="38" cy="38" r="32" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="8"/>
              <circle cx="38" cy="38" r="32" fill="none" stroke="#2F7DE1" stroke-width="8" stroke-linecap="round"
                stroke-dasharray="201" stroke-dashoffset="${(201*(1-pg.pct/100)).toFixed(1)}" transform="rotate(-90 38 38)"/>
            </svg>
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800">${pg.pct}%</div>
          </div>
        </div>
        <div style="padding:12px 20px;display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:13px;color:var(--sub)">${nt("learned")} ${pg.seen}/${pg.t} ${nt("terms_unit")} · ${nt("quiz_best")} ${pg.quizBest}%</div>
          <div style="font-size:14px;font-weight:700;color:var(--blue)">${nt("enter")}</div>
        </div>
      </div>
      <div style="font-size:13px;color:var(--sub);margin-top:10px">${nt("ch2_todo")}</div>
    </div>
    <div class="sec">${nt("dashboard")}</div>
    <div class="card" style="padding:18px">
      <div style="display:flex;align-items:center;gap:18px">
        <div style="position:relative;width:104px;height:104px;flex:none">
          <svg width="104" height="104" viewBox="0 0 104 104">
            <circle cx="52" cy="52" r="44" fill="none" stroke="#EFEFF4" stroke-width="10"/>
            <circle cx="52" cy="52" r="44" fill="none" stroke="#2F7DE1" stroke-width="10"
              stroke-linecap="round" stroke-dasharray="276.5" stroke-dashoffset="${(276.5*(1-pg.score/100)).toFixed(1)}"
              transform="rotate(-90 52 52)"/>
          </svg>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
            <div style="font-size:26px;font-weight:800">${pg.score}</div>
            <div style="font-size:11px;color:var(--sub)">/ 100</div>
          </div>
        </div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:15px;margin-bottom:2px">${nt("overall")}</div>
          <div style="font-size:12px;color:var(--sub);line-height:1.7">${nt("m_terms")} 20% · ${nt("m_quiz")} 20% · <b>${nt("m_mock")} 40%</b> · ${nt("m_fey")} 20%</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-top:14px">
        <div style="background:var(--bg);border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:20px;font-weight:800;color:var(--blue)">${pg.pct}%</div>
          <div style="font-size:11px;color:var(--sub);margin-top:2px">${nt("m_terms")}<br>${pg.seen}/${pg.t}</div>
        </div>
        <div style="background:var(--bg);border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:20px;font-weight:800;color:var(--blue)">${pg.quizBest}%</div>
          <div style="font-size:11px;color:var(--sub);margin-top:2px">${nt("mod_quiz")}<br>${nt("quiz_best")}</div>
        </div>
        <div style="background:var(--bg);border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:20px;font-weight:800;color:var(--blue)">${pg.mockBest}%</div>
          <div style="font-size:11px;color:var(--sub);margin-top:2px">${nt("mod_mock")}<br>${nt("quiz_best")}</div>
        </div>
        <div style="background:var(--bg);border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:20px;font-weight:800;color:var(--blue)">${pg.feyN}/${NURS_CH1.feynman.length}</div>
          <div style="font-size:11px;color:var(--sub);margin-top:2px">${nt("mod_fey")}<br>${nt("fey_done")}</div>
        </div>
      </div>
    </div>
    <div class="sec">${nt("mastery")}</div>
    <div class="card" style="padding:16px">
      ${Object.keys(NURS_SECS).map(g=>{
        const acc = nursTagAcc(g);
        const label = acc<0 ? nt("not_tested") : acc+"%";
        const color = acc<0 ? "var(--sub)" : acc>=90 ? "#34C759" : acc>=70 ? "#FF9500" : "#FF3B30";
        return `<div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
            <span><b>${g}</b> ${nursSecName(g)}</span><b style="color:${color}">${label}</b>
          </div>
          <div style="height:8px;background:#EFEFF4;border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${acc<0?0:acc}%;background:${color};border-radius:4px"></div>
          </div>
        </div>`;
      }).join("")}
      <div style="font-size:11px;color:var(--sub)">${nt("dash_acc_note")}</div>
    </div>
    ${(()=>{
      const st = nursState();
      const weak = Object.keys(NURS_SECS).map(g=>({g, acc:nursTagAcc(g)}))
        .filter(x=>x.acc>=0).sort((a,b)=>a.acc-b.acc)[0];
      const dueN = nursDueTerms().length;
      const wrongN = st.wrong.length;
      if(!weak && dueN===0 && wrongN===0) return "";
      return `<div class="card" style="padding:16px;margin-top:12px;border:1.5px solid #FFD9A0;background:#FFFBF2">
        <div style="font-weight:700;font-size:14px;margin-bottom:6px">${nt("dash_today_focus")}</div>
        <div style="font-size:13px;line-height:1.9">
          ${weak?`· ${nt("dash_weakest")}：<b>${weak.g} ${nursSecName(weak.g)}</b>（${nt("accuracy")} ${weak.acc}%）<br>`:""}
          ${wrongN?`· ${nt("dash_wrong_left")}<b>${wrongN}</b> ${nt("dash_not_fixed")}<br>`:""}
          ${dueN?`· <b>${dueN}</b> ${nt("dash_terms_due")}<br>`:""}
        </div>
        <button class="btn primary" id="dashDaily" style="margin-top:10px;width:100%">${nt("daily_start")}</button>
      </div>`;
    })()}
    <div class="card" style="padding:14px;font-size:13px;color:var(--sub)">${nt("dash_road_hint")}</div>`;
  $("nursCh1").addEventListener("click", renderNursCh);
  const dd = $("dashDaily");
  if(dd) dd.addEventListener("click", ()=>go("v-daily"));
}
function renderNursCh(){
  const pg = nursProg();
  $("nursHome").innerHTML = nursBack(`
    <div class="big-title" style="font-size:22px">${nt("ch1")}：${nt("ch1_name")}</div>
    <div class="hello" style="margin:4px 0 12px">${nt("ch1_en")} · ${nt("learned")} ${pg.seen}/${pg.t} ${nt("terms_unit")} · ${nt("quiz_best")} ${pg.quizBest}%</div>
    <div class="nurs-mod">
      <div class="gcard ghover" id="nmPoints"><div class="ic">📋</div><div class="t">${nt("mod_points")}</div><div class="s">${nt("mod_points_s")}</div></div>
      <div class="gcard ghover" id="nmTerms"><div class="ic">🗂</div><div class="t">${nt("mod_terms")}</div><div class="s">${nt("mod_terms_s")}</div></div>
      <div class="gcard ghover" id="nmListen"><div class="ic">🔊</div><div class="t">${nt("mod_listen")}</div><div class="s">${nt("mod_listen_s")}</div></div>
      <div class="gcard ghover" id="nmMatch"><div class="ic">⚡</div><div class="t">${nt("mod_match")}</div><div class="s">${nt("mod_match_s")}</div></div>
      <div class="gcard ghover" id="nmQuiz"><div class="ic">✍</div><div class="t">${nt("mod_quiz")}</div><div class="s">${nt("mod_quiz_s")}</div></div>
      <div class="gcard ghover" id="nmFey"><div class="ic">❝</div><div class="t">${nt("mod_fey")}</div><div class="s">${nt("mod_fey_s")}</div></div>
      <div class="gcard ghover" id="nmAtlas"><div class="ic">🫀</div><div class="t">${nt("mod_atlas")}</div><div class="s">${nt("mod_atlas_s")}</div></div>
      <div class="gcard ghover" id="nmMock"><div class="ic">⏱</div><div class="t">${nt("mod_mock")}</div><div class="s">${nt("mod_mock_s")}</div></div>
      <div class="gcard ghover" id="nmBody"><div class="ic">🧍</div><div class="t">${nt("mod_body")}</div><div class="s">${nt("mod_body_s")}</div></div>
      <div class="gcard ghover" id="nmEar"><div class="ic">🎧</div><div class="t">${nt("mod_ear")}</div><div class="s">${nt("mod_ear_s")}</div></div>
    </div>`);
  $("nursBackBtn").addEventListener("click", backToToday);
  $("nmPoints").addEventListener("click", nursPoints);
  $("nmTerms").addEventListener("click", ()=>nursTerms(nursTermsQueue(),0));
  $("nmListen").addEventListener("click", nursListen);
  $("nmMatch").addEventListener("click", nursMatch);
  $("nmQuiz").addEventListener("click", nursQuizStart);
  $("nmFey").addEventListener("click", ()=>nursFeynman(0));
  $("nmAtlas").addEventListener("click", nursAtlas);
  $("nmMock").addEventListener("click", nursMockIntro);
  $("nmBody").addEventListener("click", ()=>nursBody("heart"));
  $("nmEar").addEventListener("click", nursEarStart);
}
/* 人体探秘：可点击器官的人体交互界面 */
const NURS_ORGANS = {
  brain:  {e:"brain", c:"脑", img:"brain.jpg", loc:"颅腔 cranial cavity", le:"cranial cavity", fn:"神经中枢：接收感觉信息、发出运动指令；是反馈调节的控制中枢。", fe:"Control center: receives sensory input and issues motor commands; the command hub of feedback regulation.", rel:["cranial cavity","meninges","control center"]},
  lungs:  {e:"lungs", c:"肺", img:"lungs.jpg", loc:"胸膜腔 pleural cavity", le:"pleural cavity", fn:"气体交换：摄取氧气、排出二氧化碳；表面覆有胸膜。", fe:"Gas exchange: takes in oxygen and expels carbon dioxide; covered by the pleura.", rel:["pleural cavity","thoracic cavity"]},
  heart:  {e:"heart", c:"心脏", img:"heart.jpg", loc:"心包腔 pericardial cavity（纵隔内）", le:"pericardial cavity (mediastinum)", fn:"血液泵：将血液泵向全身；是血压反馈调节的效应器之一。", fe:"Blood pump: drives blood to the whole body; an effector in blood-pressure feedback.", rel:["pericardial cavity","mediastinum"]},
  liver:  {e:"liver", c:"肝", img:"liver.jpg", loc:"右上腹 RUQ（上腹区）", le:"right upper quadrant (epigastric region)", fn:"人体最大腺体：代谢营养物质、解毒、分泌胆汁帮助脂肪消化。", fe:"Largest gland: metabolizes nutrients, detoxifies, and secretes bile to aid fat digestion.", rel:["epigastric"]},
  stomach:{e:"stomach", c:"胃", img:"stomach.jpg", loc:"左上腹 LUQ", le:"left upper quadrant", fn:"搅拌食物、分泌胃酸和胃蛋白酶，进行初步消化。", fe:"Churns food and secretes gastric acid and pepsin for initial digestion.", rel:["abdominopelvic cavity"]},
  kidneys:{e:"kidneys", c:"肾", img:"kidneys.jpg", loc:"腹后壁（腹膜后位）", le:"posterior abdominal wall (retroperitoneal)", fn:"滤过血液形成尿液，维持水盐平衡与酸碱平衡、调节血压。", fe:"Filters blood to form urine; maintains water–salt and acid–base balance; regulates blood pressure.", rel:["deep"]},
  intestines:{e:"intestines", c:"肠", img:"intestines.jpg", loc:"腹腔 abdominal cavity", le:"abdominal cavity", fn:"小肠完成消化和营养吸收；大肠吸收水分、形成粪便。", fe:"Small intestine completes digestion and nutrient absorption; large intestine absorbs water and forms feces.", rel:["abdominopelvic cavity","viscera"]},
  skin:   {e:"skin", c:"皮肤", img:"skin.jpg", loc:"体表 body surface", le:"body surface", fn:"人体最大器官：由上皮、结缔、肌肉、神经多种组织构成——所以是 organ 不是 tissue；保护身体、调节体温、感知刺激。", fe:"Largest organ: built from epithelial, connective, muscle, and nervous tissue — hence an organ, not just tissue; protects the body, regulates temperature, senses stimuli.", rel:["superficial","deep"]}
};
const NURS_BODY_ORDER = ["brain","lungs","heart","liver","stomach","kidneys","intestines","skin"];
let NB_SEL = "heart", NB_VISITED = {};
try{ NB_VISITED = JSON.parse(localStorage.getItem("lexi_nurs_body_v")||"{}"); }catch(e){ NB_VISITED = {}; }
/* 人体探秘 v2：点选探索 + 从上到下导览 + 探索进度 + 相关术语联动闪卡 */
function nursBody(sel){
  const O = NURS_ORGANS, order = NURS_BODY_ORDER;
  if(sel && O[sel]) NB_SEL = sel;
  sel = NB_SEL;
  NURS_RERENDER = ()=>nursBody(sel);
  NB_VISITED[sel] = 1;
  try{ localStorage.setItem("lexi_nurs_body_v", JSON.stringify(NB_VISITED)); }catch(e){}
  const nV = order.filter(k=>NB_VISITED[k]).length;
  const idx = order.indexOf(sel);
  const info = O[sel];
  const spots = [
    ["brain",50,15],["lungs",50,54],["heart",55,62],["liver",44,76],
    ["stomach",58,90],["kidneys",38,85],["intestines",50,105],["skin",71,97]
  ];
  const svg = `<svg viewBox="0 0 100 200" style="width:100%;max-width:360px;height:auto;display:block;margin:0 auto">
    <image href="images/nurs/body_base.jpg" x="0" y="0" width="100" height="200"/>
    <style>@keyframes nbPulse{0%{r:5;opacity:.5}70%{r:9;opacity:0}100%{r:9;opacity:0}}</style>
    ${spots.map(sp=>{
      const id=sp[0], on=id===sel, vis=NB_VISITED[id];
      const fill = on?"#2F7DE1":(vis?"#34C759":"#FFFFFF");
      return `<g data-o="${id}" style="cursor:pointer">`
        +((on||!vis)?`<circle cx="${sp[1]}" cy="${sp[2]}" r="5" fill="none" stroke="${on?"#2F7DE1":"#2F7DE1"}" stroke-width="1.2" style="animation:nbPulse 1.8s ease-out infinite;pointer-events:none"/>`:"")
        +`<circle cx="${sp[1]}" cy="${sp[2]}" r="4.2" fill="${fill}" fill-opacity="${on?0.95:0.9}" stroke="#FFFFFF" stroke-width="1.6"/>`
        +(vis&&!on?`<text x="${sp[1]}" y="${sp[2]+1.6}" text-anchor="middle" font-size="4.5" font-weight="800" fill="#FFFFFF" style="pointer-events:none">✓</text>`:"")
        +`</g>`;
    }).join("")}
  </svg>`;
  const relChips = (info.rel||[]).map(r=>{
    const ti = NURS_CH1.terms.findIndex(t=>t.w.toLowerCase()===r.toLowerCase());
    return ti>=0?`<button class="btn ghost" data-term="${ti}" style="padding:6px 12px;font-size:12px">${esc(r)}</button>`:"";
  }).join("");
  const prev = order[(idx-1+order.length)%order.length], next = order[(idx+1)%order.length];
  $("nursHome").innerHTML = nursBack(`
    <div class="big-title" style="font-size:20px;margin-bottom:4px">${nt("ex_title")}</div>
    <div class="hello" style="margin-bottom:8px">${nt("ex_hint")} <b style="color:var(--blue)">${nV}/${order.length}</b></div>
    <div style="height:8px;background:#E8EEF5;border-radius:4px;margin-bottom:10px;overflow:hidden">
      <div style="height:100%;width:${Math.round(nV/order.length*100)}%;background:linear-gradient(90deg,#2F7DE1,#5AA2F0);border-radius:4px;transition:width .4s"></div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button class="btn primary" id="nbTour" style="flex:1">🧭 ${idx===0?nt("ex_tour"):nt("ex_tour2")}</button>
      <button class="btn ghost" id="nbQuiz" style="flex:1">🎯 ${nt("label_quiz")}</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr;gap:12px" class="nurs-body-grid">
      <div class="card" style="padding:10px">${svg}
        <div style="text-align:center;font-size:11px;color:var(--sub);margin-top:6px">${nt("ex_legend")}</div>
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        <img src="images/nurs/organs/${info.img}" alt="${info.e}" loading="lazy" style="width:100%;height:auto;display:block">
        <div style="padding:16px">
          <div style="display:flex;align-items:baseline;gap:8px">
            <div style="font-size:22px;font-weight:800">${info.e}</div>
            ${NURS_LANG==="en"?"":`<div style="font-size:16px;font-weight:700">${info.c}</div>`}
            <div style="margin-left:auto;font-size:12px;color:var(--sub)">${idx+1} / ${order.length}</div>
          </div>
          <div style="font-size:13px;color:var(--blue);font-weight:600;margin-top:6px">📍 ${NURS_LANG==="en"?info.le:info.loc}</div>
          <div style="font-size:14px;line-height:1.8;margin-top:8px">${NURS_LANG==="en"?info.fe:info.fn}</div>
          ${relChips?`<div style="margin-top:10px"><div style="font-size:12px;color:var(--sub);margin-bottom:6px">${nt("ex_rel")}</div><div style="display:flex;gap:6px;flex-wrap:wrap">${relChips}</div></div>`:""}
          <div style="display:flex;gap:8px;margin-top:14px">
            <button class="btn ghost" id="nbPrev" style="flex:1">◀ ${NURS_LANG==="en"?O[prev].e:O[prev].c}</button>
            <button class="btn primary" id="nbNext" style="flex:1">${NURS_LANG==="en"?O[next].e:O[next].c} ▶</button>
          </div>
        </div>
      </div>
    </div>
    <style>@media(min-width:768px){.nurs-body-grid{grid-template-columns:360px 1fr !important;align-items:start}}</style>`);
  $("nursBackBtn").addEventListener("click", backToToday);
  $("nursHome").querySelectorAll("[data-o]").forEach(g=>g.addEventListener("click", ()=>nursBody(g.dataset.o)));
  $("nursHome").querySelectorAll("[data-term]").forEach(b=>b.addEventListener("click", ()=>nursTermsGoTerm(NURS_CH1.terms[parseInt(b.dataset.term,10)].w)));
  $("nbPrev").addEventListener("click", ()=>nursBody(prev));
  $("nbNext").addEventListener("click", ()=>nursBody(next));
  $("nbTour").addEventListener("click", ()=>nursBody(order[0]));
  $("nbQuiz").addEventListener("click", nursLabelQuiz);
}
/* 每日练习：到期术语 + 错题 + 薄弱标签题，混合编排 */
let DAILY = null;
function buildDaily(focusTags){
  const st = nursState();
  const items = [], seenQ = new Set();
  // 1. 错题优先（最多6）
  st.wrong.filter(w=>!focusTags || (w.g && focusTags.includes(w.g))).slice(0,6)
    .forEach(w=>{ items.push({k:"wq", w}); seenQ.add(w.q); });
  // 2. 到期术语（最多8）
  nursDueTerms().slice(0,8).forEach(w=>items.push({k:"term", w}));
  // 3. 薄弱标签题（最多6）
  const weakTags = focusTags || Object.keys(st.tagStats)
    .filter(g=>{ const t=st.tagStats[g]; return t.n>=3 && t.r/t.n<0.75; })
    .sort((a,b)=>(st.tagStats[a].r/st.tagStats[a].n)-(st.tagStats[b].r/st.tagStats[b].n));
  for(const g of weakTags){
    for(const q of nursShuffle(NURS_CH1.quiz)){
      if(items.filter(i=>i.k==="q").length>=6) break;
      if(q.g===g && !seenQ.has(q.q)){ items.push({k:"q", q}); seenQ.add(q.q); break; }
    }
  }
  // 4. 新术语补齐
  if(items.length<10){
    NURS_CH1.terms.filter(t=>!st.terms[t.w]).slice(0, 10-items.length)
      .forEach(t=>items.push({k:"term", w:t.w, fresh:true}));
  }
  return nursShuffle(items);
}
function startDaily(focusTags){
  const items = buildDaily(focusTags);
  DAILY = {items, i:0, doneT:0, doneQ:0, fixed:0};
  document.body.classList.add("hide-tabbar");
  if($("v-daily").classList.contains("on")) renderDailyItem();
  else go("v-daily");
}
/* 每日练习内的返回：退一级回护理今日（保留进度，可继续） */
function dailyBackRow(){ return `<div style="margin-bottom:12px"><button class="btn ghost" id="nursBackBtn">${nt("back")}</button></div>`; }
function wireDailyBack(clearAll){
  const bb=$("nursBackBtn");
  if(!bb) return;
  bb.addEventListener("click", ()=>{
    if(clearAll) DAILY=null;
    document.body.classList.remove("hide-tabbar");
    try{ todayPhaseEnd(); }catch(e){}
    renderToday(); go("v-nurs");
  });
}
function renderDaily(){
  // 计划概览
  const st = nursState();
  const dueN = nursDueTerms().length, wrongN = st.wrong.length;
  const weak = Object.keys(st.tagStats)
    .map(g=>({g, acc:nursTagAcc(g)}))
    .filter(x=>x.acc>=0 && x.acc<75)
    .sort((a,b)=>a.acc-b.acc).slice(0,3);
  const freshN = NURS_CH1.terms.filter(t=>!st.terms[t.w]).length;
  $("dailyBody").innerHTML = `
    <div class="card" style="padding:20px;margin-bottom:12px">
      <div style="font-size:17px;font-weight:800;margin-bottom:4px">📅 ${nt("daily_plan")}</div>
      <div class="hello">${nt("ov_sys")}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:14px">
        <div style="background:var(--bg);border-radius:12px;padding:12px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:var(--blue)">${dueN}</div>
          <div style="font-size:11px;color:var(--sub)">${nt("ov_due")}</div>
        </div>
        <div style="background:var(--bg);border-radius:12px;padding:12px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:#FF9500">${wrongN}</div>
          <div style="font-size:11px;color:var(--sub)">${nt("ov_wrong")}</div>
        </div>
        <div style="background:var(--bg);border-radius:12px;padding:12px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:#34C759">${freshN}</div>
          <div style="font-size:11px;color:var(--sub)">${nt("ov_fresh")}</div>
        </div>
      </div>
      ${weak.length?`<div style="font-size:13px;margin-top:12px">⚠️ ${nt("ov_weak")}：${weak.map(x=>`<b>${x.g}</b> ${x.acc}%`).join(" · ")}</div>`:""}
      <button class="btn primary" id="dailyGo" style="width:100%;margin-top:14px;padding:13px;font-size:15px">${nt("daily_start")}</button>
      <div class="hello" style="margin-top:8px;font-size:11px">${nt("ov_mix")}</div>
    </div>
    <div class="card" style="padding:16px 20px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="font-size:17px;font-weight:800">❝ ${nt("daily_fey")}</div>
        <div class="hello" style="margin-left:auto;font-size:11px">${nt("ov_fey1")} · ${NURS_CH1.feynman.length} ${nt("ov_fey2")}</div>
      </div>
      <div style="font-size:13px;color:var(--sub);margin-top:6px;line-height:1.7">${esc(NURS_CH1.feynman[feyTodayIdx()].q.slice(0,60))}…</div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:10px">
        <div class="hello" style="font-size:12px">${Object.keys(st.fey).length}/${NURS_CH1.feynman.length} ${nt("ov_fey_done")}</div>
        <button class="btn ghost" id="dailyFey" style="margin-left:auto;padding:8px 18px;font-size:13px">${nt("daily_fey_go")}</button>
      </div>
    </div>
    ${st.mockHistory.length?`<div class="sec">${nt("ov_mock")}</div>
    <div class="card" style="padding:6px 16px">
      ${st.mockHistory.slice(-5).reverse().map(h=>`
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:9px 0;border-bottom:1px solid var(--hair)">
          <span>${h.d}</span>
          <span>${nt("ov_correct")} ${h.right}/${h.total}</span>
          <b style="color:${h.pct>=95?"#34C759":h.pct>=80?"#FF9500":"#FF3B30"}">${h.pct}%</b>
        </div>`).join("")}
    </div>`:""}`;
  $("dailyGo").addEventListener("click", ()=>startDaily());
  $("dailyFey").addEventListener("click", ()=>{ const fi=feyTodayIdx(); if(fi>=0) nursFeynman(fi); });
}
function renderDailyItem(){
  const D = DAILY;
  if(!D || D.i>=D.items.length){
    const done = D ? D.i : 0;
    $("dailyBody").innerHTML = dailyBackRow() + `
      <div class="card" style="padding:32px;text-align:center">
        <div style="font-size:44px">🎉</div>
        <div style="font-size:19px;font-weight:800;margin:10px 0">${nt("dd_title")}</div>
        <div class="hello">${nt("dd_done")} ${done} ${nt("dd_items")}${D?` · ${nt("dd_rev")} ${D.doneT} · ${nt("dd_q")} ${D.doneQ} · ${nt("dd_fixed")} ${D.fixed}`:""}</div>
        <div style="font-size:13px;color:var(--sub);margin-top:8px">${nt("dd_next")}</div>
        <button class="btn primary" id="dailyDone" style="margin-top:14px">${nt("daily_back")}</button>
      </div>`;
    $("dailyDone").addEventListener("click", ()=>{ DAILY=null; document.body.classList.remove("hide-tabbar"); todayPhaseEnd(); go("v-nurs"); });
    wireDailyBack(true);
    DAILY = null;
    document.body.classList.remove("hide-tabbar");
    return;
  }
  const it = D.items[D.i];
  const prog = `<div style="font-size:13px;color:var(--sub);margin-bottom:8px">${nt("di_prog")} ${D.i+1} / ${D.items.length}</div>
    <div style="height:8px;background:#EFEFF4;border-radius:4px;overflow:hidden;margin-bottom:12px">
      <div style="height:100%;width:${Math.round(D.i/D.items.length*100)}%;background:var(--blue);border-radius:4px"></div>
    </div>`;
  if(it.k==="term"){
    const t = NURS_CH1.terms.find(x=>x.w===it.w);
    let flipped = false;
    const EN = NURS_LANG==="en";
    const defText = EN ? (t.en||"") : t.zh;
    $("dailyBody").innerHTML = dailyBackRow() + prog + `
      <div style="font-size:12px;color:var(--sub);margin-bottom:6px">📝 ${nt("di_term")}${it.fresh?" · "+nt("di_fresh"):""}</div>
      <div class="card" id="dyCard" style="padding:16px">
        <div style="display:flex;gap:14px;align-items:flex-start">
          <div style="flex:3;border-radius:16px;overflow:hidden;cursor:pointer;aspect-ratio:3/4;max-height:58vh" data-w="${esc(t.w)}" onclick="event.stopPropagation();sayNursTerm(this.dataset.w)" title="${nt('say')}">
            <img src="${nursImg(t.w)}" alt="" loading="lazy" onerror="this.style.display='none'" style="width:100%;height:100%;object-fit:cover;object-position:center;display:block;pointer-events:none">
          </div>
          <div style="flex:2;min-width:0;display:flex;flex-direction:column;justify-content:center">
            <div class="w" style="font-size:24px;font-weight:800;line-height:1.3;word-break:break-word">${esc(t.w)}</div>
            ${defText?`<div class="z" style="margin-top:10px;font-size:15px;line-height:1.65;color:var(--text)">${esc(defText)}</div>`:""}
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
          <button data-lv="0" style="background:#FFE9E9;color:#D70015;font-size:14px;font-weight:700;padding:12px 10px;min-width:88px;border:none;border-radius:12px;cursor:pointer">${nt("rate_again")}</button>
          <button data-lv="1" style="background:#FFF1D6;color:#B25E09;font-size:14px;font-weight:700;padding:12px 10px;min-width:88px;border:none;border-radius:12px;cursor:pointer">${nt("rate_hard")}</button>
          <button data-lv="2" style="background:#DFF7E4;color:#0E7A3D;font-size:14px;font-weight:700;padding:12px 10px;min-width:88px;border:none;border-radius:12px;cursor:pointer">${nt("rate_good")}</button>
        </div>
      </div>`;
    // 释义直接显示，评分按钮直接可用，无需翻卡
    $("dailyBody").querySelectorAll("[data-lv]").forEach(b=>b.addEventListener("click", ()=>{
      nursTermRate(it.w, +b.dataset.lv); D.doneT++; D.i++; renderDailyItem();
    }));
    wireDailyBack(false);
  }else{
    // wq 或 q：选择题
    const q = it.k==="wq" ? {q:it.w.q, o:it.w.o, a:it.w.a, e:it.w.e, g:it.w.g, t:it.w.t} : it.q;
    const isTF = q.t==="tf";
    const opts = isTF ? (NURS_LANG==="en"?["True","False"]:["正确 True","错误 False"]) : q.o;
    $("dailyBody").innerHTML = dailyBackRow() + prog + `
      <div style="font-size:12px;color:var(--sub);margin-bottom:6px">${it.k==="wq"?"🔁 "+nt("di_retry"):"🎯 "+nt("di_weak")} · ${q.g||""} ${nursSecName(q.g)}</div>
      <div class="q-card card" style="padding:20px;font-size:16px;line-height:1.7;font-weight:600">${esc(q.q)}</div>
      <div class="opts" style="margin-top:12px">${opts.map((o,oi)=>`<div class="opt" data-i="${oi}">${esc(o)}</div>`).join("")}</div>
      <div id="dyExp"></div>`;
    $("dailyBody").querySelectorAll(".opt").forEach(el=>el.addEventListener("click", ()=>{
      if(el.classList.contains("right")||el.classList.contains("wrong")) return;
      const ok = +el.dataset.i===q.a;
      el.classList.add(ok?"right":"wrong");
      if(!ok) $("dailyBody").querySelector(`[data-i="${q.a}"]`).classList.add("right");
      nursTagHit(q.g, ok);
      if(it.k==="wq" && ok){ if(nursWrongFixed(q.q)) D.fixed++; }
      if(!ok) nursAddWrong(q, +el.dataset.i);
      D.doneQ++;
      $("dyExp").innerHTML = `<div class="tip" style="margin-top:12px">💡 ${esc(q.e)}</div>
        <button class="btn primary" id="dyNext" style="margin-top:12px;width:100%">${D.i+1>=D.items.length?nt("di_finish"):nt("di_next")}</button>`;
      $("dyNext").addEventListener("click", ()=>{ D.i++; renderDailyItem(); });
    }));
    wireDailyBack(false);
  }
}
/* 解剖图对照表 */
function nursAtlas(){
  NURS_RERENDER = nursAtlas;
  const A = window.NURS_ATLAS_CH1 || {};
  const organs = [
    {e:"brain", c:"脑", f:"brain.jpg"},
    {e:"lungs", c:"肺", f:"lungs.jpg"},
    {e:"heart", c:"心脏", f:"heart.jpg"},
    {e:"liver", c:"肝", f:"liver.jpg"},
    {e:"stomach", c:"胃", f:"stomach.jpg"},
    {e:"intestines", c:"肠（小肠 + 大肠）", f:"intestines.jpg"},
    {e:"kidneys", c:"肾", f:"kidneys.jpg"},
    {e:"skin", c:"皮肤", f:"skin.jpg"}
  ];
  const grid = organs.map(o=>`
    <div class="card" style="padding:10px;text-align:center">
      <img src="images/nurs/organs/${o.f}" alt="${o.e}" style="width:100%;height:auto;display:block;border-radius:8px" loading="lazy">
      <div style="font-weight:700;font-size:14px;margin-top:6px">${o.e}</div>
      ${NURS_LANG==="en"?"":`<div style="font-size:12px;color:var(--sub)">${o.c}</div>`}
    </div>`).join("");
  $("nursHome").innerHTML = nursBack(`<div class="big-title" style="font-size:20px;margin-bottom:4px">${nt("at_title")}</div>
    <div class="hello" style="margin-bottom:12px">${nt("at_sub")}</div>
    <div class="card" style="padding:14px;margin-bottom:12px;display:flex;align-items:center;gap:12px">
      <div style="font-size:28px">🎯</div>
      <div style="flex:1"><div style="font-weight:700">${nt("label_quiz")}</div><div style="font-size:12px;color:var(--sub)">${nt("label_quiz_s")}</div></div>
      <button class="btn primary" id="atlasQuizGo" style="padding:8px 18px">${nt("start")}</button>
    </div>
    <div class="kp-sec card" style="padding:14px;margin-bottom:12px"><div class="t" style="margin-bottom:8px">${NURS_LANG==="en"?"Fig. 1 · Body Planes":"图 1 · 人体切面 Body Planes"}</div>${A.planes||""}</div>
    <div class="kp-sec card" style="padding:14px;margin-bottom:12px"><div class="t" style="margin-bottom:8px">${NURS_LANG==="en"?"Fig. 2 · Directional Terms":"图 2 · 方向术语 Directional Terms"}</div>${A.directions||""}</div>
    <div class="kp-sec card" style="padding:14px;margin-bottom:12px"><div class="t" style="margin-bottom:8px">${NURS_LANG==="en"?"Fig. 3 · Body Cavities":"图 3 · 体腔 Body Cavities"}</div>${A.cavities||""}</div>
    <div class="kp-sec card" style="padding:14px;margin-bottom:12px"><div class="t" style="margin-bottom:8px">${NURS_LANG==="en"?"Fig. 4 · Thoracic Cavity":"图 4 · 胸腔详解 Thoracic Cavity"} <span style="font-weight:400;font-size:12px;color:var(--sub)">${NURS_LANG==="en"?"textbook Fig 1.11":"仿课本 Fig 1.11"}</span></div>${A.thoracic||""}</div>
    <div class="kp-sec card" style="padding:14px;margin-bottom:12px"><div class="t" style="margin-bottom:8px">${NURS_LANG==="en"?"Fig. 5 · Feedback Systems":"图 5 · 反馈系统 Feedback Systems"}</div>${A.feedback||""}</div>
    <div class="kp-sec card" style="padding:14px;margin-bottom:12px"><div class="t" style="margin-bottom:8px">${NURS_LANG==="en"?"Fig. 6 · Abdominopelvic Divisions":"图 6 · 腹盆腔分区 Abdominopelvic Divisions"}</div>${A.abdomDiv||""}</div>
    <div class="kp-sec card" style="padding:14px;margin-bottom:12px"><div class="t" style="margin-bottom:8px">${NURS_LANG==="en"?"Fig. 7 · Medical Imaging":"图 7 · 医学影像 Medical Imaging"} <span style="font-weight:400;font-size:12px;color:var(--sub)">${NURS_LANG==="en"?"1.7 exam focus":"1.7 考试重点"}</span></div>${typeof A.imagingFn==="function"?A.imagingFn():(A.imaging||"")}</div>
    <div class="sec">${nt("at_organ")}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${grid}</div>`);
  $("nursBackBtn").addEventListener("click", backToToday);
  $("atlasQuizGo").addEventListener("click", nursLabelQuiz);
}
/* 解剖图标注测验（Image Occlusion 式：看图识结构） */
function nursLabelQuiz(){
  const organs = [
    {e:"brain", c:"脑", f:"brain.jpg"},
    {e:"lungs", c:"肺", f:"lungs.jpg"},
    {e:"heart", c:"心脏", f:"heart.jpg"},
    {e:"liver", c:"肝", f:"liver.jpg"},
    {e:"stomach", c:"胃", f:"stomach.jpg"},
    {e:"intestines", c:"肠", f:"intestines.jpg"},
    {e:"kidneys", c:"肾", f:"kidneys.jpg"},
    {e:"skin", c:"皮肤", f:"skin.jpg"}
  ];
  const qs = nursShuffle(organs).map(o=>{
    const distract = nursShuffle(organs.filter(x=>x.e!==o.e)).slice(0,3);
    const opts = nursShuffle([o, ...distract]);
    return {o, opts};
  });
  let i = 0, correct = 0;
  function renderQ(){
    if(i >= qs.length){
      $("nursHome").innerHTML = nursBack(`<div class="card" style="padding:28px;text-align:center">
        <div style="font-size:40px;margin-bottom:12px">${correct===qs.length?"🎉":"💪"}</div>
        <div style="font-size:20px;font-weight:800;margin-bottom:6px">${correct} / ${qs.length}</div>
        <div class="hello" style="margin-bottom:16px">${correct===qs.length?nt("label_perfect"):nt("label_retry")}</div>
        <button class="btn primary" id="lqAgain" style="width:100%">${nt("label_again")}</button></div>`);
      $("nursBackBtn").addEventListener("click", backToToday);
      $("lqAgain").addEventListener("click", nursLabelQuiz);
      return;
    }
    const q = qs[i];
    $("nursHome").innerHTML = nursBack(`
      <div style="font-size:12px;color:var(--sub);margin-bottom:8px">${nt("label_quiz")} · ${i+1} / ${qs.length}</div>
      <div class="card" style="padding:10px;margin-bottom:14px">
        <img src="images/nurs/organs/${q.o.f}" alt="organ" style="width:100%;height:auto;display:block;border-radius:8px">
      </div>
      <div style="font-weight:700;font-size:16px;margin-bottom:10px;text-align:center">${nt("label_which")}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${q.opts.map(o=>`<button class="btn ghost lq-opt" data-e="${o.e}" style="padding:14px;font-size:15px">${o.e}${NURS_LANG==="en"?"":`<br><span style="font-size:12px;color:var(--sub)">${o.c}</span>`}</button>`).join("")}
      </div>
      <div id="lqFb" style="margin-top:12px"></div>`);
    $("nursBackBtn").addEventListener("click", backToToday);
    $("nursHome").querySelectorAll(".lq-opt").forEach(b=>b.addEventListener("click", ()=>{
      const ok = b.dataset.e===q.o.e;
      b.style.borderColor = ok ? "#34C759" : "#FF3B30";
      b.style.color = ok ? "#34C759" : "#FF3B30";
      if(ok) correct++;
      else $("nursHome").querySelector(`[data-e="${q.o.e}"]`).style.borderColor = "#34C759";
      $("lqFb").innerHTML = `<div class="tip">${ok?"✅":"❌"} ${q.o.e}${NURS_LANG==="en"?"":" · "+q.o.c}</div>
        <button class="btn primary" id="lqNext" style="width:100%;margin-top:10px">${i+1>=qs.length?nt("label_finish"):nt("next")}</button>`;
      $("nursHome").querySelectorAll(".lq-opt").forEach(x=>x.disabled=true);
      $("lqNext").addEventListener("click", ()=>{ i++; renderQ(); });
    }));
  }
  renderQ();
}
/* 考点提炼 */
function nursPoints(){
  NURS_RERENDER = nursPoints;
  const EN = NURS_LANG==="en";
  const secs = NURS_CH1.points.map((s,si)=>{
    const title = EN ? (s.te||s.t) : s.t;
    const items = EN ? (s.itemsEn||s.items) : s.items;
    return `
    <div class="kp-sec card" style="padding:14px">
      <div class="t">${esc(title)}</div>
      <ul>${items.map((i,pi)=>`<li>${esc(i)}${EN?"":` <button class="btn ghost" style="padding:2px 8px;font-size:12px;margin-left:4px" onclick="sayZhPoint(${si},${pi})">🔊</button>`}</li>`).join("")}</ul>
    </div>`;}).join("");
  $("nursHome").innerHTML = nursBack(`<div class="big-title" style="font-size:20px;margin-bottom:12px">${nt("pt_title")}</div>${secs}`);
  $("nursBackBtn").addEventListener("click", backToToday);
}
/* 术语闪卡 */
/* SRS 复习队列：到期优先 + 新词补足 + 乱序（破除位置记忆） */
let NT_FAIL = [], NT_RETRY = false;
function nursTermsQueue(){
  const st = nursState(), now = Date.now();
  const due = [], fresh = [];
  NURS_CH1.terms.forEach(t=>{
    const r = st.terms[t.w];
    if(r && r.n<=now) due.push(t);
    else if(!r) fresh.push(t);
  });
  let q = nursShuffle(due.concat(nursShuffle(fresh).slice(0, Math.max(0, 12-due.length))));
  if(!q.length) q = nursShuffle(NURS_CH1.terms.slice());
  return q;
}
function nursTermsGoTerm(w){
  const t = NURS_CH1.terms.find(x=>x.w===w);
  if(t){ NT_FAIL=[]; NT_RETRY=false; nursTerms([t], 0); }
}
function nursTerms(list, i){
  NURS_RERENDER = ()=>nursTerms(list, i);
  document.body.classList.add("hide-tabbar");
  const st = nursState();
  if(i >= list.length){
    if(NT_FAIL.length && !NT_RETRY){
      const f = NT_FAIL; NT_FAIL = []; NT_RETRY = true;
      nursTerms(f, 0); return;
    }
    NT_RETRY = false;
    const nFail = 0;
    $("nursHome").innerHTML = nursBack(`<div class="card" style="padding:28px;text-align:center">
      <div style="font-size:20px;font-weight:700">${list.length} ${nt("terms_done")} 🎉</div>
      <div class="hello" style="margin-top:8px">${nt("terms_next")}</div>
      <button class="btn primary" id="ntAgain" style="margin-top:14px">${nt("terms_again")}</button></div>`);
    document.body.classList.remove("hide-tabbar");
    $("nursBackBtn").addEventListener("click", backToToday);
    $("ntAgain").addEventListener("click", ()=>nursTerms(nursTermsQueue(),0));
    return;
  }
  const t = list[i];
  let flipped = false;
  const EN = NURS_LANG==="en";
  const defText = EN ? (t.en||"") : t.zh;
  $("nursHome").innerHTML = nursBack(`
    <div style="font-size:13px;color:var(--sub);margin-bottom:8px">${i+1} / ${list.length}${NT_RETRY?` · ${nt("retry_round")}`:""}</div>
    <div class="card" id="ntCard" style="padding:16px">
      <div style="display:flex;gap:14px;align-items:flex-start">
        <div style="flex:3;border-radius:16px;overflow:hidden;cursor:pointer;aspect-ratio:3/4;max-height:58vh" data-w="${esc(t.w)}" onclick="event.stopPropagation();sayNursTerm(this.dataset.w)" title="${nt('say')}">
          <img src="${nursImg(t.w)}" alt="" loading="lazy" onerror="this.style.display='none'" style="width:100%;height:100%;object-fit:cover;object-position:center;display:block;pointer-events:none">
        </div>
        <div style="flex:2;min-width:0;display:flex;flex-direction:column;justify-content:center">
          <div class="w" style="font-size:24px;font-weight:800;line-height:1.3;word-break:break-word">${esc(t.w)}</div>
          ${defText?`<div class="z" style="margin-top:10px;font-size:15px;line-height:1.65;color:var(--text)">${esc(defText)}</div>`:""}
          <div style="margin-top:10px;display:flex;gap:6px">
            <button class="btn ghost" id="ntSay" style="font-size:12px;padding:6px 10px">🔊</button>
            ${EN?"":`<button class="btn ghost" id="ntSayZh" style="font-size:12px;padding:6px 10px">🔊中</button>`}
          </div>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
        <button data-nlv="0" style="background:#FFE9E9;color:#D70015;font-size:14px;font-weight:700;padding:12px 10px;min-width:88px;border:none;border-radius:12px;cursor:pointer">${nt("rate_again")}</button>
        <button data-nlv="1" style="background:#FFF1D6;color:#B25E09;font-size:14px;font-weight:700;padding:12px 10px;min-width:88px;border:none;border-radius:12px;cursor:pointer">${nt("rate_hard")}</button>
        <button data-nlv="2" style="background:#DFF7E4;color:#0E7A3D;font-size:14px;font-weight:700;padding:12px 10px;min-width:88px;border:none;border-radius:12px;cursor:pointer">${nt("rate_good")}</button>
      </div>
    </div>`);
  $("nursBackBtn").addEventListener("click", backToToday);
  sayNursTerm(t.w);
  // 释义直接显示，评分按钮直接可用，无需翻卡
  $("ntSay").addEventListener("click", e=>{ e.stopPropagation(); sayNursTerm(t.w); });
  const ntSayZhBtn = $("ntSayZh");
  if(ntSayZhBtn) ntSayZhBtn.addEventListener("click", e=>{ e.stopPropagation(); sayZhTerm(t.w); });
  const rate = lv => {
    nursTermRate(t.w, lv);
    if(lv===0 && !NT_RETRY) NT_FAIL.push(t);
    nursTerms(list, i+1);
  };
  document.querySelectorAll("[data-nlv]").forEach(b=>b.addEventListener("click", ()=>rate(parseInt(b.dataset.nlv))));
}
/* 配对挑战：6组图文配对计时赛（Quizlet Match 模式） */
function nursMatch(){
  NURS_RERENDER = null;
  const st = nursState();
  const picks = NURS_CH1.terms.map(t=>{
    const r = st.terms[t.w];
    const weak = r ? (r.leech||0)*2 + (r.l===0?1:0) : 0.5;
    return [t, weak + Math.random()];
  }).sort((a,b)=>b[1]-a[1]).slice(0,6).map(x=>x[0]);
  const left = nursShuffle(picks.slice()), right = nursShuffle(picks.slice());
  let selL = -1, selR = -1, done = 0, miss = 0, lock = false;
  const doneW = new Set(), wrongW = new Set();

  const t0 = Date.now();
  const fmt = ms => `${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,"0")}`;
  const render = ()=>{
    $("nursHome").innerHTML = nursBack(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div class="big-title" style="font-size:18px;margin:0">${nt("mod_match")} · 6</div>
        <div style="font-size:14px;font-weight:700"><span id="mtTime">0:00</span> · ❌ <span id="mtMiss">${miss}</span></div>
      </div>
      <div class="hello" style="margin-bottom:10px">${nt("match_hint")}</div>
      <div class="match-wrap" style="display:flex;gap:14px;align-items:start;max-width:720px;margin:0 auto">
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:700;color:var(--sub);margin-bottom:6px;text-align:center">🖼 ${nt("match_left")}</div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">${left.map((t,i)=>pairCard(t,i,"L")).join("")}</div>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:700;color:var(--sub);margin-bottom:6px;text-align:center">📝 ${nt("match_right")}</div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">${right.map((t,i)=>pairCard(t,i,"R")).join("")}</div>
        </div>
      </div>
      <style>@media(max-width:767px){.match-wrap{flex-direction:column!important}}</style>`);
    $("nursBackBtn").addEventListener("click", backToToday);
    const tick = setInterval(()=>{
      const e = $("mtTime"); if(!e){ clearInterval(tick); return; }
      e.textContent = fmt(Date.now()-t0 + miss*3000);
    }, 500);
    $("nursHome").querySelectorAll("[data-m]").forEach(el=>el.addEventListener("click", ()=>onPick(el)));
  };
  const pairCard = (t,i,side)=>{
    const id = side+i, isSel = (side==="L"?selL:selR)===i, isDone = doneW.has(t.w), isWrong = wrongW.has(side+i);
    const bd = isDone ? "#34C759" : isWrong ? "#FF3B30" : isSel ? "#2F7DE1" : "#E4EAF2";
    const bg = isDone ? "#EAF9F0" : isWrong ? "#FDE8E8" : isSel ? "#EAF2FE" : "#FFFFFF";
    const inner = side==="L"
      ? `<img src="${nursImg(t.w)}" alt="" loading="lazy" onerror="this.style.display='none'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block"><div style="position:absolute;left:0;right:0;bottom:0;font-weight:700;font-size:13px;line-height:1.3;padding:7px 6px;text-align:center;background:rgba(255,255,255,.94);word-break:break-word">${esc(t.w)}</div>`
      : `<div style="flex:1;display:flex;align-items:center;justify-content:center;padding:12px"><div style="font-size:17px;font-weight:700;line-height:1.7;text-align:center">${esc(t.zh.split("（")[0])}</div></div>`;
    return `<div data-m="${id}" data-w="${esc(t.w)}" data-side="${side}" data-i="${i}" style="position:relative;aspect-ratio:1/1;display:flex;flex-direction:column;overflow:hidden;border:2.5px solid ${bd};background:${bg};border-radius:14px;cursor:${isDone?"default":"pointer"};opacity:${isDone?0.45:1};transition:transform .12s,border-color .12s;${isSel&&!isDone?"transform:scale(1.05);box-shadow:0 3px 14px rgba(47,125,225,.35);":""}">${inner}</div>`;
  };
  const onPick = el=>{
    if(lock || doneW.has(el.dataset.w)) return;
    const side = el.dataset.side, i = +el.dataset.i;
    if(side==="L"){ const ni = (selL===i?-1:i); selL = ni; if(ni>=0) sayNursTerm(left[ni].w); }
    else selR = (selR===i?-1:i);
    if(selL>=0 && selR>=0){
      const lw = left[selL].w, rw = right[selR].w;
      if(lw===rw){
        doneW.add(lw); done++;
        sayNursTerm(lw);
        selL = selR = -1;
        if(done>=6){ finish(); return; }
      } else {
        lock = true; miss++;
        wrongW.add("L"+selL); wrongW.add("R"+selR);
        selL = selR = -1;
        render();
        setTimeout(()=>{ wrongW.clear(); lock = false; render(); }, 700);
        return;
      }
    }
    render();
  };
  const finish = ()=>{
    const ms = Date.now()-t0 + miss*3000;
    const best = st.matchBest || Infinity;
    const isBest = ms < best;
    if(isBest){ st.matchBest = ms; save(); }
    $("nursHome").innerHTML = nursBack(`<div class="card" style="padding:28px;text-align:center">
      <div style="font-size:16px;font-weight:700">${nt("mod_match")} ✓</div>
      <div style="font-size:34px;font-weight:800;margin:10px 0">⏱ ${fmt(ms)}</div>
      <div class="hello">❌ ${miss} ${nt("match_miss")} · ${isBest?"🏆 "+nt("match_best"):"🏅 "+nt("match_best_is")+" "+fmt(best)}</div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:16px">
        <button class="btn primary" id="mtAgain">${nt("match_again")}</button>
        <button class="btn ghost" id="mtBack">${nt("back")}</button>
      </div></div>`);
    $("nursBackBtn").addEventListener("click", backToToday);
    $("mtAgain").addEventListener("click", nursMatch);
    $("mtBack").addEventListener("click", backToToday);
    todayStats().quiz = (todayStats().quiz||0)+1; save();
  };
  render();
}
/* 听音辨义 */
function nursListen(){
  NURS_RERENDER = null;
  const terms = shuffle(NURS_CH1.terms), st = nursState();
  let i = 0, right = 0;
  const total = Math.min(10, terms.length);
  function q(){
    if(i >= total){
      $("nursHome").innerHTML = nursBack(`<div class="card" style="padding:28px;text-align:center">
        <div style="font-size:22px;font-weight:800">${Math.round(right/total*100)}%</div>
        <div class="hello" style="margin-top:6px">${nt("listen_done")} ${right} / ${total}</div>
        <button class="btn primary" id="nlAgain" style="margin-top:14px">${nt("listen_again")}</button></div>`);
      $("nursBackBtn").addEventListener("click", backToToday);
      $("nlAgain").addEventListener("click", nursListen);
      return;
    }
    const t = terms[i];
    const ti = NURS_CH1.terms.findIndex(x=>x.w===t.w);
    const near = NURS_CH1.terms.filter((x,xi)=>x.w!==t.w && Math.abs(xi-ti)<=10);
    const far = NURS_CH1.terms.filter((x,xi)=>x.w!==t.w && Math.abs(xi-ti)>10);
    const distract = shuffle(near).slice(0,3);
    if(distract.length<3) distract.push(...shuffle(far).slice(0,3-distract.length));
    const opts = shuffle([t, ...distract]);
    $("nursHome").innerHTML = nursBack(`
      <div style="font-size:13px;color:var(--sub);margin-bottom:8px">${i+1} / ${total}</div>
      <div class="q-card card" style="text-align:center;padding:30px">
        <div class="big-spk" id="nlSpk" style="cursor:pointer">♪</div>
        <div class="q-sub">${nt("listen_hint")} · <span class="spk" id="nlAgain2">${nt("listen_replay")}</span></div>
      </div>
      <div class="opts">${opts.map(o=>`<div class="opt" data-w="${esc(o.w)}">${esc(o.zh.split("（")[0])}</div>`).join("")}</div>`);
    $("nursBackBtn").addEventListener("click", backToToday);
    const play = ()=>sayNursTerm(t.w);
    $("nlSpk").addEventListener("click", play);
    $("nlAgain2").addEventListener("click", play);
    setTimeout(play, 400);
    $("nursHome").querySelectorAll(".opt").forEach(el=>el.addEventListener("click", ()=>{
      if(el.classList.contains("right")||el.classList.contains("wrong")) return;
      const ok = el.dataset.w===t.w;
      el.classList.add(ok?"right":"wrong");
      if(ok) right++;
      else { $("nursHome").querySelector(`[data-w="${CSS.escape(t.w)}"]`).classList.add("right"); nursTermRate(t.w, 0); }
      // 显示正确答案和完整释义，手动翻页
      const fb = document.createElement("div");
      fb.innerHTML = `<div class="tip" style="margin-top:12px">${ok?"✅":"❌"} <b>${esc(t.w)}</b> · ${esc(t.zh)}</div>
        <button class="btn primary" id="nlNext" style="width:100%;margin-top:10px">${i+1>=total?nt("listen_result"):nt("listen_next")}</button>`;
      $("nursHome").appendChild(fb);
      $("nursHome").querySelectorAll(".opt").forEach(x=>x.style.pointerEvents="none");
      $("nlNext").addEventListener("click", ()=>{ i++; q(); });
    }));
  }
  q();
}
/* 章节测验 */
let NURS_QP = null;
function nursQuizStart(){
  NURS_RERENDER = null; NURS_QP = nursShuffle(NURS_CH1.quiz).slice(0,25); nursQuiz(0,0); }
function nursQuiz(i, right){
  const qs = NURS_QP || NURS_CH1.quiz.slice(0,25), st = nursState();
  if(i >= qs.length){
    const pct = Math.round(right/qs.length*100);
    if(pct > (st.quizBest||0)){ st.quizBest = pct; save(); }
    $("nursHome").innerHTML = nursBack(`<div class="card" style="padding:28px;text-align:center">
      <div style="font-size:15px;color:var(--sub)">${nt("quiz_score")}</div>
      <div style="font-size:44px;font-weight:800;color:${pct>=95?"#34C759":pct>=80?"#FF9500":"#FF3B30"}">${pct}%</div>
      <div class="hello" style="margin-top:6px">${nt("quiz_right")} ${right} / ${qs.length} · ${nt("quiz_best")} ${st.quizBest}%</div>
      <div style="font-size:13px;color:var(--sub);margin-top:10px">${pct>=95?nt("quiz_good"):pct>=80?nt("quiz_close"):nt("quiz_low")}</div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:14px">
        <button class="btn primary" id="nqAgain">${nt("quiz_again")}</button>
      </div></div>`);
    $("nursBackBtn").addEventListener("click", backToToday);
    $("nqAgain").addEventListener("click", nursQuizStart);
    return;
  }
  const q = qs[i];
  const isTF = q.t==="tf";
  const opts = isTF ? (NURS_LANG==="en"?["True","False"]:["正确 True","错误 False"]) : q.o;
  const ans = isTF ? q.a : q.a;
  $("nursHome").innerHTML = nursBack(`
    <div style="font-size:13px;color:var(--sub);margin-bottom:8px">${i+1} / ${qs.length} · ${isTF?nt("q_tf"):nt("q_mc")}</div>
    <div class="q-card card" style="padding:20px;font-size:16px;line-height:1.7;font-weight:600">${esc(q.q)}</div>
    <div class="opts" style="margin-top:12px">${opts.map((o,oi)=>`<div class="opt" data-i="${oi}">${esc(o)}</div>`).join("")}</div>
    <div id="nqExp"></div>`);
  $("nursBackBtn").addEventListener("click", backToToday);
  $("nursHome").querySelectorAll(".opt").forEach(el=>el.addEventListener("click", ()=>{
    if(el.classList.contains("right")||el.classList.contains("wrong")) return;
    const ok = +el.dataset.i===ans;
    el.classList.add(ok?"right":"wrong");
    if(!ok) $("nursHome").querySelector(`[data-i="${ans}"]`).classList.add("right");
    nursTagHit(q.g, ok);
    if(!ok) nursAddWrong(q, +el.dataset.i);
    $("nqExp").innerHTML = `<div class="tip" style="margin-top:12px">💡 ${esc(q.e)}</div>
      <button class="btn primary" id="nqNext" style="margin-top:12px;width:100%">${nt("qz_next")}</button>`;
    $("nqNext").addEventListener("click", ()=>nursQuiz(i+1, right+(ok?1:0)));
  }));
}
/* 模拟考试：仿真实 Quiz（闭卷·计时·交卷后看解析） */
let MOCK = null;
function mockClear(){ if(MOCK && MOCK.timer){ clearInterval(MOCK.timer); } MOCK = null; }
function nursMockIntro(){
  NURS_RERENDER = nursMockIntro;
  const st = nursState();
  $("nursHome").innerHTML = nursBack(`
    <div class="card" style="padding:24px;text-align:center">
      <div style="font-size:40px">⏱</div>
      <div style="font-size:20px;font-weight:800;margin:8px 0">${nt("mock_title")}</div>
      <div style="font-size:13px;color:var(--sub);line-height:2;text-align:left;max-width:340px;margin:0 auto">
        · 50 ${nt("mock_qs")}${NURS_LANG==="en"?", ":"，"}<b>60 ${nt("mock_min")}</b><br>
        · <b>${nt("mock_closed")}</b>${NURS_LANG==="en"?": ":"："}${nt("mock_closed_s")}<br>
        · ${nt("mock_noexp")}${NURS_LANG==="en"?", ":"，"}${nt("mock_nav")}<br>
        · ${nt("mock_auto")}<br>
        · ${nt("mock_spec")}
      </div>
      <div class="hello" style="margin-top:10px">${nt("mock_best")} ${st.mockBest||0}%</div>
      <button class="btn primary" id="mkStart" style="margin-top:12px;padding:12px 40px;font-size:16px">${nt("mock_start")}</button>
    </div>`);
  $("nursBackBtn").addEventListener("click", ()=>{ mockClear(); backToToday(); });
  $("mkStart").addEventListener("click", ()=>nursMockBegin());
}
function nursMockBegin(){
  NURS_RERENDER = null;
  const qs = nursShuffle(NURS_CH1.quiz).slice(0,50);
  MOCK = { qs, ans:new Array(qs.length).fill(-1), i:0, end:Date.now()+60*60*1000, timer:null, done:false };
  nursMockRender();
  MOCK.timer = setInterval(()=>{
    if(!MOCK || MOCK.done) return;
    const left = MOCK.end - Date.now();
    if(left <= 0){ nursMockSubmit(true); return; }
    const el = $("mkTime");
    if(el){
      const m = Math.floor(left/60000), s = Math.floor(left%60000/1000);
      el.textContent = String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
      el.style.color = left < 5*60*1000 ? "#FF3B30" : "var(--txt)";
    }
  }, 500);
}
function nursMockRender(){
  const M = MOCK, q = M.qs[M.i], isTF = q.t==="tf";
  const opts = isTF ? (NURS_LANG==="en"?["True","False"]:["正确 True","错误 False"]) : q.o;
  const answered = M.ans.filter(a=>a>=0).length;
  const left0 = Math.max(0, M.end - Date.now());
  const t0 = String(Math.floor(left0/60000)).padStart(2,"0")+":"+String(Math.floor(left0%60000/1000)).padStart(2,"0");
  const t0c = left0 < 5*60*1000 ? "#FF3B30" : "var(--txt)";
  const pal = M.qs.map((_,idx)=>{
    const st = M.ans[idx]>=0 ? "background:var(--blue);color:#fff;" : "background:var(--bg);color:var(--sub);";
    const cur = idx===M.i ? "outline:2px solid var(--blue);outline-offset:2px;" : "";
    return `<div data-p="${idx}" style="width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;cursor:pointer;${st}${cur}">${idx+1}</div>`;
  }).join("");
  $("nursHome").innerHTML = `
    <div style="position:sticky;top:0;background:var(--bg);padding:10px 0;z-index:5">
      <div class="card" style="padding:10px 14px;display:flex;align-items:center;gap:10px">
        <div style="font-size:18px;font-weight:800;color:${t0c}" id="mkTime">${t0}</div>
        <div style="font-size:12px;color:var(--sub)">${nt("qz_answered")} ${answered}/${M.qs.length}</div>
        <button class="btn primary" id="mkSubmit" style="margin-left:auto;padding:8px 18px">${nt("submit")}</button>
      </div>
      <div class="card" style="padding:10px 12px;margin-top:8px">
        <div style="font-size:12px;color:var(--sub);margin-bottom:6px">${nt("qz_palette")}</div>
        <div style="display:grid;grid-template-columns:repeat(10,1fr);gap:6px">${pal}</div>
      </div>
    </div>
    <div style="font-size:13px;color:var(--sub);margin:10px 0 8px">${M.i+1} / ${M.qs.length} · ${isTF?nt("qz_tf"):nt("qz_mc")}</div>
    <div class="q-card card" style="padding:20px;font-size:16px;line-height:1.7;font-weight:600">${esc(q.q)}</div>
    <div class="opts" style="margin-top:12px">${opts.map((o,oi)=>{
      const sel = M.ans[M.i]===oi;
      return `<div class="opt" data-i="${oi}" style="${sel?"border:2px solid var(--blue);background:#EEF4FF":""}">${esc(o)}</div>`;
    }).join("")}</div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn ghost" id="mkPrev" style="flex:1" ${M.i===0?"disabled":""}>${nt("prev")}</button>
      <button class="btn ghost" id="mkNext" style="flex:1" ${M.i===M.qs.length-1?"disabled":""}>${nt("next")}</button>
    </div>
    <div style="height:20px"></div>`;
  $("nursHome").querySelectorAll(".opt").forEach(el=>el.addEventListener("click", ()=>{
    M.ans[M.i] = +el.dataset.i; nursMockRender();
  }));
  $("nursHome").querySelectorAll("[data-p]").forEach(el=>el.addEventListener("click", ()=>{
    M.i = +el.dataset.p; nursMockRender();
  }));
  $("mkPrev").addEventListener("click", ()=>{ if(M.i>0){ M.i--; nursMockRender(); } });
  $("mkNext").addEventListener("click", ()=>{ if(M.i<M.qs.length-1){ M.i++; nursMockRender(); } });
  $("mkSubmit").addEventListener("click", ()=>{
    const un = M.ans.filter(a=>a<0).length;
    if(un>0){
      // 应用内确认弹窗（不用原生 confirm，避免被浏览器吞掉）
      if($("mkConfirmOv")) return;
      const ov = document.createElement("div");
      ov.id = "mkConfirmOv";
      ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px";
      ov.innerHTML = `<div class="card" style="padding:24px;max-width:340px;text-align:center">
        <div style="font-size:16px;font-weight:700;margin-bottom:8px">${nt("qz_submit")}</div>
        <div style="font-size:13px;color:var(--sub);margin-bottom:16px">${un} ${nt("qz_unans")}</div>
        <div style="display:flex;gap:10px">
          <button class="btn ghost" id="mkCNo" style="flex:1">${nt("continue")}</button>
          <button class="btn primary" id="mkCYes" style="flex:1">${nt("confirm_yes")}</button>
        </div></div>`;
      document.body.appendChild(ov);
      $("mkCNo").addEventListener("click", ()=>ov.remove());
      ov.addEventListener("click", e=>{ if(e.target===ov) ov.remove(); });
      $("mkCYes").addEventListener("click", ()=>{ ov.remove(); nursMockSubmit(false); });
      return;
    }
    nursMockSubmit(false);
  });
}
function nursMockSubmit(timeout){
  const M = MOCK; if(!M || M.done) return;
  M.done = true; clearInterval(M.timer);
  const st = nursState();
  let right = 0;
  const tagR = {}, tagN = {};
  M.qs.forEach((q,i)=>{
    const ok = M.ans[i]===q.a;
    if(ok) right++;
    nursTagHit(q.g, ok);
    if(q.g){ tagN[q.g]=(tagN[q.g]||0)+1; if(ok) tagR[q.g]=(tagR[q.g]||0)+1; }
    if(!ok) nursAddWrong(q, M.ans[i]);
  });
  const pct = Math.round(right/M.qs.length*100);
  const usedMin = Math.round((60*60*1000 - Math.max(0, M.end-Date.now()))/60000);
  if(pct > (st.mockBest||0)){ st.mockBest = pct; save(); }
  const weakTags = Object.keys(tagN)
    .map(g=>({g, acc:Math.round((tagR[g]||0)/tagN[g]*100), n:tagN[g]}))
    .filter(x=>x.acc<75).sort((a,b)=>a.acc-b.acc).slice(0,3);
  st.mockHistory.push({d:new Date().toISOString().slice(0,10), pct, right, total:M.qs.length, weak:weakTags.map(x=>x.g)});
  if(st.mockHistory.length>20) st.mockHistory = st.mockHistory.slice(-20);
  save();
  const tagBars = Object.keys(tagN).sort().map(g=>{
    const acc = Math.round((tagR[g]||0)/tagN[g]*100);
    const color = acc>=90?"#34C759":acc>=70?"#FF9500":"#FF3B30";
    return `<div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px">
        <span><b>${g}</b> ${nursSecName(g)}</span><b style="color:${color}">${acc}%</b>
      </div>
      <div style="height:7px;background:#EFEFF4;border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${acc}%;background:${color};border-radius:4px"></div>
      </div></div>`;
  }).join("");
  const review = M.qs.map((q,i)=>{
    const ok = M.ans[i]===q.a, isTF = q.t==="tf";
    const opts = isTF ? (NURS_LANG==="en"?["True","False"]:["正确 True","错误 False"]) : q.o;
    return `<div class="card" style="padding:14px;margin-bottom:10px;border-left:4px solid ${ok?"#34C759":"#FF3B30"}">
      <div style="font-size:13px;color:var(--sub);margin-bottom:4px">${NURS_LANG==="en"?"Q"+(i+1):"第 "+(i+1)+" 题"} · ${q.g||""} ${nursSecName(q.g)} · ${ok?"✓ "+nt("q_correct"):"✗ "+nt("q_wrong")}</div>
      <div style="font-weight:600;font-size:14px;line-height:1.6">${esc(q.q)}</div>
      <div style="font-size:13px;margin-top:6px">${nt("qz_your")}：${M.ans[i]>=0?esc(opts[M.ans[i]]):"<span style='color:#FF3B30'>"+nt("qz_noans")+"</span>"}<br>${nt("qz_right")}：<b style="color:#34C759">${esc(opts[q.a])}</b></div>
      <div class="tip" style="margin-top:8px;font-size:13px">💡 ${esc(q.e)}</div>
    </div>`;
  }).join("");
  $("nursHome").innerHTML = nursBack(`
    <div class="card" style="padding:28px;text-align:center;margin-bottom:14px">
      <div style="font-size:15px;color:var(--sub)">${timeout?nt("qz_timeout"):nt("qz_mock")} · ${nt("qz_score")}</div>
      <div style="font-size:52px;font-weight:800;color:${pct>=95?"#34C759":pct>=80?"#FF9500":"#FF3B30"}">${pct}%</div>
      <div class="hello" style="margin-top:6px">${nt("ov_correct")} ${right} / ${M.qs.length} · ${nt("qz_time")} ${usedMin} ${nt("min_unit")} · ${nt("qz_best")} ${st.mockBest}%</div>
      <div style="font-size:13px;color:var(--sub);margin-top:10px">${pct>=95?nt("qz_pass"):pct>=80?nt("qz_close"):nt("qz_retry")}</div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:14px;flex-wrap:wrap">
        <button class="btn primary" id="mkAgain">${nt("qz_again")}</button>
        ${weakTags.length?`<button class="btn ghost" id="mkWeak" style="border-color:#FF9500;color:#FF9500">${nt("qz_weak_btn")}</button>`:""}
      </div>
    </div>
    <div class="sec">${nt("qz_diag")}</div>
    <div class="card" style="padding:16px;margin-bottom:14px">${tagBars}
      ${weakTags.length?`<div style="font-size:13px;margin-top:8px;line-height:1.8">⚠️ ${nt("qz_weak")}：${weakTags.map(x=>`<b>${x.g} ${nursSecName(x.g)}</b> ${x.acc}%`).join(" · ")}<br><span style="color:var(--sub);font-size:12px">${nt("qz_weak_auto")}</span></div>`:`<div style="font-size:13px;color:#34C759;margin-top:8px">✓ ${nt("qz_weak_keep")}</div>`}
    </div>
    <div class="sec">${nt("qz_review")}</div>${review}`);
  $("nursBackBtn").addEventListener("click", ()=>{ mockClear(); backToToday(); });
  $("mkAgain").addEventListener("click", ()=>nursMockIntro());
  const mw = $("mkWeak");
  if(mw) mw.addEventListener("click", ()=>{ mockClear(); startDaily(weakTags.map(x=>x.g)); });
  MOCK = null;
  window.scrollTo(0,0);
}
/* 费曼复述 · 每天1个，11天一轮 */
function nursTodayStr(){ return new Date().toISOString().slice(0,10); }
function feyTodayIdx(){
  const fs = NURS_CH1.feynman, st = nursState();
  if(st.feyDate === nursTodayStr()) return -1;
  const start = st.feyNext || 0;
  for(let k=0;k<fs.length;k++){
    const i = (start+k)%fs.length;
    if(!(i in st.fey) || st.fey[i] < 2) return i;
  }
  return start % fs.length;
}
/* 费曼复述 */
function nursFeynman(i){
  NURS_RERENDER = ()=>nursFeynman(i);
  const fs = NURS_CH1.feynman, st = nursState();
  if(i >= fs.length){
    $("nursHome").innerHTML = nursBack(`<div class="card" style="padding:28px;text-align:center">
      <div style="font-size:20px;font-weight:700">${fs.length} ${nt("fy_cores")}</div>
      <div class="hello" style="margin-top:8px">${nt("fy_motto")}</div>
      <button class="btn primary" id="nfAgain" style="margin-top:14px">${nt("fy_again")}</button></div>`);
    $("nursBackBtn").addEventListener("click", backToToday);
    $("nfAgain").addEventListener("click", ()=>nursFeynman(0));
    return;
  }
  const f = fs[i];
  $("nursHome").innerHTML = nursBack(`
    <div style="font-size:13px;color:var(--sub);margin-bottom:8px">${i+1} / ${fs.length}</div>
    <div class="q-card card" style="padding:20px">
      <div style="font-size:16px;font-weight:700;line-height:1.8">${esc(f.q)}</div>
      <div class="q-sub" style="margin-top:8px">${nt("fy_speak")}</div>
      <button class="btn primary" id="nfShow" style="margin-top:14px">${nt("fy_show")}</button>
    </div>
    <div id="nfAns" hidden></div>`);
  $("nursBackBtn").addEventListener("click", backToToday);
  $("nfShow").addEventListener("click", ()=>{
    $("nfAns").innerHTML = `<div class="card" style="margin-top:14px;padding:18px">
      <div style="font-weight:700;margin-bottom:8px">${nt("fy_points")}</div>
      <ul style="margin:0;padding-left:20px">${f.points.map(p=>`<li style="font-size:14px;line-height:1.8">${esc(p)}</li>`).join("")}</ul>
      <div class="q-sub" style="margin-top:14px">${nt("fy_rate")}</div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:10px;flex-wrap:wrap">
        <button class="btn ghost" data-r="2">${nt("fy_r2")}</button>
        <button class="btn ghost" data-r="1">${nt("fy_r1")}</button>
        <button class="btn ghost" data-r="0">${nt("fy_r0")}</button>
      </div></div>`;
    $("nfAns").hidden = false;
    $("nfShow").style.display = "none";
    $("nfAns").querySelectorAll("[data-r]").forEach(b=>b.addEventListener("click", ()=>{
      st.fey[i] = +b.dataset.r;
      st.feyNext = (i+1) % fs.length;
      st.feyDate = nursTodayStr(); save();
      $("nursHome").innerHTML = nursBack(`<div class="card" style="padding:28px;text-align:center">
        <div style="font-size:20px;font-weight:700">${nt("fy_today")}</div>
        <div class="hello" style="margin-top:8px">${nt("fy_tom")}（${(st.feyNext)%fs.length+1}/${fs.length}）。</div>
        <button class="btn ghost" id="nfBack" style="margin-top:14px">${nt("back")}</button></div>`);
      $("nursBackBtn").addEventListener("click", backToToday);
      $("nfBack").addEventListener("click", backToToday);
    }));
  });
}

/* ---------- 磨耳朵 ---------- */
const EarPlayer = {
  audio: null, playlist: [], idx: 0, loopMode: 'all', rate: 1, playing: false, space: 'nurs',
  speakMode: 'bi', gap: 0, sleepMin: 0, sleepTimerId: null, pauseTimer: null,
  fadeRounds: 0, round: 0, segIdx: 0, inGap: false, inRecall: false, _miniKeep: false, _errCount: 0,
  adapter: null, // 空间适配器：nurs / en，解耦播放器与内容
  miniEl(){
    let el = $('earMini');
    if(!el){
      el = document.createElement('div');
      el.id = 'earMini';
      el.style.cssText = 'display:none;position:fixed;top:70px;right:12px;z-index:900;width:76px;height:76px;background:rgba(28,28,30,.92);border-radius:20px;box-shadow:0 8px 24px rgba(0,0,0,.3);color:#fff;';
      el.innerHTML = '<div style="position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center">'
        + '<div id="earMiniClose" style="position:absolute;top:2px;right:6px;font-size:16px;opacity:.5;cursor:pointer;padding:4px">×</div>'
        + '<div id="earMiniPlay" style="font-size:28px;cursor:pointer;line-height:1"></div>'
        + '<div id="earMiniSub" style="font-size:9px;opacity:.6;margin-top:4px;cursor:pointer"></div>'
        + '</div>';
      document.body.appendChild(el);
      $('earMiniPlay').addEventListener('click', (e)=>{ e.stopPropagation(); this.toggle(); });
      $('earMiniClose').addEventListener('click', (e)=>{ e.stopPropagation(); this.stopAll(); });
      $('earMiniSub').addEventListener('click', (e)=>{ e.stopPropagation(); go('v-ear'); });
    }
    return el;
  },
  updateMini(){
    const el = this.miniEl();
    const onEar = document.querySelector('.view.on');
    const onEarView = onEar && onEar.id === 'v-ear';
    const show = (this.playing || this._miniKeep) && !onEarView && this.playlist.length > 0;
    el.style.display = show ? 'block' : 'none';
    if(show){
      $('earMiniSub').textContent = (this.idx+1) + '/' + this.playlist.length;
      $('earMiniPlay').textContent = this.playing ? '⏸' : '▶';
    }
  },
  stopAll(){
    this.pause();
    this._miniKeep = false;
    this.updateMini();
  },
  init(){
    if(!this.audio){
      this.audio = new Audio();
      this.audio.preload = 'auto';
      try{ this.audio.preservesPitch = true; }catch(e){} // 慢速保持音调
      this.audio.addEventListener('ended', ()=>this.onEnded());
      // 音频缺失/加载失败时自动跳下一条（英语有少量空音频走回退，防卡死）
      this.audio.addEventListener('error', ()=>{
        this._errCount = (this._errCount||0)+1;
        if(this._errCount > Math.max(1, this.playlist.length)){ this._errCount = 0; this.pause(); return; }
        if(this.playing) this.next();
      });
      this.audio.addEventListener('playing', ()=>{ this._errCount = 0; });
      if('mediaSession' in navigator){
        try{
          navigator.mediaSession.setActionHandler('play', ()=>this.play());
          navigator.mediaSession.setActionHandler('pause', ()=>this.pause());
          navigator.mediaSession.setActionHandler('previoustrack', ()=>this.prev());
          navigator.mediaSession.setActionHandler('nexttrack', ()=>this.next());
        }catch(e){}
      }
    }
  },
  setMeta(t){
    if(!('mediaSession' in navigator)) return;
    try{
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title, artist: (this.adapter&&this.adapter.space==='nurs') ? (NURS_LANG==="en"?"Nursing Prep":"磨耳朵 · 护理") : '磨耳朵', album: t.album || (this.adapter && this.adapter.album) || ''
      });
    }catch(e){}
  },
  load(list, space, adapter){
    this.init(); this.playlist = list; this.idx = 0; this.space = space||'nurs';
    this.adapter = adapter || null;
    this.segIdx = 0; this.round = 0; this.inGap = false; this.inRecall = false; this._errCount = 0;
    // 预加载配图，切歌时不闪
    try{
      list.forEach(t=>{
        const src = this.adapter && this.adapter.imgFor ? this.adapter.imgFor(t) : null;
        if(src){ const im = new Image(); im.src = src; }
      });
    }catch(e){}
  },
  cur(){ return this.playlist[this.idx]; },
  segsFor(t){
    if(this.space==='en'){
      // 英语：纯英文 / 英→中（停顿回忆中文）
      if(this.speakMode==='bi') return [{k:'en', src:t.audio}, {k:'recall', pause:2.5}];
      return [{k:'en', src:t.audio}];
    }
    if(this.speakMode==='en') return [{k:'en', src:t.audio}];
    if(this.speakMode==='zhen') return [{k:'zh', src:t.audioZh||t.audio}, {k:'recall', pause:3}, {k:'en', src:t.audio}];
    const segs = [{k:'en', src:t.audio}];
    if(t.audioZh) segs.push({k:'zh', src:t.audioZh});
    return segs;
  },
  play(){
    this.init();
    if(!this.playlist.length) return;
    if(this.pauseTimer){ clearTimeout(this.pauseTimer); this.pauseTimer = null; }
    this.inGap = false; this.inRecall = false;
    const t = this.cur();
    const segs = this.segsFor(t);
    if(this.segIdx >= segs.length) this.segIdx = 0;
    const seg = segs[this.segIdx];
    if(seg.pause){
      // 中→英模式的回忆停顿
      this.inRecall = true; this.playing = true; this.setMeta(t); this.updateDynamic();
      this.pauseTimer = setTimeout(()=>{ this.inRecall = false; this.segIdx++; this.play(); }, seg.pause*1000);
      return;
    }
    // 用完整 URL 避免相对路径问题
    const url = new URL(seg.src, location.href).href;
    if(this.audio.src !== url) this.audio.src = url;
    this.audio.playbackRate = this.rate;
    this.audio.play().catch(()=>{});
    this.playing = true; this._miniKeep = true; this.setMeta(t); this.updateDynamic();
  },
  pause(){
    if(this.pauseTimer){ clearTimeout(this.pauseTimer); this.pauseTimer = null; }
    if(this.sleepTimerId){ clearTimeout(this.sleepTimerId); this.sleepTimerId = null; this.sleepMin = 0; }
    if(this.audio) this.audio.pause();
    this.playing = false; this.inGap = false; this.inRecall = false; this.updateDynamic();
  },
  toggle(){ this.playing ? this.pause() : this.play(); },
  next(){
    if(this.pauseTimer){ clearTimeout(this.pauseTimer); this.pauseTimer = null; }
    this.segIdx = 0; this.inGap = false; this.inRecall = false;
    if(this.idx < this.playlist.length-1){ this.idx++; this.play(); }
    else if(this.loopMode==='all'){
      this.idx = 0; this.round++;
      if(this.speakMode==='bi' && this.fadeRounds>0 && this.round>=this.fadeRounds) this.speakMode = 'en'; // 渐进脱钩
      this.play();
    }
    else this.onRoundDone();
  },
  prev(){
    if(this.pauseTimer){ clearTimeout(this.pauseTimer); this.pauseTimer = null; }
    this.segIdx = 0;
    if(this.idx>0){ this.idx--; this.play(); }
  },
  onEnded(){
    const t = this.cur(); if(!t) return;
    if(this.loopMode==='one'){ this.segIdx = 0; this.play(); return; }
    const segs = this.segsFor(t);
    this.segIdx++;
    if(this.segIdx < segs.length){ this.play(); return; }
    this.segIdx = 0;
    if(this.gap > 0 && this.playing){
      this.inGap = true; this.updateDynamic();
      this.pauseTimer = setTimeout(()=>{ this.inGap = false; this.next(); }, this.gap*1000);
    } else this.next();
  },
  onRoundDone(){
    this.playing = false;
    if(this.audio) this.audio.pause();
    this.renderQuizGo();
  },
  setRate(r){ this.rate = r; if(this.audio) this.audio.playbackRate = r; this.render(); },
  setLoop(m){ this.loopMode = m; this.render(); },
  setSpeakMode(m){ this.speakMode = m; this.segIdx = 0; this.round = 0; this.render(); if(this.playing) this.play(); },
  setGap(s){ this.gap = s; this.render(); },
  setFade(r){ this.fadeRounds = r; this.round = 0; this.render(); },
  setSleep(min){
    this.sleepMin = min;
    if(this.sleepTimerId){ clearTimeout(this.sleepTimerId); this.sleepTimerId = null; }
    if(min > 0) this.sleepTimerId = setTimeout(()=>{ this.pause(); }, min*60*1000);
    this.render();
  },
  updateDynamic(){
    // 轻量更新：只刷新曲目相关元素，不重建 DOM，避免闪屏
    const t = this.cur(); if(!t) return;
    if(!$('earTitle')){ this.render(); return; } // DOM 不存在时全量渲染
    const art = $('earArt');
    const artSrc = this.adapter && this.adapter.imgFor ? this.adapter.imgFor(t) : null;
    if(!artSrc){
      if(art.dataset.kind!=='sen'){
        art.dataset.kind = 'sen';
        art.innerHTML = '<div style="font-size:64px;margin-bottom:12px">💬</div>';
      }
    }else{
      let img = art.querySelector('img');
      if(art.dataset.kind!=='term' || !img){
        art.dataset.kind = 'term';
        art.innerHTML = `<img src="${artSrc}" alt="" onerror="this.style.display='none'" style="width:100%;max-height:240px;object-fit:cover;border-radius:16px;margin-bottom:12px;display:block;box-shadow:0 4px 16px rgba(0,0,0,.1)">`;
      }else if(img.getAttribute('src')!==artSrc){
        img.setAttribute('src', artSrc);
        img.style.display = '';
      }
    }
    $('earTitle').textContent = t.title;
    $('earSub').textContent = t.sub || '';
    $('earSub').style.display = t.sub ? '' : 'none';
    $('earCount').textContent = (this.idx+1) + ' / ' + this.playlist.length;
    let hint = '';
    if(this.inRecall) hint = `<div style="font-size:14px;color:#007AFF;font-weight:700;margin-top:8px">💭 ${nt('ear_recall_hint')}</div>`;
    else if(this.inGap) hint = `<div style="font-size:14px;color:#007AFF;font-weight:700;margin-top:8px">🎤 ${nt('ear_gap_hint')}</div>`;
    $('earHint').innerHTML = hint;
    const bb = $('earBigBtn');
    if(bb) bb.textContent = (this.playing&&!this.inGap&&!this.inRecall) ? '⏸' : '▶';
    this.updateMini();
  },
  modeList(){
    if(this.adapter && this.adapter.modes) return this.adapter.modes();
    return [['bi',nt('ear_mode_bi')],['en',nt('ear_mode_en')],['zhen',nt('ear_mode_zhen')]];
  },
  modeLabel(){
    const m = this.modeList().find(x=>x[0]===this.speakMode);
    return m ? m[1] : this.speakMode;
  },
  render(){
    const t = this.cur(); if(!t) return;
    // 循环/语速的快捷显示
    const loopIcon = this.loopMode==='all' ? '🔁' : this.loopMode==='one' ? '🔂' : '➡️';
    const loopTxt = this.loopMode==='all' ? nt('ear_loop_all') : this.loopMode==='one' ? nt('ear_loop_one') : nt('ear_once');
    const modeTxt = this.modeLabel();
    const artSrc = this.adapter && this.adapter.imgFor ? this.adapter.imgFor(t) : null;
    $('earBody').innerHTML = `
      <div class="card" style="padding:28px 24px;text-align:center;margin-bottom:12px">
        <div id="earArt" data-kind="${artSrc?'term':'sen'}">${artSrc
          ? `<img src="${artSrc}" alt="" loading="lazy" onerror="this.style.display='none'" style="width:100%;max-height:240px;object-fit:cover;border-radius:16px;margin-bottom:12px;display:block;box-shadow:0 4px 16px rgba(0,0,0,.1)">`
          : `<div style="font-size:64px;margin-bottom:12px">💬</div>`}</div>
        <div id="earTitle" style="font-size:19px;font-weight:800;line-height:1.5;margin-bottom:6px">${esc(t.title)}</div>
        <div id="earSub" style="font-size:14px;color:var(--sub);line-height:1.6;margin-bottom:4px">${t.sub?esc(t.sub):''}</div>
        <div id="earCount" style="font-size:12px;color:var(--sub);margin-top:8px">${this.idx+1} / ${this.playlist.length}</div>
        <div id="earHint">${this.inRecall?`<div style="font-size:14px;color:#007AFF;font-weight:700;margin-top:8px">💭 ${nt('ear_recall_hint')}</div>`:''}${this.inGap?`<div style="font-size:14px;color:#007AFF;font-weight:700;margin-top:8px">🎤 ${nt('ear_gap_hint')}</div>`:''}</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:24px;margin:20px 0 8px">
          <div id="earPrev" style="font-size:36px;cursor:pointer;opacity:.7">⏮</div>
          <div id="earBigBtn" style="width:76px;height:76px;border-radius:50%;background:#007AFF;color:#fff;font-size:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 16px rgba(0,122,255,.35)">${this.playing&&!this.inGap&&!this.inRecall?'⏸':'▶'}</div>
          <div id="earNext" style="font-size:36px;cursor:pointer;opacity:.7">⏭</div>
        </div>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:16px">
          <button id="earRateBtn" style="background:#F2F2F7;border:none;border-radius:20px;padding:8px 16px;font-size:13px;font-weight:600;color:#1c1c1e;cursor:pointer">${this.rate}x</button>
          <button id="earLoopBtn" style="background:#F2F2F7;border:none;border-radius:20px;padding:8px 16px;font-size:13px;font-weight:600;color:#1c1c1e;cursor:pointer">${loopIcon} ${loopTxt}</button>
          <button id="earSetBtn" style="background:#F2F2F7;border:none;border-radius:20px;padding:8px 16px;font-size:13px;font-weight:600;color:#1c1c1e;cursor:pointer">⚙️ ${nt('ear_settings')}</button>
        </div>
        <div style="font-size:11px;color:var(--sub);margin-top:10px">${modeTxt}${this.speakMode==='bi'&&this.fadeRounds>0?` · ${nt('ear_round')} ${this.round+1}`:''}${this.gap>0?` · ⏱${this.gap}s`:''}${this.sleepMin>0?` · 💤${this.sleepMin}${nt('ear_min')}`:''}</div>
      </div>
      <div class="hello" style="text-align:center">🔒 ${nt('ear_sub')}</div>
      <div id="earSheet" style="display:none;position:fixed;left:0;right:0;bottom:0;top:0;background:rgba(0,0,0,.4);z-index:999" >
        <div style="position:absolute;left:0;right:0;bottom:0;background:#fff;border-radius:20px 20px 0 0;padding:20px;max-height:80vh;overflow-y:auto" onclick="event.stopPropagation()">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <div style="font-size:17px;font-weight:800">${nt('ear_settings')}</div>
            <div id="earSheetClose" style="font-size:24px;cursor:pointer;color:#8e8e93">×</div>
          </div>
          <div style="margin-bottom:18px">
            <div style="font-size:13px;font-weight:700;color:#1c1c1e;margin-bottom:8px">${nt('ear_mode')}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
              ${this.modeList().map(([mid,mlabel])=>`<button data-smode="${mid}" style="padding:12px 4px;border:none;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;${this.speakMode===mid?'background:#007AFF;color:#fff':'background:#F2F2F7;color:#1c1c1e'}">${mlabel}</button>`).join('')}
            </div>
          </div>
          ${this.speakMode==='bi'?`<div style="margin-bottom:18px">
            <div style="font-size:13px;font-weight:700;color:#1c1c1e;margin-bottom:8px">${nt('ear_fade')}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <button data-fade="0" style="padding:12px;border:none;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;${this.fadeRounds===0?'background:#007AFF;color:#fff':'background:#F2F2F7;color:#1c1c1e'}">${nt('ear_off')}</button>
              <button data-fade="2" style="padding:12px;border:none;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;${this.fadeRounds===2?'background:#007AFF;color:#fff':'background:#F2F2F7;color:#1c1c1e'}">${nt('ear_fade_2')}</button>
            </div>
          </div>`:''}
          <div style="margin-bottom:18px">
            <div style="font-size:13px;font-weight:700;color:#1c1c1e;margin-bottom:8px">${nt('ear_gap')}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
              ${[0,2,5].map(s=>`<button data-gap="${s}" style="padding:12px;border:none;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;${this.gap===s?'background:#007AFF;color:#fff':'background:#F2F2F7;color:#1c1c1e'}">${s===0?nt('ear_off'):s+'s'}</button>`).join('')}
            </div>
          </div>
          <div style="margin-bottom:18px">
            <div style="font-size:13px;font-weight:700;color:#1c1c1e;margin-bottom:8px">${nt('ear_sleep')}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px">
              ${[0,15,30,60].map(m=>`<button data-sleep="${m}" style="padding:12px 4px;border:none;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;${this.sleepMin===m?'background:#007AFF;color:#fff':'background:#F2F2F7;color:#1c1c1e'}">${m===0?nt('ear_off'):m+nt('ear_min')}</button>`).join('')}
            </div>
          </div>
          <div style="margin-bottom:8px">
            <div style="font-size:13px;font-weight:700;color:#1c1c1e;margin-bottom:8px">${nt('ear_loop')}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
              ${['all','one','once'].map(m=>`<button data-loop="${m}" style="padding:12px 4px;border:none;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;${this.loopMode===m?'background:#007AFF;color:#fff':'background:#F2F2F7;color:#1c1c1e'}">${m==='all'?nt('ear_loop_all'):m==='one'?nt('ear_loop_one'):nt('ear_once')}</button>`).join('')}
            </div>
          </div>
        </div>
      </div>`;
    $('earBigBtn').addEventListener('click', ()=>this.toggle());
    $('earPrev').addEventListener('click', ()=>this.prev());
    $('earNext').addEventListener('click', ()=>this.next());
    // 语速快捷切换: 0.75 -> 1 -> 1.25 循环
    $('earRateBtn').addEventListener('click', ()=>{
      const rates = [0.75, 1, 1.25];
      const i = rates.indexOf(this.rate);
      this.setRate(rates[(i+1)%rates.length]);
    });
    // 循环快捷切换: all -> one -> once 循环
    $('earLoopBtn').addEventListener('click', ()=>{
      const modes = ['all', 'one', 'once'];
      const i = modes.indexOf(this.loopMode);
      this.setLoop(modes[(i+1)%modes.length]);
    });
    // 设置面板
    $('earSetBtn').addEventListener('click', ()=>{ this._sheetOpen=true; $('earSheet').style.display='block'; });
    $('earSheetClose').addEventListener('click', ()=>{ this._sheetOpen=false; $('earSheet').style.display='none'; });
    $('earSheet').addEventListener('click', ()=>{ this._sheetOpen=false; $('earSheet').style.display='none'; });
    const sheetWasOpen = this._sheetOpen;
    document.querySelectorAll('[data-smode]').forEach(b=>b.addEventListener('click', ()=>{ this.setSpeakMode(b.dataset.smode); }));
    document.querySelectorAll('[data-gap]').forEach(b=>b.addEventListener('click', ()=>{ this.setGap(parseInt(b.dataset.gap)); }));
    document.querySelectorAll('[data-sleep]').forEach(b=>b.addEventListener('click', ()=>{ this.setSleep(parseInt(b.dataset.sleep)); }));
    document.querySelectorAll('[data-fade]').forEach(b=>b.addEventListener('click', ()=>{ this.setFade(parseInt(b.dataset.fade)); }));
    document.querySelectorAll('[data-loop]').forEach(b=>b.addEventListener('click', ()=>{ this.setLoop(b.dataset.loop); }));
    if(sheetWasOpen){ const sh=$('earSheet'); if(sh) sh.style.display='block'; }
  },
  renderQuizGo(){
    $('earBody').innerHTML = `
      <div class="card" style="padding:32px;text-align:center">
        <div style="font-size:48px;margin-bottom:12px">🎧</div>
        <div style="font-size:18px;font-weight:800;margin-bottom:8px">✓ ${nt('ear_quiz_done').replace('完成','').replace('Complete','')} — 1 round done</div>
        <button class="btn primary" id="earQuizBtn" style="margin-top:12px;font-size:16px;padding:14px 28px">${nt('ear_quiz_go')}</button>
        <div style="margin-top:16px"><button class="btn ghost" id="earAgainBtn">${nt('ear_quiz_again')}</button></div>
      </div>`;
    $('earQuizBtn').addEventListener('click', ()=>this.startQuiz());
    $('earAgainBtn').addEventListener('click', ()=>{ this.idx = 0; this.loopMode='all'; this.play(); });
  },
  startQuiz(){
    // 回忆问答：题目由空间适配器组建（护理：看中文选英文；英语：听英文选中文）
    const qs = this.adapter && this.adapter.buildQuiz ? this.adapter.buildQuiz(this.playlist) : [];
    if(!qs.length) return;
    this.quiz = {qs, idx:0, right:0, wrong:[]};
    this.renderQuizQ();
  },
  playQuizAudio(q){
    try{
      const a = new Audio(new URL(q.audio, location.href).href);
      a.playbackRate = this.rate;
      try{ a.preservesPitch = true; }catch(e){}
      a.play().catch(()=>{});
    }catch(e){}
  },
  renderQuizQ(){
    const q = this.quiz.qs[this.quiz.idx];
    const hint = (this.adapter && this.adapter.quizHint) || nt('ear_quiz_hint');
    $('earBody').innerHTML = `
      <div class="card" style="padding:24px;text-align:center">
        <div style="font-size:13px;color:var(--sub);margin-bottom:12px">${nt('ear_quiz_title')} ${this.quiz.idx+1}/${this.quiz.qs.length} · ${q.kind==='sen'?'💬':'🔤'}</div>
        <div style="font-size:15px;color:var(--sub);margin-bottom:8px">${hint}</div>
        ${q.audioPrompt
          ? `<button id="earQuizPlay" class="ghover" style="width:76px;height:76px;border-radius:50%;background:#007AFF;color:#fff;font-size:30px;border:none;cursor:pointer;margin:10px auto;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,122,255,.35)">🔊</button>`
          : `<div style="font-size:20px;font-weight:800;line-height:1.6;margin:16px 0">${esc(q.prompt)}</div>`}
        <div style="display:grid;gap:8px;margin-top:8px">
          ${q.opts.map((o,i)=>`<button class="btn ghost earOpt" data-i="${i}" style="text-align:left;font-size:14px;padding:14px;line-height:1.5">${esc(o)}</button>`).join('')}
        </div>
      </div>`;
    const qp = $('earQuizPlay');
    if(qp){
      qp.addEventListener('click', ()=>this.playQuizAudio(q));
      if(q.audioPrompt) setTimeout(()=>this.playQuizAudio(q), 400);
    }
    document.querySelectorAll('.earOpt').forEach(b=>b.addEventListener('click', ()=>{
      const ok = q.opts[parseInt(b.dataset.i,10)] === q.correct;
      if(ok) this.quiz.right++;
      else { this.quiz.wrong.push(q); if(this.adapter && this.adapter.onQuizWrong) this.adapter.onQuizWrong(q); }
      document.querySelectorAll('.earOpt').forEach(x=>{
        const isC = q.opts[parseInt(x.dataset.i,10)] === q.correct;
        x.disabled = true;
        x.style.background = isC ? '#D4F5D4' : (x===b ? '#FFD4D4' : '');
        x.style.borderColor = isC ? '#34C759' : (x===b ? '#FF3B30' : '');
      });
      // 答后播放一遍英文原音，加深记忆
      try{
        const a = new Audio(new URL(q.audio, location.href).href);
        a.playbackRate = this.rate;
        try{ a.preservesPitch = true; }catch(e){}
        a.play().catch(()=>{});
      }catch(e){}
      setTimeout(()=>{
        this.quiz.idx++;
        if(this.quiz.idx < this.quiz.qs.length) this.renderQuizQ();
        else this.renderQuizDone();
      }, 1800);
    }));
  },
  renderQuizDone(){
    const {right, qs} = this.quiz;
    const pct = Math.round(right/qs.length*100);
    const wrong = (this.quiz.wrong||[]).filter(q=>q.kind!=='sen' || this.space==='en');
    $('earBody').innerHTML = `
      <div class="card" style="padding:32px;text-align:center">
        <div style="font-size:48px;margin-bottom:12px">${pct>=80?'🎉':'💪'}</div>
        <div style="font-size:24px;font-weight:800;margin-bottom:8px">${pct}%</div>
        <div style="font-size:14px;color:var(--sub)">${nt('ear_quiz_done')} · ${right}/${qs.length}</div>
        ${wrong.length?`<div style="margin-top:16px;text-align:left">
          <div style="font-size:13px;font-weight:700;margin-bottom:8px">❌ ${nt('ear_wrong_list')} (${wrong.length}) · ${nt('ear_wrong_noted')}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">${wrong.map((q,i)=>`<button class="btn ghost" data-ewi="${i}" style="padding:6px 12px;font-size:12px">${esc(q.correct)}</button>`).join("")}</div>
        </div>`:""}
        <div style="display:flex;gap:8px;justify-content:center;margin-top:20px">
          <button class="btn primary" id="earDoneAgain">${nt('ear_quiz_again')}</button>
          <button class="btn ghost" id="earDoneQuiz">${nt('ear_quiz_go').split('→')[1]||nt('ear_quiz_go')}</button>
        </div>
      </div>`;
    $('earDoneAgain').addEventListener('click', ()=>{ this.idx = 0; this.loopMode='all'; this.play(); });
    $('earDoneQuiz').addEventListener('click', ()=>this.startQuiz());
    document.querySelectorAll('[data-ewi]').forEach(b=>b.addEventListener('click', ()=>{
      const q = wrong[parseInt(b.dataset.ewi,10)];
      if(q && this.adapter && this.adapter.goTerm) this.adapter.goTerm(q.correct, q.audio);
    }));
  }
};
function setEarTitle(t, sub){
  const v = $('v-ear'); if(!v) return;
  const h = v.querySelector('[data-nt="ear_title"]'); if(h) h.textContent = t;
  const s = v.querySelector('[data-nt="ear_sub"]'); if(s) s.textContent = sub;
}
/* 护理空间适配器：术语配图 / 看中文选英文 / 错词回打分+直达闪卡 */
const nursEarAdapter = {
  space: 'nurs', album: 'BIOL 235',
  modes(){ return [['bi',nt('ear_mode_bi')],['en',nt('ear_mode_en')],['zhen',nt('ear_mode_zhen')]]; },
  imgFor(t){ return t.type==='term' ? nursImg(t.title) : null; },
  quizHint: null, // 用默认 nt('ear_quiz_hint')
  buildQuiz(playlist){
    const qs = [];
    const termItems = playlist.filter(t=>t.type==='term');
    const senItems = playlist.filter(t=>t.type==='sen');
    const allTerms = NURS_CH1.terms;
    termItems.forEach(t=>{
      const pool = allTerms.filter(x=>x.w.toLowerCase()!==String(t.title).toLowerCase());
      const distract = [...pool].sort(()=>Math.random()-0.5).slice(0,3).map(x=>x.w);
      if(distract.length<3) return;
      const opts = [t.title, ...distract].sort(()=>Math.random()-0.5);
      qs.push({kind:'term', key:t.title, prompt:t.sub, correct:t.title, opts, audio:nursAud(t.title)});
    });
    const sens = [...senItems].sort(()=>Math.random()-0.5).slice(0,10);
    sens.forEach(s=>{
      const distract = NURS_EAR_SENS.filter(x=>x.e!==s.title).sort(()=>Math.random()-0.5).slice(0,3).map(x=>x.e);
      if(distract.length<3) return;
      const opts = [s.title, ...distract].sort(()=>Math.random()-0.5);
      qs.push({kind:'sen', key:s.title, prompt:s.sub, correct:s.title, opts, audio:s.audio});
    });
    qs.sort(()=>Math.random()-0.5);
    return qs;
  },
  onQuizWrong(q){ if(q.kind==='term') nursTermRate(q.correct, 0); },
  goTerm(correct){ nursTermsGoTerm(correct); },
};
/* 英语空间适配器：单词/词组配图 / 听英文选中文 / 错词回写统计+重听 */
const enEarAdapter = {
  space: 'en', album: '英语磨耳朵',
  modes(){ return [['en','纯英文'],['bi','英→中回忆']]; },
  imgFor(t){ return (t.type==='word'||t.type==='phrase') ? imgFile(t.key) : null; },
  quizHint: '听发音，选出正确的中文意思',
  buildQuiz(playlist){
    const qs = [];
    const wItems = playlist.filter(t=>t.type==='word'||t.type==='phrase');
    const sItems = playlist.filter(t=>t.type==='sen');
    wItems.forEach(t=>{
      const distract = [...WORDS].filter(x=>x.w!==t.key && x.zh!==t.sub)
        .sort(()=>Math.random()-0.5).slice(0,3).map(x=>x.zh);
      if(distract.length<3) return;
      const opts = [t.sub, ...distract].sort(()=>Math.random()-0.5);
      qs.push({kind:t.type, key:t.key, audioPrompt:true, audio:t.audio, correct:t.sub, opts});
    });
    const sens = [...sItems].sort(()=>Math.random()-0.5).slice(0,8);
    sens.forEach(s=>{
      const distract = ALLSEN.filter(x=>x.en!==s.key && x.zh!==s.sub)
        .sort(()=>Math.random()-0.5).slice(0,3).map(x=>x.zh);
      if(distract.length<3) return;
      const opts = [s.sub, ...distract].sort(()=>Math.random()-0.5);
      qs.push({kind:'sen', key:s.key, audioPrompt:true, audio:s.audio, correct:s.sub, opts});
    });
    qs.sort(()=>Math.random()-0.5);
    return qs.slice(0, 15);
  },
  onQuizWrong(q){ if(q.kind==='word'||q.kind==='phrase') statWord(q.key, false); },
  goTerm(correct, audio){
    try{
      const a = new Audio(new URL(audio, location.href).href);
      a.play().catch(()=>{});
    }catch(e){}
  },
};
function enEarStart(){
  // 组建播放列表：薄弱词 → 错题词 → 已学词补足 → 词组穿插 → 句子
  const list = [];
  const seen = new Set();
  const pushW = (wObj)=>{
    if(!wObj || !wObj.w || seen.has(wObj.w)) return;
    seen.add(wObj.w);
    const isPhrase = wObj.c==='phrases';
    list.push({type:isPhrase?'phrase':'word', key:wObj.w, title:wObj.w, sub:wObj.zh||'', audio:audW(wObj.w)});
  };
  // 1. 薄弱词（正确率<70%，按正确率排序，最弱优先）
  try{
    const weak = Object.keys(S.ws||{}).filter(w=>{ const s=S.ws[w]; return s.q>0 && s.a/s.q<0.7; })
      .sort((a,b)=>(S.ws[a].a/S.ws[a].q)-(S.ws[b].a/S.ws[b].q)).slice(0,8);
    weak.forEach(w=>pushW(WLOW[w.toLowerCase()] || {w, zh:(S.wrong[w]||{}).zh||'', c:''}));
  }catch(e){}
  // 2. 错题本
  try{
    Object.keys(S.wrong||{}).slice(0,12).forEach(w=>{
      const o = WLOW[w.toLowerCase()];
      pushW(o || {w, zh:(S.wrong[w]||{}).zh||'', c:''});
    });
  }catch(e){}
  // 3. 已学词随机补足到 12
  const learned = Object.keys(S.learned||{}).filter(w=>!seen.has(w)).sort(()=>Math.random()-0.5);
  for(const w of learned){
    if(list.filter(t=>t.type!=='sen').length>=12) break;
    const o = WLOW[w.toLowerCase()];
    if(o) pushW(o);
  }
  // 4. 词组穿插（保证至少 3 个）
  const phCount = list.filter(t=>t.type==='phrase').length;
  if(phCount < 3){
    WORDS.filter(x=>x.c==='phrases' && !seen.has(x.w)).sort(()=>Math.random()-0.5)
      .slice(0, 3-phCount).forEach(pushW);
  }
  // 5. 句子 8 条
  [...ALLSEN].sort(()=>Math.random()-0.5).slice(0,8).forEach(s=>{
    const idx = ALLSEN.indexOf(s);
    list.push({type:'sen', key:s.en, title:s.en, sub:s.zh||'', audio:audS(idx)});
  });
  if(!list.length) return;
  // 断点恢复
  const lastTitle = EarPlayer.playlist.length && EarPlayer.cur() ? EarPlayer.cur().title : null;
  const lastIdx = EarPlayer.idx || 0;
  EarPlayer.load(list, 'en', enEarAdapter);
  EarPlayer.speakMode = 'en';
  EarPlayer.quiz = null;
  if(lastTitle){
    const found = list.findIndex(t=>t.title===lastTitle);
    EarPlayer.idx = found>=0 ? found : Math.min(lastIdx, list.length-1);
  }
  setEarTitle('磨耳朵 · 英语', '单词 + 词组 + 句子 · 锁屏/息屏可播');
  go('v-ear');
  EarPlayer.render();
  setTimeout(()=>EarPlayer.play(), 300);
}
function nursEarStart(){
  NURS_RERENDER = null;
  // 组建播放列表：到期术语 + 20 句子
  const st = nursState();
  const due = nursDueTerms().slice(0, 15); // 最多 15 个到期术语
  const list = [];
  due.forEach(w=>{
    const t = NURS_CH1.terms.find(x=>x.w===w);
    if(t) list.push({type:'term', title:t.w, sub:t.zh, audio:nursAud(t.w),
      audioZh:zhTermAud(NURS_CH1.terms.findIndex(x=>x.w===t.w))});
  });
  // 如果到期术语不足，补新术语
  if(list.length < 10){
    const seen = new Set(due);
    const fresh = NURS_CH1.terms.filter(t=>!seen.has(t.w)).slice(0, 10-list.length);
    fresh.forEach(t=>list.push({type:'term', title:t.w, sub:t.zh, audio:nursAud(t.w),
      audioZh:zhTermAud(NURS_CH1.terms.findIndex(x=>x.w===t.w))}));
  }
  NURS_EAR_SENS.forEach(s=>list.push({type:'sen', title:s.e, sub:s.c, audio:s.a,
    audioZh:s.a.replace("audio/nurs/ear/", "audio/nurs/ear/zh/")}));
  // 记住上次播到的曲目，恢复断点（按标题找，列表变了就按序号）
  const lastTitle = EarPlayer.playlist.length && EarPlayer.cur() ? EarPlayer.cur().title : null;
  const lastIdx = EarPlayer.idx || 0;
  EarPlayer.load(list, 'nurs', nursEarAdapter);
  if(lastTitle){
    const found = list.findIndex(t=>t.title===lastTitle);
    EarPlayer.idx = found>=0 ? found : Math.min(lastIdx, list.length-1);
  }
  setEarTitle(nt('ear_title'), nt('ear_sub'));
  go('v-ear');
  EarPlayer.render();
  // 自动开始播放（需要用户手势，已在点击中）
  setTimeout(()=>EarPlayer.play(), 300);
}

/* ---------- 启动 ---------- */
document.querySelectorAll(".nursLangBtn").forEach(b=>b.addEventListener("click", toggleNursLang));
/* iOS 风格：从屏幕左边缘向右滑 = 返回。
   下钻页（如闪卡/测验）点现有的返回按钮；顶层页面回空间入口。 */
(function(){
  let sx=0, sy=0, tracking=false;
  const EDGE=32, MIN_DX=100, MAX_DY=70;
  document.addEventListener("touchstart", e=>{
    if(e.touches.length!==1){ tracking=false; return; }
    const t=e.touches[0];
    sx=t.clientX; sy=t.clientY;
    tracking = sx < EDGE;
  }, {passive:true});
  document.addEventListener("touchmove", e=>{
    if(!tracking) return;
    const t=e.touches[0];
    if(Math.abs(t.clientY-sy) > MAX_DY) tracking=false; // 纵向滚动则取消
  }, {passive:true});
  const cancel = ()=>{ tracking=false; };
  document.addEventListener("touchcancel", cancel, {passive:true});
  document.addEventListener("touchend", e=>{
    if(!tracking){ return; }
    tracking=false;
    const t=e.changedTouches[0];
    const dx=t.clientX-sx, dy=Math.abs(t.clientY-sy);
    if(dx>MIN_DX && dy<MAX_DY) edgeSwipeBack();
  }, {passive:true});
})();
function edgeSwipeBack(){
  if(typeof SPACE!=="undefined" && SPACE==="kids") return; // 儿童乐园不启用
  const cur=document.querySelector(".view.on");
  try{
    const bb=cur ? cur.querySelector("#nursBackBtn") : null;
    if(bb){ bb.click(); return; } // 下钻页：退一级（只点当前可见视图里的）
  }catch(e){}
  if(cur && cur.id!=="v-entry" && typeof goEntry==="function") goEntry(); // 顶层：回空间入口
}
document.querySelectorAll(".gsyncBtn").forEach(b=>b.addEventListener("click", ()=>gQuickSync(b)));
renderGSyncBtns();
document.querySelectorAll("[data-nt]").forEach(el=>{ el.textContent = nt(el.dataset.nt); });
document.querySelectorAll(".nursLangBtn").forEach(b=>{ b.textContent = NURS_LANG==="zh" ? "EN" : "中"; });
// 入口选择页
function goEntry(){
  document.querySelectorAll(".view").forEach(x=>x.classList.remove("on"));
  document.querySelectorAll(".tabbar, .sidebar").forEach(el=>el.style.display = "");
  document.querySelectorAll(".tabbar span[data-v], .sidebar span[data-v]").forEach(s=>s.classList.remove("on"));
  if(typeof kNav === "function") kNav();
  $("v-entry").classList.add("on");
  document.body.classList.add("on-entry");
  window.scrollTo(0,0);
  try{ if(typeof EarPlayer!=='undefined' && EarPlayer.updateMini) EarPlayer.updateMini(); }catch(e){}
}
$("entryEn").addEventListener("click", ()=>switchSpace("en", true));
$("entryNurs").addEventListener("click", ()=>switchSpace("nurs", true));
$("entryKids").addEventListener("click", ()=>switchSpace("kids", true));
const enEarB = $("enEarBanner");
if(enEarB) enEarB.addEventListener("click", ()=>enEarStart());
const sideSw = $("sideSwitch");
if(sideSw) sideSw.addEventListener("click", goEntry);
renderSenList();
goEntry();
