import { loadServices as apiLoadServices, saveService as apiSaveService, deleteService as apiDeleteService, uploadServiceImage } from "./api.js";

let state = [];
let dirty = false;
let activeTab = "basic";
let dragIndex = null;
const tabs = ["basic", "contact", "location", "media", "publish"];
const categories = ["Cafe","Coffee Shop","Tea Spot","Restaurant","Grocery","Super Market","Bike Rental","Vehicle Rental","Laundry","Salon","Clothing Shop","Taxi Service","Pharmacy","Other"];

const $ = (id) => document.getElementById(id);
const value = (id) => String($(id)?.value || "").trim();
const checked = (id) => !!$(id)?.checked;
const esc = (v) => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const slugText = (v) => String(v || "").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
const lines = (v) => String(v || "").split(/\r?\n/).map(x => x.trim()).filter(Boolean);

function ensureCss() {
  if (document.getElementById("servicesCmsV62Css")) return;
  const link = document.createElement("link");
  link.id = "servicesCmsV62Css";
  link.rel = "stylesheet";
  link.href = "css/services-cms.css?v=20260930-1";
  document.head.appendChild(link);
}

function urlOkay(v) {
  if (!v) return true;
  if (/^(images\/|\.\.?\/|\/)/i.test(v)) return true;
  try { const u = new URL(v); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; }
}
function coordOkay(v, kind) {
  if (!v) return true;
  const n = Number(v); if (!Number.isFinite(n)) return false;
  return kind === "lat" ? n >= -90 && n <= 90 : n >= -180 && n <= 180;
}
function telOkay(v) { return !v || /^[+()0-9 .-]{6,25}$/.test(v); }
function waOkay(v) { return !v || /^\+?[0-9][0-9 .()-]{5,24}$/.test(v); }

function setDirty(v = true) {
  dirty = v;
  const badge = $("serviceDirtyBadge");
  if (badge) { badge.textContent = dirty ? "Unsaved" : "Saved"; badge.classList.toggle("unsaved", dirty); }
}
function setStatus(id, text = "", error = false) {
  const el = $(id); if (!el) return; el.textContent = text; el.classList.toggle("error", error);
}

