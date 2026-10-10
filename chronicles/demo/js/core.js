/* Chronicles of SOI · 大事件纪实 — core.js
   由 index.html 拆出。加载顺序在 index.html 里：core → focus → tunnel → add → boot。
   都是普通 <script>（非 module），共享同一个全局作用域，顺序不能乱。 */

// ============================================================
//  状态
// ============================================================
const EV = window.EVENTS.slice();
(window.PERSONAL||[]).forEach(e=>EV.push(e));   // 个人小型事件，和世界大事同一套结构
EV.sort((a,b)=>a.d<b.d?-1:1);
const T0 = Date.parse('2016-01-01T00:00:00Z');
const T1 = Date.parse('2026-03-01T00:00:00Z');
const DAY = 86400000;
const LEN = T1 - T0;

let t = T0;                       // 游标（ms）
let playing = false, speed = 1;
let current = null, pulse = 0, selectedEvent = null;   // selectedEvent: 隧道里选中的那个，地图上要高亮并跟随
let hover = null;

// 相机：lng/lat/k，与目标值做缓动
const cam  = { lng:10, lat:22, k:1.0 };
const camT = { lng:10, lat:22, k:1.0 };
const CAM_HOME = { lng:10, lat:22, k:1.0 };

const cv=document.getElementById('cv'), ctx=cv.getContext('2d');
const tcv=document.getElementById('tlcv'), tctx=tcv.getContext('2d');
let W=0,H=0,TW=0,TH=0,DPR=1;

// ============================================================
//  工具
// ============================================================
const catOf = e => window.CAT[e.c] || {name:'其他',color:'#8ba0b8',w:'其他'};
const isSpace = e => !e.ll;
// ★ 统一时刻解析：支持 2024 / 2024-03 / 2024-03-15 / 2024-03-15 07:10
//   个人记录需要到分钟，所以日期后面可以带时刻。
function parseD(v){
  if(v===null || v===undefined) return null;
  let x=String(v).trim().replace(/\s+/,'T');
  if(/^\d{4}$/.test(x)) x+='-01-01';
  else if(/^\d{4}-\d{1,2}$/.test(x)) x+='-01';
  if(x.indexOf('T')<0) x+='T00:00:00';
  else { const p=x.split('T'); if(/^\d{1,2}$/.test(p[1])) p[1]+=':00'; x=p[0]+'T'+p[1]; }
  const t=Date.parse(x+'Z');
  return isNaN(t)?null:t;
}
function fmtStamp(ms, withTime){
  const d=new Date(ms), p=n=>String(n).padStart(2,'0');
  let s=d.getUTCFullYear()+'-'+p(d.getUTCMonth()+1)+'-'+p(d.getUTCDate());
  if(withTime) s+=' '+p(d.getUTCHours())+':'+p(d.getUTCMinutes());
  return s;
}
// 按目标步长挑一个"好看"的网格间隔（1 / 2 / 5 × 10^n）
function niceStep(x){
  if(!(x>0)) return 1;
  const e=Math.pow(10, Math.floor(Math.log10(x))), n=x/e;
  return (n<1.5?1:n<3.5?2:n<7.5?5:10)*e;
}
const dateOf = e => parseD(e.d);
function fmtDate(ms){ const d=new Date(ms);
  return d.getUTCFullYear()+'.'+String(d.getUTCMonth()+1).padStart(2,'0')+'.'+String(d.getUTCDate()).padStart(2,'0'); }
function fmtCN(e){ const p=String(e.d).split(/[ T]/); const q=p[0].split("-"); return q[0]+" 年 "+(+q[1])+" 月 "+(+q[2])+" 日"+(p[1]?" "+p[1]:""); }

