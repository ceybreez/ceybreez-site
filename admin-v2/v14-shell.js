
(function(){
  const TOKEN_KEY = "CEYBREEZ_ADMIN_TOKEN";
  const API_BASE_V14 = "https://ceybreez-contact-api.ceybreez.workers.dev";
  const tabMap = {
    dashboard: "dashboardTab",
    inquiries: "inquiriesTab",
    bookings: "bookingsTab",
    availability: "bookingsTab",
    properties: "properties",
    tours: "destinations",
    services: "services",
    reviews: "reviewsTab",
    reports: "reportsTab",
    pageBuilder: "pageControl",
    settings: "settingsTab"
  };
  const moduleTitles = {
    dashboard:["Dashboard","Operations overview, check-ins, check-outs and quick summary"],
    inquiries:["Inquiry Management","Property, tour and service inquiry workflow"],
    bookings:["Booking Management","Confirmed bookings, manual bookings, calendar and matrix"],
    availability:["Availability Matrix","Property booking calendar and availability overview"],
    properties:["Properties CMS","Villas, homestays and apartments management"],
    tours:["Tours CMS","Tour destinations and locations management"],
    services:["Cafe & Services CMS","Cafes, restaurants and service partners"],
    reviews:["Reviews","Guest reviews and approval"],
    reports:["Reports","Revenue, occupancy and performance reports"],
    pageBuilder:["Page Builder","Global website content and page sections"],
    settings:["Settings","Business settings and future integrations"]
  };
  function authHeaders(){
    return {"Content-Type":"application/json", "Authorization":"Bearer " + (localStorage.getItem(TOKEN_KEY)||"")};
  }
  function escapeHtml(value){
    return String(value || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }
  function norm(v){ return String(v||"").toLowerCase(); }
  function toISO(d){ return d.toISOString().slice(0,10); }
  function addDays(n){ const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+n); return toISO(d); }
  function fmtDate(v){ if(!v) return "-"; const d=new Date(String(v).slice(0,10)+"T00:00:00"); if(isNaN(d)) return v; return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}); }
  function isBooked(x){ return norm(x.status||"Booked") === "booked"; }
  function coversCheckout(b, date){ return isBooked(b) && String(b.dateTo||"").slice(0,10) === date; }
  function coversCheckin(b, date){ return isBooked(b) && String(b.dateFrom||"").slice(0,10) === date; }
  function inHouse(b, date){ const f=String(b.dateFrom||"").slice(0,10), t=String(b.dateTo||"").slice(0,10); return isBooked(b) && f && t && f <= date && t > date; }
  function listHtml(items, empty){
    if(!items.length) return `<p class="empty-row">${escapeHtml(empty)}</p>`;
    return `<div class="v14-list">${items.slice(0,8).map(b=>`<div class="v14-list-item"><div><strong>${escapeHtml(b.guestName||"Guest")}</strong><small>${escapeHtml(b.itemName||b.serviceType||"-")}</small></div><span class="v14-pill">${escapeHtml(b.reference||b.id||"")}</span></div>`).join("")}</div>`;
  }
  function stat(label,value,sub){return `<div class="v14-stat-card"><span>${label}</span><strong>${value}</strong><small>${sub||""}</small></div>`;}
  async function fetchJson(path){ const res=await fetch(API_BASE_V14+path,{headers:authHeaders()}); const data=await res.json().catch(()=>[]); if(!res.ok) throw new Error(data.error||"Load failed"); return data||[]; }
  async function renderDashboard(){
    const box=document.getElementById("dashboardTab"); if(!box) return;
    box.innerHTML = `<div class="v14-section-head"><div><h2>Dashboard</h2><p>Loading CeyBreez live summary...</p></div><button class="v14-refresh" type="button" onclick="v14RenderDashboard()">Refresh Dashboard</button></div>`;
    try{
      const [inquiries, bookings, properties, tours] = await Promise.all([
        fetchJson("/api/admin/inquiries").catch(()=>[]),
        fetchJson("/api/admin/bookings").catch(()=>[]),
        fetchJson("/api/admin/properties").catch(()=>[]),
        fetchJson("/api/admin/destinations").catch(()=>[])
      ]);
      const yesterday=addDays(-1), today=addDays(0), tomorrow=addDays(1);
      const yIn=bookings.filter(b=>coversCheckin(b,yesterday));
      const yOut=bookings.filter(b=>coversCheckout(b,yesterday));
      const tIn=bookings.filter(b=>coversCheckin(b,today));
      const tOut=bookings.filter(b=>coversCheckout(b,today));
      const tmIn=bookings.filter(b=>coversCheckin(b,tomorrow));
      const tmOut=bookings.filter(b=>coversCheckout(b,tomorrow));
      const house=bookings.filter(b=>inHouse(b,today));
      const newInq=inquiries.filter(x=>norm(x.status||"New")==="new");
      box.innerHTML = `
        <div class="v14-section-head"><div><h2>Dashboard</h2><p>Live overview from stable V10 engine with V14 Enterprise sidebar layout.</p></div><button class="v14-refresh" type="button" onclick="v14RenderDashboard()">Refresh Dashboard</button></div>
        <div class="v14-dashboard-grid">
          ${stat("New Inquiries", newInq.length, "Need follow-up")}
          ${stat("Active Bookings", bookings.filter(isBooked).length, "Confirmed bookings")}
          ${stat("Today Check-in", tIn.length, fmtDate(today))}
          ${stat("Today Check-out", tOut.length, fmtDate(today))}
          ${stat("In-house Today", house.length, "Staying tonight")}
          ${stat("Tomorrow Check-in", tmIn.length, fmtDate(tomorrow))}
          ${stat("Properties", properties.length, "CMS records")}
          ${stat("Tour Locations", tours.length, "CMS records")}
        </div>
        <div class="v14-ops-grid">
          <div class="v14-panel"><h3>Yesterday</h3><div class="v14-dashboard-grid" style="grid-template-columns:1fr 1fr;margin:0 0 12px">${stat("Check-in",yIn.length,fmtDate(yesterday))}${stat("Check-out",yOut.length,fmtDate(yesterday))}</div>${listHtml([...yIn,...yOut],"No yesterday operations")}</div>
          <div class="v14-panel"><h3>Today Operations</h3><div class="v14-dashboard-grid" style="grid-template-columns:1fr 1fr;margin:0 0 12px">${stat("Check-in",tIn.length,fmtDate(today))}${stat("Check-out",tOut.length,fmtDate(today))}</div>${listHtml([...tIn,...tOut],"No today check-ins or check-outs")}</div>
          <div class="v14-panel"><h3>Tomorrow</h3><div class="v14-dashboard-grid" style="grid-template-columns:1fr 1fr;margin:0 0 12px">${stat("Check-in",tmIn.length,fmtDate(tomorrow))}${stat("Check-out",tmOut.length,fmtDate(tomorrow))}</div>${listHtml([...tmIn,...tmOut],"No tomorrow operations")}</div>
        </div>
        <div class="v14-ops-grid">
          <div class="v14-panel"><h3>Quick Open</h3><div class="v14-list"><button class="secondary-btn" onclick="showTab('inquiries')">Open Inquiry Management</button><button class="secondary-btn" onclick="showTab('bookings')">Open Booking Management</button><button class="secondary-btn" onclick="showTab('reports')">Open Reports</button></div></div>
          <div class="v14-panel"><h3>New Inquiries</h3>${listHtml(newInq,"No new inquiries")}</div>
          <div class="v14-panel"><h3>In-house Guests</h3>${listHtml(house,"No in-house guests today")}</div>
        </div>
      `;
    }catch(err){ box.innerHTML = `<div class="v14-section-head"><div><h2>Dashboard</h2><p>${escapeHtml(err.message)}</p></div></div>`; }
  }
  window.v14RenderDashboard = renderDashboard;
  function allTabIds(){ return ["dashboardTab","destinationsTab","propertiesTab","servicesTab","inquiriesTab","bookingsTab","reviewsTab","reportsTab","pageControlTab","settingsTab"]; }
  function ensureShell(){
    if(document.body.classList.contains("v14-shell-ready")) return;
    const panel=document.getElementById("adminPanel"); if(!panel) return;
    const sidebar=document.createElement("aside");
    sidebar.className="v14-sidebar";
    sidebar.innerHTML=`
      <div class="v14-brand"><div class="v14-logo">CB</div><div><strong>CeyBreez</strong><small>V14 · V10 Full Features</small></div></div>
      <nav class="v14-nav">
        <button data-v14-tab="dashboard">📊 Dashboard</button>
        <button data-v14-tab="inquiries">💬 Inquiry Management</button>
        <button data-v14-tab="bookings">📅 Booking Management</button>
        <button data-v14-tab="availability">🗓 Availability / Matrix</button>
        <button data-v14-tab="properties">🏡 Properties CMS</button>
        <button data-v14-tab="tours">🚌 Tours CMS</button>
        <button data-v14-tab="services">☕ Cafe & Services CMS</button>
        <button data-v14-tab="reviews">⭐ Reviews</button>
        <button data-v14-tab="reports">📈 Reports</button>
        <button data-v14-tab="pageBuilder">📄 Page Builder</button>
        <button data-v14-tab="settings">⚙ Settings</button>
      </nav>
      <button class="v14-logout" type="button" onclick="logoutAdmin()">Logout</button>
    `;
    const main=document.createElement("main"); main.className="v14-main";
    while(panel.firstChild) main.appendChild(panel.firstChild);
    const top=document.createElement("header"); top.className="v14-topbar"; top.innerHTML=`<button class="v14-mobile-menu" type="button">☰</button><div><h1 id="v14PageTitle">Dashboard</h1><p id="v14PageSubtitle">Operations overview</p></div><div class="v14-topbar-actions"><input id="v14GlobalSearch" placeholder="Search guest, booking, inquiry..."><button class="v14-refresh" type="button" id="v14RefreshBtn">Refresh</button></div>`;
    main.insertBefore(top, main.firstChild);
    const dash=document.createElement("section"); dash.id="dashboardTab"; dash.className="admin-section"; main.insertBefore(dash, top.nextSibling);
    panel.appendChild(sidebar); panel.appendChild(main);
    document.body.classList.add("v14-shell-ready");
    sidebar.querySelectorAll("[data-v14-tab]").forEach(btn=>btn.addEventListener("click",()=>window.showTab(btn.dataset.v14Tab)));
    top.querySelector(".v14-mobile-menu")?.addEventListener("click",()=>sidebar.classList.toggle("open"));
    document.getElementById("v14RefreshBtn")?.addEventListener("click",()=>{ const active=document.querySelector(".v14-nav button.active")?.dataset.v14Tab || "dashboard"; if(active==="dashboard") renderDashboard(); else location.reload(); });
  }
  function setActive(tab){ document.querySelectorAll(".v14-nav button").forEach(b=>b.classList.toggle("active", b.dataset.v14Tab===tab)); const [title,sub]=moduleTitles[tab]||moduleTitles.dashboard; const t=document.getElementById("v14PageTitle"), p=document.getElementById("v14PageSubtitle"); if(t)t.textContent=title; if(p)p.textContent=sub; }
  const originalShowTab = window.showTab;
  window.showTab = function(tab){
    ensureShell();
    const logical = tabMap[tab] ? tab : (Object.entries(tabMap).find(([,v])=>v===tab)?.[0] || tab);
    if(logical === "dashboard"){
      allTabIds().forEach(id=>document.getElementById(id)?.classList.add("hidden"));
      document.getElementById("dashboardTab")?.classList.remove("hidden");
      setActive("dashboard");
      window.scrollTo({top:0,behavior:"smooth"});
      renderDashboard();
      return;
    }
    document.getElementById("dashboardTab")?.classList.add("hidden");
    if(typeof originalShowTab === "function") originalShowTab(tabMap[logical] || tab);
    setActive(logical);
    if(logical === "availability"){
      setTimeout(()=>{ document.getElementById("availabilityMatrix")?.scrollIntoView({behavior:"smooth",block:"start"}); },250);
    } else {
      window.scrollTo({top:0,behavior:"smooth"});
    }
  };
  const originalLogin = window.loginAdmin;
  if(typeof originalLogin === "function"){
    window.loginAdmin = function(){ originalLogin(); setTimeout(()=>{ ensureShell(); window.showTab("dashboard"); },600); };
  }
  document.addEventListener("DOMContentLoaded",()=>{
    setTimeout(()=>{
      ensureShell();
      if(localStorage.getItem(TOKEN_KEY) && !document.getElementById("adminPanel")?.classList.contains("hidden")) window.showTab("dashboard");
    },700);
  });
})();
