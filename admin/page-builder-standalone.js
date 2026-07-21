(() => {
  "use strict";
  const API_BASE="https://ceybreez-contact-api.ceybreez.workers.dev";
  const pages={home:"../index.html",villas:"../villas.html",apartments:"../apartments.html",homestays:"../homestays.html",tours:"../tours.html",services:"../services.html",contact:"../contact.html"};
  const $=id=>document.getElementById(id);
  const state={token:localStorage.getItem("CEYBREEZ_ADMIN_TOKEN")||"",page:"home",device:"desktop",sections:[],section:null,selected:null,selector:"",styles:{},custom:[],sectionBackground:{},sectionLayout:{},zoom:1,history:[],future:[],dirty:false,slideTimer:null};
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

    $("backgroundType").onchange=changeSectionBackground;
    $("sectionBgColor").oninput=changeSectionBackground;
    $("sectionBgImage").onchange=changeSectionBackground;
    $("sectionBgSize").onchange=changeSectionBackground;
    $("sectionBgWidth").oninput=changeSectionBackground;
    $("sectionBgHeight").oninput=changeSectionBackground;
    $("sectionBgPosX").oninput=changeSectionBackground;
    $("sectionBgPosY").oninput=changeSectionBackground;
    $("sectionBgRepeat").onchange=changeSectionBackground;
    $("sectionBgOverlay").oninput=changeSectionBackground;
    $("sectionMinHeight").oninput=changeSectionBackground;
    $("sectionRadius").oninput=changeSectionBackground;
    $("slideDuration").onchange=changeSectionBackground;
    $("slideEffect").onchange=changeSectionBackground;
    $("uploadBgBtn").onclick=()=>$("sectionBgFile").click();
    $("sectionBgFile").onchange=uploadSectionBackground;
    $("addSlidesBtn").onclick=()=>$("slideFiles").click();
    $("slideFiles").onchange=uploadSlides;
    $("removeBackgroundBtn").onclick=removeSectionBackground;
    $("sectionHeightMode").onchange=toggleSectionLayoutInputs;
    $("sectionContentWidth").onchange=toggleSectionLayoutInputs;
    $("applySectionLayoutBtn").onclick=applySectionLayoutFromUi;
    $("imageWidthMode").onchange=toggleResponsiveImageInputs;
    $("imageHeightMode").onchange=toggleResponsiveImageInputs;
    $("applyImageResponsiveBtn").onclick=applyResponsiveImage;
    document.querySelectorAll("[data-add-element]").forEach(button=>{
      button.onclick=()=>addCustomElement(button.dataset.addElement);
    });
    $("duplicateElementBtn").onclick=duplicateSelectedElement;
    $("deleteElementBtn").onclick=deleteSelectedElement;
    $("bringForwardBtn").onclick=()=>changeLayer(1);
    $("sendBackwardBtn").onclick=()=>changeLayer(-1);
    document.querySelectorAll("[data-mobile-panel]").forEach(button=>{
      button.onclick=()=>setMobilePanel(button.dataset.mobilePanel);
    });
    ["widthValue","heightValue","xValue","yValue","rotateValue","opacityValue","fontSize","lineHeight","radiusValue","paddingValue","zValue"].forEach(id=>$(id).addEventListener("input",()=>changeNumeric(id)));
    ["fontFamily","shadowValue"].forEach(id=>$(id).onchange=()=>changeSimple(id));
    ["textColor","bgColor"].forEach(id=>$(id).oninput=()=>changeSimple(id));
    $("textValue").oninput=()=>{if(!state.selected)return;state.selected.textContent=$("textValue").value;syncSelectedCustom();markDirty()};
    $("imageValue").onchange=()=>{if(!state.selected)return;state.selected.src=$("imageValue").value;syncSelectedCustom();markDirty()};
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
    list.innerHTML=state.sections.sort((a,b)=>num(a.sortOrder)-num(b.sortOrder)).map((s,i)=>`<button class="section-item ${state.section&&String(state.section.id)===String(s.id)?"active":""}" data-id="${esc(s.id)}"><strong>${esc(s.title||s.sectionKey||`Section ${i+1}`)}</strong><span>${esc(s.sectionKey||s.sectionType||"")} · ${(s.isActive===0||s.active===0||s.isVisible===0)?"Hidden":"Active"}</span></button>`).join("");
    list.querySelectorAll(".section-item").forEach(b=>b.onclick=()=>selectSection(b.dataset.id));
    if(!state.section)selectSection(state.sections[0].id);
  }
  function selectSection(id){state.section=state.sections.find(s=>String(s.id)===String(id));if(!state.section)return;const settings=parseSettings(state.section.settings);state.styles=settings.elementStyles||{};state.custom=settings.customElements||[];state.sectionBackground=normalizeSectionBackground(settings.sectionBackground||legacyBackground(state.section,settings));state.sectionLayout=normalizeSectionLayout(settings.sectionLayout);clearSelection();renderSections();fillSectionInspector();fillSectionLayoutInspector();$("editingLabel").textContent=`Editing: ${state.section.title||state.section.sectionKey}`;$("sectionName").textContent=state.section.title||state.section.sectionKey||"Section";afterFrameReady(()=>{markSection();applyAll();applySectionBackgroundPreview();applySectionLayoutPreview()})}
  function parseSettings(v){if(!v)return{};if(typeof v==="object")return v;try{return JSON.parse(v)}catch{return{}}}
  function loadFrame(){const f=$("previewFrame");f.onload=()=>{prepareFrame();if(state.section)markSection();applyAll();applySectionLayoutPreview()};f.src=`${pages[state.page]}?builder=${Date.now()}`}
  function afterFrameReady(fn){const f=$("previewFrame");if(f.contentDocument?.readyState==="complete")fn();else f.addEventListener("load",fn,{once:true})}
  function doc(){return $("previewFrame").contentDocument}
  function targetSection(){const d=doc();if(!d||!state.section)return null;return d.querySelector(`[data-section="${CSS.escape(state.section.sectionKey||"")}"]`)||[...d.querySelectorAll("section,header,main,footer")][num(state.section.sortOrder,1)-1]||d.body}
  function prepareFrame(){const d=doc();if(!d)return;renderEditorCustomElements();let st=d.getElementById("ceybreez-standalone-editor");if(!st){st=d.createElement("style");st.id="ceybreez-standalone-editor";st.textContent=`body.pb-editing *{cursor:default}.pb-edit-section{outline:2px dashed rgba(8,127,114,.6)!important;outline-offset:-2px}.pb-selected{outline:2px solid #00a993!important;outline-offset:3px!important;cursor:move!important}.pb-selected::after{content:attr(data-pb-label);position:absolute;left:0;top:-25px;background:#087f72;color:#fff;font:11px Arial;padding:4px 7px;border-radius:4px;z-index:2147483646;white-space:nowrap}.pb-custom{position:absolute!important}`;d.head.appendChild(st)}d.body.classList.add("pb-editing");assignIds(d);d.addEventListener("pointerdown",pointerDown,true);d.addEventListener("click",selectClick,true)}
  function assignIds(d){d.querySelectorAll("body *").forEach((el,i)=>{if(!el.dataset.pbUid)el.dataset.pbUid=el.dataset.pbId?`custom-${el.dataset.pbId}`:`pb-${i}-${pathKey(el)}`})}
  function pathKey(el){let p=[];while(el&&el.parentElement&&p.length<6){p.unshift([...el.parentElement.children].indexOf(el));el=el.parentElement}return p.join("-")}
  function markSection(){const d=doc();if(!d)return;d.querySelectorAll(".pb-edit-section").forEach(n=>n.classList.remove("pb-edit-section"));targetSection()?.classList.add("pb-edit-section")}
  function selectClick(e){const section=targetSection();if(!section||!section.contains(e.target))return;e.preventDefault();e.stopPropagation();selectElement(e.target)}
  function selectElement(el){const section=targetSection();if(!el||el===section)return;doc().querySelectorAll(".pb-selected").forEach(n=>n.classList.remove("pb-selected"));state.selected=el;state.selector=`[data-pb-uid="${el.dataset.pbUid}"]`;el.classList.add("pb-selected");el.dataset.pbLabel=niceName(el);$("emptyInspector").classList.add("hidden");$("elementInspector").classList.remove("hidden");fillInspector()}
  function niceName(el){if(el.dataset.field)return el.dataset.field.replace(/[-_]/g," ");if(el.alt)return`Image: ${el.alt}`;return el.tagName.toLowerCase()}
  function clearSelection(){$("responsiveImageDetails")?.classList.add("hidden");try{doc()?.querySelectorAll(".pb-selected").forEach(n=>n.classList.remove("pb-selected"))}catch{}state.selected=null;state.selector="";$("emptyInspector").classList.remove("hidden");$("elementInspector").classList.add("hidden")}
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
  function applyAll(){const section=targetSection();if(!section)return;renderEditorCustomElements();assignIds(doc());Object.entries(state.styles).forEach(([sel,by])=>{let el;try{el=section.querySelector(sel)}catch{}if(!el)return;const r=state.device==="desktop"?{...(by.desktop||{})}:{...(by.desktop||{}),...(by[state.device]||{})};applyRecord(el,r)});if(state.selector){try{state.selected=section.querySelector(state.selector)}catch{}if(state.selected)state.selected.classList.add("pb-selected")}applySectionBackgroundPreview()}
  function applySelected(){if(state.selected)applyRecord(state.selected,mergedRecord())}

  function applyImageRecord(el,r){
    if(!el||el.tagName!=="IMG")return;
    const wm=r.imageWidthMode||"auto";
    if(wm==="auto"){el.style.width="auto";el.style.maxWidth="100%";}
    if(wm==="full"){el.style.width="100%";el.style.maxWidth="100%";}
    if(wm==="percent"){el.style.width=`${num(r.imageWidthValue,100)}%`;el.style.maxWidth="100%";}
    if(wm==="pixel"){el.style.width=`${num(r.imageWidthValue,320)}px`;el.style.maxWidth="100%";}
    if((r.imageHeightMode||"auto")==="auto"){el.style.height="auto";}
    else{el.style.height=`${num(r.imageHeightValue,300)}px`;}
    el.style.objectFit=r.objectFit||"contain";
    el.style.aspectRatio=(r.aspectRatio&&r.aspectRatio!=="auto")?r.aspectRatio:"auto";
    el.style.display="block";
  }

  function applyRecord(el,r){if(!el)return;
    if(el.dataset.pbId){
      const parent=el.parentElement;
      if(parent&&getComputedStyle(parent).position==="static")parent.style.position="relative";
      el.style.position="absolute";
      el.style.left=`${num(r.x,20)}px`;
      el.style.top=`${num(r.y,20)}px`;
      el.style.width=r.width!==undefined?`${num(r.width)}px`:"";
      el.style.height=r.height!==undefined?`${num(r.height)}px`:"";
      el.style.transform=`rotate(${num(r.rotate)}deg)`;
      ["fontSize","lineHeight","borderRadius","padding"].forEach(k=>el.style[k]=r[k]!==undefined?`${num(r[k])}px`:"");
      ["opacity","fontFamily","fontWeight","fontStyle","textDecoration","textAlign","color","backgroundColor","boxShadow","zIndex"].forEach(k=>el.style[k]=r[k]!==undefined?r[k]:"");
      applyImageRecord(el,r);
      return;
    }
    const first=!el.dataset.pbBaseW;const rect=el.getBoundingClientRect();if(first){el.dataset.pbBaseW=String(Math.max(1,rect.width));el.dataset.pbBaseH=String(Math.max(1,rect.height));el.dataset.pbBaseWidth=el.style.width||"";el.dataset.pbBaseHeight=el.style.height||""}const bw=num(el.dataset.pbBaseW,rect.width||1),bh=num(el.dataset.pbBaseH,rect.height||1),w=num(r.width,bw),h=num(r.height,bh);el.style.position="relative";el.style.width=el.dataset.pbBaseWidth;el.style.height=el.dataset.pbBaseHeight;el.style.transformOrigin="center center";el.style.transform=`translate(${num(r.x)}px,${num(r.y)}px) scale(${w/bw},${h/bh}) rotate(${num(r.rotate)}deg)`;const px=["fontSize","lineHeight","borderRadius","padding"];px.forEach(k=>el.style[k]=r[k]!==undefined?`${num(r[k])}px`:"");["opacity","fontFamily","fontWeight","fontStyle","textDecoration","textAlign","color","backgroundColor","boxShadow","zIndex"].forEach(k=>el.style[k]=r[k]!==undefined?r[k]:"")}
  let drag=null;
  function pointerDown(e){const section=targetSection();if(!section||!section.contains(e.target)||e.button!==0)return;selectElement(e.target);const r=mergedRecord();drag={sx:e.clientX,sy:e.clientY,x:num(r.x),y:num(r.y)};doc().addEventListener("pointermove",pointerMove,true);doc().addEventListener("pointerup",pointerUp,true);e.preventDefault();e.stopPropagation()}
  function pointerMove(e){if(!drag||!state.selected)return;const rr=record();rr.x=Math.round(drag.x+(e.clientX-drag.sx));rr.y=Math.round(drag.y+(e.clientY-drag.sy));applySelected();$("xValue").value=rr.x;$("yValue").value=rr.y;markDirty();e.preventDefault()}
  function pointerUp(){if(drag)pushHistory();drag=null;doc().removeEventListener("pointermove",pointerMove,true);doc().removeEventListener("pointerup",pointerUp,true)}
  function resetSelected(){if(!state.selector)return;pushHistory();delete state.styles[state.selector];const el=state.selected;if(el){["position","width","height","transform","transformOrigin","fontSize","lineHeight","borderRadius","padding","opacity","fontFamily","fontWeight","fontStyle","textDecoration","textAlign","color","backgroundColor","boxShadow","zIndex"].forEach(k=>el.style[k]="")}markDirty();fillInspector()}
  function useMain(){if(state.device==="desktop"||!state.selector)return;pushHistory();const all=state.styles[state.selector];if(all)all[state.device]={};applyAll();fillInspector();markDirty();toast("Using Main Web settings")}


  function customItemBySelected(){
    const id=state.selected?.dataset?.pbId;
    return id?state.custom.find(item=>String(item.id)===String(id)):null;
  }

  function renderEditorCustomElements(){
    const section=targetSection();
    if(!section)return;
    section.querySelectorAll('[data-pb-editor-custom="1"]').forEach(node=>node.remove());
    (state.custom||[]).forEach(item=>{
      if(item.sectionKey!==state.section?.sectionKey)return;
      let node;
      if(item.type==="image"){
        node=doc().createElement("img");
        node.src=item.url||"../images/cover.jpg";
        node.alt=item.alt||"Custom image";
      }else if(item.type==="button"){
        node=doc().createElement("a");
        node.href=item.url||"#";
        node.textContent=item.text||"Button";
        node.style.display="inline-block";
        node.style.textDecoration="none";
      }else{
        node=doc().createElement(item.type==="heading"?"h2":"p");
        node.textContent=item.text||(item.type==="heading"?"New heading":"New text");
      }
      node.dataset.pbEditorCustom="1";
      node.dataset.pbId=item.id;
      node.dataset.pbUid=`custom-${item.id}`;
      node.classList.add("pb-custom");
      section.appendChild(node);
    });
  }

  function addCustomElement(type){
    const section=targetSection();
    if(!state.section||!section)return toast("Select a section first");
    const id=`pb-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const item={
      id,
      sectionKey:state.section.sectionKey,
      type,
      text:type==="heading"?"New heading":type==="button"?"Button":type==="text"?"New text":"",
      url:type==="image"?"../images/cover.jpg":type==="button"?"#":"",
      alt:type==="image"?"CeyBreez image":""
    };
    state.custom.push(item);
    state.styles[`[data-pb-uid="custom-${id}"]`]={
      desktop:{
        x:30,y:30,
        width:type==="image"?320:type==="button"?140:360,
        height:type==="image"?220:type==="button"?48:type==="heading"?70:90,
        fontSize:type==="heading"?42:type==="button"?16:18,
        lineHeight:type==="heading"?48:type==="button"?22:28,
        padding:type==="button"?12:0,
        borderRadius:type==="button"?8:0,
        backgroundColor:type==="button"?"#087f72":"",
        color:type==="button"?"#ffffff":"",
        zIndex:5
      },tablet:{},mobile:{}
    };
    renderEditorCustomElements();
    assignIds(doc());
    const node=section.querySelector(`[data-pb-id="${CSS.escape(id)}"]`);
    if(node){
      selectElement(node);
      applySelected();
    }
    markDirty();
    toast(`${type[0].toUpperCase()+type.slice(1)} added`);
    setMobilePanel("right");
  }

  function syncSelectedCustom(){
    const item=customItemBySelected();
    if(!item)return;
    if(state.selected.tagName==="IMG"){
      item.url=state.selected.src||"";
      item.alt=state.selected.alt||"";
    }else{
      item.text=state.selected.textContent||"";
      if(item.type==="button")item.url=state.selected.getAttribute("href")||"#";
    }
  }

  function duplicateSelectedElement(){
    if(!state.selected)return toast("Select an item");
    const item=customItemBySelected();
    if(!item)return toast("Only added elements can be duplicated");
    syncSelectedCustom();
    const newId=`pb-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const copy={...item,id:newId,text:item.text?`${item.text} copy`:item.text};
    state.custom.push(copy);
    const sourceKey=state.selector;
    const targetKey=`[data-pb-uid="custom-${newId}"]`;
    const source=state.styles[sourceKey]||{desktop:{},tablet:{},mobile:{}};
    state.styles[targetKey]=JSON.parse(JSON.stringify(source));
    ["desktop","tablet","mobile"].forEach(device=>{
      state.styles[targetKey][device]=state.styles[targetKey][device]||{};
      state.styles[targetKey][device].x=num(state.styles[targetKey][device].x,30)+20;
      state.styles[targetKey][device].y=num(state.styles[targetKey][device].y,30)+20;
    });
    renderEditorCustomElements();assignIds(doc());
    const node=targetSection().querySelector(`[data-pb-id="${CSS.escape(newId)}"]`);
    if(node){selectElement(node);applySelected()}
    markDirty();toast("Element duplicated");
  }

  function deleteSelectedElement(){
    if(!state.selected)return;
    const item=customItemBySelected();
    if(!item)return toast("Original website items cannot be deleted here. Hide or reset them instead.");
    if(!confirm("Delete this added element?"))return;
    state.custom=state.custom.filter(x=>String(x.id)!==String(item.id));
    delete state.styles[state.selector];
    state.selected.remove();
    clearSelection();
    markDirty();toast("Element deleted");
  }

  function changeLayer(delta){
    if(!state.selected)return;
    const r=record();
    r.zIndex=Math.max(0,num(r.zIndex,0)+delta);
    applySelected();
    $("zValue").value=r.zIndex;
    markDirty();
  }

  function setMobilePanel(panel){
    document.body.dataset.mobilePanel=panel;
    document.querySelectorAll("[data-mobile-panel]").forEach(button=>{
      button.classList.toggle("active",button.dataset.mobilePanel===panel);
    });
  }

  function legacyBackground(section,settings){
    if(section?.backgroundImage)return{type:"image",image:section.backgroundImage,size:settings.backgroundSize||"cover",positionX:50,positionY:50,repeat:"no-repeat",overlay:num(settings.overlay,0),slides:[]};
    if(section?.backgroundColor)return{type:"color",color:section.backgroundColor,slides:[]};
    return{type:"none",slides:[]};
  }
  function normalizeSectionBackground(bg){
    const base={type:"none",color:"#ffffff",image:"",size:"cover",customWidth:100,customHeight:100,positionX:50,positionY:50,repeat:"no-repeat",overlay:0,slides:[],duration:5000,effect:"fade",minHeight:"",borderRadius:0};
    return{...base,...(bg||{}),slides:Array.isArray(bg?.slides)?bg.slides:[]};
  }
  function fillSectionInspector(){
    const b=normalizeSectionBackground(state.sectionBackground);
    state.sectionBackground=b;
    $("backgroundType").value=b.type;
    $("sectionBgColor").value=rgbHex(b.color||"#ffffff","#ffffff");
    $("sectionBgImage").value=b.image||"";
    $("sectionBgSize").value=b.size||"cover";
    $("sectionBgWidth").value=num(b.customWidth,100);
    $("sectionBgHeight").value=num(b.customHeight,100);
    $("sectionBgPosX").value=num(b.positionX,50);
    $("sectionBgPosY").value=num(b.positionY,50);
    $("sectionBgPosXOut").textContent=`${num(b.positionX,50)}%`;
    $("sectionBgPosYOut").textContent=`${num(b.positionY,50)}%`;
    $("sectionBgRepeat").value=b.repeat||"no-repeat";
    $("sectionBgOverlay").value=num(b.overlay,0);
    $("slideDuration").value=String(num(b.duration,5000));
    $("slideEffect").value=b.effect||"fade";
    $("sectionMinHeight").value=b.minHeight??"";
    $("sectionRadius").value=num(b.borderRadius,0);
    updateBackgroundControls();
    renderSlideList();
    updateBgPreview();
  }
  function updateBackgroundControls(){
    const type=$("backgroundType").value;
    $("backgroundColorControls").classList.toggle("hidden",type!=="color");
    $("backgroundImageControls").classList.toggle("hidden",type!=="image"&&type!=="slideshow");
    $("slideshowControls").classList.toggle("hidden",type!=="slideshow");
    $("customBgSize").classList.toggle("hidden",$("sectionBgSize").value!=="custom");
  }
  function changeSectionBackground(){
    if(!state.section)return;
    pushHistory();
    state.sectionBackground=normalizeSectionBackground({
      ...state.sectionBackground,
      type:$("backgroundType").value,
      color:$("sectionBgColor").value,
      image:$("sectionBgImage").value.trim(),
      size:$("sectionBgSize").value,
      customWidth:num($("sectionBgWidth").value,100),
      customHeight:num($("sectionBgHeight").value,100),
      positionX:num($("sectionBgPosX").value,50),
      positionY:num($("sectionBgPosY").value,50),
      repeat:$("sectionBgRepeat").value,
      overlay:num($("sectionBgOverlay").value,0),
      duration:num($("slideDuration").value,5000),
      effect:$("slideEffect").value,
      minHeight:$("sectionMinHeight").value===""?"":num($("sectionMinHeight").value),
      borderRadius:num($("sectionRadius").value,0)
    });
    $("sectionBgPosXOut").textContent=`${state.sectionBackground.positionX}%`;
    $("sectionBgPosYOut").textContent=`${state.sectionBackground.positionY}%`;
    updateBackgroundControls();
    updateBgPreview();
    applySectionBackgroundPreview();
    markDirty();
  }
  function backgroundCssSize(b){
    if(b.size==="custom")return`${num(b.customWidth,100)}% ${num(b.customHeight,100)}%`;
    return b.size||"cover";
  }
  function cleanupSectionBackground(section){
    if(!section)return;
    clearInterval(state.slideTimer);state.slideTimer=null;
    section.querySelectorAll(":scope > .pb-bg-slideshow-preview").forEach(n=>n.remove());
    section.style.backgroundImage="";
    section.style.backgroundColor="";
    section.style.backgroundSize="";
    section.style.backgroundPosition="";
    section.style.backgroundRepeat="";
    section.style.minHeight="";
    section.style.borderRadius="";
  }
  function applySectionBackgroundPreview(){
    const section=targetSection();if(!section)return;
    const b=normalizeSectionBackground(state.sectionBackground);
    cleanupSectionBackground(section);
    if(getComputedStyle(section).position==="static")section.style.position="relative";
    if(b.minHeight!=="")section.style.minHeight=`${num(b.minHeight)}px`;
    if(num(b.borderRadius)>0)section.style.borderRadius=`${num(b.borderRadius)}px`;
    const pos=`${num(b.positionX,50)}% ${num(b.positionY,50)}%`;
    const size=backgroundCssSize(b);
    if(b.type==="color"){
      section.style.backgroundColor=b.color||"#ffffff";
    }else if(b.type==="image"&&b.image){
      const ov=Math.max(0,Math.min(90,num(b.overlay,0)))/100;
      section.style.backgroundImage=ov>0?`linear-gradient(rgba(0,0,0,${ov}),rgba(0,0,0,${ov})),url("${b.image}")`:`url("${b.image}")`;
      section.style.backgroundSize=size;
      section.style.backgroundPosition=pos;
      section.style.backgroundRepeat=b.repeat||"no-repeat";
    }else if(b.type==="slideshow"&&b.slides.length){
      const holder=doc().createElement("div");
      holder.className="pb-bg-slideshow-preview";
      holder.style.position="absolute";holder.style.inset="0";holder.style.overflow="hidden";holder.style.pointerEvents="none";holder.style.zIndex="0";
      const layer=doc().createElement("div");
      layer.style.position="absolute";layer.style.inset="0";layer.style.backgroundSize=size;layer.style.backgroundPosition=pos;layer.style.backgroundRepeat=b.repeat||"no-repeat";layer.style.transition="opacity .6s ease, transform .6s ease";
      holder.appendChild(layer);section.prepend(holder);
      [...section.children].forEach(ch=>{if(ch!==holder&&getComputedStyle(ch).position==="static")ch.style.position="relative";if(ch!==holder)ch.style.zIndex=ch.style.zIndex||"1"});
      let i=0;
      const show=()=>{
        const url=b.slides[i%b.slides.length];
        const ov=Math.max(0,Math.min(90,num(b.overlay,0)))/100;
        layer.style.opacity="0";
        setTimeout(()=>{layer.style.backgroundImage=ov>0?`linear-gradient(rgba(0,0,0,${ov}),rgba(0,0,0,${ov})),url("${url}")`:`url("${url}")`;layer.style.transform=b.effect==="slide"?"translateX(0)":"none";layer.style.opacity="1"},120);
        i++;
      };
      show();
      if(b.slides.length>1)state.slideTimer=setInterval(show,Math.max(1500,num(b.duration,5000)));
    }
  }
  function updateBgPreview(){
    const p=$("sectionBgPreview"),b=state.sectionBackground||{};
    const url=b.type==="slideshow"?(b.slides?.[0]||""):b.image;
    p.textContent=url?"":"No image";
    p.style.backgroundImage=url?`url("${url}")`:"";
    p.style.backgroundSize=backgroundCssSize(normalizeSectionBackground(b));
    p.style.backgroundPosition=`${num(b.positionX,50)}% ${num(b.positionY,50)}%`;
    p.style.backgroundRepeat=b.repeat||"no-repeat";
  }
  function renderSlideList(){
    const list=$("slideList"),slides=state.sectionBackground.slides||[];
    if(!slides.length){list.innerHTML='<div class="left-help">No slideshow images added.</div>';return}
    list.innerHTML=slides.map((url,i)=>`<div class="slide-row"><img src="${esc(url)}" alt=""><span>${esc(url.split("/").pop()||`Slide ${i+1}`)}</span><button type="button" data-remove-slide="${i}">×</button></div>`).join("");
    list.querySelectorAll("[data-remove-slide]").forEach(btn=>btn.onclick=()=>{pushHistory();state.sectionBackground.slides.splice(num(btn.dataset.removeSlide),1);renderSlideList();updateBgPreview();applySectionBackgroundPreview();markDirty()});
  }
  async function uploadSectionBackground(){
    const file=$("sectionBgFile").files[0];if(!file)return;
    const url=await uploadBuilderFile(file);if(!url)return;
    $("backgroundType").value="image";$("sectionBgImage").value=url;
    changeSectionBackground();toast("Background uploaded");
  }
  async function uploadSlides(){
    const files=[...$("slideFiles").files];if(!files.length)return;
    setStatus("Uploading slides...");
    const added=[];
    for(const file of files){const url=await uploadBuilderFile(file,false);if(url)added.push(url)}
    state.sectionBackground=normalizeSectionBackground(state.sectionBackground);
    state.sectionBackground.type="slideshow";
    state.sectionBackground.slides=[...state.sectionBackground.slides,...added];
    $("backgroundType").value="slideshow";
    fillSectionInspector();applySectionBackgroundPreview();markDirty();
    setStatus("Unsaved");toast(`${added.length} slideshow image(s) added`);
  }
  async function uploadBuilderFile(file,showStatus=true){
    const fd=new FormData();fd.append("file",file);fd.append("folder","page-builder");
    if(showStatus)setStatus("Uploading...");
    try{
      const r=await fetch(`${API_BASE}/api/admin/upload-image`,{method:"POST",headers:upAuth(),body:fd});
      const data=await r.json();if(!r.ok)throw new Error(data.error||"Upload failed");
      return data.url;
    }catch(e){toast(e.message);setStatus("Upload failed",true);return""}
  }
  function removeSectionBackground(){
    if(!state.section)return;
    pushHistory();
    state.sectionBackground=normalizeSectionBackground({type:"none",slides:[]});
    fillSectionInspector();applySectionBackgroundPreview();markDirty();toast("Background removed");
  }

  async function uploadImage(){const file=$("imageFile").files[0];if(!file)return;const fd=new FormData();fd.append("file",file);fd.append("folder","page-builder");setStatus("Uploading...");try{const r=await fetch(`${API_BASE}/api/admin/upload-image`,{method:"POST",headers:upAuth(),body:fd});const data=await r.json();if(!r.ok)throw new Error(data.error||"Upload failed");$("imageValue").value=data.url;state.selected.src=data.url;syncSelectedCustom();markDirty();toast("Image uploaded")}catch(e){toast(e.message);setStatus("Upload failed",true)}}
  async function save(){if(!state.section)return toast("Select a section first");setStatus("Saving...");const settings={...parseSettings(state.section.settings),elementStyles:state.styles,customElements:state.custom,sectionBackground:state.sectionBackground,sectionLayout:state.sectionLayout};
    const data={...state.section,settings};
    if(state.sectionBackground.type==="image")data.backgroundImage=state.sectionBackground.image||"";
    else if(state.sectionBackground.type==="color")data.backgroundColor=state.sectionBackground.color||"";
    else if(state.sectionBackground.type==="none"){data.backgroundImage="";data.backgroundColor="";}delete data.createdAt;delete data.updatedAt;try{const r=await fetch(`${API_BASE}/api/admin/page-sections`,{method:"POST",headers:auth(),body:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw new Error(result.error||"Save failed");state.dirty=false;setStatus("Saved");toast("Changes saved");await loadSections();state.section=state.sections.find(s=>String(s.id)===String(result.id||state.section.id))||state.section}catch(e){setStatus("Save failed",true);toast(e.message)}}
  gate();
})();