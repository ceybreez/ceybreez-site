(function(){
  const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";
  const state = { reviews: [], content: {} };

  const esc = (v) => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const arr = (v) => { if(Array.isArray(v)) return v; if(!v) return []; try{ const x=JSON.parse(v); return Array.isArray(x)?x:[]; }catch{return String(v).split("\n").map(x=>x.trim()).filter(Boolean);} };
  const stars = (n) => "★".repeat(Math.max(1,Math.min(5,Number(n)||5))) + "☆".repeat(Math.max(0,5-(Number(n)||5)));
  const initials = (name) => String(name||"Guest").split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase();
  const norm = (v) => String(v||"").trim().toLowerCase();

  function reviewCard(r){
    const source = r.source || "Guest";
    const sourceLink = r.sourceUrl ? `<a class="cb-review-source" href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">${esc(source)} review ↗</a>` : `<span class="cb-review-source">${esc(source)} review</span>`;
    const avatar = r.guestPhoto ? `<img src="${esc(r.guestPhoto)}" alt="${esc(r.guestName||'Guest')}">` : `<span>${esc(initials(r.guestName))}</span>`;
    return `<article class="cb-review-card">
      <div class="cb-review-top"><div class="cb-review-avatar">${avatar}</div><div><h3>${esc(r.guestName||"Guest")}</h3><p>${esc(r.country||"")}</p></div></div>
      <div class="cb-review-stars" aria-label="${Number(r.rating)||5} out of 5 stars">${stars(r.rating)}</div>
      ${r.title?`<h4>${esc(r.title)}</h4>`:""}
      <p class="cb-review-message">“${esc(r.message||"")}”</p>
      <div class="cb-review-foot"><span>${esc(r.itemName||"")}</span>${sourceLink}</div>
    </article>`;
  }

  function renderReviewSections(){
    document.querySelectorAll("[data-reviews-showcase]").forEach(section => {
      const type = norm(section.dataset.reviewType || "all");
      const featuredOnly = section.dataset.featured === "1";
      const limit = Number(section.dataset.limit || 6);
      const item = norm(section.dataset.itemName || "");
      let rows = state.reviews.filter(r => {
        const rt = norm(r.type);
        const typeOk = type === "all" || rt === type || (type === "property" && ["property","villa","homestay","apartment"].includes(rt));
        const itemOk = !item || norm(r.itemName) === item;
        return typeOk && itemOk && (!featuredOnly || !!r.featured);
      });
      rows.sort((a,b)=>Number(!!b.featured)-Number(!!a.featured) || String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
      const grid = section.querySelector("[data-review-grid]");
      if(!grid) return;
      if(!rows.length){ grid.innerHTML = `<p class="cb-review-empty">No published reviews yet.</p>`; return; }
      grid.innerHTML = rows.slice(0,limit).map(reviewCard).join("");

      const filter = section.querySelector("[data-review-item-filter]");
      if(filter && !filter.dataset.ready){
        const items=[...new Set(state.reviews.filter(r=>type==='all'||norm(r.type)===type||(type==='property'&&["property","villa","homestay","apartment"].includes(norm(r.type)))).map(r=>r.itemName).filter(Boolean))].sort();
        filter.innerHTML='<option value="">All reviews</option>'+items.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
        filter.dataset.ready='1';
        filter.addEventListener('change',()=>{ section.dataset.itemName=filter.value; renderReviewSections(); });
      }
    });
  }

  function youtubeId(url){ const m=String(url||"").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([^?&/]+)/); return m?m[1]:""; }
  function renderStatsAndReels(){
    const happy = state.content.happy_customer_count || "0";
    const trips = state.content.completed_trip_count || "0";
    const rating = state.content.google_rating || "5.0";
    document.querySelectorAll('[data-happy-customers]').forEach(x=>x.textContent=happy);
    document.querySelectorAll('[data-completed-trips]').forEach(x=>x.textContent=trips);
    document.querySelectorAll('[data-google-rating]').forEach(x=>x.textContent=rating);
    document.querySelectorAll('[data-google-review-link]').forEach(a=>{ const u=state.content.google_review_url; if(u) a.href=u; else a.style.display='none'; });

    const reels=arr(state.content.review_reels);
    document.querySelectorAll('[data-reels-grid]').forEach(grid=>{
      if(!reels.length){ grid.innerHTML='<p class="cb-review-empty">Travel reels will appear here soon.</p>'; return; }
      grid.innerHTML=reels.slice(0,8).map((url,i)=>{
        const yid=youtubeId(url);
        if(yid) return `<article class="cb-reel-card"><iframe src="https://www.youtube.com/embed/${esc(yid)}" title="CeyBreez reel ${i+1}" loading="lazy" allowfullscreen></iframe></article>`;
        if(/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return `<article class="cb-reel-card"><video controls playsinline preload="metadata"><source src="${esc(url)}"></video></article>`;
        return `<a class="cb-reel-card cb-reel-link" href="${esc(url)}" target="_blank" rel="noopener"><span>▶</span><strong>Watch travel reel</strong></a>`;
      }).join('');
    });
  }

  async function init(){
    try{
      const [rr,cr]=await Promise.all([fetch(`${API_BASE}/api/reviews`),fetch(`${API_BASE}/api/site-content`)]);
      state.reviews=rr.ok?await rr.json():[];
      state.content=cr.ok?await cr.json():{};
    }catch(e){ console.warn('Reviews showcase load failed',e); }
    renderReviewSections(); renderStatsAndReels();
  }
  document.addEventListener('DOMContentLoaded',init);
})();
