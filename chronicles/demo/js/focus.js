/* Chronicles of SOI · 大事件纪实 — focus.js
   由 index.html 拆出。加载顺序在 index.html 里：core → focus → tunnel → add → boot。
   都是普通 <script>（非 module），共享同一个全局作用域，顺序不能乱。 */

//  ★ 焦点叙事模式：地图为底，卡牌为轨
//     每个 node 可带 ll（经纬度）—— 于是"战役换地点"就是轨迹上的点
// ============================================================
const FX={open:false,story:null,idx:0,playing:false,acc:0,tt:0,entT:0,dpr:1,stars:[],proj:null,prevWheel:0,
  cam:{k:1,dx:0,dy:0}};   // cam: 叙事模式下地图自己的平移缩放
const fxEl=document.getElementById('focus'), fxc=document.getElementById('fxc'), fxctx=fxc.getContext('2d');
const fxrail=document.getElementById('fxcards');
const CARD_W=250, CARD_STEP=282;

const clamp01=x=>Math.max(0,Math.min(1,x));
function easeOutCubic(x){ return 1-Math.pow(1-x,3); }

function openFocus(story){
  if(!story || !story.nodes || !story.nodes.length) return;
  FX.story=story; FX.idx=0; FX.acc=0; FX.tt=0; FX.entT=0; FX.open=true;
  FX.cam={k:1,dx:0,dy:0}; FX.pos={};        // FX.pos: 每张卡用户拖动后的偏移
  fxEl.classList.add('on');
  document.getElementById('fxtitle').textContent=story.title;
  document.getElementById('fxsub').textContent=story.sub||'';
  document.getElementById('fxn').textContent=String(story.nodes.length).padStart(2,'0');
  const dots=document.getElementById('fxdots');
  dots.innerHTML=story.nodes.map((_,i)=>'<i data-i="'+i+'"></i>').join('');
  dots.querySelectorAll('i').forEach(d=>d.onclick=()=>goNode(+d.dataset.i));
  FX.stars=Array.from({length:300},()=>({x:Math.random(),y:Math.random(),
    z:0.2+Math.random()*0.8, s:0.4+Math.random()*1.6, tw:Math.random()*6.28}));
  FX.proj=fxBuildProj();
  fxResize(); renderFloats(); setFxPlaying(true);
  closeDetail(); closeTunnel(); closeCompare();   // 进叙事就把之前的详情/隧道/对比卡关掉
  setTimeout(()=>{ FX.entT=99; paintCards(); }, 2400);
}
// 卡片可拖动（拖顶栏那条或标题栏都行）
(function(){
  let drag=null, sx=0, sy=0, ox=0, oy=0;
  fxrail.addEventListener('pointerdown',e=>{
    if(!e.target.closest('.dragbar') && !e.target.closest('.hd')) return;
    const el=e.target.closest('.fxf'); if(!el) return;
    const i=+el.dataset.i;
    if(!FX.pos[i]) FX.pos[i]={dx:0,dy:0};
    drag={el,i}; ox=FX.pos[i].dx; oy=FX.pos[i].dy; sx=e.clientX; sy=e.clientY;
    el.classList.add('dragging'); el.setPointerCapture(e.pointerId); e.preventDefault();
  });
  fxrail.addEventListener('pointermove',e=>{
    if(!drag) return;
    FX.pos[drag.i]={dx: ox+e.clientX-sx, dy: oy+e.clientY-sy};
    layoutFloats();
  });
  const up=()=>{ if(drag){ drag.el.classList.remove('dragging'); drag=null; } };
  fxrail.addEventListener('pointerup',up);
  fxrail.addEventListener('pointercancel',up);
})();
function closeFocus(){ FX.open=false; FX.playing=false; fxEl.classList.remove('on'); }
function setFxPlaying(v){ FX.playing=v; FX.acc=0;
  document.getElementById('fxplay').textContent = v?'❚❚':'▶'; }
