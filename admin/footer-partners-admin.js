/* ================================================================
   CEYBREEZ ADMIN — FOOTER PARTNERS & RECOGNITION MANAGER V5.4
   Stores data in existing site_content table using:
     footer_partners_heading
     footer_partners (JSON array)
   No new Worker route or D1 table is required.
   ================================================================ */
(() => {
  "use strict";

  const API = "https://ceybreez-contact-api.ceybreez.workers.dev";
  let partners = [];
  let loaded = false;

  const token = () => localStorage.getItem("CEYBREEZ_ADMIN_TOKEN") || "";
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

  function normalise(item = {}) {
    return {
      id: String(item.id || uid()),
      name: String(item.name || ""),
      category: String(item.category || "Partner"),
      logo: String(item.logo || ""),
      url: String(item.url || ""),
      active: item.active !== false && item.active !== 0
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

  function ensureStyles() {
    if (document.getElementById("cbFooterPartnersAdminStyles")) return;
    const style = document.createElement("style");
    style.id = "cbFooterPartnersAdminStyles";
    style.textContent = `
      .cb-fp-manager{grid-column:1/-1;background:#f8faf8;border:1px solid #dce7df;border-radius:18px;padding:20px;margin-top:8px}
      .cb-fp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:14px}
      .cb-fp-head h4{margin:0 0 6px;color:#0f5c4d;font-size:18px}
      .cb-fp-head p{margin:0;color:#667085;font-size:13px;line-height:1.55;max-width:760px}
      .cb-fp-toolbar{display:grid;grid-template-columns:minmax(220px,1fr) auto auto;gap:10px;align-items:end;margin:16px 0}
      .cb-fp-toolbar label{display:grid;gap:6px;font-size:12px;font-weight:800;color:#344054}
      .cb-fp-toolbar input{width:100%}
      .cb-fp-btn{border:0;border-radius:10px;padding:11px 15px;font-weight:800;cursor:pointer;background:#0f766e;color:#fff}
      .cb-fp-btn.secondary{background:#fff;color:#0f5c4d;border:1px solid #cddbd3}
      .cb-fp-status{min-height:18px;margin:4px 0 10px;color:#667085;font-size:12px}
      .cb-fp-status.ok{color:#087443}.cb-fp-status.bad{color:#b42318}
      .cb-fp-list{display:grid;gap:12px}
      .cb-fp-empty{padding:22px;border:1px dashed #cbd5ce;border-radius:14px;text-align:center;color:#667085;background:#fff}
      .cb-fp-card{display:grid;grid-template-columns:110px minmax(0,1fr) auto;gap:14px;align-items:start;background:#fff;border:1px solid #dfe7e2;border-radius:15px;padding:14px}
      .cb-fp-preview{width:110px;height:76px;border:1px solid #e3e8e5;border-radius:12px;background:#f7f9f8;display:grid;place-items:center;overflow:hidden}
      .cb-fp-preview img{max-width:90px;max-height:56px;object-fit:contain}
      .cb-fp-preview span{font-size:11px;color:#98a2b3;text-align:center;padding:8px}
      .cb-fp-fields{display:grid;grid-template-columns:1.1fr .75fr 1.4fr;gap:10px}
      .cb-fp-fields label{display:grid;gap:5px;font-size:11px;font-weight:800;color:#475467}
      .cb-fp-fields .wide{grid-column:1/-1}
      .cb-fp-fields input,.cb-fp-fields select{min-width:0;width:100%}
      .cb-fp-logo-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end}
      .cb-fp-actions{display:flex;flex-direction:column;gap:7px;min-width:86px}
      .cb-fp-actions button{border:1px solid #d0d5dd;background:#fff;border-radius:9px;padding:7px 9px;font-weight:800;cursor:pointer;color:#344054}
      .cb-fp-actions button.danger{color:#b42318;border-color:#f2c7c3}
      .cb-fp-active{display:flex!important;align-items:center;gap:7px!important;margin-top:2px;font-size:12px!important}
      .cb-fp-active input{width:auto!important;margin:0}
      .cb-fp-legal{margin:12px 0 0;padding:10px 12px;border-radius:10px;background:#fff7e6;color:#7a4a00;font-size:12px;line-height:1.5;border:1px solid #f3ddb1}
      @media(max-width:900px){.cb-fp-toolbar{grid-template-columns:1fr 1fr}.cb-fp-toolbar label{grid-column:1/-1}.cb-fp-card{grid-template-columns:90px 1fr}.cb-fp-preview{width:90px}.cb-fp-actions{grid-column:1/-1;flex-direction:row;flex-wrap:wrap}.cb-fp-fields{grid-template-columns:1fr 1fr}.cb-fp-fields .wide{grid-column:1/-1}}
      @media(max-width:620px){.cb-fp-manager{padding:14px}.cb-fp-head{display:block}.cb-fp-toolbar{grid-template-columns:1fr}.cb-fp-toolbar label{grid-column:auto}.cb-fp-card{grid-template-columns:1fr}.cb-fp-preview{width:100%;height:82px}.cb-fp-fields{grid-template-columns:1fr}.cb-fp-fields .wide{grid-column:auto}.cb-fp-logo-row{grid-template-columns:1fr}.cb-fp-actions{grid-column:auto}}
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
        <div>
          <h4>Footer Partners & Recognition</h4>
          <p>Upload approval, association, partner, sponsor or award logos. Add the official link and switch on only the logos you want visitors to see. Clicking a logo on the website opens the saved link.</p>
        </div>
      </div>
      <div class="cb-fp-toolbar">
        <label>Footer Heading
          <input id="cbFooterPartnersHeading" value="Partners & Recognition" placeholder="Partners & Recognition">
        </label>
        <button type="button" class="cb-fp-btn secondary" id="cbAddFooterPartner">+ Add Logo</button>
        <button type="button" class="cb-fp-btn" id="cbSaveFooterPartners">Save Footer Logos</button>
      </div>
      <div id="cbFooterPartnersStatus" class="cb-fp-status"></div>
      <div id="cbFooterPartnersList" class="cb-fp-list"></div>
      <p class="cb-fp-legal"><strong>Important:</strong> display an organisation, tourism authority, TripAdvisor-style badge, approval mark or sponsor logo only when CeyBreez is actually authorised to use it. The footer should not imply an approval, membership or endorsement that has not been granted.</p>
    `;

    const uploadBox = form.querySelector(":scope > .upload-box");
    if (uploadBox) form.insertBefore(manager, uploadBox);
    else form.appendChild(manager);

    document.getElementById("cbAddFooterPartner")?.addEventListener("click", addPartner);
    document.getElementById("cbSaveFooterPartners")?.addEventListener("click", savePartners);
  }

  function setStatus(message = "", type = "") {
    const node = document.getElementById("cbFooterPartnersStatus");
    if (!node) return;
    node.textContent = message;
    node.className = `cb-fp-status ${type}`.trim();
  }

  function update(id, key, value) {
    const item = partners.find((x) => x.id === id);
    if (!item) return;
    item[key] = value;
    if (key === "logo") render();
  }

  function move(id, dir) {
    const index = partners.findIndex((x) => x.id === id);
    const next = index + dir;
    if (index < 0 || next < 0 || next >= partners.length) return;
    [partners[index], partners[next]] = [partners[next], partners[index]];
    render();
  }

  function remove(id) {
    if (!confirm("Remove this footer logo?")) return;
    partners = partners.filter((x) => x.id !== id);
    render();
  }

  function addPartner() {
    partners.push(normalise({ name: "", category: "Partner", active: true }));
    render();
    setStatus("New logo row added. Upload a logo, add its official link, then save.");
  }

  async function uploadLogo(id, file) {
    if (!file) return;
    if (!token()) {
      setStatus("Admin login token not found. Please log in again.", "bad");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "footer-partners");
    setStatus(`Uploading ${file.name}…`);
    try {
      const response = await fetch(`${API}/api/admin/upload-image`, {
        method: "POST",
        headers: auth(),
        body: formData
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Upload failed");
      update(id, "logo", data.url);
      setStatus("Logo uploaded. Remember to save Footer Logos.", "ok");
    } catch (error) {
      setStatus(error.message || "Logo upload failed", "bad");
    }
  }

  function render() {
    const list = document.getElementById("cbFooterPartnersList");
    if (!list) return;
    list.innerHTML = "";

    if (!partners.length) {
      list.innerHTML = `<div class="cb-fp-empty">No footer logos yet. Click <strong>+ Add Logo</strong> to create one.</div>`;
      return;
    }

    partners.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "cb-fp-card";
      card.dataset.id = item.id;
      card.innerHTML = `
        <div class="cb-fp-preview">${item.logo ? `<img src="${esc(item.logo)}" alt="${esc(item.name || "Logo preview")}">` : `<span>Logo preview</span>`}</div>
        <div class="cb-fp-fields">
          <label>Name
            <input data-key="name" value="${esc(item.name)}" placeholder="Sri Lanka Tourism / TripAdvisor / Partner name">
          </label>
          <label>Type
            <select data-key="category">
              ${["Approval", "Association", "Partner", "Sponsor", "Award", "Recognition", "Other"].map((option) => `<option value="${option}" ${item.category === option ? "selected" : ""}>${option}</option>`).join("")}
            </select>
          </label>
          <label>Official Link
            <input data-key="url" value="${esc(item.url)}" placeholder="https://...">
          </label>
          <label class="wide">Logo Image
            <div class="cb-fp-logo-row">
              <input data-key="logo" value="${esc(item.logo)}" placeholder="Uploaded logo URL or https://...">
              <button type="button" class="cb-fp-btn secondary cb-fp-upload">Upload Logo</button>
              <input class="cb-fp-file" type="file" accept="image/*" hidden>
            </div>
          </label>
          <label class="cb-fp-active wide"><input data-key="active" type="checkbox" ${item.active ? "checked" : ""}> Display this logo in website footer</label>
        </div>
        <div class="cb-fp-actions">
          <button type="button" data-action="up" ${index === 0 ? "disabled" : ""}>↑ Up</button>
          <button type="button" data-action="down" ${index === partners.length - 1 ? "disabled" : ""}>↓ Down</button>
          <button type="button" data-action="delete" class="danger">Delete</button>
        </div>
      `;

      card.querySelectorAll("[data-key]").forEach((field) => {
        const key = field.dataset.key;
        const eventName = field.type === "checkbox" || field.tagName === "SELECT" ? "change" : "input";
        field.addEventListener(eventName, () => update(item.id, key, field.type === "checkbox" ? field.checked : field.value));
      });

      const fileInput = card.querySelector(".cb-fp-file");
      card.querySelector(".cb-fp-upload")?.addEventListener("click", () => fileInput?.click());
      fileInput?.addEventListener("change", () => uploadLogo(item.id, fileInput.files?.[0]));
      card.querySelector('[data-action="up"]')?.addEventListener("click", () => move(item.id, -1));
      card.querySelector('[data-action="down"]')?.addEventListener("click", () => move(item.id, 1));
      card.querySelector('[data-action="delete"]')?.addEventListener("click", () => remove(item.id));
      list.appendChild(card);
    });
  }

  async function loadPartners(force = false) {
    injectManager();
    if (!token()) return;
    if (loaded && !force) return;
    setStatus("Loading footer logos…");
    try {
      const response = await fetch(`${API}/api/admin/site-content`, {
        headers: auth(),
        cache: "no-store"
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load footer logos");
      partners = parse(data.footer_partners);
      const heading = document.getElementById("cbFooterPartnersHeading");
      if (heading) heading.value = data.footer_partners_heading || "Partners & Recognition";
      loaded = true;
      render();
      setStatus(partners.length ? `${partners.length} footer logo(s) loaded.` : "No footer logos saved yet.", "ok");
    } catch (error) {
      setStatus(error.message || "Could not load footer logos", "bad");
    }
  }

  async function savePartners() {
    if (!token()) {
      setStatus("Admin login token not found. Please log in again.", "bad");
      return;
    }
    const heading = document.getElementById("cbFooterPartnersHeading")?.value.trim() || "Partners & Recognition";
    const cleanItems = partners.map(normalise);
    setStatus("Saving footer logos…");
    try {
      const response = await fetch(`${API}/api/admin/site-content`, {
        method: "PUT",
        headers: auth(true),
        body: JSON.stringify({
          footer_partners_heading: heading,
          footer_partners: JSON.stringify(cleanItems)
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Save failed");
      partners = cleanItems;
      loaded = true;
      render();
      setStatus("Footer logos saved. Active logos will appear across the public website.", "ok");
    } catch (error) {
      setStatus(error.message || "Save failed", "bad");
    }
  }

  function boot() {
    injectManager();
    if (token()) loadPartners();

    document.addEventListener("click", (event) => {
      if (event.target.closest(".pb2-global-btn") || event.target.closest('[onclick*="pageControl"]')) {
        setTimeout(() => loadPartners(true), 180);
      }
    });

    window.addEventListener("storage", (event) => {
      if (event.key === "CEYBREEZ_ADMIN_TOKEN" && event.newValue) loadPartners(true);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.CeyBreezFooterPartners = { load: loadPartners, save: savePartners };
})();
