const CEYBREEZ_API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";

 document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page || "home";
  loadCeyBreezSections(page);
});

async function loadCeyBreezSections(page) {
  try {
    const response = await fetch(`${CEYBREEZ_API_BASE}/api/page-sections?page=${encodeURIComponent(page)}`, {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json();
    const sections = Array.isArray(payload) ? payload : [];

    sections
      .filter(section => section && section.active !== false && section.active !== 0)
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
      .forEach(applySection);
  } catch (error) {
    // Keep the original static website visible when CMS/API is unavailable.
    console.warn("CeyBreez Page Builder: using original page content.", error);
  } finally {
    document.body.classList.add("cms-ready");
  }
}

function parseSettings(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
}

function hasText(value) {
  return typeof value === "string" && value.trim() !== "";
}

function applySection(section) {
  const key = String(section.sectionKey || "").trim();
  if (!key) return;

  const target = document.querySelector(`[data-section="${CSS.escape(key)}"]`);
  if (!target) return;

  const settings = parseSettings(section.settings);

  setText(target, "title", section.title);
  setText(target, "subtitle", section.subtitle);
  setText(target, "content", section.content);

  const button = target.querySelector("[data-field='button']");
  if (button && hasText(section.buttonText)) button.textContent = section.buttonText.trim();
  if (button && hasText(section.buttonUrl)) button.href = section.buttonUrl.trim();

  const image = target.querySelector("[data-field='image']");
  if (image && hasText(section.mediaUrl)) image.src = section.mediaUrl.trim();

  if (hasText(settings.videoUrl)) applyVideoBackground(target, settings.videoUrl.trim());
  if (Array.isArray(settings.gallery) && settings.gallery.length) renderGallery(target, settings.gallery);
  if (Array.isArray(settings.cards) && settings.cards.length) renderCards(target, settings.cards);

  applySectionStyles(target, section, settings);
}

function setText(target, field, value) {
  if (!hasText(value)) return; // Never erase original website details with blank CMS data.
  const element = target.querySelector(`[data-field='${field}']`);
  if (element) element.textContent = value.trim();
}

function applySectionStyles(target, section, settings = {}) {
  if (hasText(section.backgroundImage)) {
    const overlay = Number.isFinite(Number(settings.overlayOpacity))
      ? Math.min(1, Math.max(0, Number(settings.overlayOpacity)))
      : 0.35;
    target.style.backgroundImage = `linear-gradient(rgba(0,0,0,${overlay}), rgba(0,0,0,${overlay})), url('${section.backgroundImage.trim()}')`;
    target.style.backgroundSize = settings.backgroundSize || "cover";
    target.style.backgroundPosition = settings.backgroundPosition || "center center";
    target.style.backgroundRepeat = settings.backgroundRepeat || "no-repeat";
  } else if (hasText(settings.gradientStart) && hasText(settings.gradientEnd)) {
    target.style.background = `linear-gradient(135deg, ${settings.gradientStart}, ${settings.gradientEnd})`;
  } else if (hasText(section.backgroundColor)) {
    target.style.background = section.backgroundColor;
  }

  if (hasText(section.textColor)) target.style.color = section.textColor;
  if (hasText(section.headingColor)) {
    target.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach(h => h.style.color = section.headingColor);
  }

  if (hasText(section.fontFamily)) target.style.fontFamily = section.fontFamily;
  if (hasText(section.fontSize)) target.style.fontSize = normaliseCssSize(section.fontSize);
  if (hasText(settings.headingFontFamily)) {
    target.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach(h => h.style.fontFamily = settings.headingFontFamily);
  }
  if (hasText(settings.headingFontSize)) {
    target.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach(h => h.style.fontSize = normaliseCssSize(settings.headingFontSize));
  }

  if (hasText(settings.paddingTop)) target.style.paddingTop = normaliseCssSize(settings.paddingTop);
  if (hasText(settings.paddingBottom)) target.style.paddingBottom = normaliseCssSize(settings.paddingBottom);
  if (hasText(settings.borderRadius)) target.style.borderRadius = normaliseCssSize(settings.borderRadius);

  const shadows = {
    none: "none",
    soft: "0 10px 30px rgba(0,0,0,.08)",
    medium: "0 18px 45px rgba(0,0,0,.15)",
    strong: "0 28px 70px rgba(0,0,0,.25)"
  };
  if (shadows[settings.shadow]) target.style.boxShadow = shadows[settings.shadow];

  if (hasText(section.buttonColor)) {
    target.querySelectorAll("[data-field='button']").forEach(btn => btn.style.background = section.buttonColor);
  }
  if (hasText(settings.animation)) target.classList.add("cms-animate", settings.animation);
}

function normaliseCssSize(value) {
  const text = String(value).trim();
  return /^-?\d+(\.\d+)?$/.test(text) ? `${text}px` : text;
}

function applyVideoBackground(target, videoUrl) {
  let video = target.querySelector(":scope > .cms-bg-video");
  if (!video) {
    video = document.createElement("video");
    video.className = "cms-bg-video";
    Object.assign(video, { autoplay: true, muted: true, loop: true, playsInline: true });
    target.prepend(video);
  }
  if (video.src !== videoUrl) video.src = videoUrl;
}

function renderGallery(target, gallery) {
  const galleryBox = target.querySelector("[data-field='gallery']");
  const urls = gallery.filter(hasText);
  if (!galleryBox || !urls.length) return;
  galleryBox.replaceChildren(...urls.map(url => {
    const img = document.createElement("img");
    img.src = url.trim();
    img.alt = "CeyBreez Gallery";
    img.loading = "lazy";
    return img;
  }));
}

function renderCards(target, cards) {
  const cardsBox = target.querySelector("[data-field='cards']");
  const validCards = cards.filter(card => card && (hasText(card.title) || hasText(card.description) || hasText(card.image)));
  if (!cardsBox || !validCards.length) return; // Preserve existing cards when CMS cards are blank.

  const fragment = document.createDocumentFragment();
  validCards.forEach(card => {
    const item = document.createElement("div");
    item.className = "cms-card";

    if (hasText(card.image)) {
      const img = document.createElement("img");
      img.src = card.image.trim();
      img.alt = hasText(card.title) ? card.title.trim() : "CeyBreez";
      img.loading = "lazy";
      item.appendChild(img);
    }
    if (hasText(card.title)) {
      const h3 = document.createElement("h3"); h3.textContent = card.title.trim(); item.appendChild(h3);
    }
    if (hasText(card.description)) {
      const p = document.createElement("p"); p.textContent = card.description.trim(); item.appendChild(p);
    }
    if (hasText(card.buttonText)) {
      const a = document.createElement("a");
      a.href = hasText(card.buttonUrl) ? card.buttonUrl.trim() : "#";
      a.textContent = card.buttonText.trim();
      item.appendChild(a);
    }
    fragment.appendChild(item);
  });
  cardsBox.replaceChildren(fragment);
}