function goNode(i){
  if(!FX.story) return;
  const n=FX.story.nodes.length;
  FX.idx=Math.max(0,Math.min(n-1,i)); FX.acc=0; FX.proj=fxBuildProj();
  renderFloats();
  if(FX.idx>=n-1 && FX.playing) setFxPlaying(false);
}
function layout(){
  if(!FX.story) return;
  if(!FX.proj) FX.proj=fxBuildProj();
  layoutFloats(); paintCards();
  const cur=FX.story.nodes[FX.idx];
  document.getElementById('fxidx').textContent=String(FX.idx+1).padStart(2,'0');
  const _n0=FX.story.nodes[0], _n1=FX.story.nodes[FX.story.nodes.length-1];
  const _t0=nodeMs(_n0), _t1=nodeMs(_n1);
  const _sp=(_t0!=null&&_t1!=null)?(_t1-_t0):null;
  const _spanTxt = (_sp!=null && _sp<=3*86400000)
      ? fmtStamp(_t0,true)+' → '+fmtStamp(_t1,true)
      : String(_n0.d||'').slice(0,4)+' → '+String(_n1.d||'').slice(0,4);
  document.getElementById('fxmeta').innerHTML=
    'SPAN &nbsp;'+_spanTxt+
    '<br>NODES &nbsp;'+FX.story.nodes.length+
    '<br>FOCUS &nbsp;'+(cur.d||'')+(cur.ll?'　'+cur.ll[0].toFixed(1)+'° / '+cur.ll[1].toFixed(1)+'°':'');
  document.getElementById('fxdots').querySelectorAll('i').forEach((d,i)=>{
    d.classList.toggle('on',i===FX.idx); d.classList.toggle('done',i<FX.idx); });
}
// 卡牌入场：一张一张"刷"出来（左滑入 + 一次闪光）
// 入场：逐张浮起 + 一道斜光
function paintCards(){
  const cards=fxrail.querySelectorAll('.fxf');
  cards.forEach((c,k)=>{
    const raw=(FX.entT - k*0.07)/0.45;
    const e=easeOutCubic(clamp01(raw));
    const isC=c.classList.contains('cur');
    c.style.transition = (e>=1 && !FX.noSmooth) ? '' : 'none';   // noanim 模式彻底不要过渡
    c.style.transform='translateY('+(30*(1-e)).toFixed(1)+'px) scale('+(0.95+0.05*e).toFixed(3)+')';
    c.style.opacity=(e*(isC?1:0.42)).toFixed(3);
    const fl=c.querySelector('.fl');
    if(fl) fl.style.opacity = (raw>0&&raw<1) ? (Math.sin(Math.PI*raw)*0.9).toFixed(3) : '0';
  });
}
// ★ 只保留 3 张浮动卡：前一个 / 当前 / 后一个。
//   之前把整条叙事全铺在右侧一列，一屏几十个东西，完全看不出重点。
function renderFloats(){
  if(!FX.story) return;
  FX.entT=0;
  const n=FX.story.nodes.length;
  const show=[];
  if(FX.idx-1>=0) show.push({i:FX.idx-1,role:'side'});
  show.push({i:FX.idx,role:'cur'});
  if(FX.idx+1<n) show.push({i:FX.idx+1,role:'side'});
  fxrail.innerHTML = show.map(({i,role},k)=>{
    const nd=FX.story.nodes[i];
    const label = role==='cur' ? 'FOCUS' : (i<FX.idx ? '◀ 前一个' : '后一个 ▶');
    return '<div class="fxf '+role+'" data-i="'+i+'" data-k="'+k+'">'+
      '<div class="dragbar"></div>'+
      '<div class="pnl"><div class="pnl-in">'+
        '<div class="hd"><span class="k">'+label+'</span>'+
          '<span class="i">'+String(i+1).padStart(2,'0')+' / '+String(n).padStart(2,'0')+'</span></div>'+
        (nd.media&&nd.media.type==='image'?'<img class="fmedia" src="'+nd.media.src+'" alt="">':'')+
        '<div class="dt">'+(nd.d||'')+'</div>'+
        '<h3>'+nd.t+'</h3>'+
        '<div class="tx">'+(nd.x||'')+'</div>'+
        (nd.tag?'<span class="tg">'+nd.tag+'</span>':'')+
        (role==='cur'?sameBoxHTML(nodeMs(nd),120,3,nd.t):'')+
      '</div><span class="fl"></span></div></div>';
  }).join('');
  fxrail.querySelectorAll('.fxf').forEach(el=>{
    el.querySelector('.hd').onclick=ev=>{ ev.stopPropagation(); goNode(+el.dataset.i); };
    el.onclick=ev=>{ if(ev.target.closest('.samerow')) return;
      if(!el.classList.contains('cur')) goNode(+el.dataset.i); };
  });
  wireSame(fxrail);
  layout();
}
function layoutFloats(){
  if(!FX.story) return;
  const P=FX.proj, W=window.innerWidth, H=window.innerHeight;
  fxrail.querySelectorAll('.fxf').forEach(el=>{
    const i=+el.dataset.i, isC=el.classList.contains('cur');
    const nd=FX.story.nodes[i];
    let bx, by;
    const roleOff = isC ? 0 : (i<FX.idx ? -108 : 108);   // 前/后错开竖位，否则同地点的节点会完全重叠
    if(nd.ll && P){ bx=fxPx(nd.ll[0])+24; by=fxPy(nd.ll[1])-(isC?164:76)+roleOff; }
    else { bx=W*0.58; by=H*0.24 + (i%3)*90; }
    const off=FX.pos[i]||{dx:0,dy:0};
    const w=isC?326:236;
    el.style.left = Math.round(Math.max(12, Math.min(W-w-12, bx+off.dx)))+'px';
    el.style.top  = Math.round(Math.max(78, Math.min(H-150,    by+off.dy)))+'px';
  });
}
function fxResize(){
  const W=window.innerWidth,H=window.innerHeight;
  FX.dpr=Math.min(devicePixelRatio||1,2);
  fxc.width=W*FX.dpr; fxc.height=H*FX.dpr;
  fxc.style.width=W+'px'; fxc.style.height=H+'px';
}
// 把有经纬度的节点拟合进上半屏
function fxBuildProj(){
  const pts=FX.story.nodes.filter(n=>n.ll);
  const W=window.innerWidth,H=window.innerHeight;
  if(!pts.length) return null;
  let a=1e9,b=1e9,c=-1e9,d=-1e9;
  for(const n of pts){ a=Math.min(a,n.ll[0]); c=Math.max(c,n.ll[0]);
                       b=Math.min(b,n.ll[1]); d=Math.max(d,n.ll[1]); }
  // 最小跨度从 12° 降到 0.0008°（约 90 米）—— 一个人的一天只有几百米
  const spanX=Math.max(c-a,0.0008), spanY=Math.max(d-b,0.0008);
  const k=Math.min(W*0.62/spanX, H*0.40/spanY);   // 不再设上限
  return { cx:(a+c)/2, cy:(b+d)/2, k, ox:W/2, oy:H*0.30 };
}
function fxPx(l){ const P=FX.proj; return P.ox+(l-P.cx)*P.k*FX.cam.k+FX.cam.dx; }
function fxPy(a){ const P=FX.proj; return P.oy-(a-P.cy)*P.k*FX.cam.k+FX.cam.dy; }

