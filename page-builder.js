const CEYBREEZ_API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";

document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("cms-ready");
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

  if(typeof section.title==="string" && section.title.trim()){
    const title = target.querySelector("[data-field='title']");
    if(title) title.textContent = section.title;
  }

  if(typeof section.subtitle==="string" && section.subtitle.trim()){
    const subtitle = target.querySelector("[data-field='subtitle']");
    if(subtitle) subtitle.textContent = section.subtitle;
  }

  if(typeof section.content==="string" && section.content.trim()){
    const content = target.querySelector("[data-field='content']");
    if(content) content.textContent = section.content;
  }

  if(typeof section.buttonText==="string" && section.buttonText.trim()){
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

function applyBuilderSectionBackground(target, bg){
  target.querySelectorAll(":scope > .cms-bg-slideshow").forEach(node => node.remove());

  target.style.backgroundImage = "";
  target.style.backgroundColor = "";
  target.style.backgroundSize = "";
  target.style.backgroundPosition = "";
  target.style.backgroundRepeat = "";

  const device =
    window.innerWidth <= 600 ? "mobile" :
    window.innerWidth <= 900 ? "tablet" : "desktop";

  const deviceHeight =
    bg.deviceHeights && bg.deviceHeights[device]
      ? bg.deviceHeights[device]
      : {};

  const heightMode =
    deviceHeight.mode || bg.heightMode ||
    ((bg.minHeight !== "" && bg.minHeight !== undefined) ? "min" : "auto");

  const heightValue =
    deviceHeight.value ?? bg.heightValue ?? bg.minHeight ?? "";

  target.style.height = "";
  target.style.minHeight = "";
  target.style.maxHeight = "";

  if(heightMode === "fixed" && heightValue !== ""){
    target.style.height = `${Number(heightValue) || 0}px`;
    target.style.minHeight = `${Number(heightValue) || 0}px`;
    target.style.maxHeight = `${Number(heightValue) || 0}px`;
  }else if(heightMode === "min" && heightValue !== ""){
    target.style.height = "auto";
    target.style.minHeight = `${Number(heightValue) || 0}px`;
  }else if(heightMode === "screen"){
    target.style.height = "100vh";
    target.style.minHeight = "100vh";
    target.style.maxHeight = "100vh";
  }else{
    target.style.height = "auto";
    target.style.minHeight = "0";
  }

  const paddingTop = deviceHeight.paddingTop ?? bg.paddingTop;
  const paddingBottom = deviceHeight.paddingBottom ?? bg.paddingBottom;

  if(paddingTop !== "" && paddingTop !== undefined){
    target.style.paddingTop = `${Number(paddingTop) || 0}px`;
  }

  if(paddingBottom !== "" && paddingBottom !== undefined){
    target.style.paddingBottom = `${Number(paddingBottom) || 0}px`;
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
  if(!galleryBox || !Array.isArray(gallery) || gallery.length===0) return;

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
  if(!cardsBox || !Array.isArray(cards) || cards.length===0) return;

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


/* Page Builder V4 responsive visual renderer */
const PB_DEVICE_WIDTHS={desktop:1200,tablet:768,mobile:390};
function currentCmsDevice(){const w=window.innerWidth;return w<=600?'mobile':(w<=900?'tablet':'desktop')}
function pbNum(v,d=0){return Number.isFinite(Number(v))?Number(v):d}
function pbResponsiveRecord(byDevice,device,sectionWidth){
  const desktop={...(byDevice?.desktop||{})};
  const override=device==='desktop'?{}:{...(byDevice?.[device]||{})};
  const r={...desktop,...override};
  const ratio=Math.min(1,sectionWidth/1200);
  if(device!=='desktop'){
    if(override.fontSize===undefined&&desktop.fontSize!==undefined)r.fontSize=Math.max(12,pbNum(desktop.fontSize)*Math.max(.72,ratio));
    if(override.lineHeight===undefined&&desktop.lineHeight!==undefined)r.lineHeight=Math.max(14,pbNum(desktop.lineHeight)*Math.max(.78,ratio));
    if(override.padding===undefined&&desktop.padding!==undefined)r.padding=Math.max(4,pbNum(desktop.padding)*Math.max(.65,ratio));
    if(override.y===undefined&&desktop.y!==undefined)r.y=pbNum(desktop.y)*Math.max(.55,ratio);
  }
  if(r.widthPct===undefined&&r.width!==undefined)r.widthPct=Math.min(100,pbNum(r.width)/(pbNum(r.referenceWidth,1200))*100);
  if(r.xPct===undefined&&r.x!==undefined)r.xPct=pbNum(r.x)/(pbNum(r.referenceWidth,1200))*100;
  return r;
}
function pbApplyRecord(el,r,sectionWidth){
  if(!el||!r)return;
  const isCustom=!!el.dataset.pbId;
  const widthPct=r.widthPct!==undefined?Math.max(1,Math.min(100,pbNum(r.widthPct))):null;
  const xPct=r.xPct!==undefined?pbNum(r.xPct):0;
  const y=pbNum(r.y),rotate=pbNum(r.rotate);
  el.style.boxSizing='border-box';
  el.style.maxWidth='100%';
  if(isCustom){
    const parent=el.parentElement;if(parent&&getComputedStyle(parent).position==='static')parent.style.position='relative';
    el.style.position='absolute';el.style.left=`${xPct}%`;el.style.top=`${y}px`;
    el.style.width=widthPct!==null?`${widthPct}%`:'auto';
    el.style.maxWidth=`${Math.max(1,100-xPct)}%`;
    el.style.height=r.height==='auto'||r.height===undefined?'auto':`${pbNum(r.height)}px`;
    el.style.margin='0';el.style.transform=`rotate(${rotate}deg)`;
  }else{
    el.style.position='relative';
    el.style.width=widthPct!==null?`${widthPct}%`:'';
    el.style.height=r.height==='auto'||r.height===undefined?'auto':`${pbNum(r.height)}px`;
    el.style.transform=`translate(${xPct/100*sectionWidth}px,${y}px) rotate(${rotate}deg)`;
    if(el.tagName==='IMG'){el.style.objectFit=r.objectFit||'cover';if(r.height==='auto'||r.height===undefined)el.style.height='auto'}
  }
  ['fontSize','lineHeight','borderRadius','padding'].forEach(k=>el.style[k]=r[k]!==undefined&&r[k]!==''?`${pbNum(r[k])}px`:'');
  ['opacity','fontFamily','fontWeight','fontStyle','textDecoration','textAlign','color','backgroundColor','boxShadow','zIndex'].forEach(k=>el.style[k]=r[k]!==undefined?String(r[k]):'');
  if((el.tagName==='A'||el.tagName==='BUTTON')&&widthPct!==null){el.style.display='inline-flex';el.style.alignItems='center';el.style.justifyContent='center';el.style.whiteSpace='normal';el.style.textWrap='balance'}
}
function pbStablePath(el,section){
  if(!el||el===section)return'root';const parts=[];let node=el;
  while(node&&node!==section){const parent=node.parentElement;if(!parent)break;const siblings=[...parent.children].filter(x=>!x.classList.contains('cms-bg-slideshow'));parts.unshift(Math.max(0,siblings.indexOf(node)).toString(36));node=parent}
  return parts.join('-')||'root';
}
function pbAssignStableIds(section){
  if(!section)return;const key=String(section.dataset.section||'section').replace(/[^a-zA-Z0-9_-]/g,'_');
  [section,...section.querySelectorAll('*')].forEach(node=>{node.dataset.pbUid=node.dataset.pbId?`custom-${node.dataset.pbId}`:`${key}-${pbStablePath(node,section)}`});
}
function renderVisualCustomElements(target,section,settings){
  target.querySelectorAll('[data-pb-custom="1"]').forEach(n=>n.remove());
  (settings.customElements||[]).forEach(item=>{
    if(item.sectionKey!==section.sectionKey)return;let n;
    if(item.type==='button'){n=document.createElement('a');n.href=item.url||'#';n.textContent=item.text||'Button'}
    else if(item.type==='image'){n=document.createElement('img');n.src=item.url||'';n.alt=item.alt||''}
    else if(item.type==='divider'){n=document.createElement('div');n.style.height='1px';n.style.background=item.color||'#c79b52';n.setAttribute('aria-hidden','true')}
    else if(item.type==='spacer'){n=document.createElement('div');n.setAttribute('aria-hidden','true')}
    else if(item.type==='badge'){n=document.createElement('span');n.textContent=item.text||'Badge'}
    else{n=document.createElement(item.type==='heading'?'h2':'p');n.textContent=item.text||''}
    n.dataset.pbCustom='1';n.dataset.pbId=item.id;n.dataset.pbType=item.type;target.style.position=target.style.position||'relative';target.appendChild(n);
  });
}
function pbEnsureSectionHeight(target){
  if(!target)return;let bottom=0;const tr=target.getBoundingClientRect();
  target.querySelectorAll('[data-pb-id]').forEach(el=>{const r=el.getBoundingClientRect();bottom=Math.max(bottom,r.bottom-tr.top)});
  if(bottom>0){const current=parseFloat(getComputedStyle(target).minHeight)||0;target.style.minHeight=`${Math.max(current,Math.ceil(bottom+24))}px`}
}
function applyVisualElements(target,section,settings){
  renderVisualCustomElements(target,section,settings);pbAssignStableIds(target);
  const device=currentCmsDevice();const sectionWidth=Math.max(1,target.getBoundingClientRect().width||window.innerWidth);
  Object.entries(settings.elementStyles||{}).forEach(([selector,byDevice])=>{
    let nodes=[];try{nodes=selector===':scope'?[target]:Array.from(target.querySelectorAll(selector))}catch{return}
    const rec=pbResponsiveRecord(byDevice,device,sectionWidth);nodes.forEach(n=>pbApplyRecord(n,rec,sectionWidth));
  });
  requestAnimationFrame(()=>pbEnsureSectionHeight(target));
}
let cmsResizeTimer;
window.addEventListener('resize',()=>{clearTimeout(cmsResizeTimer);cmsResizeTimer=setTimeout(()=>{const page=document.body.dataset.page||'home';loadCeyBreezSections(page)},180)});
