const CEYBREEZ_API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page || "home";
  loadCeyBreezSections(page);
});

async function loadCeyBreezSections(page){
  try{
    const response = await fetch(`${CEYBREEZ_API_BASE}/api/page-sections?page=${page}`);
    const sections = await response.json();

    sections.forEach(section => {
      applySection(section);
    });
document.body.classList.add("cms-ready");
  }catch(error){
    console.error("Page Builder load failed", error);
  }
}

function applySection(section){
  const key = section.sectionKey;
  const target = document.querySelector(`[data-section="${key}"]`);

  if(!target) return;

  let settings = {};

  try{
    settings = typeof section.settings === "string"
      ? JSON.parse(section.settings || "{}")
      : section.settings || {};
  }catch{
    settings = {};
  }

  if(section.title){
    const title = target.querySelector("[data-field='title']");
    if(title) title.textContent = section.title;
  }

  if(section.subtitle){
    const subtitle = target.querySelector("[data-field='subtitle']");
    if(subtitle) subtitle.textContent = section.subtitle;
  }

  if(section.content){
    const content = target.querySelector("[data-field='content']");
    if(content) content.textContent = section.content;
  }

  if(section.buttonText){
    const button = target.querySelector("[data-field='button']");
    if(button) button.textContent = section.buttonText;
  }

  if(section.buttonUrl){
    const button = target.querySelector("[data-field='button']");
    if(button) button.href = section.buttonUrl;
  }

  if(section.mediaUrl){
    const img = target.querySelector("[data-field='image']");
    if(img) img.src = section.mediaUrl;
  }

  if(settings.videoUrl){
    applyVideoBackground(target, settings.videoUrl);
  }

  if(settings.gallery && Array.isArray(settings.gallery)){
    renderGallery(target, settings.gallery);
  }

  if(settings.cards && Array.isArray(settings.cards)){
    renderCards(target, settings.cards);
  }

  applySectionStyles(target, section, settings);
  applyVisualElements(target, section, settings);
  applyBuilderSectionLayout(target, settings.sectionLayout || {});
}

function applySectionStyles(target, section, passedSettings){
 let settings = passedSettings || {};

  const builderBg = settings.sectionBackground;

  if(builderBg && builderBg.type){
    applyBuilderSectionBackground(target, builderBg);
  }else if(section.backgroundImage){
    target.style.backgroundImage =
      `linear-gradient(rgba(0,0,0,${Number(settings.overlay ?? 35)/100}), rgba(0,0,0,${Number(settings.overlay ?? 35)/100})), url('${section.backgroundImage}')`;
    target.style.backgroundSize = settings.backgroundSize || "cover";
    target.style.backgroundPosition = settings.backgroundPosition || "center center";
  }else if(settings.gradientStart && settings.gradientEnd){
    target.style.background =
      `linear-gradient(135deg, ${settings.gradientStart}, ${settings.gradientEnd})`;
  }else if(section.backgroundColor){
    target.style.background = section.backgroundColor;
  }

  if(section.textColor){
    target.style.color = section.textColor;
  }

  if(section.headingColor){
    target.querySelectorAll("h1,h2,h3").forEach(h => {
      h.style.color = section.headingColor;
    });
  }

  if(section.fontFamily){
    target.style.fontFamily = section.fontFamily;
  }

  if(section.fontSize || settings.fontSize){
    target.style.fontSize = section.fontSize || settings.fontSize;
  }

  if(section.headingColor || settings.headingColor){ target.querySelectorAll("h1,h2,h3").forEach(h => h.style.color = section.headingColor || settings.headingColor); }
  if(settings.headingFont){ target.querySelectorAll("h1,h2,h3").forEach(h => h.style.fontFamily = settings.headingFont); }
  if(settings.headingSize){ target.querySelectorAll("h1,h2,h3").forEach(h => h.style.fontSize = settings.headingSize); }

  if(settings.paddingTop){
    target.style.paddingTop = settings.paddingTop;
  }

  if(settings.paddingBottom){
    target.style.paddingBottom = settings.paddingBottom;
  }

  if(settings.borderRadius){
    target.style.borderRadius = settings.borderRadius;
  }

  if(settings.shadow){
    if(settings.shadow === "none") target.style.boxShadow = "none";
    if(settings.shadow === "soft") target.style.boxShadow = "0 10px 30px rgba(0,0,0,.08)";
    if(settings.shadow === "medium") target.style.boxShadow = "0 18px 45px rgba(0,0,0,.15)";
    if(settings.shadow === "strong") target.style.boxShadow = "0 28px 70px rgba(0,0,0,.25)";
  }

  if(section.buttonColor){
    target.querySelectorAll("a, button").forEach(btn => {
      btn.style.background = section.buttonColor;
    });
  }

  if(settings.animation){
    target.classList.add("cms-animate", settings.animation);
  }
}


