const CEYBREEZ_API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page || "home";
  loadCeyBreezSections(page);
});

async function loadCeyBreezSections(page) {
  try {
    const response = await fetch(`${CEYBREEZ_API_BASE}/api/page-sections?page=${encodeURIComponent(page)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    if (!response.ok) throw new Error(`Page sections request failed (${response.status})`);

    const payload = await response.json();
    const sections = Array.isArray(payload) ? payload : [];

    sections.forEach(applySection);
  } catch (error) {
    // Keep the original HTML visible if the CMS/API is unavailable.
    console.error("Page Builder load failed", error);
  } finally {
    document.body.classList.add("cms-ready");
  }
}

function parseSettings(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
}

function first(target, explicitSelector, fallbackSelector) {
  return target.querySelector(explicitSelector) || target.querySelector(fallbackSelector);
}

function setText(element, value) {
  if (element && typeof value === "string" && value.trim()) element.textContent = value;
}

function applySection(section) {
  if (!section || !section.sectionKey) return;

  const target = document.querySelector(`[data-section="${CSS.escape(section.sectionKey)}"]`);
  if (!target) return;

  const settings = parseSettings(section.settings);
  const isActive = section.active === undefined || section.active === null || Number(section.active) === 1 || section.active === true;
  target.hidden = !isActive;
  if (!isActive) return;

  setText(first(target, "[data-field='title']", "h1, h2, h3"), section.title);
  setText(first(target, "[data-field='subtitle']", ".subtitle, .hero-subtitle, h1 + p, h2 + p"), section.subtitle);
  setText(first(target, "[data-field='content']", "p"), section.content);

  const button = first(target, "[data-field='button']", "a.hero-btn, a.btn, a.cta-btn, a[href]");
  setText(button, section.buttonText);
  if (button && section.buttonUrl && String(section.buttonUrl).trim()) button.href = section.buttonUrl;

  const image = first(target, "[data-field='image']", "img:not(.hero-logo):not(.logo)");
  if (image && section.mediaUrl && String(section.mediaUrl).trim()) image.src = section.mediaUrl;

  if (settings.videoUrl && String(settings.videoUrl).trim()) applyVideoBackground(target, settings.videoUrl);
  if (Array.isArray(settings.gallery) && settings.gallery.length) renderGallery(target, settings.gallery);
  if (Array.isArray(settings.cards) && settings.cards.length) renderCards(target, settings.cards);

  applySectionStyles(target, section, settings);
}

function applySectionStyles(target, section, settings = {}) {
  const backgroundImage = String(section.backgroundImage || "").trim();
  const backgroundColor = String(section.backgroundColor || "").trim();

  if (backgroundImage) {
    const overlay = settings.backgroundOverlay || "rgba(0,0,0,.35)";
    target.style.backgroundImage = `linear-gradient(${overlay}, ${overlay}), url("${backgroundImage.replace(/\"/g, '%22')}")`;
    target.style.backgroundSize = settings.backgroundSize || "cover";
    target.style.backgroundPosition = settings.backgroundPosition || "center center";
    target.style.backgroundRepeat = settings.backgroundRepeat || "no-repeat";
  } else if (settings.gradientStart && settings.gradientEnd) {
    target.style.background = `linear-gradient(135deg, ${settings.gradientStart}, ${settings.gradientEnd})`;
  } else if (backgroundColor) {
    target.style.background = backgroundColor;
  }

  if (section.textColor) target.style.color = section.textColor;

  const headingColor = section.headingColor || settings.headingColor;
  if (headingColor) target.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach(h => h.style.color = headingColor);

  if (section.fontFamily) target.style.fontFamily = section.fontFamily;
  if (section.fontSize) target.style.fontSize = normalizeCssSize(section.fontSize);

  if (settings.headingFontFamily) {
    target.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach(h => h.style.fontFamily = settings.headingFontFamily);
  }
  if (settings.headingFontSize) {
    target.querySelectorAll("h1,h2,h3").forEach(h => h.style.fontSize = normalizeCssSize(settings.headingFontSize));
  }

  if (settings.paddingTop) target.style.paddingTop = normalizeCssSize(settings.paddingTop);
  if (settings.paddingBottom) target.style.paddingBottom = normalizeCssSize(settings.paddingBottom);
  if (settings.borderRadius) target.style.borderRadius = normalizeCssSize(settings.borderRadius);

  const shadows = {
    none: "none",
    soft: "0 10px 30px rgba(0,0,0,.08)",
    medium: "0 18px 45px rgba(0,0,0,.15)",
    strong: "0 28px 70px rgba(0,0,0,.25)"
  };
  if (settings.shadow in shadows) target.style.boxShadow = shadows[settings.shadow];

  if (section.buttonColor) {
    target.querySelectorAll("a.hero-btn, a.btn, a.cta-btn, button").forEach(btn => btn.style.background = section.buttonColor);
  }

  if (settings.animation) target.classList.add("cms-animate", settings.animation);
}

function normalizeCssSize(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return /^-?\d+(\.\d+)?$/.test(text) ? `${text}px` : text;
}

function applyVideoBackground(target, videoUrl) {
  let video = target.querySelector(".cms-bg-video");
  if (!video) {
    video = document.createElement("video");
    video.className = "cms-bg-video";
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("aria-hidden", "true");
    target.prepend(video);
  }
  if (video.src !== videoUrl) video.src = videoUrl;
}

function renderGallery(target, gallery) {
  const galleryBox = target.querySelector("[data-field='gallery']");
  if (!galleryBox) return;

  const valid = gallery.filter(url => typeof url === "string" && url.trim());
  if (!valid.length) return;

  galleryBox.innerHTML = "";
  valid.forEach(url => {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "CeyBreez Gallery";
    img.loading = "lazy";
    galleryBox.appendChild(img);
  });
}

function renderCards(target, cards) {
  const cardsBox = target.querySelector("[data-field='cards']");
  if (!cardsBox) return;

  const valid = cards.filter(card => card && (card.title || card.description || card.image || card.buttonText));
  if (!valid.length) return;

  cardsBox.innerHTML = "";
  valid.forEach(card => {
    const item = document.createElement("div");
    item.className = "cms-card";

    if (card.image) {
      const img = document.createElement("img");
      img.src = card.image;
      img.alt = card.title || "";
      item.appendChild(img);
    }
    if (card.title) {
      const h3 = document.createElement("h3");
      h3.textContent = card.title;
      item.appendChild(h3);
    }
    if (card.description) {
      const p = document.createElement("p");
      p.textContent = card.description;
      item.appendChild(p);
    }
    if (card.buttonText) {
      const a = document.createElement("a");
      a.href = card.buttonUrl || "#";
      a.textContent = card.buttonText;
      item.appendChild(a);
    }
    cardsBox.appendChild(item);
  });
}