// 已发生的事件（t 之前）
// ============================================================
//  图层：世界大事 / 我 / 全部
//   个人记录和世界大事混在一条时间轴上会被淹没，所以给一个开关。
// ============================================================
let LAYER='all';
function evVisible(e){ return LAYER==='all' || (LAYER==='world' ? e.c!=='我' : e.c==='我'); }
function visibleEvents(){ return EV.filter(evVisible); }
function setLayer(v){
  LAYER=v;
  document.querySelectorAll('#layers button').forEach(b=>b.classList.toggle('on', b.dataset.l===v));
  const na=document.getElementById('nAll'); if(na) na.textContent=visibleEvents().length;
  if(typeof current!=='undefined' && current && !evVisible(current)) current=null;
  if(typeof selectedEvent!=='undefined' && selectedEvent && !evVisible(selectedEvent) && typeof closeTunnel==='function') closeTunnel();
  if(typeof renderPick==='function') renderPick();
  if(typeof drawTL==='function') drawTL();
}

function doneList(){ return EV.filter(e=>dateOf(e)<=t && evVisible(e)); }
function nextIdx(){ return EV.findIndex(e=>dateOf(e)>t); }

// ============================================================
//  投影
// ============================================================
function PPD(){ return W/400; }                      // k=1 时每度多少像素
const px = lng => W/2 + (lng-cam.lng)*PPD()*cam.k;
const py = lat => H/2 - (lat-cam.lat)*PPD()*cam.k;

// ============================================================
//  渲染
// ============================================================
function resize(){
  DPR=Math.min(devicePixelRatio||1,2);
  W=cv.clientWidth; H=cv.clientHeight; cv.width=W*DPR; cv.height=H*DPR;
  TW=tcv.clientWidth; TH=tcv.clientHeight; tcv.width=TW*DPR; tcv.height=TH*DPR;
}

function draw(dt){
  // 相机缓动
  const e = 1-Math.pow(0.001, dt/1000*3);
  cam.lng += (camT.lng-cam.lng)*e;
  cam.lat += (camT.lat-cam.lat)*e;
  cam.k   += (camT.k  -cam.k  )*e;

  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle='#060e1a'; ctx.fillRect(0,0,cv.width,cv.height);
  ctx.setTransform(DPR,0,0,DPR,0,0);

  drawGraticule();
  drawLand();
  drawEvents(dt);
  drawCrosshair();

  document.getElementById('yearmark').textContent = String(new Date(t).getUTCFullYear());
}

function drawGraticule(){
  ctx.strokeStyle='rgba(120,140,175,.055)'; ctx.lineWidth=1;
  const stepK = cam.k>2 ? 10 : cam.k>1.3 ? 20 : 30;
  const l0=Math.floor(cam.lng-260/stepK)*stepK, l1=cam.lng+260/stepK;
  for(let l=l0;l<=l1;l+=stepK){ const x=px(l);
    if(x<-50||x>W+50) continue;
    ctx.beginPath(); ctx.moveTo(Math.round(x)+.5,0); ctx.lineTo(Math.round(x)+.5,H); ctx.stroke(); }
  for(let a=-70;a<=85;a+=stepK*0.7){ const y=py(a);
    if(y<-50||y>H+50) continue;
    ctx.beginPath(); ctx.moveTo(0,Math.round(y)+.5); ctx.lineTo(W,Math.round(y)+.5); ctx.stroke(); }
}

function drawLand(){
  if(!window.WORLD) return;
  // 填充陆块
  ctx.beginPath();
  for(const ring of window.WORLD){
    for(let i=0;i<ring.length;i++){
      const x=px(ring[i][0]), y=py(ring[i][1]);
      i? ctx.lineTo(x,y) : ctx.moveTo(x,y);
    }
    ctx.closePath();
  }
  ctx.fillStyle='#10202f'; ctx.fill();
  ctx.strokeStyle='rgba(110,140,180,.30)'; ctx.lineWidth=0.8; ctx.stroke();
}

