(function(){
  const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";
  const PLACEHOLDER_IMAGE = "images/cover.jpg";

  let allTours = [];

  function clean(value){ return String(value || "").trim(); }
  function moneyNumber(value){
    const n = Number(String(value || "0").replace(/[^0-9.\-]/g,""));
    return Number.isFinite(n) ? n : 0;
  }
  function escapeHtml(value){
    return String(value || "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }
  function firstImage(tour){
    if(tour.mainImage) return tour.mainImage;
    if(Array.isArray(tour.photos) && tour.photos.length) return tour.photos[0];
    return PLACEHOLDER_IMAGE;
  }
  function priceText(tour){
    const currency = tour.currency || "USD";
    const base = clean(tour.basePrice);
    if(!base) return "Price on request";
    return `${currency} ${base}`;
  }
  function detailsUrl(tour){
    const key = tour.slug || tour.id || tour.title || "";
    return `tour-details.html?slug=${encodeURIComponent(key)}`;
  }
  function setStatus(text){
    const el = document.getElementById("tourPackageStatus");
    if(el) el.textContent = text || "";
  }

  function renderCategories(){
    const select = document.getElementById("tourCategoryFilter");
    if(!select) return;
    const current = select.value || "all";
    const categories = [...new Set(allTours.map(t => clean(t.category)).filter(Boolean))].sort();
    select.innerHTML = `<option value="all">All Categories</option>` + categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    select.value = categories.includes(current) ? current : "all";
  }

  function filteredTours(){
    const q = clean(document.getElementById("tourSearch")?.value).toLowerCase();
    const category = document.getElementById("tourCategoryFilter")?.value || "all";
    const sort = document.getElementById("tourSortFilter")?.value || "featured";

    let rows = allTours.filter(t => {
      const haystack = `${t.title||""} ${t.location||""} ${t.category||""} ${t.duration||""} ${t.shortDescription||""}`.toLowerCase();
      const qOk = !q || haystack.includes(q);
      const cOk = category === "all" || clean(t.category) === category;
      return qOk && cOk;
    });

    rows.sort((a,b) => {
      if(sort === "price-low") return moneyNumber(a.basePrice) - moneyNumber(b.basePrice);
      if(sort === "price-high") return moneyNumber(b.basePrice) - moneyNumber(a.basePrice);
      if(sort === "az") return clean(a.title).localeCompare(clean(b.title));
      const featuredDiff = Number(!!b.featured) - Number(!!a.featured);
      if(featuredDiff) return featuredDiff;
      return Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || clean(a.title).localeCompare(clean(b.title));
    });

    return rows;
  }

  function renderTours(){
    const grid = document.getElementById("tourPackagesGrid");
    if(!grid) return;
    const rows = filteredTours();

    if(!rows.length){
      grid.innerHTML = "";
      setStatus(allTours.length ? "No tour packages match your search." : "No tour packages available yet.");
      return;
    }

    setStatus(`${rows.length} tour package${rows.length === 1 ? "" : "s"} available`);
    grid.innerHTML = rows.map(tour => `
      <article class="dynamic-tour-card">
        <div class="dynamic-tour-image">
          <img src="${escapeHtml(firstImage(tour))}" alt="${escapeHtml(tour.title)}" loading="lazy">
          ${tour.featured ? `<span class="featured-badge">⭐ Featured</span>` : ""}
        </div>
        <div class="tour-card-body">
          <div class="tour-meta-line">
            ${tour.category ? `<span class="tour-chip">${escapeHtml(tour.category)}</span>` : ""}
            ${tour.location ? `<span class="tour-chip">📍 ${escapeHtml(tour.location)}</span>` : ""}
            ${tour.duration ? `<span class="tour-chip">🕒 ${escapeHtml(tour.duration)}</span>` : ""}
          </div>
          <h3>${escapeHtml(tour.title)}</h3>
          <p class="tour-card-desc">${escapeHtml(tour.shortDescription || tour.fullDescription || "Explore this Sri Lanka experience with CeyBreez.")}</p>
          <div class="tour-card-bottom">
            <div class="tour-price"><small>From</small>${escapeHtml(priceText(tour))}</div>
            <a class="view-tour-btn" href="${detailsUrl(tour)}">View Details</a>
          </div>
        </div>
      </article>
    `).join("");
  }

  async function loadTours(){
    const grid = document.getElementById("tourPackagesGrid");
    if(!grid) return;
    try{
      setStatus("Loading tour packages...");
      const res = await fetch(`${API_BASE}/api/tour-packages`);
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || "Failed to load tour packages");
      allTours = Array.isArray(data) ? data : [];
      renderCategories();
      renderTours();
    }catch(error){
      console.error("Tour packages load failed", error);
      setStatus("Tour packages could not be loaded right now.");
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    loadTours();
    document.getElementById("tourSearch")?.addEventListener("input", renderTours);
    document.getElementById("tourCategoryFilter")?.addEventListener("change", renderTours);
    document.getElementById("tourSortFilter")?.addEventListener("change", renderTours);
  });
})();