function applyBuilderSectionLayout(target, raw){
  const l = Object.assign({
    heightMode:"auto",heightValue:600,contentWidth:"full",customWidth:1200,
    paddingTop:60,paddingBottom:60,paddingLeft:20,paddingRight:20,
    showDesktop:true,showTablet:true,showMobile:true
  }, raw||{});

  target.style.height="";
  target.style.minHeight="";
  target.style.overflow="";

  if(l.heightMode==="min") target.style.minHeight=`${Number(l.heightValue)||600}px`;
  if(l.heightMode==="fixed"){
    target.style.height=`${Number(l.heightValue)||600}px`;
    target.style.overflow="hidden";
  }
  if(l.heightMode==="screen") target.style.minHeight="100svh";
  if(l.heightMode==="fit"){
    target.style.height="auto";
    target.style.minHeight="0";
    target.style.overflow="visible";
  }

  target.style.paddingTop=`${Number(l.paddingTop)||0}px`;
  target.style.paddingBottom=`${Number(l.paddingBottom)||0}px`;
  target.style.paddingLeft=`${Number(l.paddingLeft)||0}px`;
  target.style.paddingRight=`${Number(l.paddingRight)||0}px`;

  const max = l.contentWidth==="boxed"?"1200px":
              l.contentWidth==="wide"?"1400px":
              l.contentWidth==="custom"?`${Number(l.customWidth)||1200}px`:"100%";
  target.style.setProperty("--pb-content-max",max);

  target.classList.toggle("pb-hide-desktop",l.showDesktop===false);
  target.classList.toggle("pb-hide-tablet",l.showTablet===false);
  target.classList.toggle("pb-hide-mobile",l.showMobile===false);

  ensureBuilderRuntimeCss();
}

function ensureBuilderRuntimeCss(){
  if(document.getElementById("ceybreez-builder-runtime-css"))return;
  const style=document.createElement("style");
  style.id="ceybreez-builder-runtime-css";
  style.textContent=`
    [data-section] > .container,[data-section] > .content,[data-section] > .inner{
      max-width:var(--pb-content-max,100%);
      margin-left:auto;
      margin-right:auto;
    }
    img[data-pb-responsive="1"],.pb-custom img{
      max-width:100%;
      height:auto;
    }
    @media(min-width:1025px){.pb-hide-desktop{display:none!important}}
    @media(min-width:768px) and (max-width:1024px){.pb-hide-tablet{display:none!important}}
    @media(max-width:767px){.pb-hide-mobile{display:none!important}}
  `;
  document.head.appendChild(style);
}

function applyBuilderSectionBackground(target, bg){
  target.querySelectorAll(":scope > .cms-bg-slideshow").forEach(node => node.remove());

  target.style.backgroundImage = "";
  target.style.backgroundColor = "";
  target.style.backgroundSize = "";
  target.style.backgroundPosition = "";
  target.style.backgroundRepeat = "";

  if(bg.minHeight !== "" && bg.minHeight !== undefined){
    target.style.minHeight = `${Number(bg.minHeight) || 0}px`;
  }

  if(Number(bg.borderRadius) > 0){
    target.style.borderRadius = `${Number(bg.borderRadius)}px`;
  }

  const size = bg.size === "custom"
    ? `${Number(bg.customWidth) || 100}% ${Number(bg.customHeight) || 100}%`
    : (bg.size || "cover");

  const position =
    `${Number(bg.positionX ?? 50)}% ${Number(bg.positionY ?? 50)}%`;

  const overlay =
    Math.max(0, Math.min(90, Number(bg.overlay) || 0)) / 100;

  const imageCss = url => overlay > 0
    ? `linear-gradient(rgba(0,0,0,${overlay}), rgba(0,0,0,${overlay})), url("${url}")`
    : `url("${url}")`;

  if(bg.type === "none") return;

  if(bg.type === "color"){
    target.style.backgroundColor = bg.color || "#ffffff";
    return;
  }

  if(bg.type === "image" && bg.image){
    target.style.backgroundImage = imageCss(bg.image);
    target.style.backgroundSize = size;
    target.style.backgroundPosition = position;
    target.style.backgroundRepeat = bg.repeat || "no-repeat";
    return;
  }

  if(bg.type === "slideshow" && Array.isArray(bg.slides) && bg.slides.length){
    if(getComputedStyle(target).position === "static"){
      target.style.position = "relative";
    }

    const holder = document.createElement("div");
    holder.className = "cms-bg-slideshow";

    Object.assign(holder.style, {
      position: "absolute",
      inset: "0",
      overflow: "hidden",
      pointerEvents: "none",
      zIndex: "0"
    });

    const layer = document.createElement("div");

    Object.assign(layer.style, {
      position: "absolute",
      inset: "0",
      backgroundSize: size,
      backgroundPosition: position,
      backgroundRepeat: bg.repeat || "no-repeat",
      transition: "opacity .65s ease, transform .65s ease"
    });

    holder.appendChild(layer);
    target.prepend(holder);

    [...target.children].forEach(child => {
      if(child !== holder){
        if(getComputedStyle(child).position === "static"){
          child.style.position = "relative";
        }
        if(!child.style.zIndex){
          child.style.zIndex = "1";
        }
      }
    });

    let index = 0;

    const showSlide = () => {
      const url = bg.slides[index % bg.slides.length];
      layer.style.opacity = "0";

      if(bg.effect === "slide"){
        layer.style.transform = "translateX(4%)";
      }

      setTimeout(() => {
        layer.style.backgroundImage = imageCss(url);
        layer.style.opacity = "1";
        layer.style.transform = "translateX(0)";
      }, 120);

      index += 1;
    };

    showSlide();

    if(bg.slides.length > 1){
      setInterval(showSlide, Math.max(1500, Number(bg.duration) || 5000));
    }
  }
}