function drawEvents(dt){
  const done = doneList();
  const curMs = t;
  pulse += dt/1000;

  // 已发生：小点
  for(const e of done){
    if(isSpace(e)) continue;
    const x=px(e.ll[0]), y=py(e.ll[1]);
    if(x<-40||x>W+40||y<-40||y>H+40) continue;
    const age = (curMs - dateOf(e)) / DAY;              // 多少天前
    const fresh = Math.max(0, 1 - age/160);             // 160 天内算"新"
    const r = 3 + fresh*3;
    const c = catOf(e).color;
    if(fresh>0.02){
      ctx.beginPath(); ctx.arc(x,y,r*3.2,0,Math.PI*2);
      ctx.fillStyle=c; ctx.globalAlpha=fresh*0.16; ctx.fill(); ctx.globalAlpha=1;
    }
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fillStyle = c;
    ctx.globalAlpha = 0.35 + fresh*0.65; ctx.fill(); ctx.globalAlpha=1;
    ctx.strokeStyle='rgba(0,0,0,.55)'; ctx.lineWidth=1; ctx.stroke();

    if(e===selectedEvent){
      const pp=(pulse%1.6)/1.6;
      ctx.beginPath(); ctx.arc(x,y,11+pp*32,0,Math.PI*2);
      ctx.strokeStyle='rgba(255,214,107,'+((1-pp)*0.85).toFixed(3)+')'; ctx.lineWidth=2.2; ctx.stroke();
      ctx.shadowColor='rgba(255,214,107,.95)'; ctx.shadowBlur=26;
      ctx.beginPath(); ctx.arc(x,y,7.5,0,Math.PI*2); ctx.fillStyle='#f2d79c'; ctx.fill(); ctx.shadowBlur=0;
      ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();
      ctx.font='600 15.5px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.textBaseline='middle'; ctx.fillStyle='rgba(255,234,180,.98)';
      ctx.fillText(e.t, x+13, y-1);
    }
    if(e.story){
      const pl=0.55+0.45*Math.sin(pulse*2.2);
      ctx.beginPath(); ctx.arc(x,y,r+4.5,0,Math.PI*2);
      ctx.strokeStyle='rgba(255,214,107,'+(0.85*pl).toFixed(2)+')'; ctx.lineWidth=1.7; ctx.stroke();
      ctx.beginPath(); ctx.arc(x,y,r+9+pl*3,0,Math.PI*2);
      ctx.strokeStyle='rgba(255,214,107,'+(0.30*pl).toFixed(2)+')'; ctx.lineWidth=1; ctx.stroke();
    }
    if(hover && hover.id===e.id){
      ctx.beginPath(); ctx.arc(x,y,r+7,0,Math.PI*2);
      ctx.strokeStyle='rgba(255,255,255,.75)'; ctx.lineWidth=1.4; ctx.stroke();
    }
  }

  // 当前事件：脉冲
  if(current && !isSpace(current) && Math.abs(dateOf(current)-curMs) < 400*DAY){
    const x=px(current.ll[0]), y=py(current.ll[1]);
    const c=catOf(current).color;
    const p = (pulse % 1.8)/1.8;
    ctx.beginPath(); ctx.arc(x,y,10+p*36,0,Math.PI*2);
    ctx.strokeStyle=c; ctx.globalAlpha=(1-p)*0.55; ctx.lineWidth=2; ctx.stroke(); ctx.globalAlpha=1;
    ctx.beginPath(); ctx.arc(x,y,7,0,Math.PI*2);
    ctx.fillStyle=c; ctx.fill();
    ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();
  }
}

// 天外事件的指向线：从右下角一个小标记连到"天上"
function drawCrosshair(){
  const sp = doneList().filter(isSpace);
  const bar = document.getElementById('spacebar');
  if(sp.length){
    bar.style.display='block';
    bar.innerHTML = '天外　<b>'+sp.map(e=>e.t).slice(-2).join(' · ')+'</b>　<span style="opacity:.6">'+sp.length+' 项</span>';
  } else bar.style.display='none';
}

// ============================================================
//  时间轴
// ============================================================
const tx = ms => (ms - T0)/LEN * TW;
function msAtX(x){ return T0 + Math.max(0,Math.min(1,x/TW))*LEN; }

