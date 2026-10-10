/* Chronicles of SOI · 大事件纪实 — tunnel.js
   由 index.html 拆出。加载顺序在 index.html 里：core → focus → tunnel → add → boot。
   都是普通 <script>（非 module），共享同一个全局作用域，顺序不能乱。 */

//  ★ 事件隧道：以该事件为中心，左＝因，右＝果，底＝地图
// ============================================================
const TN={open:false,ev:null,tt:0,dpr:1,stars:[],boxes:[],proj:null};

// 某时刻的"同期世界"：主时间线上前后 N 天内的事件
function nodeMs(n){ return parseD(n && n.d); }
// ★ 收窄：以前只按时间窗口（±150 天）就把整条时间线的事件都列出来，
//   结果一个节点下面挂着 3~4 条八竿子打不着的事。现在要求关键词相关，或者时间极近。
function sameBoxHTML(t0, days, limit, srcText){
  if(t0==null) return '';
  let items = EV.map(o=>({o, ad:Math.abs(dateOf(o)-t0)})).filter(x=>x.ad <= days*DAY);
  if(srcText){
    const K=kw2(srcText);
    items.forEach(x=>{ const Ko=kw2(x.o.t); let c=0; K.forEach(k=>{ if(Ko.has(k)) c++; }); x.ov=c; });
    items = items.filter(x=> x.ov>=1 || x.ad<=60*DAY);
    items.sort((a,b)=> b.ov-a.ov || a.ad-b.ad);
  } else {
    items.sort((a,b)=> a.ad-b.ad);
  }
  const list = items.slice(0, limit||3).map(x=>x.o);
  if(!list.length) return '';
  return '<div class="samebox"><div class="sh"><span>同期 · 可能相关</span><em>点击对比</em></div>'+
    list.map(o=>'<div class="samerow" data-ev="'+EV.indexOf(o)+'">'+
      '<span class="sd">'+o.d.slice(5)+'</span><span class="st">'+o.t+'</span></div>').join('')+
    '</div>';
}
// ★ 点"同期世界"不再直接跳走（以前是 closeFocus + openTunnel，
//   结果点到卡片下半部分就会莫名其妙退出叙事）。
//   改成弹一张对比浮卡，看完想进再进。
function wireSame(root){
  root.querySelectorAll('.samerow').forEach(el=>{
    el.onclick=ev=>{ ev.stopPropagation();
      const o=EV[+el.dataset.ev]; if(!o) return;
      openCompare(o);
    };
  });
}
function openCompare(o){
  const box=document.getElementById('compare'); if(!box) return;
  const c=catOf(o);
  box.innerHTML='<div class="pnl"><div class="pnl-in">'+
    '<div style="position:absolute;right:12px;top:9px;font-size:11px ;color:#4a6d8c;letter-spacing:.16em">SAME TIME</span><em>点击对比</em></div>'+
    '<h4>'+o.t+'</h4>'+
    '<div class="cd">'+o.d+'　·　'+(o.p||'—')+'　·　'+c.name+'</div>'+
    '<div class="cx">'+o.x+'</div>'+
    '<div class="crow"><button class="btn-hard go" id="cmpgo">进入它的隧道 →</button>'+
    '<button class="btn-hard" id="cmpclose">关闭</button></div>'+
  '</div></div>';
  box.classList.add('on');
  document.getElementById('cmpgo').onclick=()=>{ closeCompare(); if(FX.open) closeFocus(); openTunnel(o); };
  document.getElementById('cmpclose').onclick=closeCompare;
}
function closeCompare(){ const b=document.getElementById('compare'); if(b) b.classList.remove('on'); }

