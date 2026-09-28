/* ================================================================
   CEYBREEZ JAVASCRIPT DEVELOPER NOTE
   FILE: page-builder.js
   PURPOSE: Front-end behavior / API integration.
   API REFERENCES FOUND: No direct /api/... string found in this file
   EDITING TIP: Search for "JS FUNCTION:" to find documented functions.
   WARNING: Change DOM ids/classes only if you also update the matching HTML/CSS.
   ================================================================ */

(() => {
  "use strict";

  const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";
  const BUILDER_MODE = new URLSearchParams(window.location.search).has("cbuilder");
  const VISUAL_PUBLIC_MODE = new URLSearchParams(window.location.search).has("visual");
  const allowVisualOverrides = () => BUILDER_MODE || VISUAL_PUBLIC_MODE || document.body?.dataset.cmsLayout === "legacy";
  let lastSections = [];

  const settingsOf = (value) => {
    try {
      return typeof value === "string" ? JSON.parse(value || "{}") : (value || {});
    } catch {
      return {};
    }
  };

  const pageKey = () => document.body?.dataset.page || "home";
  const isVisualSection = (section) => String(section?.sectionKey || "").startsWith("__visual_");

  /* JS FUNCTION: loadCeyBreezSections — Loads CMS page sections for the current page. */

  async function loadCeyBreezSections(page = pageKey()) {
    try {
      const url = `${API_BASE}/api/page-sections?page=${encodeURIComponent(page)}&v=${Date.now()}`;
      const response = await fetch(url, { cache: "no-store" });
      const sections = await response.json();
      if (!response.ok) throw new Error(sections.error || "Page content load failed");

      lastSections = Array.isArray(sections) ? sections : [];
      lastSections.forEach(applySection);
      document.body.classList.add("cms-ready");
      return lastSections;
    } catch (error) {
      console.error("Page Builder load failed", error);
      return [];
    }
  }

  /* JS FUNCTION: applySection — Applies CMS content fields to matching HTML targets. */

  function applySection(section) {
    if (isVisualSection(section)) {
      // The Visual Builder owns these records. Its iframe skips them and applies
      // the local draft after loading the normal CMS content.
      if (allowVisualOverrides()) {
        const settings = settingsOf(section.settings);
        applyVisualBuilderRecords(document.body, settings.visualBuilderRecords || []);
      }
      return;
    }

    const target = document.querySelector(`[data-section="${CSS.escape(section.sectionKey || "")}"]`);
    if (!target) return;

    const settings = settingsOf(section.settings);
    const mode = settings.backgroundMode || section.backgroundType || "color";
    const set = (field, value) => {
      if (value === undefined || value === null || value === "") return;
      const node = target.querySelector(`[data-field="${field}"]`);
      if (node) node.textContent = value;
    };

    set("title", section.title);
    set("subtitle", section.subtitle);
    set("content", section.content);

    const button = target.querySelector('[data-field="button"]');
    if (button) {
      if (section.buttonText) button.textContent = section.buttonText;
      if (section.buttonUrl) button.href = section.buttonUrl;
    }

    const image = target.querySelector('[data-field="image"]');
    if (image && section.mediaUrl) image.src = section.mediaUrl;

    target.querySelector(":scope > .cms-bg-video")?.remove();

    if (allowVisualOverrides()) {
      if (mode === "video" && settings.videoUrl) applyVideoBackground(target, settings.videoUrl);
      if (Array.isArray(settings.cards)) renderCards(target, settings.cards);
      applySectionStyles(target, section, settings);
      renderCustom(target, section, settings);
      applyElementStyles(target, settings.elementStyles || {});
      applyVisualBuilderRecords(target, settings.visualBuilderRecords || []);
    }
  }

  /* JS FUNCTION: applySectionStyles — Applies permitted CMS styling when visual override mode is enabled. */

  function applySectionStyles(target, section, settings) {
    const mode = settings.backgroundMode || section.backgroundType || "color";
    target.style.background = "";
    target.style.backgroundImage = "";

    if (mode === "image" && section.backgroundImage) {
      const overlay = Number(settings.overlay ?? 35) / 100;
      target.style.backgroundImage = `linear-gradient(rgba(0,0,0,${overlay}),rgba(0,0,0,${overlay})),url('${section.backgroundImage}')`;
      target.style.backgroundSize = settings.backgroundSize || "cover";
      target.style.backgroundPosition = settings.backgroundPosition || "center center";
    } else if (mode === "gradient") {
      target.style.background = `linear-gradient(135deg,${settings.gradientStart || "#ffffff"},${settings.gradientEnd || "#f8f3eb"})`;
    } else if (mode === "color" && section.backgroundColor) {
      target.style.background = section.backgroundColor;
    }

    if (section.textColor) target.style.color = section.textColor;
    if (section.fontFamily) target.style.fontFamily = section.fontFamily;
    if (section.fontSize || settings.fontSize) target.style.fontSize = section.fontSize || settings.fontSize;
    if (settings.paddingTop) target.style.paddingTop = settings.paddingTop;
    if (settings.paddingBottom) target.style.paddingBottom = settings.paddingBottom;
    if (settings.borderRadius) target.style.borderRadius = settings.borderRadius;

    target.querySelectorAll("h1,h2,h3").forEach((heading) => {
      if (section.headingColor || settings.headingColor) heading.style.color = section.headingColor || settings.headingColor;
      if (settings.headingFont) heading.style.fontFamily = settings.headingFont;
      if (settings.headingSize) heading.style.fontSize = settings.headingSize;
    });

    if (section.buttonColor) {
      target.querySelectorAll("a,button").forEach((button) => {
        button.style.background = section.buttonColor;
      });
    }
  }

  const device = () => (innerWidth <= 600 ? "mobile" : innerWidth <= 900 ? "tablet" : "desktop");

  /* JS FUNCTION: merged — Merges desktop/tablet/mobile visual-builder settings. */

  function merged(byDevice) {
    const current = device();
    return Object.assign({}, byDevice?.desktop || {}, current !== "desktop" ? (byDevice?.[current] || {}) : {});
  }

  /* JS FUNCTION: applyRecord — Applies one visual-builder style record to an element. */

  function applyRecord(element, record) {
    if (!element || !record) return;
    if (record.text !== undefined) {
      if (["INPUT", "TEXTAREA"].includes(element.tagName)) element.value = record.text;
      else element.textContent = record.text;
    }
    if (record.href !== undefined && element.matches("a,button")) element.setAttribute("href", record.href || "#");
    if (record.src !== undefined && element.matches("img,video,source")) element.setAttribute("src", record.src || "");

    ["fontSize", "width", "height", "marginTop", "marginRight", "marginBottom", "marginLeft", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderRadius"].forEach((key) => {
      element.style[key] = record[key] === "" || record[key] == null ? "" : `${Number(record[key])}px`;
    });
    ["color", "backgroundColor", "fontWeight", "textAlign"].forEach((key) => {
      element.style[key] = record[key] || "";
    });

    element.style.opacity = record.opacity === "" || record.opacity == null ? "" : String(record.opacity);
    element.style.display = record.hidden ? "none" : "";
    element.style.transform = `translate(${Number(record.x) || 0}px,${Number(record.y) || 0}px)`;
  }

  /* JS FUNCTION: applyElementStyles — Applies element-level visual styles. */

  function applyElementStyles(section, styles) {
    Object.entries(styles).forEach(([selector, byDevice]) => {
      let nodes = [];
      try {
        nodes = selector === ":scope" ? [section] : [...section.querySelectorAll(selector)];
      } catch {
        return;
      }
      const record = merged(byDevice);
      nodes.forEach((node) => applyRecord(node, record));
    });
  }

  /* JS FUNCTION: renderCustom — Renders custom visual-builder elements. */

  function renderCustom(target, section, settings) {
    target.querySelectorAll('[data-pb-custom="1"]').forEach((node) => node.remove());
    (settings.customElements || []).filter((item) => item.sectionKey === section.sectionKey).forEach((item) => {
      let node;
      if (item.type === "button") {
        node = document.createElement("a");
        node.href = item.url || "#";
        node.textContent = item.text || "Button";
        node.className = "cms-custom-button";
      } else if (item.type === "image") {
        node = document.createElement("img");
        node.src = item.url || "";
        node.alt = item.alt || "";
        node.className = "cms-custom-image";
      } else {
        node = document.createElement(item.type === "heading" ? "h2" : "p");
        node.textContent = item.text || "";
        node.className = "cms-custom-text";
      }
      node.dataset.pbCustom = "1";
      node.dataset.pbId = item.id;
      target.appendChild(node);
    });
  }

  /* JS FUNCTION: applyVideoBackground — Creates/removes a section video background. */

  function applyVideoBackground(target, url) {
    let video = target.querySelector(".cms-bg-video");
    if (!video) {
      video = document.createElement("video");
      video.className = "cms-bg-video";
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      target.prepend(video);
    }
    video.src = url;
  }

  /* JS FUNCTION: renderCards — Renders CMS card collections. */

  function renderCards(target, cards) {
    const box = target.querySelector('[data-field="cards"]');
    if (!box) return;
    box.innerHTML = "";
    cards.forEach((card) => {
      const node = document.createElement("div");
      node.className = "cms-card";
      if (card.image) {
        const image = document.createElement("img");
        image.src = card.image;
        image.alt = card.title || "";
        node.appendChild(image);
      }
      const heading = document.createElement("h3");
      heading.textContent = card.title || "";
      node.appendChild(heading);
      const text = document.createElement("p");
      text.textContent = card.description || "";
      node.appendChild(text);
      if (card.buttonText) {
        const link = document.createElement("a");
        link.href = card.buttonUrl || "#";
        link.textContent = card.buttonText;
        node.appendChild(link);
      }
      box.appendChild(node);
    });
  }

  /* JS FUNCTION: applyVisualBuilderRecords — Applies saved visual-builder DOM records. */

  function applyVisualBuilderRecords(root, records) {
    (Array.isArray(records) ? records : []).forEach((record) => {
      if (!record?.selector) return;
      let nodes = [];
      try {
        nodes = record.selector === ":scope" ? [root] : [...root.querySelectorAll(record.selector)];
      } catch {
        return;
      }

      nodes.forEach((element) => {
        if (record.html !== undefined && record.html !== null && !["IMG", "VIDEO", "INPUT", "TEXTAREA"].includes(element.tagName)) {
          element.innerHTML = record.html;
        }
        Object.entries(record.attrs || {}).forEach(([name, value]) => {
          if (!name.startsWith("data-cb-") && value !== null && value !== undefined) element.setAttribute(name, value);
        });
        if (record.style !== undefined) element.setAttribute("style", record.style || "");

        const override = device() === "desktop" ? {} : (record.deviceStyles?.[device()] || {});
        Object.entries(override).forEach(([name, value]) => {
          if (value === "" || value == null) element.style.removeProperty(name);
          else element.style.setProperty(name, String(value), "important");
        });
      });
    });
  }


  /* ================================================================
     FOOTER PARTNERS / APPROVAL LOGOS
     DATA SOURCE: site_content.footer_partners (JSON array)
     CMS: Page Builder > Global Settings > Footer Partners & Recognition
     Public behavior: only active items with a logo are displayed.
     ================================================================ */

  function parseFooterPartners(raw) {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw || "[]") : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function safePartnerLink(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw, window.location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function safePartnerImage(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw, window.location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function ensureFooterPartnerStyles() {
    if (document.getElementById("cbFooterPartnerStyles")) return;
    const style = document.createElement("style");
    style.id = "cbFooterPartnerStyles";
    style.textContent = `
      .cb-footer-partners{width:min(1180px,calc(100% - 36px));margin:0 auto 26px;padding:28px 0 24px;border-top:1px solid rgba(255,255,255,.10);border-bottom:1px solid rgba(255,255,255,.10)}
      .cb-footer-partners__head{display:flex;align-items:center;justify-content:center;gap:12px;margin:0 0 20px;color:#e7bd7c;font:800 10px/1.25 "DM Sans","Poppins",Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;text-align:center}
      .cb-footer-partners__head:before,.cb-footer-partners__head:after{content:"";width:42px;height:1px;background:rgba(231,189,124,.45)}
      .cb-footer-partners__logos{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:12px}
      .cb-footer-partner{display:flex;align-items:center;justify-content:center;width:148px;height:76px;padding:10px 14px;background:#fff;border:1px solid rgba(255,255,255,.28);border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.08);transition:transform .2s ease,box-shadow .2s ease,opacity .2s ease;text-decoration:none!important;overflow:hidden}
      a.cb-footer-partner:hover{transform:translateY(-3px);box-shadow:0 12px 28px rgba(0,0,0,.15)}
      .cb-footer-partner img{display:block!important;max-width:100%!important;max-height:52px!important;width:auto!important;height:auto!important;object-fit:contain!important;filter:none!important;margin:0!important}
      .cb-footer-partner__sr{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
      @media(max-width:700px){
        .cb-footer-partners{width:calc(100% - 28px);padding:24px 0 20px;margin-bottom:22px}
        .cb-footer-partners__head{font-size:9px;margin-bottom:16px}
        .cb-footer-partners__logos{justify-content:flex-start;flex-wrap:nowrap;overflow-x:auto;padding:2px 2px 8px;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;scrollbar-width:none}
        .cb-footer-partners__logos::-webkit-scrollbar{display:none}
        .cb-footer-partner{flex:0 0 126px;width:126px;height:68px;border-radius:12px;scroll-snap-align:start}
        .cb-footer-partner img{max-height:46px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function renderFooterPartners(siteContent) {
    const items = parseFooterPartners(siteContent?.footer_partners)
      .filter((item) => item && item.active !== false && item.active !== 0 && String(item.logo || "").trim());

    document.querySelectorAll(".cb-footer-partners").forEach((node) => node.remove());
    if (!items.length) return;

    ensureFooterPartnerStyles();
    const heading = String(siteContent?.footer_partners_heading || "Partners & Recognition").trim() || "Partners & Recognition";

    document.querySelectorAll(".site-footer").forEach((footer) => {
      const section = document.createElement("section");
      section.className = "cb-footer-partners";
      section.setAttribute("aria-label", heading);

      const title = document.createElement("div");
      title.className = "cb-footer-partners__head";
      title.textContent = heading;
      section.appendChild(title);

      const logos = document.createElement("div");
      logos.className = "cb-footer-partners__logos";

      items.forEach((item, index) => {
        const logo = safePartnerImage(item.logo);
        if (!logo) return;

        const name = String(item.name || `Partner ${index + 1}`).trim();
        const category = String(item.category || "Partner").trim();
        const link = safePartnerLink(item.url);
        const card = document.createElement(link ? "a" : "span");
        card.className = "cb-footer-partner";
        card.title = category && category !== "Partner" ? `${name} — ${category}` : name;

        if (link) {
          card.href = link;
          card.target = "_blank";
          card.rel = /sponsor|advert/i.test(category) ? "noopener noreferrer sponsored" : "noopener noreferrer";
          card.setAttribute("aria-label", `Visit ${name}`);
        }

        const image = document.createElement("img");
        image.src = logo;
        image.alt = name;
        image.loading = "lazy";
        image.decoding = "async";
        card.appendChild(image);

        const sr = document.createElement("span");
        sr.className = "cb-footer-partner__sr";
        sr.textContent = category;
        card.appendChild(sr);
        logos.appendChild(card);
      });

      if (!logos.children.length) return;
      section.appendChild(logos);
      const bottom = footer.querySelector(".footer-bottom");
      if (bottom) footer.insertBefore(section, bottom);
      else footer.appendChild(section);
    });
  }

  async function loadFooterPartners() {
    try {
      const response = await fetch(`${API_BASE}/api/site-content?v=${Date.now()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Footer partners load failed");
      renderFooterPartners(data || {});
    } catch (error) {
      console.warn("Footer partners unavailable", error);
    }
  }

  let readyResolve;
  window.CEYBREEZ_PAGE_BUILDER_READY = new Promise((resolve) => {
    readyResolve = resolve;
  });

  /* JS FUNCTION: start — Initializes CMS page-builder behavior safely. */

  async function start() {
    const [sections] = await Promise.all([
      loadCeyBreezSections(pageKey()),
      loadFooterPartners()
    ]);
    readyResolve(sections);
    window.dispatchEvent(new CustomEvent("ceybreez:page-builder-ready", { detail: { sections } }));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  if (allowVisualOverrides() && !BUILDER_MODE) {
    let resizeTimer;
    addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        lastSections.filter(isVisualSection).forEach(applySection);
      }, 180);
    });
  }
})();