function drawTL(){
  tctx.setTransform(1,0,0,1,0,0);
  tctx.fillStyle='#08131f'; tctx.fillRect(0,0,tcv.width,tcv.height);
  tctx.setTransform(DPR,0,0,DPR,0,0);

  // 已播放区域
  const xc = tx(t);
  const g = tctx.createLinearGradient(0,0,xc,0);
  g.addColorStop(0,'rgba(201,162,39,.10)'); g.addColorStop(1,'rgba(201,162,39,.02)');
  tctx.fillStyle=g; tctx.fillRect(0,0,xc,TH);

  // 年份刻度
  for(let y=2016;y<=2026;y++){
    const ms=Date.parse(y+'-01-01T00:00:00Z'), x=tx(ms);
    if(x<0||x>TW) continue;
    tctx.strokeStyle='rgba(140,155,180,.22)'; tctx.lineWidth=1;
    tctx.beginPath(); tctx.moveTo(Math.round(x)+.5,0); tctx.lineTo(Math.round(x)+.5,TH); tctx.stroke();
    tctx.font='600 15px "PingFang SC","Microsoft YaHei",sans-serif';
    tctx.fillStyle='rgba(150,163,185,.75)'; tctx.textBaseline='top';
    tctx.fillText(String(y), x+5, 8);
  }
  // 月份细刻度
  for(let y=2016;y<=2026;y++) for(let m=1;m<12;m++){
    const ms=Date.parse(`${y}-${String(m+1).padStart(2,'0')}-01T00:00:00Z`), x=tx(ms);
    if(x<0||x>TW) continue;
    tctx.strokeStyle='rgba(120,135,160,.10)';
    tctx.beginPath(); tctx.moveTo(Math.round(x)+.5,TH-16); tctx.lineTo(Math.round(x)+.5,TH-8); tctx.stroke();
  }

  // 事件刻度
  const rowY = TH-46;
  for(const e of visibleEvents()){
    const x = tx(dateOf(e)), on = dateOf(e)<=t, c = catOf(e).color;
    if(on){
      tctx.strokeStyle=c; tctx.lineWidth=1.4; tctx.globalAlpha=.85;
      tctx.beginPath(); tctx.moveTo(x,rowY-9); tctx.lineTo(x,rowY+9); tctx.stroke();
      tctx.globalAlpha=1;
      tctx.beginPath(); tctx.arc(x,rowY,2.6,0,Math.PI*2); tctx.fillStyle=c; tctx.fill();
    } else {
      tctx.strokeStyle='rgba(120,135,160,.22)'; tctx.lineWidth=1;
      tctx.beginPath(); tctx.moveTo(x,rowY-5); tctx.lineTo(x,rowY+5); tctx.stroke();
    }
  }

  // 游标
  tctx.strokeStyle='#d8b878'; tctx.lineWidth=2;
  tctx.beginPath(); tctx.moveTo(Math.round(xc)+.5,0); tctx.lineTo(Math.round(xc)+.5,TH); tctx.stroke();
  tctx.fillStyle='#d8b878';
  tctx.beginPath(); tctx.moveTo(xc-7,0); tctx.lineTo(xc+7,0); tctx.lineTo(xc,11); tctx.closePath(); tctx.fill();
  // 游标年份牌
  const label = fmtDate(t).slice(0,7);
  tctx.font='600 14.5px "PingFang SC","Microsoft YaHei",sans-serif';
  const lw = tctx.measureText(label).width + 14;
  let bx = xc + 8; if(bx+lw>TW) bx = xc - 8 - lw;
  tctx.fillStyle='rgba(201,162,39,.92)';
  tctx.beginPath(); rr(tctx,bx,TH-26,lw,19,5); tctx.fill();
  tctx.fillStyle='#171a1f'; tctx.textBaseline='middle';
  tctx.fillText(label, bx+7, TH-16);
}
function rr(c,x,y,w,h,r){ c.beginPath();
  if(c.roundRect){c.roundRect(x,y,w,h,r);return;}
  c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);
  c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath(); }