// 媒体：图片 / 视频
function mediaHTML(m, badge){
  if(!m || !m.src) return '';
  if(m.type==='video'){
    return '<div class="media-wrap"><video src="'+m.src+'"'+(m.poster?' poster="'+m.poster+'"':'')+
      ' muted playsinline preload="metadata"></video>'+
      '<span class="badge">'+(badge||'VIDEO')+'</span><span class="play">▶</span></div>';
  }
  return '<div class="media-wrap"><img src="'+m.src+'" alt="">'+
    '<span class="badge">'+(badge||'IMAGE')+'</span></div>';
}
function mediaThumb(x){
  if(!x.media) return '';
  if(x.media.type==='video') return '<div class="thumb" style="line-height:42px;text-align:center;color:#f2d79c;font-size:15px ">▶</div>';
  return '<img class="thumb" src="'+x.media.src+'" alt="">';
}

// 显式 links 优先；否则自动推断（同分类 / 同地点）
function related(e){
  const t0=dateOf(e);
  if(e.links && e.links.length){
    const ex=e.links.map(x=> typeof x==='number' ? EV[x]
      : EV.find(y=>y.t.indexOf(x)>=0 || y.d===x)).filter(Boolean);
    return { before:ex.filter(x=>dateOf(x)<=t0), after:ex.filter(x=>dateOf(x)>t0), auto:false };
  }
  // 评分制 + 阈值。之前阈值太松，只要"时间接近"就进来，
  // 结果北京冬奥会被当成俄乌战争爆发的"因"。现在必须真的相关才显示。
  const K=kw2(e.t+' '+(e.x||''));
  const before=[], after=[];
  for(const o of EV){
    if(o===e) continue;
    const dt=dateOf(o)-t0, ad=Math.abs(dt);
    let sc=0;
    if(e.p && o.p && e.p===o.p) sc+=4;                       // 同地点
    const Ko=kw2(o.t);
    let ov=0; K.forEach(k=>{ if(Ko.has(k)) ov++; });
    if(ov>=3) sc+=4;                                          // 标题关键词重合
    if(o.c===e.c && ad<=365*DAY) sc+=3;          // 同类 + 一年内（同年代的战争/政治通常真相关）
    if(ad<=45*DAY) sc+=1;                                     // 时间很贴近
    if(sc<3) continue;                                        // ★ 阈值
    (dt<0?before:after).push({o,sc,ad});
  }
  const pick=a=>{ a.sort((x,y)=>y.sc-x.sc||x.ad-y.ad); return a.slice(0,4).map(x=>x.o); };
  return { before:pick(before), after:pick(after), auto:true, strict:true };
}
// 中文 2-gram，用来判断两条事件是不是在说同一件事
function kw2(str){
  const t=(str||'').replace(/[\s·、，,。.（）()【】\[\]「」『』:：;；!！?？"'"'—－-]/g,'');
  const out=new Set();
  for(let i=0;i<t.length-1;i++) out.add(t.slice(i,i+2));
  return out;
}
function openTunnel(e){
  if(!e) return;
  TN.ev=e; TN.open=true; TN.tt=0; selectedEvent=e; closeCompare();
  if(typeof showNow==='function') showNow(e);   // 点事件点：左下卡片也跟着显示它
  document.getElementById('tunnel').classList.add('on');
  // 地图跟随：把镜头移到这个事件上，并拉近一点
  if(e.ll){ camT.lng=e.ll[0]; camT.lat=e.ll[1]; camT.k=Math.max(camT.k,1.7);
    cam.lng=camT.lng; cam.lat=camT.lat; cam.k=camT.k; }   // 直接到位，别让高亮跑到屏幕外
  TN.stars=Array.from({length:220},()=>({x:Math.random(),y:Math.random(),
    z:0.2+Math.random()*0.8, s:0.4+Math.random()*1.5, tw:Math.random()*6.28}));
  const c=catOf(e);
  document.getElementById('tncenter').innerHTML=
    '<div class="pnl"><div class="pnl-in">'+
      '<div style="position:absolute;right:13px;top:10px;font-size:11.5px ;color:#a58a3a;letter-spacing:.16em">FOCUS</div>'+
      '<h2>'+e.t+'</h2>'+
      '<div class="m">'+fmtCN(e)+'　·　'+e.p+'　·　'+(e.ll?e.ll[0].toFixed(1)+'° / '+e.ll[1].toFixed(1)+'°':'天外')+'</div>'+
      '<div class="x">'+e.x+'</div>'+
      mediaHTML(e.media,'FOCUS MEDIA')+sameBoxHTML(dateOf(e),200,4,e.t)+
      '<div style="margin-top:12px"><span style="display:inline-block;font-size:11.5px ;padding:2px 9px;border:1px solid '+c.color+
        '66;color:'+c.color+';letter-spacing:.1em">'+c.name+'</span></div>'+
      (e.story?'<button class="btn-hard go" id="tnstory" style="width:100%;margin-top:13px">▸ 展开叙事：'+e.story.title+'</button>':'')+
    '</div></div>';
  const sb=document.getElementById('tnstory');
  if(sb) sb.onclick=()=>{ closeTunnel(); openFocus(e.story); };

  const R=related(e);
  // 纵向：越靠上＝越早，所以 before 按时间正序排；after 按时间正序往下排
  const up = R.before.slice().sort((a,b)=>dateOf(a)-dateOf(b));
  const dn = R.after.slice().sort((a,b)=>dateOf(a)-dateOf(b));
  document.getElementById('tnlblU').textContent='▲ BEFORE　促成它的 '+up.length+' 件';
  document.getElementById('tnup').innerHTML = up.length ? up.map(tnItem).join('')
    : '<div class="nomedia" style="padding:3px 2px;line-height:1.7">没有找到明显相关的<br><span style="color:#31465c">可以手工写 links，或用「＋ 添加」时选「纳入叙事」</span></div>';
  document.getElementById('tndown').innerHTML = dn.length ? dn.map(tnItem).join('')
    : '<div class="nomedia" style="padding:3px 2px;text-align:right">没有找到明显的后续事件</div>';
  document.getElementById('tnlblD').textContent='被它影响的 '+dn.length+' 件　AFTER ▼';
  document.getElementById('tnsub').innerHTML=
    '基於 '+(R.auto?'自动推断（同分类 / 同地点 / 时间接近）':'手工指定的 links')+'<br>共 '+EV.length+' 条事件中的数据';

  document.querySelectorAll('#tnup .tnitem,#tndown .tnitem').forEach(el=>{
    el.onclick=()=>{ const x=EV[+el.dataset.i]; if(x) openTunnel(x); };
  });
  tnResize(); TN.proj=tnBuildProj(e,R); layoutTunnel(); wireSame(document.getElementById('tunnel'));
}
function tnItem(x){
  const c=catOf(x);
  return '<div class="tnitem" data-i="'+EV.indexOf(x)+'"><div class="pnl"><div class="pnl-in">'+
    mediaThumb(x)+
    '<div class="bd"><div class="d">'+x.d+'　·　'+c.name+'</div>'+
    '<div class="t">'+x.t+'</div></div></div></div></div>';
}
function closeTunnel(){ TN.open=false; selectedEvent=null; document.getElementById('tunnel').classList.remove('on'); }
function tnResize(){
  const W=window.innerWidth,H=window.innerHeight;
  TN.dpr=Math.min(devicePixelRatio||1,2);
  const c=document.getElementById('tnc');
  c.width=W*TN.dpr; c.height=H*TN.dpr; c.style.width=W+'px'; c.style.height=H+'px';
}
function tnBuildProj(e,R){
  const W=window.innerWidth,H=window.innerHeight;
  if(e.ll){
    // 以事件本身为中心。之前是拿"所有相关事件"去拟合，
    // 结果关连一多地图就缩成整个世界，焦点事件看不见了。
    const k=Math.min(W/70, H*1.6/62);   // 迷你地图：面板里放大一点才看得清
    return { cx:e.ll[0], cy:e.ll[1], k, ox:W/2, oy:H*0.46 };
  }
  const pts=[e,...R.before,...R.after].filter(x=>x.ll);
  if(!pts.length) return null;
  let a=1e9,b=1e9,c=-1e9,d=-1e9;
  for(const n of pts){ a=Math.min(a,n.ll[0]); c=Math.max(c,n.ll[0]);
                       b=Math.min(b,n.ll[1]); d=Math.max(d,n.ll[1]); }
  const spanX=Math.max(c-a,0.01), spanY=Math.max(d-b,0.01);
  const k=Math.min(W/spanX, H*1.4/spanY);
  return { cx:(a+c)/2, cy:(b+d)/2, k, ox:W/2, oy:H*0.46 };
}
// 纵向锚点：脊柱在整列左侧，每个卡片从中枢引一条横线进来
function layoutTunnel(){
  TN.boxes=[];
  const col=document.getElementById('tncol');
  if(!col) return;
  const cR=col.getBoundingClientRect();
  TN.spineX=cR.left-26;
  const cEl=document.querySelector('#tncenter .pnl');
  if(cEl){ const r=cEl.getBoundingClientRect();
    TN.center={left:r.left,cy:r.top+r.height/2}; }
  const add=(sel,dir)=>document.querySelectorAll(sel).forEach(el=>{
    const r=el.getBoundingClientRect();
    TN.boxes.push({dir, left:r.left, cy:r.top+r.height/2});
  });
  add('#tnup .tnitem .pnl',-1);
  add('#tndown .tnitem .pnl',1);
}
function tnTick(dt){
  TN.tt+=dt/1000;
  const W=window.innerWidth,H=window.innerHeight;
  const ctx2=document.getElementById('tnc').getContext('2d');
  ctx2.setTransform(1,0,0,1,0,0);
  ctx2.clearRect(0,0,W*TN.dpr,H*TN.dpr);
  ctx2.setTransform(TN.dpr,0,0,TN.dpr,0,0);

  const bg=ctx2.createRadialGradient(W/2,H*0.5,0,W/2,H*0.5,Math.max(W,H)*0.8);
  bg.addColorStop(0,'#0a1c30'); bg.addColorStop(0.55,'#061020'); bg.addColorStop(1,'#030812');
  ctx2.fillStyle=bg; ctx2.fillRect(0,0,W,H);

  const P=TN.proj;
  if(P && window.WORLD){
    const px=l=>P.ox+(l-P.cx)*P.k, py=a=>P.oy-(a-P.cy)*P.k;
    ctx2.beginPath();
    for(const ring of window.WORLD){ for(let i=0;i<ring.length;i++){
      const x=px(ring[i][0]), y=py(ring[i][1]);
      i? ctx2.lineTo(x,y) : ctx2.moveTo(x,y); } ctx2.closePath(); }
    ctx2.fillStyle='rgba(14,25,36,.82)'; ctx2.fill();
    ctx2.strokeStyle='rgba(94,200,240,.13)'; ctx2.lineWidth=0.7; ctx2.stroke();

    const R=related(TN.ev);
    const link=(o,col)=>{
      if(!o.ll) return;
      const x=px(o.ll[0]), y=py(o.ll[1]);
      ctx2.strokeStyle=col; ctx2.lineWidth=1.2; ctx2.setLineDash([4,5]);
      ctx2.beginPath(); ctx2.moveTo(px(TN.ev.ll[0]),py(TN.ev.ll[1])); ctx2.lineTo(x,y); ctx2.stroke();
      ctx2.setLineDash([]);
      ctx2.beginPath(); ctx2.arc(x,y,3.2,0,Math.PI*2); ctx2.fillStyle=col; ctx2.fill();
    };
    if(TN.ev.ll){
      R.before.forEach(o=>link(o,'rgba(94,200,240,.4)'));
      R.after.forEach(o=>link(o,'rgba(255,140,90,.4)'));
      const x=px(TN.ev.ll[0]), y=py(TN.ev.ll[1]);
      const p=(TN.tt%1.8)/1.8;
      ctx2.beginPath(); ctx2.arc(x,y,9+p*30,0,Math.PI*2);
      ctx2.strokeStyle='rgba(255,214,107,'+((1-p)*0.55).toFixed(3)+')'; ctx2.lineWidth=1.8; ctx2.stroke();
      ctx2.shadowColor='rgba(255,214,107,.9)'; ctx2.shadowBlur=24;
      ctx2.beginPath(); ctx2.arc(x,y,5.5,0,Math.PI*2); ctx2.fillStyle='#f2d79c'; ctx2.fill();
      ctx2.shadowBlur=0;
    }
  }
  for(const st of TN.stars){
    const x=((st.x+TN.tt*0.005*st.z)%1)*W, y=st.y*H;
    const tw=0.5+0.5*Math.sin(TN.tt*1.5+st.tw);
    ctx2.globalAlpha=(0.10+st.z*0.4)*tw; ctx2.fillStyle='#86a4c2';
    ctx2.beginPath(); ctx2.arc(x,y,st.s*st.z,0,Math.PI*2); ctx2.fill();
  }
  ctx2.globalAlpha=1;

  // 纵向脊柱 + 每个卡片的引入线
  if(TN.spineX!=null && TN.center){
    const all=TN.boxes.map(b=>b.cy);
    const yTop=Math.min(TN.center.cy, ...all), yBot=Math.max(TN.center.cy, ...all);
    const g=ctx2.createLinearGradient(0,yTop,0,yBot);
    g.addColorStop(0,'rgba(94,200,240,.5)');
    g.addColorStop(0.5,'rgba(255,214,107,.55)');
    g.addColorStop(1,'rgba(255,140,90,.5)');
    ctx2.strokeStyle=g; ctx2.lineWidth=1.7;
    ctx2.beginPath(); ctx2.moveTo(TN.spineX,yTop); ctx2.lineTo(TN.spineX,yBot); ctx2.stroke();

    const tick=(left,cy,col,wd)=>{
      ctx2.strokeStyle=col; ctx2.lineWidth=wd||1.2;
      ctx2.beginPath(); ctx2.moveTo(TN.spineX,cy); ctx2.lineTo(left,cy); ctx2.stroke();
      ctx2.beginPath(); ctx2.arc(left,cy,2.4,0,Math.PI*2); ctx2.fillStyle=col; ctx2.fill();
    };
    // 中枢
    ctx2.strokeStyle='rgba(255,214,107,.85)'; ctx2.lineWidth=2;
    ctx2.beginPath(); ctx2.moveTo(TN.spineX,TN.center.cy); ctx2.lineTo(TN.center.left,TN.center.cy); ctx2.stroke();
    ctx2.beginPath(); ctx2.arc(TN.center.left,TN.center.cy,3.4,0,Math.PI*2); ctx2.fillStyle='#f2d79c'; ctx2.fill();
    // 两侧
    for(const b of TN.boxes){
      const col = b.dir<0 ? 'rgba(94,200,240,.55)' : 'rgba(255,140,90,.55)';
      tick(b.left,b.cy,col,1.2);
      // 沿线流动的光点
      const p=((TN.tt*0.42)+ (b.cy%100)/140)%1;
      const yy = TN.center.cy + (b.cy-TN.center.cy)*p;
      ctx2.beginPath(); ctx2.arc(TN.spineX,yy,2.1,0,Math.PI*2);
      ctx2.fillStyle = b.dir<0?'rgba(120,210,255,.95)':'rgba(255,160,110,.95)'; ctx2.fill();
    }
    // 脊柱上的流动扫描
    const sp=((TN.tt*0.3)%1);
    const sy2=yTop+(yBot-yTop)*sp;
    ctx2.beginPath(); ctx2.arc(TN.spineX,sy2,3,0,Math.PI*2);
    ctx2.fillStyle='rgba(255,255,255,.85)'; ctx2.fill();
  }
}
document.getElementById('tnx').onclick=closeTunnel;
new ResizeObserver(()=>{ if(TN.open) layoutTunnel(); }).observe(document.getElementById('tncol'));
addEventListener('resize',()=>{ if(TN.open){ tnResize(); TN.proj=tnBuildProj(TN.ev,related(TN.ev)); layoutTunnel(); } });

// ============================================================
