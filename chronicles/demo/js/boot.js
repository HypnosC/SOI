/* Chronicles of SOI · 大事件纪实 — boot.js
   由 index.html 拆出。加载顺序在 index.html 里：core → focus → tunnel → add → boot。
   都是普通 <script>（非 module），共享同一个全局作用域，顺序不能乱。 */

// ---- 叙事选择弹窗 ----
function storyList(){ return EV.filter(e=>e.story && e.story.nodes && e.story.nodes.length && evVisible(e)); }
function renderPick(){
  const list=storyList();
  document.getElementById('picklist').innerHTML = list.length ? list.map((e,i)=>
    '<div class="pickrow" data-i="'+i+'">'+
      '<div class="n">'+String(i+1).padStart(2,'0')+'</div>'+
      '<div class="tx"><b>'+e.story.title+'</b>'+
      '<span>'+(e.story.sub||'')+' · '+e.story.nodes.length+' 个节点 · 挂在「'+e.t+'」</span></div>'+
      '<div class="go">▸</div>'+
    '</div>').join('')
    : '<div style="color:#8ba0b8;padding:10px 2px">当前数据集里还没有带 story 字段的事件。<br>用「导入 JSON」加上 story 就会出现。</div>';
  document.getElementById('picklist').querySelectorAll('.pickrow').forEach(r=>{
    r.onclick=()=>{ closePick(); openFocus(list[+r.dataset.i].story); };
  });
  const b=document.getElementById('stories');
  b.textContent='✦ 叙事 '+(list.length||'');
  b.style.display = list.length ? '' : 'none';
}
function openPick(){ renderPick(); document.getElementById('pick').classList.add('on'); }
function closePick(){ document.getElementById('pick').classList.remove('on'); }
document.getElementById('stories').onclick=openPick;
document.getElementById('pick').onclick=ev=>{ if(ev.target.id==='pick') closePick(); };
renderPick();
function loadEvents(arr){
  EV.length=0; arr.forEach(x=>EV.push(x));
  EV.sort((a,b)=>a.d<b.d?-1:1);
  t=T0; current=null; clearNow(); closeDetail(); closeFocus();
  camT.lng=CAM_HOME.lng; camT.lat=CAM_HOME.lat; camT.k=CAM_HOME.k;
document.getElementById('nAll').textContent=visibleEvents().length;
  renderPick(); fillStorySelect();
  drawTL(); updateHud();
}
document.getElementById('exp').onclick=()=>{
  const blob=new Blob([JSON.stringify(EV,null,1)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='events-'+new Date().toISOString().slice(0,10)+'.json';
  a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),3000);
};
const fin=document.createElement('input');
fin.type='file'; fin.accept='.json,application/json';
fin.onchange=e=>{
  const file=e.target.files[0]; if(!file) return;
  const rd=new FileReader();
  rd.onload=()=>{
    try{
      let d=JSON.parse(rd.result);
      if(!Array.isArray(d)) d=d.events||d.items||d.data||[];
      const ok=d.filter(x=>x && (x.t||x.title) && (x.d||x.date));
      if(!ok.length) throw new Error('没找到有效事件。每条至少要有 d(日期) 和 t(标题)');
      const norm=ok.map(x=>({
        d:x.d||x.date, t:x.t||x.title, p:x.p||x.place||x.loc||'',
        c:x.c||'社', ll:(x.ll||x.latlng||null),
        x:x.x||x.desc||x.description||'', story:x.story||null
      }));
      loadEvents(norm);
      const ns=norm.filter(x=>x.story).length;
      alert('导入成功：'+norm.length+' 条事件'+(ns?'，其中 '+ns+' 条带叙事（点开后底部有「展开叙事」）':''));
    }catch(err){ alert('导入失败：'+err.message); }
  };
  rd.readAsText(file); e.target.value='';
};
document.getElementById('imp').onclick=()=>fin.click();
requestAnimationFrame(loop);
document.getElementById('nowx').onclick=()=>{ closeTunnel(); hideNow(); };

// 图层按钮接线
document.querySelectorAll('#layers button').forEach(b=>b.onclick=()=>setLayer(b.dataset.l));

// URL 参数：?t=2022-03 直接跳到某时刻（截图/分享用）
(function(){
  const q=new URLSearchParams(location.search);
  if(q.has('t')){
    let v=q.get('t').trim();
    if(/^\d{4}$/.test(v)) v+='-01-01';            // 2022
    else if(/^\d{4}-\d{1,2}$/.test(v)) v+='-01';  // 2022-12
    const ms=Date.parse(v+'T00:00:00Z');
    if(!isNaN(ms)) t=Math.min(ms,T1-1);
  }
  if(q.has('play')) setPlaying(true);
  if(q.has('detail')){ const e=EV.find(x=>x.t.includes(q.get('detail'))); if(e){ t=Math.max(t,dateOf(e)+DAY); current=e; showNow(e); openDetail(e); const _d=document.getElementById('detail'); _d.style.transition='none'; _d.classList.add('open'); requestAnimationFrame(()=>{_d.style.transition='';}); if(!isSpace(e)){cam.lng=camT.lng=e.ll[0];cam.lat=camT.lat=e.ll[1];cam.k=camT.k=1.9;} } }
  if(q.has('cam')){ const [a,b,c]=q.get('cam').split(',').map(Number); cam.lng=camT.lng=a; cam.lat=camT.lat=b; cam.k=camT.k=c; }
  // ?story=AI&node=5   直接展开某条叙事（截图/分享用）
  if(q.has('story')){
    const st=EV.find(x=>x.story && x.story.title.indexOf(q.get('story'))>=0);
    if(st){ setTimeout(()=>{ openFocus(st.story);
        if(q.has('node')) goNode(+q.get('node'));
        if(q.has('noanim')){ FX.noSmooth=true; setTimeout(()=>{ FX.entT=99; paintCards();
          const _e2=fxrail.children[FX.idx]; if(_e2) _e2.scrollIntoView({block:'center'}); }, 60); }
        if(q.has('noplay')) setFxPlaying(false);
      }, 120); }
  }
  if(q.has('pick')) setTimeout(openPick, 150);
  if(q.has('layer')) setTimeout(()=>setLayer(q.get('layer')), 60);
  if(q.has('add')) setTimeout(openAdd, 150);
  if(q.has('tunnel')){ const te=EV.find(x=>x.t.indexOf(q.get('tunnel'))>=0); if(te) setTimeout(()=>openTunnel(te),150); }
  const done=doneList(); if(done.length){ const l=done[done.length-1]; if(!current){current=l; if(!window.matchMedia('(max-width:860px)').matches) showNow(l);} }
})();

// ============================================================
//  手机端：一进来不要把事件卡铺在屏幕上（会遮住地图，没法操作）
//  点时间轴 / 点事件点时 showNow() 会自动把它显示出来
// ============================================================
// 手机端：初始不显示事件卡（否则一进来就挡住地图三分之一，没法操作）
//   点时间轴 / 点事件点时 showNow() 会去掉 .off，用户交互过就不再自动收起
(function(){
  const n=document.getElementById('now'); if(!n) return;
  const mq=window.matchMedia('(max-width:860px)');
  let touched=false;
  new MutationObserver(()=>{ if(!n.classList.contains('off')) touched=true; })
    .observe(n,{attributes:true,attributeFilter:['class']});
  const hide=()=>{ if(mq.matches && !touched) n.classList.add('off'); };
  hide();
  setTimeout(hide,400);    // boot 时视口宽度可能还没稳定，再补一次
  mq.addEventListener('change',e=>{ if(e.matches) hide(); });
})();