function editorMarkup() {
  const old = $("serviceFormBox");
  if (!old) return;
  old.className = "service-editor-overlay hidden";
  old.setAttribute("aria-hidden", "true");
  old.innerHTML = `
    <div class="service-editor-modal" role="dialog" aria-modal="true" aria-labelledby="serviceFormBoxTitle">
      <div class="service-editor-head">
        <div><span class="service-editor-kicker">CEYBREEZ SERVICES CMS</span><h3 id="serviceFormBoxTitle">Add New Service</h3></div>
        <div class="service-head-actions"><span id="serviceDirtyBadge" class="service-save-state">Saved</span><button type="button" class="service-close" id="serviceEditorClose" aria-label="Close">×</button></div>
      </div>
      <form id="serviceForm" novalidate>
        <input type="hidden" id="serviceEditId">
        <div class="service-editor-tabs" role="tablist">
          <button type="button" class="active" data-service-tab="basic">1. Basics</button>
          <button type="button" data-service-tab="contact">2. Contact</button>
          <button type="button" data-service-tab="location">3. Location</button>
          <button type="button" data-service-tab="media">4. Media</button>
          <button type="button" data-service-tab="publish">5. Publish</button>
        </div>
        <div class="service-editor-body">
          <div class="service-editor-main">
            <section class="service-pane active" data-service-pane="basic">
              <div class="service-section-head"><div><span>BUSINESS IDENTITY</span><h4>Basics</h4><p>Core information shown on public service cards and details.</p></div><em>Required first</em></div>
              <div class="service-grid two">
                <label><span>Category *</span><select id="serviceCategory">${categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("")}</select></label>
                <label><span>Business / Service Name *</span><input id="serviceName" placeholder="Business or service name" required></label>
              </div>
              <label><span>Short Description</span><textarea id="serviceShortDescription" rows="3" maxlength="220" placeholder="Short summary for public cards"></textarea><small><b id="serviceShortCount">0</b>/220 characters</small></label>
              <label><span>Full Description</span><textarea id="serviceFullDescription" rows="8" placeholder="Full details shown in the service popup"></textarea><small><b id="serviceFullCount">0</b> characters</small></label>
              <label><span>Opening Hours</span><input id="serviceOpeningHours" placeholder="Example: 8:00 AM - 10:00 PM"></label>
            </section>

            <section class="service-pane" data-service-pane="contact">
              <div class="service-section-head"><div><span>CONTACT & LINKS</span><h4>Contact</h4><p>Ways travellers can contact or verify this service.</p></div><em>Optional</em></div>
              <div class="service-grid two">
                <label><span>Phone</span><input id="servicePhone" placeholder="+94700000000"><small id="servicePhoneHint"></small></label>
                <label><span>WhatsApp</span><input id="serviceWhatsapp" placeholder="94700000000"><small>Country code recommended, without spaces.</small></label>
              </div>
              <label><span>Official Website</span><div class="service-input-action"><input id="serviceWebsite" placeholder="https://..."><button type="button" data-service-open="serviceWebsite">Test</button></div><small id="serviceWebsiteHint"></small></label>
              <div class="service-contact-preview" id="serviceContactPreview"></div>
            </section>

            <section class="service-pane" data-service-pane="location">
              <div class="service-section-head"><div><span>PLACE & DIRECTIONS</span><h4>Location</h4><p>Location, nearest area and map details used on the public page.</p></div><em>Location required</em></div>
              <div class="service-grid two">
                <label><span>Location *</span><input id="serviceLocation" placeholder="Hikkaduwa / Galle / Colombo" required></label>
                <label><span>Nearest City / Area *</span><input id="serviceNearestCity" placeholder="Nearest city / area" required></label>
              </div>
              <div class="service-grid two">
                <label><span>Latitude</span><input id="serviceLat" inputmode="decimal" placeholder="6.0329"></label>
                <label><span>Longitude</span><input id="serviceLng" inputmode="decimal" placeholder="80.2168"></label>
              </div>
              <label><span>Official Google Map / Directions URL</span><div class="service-input-action"><input id="serviceMapUrl" placeholder="https://maps.google.com/..."><button type="button" data-service-open="serviceMapUrl">Open Map</button></div><small id="serviceMapHint"></small></label>
              <div class="service-location-summary" id="serviceLocationSummary">Map coordinates not set.</div>
            </section>

            <section class="service-pane" data-service-pane="media">
              <div class="service-section-head"><div><span>BRAND & GALLERY</span><h4>Media</h4><p>Logo, main cover and gallery photos used across service cards and details.</p></div><em><b id="serviceGalleryCount">0</b> gallery photos</em></div>
              <div class="service-media-grid">
                <div class="service-media-card"><div class="service-media-title"><strong>Logo / Brand Image</strong><span>Optional</span></div><div id="serviceLogoPreview" class="service-media-preview"></div><input id="serviceLogo" readonly placeholder="Uploaded logo URL"><input type="file" id="serviceLogoUploader" accept="image/*" hidden><button type="button" class="service-upload-btn" data-service-upload="logo">Upload Logo</button><p id="serviceLogoStatus" class="service-upload-status"></p></div>
                <div class="service-media-card"><div class="service-media-title"><strong>Main Cover Image</strong><span>Recommended</span></div><div id="serviceMainPreview" class="service-media-preview wide"></div><input id="serviceImage" readonly placeholder="Uploaded main image URL"><input type="file" id="serviceImageUploader" accept="image/*" hidden><button type="button" class="service-upload-btn" data-service-upload="main">Upload Cover</button><p id="serviceImageUploadStatus" class="service-upload-status"></p></div>
              </div>
              <div class="service-gallery-card"><div class="service-media-title"><strong>Gallery Photos</strong><span>Drag to reorder</span></div><input type="file" id="servicePhotosUploader" multiple accept="image/*" hidden><button type="button" class="service-upload-btn" data-service-upload="gallery">+ Upload Gallery Photos</button><p id="servicePhotosUploadStatus" class="service-upload-status"></p><textarea id="servicePhotos" class="service-raw-urls" aria-label="Gallery URLs"></textarea><div id="servicePhotosPreview" class="service-gallery-preview"></div></div>
            </section>

            <section class="service-pane" data-service-pane="publish">
              <div class="service-section-head"><div><span>VISIBILITY & QUALITY</span><h4>Publish</h4><p>Control website visibility and review the public/search presentation.</p></div><em id="servicePublishState">Active</em></div>
              <div class="service-switch-grid">
                <label class="service-switch-card"><span><strong>Display on Website</strong><small>Service appears on the public Services page.</small></span><input type="checkbox" id="serviceActive" checked><i></i></label>
                <label class="service-switch-card"><span><strong>Featured</strong><small>Marks the service as featured for eligible placements.</small></span><input type="checkbox" id="serviceFeatured"><i></i></label>
              </div>
              <div class="service-quality-card"><div><strong>Package completeness</strong><b id="serviceCompleteness">0%</b></div><div class="service-progress"><span id="serviceCompletenessBar"></span></div><ul id="serviceCompletenessList"></ul></div>
              <div class="service-seo-card"><span>DERIVED SEARCH PREVIEW</span><small>This preview uses the saved Name + Short Description. The current Services backend does not store separate SEO override fields.</small><div class="service-google-url" id="serviceSeoUrl">ceybreez.com/services</div><h5 id="serviceSeoTitle">Local Service | CeyBreez</h5><p id="serviceSeoDescription">Useful local service information for your Sri Lanka journey.</p></div>
            </section>
          </div>

          <aside class="service-live-panel">
            <div class="service-live-head"><div><span>LIVE CMS PREVIEW</span><strong>Public service card</strong></div><small id="servicePreviewSaveState">Saved</small></div>
            <div class="service-public-card">
              <div id="serviceLiveImage" class="service-live-image"><div class="service-empty-image">☕</div></div>
              <div class="service-public-body"><div class="service-public-badges"><span id="serviceLiveCategory">SERVICE</span><em id="serviceLiveFeatured" class="hidden">FEATURED</em></div><h4 id="serviceLiveName">New Service</h4><p id="serviceLiveDescription">Add a short description to preview the public card.</p><div class="service-live-location" id="serviceLiveLocation">📍 Sri Lanka</div><button type="button">View details</button></div>
            </div>
            <div class="service-live-meta" id="serviceLiveMeta"></div>
          </aside>
        </div>
        <div class="service-editor-foot"><span>Changes are saved only when you press Save Service.</span><div><button type="button" class="service-secondary" id="servicePrevBtn">← Previous</button><button type="button" class="service-secondary" id="serviceNextBtn">Next →</button><button type="submit" class="service-primary">Save Service</button></div></div>
      </form>
    </div>`;

  document.body.appendChild(old);
  document.querySelector("#servicesTab .form-toggle-btn")?.classList.add("service-hide-legacy-toggle");
}

