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