// ============================================================
//  卡片 / 详情
// ============================================================
function showNow(e){
  document.getElementById('now').classList.remove('off');   // 有内容时自动出现
  const c=catOf(e);
  document.getElementById('nowTag').innerHTML = `<i style="background:${c.color}"></i><span style="color:${c.color}">${c.name}</span>`;
  document.getElementById('nowDate').textContent = fmtCN(e);
  document.getElementById('nowTitle').textContent = e.t;
  document.getElementById('nowLoc').textContent = '◉ ' + e.p;
  document.getElementById('nowDesc').innerHTML = e.x;
  const _nm=document.getElementById('nowMedia');
  if(e.media){ _nm.style.display='block'; _nm.innerHTML=mediaHTML(e.media); }
  else { _nm.style.display='none'; _nm.innerHTML=''; }
  const nb=document.getElementById('nowStory');
  if(e.story){ nb.style.display='block';
    nb.innerHTML='▸ 展开叙事：'+e.story.title+'<br><i>'+e.story.nodes.length+' 个节点　·　或按 F 键</i>';
    nb.onclick=()=>openFocus(e.story); }
  else { nb.style.display='none'; nb.onclick=null; }
}
function hideNow(){ document.getElementById('now').classList.add('off'); }
function clearNow(){
  document.getElementById('nowTag').innerHTML='<i style="background:#5a6478"></i><span style="color:#8ba0b8">待播放</span>';
  document.getElementById('nowDate').textContent='—';
  document.getElementById('nowTitle').textContent='按播放开始';
  document.getElementById('nowLoc').textContent='';
  document.getElementById('nowDesc').innerHTML='十年间 100 件世界大事，按时间依次点亮。<br>点地图上的任意一点或时间轴上的任意刻度，可以查看细节。';
  const _nb=document.getElementById('nowStory'); if(_nb) _nb.style.display='none';
  const _nm2=document.getElementById('nowMedia'); if(_nm2){ _nm2.style.display='none'; _nm2.innerHTML=''; }
}
function openDetail(e){
  const c=catOf(e);
  document.getElementById('dcat').innerHTML=`<i style="background:${c.color}"></i><span style="color:${c.color}">${c.name}</span>`;
  document.getElementById('dtitle').textContent = e.t;
  document.getElementById('dline').textContent = fmtCN(e) + '　·　' + e.p;
  document.getElementById('dbody').textContent = e.x;
  const idx = EV.indexOf(e)+1;
  document.getElementById('dkv').innerHTML =
    `编号　<b>#${idx} / ${EV.length}</b><br>` +
    `坐标　<b>${isSpace(e)?'天外（不在地图上）':e.ll[0].toFixed(2)+'°, '+e.ll[1].toFixed(2)+'°'}</b><br>` +
    `距今　<b>${Math.round((Date.parse('2026-10-01')-dateOf(e))/DAY/365*10)/10} 年</b>`;
  const sb=document.getElementById('dsbtn');
  if(e.story){ sb.style.display='block';
    sb.textContent='▸ 展开叙事　'+e.story.title+'　（'+e.story.nodes.length+' 个节点）';
    sb.onclick=()=>openFocus(e.story); }
  else sb.style.display='none';
  document.getElementById('detail').classList.add('open');
}
function closeDetail(){ document.getElementById('detail').classList.remove('open'); }

// ============================================================
//  播放
// ============================================================
let last = performance.now();
function loop(now){
  const dt = Math.min(64, now-last); last = now;
  if(playing){
    const prev = t;
    t += dt * speed * 1.35 * DAY / 1000;       // 1× 约 45 秒走完十年
    if(t>=T1){ t=T1; setPlaying(false); }
    // 跨过的事件
  for(const e of visibleEvents()){ const d=dateOf(e); if(d>prev && d<=t){ fire(e); } }
  }
  // 隧道现在只是右侧面板，主地图必须继续重绘 —— 之前写成 else if(TN.open) tnTick(dt)
  // 把 draw() 整个跳过了，所以地图上的高亮和相机跟随都看不到。
  if(FX.open) fxTick(dt);
  else { draw(dt); if(TN.open) tnTick(dt); drawTL(); updateHud(); }
  requestAnimationFrame(loop);
}
function fire(e){
  current = e; pulse = 0;
  showNow(e);
  if(!isSpace(e)) { camT.lng=e.ll[0]; camT.lat=e.ll[1]; camT.k=Math.max(1.45, camT.k); }
}
function updateHud(){
  document.getElementById('nDone').textContent = doneList().length;
  document.getElementById('curDate').textContent = fmtDate(t).slice(0,7).replace('.','.');
}
function setPlaying(v){
  playing=v;
  const b=document.getElementById('play');
  b.classList.toggle('on', v); b.textContent = v?'❚❚':'▶';
}