function setTab(name) {
  activeTab = tabs.includes(name) ? name : "basic";
  document.querySelectorAll("[data-service-tab]").forEach(b => b.classList.toggle("active", b.dataset.serviceTab === activeTab));
  document.querySelectorAll("[data-service-pane]").forEach(p => p.classList.toggle("active", p.dataset.servicePane === activeTab));
  const i = tabs.indexOf(activeTab);
  $("servicePrevBtn").disabled = i === 0;
  $("serviceNextBtn").disabled = i === tabs.length - 1;
  $("serviceNextBtn").textContent = i === tabs.length - 2 ? "Review Publish →" : "Next →";
  $("serviceEditorClose")?.focus?.({ preventScroll: true });
}

function formPayload() {
  return {
    id: value("serviceEditId"),
    name: value("serviceName"), category: value("serviceCategory"),
    location: value("serviceLocation"), nearestCity: value("serviceNearestCity"),
    lat: value("serviceLat"), lng: value("serviceLng"), mapUrl: value("serviceMapUrl"),
    shortDescription: value("serviceShortDescription"), fullDescription: value("serviceFullDescription"),
    phone: value("servicePhone"), whatsapp: value("serviceWhatsapp"), website: value("serviceWebsite"), openingHours: value("serviceOpeningHours"),
    logoImage: value("serviceLogo"), image: value("serviceImage"), photos: lines(value("servicePhotos")),
    active: checked("serviceActive"), featured: checked("serviceFeatured"),
  };
}

