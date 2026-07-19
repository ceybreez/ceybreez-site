(() => {
  "use strict";
  const API_BASE="https://ceybreez-contact-api.ceybreez.workers.dev";
  const pages={home:"../index.html",villas:"../villas.html",apartments:"../apartments.html",homestays:"../homestays.html",tours:"../tours.html",services:"../services.html",contact:"../contact.html"};
  const $=id=>document.getElementById(id);
  const state={token:localStorage.getItem("CEYBREEZ_ADMIN_TOKEN")||"",page:"home",device:"desktop",sections:[],section:null,selected:null,selector:"",styles:{},custom:[],zoom:1,history:[],future:[],dirty:false};
  const auth=()=>({"Content-Type":"application/json","Authorization":`Bearer ${state.token}`});
  const upAuth=()=>({"Authorization":`Bearer ${state.token}`});
  const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
  const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  function toast(s){const t=$("toast");t.textContent=s;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
  function setStatus(s,bad=false){const e=$("saveStatus");e.textContent=s;e.style.color=bad?"#bd3838":""}
  function showApp(){ $("loginGate").classList.add("hidden");$("builderApp").classList.remove("hidden");init(); }
  function gate(){if(state.token)showApp();else $("loginGate").classList.remove("hidden")}
  $("loginForm").addEventListener("submit",e=>{e.preventDefault();state.token=$("tokenInput").value.trim();if(!state.token)return;localStorage.setItem("CEYBREEZ_ADMIN_TOKEN",state.token);showApp()});

  async function init(){
    $("pageSelect").innerHTML=Object.keys(pages).map(p=>`<option value="${p}">${p[0].toUpperCase()+p.slice(1)}</option>`).join("");
    bind(); await loadSections(); loadFrame();
  }
  function bind(){
    $("pageSelect").onchange=async e=>{state.page=e.target.value;clearSelection();await loadSections();loadFrame()};
    document.querySelectorAll("[data-device]").forEach(b=>b.onclick=()=>setDevice(b.dataset.device));
    $("refreshBtn").onclick=async()=>{await loadSections();loadFrame()};
    $("previewBtn").onclick=()=>window.open(pages[state.page],"_blank");
    $("saveBtn").onclick=save;
    $("undoBtn").onclick=undo; $("redoBtn").onclick=redo;
    $("zoomIn").onclick=()=>setZoom(Math.min(1.3,state.zoom+.1)); $("zoomOut").onclick=()=>setZoom(Math.max(.5,state.zoom-.1));
    $("resetBtn").onclick=resetSelected; $("useMainBtn").onclick=useMain;
    $("browseImage").onclick=()=>$("imageFile").click(); $("imageFile").onchange=uploadImage;
    ["widthValue","heightValue","xValue","yValue","rotateValue","opacityValue","fontSize","lineHeight","radiusValue","paddingValue","zValue"].forEach(id=>$(id).addEventListener("input",()=>changeNumeric(id)));
    ["fontFamily","shadowValue"].forEach(id=>$(id).onchange=()=>changeSimple(id));
    ["textColor","bgColor"].forEach(id=>$(id).oninput=()=>changeSimple(id));
    $("textValue").oninput=()=>{if(!state.selected)return;pushHistory();state.selected.textContent=$("textValue").value;markDirty()};
    $("imageValue").onchange=()=>{if(!state.selected)return;pushHistory();state.selected.src=$("imageValue").value;markDirty()};
    document.querySelectorAll("[data-format]").forEach(b=>b.onclick=()=>toggleFormat(b.dataset.format));
    document.querySelectorAll("[data-align]").forEach(b=>b.onclick=()=>setAlign(b.dataset.align));
    window.addEventListener("beforeunload",e=>{if(state.dirty){e.preventDefault();e.returnValue=""}});
  }
  function setDevice(device){state.device=device;document.querySelectorAll("[data-device]").forEach(b=>b.classList.toggle("active",b.dataset.device===device));$("frameShell").className=`frame-shell ${device}`;$("deviceNote").classList.toggle("hidden",device==="desktop");applyAll();fillInspector()}
  function setZoom(z){state.zoom=Math.round(z*10)/10;$("frameShell").style.transform=`scale(${state.zoom})`;$("zoomLabel").textContent=`${Math.round(state.zoom*100)}%`}
  async function loadSections(){
    setStatus("Loading...");
    try{const r=await fetch(`${API_BASE}/api/admin/page-sections?page=${encodeURIComponent(state.page)}`,{headers:auth()});const data=await r.json();if(!r.ok)throw new Error(data.error||"Unable to load sections");state.sections=Array.isArray(data)?data:(data.sections||[]);renderSections();setStatus("Ready")}
    catch(e){setStatus("Login required",true);toast(e.message);if(e.message.toLowerCase().includes("unauthor")){localStorage.removeItem("CEYBREEZ_ADMIN_TOKEN")}}
  }
  function renderSections(){
    const list=$("sectionList");if(!state.sections.length){list.innerHTML='<div class="left-help">No saved sections found for this page.</div>';state.section=null;return}
    list.innerHTML=state.sections.sort((a,b)=>num(a.sortOrder)-num(b.sortOrder)).map((s,i)=>`<button class="section-item ${state.section&&String(state.section.id)===String(s.id)?"active":""}" data-id="${esc(s.id)}"><strong>${esc(s.title||s.sectionKey||`Section ${i+1}`)}</strong><span>${esc(s.sectionKey||s.sectionType||"")}</span></button>`).join("");
    list.querySelectorAll(".section-item").forEach(b=>b.onclick=()=>selectSection(b.dataset.id));
    if(!state.section)selectSection(state.sections[0].id);
  }
  function selectSection(id){state.section=state.sections.find(s=>String(s.id)===String(id));if(!state.section)return;const settings=parseSettings(state.section.settings);state.styles=settings.elementStyles||{};state.custom=settings.customElements||[];clearSelection();renderSections();$("editingLabel").textContent=`Editing: ${state.section.title||state.section.sectionKey}`;afterFrameReady(()=>{markSection();applyAll()})}
  function parseSettings(v){if(!v)return{};if(typeof v==="object")return v;try{return JSON.parse(v)}catch{return{}}}
  function loadFrame(){const f=$("previewFrame");f.onload=()=>{prepareFrame();if(state.section)markSection();applyAll()};f.src=`${pages[state.page]}?builder=${Date.now()}`}
  function afterFrameReady(fn){const f=$("previewFrame");if(f.contentDocument?.readyState==="complete")fn();else f.addEventListener("load",fn,{once:true})}
  function doc(){return $("previewFrame").contentDocument}
  function targetSection(){const d=doc();if(!d||!state.section)return null;return d.querySelector(`[data-section="${CSS.escape(state.section.sectionKey||"")}"]`)||[...d.querySelectorAll("section,header,main,footer")][num(state.section.sortOrder,1)-1]||d.body}
  function prepareFrame(){const d=doc();if(!d)return;let st=d.getElementById("ceybreez-standalone-editor");if(!st){st=d.createElement("style");st.id="ceybreez-standalone-editor";st.textContent=`body.pb-editing *{cursor:default}.pb-edit-section{outline:2px dashed rgba(8,127,114,.6)!important;outline-offset:-2px}.pb-selected{outline:2px solid #00a993!important;outline-offset:3px!important;cursor:move!important}.pb-selected::after{content:attr(data-pb-label);position:absolute;left:0;top:-25px;background:#087f72;color:#fff;font:11px Arial;padding:4px 7px;border-radius:4px;z-index:2147483646;white-space:nowrap}.pb-custom{position:absolute!important}`;d.head.appendChild(st)}d.body.classList.add("pb-editing");assignIds(d);d.addEventListener("pointerdown",pointerDown,true);d.addEventListener("click",selectClick,true)}
  function assignIds(d){d.querySelectorAll("body *").forEach((el,i)=>{if(!el.dataset.pbUid)el.dataset.pbUid=`pb-${i}-${pathKey(el)}`})}
  function pathKey(el){let p=[];while(el&&el.parentElement&&p.length<6){p.unshift([...el.parentElement.children].indexOf(el));el=el.parentElement}return p.join("-")}
  function markSection(){const d=doc();if(!d)return;d.querySelectorAll(".pb-edit-section").forEach(n=>n.classList.remove("pb-edit-section"));targetSection()?.classList.add("pb-edit-section")}
  function selectClick(e){const section=targetSection();if(!section||!section.contains(e.target))return;e.preventDefault();e.stopPropagation();selectElement(e.target)}
  function selectElement(el){const section=targetSection();if(!el||el===section)return;doc().querySelectorAll(".pb-selected").forEach(n=>n.classList.remove("pb-selected"));state.selected=el;state.selector=`[data-pb-uid="${el.dataset.pbUid}"]`;el.classList.add("pb-selected");el.dataset.pbLabel=niceName(el);$("emptyInspector").classList.add("hidden");$("elementInspector").classList.remove("hidden");fillInspector()}
  function niceName(el){if(el.dataset.field)return el.dataset.field.replace(/[-_]/g," ");if(el.alt)return`Image: ${el.alt}`;return el.tagName.toLowerCase()}
  function clearSelection(){try{doc()?.querySelectorAll(".pb-selected").forEach(n=>n.classList.remove("pb-selected"))}catch{}state.selected=null;state.selector="";$("emptyInspector").classList.remove("hidden");$("elementInspector").classList.add("hidden")}
  function record(create=true){if(!state.selector)return null;let all=state.styles[state.selector];if(!all&&create)all=state.styles[state.selector]={desktop:{},tablet:{},mobile:{}};if(!all)return null;if(!all[state.device]&&create)all[state.device]={};return all[state.device]}
  function mergedRecord(){const all=state.styles[state.selector]||{};return state.device==="desktop"?{...(all.desktop||{})}:{...(all.desktop||{}),...(all[state.device]||{})}}
  function fillInspector(){if(!state.selected)return;const r=mergedRecord();const rect=state.selected.getBoundingClientRect();$("selectedName").textContent=niceName(state.selected);const isImg=state.selected.tagName==="IMG";$("imageControl").classList.toggle("hidden",!isImg);$("textControl").classList.toggle("hidden",isImg);if(isImg)$("imageValue").value=state.selected.src||"";else $("textValue").value=state.selected.textContent||"";const vals={widthValue:r.width??Math.round(rect.width),heightValue:r.height??Math.round(rect.height),xValue:r.x??0,yValue:r.y??0,rotateValue:r.rotate??0,opacityValue:r.opacity??1,fontSize:r.fontSize??(parseFloat(getComputedStyle(state.selected).fontSize)||16),lineHeight:r.lineHeight??(parseFloat(getComputedStyle(state.selected).lineHeight)||20),radiusValue:r.borderRadius??(parseFloat(getComputedStyle(state.selected).borderRadius)||0),paddingValue:r.padding??(parseFloat(getComputedStyle(state.selected).padding)||0),zValue:r.zIndex??0};Object.entries(vals).forEach(([id,v])=>$(id).value=Math.round(v*100)/100);$("fontFamily").value=r.fontFamily||"";$("shadowValue").value=r.boxShadow||"";$("textColor").value=rgbHex(r.color||getComputedStyle(state.selected).color,"#222222");$("bgColor").value=rgbHex(r.backgroundColor||getComputedStyle(state.selected).backgroundColor,"#ffffff")}
  function rgbHex(v,f){if(!v||v==="transparent"||v.includes("rgba(0, 0, 0, 0)"))return f;if(v.startsWith("#"))return v.slice(0,7);const m=v.match(/\d+/g);if(!m)return f;return"#"+m.slice(0,3).map(x=>(+x).toString(16).padStart(2,"0")).join("")}
  function pushHistory(){state.history.push(JSON.stringify(state.styles));if(state.history.length>40)state.history.shift();state.future=[]}
  function undo(){if(!state.history.length)return;state.future.push(JSON.stringify(state.styles));state.styles=JSON.parse(state.history.pop());applyAll();fillInspector();markDirty()}
  function redo(){if(!state.future.length)return;state.history.push(JSON.stringify(state.styles));state.styles=JSON.parse(state.future.pop());applyAll();fillInspector();markDirty()}
  function markDirty(){state.dirty=true;setStatus("Unsaved")}
  function changeNumeric(id){if(!state.selected)return;pushHistory();const map={widthValue:"width",heightValue:"height",xValue:"x",yValue:"y",rotateValue:"rotate",opacityValue:"opacity",fontSize:"fontSize",lineHeight:"lineHeight",radiusValue:"borderRadius",paddingValue:"padding",zValue:"zIndex"};record()[map[id]]=num($(id).value);applySelected();markDirty()}
  function changeSimple(id){if(!state.selected)return;pushHistory();const map={fontFamily:"fontFamily",shadowValue:"boxShadow",textColor:"color",bgColor:"backgroundColor"};record()[map[id]]=$(id).value;applySelected();markDirty()}
  function toggleFormat(k){if(!state.selected)return;pushHistory();const r=record();if(k==="bold")r.fontWeight=r.fontWeight==="700"?"":"700";if(k==="italic")r.fontStyle=r.fontStyle==="italic"?"":"italic";if(k==="underline")r.textDecoration=r.textDecoration==="underline"?"":"underline";applySelected();markDirty()}
  function setAlign(a){if(!state.selected)return;pushHistory();record().textAlign=a;applySelected();markDirty()}
  function applyAll(){const section=targetSection();if(!section)return;Object.entries(state.styles).forEach(([sel,by])=>{let el;try{el=section.querySelector(sel)}catch{}if(!el)return;const r=state.device==="desktop"?{...(by.desktop||{})}:{...(by.desktop||{}),...(by[state.device]||{})};applyRecord(el,r)});if(state.selector){try{state.selected=section.querySelector(state.selector)}catch{}if(state.selected)state.selected.classList.add("pb-selected")}}
  function applySelected(){if(state.selected)applyRecord(state.selected,mergedRecord())}
  function applyRecord(el,r){if(!el)return;const first=!el.dataset.pbBaseW;const rect=el.getBoundingClientRect();if(first){el.dataset.pbBaseW=String(Math.max(1,rect.width));el.dataset.pbBaseH=String(Math.max(1,rect.height));el.dataset.pbBaseWidth=el.style.width||"";el.dataset.pbBaseHeight=el.style.height||""}const bw=num(el.dataset.pbBaseW,rect.width||1),bh=num(el.dataset.pbBaseH,rect.height||1),w=num(r.width,bw),h=num(r.height,bh);el.style.position="relative";el.style.width=el.dataset.pbBaseWidth;el.style.height=el.dataset.pbBaseHeight;el.style.transformOrigin="center center";el.style.transform=`translate(${num(r.x)}px,${num(r.y)}px) scale(${w/bw},${h/bh}) rotate(${num(r.rotate)}deg)`;const px=["fontSize","lineHeight","borderRadius","padding"];px.forEach(k=>el.style[k]=r[k]!==undefined?`${num(r[k])}px`:"");["opacity","fontFamily","fontWeight","fontStyle","textDecoration","textAlign","color","backgroundColor","boxShadow","zIndex"].forEach(k=>el.style[k]=r[k]!==undefined?r[k]:"")}
  let drag=null;
  function pointerDown(e){const section=targetSection();if(!section||!section.contains(e.target)||e.button!==0)return;selectElement(e.target);const r=mergedRecord();drag={sx:e.clientX,sy:e.clientY,x:num(r.x),y:num(r.y)};doc().addEventListener("pointermove",pointerMove,true);doc().addEventListener("pointerup",pointerUp,true);e.preventDefault();e.stopPropagation()}
  function pointerMove(e){if(!drag||!state.selected)return;const rr=record();rr.x=Math.round(drag.x+(e.clientX-drag.sx));rr.y=Math.round(drag.y+(e.clientY-drag.sy));applySelected();$("xValue").value=rr.x;$("yValue").value=rr.y;markDirty();e.preventDefault()}
  function pointerUp(){if(drag)pushHistory();drag=null;doc().removeEventListener("pointermove",pointerMove,true);doc().removeEventListener("pointerup",pointerUp,true)}
  function resetSelected(){if(!state.selector)return;pushHistory();delete state.styles[state.selector];const el=state.selected;if(el){["position","width","height","transform","transformOrigin","fontSize","lineHeight","borderRadius","padding","opacity","fontFamily","fontWeight","fontStyle","textDecoration","textAlign","color","backgroundColor","boxShadow","zIndex"].forEach(k=>el.style[k]="")}markDirty();fillInspector()}
  function useMain(){if(state.device==="desktop"||!state.selector)return;pushHistory();const all=state.styles[state.selector];if(all)all[state.device]={};applyAll();fillInspector();markDirty();toast("Using Main Web settings")}
  async function uploadImage(){const file=$("imageFile").files[0];if(!file)return;const fd=new FormData();fd.append("file",file);fd.append("folder","page-builder");setStatus("Uploading...");try{const r=await fetch(`${API_BASE}/api/admin/upload-image`,{method:"POST",headers:upAuth(),body:fd});const data=await r.json();if(!r.ok)throw new Error(data.error||"Upload failed");$("imageValue").value=data.url;state.selected.src=data.url;markDirty();toast("Image uploaded")}catch(e){toast(e.message);setStatus("Upload failed",true)}}
  async function save(){if(!state.section)return toast("Select a section first");setStatus("Saving...");const settings={...parseSettings(state.section.settings),elementStyles:state.styles,customElements:state.custom};const data={...state.section,settings};delete data.createdAt;delete data.updatedAt;try{const r=await fetch(`${API_BASE}/api/admin/page-sections`,{method:"POST",headers:auth(),body:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw new Error(result.error||"Save failed");state.dirty=false;setStatus("Saved");toast("Changes saved");await loadSections();state.section=state.sections.find(s=>String(s.id)===String(result.id||state.section.id))||state.section}catch(e){setStatus("Save failed",true);toast(e.message)}}
  gate();
})();