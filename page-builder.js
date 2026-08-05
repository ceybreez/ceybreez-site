(() => {
  "use strict";

  const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";
  const BUILDER_MODE = new URLSearchParams(window.location.search).has("cbuilder");
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

  function applySection(section) {
    if (isVisualSection(section)) {
      // The Visual Builder owns these records. Its iframe skips them and applies
      // the local draft after loading the normal CMS content.
      if (!BUILDER_MODE) {
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
    if (mode === "video" && settings.videoUrl) applyVideoBackground(target, settings.videoUrl);
    if (Array.isArray(settings.cards)) renderCards(target, settings.cards);

    applySectionStyles(target, section, settings);
    renderCustom(target, section, settings);
    applyElementStyles(target, settings.elementStyles || {});
    applyVisualBuilderRecords(target, settings.visualBuilderRecords || []);
  }

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

  function analyseResponsive(root = document.body) {
    if (!root) return;
    root.querySelectorAll('[data-cb-responsive],[data-cb-responsive-item]').forEach((element) => {
      delete element.dataset.cbResponsive;
      delete element.dataset.cbResponsiveItem;
    });
    root.querySelectorAll('*').forEach((element) => {
      if (['NAV','HEADER','FOOTER','SCRIPT','STYLE','LINK','META'].includes(element.tagName)) return;
      const children = [...element.children].filter((child) => !['SCRIPT','STYLE','LINK'].includes(child.tagName));
      if (children.length < 2) return;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const childRects = children.map((child) => child.getBoundingClientRect()).filter((box) => box.width > 0 && box.height > 0);
      const sideBySide = childRects.length > 1 && childRects.some((box, index) =>
        childRects.slice(index + 1).some((other) => Math.abs(box.top - other.top) < Math.min(box.height, other.height) * 0.45 && Math.abs(box.left - other.left) > 20)
      );
      if (style.display === 'grid') element.dataset.cbResponsive = 'grid';
      else if (style.display === 'flex' && !element.classList.contains('footer-links')) element.dataset.cbResponsive = 'flex';
      else if (sideBySide && rect.width > 420) element.dataset.cbResponsive = 'row';
      if (element.dataset.cbResponsive) children.forEach((child) => { child.dataset.cbResponsiveItem = '1'; });
    });
  }

  function merged(byDevice) {
    const current = device();
    return Object.assign({}, byDevice?.desktop || {}, current !== "desktop" ? (byDevice?.[current] || {}) : {});
  }

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
    const free = record.positionMode === "free";
    element.dataset.pbPositionMode = free ? "free" : "flow";
    ["position","left","top","z-index"].forEach((name) => element.style.removeProperty(name));
    if (free) { element.style.setProperty("position","absolute","important"); element.style.setProperty("left",`${Number(record.x)||0}px`,"important"); element.style.setProperty("top",`${Number(record.y)||0}px`,"important"); element.style.setProperty("z-index","10","important"); }
    element.style.transform = "";
    if (free && element.parentElement && getComputedStyle(element.parentElement).position === "static") element.parentElement.style.position = "relative";
  }

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

  function renderCustom(target, section, settings) {
    target.querySelectorAll('[data-pb-custom="1"]').forEach((node) => node.remove());
    (settings.customElements || []).filter((item) => item.sectionKey === section.sectionKey).forEach((item) => {
      let node;
      if (item.type === "slideshow") {
        node = createSlideshow(item);
      } else if (item.type === "button") {
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

  function createSlideshow(item) {
    const options = item.options || {}, slides = item.slides || [];
    const wrap = document.createElement("div");
    wrap.className = "cms-slideshow";
    wrap.dataset.pbSlideshow = "1";
    wrap.style.setProperty("--pb-slide-fit", options.fit || "cover");
    const track = document.createElement("div");
    track.className = `cms-slideshow-track ${options.transition === "slide" ? "is-slide" : "is-fade"}`;
    wrap.appendChild(track);
    slides.forEach((slide, index) => {
      const page = document.createElement("div");
      page.className = `cms-slide${index === 0 ? " active" : ""}`;
      const image = document.createElement("img"); image.src = slide.url || ""; image.alt = slide.alt || ""; page.appendChild(image);
      const caption = document.createElement("div"); caption.className = "cms-slide-caption";
      if (slide.title) { const h = document.createElement("h3"); h.textContent = slide.title; caption.appendChild(h); }
      if (slide.text) { const p = document.createElement("p"); p.textContent = slide.text; caption.appendChild(p); }
      if (slide.buttonText) { const a = document.createElement("a"); a.href = slide.buttonUrl || "#"; a.textContent = slide.buttonText; caption.appendChild(a); }
      page.appendChild(caption); track.appendChild(page);
    });
    if (!slides.length) track.innerHTML = '<div class="cms-slide-empty">No slideshow images</div>';
    if (options.arrows !== false) wrap.insertAdjacentHTML("beforeend", '<button type="button" class="cms-slide-prev" aria-label="Previous">‹</button><button type="button" class="cms-slide-next" aria-label="Next">›</button>');
    if (options.dots !== false && slides.length) { const dots=document.createElement("div");dots.className="cms-slide-dots";dots.innerHTML=slides.map((_,i)=>`<button type="button" class="${i===0?"active":""}" data-slide-go="${i}" aria-label="Slide ${i+1}"></button>`).join("");wrap.appendChild(dots); }
    initSlideshow(wrap, options);
    return wrap;
  }

  function initSlideshow(wrap, options) {
    let index=0,timer; const slides=[...wrap.querySelectorAll(".cms-slide")],dots=[...wrap.querySelectorAll("[data-slide-go]")]; if(!slides.length)return;
    const go=(next)=>{index=options.loop===false?Math.max(0,Math.min(slides.length-1,next)):(next+slides.length)%slides.length;slides.forEach((slide,i)=>slide.classList.toggle("active",i===index));dots.forEach((dot,i)=>dot.classList.toggle("active",i===index));};
    wrap.querySelector(".cms-slide-prev")?.addEventListener("click",()=>go(index-1)); wrap.querySelector(".cms-slide-next")?.addEventListener("click",()=>go(index+1)); dots.forEach(dot=>dot.addEventListener("click",()=>go(Number(dot.dataset.slideGo))));
    const play=()=>{if(options.autoplay!==false&&slides.length>1)timer=setInterval(()=>go(index+1),(options.duration||5)*1000);};wrap.addEventListener("mouseenter",()=>clearInterval(timer));wrap.addEventListener("mouseleave",play);play();
  }

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
        element.dataset.cbLiveEdited = "1";
        if (record.html !== undefined && record.html !== null && !["IMG", "VIDEO", "INPUT", "TEXTAREA"].includes(element.tagName)) {
          element.innerHTML = record.html;
        }
        Object.entries(record.attrs || {}).forEach(([name, value]) => {
          if (!name.startsWith("data-cb-") && value !== null && value !== undefined) element.setAttribute(name, value);
        });
        if (record.style !== undefined) element.setAttribute("style", record.style || "");
        if (record.hover) {
          const styleId = "cb-live-hover-styles";
          let hoverStyle = document.getElementById(styleId);
          if (!hoverStyle) {
            hoverStyle = document.createElement("style");
            hoverStyle.id = styleId;
            document.head.appendChild(hoverStyle);
          }
          const safeSelector = record.selector;
          hoverStyle.textContent += `${safeSelector}{transition:${record.hover.transition || "all .25s ease"}}${safeSelector}:hover{background:${record.hover.background || "inherit"}!important;color:${record.hover.color || "inherit"}!important;transform:${record.hover.transform || "none"}!important}`;
        }

        const override = device() === "desktop" ? {} : (record.deviceStyles?.[device()] || {});
        Object.entries(override).forEach(([name, value]) => {
          if (value === "" || value == null) element.style.removeProperty(name);
          else element.style.setProperty(name, String(value), "important");
        });
      });
    });
  }

  let readyResolve;
  window.CEYBREEZ_PAGE_BUILDER_READY = new Promise((resolve) => {
    readyResolve = resolve;
  });

  async function start() {
    if (!document.getElementById("cb-live-responsive")) {
      const responsive = document.createElement("style");
      responsive.id = "cb-live-responsive";
      responsive.textContent = `html,body{max-width:100%;overflow-x:hidden}*,*::before,*::after{box-sizing:border-box}img,video,svg,canvas,iframe{max-width:100%}section,main,header,footer,div{min-width:0}@media(max-width:900px){[data-cb-responsive="grid"]{grid-template-columns:repeat(2,minmax(0,1fr))!important}[data-cb-responsive="flex"],[data-cb-responsive="row"]{display:flex!important;flex-wrap:nowrap!important;align-items:stretch!important;gap:18px!important;width:100%!important;max-width:100%!important}[data-cb-responsive-item="1"]{min-width:0!important;max-width:100%!important;transform:none!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important}[data-cb-responsive="flex"]>[data-cb-responsive-item="1"],[data-cb-responsive="row"]>[data-cb-responsive-item="1"]{position:relative!important;flex:1 1 0!important;width:auto!important}img[data-cb-responsive-item="1"],[data-cb-responsive-item="1"]>img{width:100%!important;height:100%!important;min-height:180px!important;object-fit:cover!important}}@media(max-width:600px){[data-cb-responsive="grid"],[data-cb-responsive="flex"],[data-cb-responsive="row"]{display:flex!important;flex-direction:column!important;align-items:stretch!important;grid-template-columns:minmax(0,1fr)!important;width:100%!important;max-width:100%!important}[data-cb-responsive-item="1"]{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;flex:0 0 auto!important;position:relative!important;transform:none!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important}main>section{max-width:100%!important}img[data-cb-responsive-item="1"],[data-cb-responsive-item="1"]>img{display:block!important;width:100%!important;max-width:100%!important;height:auto!important;min-height:0!important;object-fit:cover!important;visibility:visible!important;opacity:1!important}h1{font-size:clamp(1.9rem,10vw,3rem)}h2{font-size:clamp(1.55rem,8vw,2.35rem)}p,a,button{max-width:100%;overflow-wrap:anywhere}nav{max-width:100%!important;min-width:0!important;flex-wrap:wrap!important;white-space:normal!important}}`;
      document.head.appendChild(responsive);
    }
    if (!document.getElementById("cb-slideshow-styles")) {
      const style=document.createElement("style");style.id="cb-slideshow-styles";style.textContent=`.cms-slideshow{position:relative;width:min(100%,1100px);height:clamp(260px,48vw,620px);overflow:hidden;background:#102635;border-radius:16px}.cms-slideshow-track,.cms-slide{position:absolute;inset:0}.cms-slide{opacity:0;visibility:hidden;transition:opacity .65s ease}.cms-slide.active{opacity:1;visibility:visible}.cms-slide img{display:block;width:100%;height:100%;max-width:none;object-fit:var(--pb-slide-fit,cover)}.cms-slide-caption{position:absolute;inset:auto 7% 10%;color:#fff;text-shadow:0 2px 12px #000;padding:18px;max-width:650px}.cms-slide-caption h3,.cms-slide-caption p{color:inherit;margin:0 0 10px}.cms-slide-caption a{display:inline-block;padding:10px 18px;border-radius:7px;background:#c6a35b;color:#102635;text-decoration:none;text-shadow:none}.cms-slide-prev,.cms-slide-next{position:absolute;z-index:3;top:50%;transform:translateY(-50%);width:42px;height:42px;border:0;border-radius:50%;background:#ffffffd9;color:#17324d;font-size:30px;cursor:pointer}.cms-slide-prev{left:14px}.cms-slide-next{right:14px}.cms-slide-dots{position:absolute;z-index:3;left:50%;bottom:14px;transform:translateX(-50%);display:flex;gap:7px}.cms-slide-dots button{width:10px;height:10px;padding:0;border:0;border-radius:50%;background:#ffffff80}.cms-slide-dots button.active{background:#fff}.cms-slide-empty{height:100%;display:grid;place-items:center;color:#fff}@media(max-width:600px){.cms-slideshow{width:100%!important;height:clamp(220px,70vw,420px)!important;left:auto!important;top:auto!important}.cms-slide-caption{inset:auto 4% 8%;padding:10px}.cms-slide-prev,.cms-slide-next{width:36px;height:36px}}`;
      document.head.appendChild(style);
    }
    const sections = await loadCeyBreezSections(pageKey());
    requestAnimationFrame(() => analyseResponsive(document.body));
    readyResolve(sections);
    window.dispatchEvent(new CustomEvent("ceybreez:page-builder-ready", { detail: { sections } }));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  if (!BUILDER_MODE) {
    let resizeTimer;
    addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        lastSections.filter(isVisualSection).forEach(applySection);
        analyseResponsive(document.body);
      }, 180);
    });
  }
})();