function validate(payload) {
  const errors = [];
  if (!payload.name) errors.push(["basic", "Business / Service Name is required."]);
  if (!payload.category) errors.push(["basic", "Category is required."]);
  if (!payload.location) errors.push(["location", "Location is required."]);
  if (!payload.nearestCity) errors.push(["location", "Nearest City / Area is required."]);
  if (!coordOkay(payload.lat, "lat")) errors.push(["location", "Latitude must be between -90 and 90."]);
  if (!coordOkay(payload.lng, "lng")) errors.push(["location", "Longitude must be between -180 and 180."]);
  if ((payload.lat && !payload.lng) || (!payload.lat && payload.lng)) errors.push(["location", "Enter both latitude and longitude, or leave both empty."]);
  if (!urlOkay(payload.website)) errors.push(["contact", "Website link must be a valid http/https URL."]);
  if (!urlOkay(payload.mapUrl)) errors.push(["location", "Map link must be a valid http/https URL."]);
  if (!telOkay(payload.phone)) errors.push(["contact", "Phone number format looks invalid."]);
  if (!waOkay(payload.whatsapp)) errors.push(["contact", "WhatsApp number format looks invalid."]);
  if (!urlOkay(payload.logoImage)) errors.push(["media", "Logo image URL/path looks invalid."]);
  if (!urlOkay(payload.image)) errors.push(["media", "Main image URL/path looks invalid."]);
  payload.photos.forEach((p, i) => { if (!urlOkay(p)) errors.push(["media", `Gallery image ${i + 1} URL/path looks invalid.`]); });
  return errors;
}

function renderImagePreview(boxId, src, emptyIcon, emptyText) {
  const box = $(boxId); if (!box) return;
  box.classList.remove("broken");
  box.innerHTML = src ? `<img src="${esc(src)}" alt=""><span class="service-broken-label">⚠ Image unavailable</span>` : `<div class="service-empty-media">${emptyIcon}<small>${esc(emptyText)}</small></div>`;
  const img = box.querySelector("img");
  img?.addEventListener("error", () => box.classList.add("broken"));
  img?.addEventListener("load", () => box.classList.remove("broken"));
}

function renderGallery() {
  const photos = lines(value("servicePhotos"));
  $("serviceGalleryCount").textContent = photos.length;
  const box = $("servicePhotosPreview");
  if (!photos.length) { box.innerHTML = `<p class="service-gallery-empty">No gallery images yet.</p>`; return; }
  box.innerHTML = photos.map((url, i) => `<div class="service-gallery-thumb" draggable="true" data-service-photo-index="${i}"><img src="${esc(url)}" alt="Gallery ${i+1}"><span>${i+1}</span><div><button type="button" data-photo-up="${i}" aria-label="Move left">←</button><button type="button" data-photo-down="${i}" aria-label="Move right">→</button><button type="button" class="remove" data-photo-remove="${i}" aria-label="Remove">×</button></div><em>⚠ Broken</em></div>`).join("");
  box.querySelectorAll("img").forEach(img => { img.addEventListener("error",()=>img.closest(".service-gallery-thumb")?.classList.add("broken")); img.addEventListener("load",()=>img.closest(".service-gallery-thumb")?.classList.remove("broken")); });
}

function reorder(from, to) {
  const photos = lines(value("servicePhotos"));
  if (from < 0 || to < 0 || from >= photos.length || to >= photos.length || from === to) return;
  const [m] = photos.splice(from,1); photos.splice(to,0,m); $("servicePhotos").value = photos.join("\n"); renderGallery(); updatePreview(); setDirty(true);
}