function fxTick(dt){
  if(FX.playing){ FX.acc+=dt;
    if(FX.acc>2700){ if(FX.idx<FX.story.nodes.length-1) goNode(FX.idx+1); else setFxPlaying(false); } }
  FX.tt+=dt/1000; FX.entT+=dt/1000; paintCards();

  const W=window.innerWidth,H=window.innerHeight;
  fxctx.setTransform(1,0,0,1,0,0);
  fxctx.clearRect(0,0,fxc.width,fxc.height);
  fxctx.setTransform(FX.dpr,0,0,FX.dpr,0,0);

  const bg=fxctx.createRadialGradient(W/2,H*0.34,0,W/2,H*0.34,Math.max(W,H)*0.8);
  bg.addColorStop(0,'#0a1c30'); bg.addColorStop(0.5,'#061020'); bg.addColorStop(1,'#030812');
  fxctx.fillStyle=bg; fxctx.fillRect(0,0,W,H);

  const P=FX.proj;
  if(P){
    fxctx.strokeStyle='rgba(94,200,240,.05)'; fxctx.lineWidth=1;
    const gx=niceStep(110/Math.max(1e-9, P.k*Math.max(0.0001,FX.cam.k)));   // 城市尺度也要有网格
    for(let l=Math.floor(P.cx-300/P.k);l<=P.cx+300/P.k;l+=gx){ const x=fxPx(l);
      fxctx.beginPath(); fxctx.moveTo(x,0); fxctx.lineTo(x,H); fxctx.stroke(); }
    for(let a2=Math.floor(P.cy-220/P.k);a2<=P.cy+220/P.k;a2+=gx){ const y=fxPy(a2);
      fxctx.beginPath(); fxctx.moveTo(0,y); fxctx.lineTo(W,y); fxctx.stroke(); }
    if(window.WORLD && P.k*FX.cam.k < 260){   // 放大到省/市级，世界海岸线已经是无意义的直线，干脆不画
      fxctx.beginPath();
      for(const ring of window.WORLD){ for(let i=0;i<ring.length;i++){
        const x=fxPx(ring[i][0]), y=fxPy(ring[i][1]);
        i? fxctx.lineTo(x,y) : fxctx.moveTo(x,y); } fxctx.closePath(); }
      fxctx.fillStyle='rgba(16,28,40,.9)'; fxctx.fill();
      fxctx.strokeStyle='rgba(94,200,240,.15)'; fxctx.lineWidth=0.7; fxctx.stroke();
    }
    const geo=FX.story.nodes.map((n,i)=>({n,i})).filter(o=>o.n.ll);
    if(geo.length>1){
      fxctx.strokeStyle='rgba(94,200,240,.35)'; fxctx.lineWidth=1.3; fxctx.setLineDash([6,5]);
      fxctx.beginPath();
      geo.forEach((o,j)=>{ const x=fxPx(o.n.ll[0]),y=fxPy(o.n.ll[1]); j?fxctx.lineTo(x,y):fxctx.moveTo(x,y); });
      fxctx.stroke(); fxctx.setLineDash([]);
      const up=geo.filter(o=>o.i<=FX.idx);
      if(up.length>1){
        fxctx.strokeStyle='rgba(255,214,107,.8)'; fxctx.lineWidth=2;
        fxctx.shadowColor='rgba(255,214,107,.6)'; fxctx.shadowBlur=12;
        fxctx.beginPath();
        up.forEach((o,j)=>{ const x=fxPx(o.n.ll[0]),y=fxPy(o.n.ll[1]); j?fxctx.lineTo(x,y):fxctx.moveTo(x,y); });
        fxctx.stroke(); fxctx.shadowBlur=0;
      }
    }
    fxctx.textBaseline='middle';
    for(const o of geo){
      const x=fxPx(o.n.ll[0]), y=fxPy(o.n.ll[1]);
      const isC=o.i===FX.idx, done=o.i<FX.idx;
      if(isC){
        const p=(FX.tt%1.7)/1.7;
        fxctx.beginPath(); fxctx.arc(x,y,10+p*36,0,Math.PI*2);
        fxctx.strokeStyle='rgba(255,214,107,'+((1-p)*0.65).toFixed(3)+')'; fxctx.lineWidth=1.8; fxctx.stroke();
        fxctx.shadowColor='rgba(255,214,107,.95)'; fxctx.shadowBlur=28;
        fxctx.beginPath(); fxctx.arc(x,y,6,0,Math.PI*2); fxctx.fillStyle='#f2d79c'; fxctx.fill();
        fxctx.shadowBlur=0;
        fxctx.font='600 16.5px "PingFang SC","Microsoft YaHei",sans-serif';
        fxctx.fillStyle='rgba(255,236,180,.98)'; fxctx.fillText(o.n.t, x+13, y-6);
        fxctx.font='13.5px ui-monospace,Consolas,monospace';
        fxctx.fillStyle='rgba(255,214,107,.72)'; fxctx.fillText(o.n.d||'', x+13, y+9);
      } else {
        fxctx.beginPath(); fxctx.arc(x,y,done?4:3,0,Math.PI*2);
        fxctx.fillStyle = done?'rgba(94,200,240,.9)':'rgba(70,95,120,.55)'; fxctx.fill();
      }
    }
  }

  for(const st of FX.stars){
    const x=((st.x+FX.tt*0.004*st.z)%1)*W, y=st.y*H;
    const tw=0.5+0.5*Math.sin(FX.tt*1.5+st.tw);
    fxctx.globalAlpha=(0.10+st.z*0.42)*tw;
    fxctx.fillStyle = st.z>0.8?'#cfe0f5':'#7f9ab8';
    fxctx.beginPath(); fxctx.arc(x,y,st.s*st.z,0,Math.PI*2); fxctx.fill();
  }
  fxctx.globalAlpha=1;

  const sy=((FX.tt*0.05)%1)*H;
  const sg=fxctx.createLinearGradient(0,sy-90,0,sy+90);
  sg.addColorStop(0,'rgba(94,200,240,0)'); sg.addColorStop(0.5,'rgba(94,200,240,.05)'); sg.addColorStop(1,'rgba(94,200,240,0)');
  fxctx.fillStyle=sg; fxctx.fillRect(0,sy-90,W,180);
}
document.getElementById('fxx').onclick=closeFocus;
document.getElementById('fxprev').onclick=()=>goNode(FX.idx-1);
document.getElementById('fxnext').onclick=()=>goNode(FX.idx+1);
document.getElementById('fxplay').onclick=()=>setFxPlaying(!FX.playing);
// 滚轮分工：光标在【上半屏=地图】→ 缩放地图；在【下半屏=卡片轨道】→ 切换节点
addEventListener('wheel',e=>{
  if(!FX.open) return;
  e.preventDefault();
  const panelW = Math.min(460, window.innerWidth*0.37);
  const onMap = e.clientX < window.innerWidth - panelW;
  if(onMap){
    const r=fxc.getBoundingClientRect();
    const mx=e.clientX-r.left, my=e.clientY-r.top;
    const K0=FX.cam.k;
    const K1=Math.max(0.4, Math.min(9, K0*(e.deltaY>0?0.88:1.14)));
    const ox=FX.proj?FX.proj.ox:window.innerWidth/2, oy=FX.proj?FX.proj.oy:window.innerHeight*0.30;
    const A=mx-ox, B=my-oy;
    FX.cam.dx = A-(A-FX.cam.dx)*(K1/K0);
    FX.cam.dy = B-(B-FX.cam.dy)*(K1/K0);
    FX.cam.k  = K1;
    return;
  }
  const now=performance.now();
  if(now-FX.prevWheel<170) return;
  FX.prevWheel=now;
  goNode(FX.idx + (e.deltaY>0?1:-1));
},{passive:false});

// 地图拖动
(function(){
  let drag=false,lx=0,ly=0;
  fxc.addEventListener('pointerdown',e=>{
    if(e.clientX > window.innerWidth - Math.min(460, window.innerWidth*0.37)) return;  // 右侧留给卡片列表
    drag=true; lx=e.clientX; ly=e.clientY;
    fxc.setPointerCapture(e.pointerId); fxc.style.cursor='grabbing';
  });
  fxc.addEventListener('pointermove',e=>{
    if(!drag) return;
    FX.cam.dx += e.clientX-lx; FX.cam.dy += e.clientY-ly;
    lx=e.clientX; ly=e.clientY;
  });
  const up=()=>{ drag=false; fxc.style.cursor='grab'; };
  fxc.addEventListener('pointerup',up);
  fxc.addEventListener('pointercancel',up);
  fxc.style.cursor='grab';
})();
addEventListener('resize',()=>{ if(FX.open){ fxResize(); FX.proj=fxBuildProj(); layout(); } });

// ============================================================