// ============================================================
//  交互
// ============================================================
function hitTest(mx,my){
  let best=null, bd=1e9;
  for(const e of doneList()){
    if(isSpace(e)) continue;
    const x=px(e.ll[0]), y=py(e.ll[1]);
    const d=Math.hypot(mx-x,my-y);
    if(d<16 && d<bd){ best=e; bd=d; }
  }
  return best;
}
let dragging=false, lx=0, ly=0, moved=false;
cv.addEventListener('pointerdown',e=>{ dragging=true; moved=false; lx=e.clientX; ly=e.clientY;
  cv.classList.add('dragging'); cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove',e=>{
  const r=cv.getBoundingClientRect(), mx=e.clientX-r.left, my=e.clientY-r.top;
  if(dragging){
    const dx=e.clientX-lx, dy=e.clientY-ly;
    if(Math.abs(dx)+Math.abs(dy)>2) moved=true;
    lx=e.clientX; ly=e.clientY;
    camT.lng -= dx/(PPD()*cam.k); camT.lat += dy/(PPD()*cam.k);
    cam.lng=camT.lng; cam.lat=camT.lat;      // 拖动时不做缓动
  }
  hover = hitTest(mx,my);
});
cv.addEventListener('pointerup',e=>{
  dragging=false; cv.classList.remove('dragging');
  if(moved) return;
  const r=cv.getBoundingClientRect();
  const h=hitTest(e.clientX-r.left, e.clientY-r.top);
  if(h) openTunnel(h); else { closeTunnel(); closeDetail(); closeCompare(); hideNow(); }   // 点空白：全部收起
});
cv.addEventListener('wheel',e=>{
  e.preventDefault();
  camT.k = Math.max(0.6, Math.min(6, camT.k * (e.deltaY>0?0.9:1.11)));
  document.getElementById('detail').classList.remove('open');
},{passive:false});

// 时间轴
let tlDrag=false;
function tlSeek(e){
  const r=tcv.getBoundingClientRect();
  const nt = msAtX(e.clientX-r.left);
  if(nt < t){ /* 回退：清掉"已发生"的视觉？保留，简单起见 */ }
  t = nt;
  // 同步当前事件为最近的一条已发生
  const done=doneList();
  if(done.length){ const last0=done[done.length-1]; current=last0; showNow(last0); }
  else { current=null; clearNow(); }
  drawTL(); updateHud();
}
tcv.addEventListener('pointerdown',e=>{ tlDrag=true; setPlaying(false); tcv.setPointerCapture(e.pointerId); tlSeek(e); });
tcv.addEventListener('pointermove',e=>{
  const r=tcv.getBoundingClientRect();
  const x=e.clientX-r.left;
  const ms=msAtX(x);
  const tip=document.getElementById('tip');
  const near = EV.reduce((a,b)=>Math.abs(dateOf(b)-ms)<Math.abs(dateOf(a)-ms)?b:a, EV[0]);
  const dD=Math.abs(dateOf(near)-ms)/DAY;
  if(dD<60){ tip.textContent = near.d + '　' + near.t; tip.style.opacity=1;
    let bx=x-tip.offsetWidth/2; bx=Math.max(4,Math.min(TW-tip.offsetWidth-4,bx));
    tip.style.left=bx+'px'; }
  else tip.style.opacity=0;
  if(tlDrag) tlSeek(e);
});
tcv.addEventListener('pointerup',()=>{ tlDrag=false; });
tcv.addEventListener('pointerleave',()=>{ document.getElementById('tip').style.opacity=0; });

