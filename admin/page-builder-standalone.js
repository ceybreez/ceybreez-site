(() => {
  "use strict";
  const API_BASE="https://ceybreez-contact-api.ceybreez.workers.dev";
  const pages={home:"../index.html",villas:"../villas.html",apartments:"../apartments.html",homestays:"../homestays.html",tours:"../tours.html","tour-details":"../tour-details.html",services:"../services.html",contact:"../contact.html",privacy:"../privacy.html",terms:"../terms.html","404":"../404.html"};
  const $=id=>document.getElementById(id);
  const on=(id,event,handler)=>{const el=$(id);if(el)el.addEventListener(event,handler)};
  const valueOf=(id,fallback="")=>{const el=$(id);return el?el.value:fallback};
  const setValue=(id,value)=>{const el=$(id);if(el)el.value=value??""};
  const toggleHidden=(id,hidden)=>{const el=$(id);if(el)el.classList.toggle("hidden",!!hidden)};
  const state={token:localStorage.getItem("CEYBREEZ_ADMIN_TOKEN")||"",page:"home",device:"desktop",sections:[],section:null,selected:null,selector:"",styles:{},custom:[],contentOverrides:{},sectionBackground:{},welcomeSettings:{},zoom:1,history:[],future:[],dirty:false,slideTimer:null};
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

    on("backgroundType","change",changeSectionBackground);
    on("sectionBgColor","input",changeSectionBackground);
    on("sectionBgImage","change",changeSectionBackground);
    on("sectionBgSize","change",changeSectionBackground);
    on("sectionBgWidth","input",changeSectionBackground);
    on("sectionBgHeight","input",changeSectionBackground);
    on("sectionBgPosX","input",changeSectionBackground);
    on("sectionBgPosY","input",changeSectionBackground);
    on("sectionBgRepeat","change",changeSectionBackground);
    on("sectionBgOverlay","input",changeSectionBackground);
    on("sectionHeightMode","change",changeSectionBackground);
    on("sectionHeightValue","input",changeSectionBackground);
    on("sectionPaddingTop","input",changeSectionBackground);
    on("sectionPaddingBottom","input",changeSectionBackground);
    on("sectionRadius","input",changeSectionBackground);
    on("slideDuration","change",changeSectionBackground);
    on("slideEffect","change",changeSectionBackground);
    on("uploadBgBtn","click",()=>$("sectionBgFile")?.click());
    on("sectionBgFile","change",uploadSectionBackground);
    on("addSlidesBtn","click",()=>$("slideFiles")?.click());
    on("slideFiles","change",uploadSlides);
    on("removeBackgroundBtn","click",removeSectionBackground);
    ["welcomeEnabled","welcomeFrequency","welcomeClickToEnter","welcomeShowButton","welcomeButtonText","welcomeAutoSeconds","welcomeFadeDuration","welcomeAnimation"].forEach(id=>{
      on(id,["welcomeEnabled","welcomeClickToEnter","welcomeShowButton"].includes(id)?"change":"input",changeWelcomeSettings);
      if(["welcomeFrequency","welcomeAnimation"].includes(id)) on(id,"change",changeWelcomeSettings);
    });
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
    ["widthValue","heightValue","xValue","yValue","rotateValue","opacityValue","fontSize","lineHeight","letterSpacingValue","radiusValue","paddingValue","borderWidthValue","zValue","objectPosXValue","objectPosYValue"].forEach(id=>$(id).addEventListener("input",()=>changeNumeric(id)));
    on("autoHeightToggle","change",toggleAutoHeight);
    ["fontFamily","shadowValue","textTransformValue","objectFitValue","borderStyleValue"].forEach(id=>$(id).onchange=()=>changeSimple(id));
    ["textColor","bgColor","borderColorValue"].forEach(id=>$(id).oninput=()=>changeSimple(id));
    $("textValue").oninput=()=>{if(!state.selected)return;state.selected.textContent=$("textValue").value;syncSelectedCustom();captureSelectedContent();markDirty()};
    $("imageValue").onchange=()=>{if(!state.selected)return;state.selected.src=$("imageValue").value;syncSelectedCustom();captureSelectedContent();markDirty()};
    on("altValue","input",()=>{if(!state.selected)return;state.selected.alt=valueOf("altValue");syncSelectedCustom();captureSelectedContent();markDirty()});
    on("linkValue","input",changeSelectedLink);
    document.querySelectorAll("[data-format]").forEach(b=>b.onclick=()=>toggleFormat(b.dataset.format));
    document.querySelectorAll("[data-align]").forEach(b=>b.onclick=()=>setAlign(b.dataset.align));
    window.addEventListener("beforeunload",e=>{if(state.dirty){e.preventDefault();e.returnValue=""}});
  }
  function setDevice(device){state.device=device;const dl=$("deviceToolLabel");if(dl)dl.textContent=device[0].toUpperCase()+device.slice(1);document.querySelectorAll("[data-device]").forEach(b=>b.classList.toggle("active",b.dataset.device===device));$("frameShell").className=`frame-shell ${device}`;$("deviceNote").classList.toggle("hidden",device==="desktop");applyAll();fillInspector()}
  function setZoom(z){state.zoom=Math.round(z*10)/10;$("frameShell").style.transform=`scale(${state.zoom})`;$("zoomLabel").textContent=`${Math.round(state.zoom*100)}%`}
  async function loadSections(){
    setStatus("Loading...");
    try{const r=await fetch(`${API_BASE}/api/admin/page-sections?page=${encodeURIComponent(state.page)}`,{headers:auth()});const data=await r.json();if(!r.ok)throw new Error(data.error||"Unable to load sections");state.sections=Array.isArray(data)?data:(data.sections||[]);
      renderSections();
      afterFrameReady(()=>mergeStaticSectionsFromFrame());
      setStatus("Ready")}
    catch(e){setStatus("Login required",true);toast(e.message);if(e.message.toLowerCase().includes("unauthor")){localStorage.removeItem("CEYBREEZ_ADMIN_TOKEN")}}
  }

  function mergeStaticSectionsFromFrame(){
    const d=doc();
    if(!d)return;

    const found=[...d.querySelectorAll("[data-section]")].map((el,index)=>{
      const key=(el.dataset.section||"").trim();
      if(!key)return null;
      const heading=el.querySelector("h1,h2,h3");
      const label=(heading?.textContent||key)
        .replace(/\s+/g," ")
        .trim();

      return {
        id:`static:${key}`,
        page:state.page,
        sectionKey:key,
        sectionType:el.tagName.toLowerCase(),
        title:label || key,
        sortOrder:index+1,
        isActive:1,
        active:1,
        isVisible:1,
        settings:"{}",
        __synthetic:true
      };
    }).filter(Boolean);

    const savedByKey=new Map(
      (state.sections||[]).map(s=>[String(s.sectionKey||""),s])
    );

    const merged=found.map(item=>savedByKey.get(item.sectionKey)||item);

    (state.sections||[]).forEach(s=>{
      if(!merged.some(m=>String(m.sectionKey)===String(s.sectionKey))){
        merged.push(s);
      }
    });

    const selectedKey=state.section?.sectionKey;
    state.sections=merged;
    if(selectedKey){
      state.section=state.sections.find(s=>s.sectionKey===selectedKey)||state.section;
    }
    renderSections();
  }

  function renderSections(){
    const list=$("sectionList");if(!state.sections.length){list.innerHTML='<div class="left-help">No saved sections found for this page.</div>';state.section=null;return}
    list.innerHTML=state.sections.sort((a,b)=>num(a.sortOrder)-num(b.sortOrder)).map((s,i)=>`<button class="section-item ${state.section&&String(state.section.sectionKey)===String(s.sectionKey)?"active":""}" data-section-key="${esc(s.sectionKey||"")}"><strong>${esc(s.title||s.sectionKey||`Section ${i+1}`)}</strong><span>${esc(s.sectionKey||s.sectionType||"")} · ${(s.isActive===0||s.active===0||s.isVisible===0)?"Hidden":"Active"}</span></button>`).join("");
    list.querySelectorAll(".section-item").forEach(b=>b.onclick=()=>selectSectionByKey(b.dataset.sectionKey,{scroll:true}));
    if(!state.section)selectSectionByKey(state.sections[0].sectionKey,{scroll:true});
  }
  function selectSection(id){
    const found=state.sections.find(s=>String(s.id)===String(id));
    if(found)return selectSectionByKey(found.sectionKey,{scroll:true});
  }
  function selectSectionByKey(key,options={}){
    const next=state.sections.find(s=>String(s.sectionKey)===String(key));
    if(!next)return false;
    state.section=next;
    const settings=parseSettings(state.section.settings);
    state.styles=settings.elementStyles||{};
    state.custom=settings.customElements||[];
    state.contentOverrides=settings.contentOverrides||{};
    state.sectionBackground=normalizeSectionBackground(settings.sectionBackground||legacyBackground(state.section,settings));
    state.welcomeSettings=normalizeWelcomeSettings(settings.welcomeSettings||{});
    clearSelection();
    renderSections();
    try{fillSectionInspector()}catch(error){console.warn("Section inspector control missing:",error)}
    const editing=$("editingLabel");if(editing)editing.textContent=`Editing: ${state.section.title||state.section.sectionKey}`;
    const name=$("sectionName");if(name)name.textContent=state.section.title||state.section.sectionKey||"Section";
    afterFrameReady(()=>{
      syncPreviewSectionVisibility();markSection();applyAll();applySectionBackgroundPreview();
      if(options.scroll){
        const section=targetSection();
        section?.scrollIntoView?.({behavior:"smooth",block:"center"});
      }
      if(typeof options.after==="function")options.after();
    });
    return true;
  }
  function parseSettings(v){if(!v)return{};if(typeof v==="object")return v;try{return JSON.parse(v)}catch{return{}}}
  function loadFrame(){
    const f=$("previewFrame");
    f.onload=()=>{
      const w=f.contentWindow;
      let prepared=false;
      const finish=()=>{
        if(prepared)return;
        prepared=true;
        prepareFrame();
        mergeStaticSectionsFromFrame();
        if(state.section)markSection();
        applyAll();
      };
      if(w?.CEYBREEZ_BUILDER_DATA_READY){
        finish();
      }else{
        w?.addEventListener("ceybreez:builder-frame-ready",finish,{once:true});
        // Fallback only for pages that do not include page-builder.js.
        setTimeout(finish,2500);
      }
    };
    f.src=`${pages[state.page]}?builder=${Date.now()}`;
  }
  function afterFrameReady(fn){const f=$("previewFrame");if(f.contentDocument?.readyState==="complete")fn();else f.addEventListener("load",fn,{once:true})}
  function doc(){return $("previewFrame").contentDocument}
  function targetSection(){const d=doc();if(!d||!state.section)return null;return d.querySelector(`[data-section="${CSS.escape(state.section.sectionKey||"")}"]`)||[...d.querySelectorAll("section,header,main,footer")][num(state.section.sortOrder,1)-1]||d.body}
  function syncPreviewSectionVisibility(){
    const d=doc();
    if(!d)return;
    const welcome=d.getElementById("welcomeScreen")||d.querySelector('[data-section="welcome"]');
    const editingWelcome=String(state.section?.sectionKey||"").toLowerCase()==="welcome";
    if(welcome){
      welcome.style.setProperty("display",editingWelcome?"flex":"none","important");
      welcome.style.pointerEvents=editingWelcome?"auto":"none";
      welcome.classList.toggle("hide",false);
    }
    d.body.classList.toggle("entered",!editingWelcome);
    const main=d.getElementById("mainSite");
    if(main){
      main.style.visibility="visible";
      main.style.pointerEvents=editingWelcome?"none":"auto";
    }
  }
  function prepareFrame(){const d=doc();if(!d)return;
    d.body.classList.add("cms-ready");
    syncPreviewSectionVisibility();
    mergeStaticSectionsFromFrame();
    renderEditorCustomElements();let st=d.getElementById("ceybreez-standalone-editor");if(!st){st=d.createElement("style");st.id="ceybreez-standalone-editor";st.textContent=`body.pb-editing *{cursor:default}.pb-edit-section{outline:2px dashed rgba(8,127,114,.6)!important;outline-offset:-2px}.pb-selected{outline:2px solid #00a993!important;outline-offset:3px!important;cursor:move!important}.pb-selected::after{content:attr(data-pb-label);position:absolute;left:0;top:-25px;background:#087f72;color:#fff;font:11px Arial;padding:4px 7px;border-radius:4px;z-index:2147483646;white-space:nowrap}.pb-custom{position:absolute!important}`;d.head.appendChild(st)}d.body.classList.add("pb-editing");assignIds(d);if(!d.__ceybreezBuilderBound){d.__ceybreezBuilderBound=true;d.addEventListener("pointerdown",pointerDown,true);d.addEventListener("click",selectClick,true);d.addEventListener("dblclick",beginInlineEdit,true)}}
  function stablePath(el,section){
    if(!el||el===section)return "root";
    const parts=[];
    let node=el;
    while(node&&node!==section){
      const parent=node.parentElement;
      if(!parent)break;
      const siblings=[...parent.children].filter(x=>
        !x.classList.contains("pb5-selection-box") &&
        !x.classList.contains("pb4-resize-handle") &&
        !x.classList.contains("pb-bg-slideshow-preview")
      );
      parts.unshift(Math.max(0,siblings.indexOf(node)).toString(36));
      node=parent;
    }
    return parts.join("-")||"root";
  }
  function assignIds(d){
    if(!d)return;
    d.querySelectorAll("[data-section]").forEach(section=>{
      const key=String(section.dataset.section||"section").replace(/[^a-zA-Z0-9_-]/g,"_");
      [section,...section.querySelectorAll("*")].forEach(el=>{
        el.dataset.pbUid=el.dataset.pbId
          ? `custom-${el.dataset.pbId}`
          : `${key}-${stablePath(el,section)}`;
      });
    });
  }
  function frameStyle(el){
    return doc()?.defaultView?.getComputedStyle(el) || window.getComputedStyle(el);
  }
  function markSection(){const d=doc();if(!d)return;syncPreviewSectionVisibility();d.querySelectorAll(".pb-edit-section").forEach(n=>n.classList.remove("pb-edit-section"));targetSection()?.classList.add("pb-edit-section")}
  function resolveSelectable(raw){
    const section=targetSection();
    if(!section||!raw||!section.contains(raw))return null;
    const custom=raw.closest?.("[data-pb-id]");
    if(custom&&section.contains(custom))return custom;
    const meaningful=raw.closest?.("[data-field],img,video,iframe,button,a,h1,h2,h3,h4,h5,h6,p,blockquote,li,.thing-card,.featured-card,.card,.cms-card,.pb-block");
    if(meaningful&&section.contains(meaningful))return meaningful;
    return raw===section?section:raw;
  }
  function selectorFor(el){
    if(el.dataset.pbId)return `[data-pb-id="${CSS.escape(el.dataset.pbId)}"]`;
    if(el.id)return `#${CSS.escape(el.id)}`;
    if(el.dataset.field){
      const section=targetSection();
      const matches=section?[...section.querySelectorAll(`[data-field="${CSS.escape(el.dataset.field)}"]`)]:[];
      if(matches.length===1)return `[data-field="${CSS.escape(el.dataset.field)}"]`;
    }
    return `[data-pb-uid="${CSS.escape(el.dataset.pbUid||"")}"]`;
  }
  function sectionKeyFromNode(node){
    const owner=node?.closest?.("[data-section]");
    return owner?.dataset?.section||"";
  }
  function selectClick(e){
    const raw=e.target;
    const clickedKey=sectionKeyFromNode(raw);
    if(clickedKey&&String(clickedKey)!==String(state.section?.sectionKey||"")){
      e.preventDefault();e.stopPropagation();
      selectSectionByKey(clickedKey,{after:()=>{
        const target=resolveSelectable(raw);
        if(target)selectElement(target);
      }});
      return;
    }
    const target=resolveSelectable(raw);
    if(!target)return;
    e.preventDefault();e.stopPropagation();selectElement(target);
  }
  function selectElement(raw){const section=targetSection();let el=resolveSelectable(raw);if(!el)return;if(el===section){el=section.querySelector("[data-field],h1,h2,h3,p,img,a,button")||section;}doc().querySelectorAll(".pb-selected").forEach(n=>n.classList.remove("pb-selected"));state.selected=el;state.selector=selectorFor(el);el.classList.add("pb-selected");el.dataset.pbLabel=niceName(el);$("emptyInspector").classList.add("hidden");$("elementInspector").classList.remove("hidden");fillInspector()}
  function niceName(el){if(el.dataset.field)return el.dataset.field.replace(/[-_]/g," ");if(el.alt)return`Image: ${el.alt}`;return el.tagName.toLowerCase()}
  function clearSelection(){try{doc()?.querySelectorAll(".pb-selected").forEach(n=>n.classList.remove("pb-selected"))}catch{}state.selected=null;state.selector="";$("emptyInspector").classList.remove("hidden");$("elementInspector").classList.add("hidden")}
  function record(create=true){if(!state.selector)return null;let all=state.styles[state.selector];if(!all&&create)all=state.styles[state.selector]={desktop:{},tablet:{},mobile:{}};if(!all)return null;if(!all[state.device]&&create)all[state.device]={};return all[state.device]}
  function mergedRecord(){const all=state.styles[state.selector]||{};return state.device==="desktop"?{...(all.desktop||{})}:{...(all.desktop||{}),...(all[state.device]||{})}}
  function selectedKind(){const item=customItemBySelected();if(item?.type)return item.type;const tag=state.selected?.tagName?.toLowerCase()||"element";if(tag==="img")return"image";if(tag==="video"||tag==="iframe")return"video";if(tag==="a"||tag==="button")return"button";if(/^h[1-6]$/.test(tag))return"heading";if(["p","span","small","strong","blockquote","li"].includes(tag))return"text";return tag}
  function updateInspectorTools(){const kind=selectedKind();const textKinds=["heading","text","button","badge","icon","review-card","service-card","property-card","tour-card"];const imageKind=kind==="image"||state.selected?.tagName==="IMG";const linkKind=kind==="button"||state.selected?.tagName==="A"||["property-card","tour-card","map"].includes(kind);document.querySelectorAll('[data-tool-group="typography"]').forEach(n=>n.classList.toggle("hidden",!textKinds.includes(kind)));document.querySelectorAll('[data-tool-group="image"]').forEach(n=>n.classList.toggle("hidden",!imageKind));toggleHidden("textControl",imageKind||kind==="video"||kind==="divider"||kind==="spacer");toggleHidden("imageControl",!imageKind);toggleHidden("altControl",!imageKind);toggleHidden("linkControl",!linkKind);const st=$("selectedType");if(st)st.textContent=kind.replaceAll("-"," ").toUpperCase()}
  function contentRecord(create=true){if(!state.selector)return null;let r=state.contentOverrides[state.selector];if(!r&&create)r=state.contentOverrides[state.selector]={};return r||null}
  function captureSelectedContent(){if(!state.selected||state.selected.dataset.pbId)return;const r=contentRecord();if(state.selected.tagName==="IMG"){r.src=state.selected.getAttribute("src")||"";r.alt=state.selected.getAttribute("alt")||""}else{r.text=state.selected.textContent||""}if(state.selected.matches("a,button"))r.href=state.selected.getAttribute("href")||""}
  function applyContentOverrides(section=targetSection()){if(!section)return;Object.entries(state.contentOverrides||{}).forEach(([sel,r])=>{let el;try{el=section.querySelector(sel)}catch{}if(!el)return;if(r.text!==undefined&&el.tagName!=="IMG")el.textContent=r.text;if(r.src!==undefined&&el.tagName==="IMG")el.src=r.src;if(r.alt!==undefined&&el.tagName==="IMG")el.alt=r.alt;if(r.href!==undefined&&el.matches("a,button"))el.setAttribute("href",r.href)})}
  function fillInspector(){if(!state.selected)return;const r=mergedRecord();const rect=state.selected.getBoundingClientRect();$("selectedName").textContent=niceName(state.selected);updateInspectorTools();const isImg=state.selected.tagName==="IMG";if(isImg){setValue("imageValue",state.selected.src||"");setValue("altValue",state.selected.alt||"")}else setValue("textValue",state.selected.textContent||"");const item=customItemBySelected();setValue("linkValue",item?.url||state.selected.getAttribute?.("href")||"");const cs=frameStyle(state.selected);const pos=(r.objectPosition||cs.objectPosition||"50% 50%").split(/\s+/);const vals={widthValue:r.width??Math.round(rect.width),heightValue:r.height??Math.round(rect.height),xValue:r.x??0,yValue:r.y??0,rotateValue:r.rotate??0,opacityValue:r.opacity??1,fontSize:r.fontSize??(parseFloat(cs.fontSize)||16),lineHeight:r.lineHeight??(parseFloat(cs.lineHeight)||20),letterSpacingValue:r.letterSpacing??(parseFloat(cs.letterSpacing)||0),radiusValue:r.borderRadius??(parseFloat(cs.borderRadius)||0),paddingValue:r.padding??(parseFloat(cs.padding)||0),borderWidthValue:r.borderWidth??(parseFloat(cs.borderWidth)||0),zValue:r.zIndex??0,objectPosXValue:parseFloat(pos[0])||50,objectPosYValue:parseFloat(pos[1])||50};Object.entries(vals).forEach(([id,v])=>setValue(id,Math.round(v*100)/100));const auto=$("autoHeightToggle");if(auto)auto.checked=r.autoHeight!==false;setValue("fontFamily",r.fontFamily||"");setValue("shadowValue",r.boxShadow||"");setValue("textTransformValue",r.textTransform||"");setValue("objectFitValue",r.objectFit||cs.objectFit||"cover");setValue("borderStyleValue",r.borderStyle||cs.borderStyle||"");setValue("textColor",rgbHex(r.color||cs.color,"#222222"));setValue("bgColor",rgbHex(r.backgroundColor||cs.backgroundColor,"#ffffff"));setValue("borderColorValue",rgbHex(r.borderColor||cs.borderColor,"#000000"))}
  function rgbHex(v,f){if(!v||v==="transparent"||v.includes("rgba(0, 0, 0, 0)"))return f;if(v.startsWith("#"))return v.slice(0,7);const m=v.match(/\d+/g);if(!m)return f;return"#"+m.slice(0,3).map(x=>(+x).toString(16).padStart(2,"0")).join("")}
  function pushHistory(){state.history.push(JSON.stringify(state.styles));if(state.history.length>40)state.history.shift();state.future=[]}
  function undo(){if(!state.history.length)return;state.future.push(JSON.stringify(state.styles));state.styles=JSON.parse(state.history.pop());applyAll();fillInspector();markDirty()}
  function redo(){if(!state.future.length)return;state.history.push(JSON.stringify(state.styles));state.styles=JSON.parse(state.future.pop());applyAll();fillInspector();markDirty()}
  function markDirty(){state.dirty=true;setStatus("Unsaved")}
  function currentAspectRatio(){
    if(!state.selected)return 1;
    const r=mergedRecord();
    if(num(r.aspectRatio)>0)return num(r.aspectRatio);
    if(state.selected.tagName==="IMG"&&state.selected.naturalWidth&&state.selected.naturalHeight)return state.selected.naturalWidth/state.selected.naturalHeight;
    const rect=state.selected.getBoundingClientRect();
    const w=num(r.width,rect.width),h=num(r.height,rect.height);
    return w>0&&h>0?w/h:1;
  }
  function toggleAutoHeight(){
    if(!state.selected)return;
    pushHistory();
    const r=record();
    r.autoHeight=$("autoHeightToggle").checked;
    if(r.autoHeight)r.aspectRatio=currentAspectRatio();
    markDirty();
  }
  function changeNumeric(id){
    if(!state.selected)return;
    pushHistory();
    const map={widthValue:"width",heightValue:"height",xValue:"x",yValue:"y",rotateValue:"rotate",opacityValue:"opacity",fontSize:"fontSize",lineHeight:"lineHeight",letterSpacingValue:"letterSpacing",radiusValue:"borderRadius",paddingValue:"padding",borderWidthValue:"borderWidth",zValue:"zIndex",objectPosXValue:"objectPosX",objectPosYValue:"objectPosY"};
    const r=record();
    const value=num($(id).value);
    if(state.selected?.dataset?.pbId)r.designWidth=customParentWidth(state.selected);
    if(id==="widthValue"){
      const ratio=currentAspectRatio();
      r.width=value;
      if(state.selected?.dataset?.pbId){
        r.widthPercent=(value/customParentWidth(state.selected))*100;
        r.coordinateMode="responsive";
      }
      if($("autoHeightToggle")?.checked){
        r.autoHeight=true;
        r.aspectRatio=ratio;
        r.height=Math.max(1,Math.round((value/Math.max(.0001,ratio))*100)/100);
        $("heightValue").value=r.height;
      }
    }else if(id==="heightValue"){
      r.height=value;
      const width=num(r.width,$("widthValue").value);
      if(width>0&&value>0)r.aspectRatio=width/value;
    }else{
      r[map[id]]=value;if(id==="objectPosXValue"||id==="objectPosYValue")r.objectPosition=`${num(valueOf("objectPosXValue"),50)}% ${num(valueOf("objectPosYValue"),50)}%`;
      if(id==="xValue"&&state.selected?.dataset?.pbId){
        r.xPercent=(value/customParentWidth(state.selected))*100;
        r.coordinateMode="responsive";
      }
    }
    applySelected();
    markDirty();
  }
  function changeSimple(id){if(!state.selected)return;pushHistory();const map={fontFamily:"fontFamily",shadowValue:"boxShadow",textColor:"color",bgColor:"backgroundColor",textTransformValue:"textTransform",objectFitValue:"objectFit",borderStyleValue:"borderStyle",borderColorValue:"borderColor"};record()[map[id]]=$(id).value;applySelected();markDirty()}
  function toggleFormat(k){if(!state.selected)return;pushHistory();const r=record();if(k==="bold")r.fontWeight=r.fontWeight==="700"?"":"700";if(k==="italic")r.fontStyle=r.fontStyle==="italic"?"":"italic";if(k==="underline")r.textDecoration=r.textDecoration==="underline"?"":"underline";applySelected();markDirty()}
  function setAlign(a){if(!state.selected)return;pushHistory();record().textAlign=a;applySelected();markDirty()}
  function autoFitEditorSection(){
    const section=targetSection();
    if(!section)return;
    const bg=state.sectionBackground||{};
    const dh=bg.deviceHeights?.[state.device]||{};
    const mode=dh.mode||bg.heightMode||"auto";
    if(mode==="fixed"||mode==="screen")return;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const top=section.getBoundingClientRect().top;
      let bottom=0;
      section.querySelectorAll('[data-pb-editor-custom="1"]').forEach(el=>{
        if(frameStyle(el).display==="none")return;
        const rect=el.getBoundingClientRect();
        bottom=Math.max(bottom,rect.bottom-top);
      });
      if(bottom>0){
        const pad=Math.max(24,parseFloat(frameStyle(section).paddingBottom)||0);
        section.style.minHeight=`${Math.ceil(bottom+pad)}px`;
        section.style.overflow="visible";
      }
    }));
  }
  function applyAll(){const section=targetSection();if(!section)return;renderEditorCustomElements();assignIds(doc());applyContentOverrides(section);Object.entries(state.styles).forEach(([sel,by])=>{let el;try{el=section.querySelector(sel)}catch{}if(!el)return;const r=state.device==="desktop"?{...(by.desktop||{})}:{...(by.desktop||{}),...(by[state.device]||{})};applyRecord(el,r)});if(state.selector){try{state.selected=section.querySelector(state.selector)}catch{}if(state.selected){state.selected.classList.add("pb-selected");state.selected.dataset.pbLabel=niceName(state.selected)}}applySectionBackgroundPreview();applyWelcomePreview();autoFitEditorSection()}
  function applySelected(){if(state.selected)applyRecord(state.selected,mergedRecord())}
  function customParentWidth(el){
    const parent=el?.parentElement;
    return Math.max(1,parent?.clientWidth||targetSection()?.clientWidth||1200);
  }
  function syncResponsiveCustomRecord(el,r){
    if(!el?.dataset?.pbId||!r)return r;
    const pw=customParentWidth(el);
    if(r.xPercent===undefined)r.xPercent=(num(r.x,0)/pw)*100;
    if(r.widthPercent===undefined&&r.width!==undefined)r.widthPercent=(num(r.width,0)/pw)*100;
    r.coordinateMode="responsive";
    return r;
  }
  function applyRecord(el,r){if(!el)return;
    if(el.dataset.pbId){
      const parent=el.parentElement;
      if(parent&&frameStyle(parent).position==="static")parent.style.position="relative";
      syncResponsiveCustomRecord(el,r);
      const parentWidth=customParentWidth(el);
      const fallbackDesignWidth=state.device==="mobile"?390:(state.device==="tablet"?768:1200);
      const designWidth=Math.max(1,num(r.designWidth,fallbackDesignWidth));
      const scale=parentWidth/designWidth;
      const xPercent=r.xPercent!==undefined?num(r.xPercent):(num(r.x,0)/designWidth)*100;
      const widthPercent=r.widthPercent!==undefined?num(r.widthPercent):(r.width!==undefined?(num(r.width,0)/designWidth)*100:null);
      const clampedX=Math.max(0,Math.min(100,xPercent));
      el.style.boxSizing="border-box";
      el.style.position="absolute";
      el.style.left=`${clampedX}%`;
      el.style.top=`${Math.max(0,num(r.y,20)*scale)}px`;
      el.style.width=widthPercent!==null?`${Math.max(1,Math.min(100-clampedX,widthPercent))}%`:"";
      if(r.autoHeight!==false){
        el.style.height="auto";
        if(num(r.aspectRatio)>0)el.style.aspectRatio=String(num(r.aspectRatio));
      }else{
        el.style.height=r.height!==undefined?`${Math.max(1,num(r.height)*scale)}px`:"";
        el.style.aspectRatio="";
      }
      el.style.maxWidth=`calc(100% - ${clampedX}%)`;
      el.style.transform=`rotate(${num(r.rotate)}deg)`;
      ["fontSize","lineHeight","letterSpacing","borderRadius","padding","borderWidth"].forEach(k=>el.style[k]=r[k]!==undefined?`${num(r[k])}px`:"");
      ["opacity","fontFamily","fontWeight","fontStyle","textDecoration","textAlign","textTransform","color","backgroundColor","borderStyle","borderColor","boxShadow","zIndex","objectFit","objectPosition"].forEach(k=>el.style[k]=r[k]!==undefined?r[k]:"");
      return;
    }
    const first=!el.dataset.pbBaseW;const rect=el.getBoundingClientRect();if(first){el.dataset.pbBaseW=String(Math.max(1,rect.width));el.dataset.pbBaseH=String(Math.max(1,rect.height));el.dataset.pbBaseWidth=el.style.width||"";el.dataset.pbBaseHeight=el.style.height||""}const bw=num(el.dataset.pbBaseW,rect.width||1),bh=num(el.dataset.pbBaseH,rect.height||1),w=num(r.width,bw),h=num(r.height,bh);el.style.position="relative";el.style.width=el.dataset.pbBaseWidth;el.style.height=el.dataset.pbBaseHeight;el.style.transformOrigin="center center";el.style.transform=`translate(${num(r.x)}px,${num(r.y)}px) scale(${w/bw},${h/bh}) rotate(${num(r.rotate)}deg)`;const px=["fontSize","lineHeight","letterSpacing","borderRadius","padding","borderWidth"];px.forEach(k=>el.style[k]=r[k]!==undefined?`${num(r[k])}px`:"");["opacity","fontFamily","fontWeight","fontStyle","textDecoration","textAlign","textTransform","color","backgroundColor","borderStyle","borderColor","boxShadow","zIndex","objectFit","objectPosition"].forEach(k=>el.style[k]=r[k]!==undefined?r[k]:"")}
  let drag=null;
  function pointerDown(e){
    const section=targetSection();
    if(!section||!section.contains(e.target)||e.button!==0)return;
    const target=resolveSelectable(e.target);
    if(!target)return;
    selectElement(target);
    const r=mergedRecord();
    drag={sx:e.clientX,sy:e.clientY,x:num(r.x),y:num(r.y),moved:false,target};
    doc().addEventListener("pointermove",pointerMove,true);
    doc().addEventListener("pointerup",pointerUp,true);
    e.preventDefault();e.stopPropagation();
  }
  function pointerMove(e){
    if(!drag||!state.selected)return;
    const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;
    if(Math.abs(dx)+Math.abs(dy)<3)return;
    drag.moved=true;
    const rr=record();rr.x=Math.round(drag.x+dx);rr.y=Math.round(drag.y+dy);
    if(state.selected.dataset.pbId){rr.xPercent=(rr.x/customParentWidth(state.selected))*100;rr.coordinateMode="responsive";}
    applySelected();$("xValue").value=rr.x;$("yValue").value=rr.y;markDirty();e.preventDefault();
  }
  function pointerUp(){
    if(drag?.moved)pushHistory();
    drag=null;
    doc().removeEventListener("pointermove",pointerMove,true);
    doc().removeEventListener("pointerup",pointerUp,true);
  }
  function resetSelected(){if(!state.selector)return;pushHistory();delete state.styles[state.selector];const el=state.selected;if(el){["position","width","height","transform","transformOrigin","fontSize","lineHeight","letterSpacing","borderRadius","padding","borderWidth","opacity","fontFamily","fontWeight","fontStyle","textDecoration","textAlign","textTransform","color","backgroundColor","borderStyle","borderColor","boxShadow","zIndex","objectFit","objectPosition"].forEach(k=>el.style[k]="")}markDirty();fillInspector()}
  function useMain(){if(state.device==="desktop"||!state.selector)return;pushHistory();const all=state.styles[state.selector];if(all)all[state.device]={};applyAll();fillInspector();markDirty();toast("Using Main Web settings")}


  function customItemBySelected(){
    const id=state.selected?.dataset?.pbId;
    return id?state.custom.find(item=>String(item.id)===String(id)):null;
  }

  function customTemplate(type,item){
    const d=doc();
    const wrap=d.createElement("div");
    const make=(tag,cls,text)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
    if(type==="section"){wrap.className="pb-block pb-section-block";wrap.append(make("div","pb-block-kicker","NEW SECTION"),make("h2","pb-block-title",item.text||"Your premium section"),make("p","pb-block-copy","Add content, images and calls to action here."));}
    else if(type==="container"){wrap.className="pb-block pb-container-block";wrap.append(make("span","","Container"));}
    else if(type==="columns"){wrap.className="pb-block pb-columns-block";["Column one","Column two","Column three"].forEach(t=>wrap.append(make("div","pb-column",t)));}
    else if(type==="spacer"){wrap.className="pb-spacer-block";wrap.setAttribute("aria-label","Spacer");}
    else if(type==="divider"){wrap.className="pb-divider-block";}
    else if(type==="heading"){const n=make("h2","pb-basic-heading",item.text||"New heading");return n;}
    else if(type==="text"){const n=make("p","pb-basic-text",item.text||"New text");return n;}
    else if(type==="button"){const n=make("a","pb-basic-button",item.text||"Explore");n.href=item.url||"#";return n;}
    else if(type==="icon"){const n=make("div","pb-icon-block",item.text||"✦");return n;}
    else if(type==="badge"){const n=make("span","pb-badge-block",item.text||"CEYBREEZ");return n;}
    else if(type==="image"){const n=d.createElement("img");n.className="pb-basic-image";n.src=item.url||"../images/cover.jpg";n.alt=item.alt||"CeyBreez image";return n;}
    else if(type==="gallery"){wrap.className="pb-block pb-gallery-block";["../images/beach.jpg","../images/mountains.jpg","../images/nature.jpg"].forEach(src=>{const i=d.createElement("img");i.src=src;i.alt="Gallery image";wrap.append(i)});}
    else if(type==="video"){const n=d.createElement("video");n.className="pb-video-block";n.controls=true;n.muted=true;n.poster="../images/cover.jpg";return n;}
    else if(type==="property-card"){wrap.className="pb-block pb-card-block";const i=d.createElement("img");i.src="../images/cover.jpg";i.alt="Property";wrap.append(i,make("small","","CEYBREEZ STAYS"),make("h3","",item.text||"Luxury Property"),make("p","","Private comfort, thoughtful details and island character."),make("a","pb-card-link","View property →"));}
    else if(type==="tour-card"){wrap.className="pb-block pb-card-block";const i=d.createElement("img");i.src="../images/train.jpg";i.alt="Tour";wrap.append(i,make("small","","CURATED JOURNEY"),make("h3","",item.text||"Sri Lanka Experience"),make("p","","A memorable route designed around culture, nature and comfort."),make("a","pb-card-link","Explore tour →"));}
    else if(type==="service-card"){wrap.className="pb-block pb-mini-card";wrap.append(make("div","pb-icon-block","◇"),make("h3","",item.text||"Premium Service"),make("p","","Personal support before, during and after your stay."));}
    else if(type==="review-card"){wrap.className="pb-block pb-review-card";wrap.append(make("div","pb-stars","★★★★★"),make("blockquote","",item.text||"A wonderful CeyBreez experience from start to finish."),make("strong","","Guest Review"));}
    else if(type==="inquiry-form"||type==="booking-form"){wrap.className="pb-block pb-form-block";wrap.append(make("h3","",type==="booking-form"?"Book your stay":"Send an inquiry"));["Name","Email","Phone"].forEach(x=>{const i=d.createElement("input");i.placeholder=x;wrap.append(i)});if(type==="booking-form"){["Check-in","Check-out"].forEach(x=>{const i=d.createElement("input");i.placeholder=x;wrap.append(i)})}const b=make("button","",type==="booking-form"?"Check availability":"Send inquiry");b.type="button";wrap.append(b);}
    else if(type==="map"){wrap.className="pb-block pb-map-block";wrap.append(make("div","pb-map-pin","⌖"),make("strong","","CeyBreez Location"),make("span","","Connect Google Maps URL in the element settings."));}
    else {wrap.className="pb-block";wrap.textContent=item.text||type;}
    return wrap;
  }

  function renderEditorCustomElements(){
    const section=targetSection();
    if(!section)return;
    section.querySelectorAll('[data-pb-editor-custom="1"]').forEach(node=>node.remove());
    (state.custom||[]).forEach(item=>{
      if(item.sectionKey!==state.section?.sectionKey)return;
      const node=customTemplate(item.type,item);
      node.dataset.pbEditorCustom="1";
      node.dataset.pbId=item.id;
      node.dataset.pbUid=`custom-${item.id}`;
      node.dataset.pbType=item.type;
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
      text:type==="heading"?"New heading":type==="button"?"Explore":type==="text"?"New text":type==="badge"?"CEYBREEZ":type==="icon"?"✦":"",
      url:type==="image"?"../images/cover.jpg":type==="button"?"#":"",
      alt:type==="image"?"CeyBreez image":""
    };
    state.custom.push(item);
    state.styles[`[data-pb-uid="custom-${id}"]`]={
      desktop:{
        positioned:true,coordinateMode:"responsive",designWidth:1200,x:30,xPercent:2.5,y:30,
        widthPercent:["section","container","columns","gallery","inquiry-form","booking-form","map"].includes(type)?63.333:["property-card","tour-card"].includes(type)?28.333:type==="image"?26.667:type==="button"?12.5:type==="divider"?35:type==="spacer"?25:30,
        width:["section","container","columns","gallery","inquiry-form","booking-form","map"].includes(type)?760:["property-card","tour-card"].includes(type)?340:type==="image"?320:type==="button"?150:type==="divider"?420:type==="spacer"?300:360,
        autoHeight:true,
        height:type==="section"?280:type==="container"?120:type==="columns"?180:type==="gallery"?230:["inquiry-form","booking-form"].includes(type)?360:type==="map"?260:["property-card","tour-card"].includes(type)?430:type==="service-card"?230:type==="review-card"?220:type==="image"?220:type==="button"?48:type==="divider"?8:type==="spacer"?80:type==="heading"?70:90,
        fontSize:type==="heading"?42:type==="button"?16:18,
        lineHeight:type==="heading"?48:type==="button"?22:28,
        padding:type==="button"?12:0,
        borderRadius:type==="button"?8:["property-card","tour-card","service-card","review-card","inquiry-form","booking-form","map"].includes(type)?18:0,
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

  function changeSelectedLink(){if(!state.selected)return;const url=valueOf("linkValue","#");const item=customItemBySelected();if(item)item.url=url;if(state.selected.tagName==="A")state.selected.setAttribute("href",url);markDirty()}
  function beginInlineEdit(e){const el=e.target;const section=targetSection();if(!section||!section.contains(el)||["IMG","VIDEO","IFRAME","INPUT","TEXTAREA","SELECT"].includes(el.tagName))return;selectElement(el);el.contentEditable="true";el.classList.add("pb-inline-editing");el.focus();const finish=()=>{el.contentEditable="false";el.classList.remove("pb-inline-editing");syncSelectedCustom();captureSelectedContent();markDirty();fillInspector();el.removeEventListener("blur",finish)};el.addEventListener("blur",finish);e.preventDefault();e.stopPropagation()}

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
    const base={type:"none",color:"#ffffff",image:"",size:"cover",customWidth:100,customHeight:100,positionX:50,positionY:50,repeat:"no-repeat",overlay:0,slides:[],duration:5000,effect:"fade",heightMode:"auto",heightValue:"",deviceHeights:{desktop:{},tablet:{},mobile:{}},paddingTop:"",paddingBottom:"",borderRadius:0};
    return{...base,...(bg||{}),slides:Array.isArray(bg?.slides)?bg.slides:[]};
  }
  function fillSectionInspector(){
    fillWelcomeSettings();
    const b=normalizeSectionBackground(state.sectionBackground);
    state.sectionBackground=b;
    setValue("backgroundType",b.type);
    setValue("sectionBgColor",rgbHex(b.color||"#ffffff","#ffffff"));
    setValue("sectionBgImage",b.image||"");
    setValue("sectionBgSize",b.size||"cover");
    setValue("sectionBgWidth",num(b.customWidth,100));
    setValue("sectionBgHeight",num(b.customHeight,100));
    setValue("sectionBgPosX",num(b.positionX,50));
    setValue("sectionBgPosY",num(b.positionY,50));
    const posXOut=$("sectionBgPosXOut");if(posXOut)posXOut.textContent=`${num(b.positionX,50)}%`;
    const posYOut=$("sectionBgPosYOut");if(posYOut)posYOut.textContent=`${num(b.positionY,50)}%`;
    setValue("sectionBgRepeat",b.repeat||"no-repeat");
    setValue("sectionBgOverlay",num(b.overlay,0));
    setValue("slideDuration",String(num(b.duration,5000)));
    setValue("slideEffect",b.effect||"fade");
    const deviceHeight=(b.deviceHeights&&b.deviceHeights[state.device])||{};
    setValue("sectionHeightMode",deviceHeight.mode||b.heightMode||"auto");
    setValue("sectionHeightValue",deviceHeight.value??b.heightValue??b.minHeight??"");
    setValue("sectionPaddingTop",deviceHeight.paddingTop??b.paddingTop??"");
    setValue("sectionPaddingBottom",deviceHeight.paddingBottom??b.paddingBottom??"");
    setValue("sectionRadius",num(b.borderRadius,0));
    updateBackgroundControls();
    updateSectionHeightControls();
    renderSlideList();
    updateBgPreview();
  }
  function updateBackgroundControls(){
    const type=valueOf("backgroundType","none");
    toggleHidden("backgroundColorControls",type!=="color");
    toggleHidden("backgroundImageControls",type!=="image"&&type!=="slideshow");
    toggleHidden("slideshowControls",type!=="slideshow");
    toggleHidden("customBgSize",valueOf("sectionBgSize","cover")!=="custom");
  }
  function updateSectionHeightControls(){
    const mode=valueOf("sectionHeightMode","auto");
    toggleHidden("sectionHeightValueWrap",mode==="auto"||mode==="screen");
  }
  function changeSectionBackground(){
    if(!state.section)return;
    pushHistory();
    const current=normalizeSectionBackground(state.sectionBackground);
    const mode=valueOf("sectionHeightMode",(current.deviceHeights?.[state.device]?.mode||current.heightMode||"auto"));
    const heightRaw=valueOf("sectionHeightValue",current.deviceHeights?.[state.device]?.value??current.heightValue??"");
    const ptRaw=valueOf("sectionPaddingTop",current.deviceHeights?.[state.device]?.paddingTop??current.paddingTop??"");
    const pbRaw=valueOf("sectionPaddingBottom",current.deviceHeights?.[state.device]?.paddingBottom??current.paddingBottom??"");
    state.sectionBackground=normalizeSectionBackground({
      ...current,
      type:valueOf("backgroundType",current.type),
      color:valueOf("sectionBgColor",current.color),
      image:valueOf("sectionBgImage",current.image).trim(),
      size:valueOf("sectionBgSize",current.size),
      customWidth:num(valueOf("sectionBgWidth",current.customWidth),100),
      customHeight:num(valueOf("sectionBgHeight",current.customHeight),100),
      positionX:num(valueOf("sectionBgPosX",current.positionX),50),
      positionY:num(valueOf("sectionBgPosY",current.positionY),50),
      repeat:valueOf("sectionBgRepeat",current.repeat||"no-repeat"),
      overlay:num(valueOf("sectionBgOverlay",current.overlay),0),
      duration:num(valueOf("slideDuration",current.duration),5000),
      effect:valueOf("slideEffect",current.effect||"fade"),
      deviceHeights:{
        ...(current.deviceHeights||{}),
        [state.device]:{
          mode,
          value:heightRaw===""?"":num(heightRaw),
          paddingTop:ptRaw===""?"":num(ptRaw),
          paddingBottom:pbRaw===""?"":num(pbRaw)
        }
      },
      borderRadius:num(valueOf("sectionRadius",current.borderRadius),0)
    });
    const posXOut=$("sectionBgPosXOut");if(posXOut)posXOut.textContent=`${state.sectionBackground.positionX}%`;
    const posYOut=$("sectionBgPosYOut");if(posYOut)posYOut.textContent=`${state.sectionBackground.positionY}%`;
    updateBackgroundControls();
    updateSectionHeightControls();
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
    section.style.height="";
    section.style.minHeight="";
    section.style.maxHeight="";
    section.style.paddingTop="";
    section.style.paddingBottom="";
    section.style.borderRadius="";
  }
  function applySectionBackgroundPreview(){
    const section=targetSection();if(!section)return;
    const b=normalizeSectionBackground(state.sectionBackground);
    cleanupSectionBackground(section);
    if(frameStyle(section).position==="static")section.style.position="relative";
    const deviceHeight=(b.deviceHeights&&b.deviceHeights[state.device])||{};
    const mode=deviceHeight.mode||b.heightMode||"auto";
    const value=deviceHeight.value??b.heightValue??b.minHeight??"";
    if(mode==="fixed"&&value!==""){
      section.style.height=`${num(value)}px`;
      section.style.minHeight=`${num(value)}px`;
      section.style.maxHeight=`${num(value)}px`;
    }else if(mode==="min"&&value!==""){
      section.style.height="auto";
      section.style.minHeight=`${num(value)}px`;
      section.style.maxHeight="";
    }else if(mode==="screen"){
      section.style.height="100vh";
      section.style.minHeight="100vh";
      section.style.maxHeight="100vh";
    }else{
      section.style.height="auto";
      section.style.minHeight="0";
      section.style.maxHeight="";
    }
    const pt=deviceHeight.paddingTop??b.paddingTop;
    const pb=deviceHeight.paddingBottom??b.paddingBottom;
    if(pt!==""&&pt!==undefined)section.style.paddingTop=`${num(pt)}px`;
    if(pb!==""&&pb!==undefined)section.style.paddingBottom=`${num(pb)}px`;
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
      [...section.children].forEach(ch=>{if(ch!==holder&&frameStyle(ch).position==="static")ch.style.position="relative";if(ch!==holder)ch.style.zIndex=ch.style.zIndex||"1"});
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
    const p=$("sectionBgPreview"),b=state.sectionBackground||{};if(!p)return;
    const url=b.type==="slideshow"?(b.slides?.[0]||""):b.image;
    p.textContent=url?"":"No image";
    p.style.backgroundImage=url?`url("${url}")`:"";
    p.style.backgroundSize=backgroundCssSize(normalizeSectionBackground(b));
    p.style.backgroundPosition=`${num(b.positionX,50)}% ${num(b.positionY,50)}%`;
    p.style.backgroundRepeat=b.repeat||"no-repeat";
  }
  function renderSlideList(){
    const list=$("slideList"),slides=state.sectionBackground.slides||[];if(!list)return;
    if(!slides.length){list.innerHTML='<div class="left-help">No slideshow images added.</div>';return}
    list.innerHTML=slides.map((url,i)=>`<div class="slide-row"><img src="${esc(url)}" alt=""><span>${esc(url.split("/").pop()||`Slide ${i+1}`)}</span><button type="button" data-remove-slide="${i}">×</button></div>`).join("");
    list.querySelectorAll("[data-remove-slide]").forEach(btn=>btn.onclick=()=>{pushHistory();state.sectionBackground.slides.splice(num(btn.dataset.removeSlide),1);renderSlideList();updateBgPreview();applySectionBackgroundPreview();markDirty()});
  }
  async function uploadSectionBackground(){
    const input=$("sectionBgFile");const file=input?.files?.[0];if(!file)return;
    const url=await uploadBuilderFile(file);if(!url)return;
    $("backgroundType").value="image";$("sectionBgImage").value=url;
    changeSectionBackground();toast("Background uploaded");
  }
  async function uploadSlides(){
    const input=$("slideFiles");const files=[...(input?.files||[])];if(!files.length)return;
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

  async function uploadImage(){const file=$("imageFile").files[0];if(!file)return;const fd=new FormData();fd.append("file",file);fd.append("folder","page-builder");setStatus("Uploading...");try{const r=await fetch(`${API_BASE}/api/admin/upload-image`,{method:"POST",headers:upAuth(),body:fd});const data=await r.json();if(!r.ok)throw new Error(data.error||"Upload failed");$("imageValue").value=data.url;state.selected.src=data.url;syncSelectedCustom();captureSelectedContent();markDirty();toast("Image uploaded")}catch(e){toast(e.message);setStatus("Upload failed",true)}}
  async function save(){if(!state.section)return toast("Select a section first");setStatus("Saving...");const settings={...parseSettings(state.section.settings),elementStyles:state.styles,customElements:state.custom,contentOverrides:state.contentOverrides,sectionBackground:state.sectionBackground,welcomeSettings:state.welcomeSettings};
    const data={...state.section,settings};
    if(data.__synthetic || String(data.id||"").startsWith("static:")){
      delete data.id;
      delete data.__synthetic;
    }
    if(state.sectionBackground.type==="image")data.backgroundImage=state.sectionBackground.image||"";
    else if(state.sectionBackground.type==="color")data.backgroundColor=state.sectionBackground.color||"";
    else if(state.sectionBackground.type==="none"){data.backgroundImage="";data.backgroundColor="";}delete data.createdAt;delete data.updatedAt;try{const r=await fetch(`${API_BASE}/api/admin/page-sections`,{method:"POST",headers:auth(),body:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw new Error(result.error||"Save failed");state.dirty=false;setStatus("Saved");toast("Changes saved");await loadSections();state.section=state.sections.find(s=>String(s.id)===String(result.id||state.section.id))||state.section}catch(e){setStatus("Save failed",true);toast(e.message)}}
  gate();
})();
