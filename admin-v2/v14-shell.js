(function(){
  const TOKEN_KEY = "CEYBREEZ_ADMIN_TOKEN";
  const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";

  const modules = {
    dashboard: "dashboardTab",
    inquiries: "inquiriesTab",
    bookings: "bookingsTab",
    availability: "bookingsTab",
    properties: "propertiesTab",
    tours: "destinationsTab",
    services: "servicesTab",
    reviews: "reviewsTab",
    reports: "reportsTab",
    pageBuilder: "pageControlTab",
    settings: "settingsTab"
  };

  const legacyCall = {
    dashboard: "dashboard",
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

  const titles = {
    dashboard:["Dashboard","Operations overview, check-ins, check-outs and quick summary"],
    inquiries:["Inquiry Management","Property, tour and service inquiry workflow"],
    bookings:["Booking Management","Confirmed bookings, manual bookings, calendar and matrix"],
    availability:["Availability / Matrix","Property booking calendar and availability overview"],
    properties:["Properties CMS","Villas, homestays and apartments management"],
    tours:["Tours CMS","Tour destinations and locations management"],
    services:["Cafe & Services CMS","Cafes, restaurants and service partners"],
    reviews:["Reviews","Guest reviews and approval"],
    reports:["Reports","Revenue, occupancy and performance reports"],
    pageBuilder:["Page Builder","Global website content and page sections"],
    settings:["Settings","Business settings and future integrations"]
  };

  const moduleIds = Object.values(modules).filter((v,i,a)=>a.indexOf(v)===i);
  let originalShowTab = window.showTab;
  let shellReady = false;

  function authHeaders(){
    return {"Content-Type":"application/json","Authorization":"Bearer " + (localStorage.getItem(TOKEN_KEY)||"")};
  }
  function escapeHtml(value){
    return String(value||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }
  function norm(v){return String(v||"").toLowerCase();}
  function toISO(d){return d.toISOString().slice(0,10);}
  function addDays(n){const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+n); return toISO(d);}
  function fmtDate(v){if(!v)return"-"; const d=new Date(String(v).slice(0,10)+"T00:00:00"); if(isNaN(d))return v; return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});}
  function isBooked(x){return norm(x.status||"Booked")==="booked";}
  function checkin(b,d){return isBooked(b)&&String(b.dateFrom||"").slice(0,10)===d;}
  function checkout(b,d){return isBooked(b)&&String(b.dateTo||"").slice(0,10)===d;}
  function inHouse(b,d){const f=String(b.dateFrom||"").slice(0,10),t=String(b.dateTo||"").slice(0,10); return isBooked(b)&&f&&t&&f<=d&&t>d;}
  async function fetchJson(path){const res=await fetch(API_BASE+path,{headers:authHeaders()}); const data=await res.json().catch(()=>[]); if(!res.ok) throw new Error(data.error||"Load failed"); return data||[];}
  function stat(label,value,sub){return `<div class="v14-stat-card"><span>${escapeHtml(label)}</span><strong>${value}</strong><small>${escapeHtml(sub||"")}</small></div>`;}
  function listHtml(items, empty){
    if(!items.length) return `<p class="empty-row">${escapeHtml(empty)}</p>`;
    return `<div class="v14-list">${items.slice(0,8).map(b=>`<div class="v14-list-item"><div><strong>${escapeHtml(b.guestName||"Guest")}</strong><small>${escapeHtml(b.itemName||b.serviceType||"-")}</small></div><span class="v14-pill">${escapeHtml(b.reference||b.id||"")}</span></div>`).join("")}</div>`;
  }

  async function renderDashboard(){
    const box=document.getElementById("dashboardTab");
    if(!box) return;
    box.innerHTML=`<div class="v14-section-head"><div><h2>Dashboard</h2><p>Loading CeyBreez live summary...</p></div><button class="v14-refresh" type="button" onclick="v14RenderDashboard()">Refresh Dashboard</button></div>`;
    try{
      const [inquiries, bookings, properties, tours] = await Promise.all([
        fetchJson("/api/admin/inquiries").catch(()=>[]),
        fetchJson("/api/admin/bookings").catch(()=>[]),
        fetchJson("/api/admin/properties").catch(()=>[]),
        fetchJson("/api/admin/destinations").catch(()=>[])
      ]);
      const yesterday=addDays(-1), today=addDays(0), tomorrow=addDays(1);
      const yIn=bookings.filter(b=>checkin(b,yesterday));
      const yOut=bookings.filter(b=>checkout(b,yesterday));
      const tIn=bookings.filter(b=>checkin(b,today));
      const tOut=bookings.filter(b=>checkout(b,today));
      const tmIn=bookings.filter(b=>checkin(b,tomorrow));
      const tmOut=bookings.filter(b=>checkout(b,tomorrow));
      const house=bookings.filter(b=>inHouse(b,today));
      const newInq=inquiries.filter(x=>norm(x.status||"New")==="new");
      box.innerHTML=`
        <div class="v14-section-head"><div><h2>Dashboard</h2><p>Live overview from stable V10 engine with fixed V15 router shell.</p></div><button class="v14-refresh" type="button" onclick="v14RenderDashboard()">Refresh Dashboard</button></div>
        <div class="v14-dashboard-grid">
          ${stat("New Inquiries",newInq.length,"Need follow-up")}
          ${stat("Active Bookings",bookings.filter(isBooked).length,"Confirmed bookings")}
          ${stat("Today Check-in",tIn.length,fmtDate(today))}
          ${stat("Today Check-out",tOut.length,fmtDate(today))}
          ${stat("In-house Today",house.length,"Staying tonight")}
          ${stat("Tomorrow Check-in",tmIn.length,fmtDate(tomorrow))}
          ${stat("Properties",properties.length,"CMS records")}
          ${stat("Tour Locations",tours.length,"CMS records")}
        </div>
        <div class="v14-ops-grid">
          <div class="v14-panel"><h3>Yesterday</h3><div class="v14-dashboard-grid compact">${stat("Check-in",yIn.length,fmtDate(yesterday))}${stat("Check-out",yOut.length,fmtDate(yesterday))}</div>${listHtml([...yIn,...yOut],"No yesterday operations")}</div>
          <div class="v14-panel"><h3>Today Operations</h3><div class="v14-dashboard-grid compact">${stat("Check-in",tIn.length,fmtDate(today))}${stat("Check-out",tOut.length,fmtDate(today))}</div>${listHtml([...tIn,...tOut],"No today check-ins or check-outs")}</div>
          <div class="v14-panel"><h3>Tomorrow</h3><div class="v14-dashboard-grid compact">${stat("Check-in",tmIn.length,fmtDate(tomorrow))}${stat("Check-out",tmOut.length,fmtDate(tomorrow))}</div>${listHtml([...tmIn,...tmOut],"No tomorrow operations")}</div>
        </div>
        <div class="v14-ops-grid">
          <div class="v14-panel"><h3>Quick Open</h3><div class="v14-list"><button class="secondary-btn" onclick="showTab('inquiries')">Open Inquiry Management</button><button class="secondary-btn" onclick="showTab('bookings')">Open Booking Management</button><button class="secondary-btn" onclick="showTab('reports')">Open Reports</button></div></div>
          <div class="v14-panel"><h3>New Inquiries</h3>${listHtml(newInq,"No new inquiries")}</div>
          <div class="v14-panel"><h3>In-house Guests</h3>${listHtml(house,"No in-house guests today")}</div>
        </div>`;
    }catch(err){
      box.innerHTML=`<div class="v14-section-head"><div><h2>Dashboard</h2><p>${escapeHtml(err.message)}</p></div></div>`;
    }
  }
  window.v14RenderDashboard = renderDashboard;

  function logicalName(tab){
    if(modules[tab]) return tab;
    const found = Object.entries(modules).find(([,id])=>id===tab);
    if(found) return found[0];
    const legacy = Object.entries(legacyCall).find(([,id])=>id===tab);
    return legacy ? legacy[0] : tab;
  }

  function repairLegacyMarkup(){
    const inquiries=document.getElementById("inquiriesTab");
    const inquiryStats=document.getElementById("inquiryStats");
    const inquiriesList=document.getElementById("inquiriesList");
    if(inquiries && inquiryStats && !inquiries.contains(inquiryStats)) inquiries.appendChild(inquiryStats);
    if(inquiries && inquiriesList && !inquiries.contains(inquiriesList)) inquiries.appendChild(inquiriesList);
  }

  function ensureShell(){
    if(shellReady) return;
    const panel=document.getElementById("adminPanel");
    if(!panel) return;
    repairLegacyMarkup();

    const legacyRoot=document.createElement("div");
    legacyRoot.id="v15LegacyRoot";
    legacyRoot.style.display="none";
    while(panel.firstChild) legacyRoot.appendChild(panel.firstChild);

    const sidebar=document.createElement("aside");
    sidebar.className="v14-sidebar";
    sidebar.innerHTML=`
      <div class="v14-brand"><div class="v14-logo">CB</div><div><strong>CeyBreez</strong><small>V15 · Fixed Router</small></div></div>
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
      <button class="v14-logout" type="button" onclick="logoutAdmin()">Logout</button>`;

    const main=document.createElement("main");
    main.className="v14-main";
    const top=document.createElement("header");
    top.className="v14-topbar";
    top.innerHTML=`<button class="v14-mobile-menu" type="button">☰</button><div><h1 id="v14PageTitle">Dashboard</h1><p id="v14PageSubtitle">Operations overview</p></div><div class="v14-topbar-actions"><input id="v14GlobalSearch" placeholder="Search guest, booking, inquiry..."><button class="v14-refresh" type="button" id="v14RefreshBtn">Refresh</button></div>`;
    const content=document.createElement("div");
    content.id="v15Content";
    content.className="v15-content";
    main.appendChild(top);
    main.appendChild(content);

    // Dashboard is a real module section created by the shell.
    const dash=document.createElement("section");
    dash.id="dashboardTab";
    dash.className="admin-section hidden";
    content.appendChild(dash);

    // Move only real module sections into the content root. This removes old blank wrappers.
    moduleIds.filter(id=>id!=="dashboardTab").forEach(id=>{
      const el=document.getElementById(id);
      if(el) content.appendChild(el);
    });

    // Keep important modal/drawer nodes outside hidden legacy root.
    ["inquiryModal","v64CmsDrawer","imagePreviewModal"].forEach(id=>{
      const el=document.getElementById(id);
      if(el) document.body.appendChild(el);
    });

    panel.appendChild(sidebar);
    panel.appendChild(main);
    panel.appendChild(legacyRoot);
    document.body.classList.add("v14-shell-ready","v15-router-ready");
    shellReady=true;

    sidebar.querySelectorAll("[data-v14-tab]").forEach(btn=>btn.addEventListener("click",()=>window.showTab(btn.dataset.v14Tab)));
    top.querySelector(".v14-mobile-menu")?.addEventListener("click",()=>sidebar.classList.toggle("open"));
    document.getElementById("v14RefreshBtn")?.addEventListener("click",()=>{
      const active=document.querySelector(".v14-nav button.active")?.dataset.v14Tab || "dashboard";
      if(active==="dashboard") renderDashboard();
      else refreshLegacy(active);
    });
  }

  function setActive(logical){
    document.querySelectorAll(".v14-nav button").forEach(b=>b.classList.toggle("active", b.dataset.v14Tab===logical));
    const [title,sub]=titles[logical]||titles.dashboard;
    const t=document.getElementById("v14PageTitle"), p=document.getElementById("v14PageSubtitle");
    if(t)t.textContent=title;
    if(p)p.textContent=sub;
  }

  function forceOnly(logical){
    const targetId = modules[logical] || modules.dashboard;
    moduleIds.forEach(id=>{
      const el=document.getElementById(id);
      if(!el) return;
      el.classList.toggle("hidden", id!==targetId);
      el.style.display = id===targetId ? "block" : "none";
      el.style.marginTop = "0";
      el.style.paddingTop = "0";
    });
    const target=document.getElementById(targetId);
    const content=document.getElementById("v15Content");
    if(target && content && target.parentElement!==content) content.appendChild(target);
    if(target && content && content.firstElementChild!==target){
      // keep active module directly under topbar so no earlier hidden/legacy node can create space
      content.insertBefore(target, content.firstElementChild);
    }
    if(target) target.scrollTop=0;
    window.scrollTo(0,0);
  }

  function refreshLegacy(logical){
    try{
      if(logical==="inquiries" && typeof loadInquiries==="function") loadInquiries();
      if((logical==="bookings" || logical==="availability") && typeof loadBookings==="function") loadBookings();
      if(logical==="properties" && typeof loadProperties==="function") loadProperties();
      if(logical==="tours" && typeof loadDestinations==="function") loadDestinations();
      if(logical==="services" && typeof loadServices==="function") loadServices();
      if(logical==="reviews" && typeof loadReviews==="function") loadReviews();
      if(logical==="reports" && typeof renderReports==="function") renderReports();
      if(logical==="pageBuilder"){
        if(typeof loadSiteContent==="function") loadSiteContent();
        if(typeof loadPageSections==="function") loadPageSections();
      }
    }catch(e){ console.warn("V15 refresh warning", e); }
  }

  window.showTab = function(tab){
    ensureShell();
    const logical=logicalName(tab);

    if(logical!=="dashboard" && typeof originalShowTab==="function"){
      try{ originalShowTab(legacyCall[logical] || tab); }catch(e){ console.warn("Legacy showTab warning", e); }
    }

    forceOnly(logical);
    setActive(logical);

    if(logical==="dashboard") renderDashboard();
    else refreshLegacy(logical);

    if(logical==="availability"){
      setTimeout(()=>document.getElementById("availabilityMatrix")?.scrollIntoView({behavior:"smooth",block:"start"}),250);
    }
  };

  const originalLogin=window.loginAdmin;
  if(typeof originalLogin==="function"){
    window.loginAdmin=function(){
      originalLogin();
      setTimeout(()=>{ ensureShell(); window.showTab("dashboard"); },500);
    };
  }

  document.addEventListener("DOMContentLoaded",()=>{
    setTimeout(()=>{
      ensureShell();
      if(localStorage.getItem(TOKEN_KEY) && !document.getElementById("adminPanel")?.classList.contains("hidden")) window.showTab("dashboard");
    },650);
  });
})();