document.getElementById('play').onclick=()=>{
  if(t>=T1){ t=T0; current=null; clearNow(); camT.lng=CAM_HOME.lng; camT.lat=CAM_HOME.lat; camT.k=CAM_HOME.k; }
  setPlaying(!playing);
};
document.querySelectorAll('#speeds button').forEach(b=>b.onclick=()=>{
  speed=+b.dataset.s;
  document.querySelectorAll('#speeds button').forEach(x=>x.classList.toggle('on',x===b));
});
document.getElementById('reset').onclick=()=>{
  setPlaying(false); t=T0; current=null; clearNow(); closeDetail();
  camT.lng=CAM_HOME.lng; camT.lat=CAM_HOME.lat; camT.k=CAM_HOME.k;
};
document.getElementById('all').onclick=()=>{
  setPlaying(false); t=T1-1; const d=doneList(); current=d[d.length-1]; showNow(current);
  camT.lng=CAM_HOME.lng; camT.lat=CAM_HOME.lat; camT.k=CAM_HOME.k;
};
document.getElementById('dclose').onclick=closeDetail;
addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(document.getElementById('compare').classList.contains('on')){ closeCompare(); return; }
    if(document.getElementById('addf').classList.contains('on')){ closeAdd(); return; }
    if(document.getElementById('pick').classList.contains('on')){ closePick(); return; }
    if(TN.open){ closeTunnel(); return; }
  }
  if(FX.open){
    if(e.key==='Escape'){ closeFocus(); e.preventDefault(); return; }
    if(e.code==='Space'){ e.preventDefault(); setFxPlaying(!FX.playing); return; }
    if(e.key==='ArrowRight'){ goNode(FX.idx+1); e.preventDefault(); return; }
    if(e.key==='ArrowLeft'){ goNode(FX.idx-1); e.preventDefault(); return; }
    return;
  }
  if((e.key==='f'||e.key==='F') && current && current.story){ openFocus(current.story); return; }
  if(e.code==='Space'){ e.preventDefault(); document.getElementById('play').click(); }
  if(e.key==='Escape') closeDetail();
  if(e.key==='ArrowRight'){ setPlaying(false); const i=nextIdx(); if(i>=0){ t=dateOf(EV[i]); fire(EV[i]);
    if(!isSpace(EV[i])){cam.lng=camT.lng;cam.lat=camT.lat;cam.k=camT.k;} } }
  if(e.key==='ArrowLeft'){ setPlaying(false); const d=doneList(); if(d.length>1){ const e0=d[d.length-2];
    t=dateOf(d[d.length-1]); fire(e0); } }
});
addEventListener('resize',()=>{ resize(); drawTL(); });
new ResizeObserver(()=>{ resize(); drawTL(); }).observe(cv);

// 图例
(function(){
  const el=document.getElementById('legend');
  el.innerHTML = Object.values(window.CAT).map(c=>
    `<div class="row"><i style="background:${c.color}"></i>${c.name}</div>`).join('');
})();

// ============================================================
resize();
document.getElementById('nAll').textContent = visibleEvents().length;
// —— 临时诊断（?diag=1 把关键元素的实际尺寸写进 <title>）——
setTimeout(()=>{
  if(!new URLSearchParams(location.search).has('diag')) return;
  const R=e=>{ if(!e) return 'NULL'; const b=e.getBoundingClientRect();
    return (e.tagName.toLowerCase()+(e.id?'#'+e.id:''))+' t'+Math.round(b.top)+' h'+Math.round(b.height)+' w'+Math.round(b.width); };
  const app=document.getElementById('app');
  document.title='DIAG:: '+[
    R(app), R(document.querySelector('header')), R(document.querySelector('main')),
    R(document.querySelector('footer')), R(document.getElementById('tlcv')), R(document.getElementById('cv'))
  ].join(' | ')+' || appScroll '+app.scrollHeight+' bodyScroll '+document.body.scrollHeight
   +' innerH '+window.innerHeight+' || appStyle '+getComputedStyle(app).height+' footStyle '
   +getComputedStyle(document.querySelector('footer')).height;
}, 900);
document.getElementById('nDone').textContent = 0;
// ============================================================