function updatePreview() {
  const p = formPayload();
  $("serviceShortCount").textContent = p.shortDescription.length;
  $("serviceFullCount").textContent = p.fullDescription.length;
  $("serviceLiveName").textContent = p.name || "New Service";
  $("serviceLiveCategory").textContent = (p.category || "SERVICE").toUpperCase();
  $("serviceLiveDescription").textContent = p.shortDescription || "Add a short description to preview the public card.";
  $("serviceLiveLocation").textContent = `📍 ${p.location || p.nearestCity || "Sri Lanka"}`;
  $("serviceLiveFeatured").classList.toggle("hidden", !p.featured);
  const main = p.image || p.photos[0] || "";
  renderImagePreview("serviceMainPreview", p.image, "🖼️", "No main cover image");
  renderImagePreview("serviceLogoPreview", p.logoImage, "🏷️", "No logo uploaded");
  const live = $("serviceLiveImage"); live.classList.remove("broken"); live.innerHTML = main ? `<img src="${esc(main)}" alt=""><span>⚠ Image unavailable</span>` : `<div class="service-empty-image">☕</div>`;
  live.querySelector("img")?.addEventListener("error",()=>live.classList.add("broken"));
  live.querySelector("img")?.addEventListener("load",()=>live.classList.remove("broken"));
  $("servicePublishState").textContent = p.active ? (p.featured ? "Active · Featured" : "Active") : "Hidden";
  $("servicePreviewSaveState").textContent = dirty ? "Unsaved" : "Saved";
  $("serviceLocationSummary").textContent = p.lat && p.lng ? `Coordinates: ${p.lat}, ${p.lng}` : "Map coordinates not set.";
  $("serviceWebsiteHint").textContent = p.website && !urlOkay(p.website) ? "⚠ Invalid website URL" : (p.website ? "✓ Website link looks valid" : "");
  $("serviceMapHint").textContent = p.mapUrl && !urlOkay(p.mapUrl) ? "⚠ Invalid map URL" : (p.mapUrl ? "✓ Map link looks valid" : "");
  $("servicePhoneHint").textContent = p.phone && !telOkay(p.phone) ? "⚠ Check phone number format" : "";
  $("serviceContactPreview").innerHTML = [p.phone && `📞 ${esc(p.phone)}`, p.whatsapp && `💬 WhatsApp ${esc(p.whatsapp)}`, p.website && `🌐 Website added`].filter(Boolean).map(x=>`<span>${x}</span>`).join("") || `<span>No contact methods added yet.</span>`;
  $("serviceLiveMeta").innerHTML = `<div><span>Hours</span><strong>${esc(p.openingHours || "Not set")}</strong></div><div><span>Contact</span><strong>${p.phone || p.whatsapp ? "Available" : "Not set"}</strong></div><div><span>Map</span><strong>${p.mapUrl || (p.lat && p.lng) ? "Ready" : "Not set"}</strong></div>`;

  const checks = [
    [!!p.name,"Name"],[!!p.category,"Category"],[!!p.location,"Location"],[!!p.nearestCity,"Nearest area"],
    [!!p.shortDescription,"Short description"],[!!p.image,"Main image"],[!!(p.phone || p.whatsapp || p.website),"Contact"],[!!(p.mapUrl || (p.lat && p.lng)),"Map"],[p.photos.length>0,"Gallery"]
  ];
  const done = checks.filter(x=>x[0]).length; const pct = Math.round(done / checks.length * 100);
  $("serviceCompleteness").textContent = `${pct}%`; $("serviceCompletenessBar").style.width = `${pct}%`;
  $("serviceCompletenessList").innerHTML = checks.map(([ok,label])=>`<li class="${ok?"done":""}">${ok?"✓":"○"} ${label}</li>`).join("");
  $("serviceSeoUrl").textContent = `ceybreez.com/services#${slugText(p.name || "service")}`;
  $("serviceSeoTitle").textContent = `${p.name || "Local Service"} | CeyBreez`;
  $("serviceSeoDescription").textContent = p.shortDescription || `Useful local service information around ${p.location || "Sri Lanka"}.`;
  renderGallery();
}

function resetForm() {
  $("serviceForm").reset();
  $("serviceEditId").value = ""; $("serviceActive").checked = true; $("serviceFeatured").checked = false;
  $("serviceLogo").value = ""; $("serviceImage").value = ""; $("servicePhotos").value = "";
  setStatus("serviceLogoStatus"); setStatus("serviceImageUploadStatus"); setStatus("servicePhotosUploadStatus");
  setTab("basic"); setDirty(false); updatePreview();
}

