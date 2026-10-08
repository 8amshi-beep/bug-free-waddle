/* BIOL 235 Ch.1 解剖图对照表 — 手绘精确 SVG（标注位置人工核对，非 AI 生成）
   配色：浅色 Apple 风；中文 13px 深灰，英文 10px 灰蓝 */
var NURS_ATLAS_CH1 = (function(){
var INK="#1F2937", SUB="#6B7A90", LINE="#8AA5CC", ACC="#2F7DE1", LEAD="#9AB0D0";
var FILL="#EAF1FB", TFILL="#DCE8FA";

/* 正面人体简笔：cx 中心 x，y0 头顶 y，s 缩放 */
function fig(cx,y0,s){
  s=s||1;
  var st="stroke='"+LINE+"' stroke-width='"+(3*s)+"' stroke-linecap='round' fill='none'";
  var stf="stroke='"+LINE+"' stroke-width='"+(3*s)+"' fill='"+FILL+"'";
  return "<g>"+
    "<circle cx='"+cx+"' cy='"+(y0+10*s)+"' r='"+(10*s)+"' "+stf+"/>"+
    "<rect x='"+(cx-16*s)+"' y='"+(y0+26*s)+"' width='"+(32*s)+"' height='"+(46*s)+"' rx='"+(12*s)+"' "+stf+"/>"+
    "<line x1='"+(cx-15*s)+"' y1='"+(y0+34*s)+"' x2='"+(cx-27*s)+"' y2='"+(y0+62*s)+"' "+st+"/>"+
    "<line x1='"+(cx+15*s)+"' y1='"+(y0+34*s)+"' x2='"+(cx+27*s)+"' y2='"+(y0+62*s)+"' "+st+"/>"+
    "<line x1='"+(cx-9*s)+"' y1='"+(y0+72*s)+"' x2='"+(cx-9*s)+"' y2='"+(y0+102*s)+"' "+st+"/>"+
    "<line x1='"+(cx+9*s)+"' y1='"+(y0+72*s)+"' x2='"+(cx+9*s)+"' y2='"+(y0+102*s)+"' "+st+"/>"+
  "</g>";
}
function zh(x,y,t,fs){ return "<text x='"+x+"' y='"+y+"' text-anchor='middle' font-size='"+(fs||13)+"' font-weight='600' fill='"+INK+"'>"+t+"</text>"; }
function en(x,y,t){ return "<text x='"+x+"' y='"+y+"' text-anchor='middle' font-size='10' fill='"+SUB+"'>"+t+"</text>"; }
function arrow(x1,y1,x2,y2,c){ c=c||ACC;
  return "<line x1='"+x1+"' y1='"+y1+"' x2='"+x2+"' y2='"+y2+"' stroke='"+c+"' stroke-width='2.5'/>"+
  "<polygon points='"+x2+","+y2+" "+(x2-7)+","+(y2-3)+" "+(x2-7)+","+(y2+3)+"' fill='"+c+"'/>"; }

/* ---------- 图1：三个切面（水彩三联 + 标注叠加） ---------- */
function planes(){
  var s="<div style='position:relative;border-radius:12px;overflow:hidden'>";
  s+="<img src='images/nurs/atlas/planes.jpg' style='width:100%;display:block' alt='人体切面 Body Planes'>";
  s+="<svg viewBox='0 0 300 100' style='position:absolute;inset:0;width:100%;height:100%'>";
  s+="<line x1='52.3' y1='7' x2='52.3' y2='93' stroke='#2F7DE1' stroke-width='1.3' stroke-dasharray='4 2.6'/>";
  s+="<text x='30.3' y='47' text-anchor='middle' font-size='7.5' font-weight='700' fill='#2F7DE1'>左</text>";
  s+="<text x='74.3' y='47' text-anchor='middle' font-size='7.5' font-weight='700' fill='#2F7DE1'>右</text>";
  s+="<rect x='135.5' y='8' width='26' height='84' rx='5' fill='#2F7DE1' opacity='0.14'/>";
  s+="<circle cx='131' cy='30' r='4.6' fill='#fff' stroke='#2F7DE1' stroke-width='1.2'/>";
  s+="<text x='131' y='32.6' text-anchor='middle' font-size='6' font-weight='700' fill='#2F7DE1'>⊙</text>";
  s+="<text x='131' y='41' text-anchor='middle' font-size='6.5' font-weight='700' fill='#1F2937'>前</text>";
  s+="<circle cx='166' cy='30' r='4.6' fill='#fff' stroke='#2F7DE1' stroke-width='1.2'/>";
  s+="<text x='166' y='32.6' text-anchor='middle' font-size='6' font-weight='700' fill='#2F7DE1'>⊗</text>";
  s+="<text x='166' y='41' text-anchor='middle' font-size='6.5' font-weight='700' fill='#1F2937'>后</text>";
  s+="<line x1='232' y1='52' x2='260' y2='52' stroke='#2F7DE1' stroke-width='1.3' stroke-dasharray='4 2.6'/>";
  s+="<text x='246' y='40' text-anchor='middle' font-size='7.5' font-weight='700' fill='#2F7DE1'>上</text>";
  s+="<text x='246' y='66' text-anchor='middle' font-size='7.5' font-weight='700' fill='#2F7DE1'>下</text>";
  s+="</svg></div>";
  s+="<div style='display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px;text-align:center'>";
  s+=planeCap("矢状面","Sagittal plane","分为左、右两部分");
  s+=planeCap("额状面（冠状面）","Frontal (coronal) plane","分为前、后两部分");
  s+=planeCap("横切面","Transverse plane","分为上、下两部分");
  s+="</div>";
  s+="<div style='font-size:11px;color:#6B7A90;margin-top:6px'>正中矢状面 midsagittal：经过身体中线、均分左右 —— 常考！</div>";
  return s;
}
function planeCap(t,e,sub){
  return "<div style='background:#F7FAFD;border-radius:10px;padding:8px 4px'>"+
    "<div style='font-size:13px;font-weight:700;color:#1F2937'>"+t+"</div>"+
    "<div style='font-size:10px;color:#6B7A90'>"+e+"</div>"+
    "<div style='font-size:11px;color:#6B7A90;margin-top:2px'>"+sub+"</div></div>";
}

/* ---------- 图2：方向术语（水彩人体 + 标注叠加） ---------- */
function directions(){
  var INK2="#1F2937", SUB2="#6B7A90", ACC2="#2F7DE1";
  function f(n){ return n.toFixed(1); }
  function T(x,y,t,fs,anc,wt){ return "<text x='"+f(x)+"' y='"+f(y)+"' text-anchor='"+(anc||"start")+"' font-size='"+(fs||3)+"' font-weight='"+(wt||700)+"' fill='"+INK2+"'>"+t+"</text>"; }
  function E(x,y,t,anc){ return "<text x='"+f(x)+"' y='"+f(y)+"' text-anchor='"+(anc||"start")+"' font-size='2.2' fill='"+SUB2+"'>"+t+"</text>"; }
  function ARR(x1,y1,x2,y2){
    var dx=x2-x1, dy=y2-y1, L=Math.sqrt(dx*dx+dy*dy), ux=dx/L, uy=dy/L;
    var bx=x2-ux*2.4, by=y2-uy*2.4, px=-uy*1.2, py=ux*1.2;
    return "<line x1='"+f(x1)+"' y1='"+f(y1)+"' x2='"+f(x2)+"' y2='"+f(y2)+"' stroke='"+ACC2+"' stroke-width='0.8'/>"+
      "<polygon points='"+f(x2)+","+f(y2)+" "+f(bx+px)+","+f(by+py)+" "+f(bx-px)+","+f(by-py)+"' fill='"+ACC2+"'/>";
  }
  var s="<div style='position:relative;border-radius:12px;overflow:hidden'>";
  s+="<svg viewBox='0 0 130 100' style='width:100%;height:auto;display:block'>";
  s+="<defs><linearGradient id='dsoft' x1='0' y1='0' x2='1' y2='0'>"+
     "<stop offset='0' stop-color='#fff' stop-opacity='0'/>"+
     "<stop offset='0.09' stop-color='#fff' stop-opacity='1'/>"+
     "<stop offset='0.91' stop-color='#fff' stop-opacity='1'/>"+
     "<stop offset='1' stop-color='#fff' stop-opacity='0'/></linearGradient>"+
     "<mask id='dmsk'><rect x='24' y='-4' width='82' height='108' fill='url(#dsoft)'/></mask></defs>";
  s+="<rect x='0' y='0' width='130' height='100' fill='#FBF8F1'/>";
  s+="<image href='images/nurs/atlas/planes.jpg' x='-97.7' y='-5.5' width='325.3' height='108.4' mask='url(#dmsk)'/>";
  // 上方 / 下方
  s+=T(3,8,"上方")+E(3,11.2,"superior · 朝向头部");
  s+="<line x1='13' y1='16' x2='13' y2='80' stroke='"+ACC2+"' stroke-width='0.8'/>";
  s+=ARR(13,16,13,9)+ARR(13,80,13,87);
  s+=T(3,90,"下方")+E(3,93.2,"inferior · 远离头部");
  // 内侧 / 外侧（大腿高度）
  s+=ARR(44,70,55,70);
  s+=T(49.5,66,"内侧",3,"middle")+E(49.5,68.6,"medial · 近中线","middle");
  s+=ARR(75,70,86,70);
  s+=T(80.5,66,"外侧",3,"middle")+E(80.5,68.6,"lateral · 远中线","middle");
  // 近端 / 远端（左上臂外侧）
  s+="<line x1='50' y1='30' x2='50' y2='60' stroke='"+ACC2+"' stroke-width='0.8'/>";
  s+="<line x1='48' y1='30' x2='52' y2='30' stroke='"+ACC2+"' stroke-width='0.8'/>";
  s+="<line x1='48' y1='60' x2='52' y2='60' stroke='"+ACC2+"' stroke-width='0.8'/>";
  s+=T(47,33,"近端",3,"end")+E(47,35.6,"proximal · 近躯干","end");
  s+=T(47,58,"远端",3,"end")+E(47,60.6,"distal · 远躯干","end");
  // 前方 / 后方（侧面小图）
  s+="<rect x='105' y='6' width='23' height='32' rx='3' fill='#ffffff' stroke='#E3EAF5' stroke-width='0.6'/>";
  s+=T(116.5,11,"前方 / 后方",2.8,"middle");
  s+="<circle cx='116' cy='17.5' r='3.4' fill='#DCE8FA' stroke='#8AA5CC' stroke-width='0.7'/>";
  s+="<polygon points='112.8,16.6 111.4,17.6 112.8,18.6' fill='#8AA5CC'/>";
  s+="<path d='M116,21 L116,32' stroke='#8AA5CC' stroke-width='2.2' stroke-linecap='round'/>";
  s+="<path d='M116,32 L114.6,37 M116,32 L117.4,37' stroke='#8AA5CC' stroke-width='1.5' stroke-linecap='round'/>";
  s+=ARR(112,25,106.5,25);
  s+=T(109.2,22.8,"前方",2.6,"middle");
  s+=ARR(120,25,125.5,25);
  s+=T(122.8,22.8,"后方",2.6,"middle");
  s+=E(109.2,36.6,"anterior","middle")+E(122.8,36.6,"posterior","middle");
  s+="</svg></div>";
  s+="<div style='font-size:11px;color:#6B7A90;margin-top:6px'>解剖学姿势：身体直立、面向前、双足并拢、手掌向前 —— 所有方向术语都以此为基准</div>";
  return s;
}

/* ---------- 图2 done ---------- */
function cavities(){
  // 右侧位水彩体腔图（仿课本 Fig 1.10）：颅腔-椎管-胸腔-膈-腹腔-盆腔
  var s="<svg viewBox='0 0 140 200' style='width:100%;height:auto;display:block;background:#F7FAFD;border-radius:12px'>";
  s+="<image href='images/nurs/atlas/cavities.jpg' x='20' y='0' width='100' height='200' preserveAspectRatio='xMidYMid slice'/>";
  function lead(x1,y1,x2,y2){return "<line x1='"+x1+"' y1='"+y1+"' x2='"+x2+"' y2='"+y2+"' stroke='"+LEAD+"' stroke-width='1' opacity='0.9'/><circle cx='"+x2+"' cy='"+y2+"' r='1.8' fill='#2F7DE1'/>";}
  function lab(x,y,t,en,anchor){
    return "<text x='"+x+"' y='"+y+"' text-anchor='"+anchor+"' font-size='6' font-weight='700' fill='"+INK+"'>"+t+"</text>"
      +"<text x='"+x+"' y='"+(y+7)+"' text-anchor='"+anchor+"' font-size='4.2' fill='"+SUB+"'>"+en+"</text>";
  }
  // 左侧：前部体腔（自上而下）
  s+=lab(2,20,"颅腔","cranial cavity · 脑","start")+lead(17,21,64,23);
  s+=lab(2,88,"胸腔","thoracic cavity","start")+lead(17,89,56,93);
  s+=lab(2,118,"膈","diaphragm","start")+lead(17,119,59,121);
  s+=lab(2,146,"腹腔","abdominal cavity","start")+lead(17,147,56,149);
  s+=lab(2,176,"盆腔","pelvic cavity","start")+lead(17,177,64,179);
  // 右侧：后部
  s+=lab(138,86,"椎管 · 脊髓","vertebral canal","end")+lead(123,87,91,89);
  s+="<text x='138' y='108' text-anchor='end' font-size='4.2' fill='"+SUB+"'>颅腔与椎管相通</text>";
  s+="<text x='138' y='116' text-anchor='end' font-size='4.2' fill='"+SUB+"'>三层脑膜保护脑和脊髓</text>";
  return s+"</svg>";
}

function thoracic(){
  // 横切面（从足侧向上看）：图左 = 身体右侧，心脏偏左，右肺较大
  var s="<svg viewBox='0 0 200 112.5' style='width:100%;height:auto;display:block;border-radius:12px'>";
  s+="<image href='images/nurs/atlas/thoracic.jpg' x='0' y='0' width='200' height='112.5' preserveAspectRatio='xMidYMid slice'/>";
  function lead(x1,y1,x2,y2){return "<line x1='"+x1+"' y1='"+y1+"' x2='"+x2+"' y2='"+y2+"' stroke='"+LEAD+"' stroke-width='1.1' opacity='0.85'/><circle cx='"+x2+"' cy='"+y2+"' r='2.2' fill='#2F7DE1'/>";}
  function lab(x,y,t,en,anchor){
    return "<text x='"+x+"' y='"+y+"' text-anchor='"+anchor+"' font-size='6.4' font-weight='700' fill='"+INK+"'>"+t+"</text>"
      +"<text x='"+x+"' y='"+(y+7.4)+"' text-anchor='"+anchor+"' font-size='4.8' fill='"+SUB+"'>"+en+"</text>";
  }
  // 左侧标注（图左 = 身体右侧）
  s+=lab(4,26,"右胸膜腔","right pleural cavity","start")+lead(30,27,56,44);
  s+=lab(4,50,"壁胸膜","parietal pleura","start")+lead(30,51,44,66);
  s+=lab(4,74,"脏胸膜","visceral pleura","start")+lead(30,75,66,78);
  // 右侧标注（图右 = 身体左侧）
  s+=lab(196,26,"左胸膜腔","left pleural cavity","end")+lead(170,27,148,44);
  s+=lab(196,48,"纵隔","mediastinum","end")+lead(170,49,106,34);
  s+=lab(196,68,"心包腔","pericardial cavity","end")+lead(170,69,122,60);
  s+=lab(196,88,"膈","diaphragm","end")+lead(170,89,104,98);
  return s+"</svg>";
}

function feedback(){
  var s="<svg viewBox='0 0 400 268' style='width:100%;height:auto;background:#F7FAFD;border-radius:12px'>";
  var boxes=[
    {t:"刺激", e:"stimulus", n:"血压升高 ↑"},
    {t:"感受器", e:"receptor", n:"压力感受器"},
    {t:"控制中枢", e:"control center", n:"脑"},
    {t:"效应器", e:"effector", n:"心脏 · 血管"},
    {t:"反应", e:"response", n:"血压下降 ↓"}
  ];
  var bw=68, bh=58, y=30, gap=(400-20-5*bw)/4;
  boxes.forEach(function(b,i){
    var x=10+i*(bw+gap);
    var col = (i===0||i===4) ? "#FFF7ED" : (i===2 ? TFILL : "#FFFFFF");
    var bd = (i===0||i===4) ? "#E8A87C" : (i===2 ? ACC : LINE);
    s+="<rect x='"+x+"' y='"+y+"' width='"+bw+"' height='"+bh+"' rx='10' fill='"+col+"' stroke='"+bd+"' stroke-width='2'/>";
    s+=zh(x+bw/2, y+20, b.t, 11.5)+en(x+bw/2, y+34, b.e);
    s+="<text x='"+(x+bw/2)+"' y='"+(y+50)+"' text-anchor='middle' font-size='9' fill='"+SUB+"'>"+b.n+"</text>";
    if(i<4){
      var x1=x+bw, x2=x+bw+gap;
      s+="<line x1='"+x1+"' y1='"+(y+bh/2)+"' x2='"+x2+"' y2='"+(y+bh/2)+"' stroke='"+ACC+"' stroke-width='2.5'/>";
      s+="<polygon points='"+x2+","+(y+bh/2)+" "+(x2-8)+","+(y+bh/2-4)+" "+(x2-8)+","+(y+bh/2+4)+"' fill='"+ACC+"'/>";
    }
  });
  // afferent / efferent labels
  s+="<text x='"+(10+bw+gap/2)+"' y='"+(y-8)+"' text-anchor='middle' font-size='9' fill='"+SUB+"'>传入 afferent</text>";
  s+="<text x='"+(10+3*(bw+gap)+gap/2)+"' y='"+(y-8)+"' text-anchor='middle' font-size='9' fill='"+SUB+"'>传出 efferent</text>";
  // return arrow (negative feedback)
  s+="<path d='M 356 "+(y+bh+6)+" C 356 140, 44 140, 44 "+(y+bh+6)+"' stroke='#E8A87C' stroke-width='2.5' fill='none' stroke-dasharray='6 4'/>";
  s+="<polygon points='44,"+(y+bh+6)+" 52,"+(y+bh+2)+" 52,"+(y+bh+10)+"' fill='#E8A87C'/>";
  s+="<text x='200' y='128' text-anchor='middle' font-size='11' font-weight='700' fill='#C46A2B'>负反馈：逆转受控条件的变化 → 恢复稳态</text>";
  s+="<text x='200' y='144' text-anchor='middle' font-size='9' fill='"+SUB+"'>negative feedback · 如血压调节：感受器→脑→心血管，血压回落</text>";
  // positive feedback
  s+="<rect x='10' y='160' width='380' height='92' rx='10' fill='#FFFFFF' stroke='#E3EAF5' stroke-width='1.5'/>";
  s+="<text x='24' y='184' font-size='12' font-weight='700' fill='"+INK+"'>正反馈 positive feedback：加强变化（少见）</text>";
  s+="<text x='24' y='206' font-size='11' fill='"+INK+"'>例：分娩 — 催产素 oxytocin → 子宫收缩加强 → 释放更多催产素 → …直到分娩结束</text>";
  s+="<text x='24' y='228' font-size='11' fill='"+INK+"'>血凝块形成亦为正反馈。胎儿娩出、刺激解除后循环停止。</text>";
  s+="<text x='24' y='246' font-size='9' fill='"+SUB+"'>记忆：负反馈=刹车（逆转），正反馈=油门（加强）</text>";
  return s+"</svg>";
}

/* 图6：腹盆腔分区（四象限 + 九分区） */
function abdomDiv(){
  var s="<svg viewBox='0 0 400 268' style='width:100%;height:auto;background:#F7FAFD;border-radius:12px'>";
  // quadrants
  s+=zh(100,22,"四象限 Quadrants（临床常用）",12);
  var qx=30, qy=36, qw=140, qh=150;
  s+="<rect x='"+qx+"' y='"+qy+"' width='"+qw+"' height='"+qh+"' rx='8' fill='#FFFFFF' stroke='"+LINE+"' stroke-width='2.5'/>";
  s+="<line x1='"+(qx+qw/2)+"' y1='"+qy+"' x2='"+(qx+qw/2)+"' y2='"+(qy+qh)+"' stroke='"+LINE+"' stroke-width='1.5'/>";
  s+="<line x1='"+qx+"' y1='"+(qy+qh/2)+"' x2='"+(qx+qw)+"' y2='"+(qy+qh/2)+"' stroke='"+LINE+"' stroke-width='1.5'/>";
  var qs=[["右上腹","RUQ"],["左上腹","LUQ"],["右下腹","RLQ"],["左下腹","LLQ"]];
  var qp=[[qx+qw/4,qy+qh/4],[qx+3*qw/4,qy+qh/4],[qx+qw/4,qy+3*qh/4],[qx+3*qw/4,qy+3*qh/4]];
  qs.forEach(function(q,i){
    s+=zh(qp[i][0],qp[i][1]-4,q[0],11.5); s+=en(qp[i][0],qp[i][1]+12,q[1]);
  });
  s+="<text x='100' y='206' text-anchor='middle' font-size='9' fill='"+SUB+"'>以脐为中心十字划分</text>";
  // nine regions
  s+=zh(290,22,"九分区 Nine regions",12);
  var rx=170, ry=36, rw=240, rh=150, cw=rw/3, ch=rh/3;
  s+="<rect x='"+rx+"' y='"+ry+"' width='"+rw+"' height='"+rh+"' rx='8' fill='#FFFFFF' stroke='"+LINE+"' stroke-width='2.5'/>";
  for(var i=1;i<3;i++){
    s+="<line x1='"+(rx+i*cw)+"' y1='"+ry+"' x2='"+(rx+i*cw)+"' y2='"+(ry+rh)+"' stroke='"+LINE+"' stroke-width='1.2'/>";
    s+="<line x1='"+rx+"' y1='"+(ry+i*ch)+"' x2='"+(rx+rw)+"' y2='"+(ry+i*ch)+"' stroke='"+LINE+"' stroke-width='1.2'/>";
  }
  var regs=[
    ["右季肋区","R hypochondriac"],["上腹区","epigastric"],["左季肋区","L hypochondriac"],
    ["右腰区","R lumbar"],["脐区","umbilical"],["左腰区","L lumbar"],
    ["右腹股沟区","R inguinal"],["耻区","hypogastric"],["左腹股沟区","L inguinal"]
  ];
  regs.forEach(function(r,i){
    var cxp=rx+(i%3)*cw+cw/2, cyp=ry+Math.floor(i/3)*ch+ch/2;
    s+=zh(cxp,cyp-4,r[0],10.5);
    s+="<text x='"+cxp+"' y='"+(cyp+11)+"' text-anchor='middle' font-size='8.5' fill='"+SUB+"'>"+r[1]+"</text>";
  });
  s+="<text x='290' y='206' text-anchor='middle' font-size='9' fill='"+SUB+"'>abdominal regions · 定位器官/异常部位</text>";
  s+="<text x='200' y='232' text-anchor='middle' font-size='10' fill='"+SUB+"'>注意：图中左右 = 被检者自身的左右（与观察者呈镜像）</text>";
  s+="<text x='200' y='250' text-anchor='middle' font-size='10' fill='"+SUB+"'>考点：RUQ 疼痛常与肝胆相关；RLQ 与阑尾相关（麦氏点）</text>";
  return s+"</svg>";
}

return {
planes: planes(),
directions: directions(),
cavities: cavities(),
thoracic: thoracic(),
feedback: feedback(),
abdomDiv: abdomDiv()
};
})();
