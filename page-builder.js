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
}

function applySectionStyles(target, section, passedSettings){
 let settings = passedSettings || {};

  if(section.backgroundImage){
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
  ['width','maxWidth','height','minHeight','marginTop','marginRight','marginBottom','marginLeft',
   'paddingTop','paddingRight','paddingBottom','paddingLeft','borderRadius','fontSize','lineHeight',
   'letterSpacing','borderWidth'].forEach(k=>{
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
  el.style.transformOrigin='center center';

  if(rec.positioned){
    const parent=el.parentElement;
    if(parent&&getComputedStyle(parent).position==='static') parent.style.position='relative';
    el.style.position='absolute';
    el.style.left=`${Number(rec.x)||0}px`;
    el.style.top=`${Number(rec.y)||0}px`;
    el.style.margin='0';
    el.style.transform=`rotate(${Number(rec.rotate)||0}deg)`;
  }else{
    el.style.position='';
    el.style.left='';
    el.style.top='';
    el.style.transform=`translate(${Number(rec.x)||0}px, ${Number(rec.y)||0}px) scale(${rec.scale||1}) rotate(${Number(rec.rotate)||0}deg)`;
  }
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