function fillForm(item = {}) {
  const put = (id,v)=>{ if($(id)) $(id).value = v ?? ""; };
  put("serviceEditId", item.id); put("serviceName", item.name); put("serviceCategory", item.category || "Cafe"); put("serviceLocation", item.location); put("serviceNearestCity", item.nearestCity); put("serviceLat", item.lat); put("serviceLng", item.lng); put("serviceShortDescription", item.shortDescription); put("serviceFullDescription", item.fullDescription); put("servicePhone", item.phone); put("serviceWhatsapp", item.whatsapp); put("serviceWebsite", item.website); put("serviceMapUrl", item.mapUrl); put("serviceOpeningHours", item.openingHours); put("serviceLogo", item.logoImage); put("serviceImage", item.image); put("servicePhotos", Array.isArray(item.photos) ? item.photos.join("\n") : item.photos || "");
  $("serviceActive").checked = !(item.active === false || Number(item.active) === 0); $("serviceFeatured").checked = item.featured === true || Number(item.featured) === 1;
  setTab("basic"); setDirty(false); updatePreview();
}

function openEditor(item = null) {
  if (item) { fillForm(item); $("serviceFormBoxTitle").textContent = "Edit Cafe / Service"; }
  else { resetForm(); $("serviceFormBoxTitle").textContent = "Add New Cafe / Service"; }
  const box = $("serviceFormBox"); box.classList.remove("hidden"); box.setAttribute("aria-hidden","false"); document.body.classList.add("service-editor-open");
  setTimeout(()=>$("serviceName")?.focus(),50);
}
function closeEditor(force = false) {
  if (!force && dirty && !confirm("You have unsaved service changes. Close without saving?")) return;
  const box = $("serviceFormBox"); box.classList.add("hidden"); box.setAttribute("aria-hidden","true"); document.body.classList.remove("service-editor-open"); dirty = false;
}

async function uploadOne(kind) {
  const cfg = kind === "logo" ? ["serviceLogoUploader","serviceLogo","service-logos","serviceLogoStatus"] : ["serviceImageUploader","serviceImage","services","serviceImageUploadStatus"];
  const input = $(cfg[0]); const file = input?.files?.[0]; if (!file) return;
  try { setStatus(cfg[3],"Uploading..."); const url = await uploadServiceImage(file,cfg[2]); $(cfg[1]).value=url; setStatus(cfg[3],"Uploaded ✓"); setDirty(true); updatePreview(); }
  catch(e){ setStatus(cfg[3],e.message,true); alert(e.message); } finally { if(input) input.value=""; }
}
async function uploadGallery() {
  const input=$("servicePhotosUploader"); const files=[...(input?.files||[])]; if(!files.length)return;
  const existing=lines(value("servicePhotos")); const added=[];
  try { for(let i=0;i<files.length;i++){ setStatus("servicePhotosUploadStatus",`Uploading ${i+1} of ${files.length}...`); added.push(await uploadServiceImage(files[i],"services")); } $("servicePhotos").value=[...existing,...added].join("\n"); setStatus("servicePhotosUploadStatus",`${added.length} photo(s) uploaded ✓`); setDirty(true); updatePreview(); }
  catch(e){ $("servicePhotos").value=[...existing,...added].join("\n"); setStatus("servicePhotosUploadStatus",e.message,true); updatePreview(); alert(e.message); } finally { if(input) input.value=""; }
}

async function refreshState() {
  try { const data = await apiLoadServices(); state = Array.isArray(data) ? data : []; }
  catch(e){ console.error("Services module load failed", e); }
}

async function save(e) {
  e.preventDefault();
  const p=formPayload(); const errors=validate(p);
  if(errors.length){ setTab(errors[0][0]); alert(errors.map(x=>`• ${x[1]}`).join("\n")); return; }
  const btn=e.submitter || $("serviceForm")?.querySelector('button[type="submit"]'); if(btn) btn.disabled=true;
  try { const result=await apiSaveService(p); setDirty(false); alert(result.pendingApproval ? (result.message || "Service change submitted for approval") : (result.message || "Service saved")); closeEditor(true); await refreshState(); if(typeof window.loadServices === "function" && window.loadServices !== refreshState) await window.loadServices(); }
  catch(err){ alert(err.message || "Service save failed"); }
  finally { if(btn) btn.disabled=false; }
}

async function removeService(id) {
  if(!confirm("Delete this service?")) return;
  try { const r=await apiDeleteService(id); alert(r.pendingApproval ? (r.message || "Delete submitted for approval") : "Service deleted"); await refreshState(); if(typeof window.loadServices === "function") await window.loadServices(); }
  catch(e){ alert(e.message || "Delete failed"); }
}