function applyVideoBackground(target, videoUrl){
  let video = target.querySelector(".cms-bg-video");

  if(!video){
    video = document.createElement("video");
    video.className = "cms-bg-video";
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;

    target.prepend(video);
  }

  video.src = videoUrl;
}

function renderGallery(target, gallery){
  const galleryBox = target.querySelector("[data-field='gallery']");
  if(!galleryBox) return;

  galleryBox.innerHTML = "";

  gallery.forEach(url => {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "CeyBreez Gallery";
    img.loading = "lazy";
    galleryBox.appendChild(img);
  });
}

function renderCards(target, cards){
  const cardsBox = target.querySelector("[data-field='cards']");
  if(!cardsBox) return;

  cardsBox.innerHTML = "";

  cards.forEach(card => {
    const item = document.createElement("div");
    item.className = "cms-card";

    item.innerHTML = `
      ${card.image ? `<img src="${card.image}" alt="${card.title || ''}">` : ""}
      <h3>${card.title || ""}</h3>
      <p>${card.description || ""}</p>
      ${card.buttonText ? `<a href="${card.buttonUrl || "#"}">${card.buttonText}</a>` : ""}
    `;

    cardsBox.appendChild(item);
  });
}


/* Page Builder V3 visual element styles */
function currentCmsDevice(){
  const w=window.innerWidth;
  return w<=600?'mobile':(w<=900?'tablet':'desktop');
}
function mergeDeviceStyles(byDevice){
  const d=currentCmsDevice();
  return Object.assign({}, byDevice?.desktop||{}, d!=='desktop'?(byDevice?.[d]||{}):{});
}
function applyVisualRecord(el,rec){
  if(!el||!rec)return;

  const isCustom=!!el.dataset.pbId;
  const isolated=rec.positioned&&!isCustom;

  ['maxWidth','minHeight','marginTop','marginRight','marginBottom','marginLeft',
   'paddingTop','paddingRight','paddingBottom','paddingLeft','borderRadius','fontSize',
   'lineHeight','letterSpacing','borderWidth'].forEach(k=>{
    el.style[k]=rec[k]!==undefined&&rec[k]!==''?`${Number(rec[k])}px`:'';
  });

  el.style.display=rec.hidden?'none':(rec.display||'');
  el.style.textAlign=rec.textAlign||'';
  el.style.objectFit=rec.objectFit||'';
  el.style.opacity=rec.opacity!==undefined?String(rec.opacity):'';
  el.style.fontFamily=rec.fontFamily||'';
  el.style.fontWeight=rec.fontWeight||'';
  el.style.fontStyle=rec.fontStyle||'';
  el.style.textDecoration=rec.textDecoration||'';
  el.style.color=rec.color||'';
  el.style.backgroundColor=rec.backgroundColor||'';
  el.style.borderStyle=rec.borderStyle||'';
  el.style.borderColor=rec.borderColor||'';
  el.style.boxShadow=rec.boxShadow||'';
  el.style.zIndex=rec.zIndex!==undefined?String(rec.zIndex):'';
  applyResponsiveImageStyle(el, r);
  el.style.transformOrigin='center center';

  if(rec.positioned&&isCustom){
    const parent=el.parentElement;
    if(parent&&getComputedStyle(parent).position==='static')parent.style.position='relative';
    el.style.position='absolute';
    el.style.left=`${Number(rec.x)||0}px`;
    el.style.top=`${Number(rec.y)||0}px`;
    el.style.width=rec.width!==undefined&&rec.width!==''?`${Number(rec.width)}px`:'';
    el.style.height=rec.height!==undefined&&rec.height!==''?`${Number(rec.height)}px`:'';
    el.style.margin='0';
    el.style.transform=`rotate(${Number(rec.rotate)||0}deg)`;
    return;
  }

  if(isolated){
    const bw=Math.max(1,Number(rec.baseWidth)||el.getBoundingClientRect().width||1);
    const bh=Math.max(1,Number(rec.baseHeight)||el.getBoundingClientRect().height||1);
    const vw=Math.max(1,Number(rec.width)||bw);
    const vh=Math.max(1,Number(rec.height)||bh);
    el.style.position='relative';
    el.style.left='0';
    el.style.top='0';
    el.style.width=rec.baseCssWidth||'';
    el.style.height=rec.baseCssHeight||'';
    el.style.transform=`translate(${Number(rec.x)||0}px, ${Number(rec.y)||0}px) scale(${vw/bw}, ${vh/bh}) rotate(${Number(rec.rotate)||0}deg)`;
    return;
  }

  el.style.position='';
  el.style.left='';
  el.style.top='';
  el.style.width=rec.width!==undefined&&rec.width!==''?`${Number(rec.width)}px`:'';
  el.style.height=rec.height!==undefined&&rec.height!==''?`${Number(rec.height)}px`:'';
  el.style.transform=`translate(${Number(rec.x)||0}px, ${Number(rec.y)||0}px) scale(${rec.scale||1}) rotate(${Number(rec.rotate)||0}deg)`;
}
function renderVisualCustomElements(target,section,settings){
  target.querySelectorAll('[data-pb-custom="1"]').forEach(n=>n.remove());
  (settings.customElements||[]).forEach(item=>{
    if(item.sectionKey!==section.sectionKey)return;
    let n;
    if(item.type==='button'){n=document.createElement('a');n.href=item.url||'#';n.textContent=item.text||'Button';n.className='cms-custom-button'}
    else if(item.type==='image'){n=document.createElement('img');n.src=item.url||'';n.alt=item.alt||'';n.className='cms-custom-image'}
    else {n=document.createElement(item.type==='heading'?'h2':'p');n.textContent=item.text||'';n.className='cms-custom-text'}
    n.dataset.pbCustom='1';n.dataset.pbId=item.id;target.style.position=target.style.position||'relative';target.appendChild(n);
  });
}

function pbPublicStablePath(el,section){
  if(!el||el===section)return 'root';
  const parts=[];
  let node=el;
  while(node&&node!==section){
    const parent=node.parentElement;
    if(!parent)break;
    const siblings=[...parent.children].filter(x=>
      !x.classList.contains('pb5-selection-box') &&
      !x.classList.contains('pb4-resize-handle')
    );
    parts.unshift(Math.max(0,siblings.indexOf(node)).toString(36));
    node=parent;
  }
  return parts.join('-')||'root';
}
function pbAssignStableIds(section){
  if(!section)return;
  const key=String(section.dataset.section||'section').replace(/[^a-zA-Z0-9_-]/g,'_');
  [section,...section.querySelectorAll('*')].forEach(node=>{
    node.dataset.pbUid=node.dataset.pbId
      ? `custom-${node.dataset.pbId}`
      : `${key}-${pbPublicStablePath(node,section)}`;
  });
}

function applyVisualElements(target,section,settings){
  renderVisualCustomElements(target,section,settings);
  pbAssignStableIds(target);
  Object.entries(settings.elementStyles||{}).forEach(([selector,byDevice])=>{
    let nodes=[];
    try{nodes=selector===':scope'?[target]:Array.from(target.querySelectorAll(selector))}catch(error){return}
    const rec=mergeDeviceStyles(byDevice);
    nodes.forEach(n=>applyVisualRecord(n,rec));
  });
}
let cmsResizeTimer;
window.addEventListener('resize',()=>{
  clearTimeout(cmsResizeTimer);
  cmsResizeTimer=setTimeout(()=>{
    const page=document.body.dataset.page||'home';
    loadCeyBreezSections(page);
  },180);
});


function applyResponsiveImageStyle(el, r){
  if(!el || el.tagName!=="IMG") return;
  const wm=r.imageWidthMode||"auto";
  if(wm==="auto"){el.style.width="auto";el.style.maxWidth="100%";}
  if(wm==="full"){el.style.width="100%";el.style.maxWidth="100%";}
  if(wm==="percent"){el.style.width=`${Number(r.imageWidthValue)||100}%`;el.style.maxWidth="100%";}
  if(wm==="pixel"){el.style.width=`${Number(r.imageWidthValue)||320}px`;el.style.maxWidth="100%";}
  el.style.height=(r.imageHeightMode==="fixed")?`${Number(r.imageHeightValue)||300}px`:"auto";
  el.style.objectFit=r.objectFit||"contain";
  el.style.aspectRatio=(r.aspectRatio&&r.aspectRatio!=="auto")?r.aspectRatio:"auto";
  el.style.display="block";
  el.dataset.pbResponsive="1";
}

