/* ================================================================
   CEYBREEZ ADMIN — FOOTER PARTNERS & RECOGNITION MANAGER V5.9.2
   Stores data in existing site_content table using:
     footer_partners_heading
     footer_partners (JSON array)
   No Worker route or D1 table change required.
   ================================================================ */
(() => {
  "use strict";

  const API = "https://ceybreez-contact-api.ceybreez.workers.dev";
  let partners = [];
  let loaded = false;
  let dirty = false;
  let tokenWatch = null;
  let loadInFlight = null;

  function sessionValidated() {
    return sessionStorage.getItem("CEYBREEZ_SESSION_VALIDATED") === "1" && !!token();
  }

  const token = () => {
    try { if (typeof ADMIN_TOKEN !== "undefined" && ADMIN_TOKEN) return ADMIN_TOKEN; } catch (_) {}
    return sessionStorage.getItem("CEYBREEZ_SESSION_TOKEN") || localStorage.getItem("CEYBREEZ_ADMIN_TOKEN") || "";
  };

  const auth = (json = false) => {
    const headers = { Authorization: `Bearer ${token()}` };
    if (json) headers["Content-Type"] = "application/json";
    return headers;
  };

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function uid() {
    return `FP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  function normaliseUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    let candidate = "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) candidate = raw;
    else if (/^(www\.|[a-z0-9-]+\.[a-z]{2,})(?:\/|$)/i.test(raw)) candidate = `https://${raw}`;
    else if (raw.startsWith("/")) candidate = raw;
    else return "";
    try {
      const url = new URL(candidate, window.location.origin);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch (_) {
      return "";
    }
  }

  function normalise(item = {}) {
    const active = !(item.active === false || item.active === 0 || item.active === "0" || item.active === "false");
    return {
      id: String(item.id || uid()),
      name: String(item.name || "").trim(),
      category: String(item.category || "Partner"),
      logo: String(item.logo || "").trim(),
      url: String(item.url || "").trim(),
      active
    };
  }

  function parse(raw) {
    try {
      const value = typeof raw === "string" ? JSON.parse(raw || "[]") : raw;
      return Array.isArray(value) ? value.map(normalise) : [];
    } catch {
      return [];
    }
  }

  function markDirty(value = true) {
    dirty = value;
    const save = document.getElementById("cbSaveFooterPartners");
    if (save) save.textContent = dirty ? "Save Footer Logos *" : "Save Footer Logos";
  }

  function ensureStyles() {
    if (document.getElementById("cbFooterPartnersAdminStyles")) return;
    const style = document.createElement("style");
    style.id = "cbFooterPartnersAdminStyles";
    style.textContent = `
      .cb-fp-manager{grid-column:1/-1;background:linear-gradient(180deg,#fbfcfb 0%,#f5f8f6 100%);border:1px solid #dce7df;border-radius:20px;padding:22px;margin:18px 0;box-shadow:0 12px 34px rgba(15,92,77,.06)}
      .cb-fp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:16px;padding-bottom:15px;border-bottom:1px solid #e4ebe7}.cb-fp-title-wrap{display:flex;gap:12px;align-items:flex-start}.cb-fp-title-icon{width:42px;height:42px;border-radius:13px;background:#0f5c4d;color:#fff;display:grid;place-items:center;font-size:19px;box-shadow:0 8px 20px rgba(15,92,77,.18)}
      .cb-fp-head h4{margin:0 0 5px;color:#0f4e43;font-size:19px}.cb-fp-head p{margin:0;color:#667085;font-size:12.5px;line-height:1.55;max-width:760px}.cb-fp-summary{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0 0}.cb-fp-chip{background:#eef5f1;color:#315a4e;border:1px solid #dbe9e2;border-radius:999px;padding:5px 9px;font-size:10.5px;font-weight:800}.cb-fp-chip.live{background:#e9f8ef;color:#087443;border-color:#c9ead7}
      .cb-fp-toolbar{display:grid;grid-template-columns:minmax(240px,1fr) auto auto;gap:10px;align-items:end;margin:16px 0}.cb-fp-toolbar label{display:grid;gap:6px;font-size:11px;font-weight:800;color:#344054}.cb-fp-toolbar input{width:100%;min-height:39px;border:1px solid #d5ddd8;border-radius:10px;padding:9px 11px;background:#fff;color:#18221f}.cb-fp-btn{border:0;border-radius:10px;padding:11px 15px;min-height:40px;font-weight:800;cursor:pointer;background:#0f766e;color:#fff;box-shadow:0 5px 14px rgba(15,118,110,.12)}.cb-fp-btn.secondary{background:#fff;color:#0f5c4d;border:1px solid #cddbd3;box-shadow:none}.cb-fp-btn:hover{transform:translateY(-1px)}.cb-fp-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
      .cb-fp-status{min-height:18px;margin:2px 0 11px;color:#667085;font-size:11.5px}.cb-fp-status.ok{color:#087443}.cb-fp-status.bad{color:#b42318}.cb-fp-status.warn{color:#8a6414}
      .cb-fp-list{display:grid;gap:12px}.cb-fp-empty{padding:28px;border:1px dashed #cbd5ce;border-radius:15px;text-align:center;color:#667085;background:#fff}.cb-fp-empty strong{color:#0f5c4d}
      .cb-fp-card{position:relative;display:grid;grid-template-columns:142px minmax(0,1fr) 104px;gap:14px;align-items:start;background:#fff;border:1px solid #dfe7e2;border-radius:16px;padding:14px;box-shadow:0 5px 18px rgba(25,55,47,.045)}.cb-fp-card.has-warning{border-color:#f1cf91;background:#fffdfa}.cb-fp-card.is-live{border-color:#bcdccb}.cb-fp-order{position:absolute;left:8px;top:8px;z-index:2;min-width:24px;height:24px;padding:0 6px;border-radius:999px;background:#0f5c4d;color:#fff;display:grid;place-items:center;font-size:10px;font-weight:900}.cb-fp-drag{position:absolute;right:8px;top:7px;border:0;background:transparent;color:#98a2b3;cursor:grab;font-size:17px;line-height:1;padding:4px}.cb-fp-card.cb-fp-dragging{opacity:.55;border-style:dashed}
      .cb-fp-preview-wrap{display:grid;gap:8px}.cb-fp-preview{width:142px;height:92px;border:1px solid #e3e8e5;border-radius:13px;background:linear-gradient(135deg,#f8faf9,#eef3f0);display:grid;place-items:center;overflow:hidden;padding:9px}.cb-fp-preview img{max-width:118px;max-height:68px;object-fit:contain}.cb-fp-preview span{font-size:10.5px;color:#98a2b3;text-align:center;padding:8px}.cb-fp-state{display:flex;align-items:center;justify-content:center;gap:6px;font-size:10px;font-weight:900}.cb-fp-state.live{color:#087443}.cb-fp-state.hidden{color:#667085}.cb-fp-state-dot{width:7px;height:7px;border-radius:50%;background:currentColor}
      .cb-fp-fields{display:grid;grid-template-columns:1.05fr .75fr 1.35fr;gap:10px}.cb-fp-fields label{display:grid;gap:5px;font-size:10.5px;font-weight:800;color:#475467}.cb-fp-fields .wide{grid-column:1/-1}.cb-fp-fields input,.cb-fp-fields select{min-width:0;width:100%;min-height:38px;border:1px solid #d5ddd8;border-radius:9px;padding:8px 10px;background:#fff;color:#1d2925}.cb-fp-fields input:focus,.cb-fp-fields select:focus{outline:2px solid rgba(15,118,110,.14);border-color:#0f766e}.cb-fp-logo-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}
      .cb-fp-actions{display:flex;flex-direction:column;gap:7px;min-width:96px;padding-top:24px}.cb-fp-actions button{border:1px solid #d0d5dd;background:#fff;border-radius:9px;padding:7px 9px;font-size:10.5px;font-weight:800;cursor:pointer;color:#344054}.cb-fp-actions button:hover{background:#f8faf9}.cb-fp-actions button.danger{color:#b42318;border-color:#f2c7c3}.cb-fp-actions button:disabled{opacity:.4;cursor:not-allowed}.cb-fp-actions .primary-mini{color:#0f766e;border-color:#bcdccb;background:#f0f8f4}
      .cb-fp-toggle-row{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 11px;border:1px solid #e4e9e6;border-radius:10px;background:#f8faf9}.cb-fp-toggle-copy{display:grid;gap:2px}.cb-fp-toggle-copy strong{font-size:11px;color:#344054}.cb-fp-toggle-copy span{font-size:10px;color:#667085;font-weight:500}.cb-fp-switch{position:relative;width:42px;height:23px;flex:0 0 auto}.cb-fp-switch input{position:absolute;opacity:0;pointer-events:none}.cb-fp-switch span{position:absolute;inset:0;border-radius:999px;background:#d0d5dd;cursor:pointer;transition:.18s}.cb-fp-switch span:after{content:"";position:absolute;width:17px;height:17px;left:3px;top:3px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.18);transition:.18s}.cb-fp-switch input:checked+span{background:#0f766e}.cb-fp-switch input:checked+span:after{transform:translateX(19px)}
      .cb-fp-warning{grid-column:1/-1;background:#fff4df;color:#7a4a00;padding:8px 10px;border-radius:9px;font-size:10.5px;font-weight:700}.cb-fp-valid{grid-column:1/-1;color:#087443;font-size:10.5px;font-weight:750;padding:2px 1px}
      .cb-fp-live-preview{margin-top:15px;padding:16px;border-radius:15px;background:linear-gradient(145deg,#0b3f36,#103f38);border:1px solid rgba(255,255,255,.08)}.cb-fp-live-preview h5{margin:0 0 12px;text-align:center;color:#e7bd7c;font-size:10px;letter-spacing:.14em;text-transform:uppercase}.cb-fp-live-logos{display:flex;flex-wrap:wrap;gap:9px;justify-content:center}.cb-fp-live-logo{width:124px;height:66px;background:#fff;border-radius:11px;display:grid;place-items:center;padding:8px;overflow:hidden;text-decoration:none;box-shadow:0 7px 18px rgba(0,0,0,.12)}.cb-fp-live-logo img{max-width:100%;max-height:46px;object-fit:contain}.cb-fp-live-logo:hover{transform:translateY(-2px)}.cb-fp-live-empty{color:#d1ded9;font-size:11px;text-align:center;width:100%}
      .cb-fp-legal{margin:12px 0 0;padding:10px 12px;border-radius:10px;background:#fff7e6;color:#7a4a00;font-size:11px;line-height:1.5;border:1px solid #f3ddb1}
      @media(max-width:980px){.cb-fp-card{grid-template-columns:112px 1fr}.cb-fp-preview{width:112px}.cb-fp-actions{grid-column:1/-1;flex-direction:row;flex-wrap:wrap;padding-top:0}.cb-fp-fields{grid-template-columns:1fr 1fr}.cb-fp-fields .wide{grid-column:1/-1}}
      @media(max-width:760px){.cb-fp-toolbar{grid-template-columns:1fr 1fr}.cb-fp-toolbar label{grid-column:1/-1}.cb-fp-card{grid-template-columns:1fr}.cb-fp-preview{width:100%;height:86px}.cb-fp-preview-wrap{padding-top:18px}.cb-fp-fields{grid-template-columns:1fr}.cb-fp-fields .wide{grid-column:auto}.cb-fp-logo-row{grid-template-columns:1fr}.cb-fp-actions{grid-column:auto}.cb-fp-drag{display:none}}
      @media(max-width:520px){.cb-fp-manager{padding:14px;border-radius:15px}.cb-fp-head{display:block}.cb-fp-title-wrap{gap:9px}.cb-fp-title-icon{width:36px;height:36px}.cb-fp-toolbar{grid-template-columns:1fr}.cb-fp-toolbar label{grid-column:auto}.cb-fp-actions button{flex:1 1 42%}}
    `;
    document.head.appendChild(style);
  }

  function injectManager() {
    const form = document.getElementById("siteContentForm");
    if (!form || document.getElementById("cbFooterPartnersManager")) return;
    ensureStyles();

    const manager = document.createElement("section");
    manager.id = "cbFooterPartnersManager";
    manager.className = "cb-fp-manager";
    manager.innerHTML = `
      <div class="cb-fp-head">
        <div class="cb-fp-title-wrap">
          <div class="cb-fp-title-icon" aria-hidden="true">✓</div>
          <div><h4>Footer Partners & Recognition</h4><p>Manage tourism-authority, approval, association, partner, sponsor, award and review-platform logos shown in the public footer. Each live logo should use an authorised image and an official destination link.</p><div class="cb-fp-summary"><span class="cb-fp-chip" id="cbFpTotal">0 total</span><span class="cb-fp-chip live" id="cbFpLive">0 live</span></div></div>
        </div>
      </div>
      <div class="cb-fp-toolbar">
        <label>Footer Section Heading<input id="cbFooterPartnersHeading" value="Partners & Recognition" placeholder="Partners & Recognition"></label>
        <button type="button" class="cb-fp-btn secondary" id="cbAddFooterPartner">+ Add Logo</button>
        <button type="button" class="cb-fp-btn" id="cbSaveFooterPartners">Save Footer Logos</button>
      </div>
      <div id="cbFooterPartnersStatus" class="cb-fp-status"></div>
      <div id="cbFooterPartnersList" class="cb-fp-list"></div>
      <div class="cb-fp-live-preview"><h5 id="cbFpPreviewHeading">Partners & Recognition</h5><div class="cb-fp-live-logos" id="cbFpPreviewLogos"></div></div>
      <p class="cb-fp-legal"><strong>Use authorised logos only.</strong> Do not display a tourism authority, approval mark, membership, TripAdvisor/review badge, award or sponsor unless CeyBreez has permission or a valid relationship. Live logos are clickable and should point to the official page saved below.</p>`;

    const uploadBox = form.querySelector(":scope > .upload-box");
    if (uploadBox) form.insertBefore(manager, uploadBox);
    else form.appendChild(manager);

    document.getElementById("cbAddFooterPartner")?.addEventListener("click", addPartner);
    document.getElementById("cbSaveFooterPartners")?.addEventListener("click", savePartners);
    document.getElementById("cbFooterPartnersHeading")?.addEventListener("input", () => { markDirty(); renderPublicPreview(); });
  }

  function setStatus(message = "", type = "") {
    const node = document.getElementById("cbFooterPartnersStatus");
    if (!node) return;
    node.textContent = message;
    node.className = `cb-fp-status ${type}`.trim();
  }

  function itemWarning(item) {
    if (!item.active) return "";
    if (!item.name.trim()) return "Live logo needs a name.";
    if (!item.logo.trim()) return "Live logo needs an image.";
    if (!item.url.trim()) return "Live logo needs an official link so visitors can click through.";
    if (!normaliseUrl(item.url)) return "Official link is not a valid http/https address.";
    return "";
  }

  function updateSummary() {
    const total = partners.length;
    const live = partners.filter(x => x.active && x.logo.trim() && x.name.trim()).length;
    const totalEl = document.getElementById("cbFpTotal");
    const liveEl = document.getElementById("cbFpLive");
    if (totalEl) totalEl.textContent = `${total} total`;
    if (liveEl) liveEl.textContent = `${live} live`;
  }

  function update(id, key, value) {
    const item = partners.find((x) => x.id === id);
    if (!item) return;
    item[key] = value;
    markDirty();
    if (["logo", "active", "category"].includes(key)) render();
    else { updateSummary(); renderPublicPreview(); }
  }

  function move(id, dir) {
    const index = partners.findIndex((x) => x.id === id);
    const next = index + dir;
    if (index < 0 || next < 0 || next >= partners.length) return;
    [partners[index], partners[next]] = [partners[next], partners[index]];
    markDirty();
    render();
  }

  function remove(id) {
    if (!confirm("Remove this footer logo?")) return;
    partners = partners.filter((x) => x.id !== id);
    markDirty();
    render();
  }

  function addPartner() {
    partners.push(normalise({ name: "", category: "Partner", active: false }));
    markDirty();
    render();
    setStatus("New logo row added. Add the name, logo and official link, then switch Display ON when ready.", "warn");
  }

  async function uploadLogo(id, file) {
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) return setStatus("Please choose an image file.", "bad");
    if (Number(file.size || 0) > 15 * 1024 * 1024) return setStatus("Please use a logo image smaller than 15 MB.", "bad");
    if (!sessionValidated()) return setStatus("Admin login session not validated. Please log in again.", "bad");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "footer-partners");
    setStatus(`Uploading ${file.name}…`);
    try {
      const response = await fetch(`${API}/api/admin/upload-image`, { method: "POST", headers: auth(), body: formData });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Upload failed");
      const item = partners.find(x => x.id === id);
      if (item) item.logo = data.url;
      markDirty();
      render();
      setStatus("Logo uploaded. Review the preview, then save Footer Logos.", "ok");
    } catch (error) {
      setStatus(error.message || "Logo upload failed", "bad");
    }
  }

  function renderPublicPreview() {
    const heading = document.getElementById("cbFooterPartnersHeading")?.value.trim() || "Partners & Recognition";
    const headingNode = document.getElementById("cbFpPreviewHeading");
    const box = document.getElementById("cbFpPreviewLogos");
    if (headingNode) headingNode.textContent = heading;
    if (!box) return;
    box.innerHTML = "";
    const live = partners.filter(x => x.active && x.logo.trim() && x.name.trim() && normaliseUrl(x.url));
    if (!live.length) {
      box.innerHTML = '<div class="cb-fp-live-empty">No complete logos are currently set to display.</div>';
      return;
    }
    live.forEach(item => {
      const card = document.createElement("a");
      card.className = "cb-fp-live-logo";
      card.title = `${item.name} — ${item.category || "Partner"}`;
      card.href = normaliseUrl(item.url);
      card.target = "_blank";
      card.rel = /sponsor|advert/i.test(item.category || "") ? "noopener noreferrer sponsored" : "noopener noreferrer";
      const img = document.createElement("img");
      img.src = item.logo;
      img.alt = item.name;
      img.addEventListener("error", () => { card.innerHTML = '<span style="font-size:10px;color:#8a6159;text-align:center">Image unavailable</span>'; }, { once: true });
      card.appendChild(img);
      box.appendChild(card);
    });
  }

  function render() {
    const list = document.getElementById("cbFooterPartnersList");
    if (!list) return;
    list.innerHTML = "";

    if (!partners.length) {
      list.innerHTML = `<div class="cb-fp-empty">No footer logos yet. Click <strong>+ Add Logo</strong> to add your first approval, tourism-board, partner or review-platform badge.</div>`;
      updateSummary();
      renderPublicPreview();
      return;
    }

    const categoryOptions = ["Tourism Board", "Approval", "Association", "Partner", "Sponsor", "Award", "Review Platform", "Recognition", "Other"];

    partners.forEach((item, index) => {
      const warning = itemWarning(item);
      const valid = item.active && !warning;
      const card = document.createElement("div");
      card.className = `cb-fp-card${warning ? " has-warning" : ""}${valid ? " is-live" : ""}`;
      card.dataset.id = item.id;
      card.draggable = true;
      card.innerHTML = `
        <span class="cb-fp-order">${index + 1}</span><button type="button" class="cb-fp-drag" title="Drag to reorder" aria-label="Drag to reorder">⋮⋮</button>
        <div class="cb-fp-preview-wrap">
          <div class="cb-fp-preview">${item.logo ? `<img src="${esc(item.logo)}" alt="${esc(item.name || "Logo preview")}">` : `<span>Logo preview</span>`}</div>
          <div class="cb-fp-state ${valid ? "live" : "hidden"}"><span class="cb-fp-state-dot"></span>${valid ? "Live on website" : item.active ? "Needs attention" : "Hidden"}</div>
        </div>
        <div class="cb-fp-fields">
          <label>Organisation / Badge Name<input data-key="name" value="${esc(item.name)}" placeholder="Sri Lanka Tourism / TripAdvisor / Partner name"></label>
          <label>Type<select data-key="category">${categoryOptions.map(option => `<option value="${option}" ${item.category === option ? "selected" : ""}>${option}</option>`).join("")}</select></label>
          <label>Official Link<input data-key="url" value="${esc(item.url)}" placeholder="https://official-site.com/page"></label>
          <label class="wide">Logo Image<div class="cb-fp-logo-row"><input data-key="logo" value="${esc(item.logo)}" placeholder="Uploaded logo URL"><button type="button" class="cb-fp-btn secondary cb-fp-upload">Upload Logo</button><input class="cb-fp-file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden></div></label>
          <div class="cb-fp-toggle-row">
            <div class="cb-fp-toggle-copy"><strong>Display in public footer</strong><span>When ON, visitors can click this logo and open the official link.</span></div>
            <label class="cb-fp-switch" title="Display this logo"><input data-key="active" type="checkbox" ${item.active ? "checked" : ""}><span></span></label>
          </div>
          ${warning ? `<div class="cb-fp-warning">${esc(warning)}</div>` : valid ? `<div class="cb-fp-valid">✓ Ready to display in the public footer</div>` : ""}
        </div>
        <div class="cb-fp-actions">
          <button type="button" data-action="open" class="primary-mini" ${normaliseUrl(item.url) ? "" : "disabled"}>Open Link</button>
          <button type="button" data-action="duplicate">Duplicate</button>
          <button type="button" data-action="up" ${index === 0 ? "disabled" : ""}>↑ Up</button>
          <button type="button" data-action="down" ${index === partners.length - 1 ? "disabled" : ""}>↓ Down</button>
          <button type="button" data-action="delete" class="danger">Delete</button>
        </div>`;

      const previewImg = card.querySelector(".cb-fp-preview img");
      previewImg?.addEventListener("error", () => { previewImg.replaceWith(Object.assign(document.createElement("span"), { textContent: "Image unavailable" })); }, { once: true });

      card.querySelectorAll("[data-key]").forEach(field => {
        const key = field.dataset.key;
        const eventName = field.type === "checkbox" || field.tagName === "SELECT" || ["url", "logo"].includes(key) ? "change" : "input";
        field.addEventListener(eventName, () => update(item.id, key, field.type === "checkbox" ? field.checked : field.value));
      });

      const fileInput = card.querySelector(".cb-fp-file");
      card.querySelector(".cb-fp-upload")?.addEventListener("click", () => fileInput?.click());
      fileInput?.addEventListener("change", () => uploadLogo(item.id, fileInput.files?.[0]));
      card.querySelector('[data-action="open"]')?.addEventListener("click", () => {
        const link = normaliseUrl(item.url);
        if (link) window.open(link, "_blank", "noopener,noreferrer");
      });
      card.querySelector('[data-action="duplicate"]')?.addEventListener("click", () => {
        const copy = normalise({ ...item, id: uid(), name: item.name ? `${item.name} Copy` : "", active: false });
        partners.splice(index + 1, 0, copy);
        markDirty();
        render();
        setStatus("Logo duplicated. Review it and switch Display ON when ready.", "warn");
      });
      card.querySelector('[data-action="up"]')?.addEventListener("click", () => move(item.id, -1));
      card.querySelector('[data-action="down"]')?.addEventListener("click", () => move(item.id, 1));
      card.querySelector('[data-action="delete"]')?.addEventListener("click", () => remove(item.id));

      card.addEventListener("dragstart", event => {
        card.classList.add("cb-fp-dragging");
        event.dataTransfer?.setData("text/plain", item.id);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
      });
      card.addEventListener("dragend", () => card.classList.remove("cb-fp-dragging"));
      card.addEventListener("dragover", event => { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = "move"; });
      card.addEventListener("drop", event => {
        event.preventDefault();
        const sourceId = event.dataTransfer?.getData("text/plain");
        if (!sourceId || sourceId === item.id) return;
        const from = partners.findIndex(x => x.id === sourceId);
        const to = partners.findIndex(x => x.id === item.id);
        if (from < 0 || to < 0) return;
        const [moved] = partners.splice(from, 1);
        partners.splice(to, 0, moved);
        markDirty();
        render();
      });

      list.appendChild(card);
    });

    updateSummary();
    renderPublicPreview();
  }

  async function loadPartners(force = false) {
    injectManager();

    // Do not call protected APIs while the login/session is still being checked.
    // This prevents stale tokens from creating a burst of overlapping site-content requests.
    if (!sessionValidated()) return;
    if (loaded && !force) return;
    if (loadInFlight) return loadInFlight;

    loadInFlight = (async () => {
      setStatus("Loading footer logos…");
      try {
        const response = await fetch(`${API}/api/admin/site-content`, { headers: auth(), cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Could not load footer logos");
        partners = parse(data.footer_partners);
        const heading = document.getElementById("cbFooterPartnersHeading");
        if (heading) heading.value = data.footer_partners_heading || "Partners & Recognition";
        loaded = true;
        markDirty(false);
        render();
        setStatus(partners.length ? `${partners.length} footer logo(s) loaded.` : "No footer logos saved yet.", "ok");
      } catch (error) {
        setStatus(error.message || "Could not load footer logos", "bad");
      } finally {
        loadInFlight = null;
      }
    })();

    return loadInFlight;
  }

  async function savePartners() {
    if (!token()) return setStatus("Admin login session not found. Please log in again.", "bad");

    const heading = document.getElementById("cbFooterPartnersHeading")?.value.trim() || "Partners & Recognition";
    const cleanItems = partners.map(normalise).map(item => ({ ...item, url: item.url ? normaliseUrl(item.url) : "" }));
    const invalid = cleanItems.filter(item => item.active && (!item.name || !item.logo || !item.url));
    if (invalid.length) {
      setStatus("Fix the highlighted live logo rows before saving: each live logo needs a name, image and valid official link.", "bad");
      render();
      return;
    }

    setStatus("Saving footer logos…");
    const save = document.getElementById("cbSaveFooterPartners");
    if (save) save.disabled = true;
    try {
      const response = await fetch(`${API}/api/admin/site-content`, {
        method: "PUT",
        headers: auth(true),
        body: JSON.stringify({ footer_partners_heading: heading, footer_partners: JSON.stringify(cleanItems) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Save failed");
      partners = cleanItems;
      loaded = true;
      markDirty(false);
      render();
      setStatus("Footer logos saved. Active logos will appear across the public website.", "ok");
    } catch (error) {
      setStatus(error.message || "Save failed", "bad");
    } finally {
      if (save) save.disabled = false;
    }
  }

  function boot() {
    injectManager();
    if (sessionValidated()) loadPartners();

    document.addEventListener("click", event => {
      if (!sessionValidated()) return;
      if (event.target.closest(".pb2-global-btn") || event.target.closest('[onclick*="pageControl"]')) setTimeout(() => loadPartners(true), 180);
    });

    const form = document.getElementById("siteContentForm");
    if (form && typeof MutationObserver !== "undefined") {
      new MutationObserver(() => {
        if (!form.classList.contains("hidden") && sessionValidated() && !loadInFlight) loadPartners(!loaded);
      }).observe(form, { attributes: true, attributeFilter: ["class"] });
    }

    window.addEventListener("beforeunload", event => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });

    // Wait for Security V5.3.2 to validate the session. Never use a stale token by itself.
    tokenWatch = setInterval(() => {
      if (sessionValidated() && !loaded && !loadInFlight) loadPartners();
      if (loaded && tokenWatch) { clearInterval(tokenWatch); tokenWatch = null; }
    }, 800);
    setTimeout(() => { if (tokenWatch) { clearInterval(tokenWatch); tokenWatch = null; } }, 12000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.CeyBreezFooterPartners = { load: loadPartners, save: savePartners };
})();
