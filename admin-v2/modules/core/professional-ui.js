/* =========================
   V5.1 PROFESSIONAL UI + PREVIEW
========================= */

function initV51ProfessionalUI(){
  try{
    beautifyCmsForms();
    injectInquiryModePanel();
    injectBookingModePanel();
    injectPageControlPreviewPanel();
    updateModeButtons();
  }catch(err){
    console.warn("V5.1 UI init skipped", err);
  }
}

function humanizeField(id, placeholder){
  const labels = {
    destName:"Tour Location Name", destProvince:"Province", destArea:"Nearest City / Area", destLat:"Latitude", destLng:"Longitude", destMapUrl:"Google Map / Directions URL", destBestFor:"Best For", destTime:"Time Needed", destNearby:"Nearby Places", destDescription:"Description", destLogo:"Logo / Badge Image URL", destPhotos:"Gallery Photo URLs",
    propType:"Property Type", propName:"Property Name", propLocation:"Location / Area", propLat:"Latitude", propLng:"Longitude", propMapUrl:"Google Map / Directions URL", propPrice:"Price / Starting From", propGuests:"Maximum Guests", propBedrooms:"Bedrooms", propBathrooms:"Bathrooms", propFacilities:"Facilities", propDescription:"Description", propMainImage:"Main Cover Image URL", propLogo:"Logo / Badge Image URL", propPhotos:"Gallery Photo URLs",
    serviceName:"Business / Service Name", serviceCategory:"Category", serviceLocation:"Location", serviceNearestCity:"Nearest City / Area", serviceLat:"Latitude", serviceLng:"Longitude", serviceShortDescription:"Short Description", serviceFullDescription:"Full Description", servicePhone:"Phone", serviceWhatsapp:"WhatsApp", serviceWebsite:"Website", serviceMapUrl:"Google Map URL", serviceOpeningHours:"Opening Hours", serviceLogo:"Logo / Brand Image URL", serviceImage:"Main Image URL", servicePhotos:"Gallery Photo URLs",
    manualServiceType:"Booking Type", manualItemName:"Property / Tour", manualGuestName:"Guest Name", manualGuestEmail:"Guest Email", manualGuestMobile:"Guest Mobile / WhatsApp", manualDateFrom:"Start Date / Check-in", manualDateTo:"End Date / Check-out", manualGuests:"Guests",
    sectionPage:"Page", sectionKey:"Section Key", sectionType:"Section Type", sectionTitle:"Title", sectionSubtitle:"Subtitle", sectionContent:"Content", sectionImage:"Section Image URL", sectionVideo:"Section Video URL", sectionBgColor:"Background Color", sectionBackgroundImage:"Background Image URL", sectionGradientStart:"Gradient Start Color", sectionGradientEnd:"Gradient End Color", sectionPaddingTop:"Padding Top", sectionPaddingBottom:"Padding Bottom", sectionBorderRadius:"Border Radius", sectionShadow:"Shadow", sectionAnimation:"Animation", sectionTextColor:"Text Color", sectionButtonColor:"Button Color", sectionFontFamily:"Font Family", sectionSortOrder:"Sort Order"
  };
  if(labels[id]) return labels[id];
  const raw = placeholder || id || "Field";
  return String(raw).replace(/[_-]/g," ").replace(/\b\w/g, m => m.toUpperCase());
}

function beautifyCmsForms(){
  const formIds = ["destinationForm","propertyForm","serviceForm","manualBookingForm","sectionForm","siteContentForm"];
  formIds.forEach(formId => {
    const form = document.getElementById(formId);
    if(!form || form.dataset.v51Labelled === "1") return;
    form.querySelectorAll("input, select, textarea").forEach(el => {
      if(el.type === "hidden" || el.type === "file" || el.type === "checkbox") return;
      if(el.closest(".upload-box")) return;
      const prev = el.previousElementSibling;
      if(prev && prev.tagName && prev.tagName.toLowerCase() === "label") return;
      const label = document.createElement("label");
      label.className = "v51-field-label";
      label.textContent = humanizeField(el.id, el.placeholder);
      el.parentNode.insertBefore(label, el);
      if(el.placeholder && !el.dataset.oldPlaceholder){
        el.dataset.oldPlaceholder = el.placeholder;
        el.placeholder = "Enter " + label.textContent.toLowerCase();
      }
    });
    form.dataset.v51Labelled = "1";
  });
}

function injectInquiryModePanel(){
  const tab = document.getElementById("inquiriesTab");
  const title = document.getElementById("inquiryPageTitle");
  if(!tab || !title || document.getElementById("v51InquiryModePanel")) return;
  const panel = document.createElement("div");
  panel.id = "v51InquiryModePanel";
  panel.className = "v51-mode-panel";
  panel.innerHTML = `
    <div>
      <h3>Inquiry Management</h3>
      <p>Separate property and tour inquiries. Use one clean page with filtered tables.</p>
    </div>
    <div class="v51-mode-actions">
      <button type="button" data-mode="property" onclick="setInquiryModeV51('property')">Property Inquiries</button>
      <button type="button" data-mode="tour" onclick="setInquiryModeV51('tour')">Tour Inquiries</button>
    </div>
  `;
  title.insertAdjacentElement("afterend", panel);
}