function bind() {
  $("serviceForm")?.addEventListener("submit",save);
  $("serviceEditorClose")?.addEventListener("click",()=>closeEditor());
  $("servicePrevBtn")?.addEventListener("click",()=>setTab(tabs[Math.max(0,tabs.indexOf(activeTab)-1)]));
  $("serviceNextBtn")?.addEventListener("click",()=>setTab(tabs[Math.min(tabs.length-1,tabs.indexOf(activeTab)+1)]));
  document.querySelectorAll("[data-service-tab]").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.serviceTab)));
  $("serviceForm")?.addEventListener("input",e=>{ if(e.target.id!=="serviceEditId"){setDirty(true);updatePreview();} });
  $("serviceForm")?.addEventListener("change",e=>{ if(e.target.type!=="file"){setDirty(true);updatePreview();} });
  document.querySelectorAll("[data-service-upload]").forEach(b=>b.addEventListener("click",()=>{ const k=b.dataset.serviceUpload; if(k==="gallery") $("servicePhotosUploader").click(); else $(k==="logo"?"serviceLogoUploader":"serviceImageUploader").click(); }));
  $("serviceLogoUploader")?.addEventListener("change",()=>uploadOne("logo")); $("serviceImageUploader")?.addEventListener("change",()=>uploadOne("main")); $("servicePhotosUploader")?.addEventListener("change",uploadGallery);
  document.querySelectorAll("[data-service-open]").forEach(b=>b.addEventListener("click",()=>{ const u=value(b.dataset.serviceOpen); if(!u)return alert("Add a link first."); if(!urlOkay(u))return alert("This link is not valid."); window.open(u,"_blank","noopener"); }));
  $("servicePhotosPreview")?.addEventListener("click",e=>{ const rm=e.target.closest("[data-photo-remove]"); const up=e.target.closest("[data-photo-up]"); const down=e.target.closest("[data-photo-down]"); const arr=lines(value("servicePhotos")); if(rm){arr.splice(Number(rm.dataset.photoRemove),1);$("servicePhotos").value=arr.join("\n");setDirty(true);updatePreview();} if(up)reorder(Number(up.dataset.photoUp),Math.max(0,Number(up.dataset.photoUp)-1)); if(down)reorder(Number(down.dataset.photoDown),Math.min(arr.length-1,Number(down.dataset.photoDown)+1)); });
  $("servicePhotosPreview")?.addEventListener("dragstart",e=>{ const t=e.target.closest("[data-service-photo-index]"); if(t) dragIndex=Number(t.dataset.servicePhotoIndex); });
  $("servicePhotosPreview")?.addEventListener("dragover",e=>e.preventDefault());
  $("servicePhotosPreview")?.addEventListener("drop",e=>{e.preventDefault();const t=e.target.closest("[data-service-photo-index]");if(t&&dragIndex!==null)reorder(dragIndex,Number(t.dataset.servicePhotoIndex));dragIndex=null;});
  $("serviceFormBox")?.addEventListener("click",e=>{ if(e.target===$("serviceFormBox")) closeEditor(); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&!$("serviceFormBox")?.classList.contains("hidden")) closeEditor(); });
  window.addEventListener("beforeunload",e=>{if(!dirty)return;e.preventDefault();e.returnValue="";});
}

function installCompatibility() {
  window.openAddServiceForm = ()=>openEditor(null);
  window.editService = (item)=>openEditor(item);
  window.editServiceById = async (id)=>{ let item=state.find(x=>String(x.id)===String(id)); if(!item){await refreshState();item=state.find(x=>String(x.id)===String(id));} if(!item)return alert("Service not found."); openEditor(item); };
  window.deleteService = removeService;
  window.resetServiceForm = resetForm;
  window.renderServicePhotosPreview = renderGallery;
  window.removeServicePhoto = (index)=>{ const arr=lines(value("servicePhotos"));arr.splice(Number(index),1);$("servicePhotos").value=arr.join("\n");setDirty(true);updatePreview(); };
}

export function initServicesModule() {
  const start = async () => {
    ensureCss();
    editorMarkup();
    bind();
    installCompatibility();
    resetForm();
    await refreshState();
    document.addEventListener("click",e=>{ if(e.target?.closest?.('[data-v14-tab="services"]')) setTimeout(refreshState,80); },true);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
