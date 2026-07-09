(function(){
  const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";
  const PLACEHOLDER_IMAGE = "images/cover.jpg";
  let currentTour = null;

  function qs(name){ return new URLSearchParams(window.location.search).get(name) || ""; }
  function clean(v){ return String(v || "").trim(); }
  function escapeHtml(value){ return String(value || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
  function array(value){ if(Array.isArray(value)) return value; if(!value) return []; return String(value).split("\n").map(x=>x.trim()).filter(Boolean); }
  function firstImage(tour){ if(tour.mainImage) return tour.mainImage; if(Array.isArray(tour.photos) && tour.photos.length) return tour.photos[0]; return PLACEHOLDER_IMAGE; }
  function priceText(tour){ return tour.basePrice ? `${tour.currency || "USD"} ${tour.basePrice}` : "Price on request"; }
  function setText(id, text){ const el=document.getElementById(id); if(el) el.textContent=text || ""; }
  function setStatus(text){ setText("detailStatus", text); }

  function renderList(id, items, emptyText){
    const el = document.getElementById(id);
    if(!el) return;
    const rows = array(items);
    el.innerHTML = rows.length ? rows.map(x => `<div>${escapeHtml(x)}</div>`).join("") : `<div>${escapeHtml(emptyText)}</div>`;
  }

  function renderTour(tour){
    currentTour = tour;
    document.title = `${tour.title || "Tour"} | CeyBreez`;
    const hero = document.getElementById("detailHero");
    if(hero) hero.style.backgroundImage = `linear-gradient(rgba(0,0,0,.48),rgba(0,0,0,.48)), url('${firstImage(tour)}')`;
    setText("tourTitle", tour.title || "Tour Package");
    setText("tourSummary", tour.shortDescription || "Explore this Sri Lanka tour package with CeyBreez.");
    setText("tourCategory", tour.category || "Tour Package");
    setText("tourLocation", tour.location ? `📍 ${tour.location}` : "📍 Sri Lanka");
    setText("tourDuration", tour.duration ? `🕒 ${tour.duration}` : "🕒 Flexible");
    setText("tourPrice", `💰 ${priceText(tour)}`);
    setText("tourDescription", tour.fullDescription || tour.shortDescription || "More details will be provided by the CeyBreez team.");
    document.getElementById("tourNameField").value = tour.title || "";
    document.getElementById("tourIdField").value = tour.id || tour.slug || "";

    const photos = [firstImage(tour), ...array(tour.photos).filter(p => p !== firstImage(tour))].slice(0,6);
    document.getElementById("tourGallery").innerHTML = photos.map(p => `<img src="${escapeHtml(p)}" alt="${escapeHtml(tour.title)}" loading="lazy">`).join("");
    renderList("tourItinerary", tour.itinerary, "Itinerary will be customized for this package.");
    renderList("tourIncludes", tour.inclusions, "Includes will be confirmed with your quote.");
    renderList("tourExcludes", tour.exclusions, "Exclusions will be confirmed with your quote.");
    setStatus("");
  }

  async function loadTour(){
    const key = qs("slug") || qs("id");
    if(!key){ setStatus("Tour reference missing."); return; }
    try{
      setStatus("Loading tour details...");
      let res = await fetch(`${API_BASE}/api/tour-packages/${encodeURIComponent(key)}`);
      let data = await res.json().catch(()=>({}));
      if(!res.ok){
        const listRes = await fetch(`${API_BASE}/api/tour-packages`);
        const list = await listRes.json();
        data = Array.isArray(list) ? list.find(t => String(t.id) === key || String(t.slug) === key) : null;
        if(!data) throw new Error("Tour not found");
      }
      renderTour(data);
      loadRelated(data);
    }catch(error){
      console.error(error);
      setStatus("This tour package could not be loaded.");
    }
  }

  async function loadRelated(activeTour){
    try{
      const res = await fetch(`${API_BASE}/api/tour-packages`);
      const data = await res.json();
      const rows = (Array.isArray(data) ? data : []).filter(t => t.id !== activeTour.id).slice(0,3);
      document.getElementById("relatedTours").innerHTML = rows.map(t => `
        <a class="related-card" href="tour-details.html?slug=${encodeURIComponent(t.slug || t.id)}">
          <img src="${escapeHtml(firstImage(t))}" alt="${escapeHtml(t.title)}" loading="lazy">
          <div><h3>${escapeHtml(t.title)}</h3><p>${escapeHtml(t.shortDescription || t.location || "CeyBreez tour package")}</p></div>
        </a>
      `).join("");
    }catch(e){}
  }

  async function submitInquiry(event){
    event.preventDefault();
    if(!currentTour) return;
    const guestName = clean(document.getElementById("guestName").value);
    const guestEmail = clean(document.getElementById("guestEmail").value);
    const guestMobile = clean(document.getElementById("guestMobile").value);
    const guestCountry = clean(document.getElementById("guestCountry").value);
    const travelDate = clean(document.getElementById("travelDate").value);
    const guestCount = clean(document.getElementById("guestCount").value);
    const msg = clean(document.getElementById("guestMessage").value);
    const resultEl = document.getElementById("inquiryResult");

    const message = `Tour Package Inquiry\n\nTour: ${currentTour.title}\nPackage ID: ${currentTour.id || currentTour.slug || ""}\nCategory: ${currentTour.category || ""}\nLocation: ${currentTour.location || ""}\nDuration: ${currentTour.duration || ""}\nPrice: ${priceText(currentTour)}\n\nGuest Notes:\n${msg || "None"}`;

    const payload = {
      name: guestName,
      country: guestCountry,
      mobile: guestMobile,
      email: guestEmail,
      countryCode: "",
      experiences: `Tour Package - ${currentTour.title || "CeyBreez Tour"}`,
      itemName: currentTour.title || "Tour Package",
      dateFrom: travelDate,
      dateTo: travelDate,
      guests: guestCount,
      message
    };

    resultEl.textContent = "Sending inquiry...";
    try{
      const res = await fetch(API_BASE, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || "Failed to send inquiry");
      resultEl.innerHTML = `Inquiry sent successfully.<br>Reference: <strong>${escapeHtml(data.reference || "")}</strong>`;
      const whatsappText = `CeyBreez Tour Inquiry%0AReference: ${encodeURIComponent(data.reference || "")}%0ATour: ${encodeURIComponent(currentTour.title || "")}%0AName: ${encodeURIComponent(guestName)}%0AMobile: ${encodeURIComponent(guestMobile)}`;
      window.open(`https://api.whatsapp.com/send?phone=94704620017&text=${whatsappText}`, "_blank");
      event.target.reset();
    }catch(error){
      console.error(error);
      resultEl.textContent = "Inquiry sending failed. Please contact us on WhatsApp.";
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    loadTour();
    document.getElementById("tourInquiryForm")?.addEventListener("submit", submitInquiry);
  });
})();
function backToTours(){

    if(document.referrer.includes("tours")){

        history.back();

    }else{

        window.location.href="tours.html";

    }

}

function shareTour(){

    if(navigator.share){

        navigator.share({

            title:document.title,

            url:window.location.href

        });

    }else{

        navigator.clipboard.writeText(window.location.href);

        alert("Tour link copied.");
    }

}

function saveTour(){

    alert("Wishlist feature coming soon.");

}
