/* Chronicles of SOI · 大事件纪实 — add.js
   由 index.html 拆出。加载顺序在 index.html 里：core → focus → tunnel → add → boot。
   都是普通 <script>（非 module），共享同一个全局作用域，顺序不能乱。 */

//  添加单个事件
// ============================================================
(function(){
  const sel=document.getElementById('ai_c');
  sel.innerHTML=Object.keys(window.CAT).map(k=>'<option value="'+k+'">'+window.CAT[k].name+'</option>').join('');
})();
function openAdd(){ fillStorySelect(); document.getElementById('addf').classList.add('on');
  document.getElementById('addmsg').textContent='';
  ['ai_t','ai_d','ai_p','ai_lng','ai_lat','ai_x'].forEach(id=>document.getElementById(id).value='');
  addMedia=null; aiFile.value=''; document.getElementById('aipv').style.display='none';
  document.getElementById('aitx').innerHTML='点击选择文件　支持常见图片与视频格式<br>本地文件只在本次会话有效；要长期保存请用 JSON 导入外链或 base64';
  setTimeout(()=>document.getElementById('ai_t').focus(),50); }
function closeAdd(){ document.getElementById('addf').classList.remove('on'); }
let addMedia=null, addMediaObj=null;
const aiFile=document.getElementById('ai_media');
document.getElementById('aidrop').onclick=()=>aiFile.click();
aiFile.onchange=()=>{
  const fl=aiFile.files[0]; if(!fl) return;
  if(addMediaObj) URL.revokeObjectURL(addMediaObj);
  addMediaObj=URL.createObjectURL(fl);
  addMedia={type: fl.type.indexOf('video')===0?'video':'image', src:addMediaObj};
  const pv=document.getElementById('aipv');
  if(addMedia.type==='image'){ pv.src=addMediaObj; pv.style.display='block'; }
  else pv.style.display='none';
  document.getElementById('aitx').innerHTML =
    fl.name + '　<i style="font-style:normal;color:#5b7c9c">('+Math.round(fl.size/1024)+' KB · '+
    (addMedia.type==='video'?'视频':'图片')+')</i><br>'+
    '<span style="color:#5b7c9c">本地文件只在本次会话有效</span>';
};
// 填充"纳入叙事"下拉：已有叙事 + 新建
function fillStorySelect(){
  const sel=document.getElementById('ai_story'); if(!sel) return;
  const list=storyList();
  sel.innerHTML='<option value="">不纳入（只作为主时间线上的事件）</option>'+
    list.map(e=>'<option value="'+EV.indexOf(e)+'">'+e.story.title+'　（现有 '+e.story.nodes.length+' 个节点）</option>').join('')+
    '<option value="__new">＋ 新建一条叙事…</option>';
}
document.getElementById('addbtn').onclick=openAdd;
document.getElementById('adcancel').onclick=closeAdd;
document.getElementById('adok').onclick=()=>{
  const g=id=>document.getElementById(id).value.trim();
  const msg=document.getElementById('addmsg');
  const t=g('ai_t'), d=g('ai_d');
  if(!t){ msg.textContent='标题必须填'; return; }
  if(!/^\d{4}-\d{1,2}(-\d{1,2})?$/.test(d)){ msg.textContent='日期格式要像 1942-06-04 或 1942-06'; return; }
  let ds=d; if(ds.length===7) ds+='-01';
  const lng=g('ai_lng'), lat=g('ai_lat'), sp=document.getElementById('ai_space').value;
  let ll=null;
  if(sp!=='1' && lng!=='' && lat!==''){
    const a=parseFloat(lng), b=parseFloat(lat);
    if(isNaN(a)||isNaN(b)||a<-180||a>180||b<-90||b>90){ msg.textContent='经度 -180~180，纬度 -90~90'; return; }
    ll=[a,b];
  }
  const desc=g('ai_x');
  const rec={d:ds, t:t, p:g('ai_p'), c:document.getElementById('ai_c').value, ll:ll, x:desc, media:addMedia};
  // ★ 纳入叙事：宿主必须在 EV.push 之前取，否则索引会错位
  const sv=document.getElementById('ai_story').value;
  let addedTo='';
  if(sv==='__new'){
    const title=(prompt('新叙事的标题（例如：冷战的三次危机）','')||'').trim();
    if(title){
      const sub=(prompt('副标题（可留空，例如 1947 → 1991）','')||'').trim();
      rec.story={title:title, sub:sub, nodes:[{d:ds.slice(0,7), t:t, x:desc, ll:ll}]};
      addedTo=title;
    }
  } else if(sv!==''){
    const host=EV[+sv];
    if(host && host.story){
      host.story.nodes.push({d:ds.slice(0,7), t:t, x:desc, ll:ll});
      host.story.nodes.sort((a,b)=>(a.d||'')<(b.d||'')?-1:1);
      addedTo=host.story.title;
    }
  }
  EV.push(rec);
  addMediaObj=null; addMedia=null;
  EV.sort((x,y)=>x.d<y.d?-1:1);
  document.getElementById('nAll').textContent=visibleEvents().length;
  renderPick(); fillStorySelect(); drawTL(); updateHud(); closeAdd();
  if(addedTo) setTimeout(()=>alert('已添加，并归入叙事「'+addedTo+'」'), 60);
};
document.getElementById('addf').onclick=ev=>{ if(ev.target.id==='addf') closeAdd(); };
