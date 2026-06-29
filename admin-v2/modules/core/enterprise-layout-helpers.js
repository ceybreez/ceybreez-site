/* =========================
   V6 ENTERPRISE LAYOUT HELPERS
========================= */

function classifyInquiryItem(item){
  const text = `${item.category || ""} ${item.serviceType || ""} ${item.itemName || ""}`.toLowerCase();

  if (text.includes("tour")) return "tour";
  if (text.includes("cafe") || text.includes("service") || text.includes("restaurant") || text.includes("contact")) return "service";
  if (text.includes("villa") || text.includes("homestay") || text.includes("apartment") || text.includes("property")) return "property";
  return "property";
}

function classifyBookingItem(item){
  const text = `${item.category || ""} ${item.serviceType || ""} ${item.itemName || ""}`.toLowerCase();

  if (String(item.reference || "").startsWith("MAN-") || text.includes("manual")) return "manual";
  if (text.includes("tour")) return "tour";
  if (text.includes("villa") || text.includes("homestay") || text.includes("apartment") || text.includes("property")) return "property";
  return "property";
}

function setInquiryMode(mode, btn){
  v6InquiryMode = mode || "all";
  document.getElementById("v6InquiryMode") && (document.getElementById("v6InquiryMode").value = v6InquiryMode);
  document.querySelectorAll("[data-inquiry-mode]").forEach(x => x.classList.remove("active"));
  btn?.classList.add("active");
  applyInquiryFilters();
}

function setBookingMode(mode, btn){
  v6BookingMode = mode || "all";
  document.getElementById("v6BookingMode") && (document.getElementById("v6BookingMode").value = v6BookingMode);
  document.querySelectorAll("[data-booking-mode]").forEach(x => x.classList.remove("active"));
  btn?.classList.add("active");
  applyBookingFilters();
}

function v6WrapFormFields(formSelector){
  const form = document.querySelector(formSelector);
  if(!form || form.dataset.v6Wrapped === "1") return;

  const labelMap = {
    propType:"Property Type", propName:"Property Name", propLocation:"Location / Area", propLat:"Latitude", propLng:"Longitude",
    propMapUrl:"Google Map / Directions URL", propPrice:"Price / Starting From", propGuests:"Maximum Guests", propBedrooms:"Bedrooms",
    propBathrooms:"Bathrooms", propFacilities:"Facilities", propDescription:"Description", propMainImage:"Main Cover Image URL",
    propLogo:"Logo / Badge Image URL", propPhotos:"Gallery Photo URLs",

    destName:"Tour Location Name", destProvince:"Province", destArea:"Nearest City / Area", destLat:"Latitude", destLng:"Longitude",
    destMapUrl:"Google Map / Directions URL", destBestFor:"Best For", destTime:"Time Needed", destNearby:"Nearby Places",
    destDescription:"Description", destLogo:"Logo / Badge Image URL", destPhotos:"Gallery Photo URLs",

    serviceName:"Business / Service Name", serviceCategory:"Category", serviceLocation:"Location", serviceNearestCity:"Nearest City / Area",
    serviceLat:"Latitude", serviceLng:"Longitude", serviceShortDescription:"Short Description", serviceFullDescription:"Full Description",
    servicePhone:"Phone", serviceWhatsapp:"WhatsApp", serviceWebsite:"Website", serviceMapUrl:"Google Map URL", serviceOpeningHours:"Opening Hours",
    serviceLogo:"Logo / Brand Image URL", serviceImage:"Main Image URL", servicePhotos:"Gallery Photo URLs"
  };

  [...form.querySelectorAll("input,select,textarea")].forEach(el => {
    if(el.type === "hidden" || el.closest(".v6-field-wrap") || el.closest(".upload-box")) return;
    const text = labelMap[el.id];
    if(!text) return;

    const wrap = document.createElement("div");
    wrap.className = "v6-field-wrap";

    const label = document.createElement("label");
    label.textContent = text;

    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(label);
    wrap.appendChild(el);
  });

  form.dataset.v6Wrapped = "1";
}

function v6OpenCmsModal(formBoxId, title){
  const box = document.getElementById(formBoxId);
  if(!box) return;

  box.classList.remove("hidden");
  box.classList.add("v6-cms-modal-open");

  if(!box.querySelector(".v6-cms-modal-head")){
    const head = document.createElement("div");
    head.className = "v6-cms-modal-head";
    head.innerHTML = `<h3>${escapeHtml(title || "Edit Details")}</h3><button type="button" onclick="v6CloseCmsModal('${formBoxId}')">×</button>`;
    box.insertBefore(head, box.firstChild);
  }else{
    box.querySelector(".v6-cms-modal-head h3").textContent = title || "Edit Details";
  }

  v6WrapFormFields("#propertyForm");
  v6WrapFormFields("#destinationForm");
  v6WrapFormFields("#serviceForm");
}

function v6CloseCmsModal(formBoxId){
  const box = document.getElementById(formBoxId);
  if(!box) return;
  box.classList.add("hidden");
  box.classList.remove("v6-cms-modal-open");
}