function injectBookingModePanel(){
  const tab = document.getElementById("bookingsTab");
  const title = document.getElementById("bookingPageTitle");
  if(!tab || !title || document.getElementById("v51BookingModePanel")) return;
  const panel = document.createElement("div");
  panel.id = "v51BookingModePanel";
  panel.className = "v51-mode-panel booking-mode-panel";
  panel.innerHTML = `
    <div>
      <h3>Booking Management</h3>
      <p>Summary first, then booking table, calendar and availability matrix on the same page.</p>
    </div>
    <div class="v51-mode-actions">
      <button type="button" data-mode="property" onclick="setBookingModeV51('property')">Property Bookings</button>
      <button type="button" data-mode="tour" onclick="setBookingModeV51('tour')">Tour Bookings</button>
    </div>
  `;
  title.insertAdjacentElement("afterend", panel);
}

function setInquiryModeV51(mode){
  currentInquiryView = mode === "tour" ? "tour" : "property";
  const title = document.getElementById("inquiryPageTitle");
  if(title) title.textContent = currentInquiryView === "tour" ? "Tour Inquiry" : "Property Inquiry";
  updateModeButtons();
  applyInquiryFilters();
}

function setBookingModeV51(mode){
  currentBookingView = mode === "tour" ? "tour" : "property";
  const title = document.getElementById("bookingPageTitle");
  if(title) title.textContent = currentBookingView === "tour" ? "Tour Booking Management" : "Property Booking Management";
  const typeFilter = document.getElementById("bookingTypeFilter");
  if(typeFilter) typeFilter.value = currentBookingView === "tour" ? "tour" : "all";
  const matrixFilter = document.getElementById("matrixTypeFilter");
  if(matrixFilter) matrixFilter.value = currentBookingView === "tour" ? "tour" : "all";
  updateModeButtons();
  applyBookingFilters();
}

function updateModeButtons(){
  document.querySelectorAll("#v51InquiryModePanel [data-mode]").forEach(btn => btn.classList.toggle("active", btn.dataset.mode === currentInquiryView));
  document.querySelectorAll("#v51BookingModePanel [data-mode]").forEach(btn => btn.classList.toggle("active", btn.dataset.mode === currentBookingView));
}

function injectPageControlPreviewPanel(){
  const pageTab = document.getElementById("pageControlTab");
  if(!pageTab || document.getElementById("v51PagePreviewPanel")) return;
  const panel = document.createElement("section");
  panel.id = "v51PagePreviewPanel";
  panel.className = "admin-section v51-preview-section";
  panel.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Live Page Preview</h2>
        <p>Preview your Page Control changes before they go to the main website.</p>
      </div>
      <div class="v51-preview-actions">
        <button type="button" onclick="previewCurrentSectionV51('desktop')">Desktop Preview</button>
        <button type="button" onclick="previewCurrentSectionV51('mobile')">Mobile Preview</button>
        <button type="button" onclick="window.open('https://ceybreez.com','_blank')">Open Live Site</button>
      </div>
    </div>
    <div id="v51PreviewCanvas" class="v51-preview-canvas desktop">
      <div class="v51-preview-empty">Select or edit a section, then click Preview.</div>
    </div>
  `;
  const firstToggle = pageTab.querySelector(".settings-toggle-row");
  if(firstToggle) firstToggle.insertAdjacentElement("beforebegin", panel);
  else pageTab.prepend(panel);
}

function previewCurrentSectionV51(device){
  const canvas = document.getElementById("v51PreviewCanvas");
  if(!canvas) return;
  canvas.className = `v51-preview-canvas ${device === "mobile" ? "mobile" : "desktop"}`;
  const title = document.getElementById("sectionTitle")?.value || document.getElementById("home_hero_title")?.value || "CeyBreez Preview";
  const subtitle = document.getElementById("sectionSubtitle")?.value || document.getElementById("home_hero_subtitle")?.value || "A peaceful escape in Sri Lanka";
  const content = document.getElementById("sectionContent")?.value || "Your section content preview will appear here before publishing to the main website.";
  const image = document.getElementById("sectionImage")?.value || document.getElementById("sectionBackgroundImage")?.value || document.getElementById("home_hero_media")?.value || "";
  const bg = document.getElementById("sectionBgColor")?.value || document.getElementById("site_background_color")?.value || "#ffffff";
  const text = document.getElementById("sectionTextColor")?.value || document.getElementById("site_text_color")?.value || "#222222";
  const btn = document.getElementById("sectionButtonColor")?.value || document.getElementById("home_hero_button_color")?.value || "#0f766e";
  const cards = typeof collectCards === "function" ? collectCards() : [];
  canvas.innerHTML = `
    <div class="v51-preview-page" style="background:${escapeHtml(bg)};color:${escapeHtml(text)};">
      ${image ? `<div class="v51-preview-media"><img src="${escapeHtml(image)}" alt="preview"></div>` : ""}
      <div class="v51-preview-content">
        <span class="v51-preview-label">Preview only - not published</span>
        <h1>${escapeHtml(title)}</h1>
        <h3>${escapeHtml(subtitle)}</h3>
        <p>${escapeHtml(content)}</p>
        <button style="background:${escapeHtml(btn)}">Sample CTA Button</button>
      </div>
      ${cards.length ? `<div class="v51-preview-cards">${cards.map(c => `<article>${c.image ? `<img src="${escapeHtml(c.image)}" alt="">` : ""}<h4>${escapeHtml(c.title)}</h4><p>${escapeHtml(c.description)}</p></article>`).join("")}</div>` : ""}
    </div>
  `;
}


