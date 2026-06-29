
(function(){
  const NAV = [
    ["dashboardTab","📊","Dashboard","Overview and quick access"],
    ["inquiriesTab","💬","Inquiries","Inquiry management"],
    ["bookingsTab","📅","Bookings","Booking management"],
    ["properties","🏡","Properties","Villas, apartments and homestays"],
    ["destinations","🚌","Tours","Tour destinations"],
    ["services","☕","Services","Cafe and services"],
    ["reviewsTab","⭐","Reviews","Guest reviews"],
    ["reportsTab","📈","Reports","Reports and availability"],
    ["pageControl","🧩","Page Builder","Website content control"],
    ["settingsTab","⚙️","Settings","System settings"]
  ];

  let originalShowTab = null;
  let originalLoginAdmin = null;

  function q(id){ return document.getElementById(id); }

  function titleFor(tab){
    const item = NAV.find(x => x[0] === tab);
    return item ? item[2] : "CeyBreez Admin";
  }

  function subtitleFor(tab){
    const item = NAV.find(x => x[0] === tab);
    return item ? item[3] : "V10 Modular V2";
  }

  function allContentSections(){
    return ["dashboardTab","destinationsTab","propertiesTab","servicesTab","inquiriesTab","bookingsTab","reviewsTab","reportsTab","pageControlTab","settingsTab"];
  }

  function updateTop(tab){
    const title = q("v2PageTitle");
    const subtitle = q("v2PageSubtitle");
    if(title) title.textContent = titleFor(tab);
    if(subtitle) subtitle.textContent = subtitleFor(tab);
    document.querySelectorAll(".v2-nav button").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tab));
  }

  function renderDashboard(){
    const box = q("dashboardTab");
    if(!box) return;
    const inquiries = Array.isArray(window.allInquiries) ? window.allInquiries : (typeof allInquiries !== "undefined" ? allInquiries : []);
    const bookings = Array.isArray(window.allBookings) ? window.allBookings : (typeof allBookings !== "undefined" ? allBookings : []);
    const props = Array.isArray(window.allProperties) ? window.allProperties : [];
    const tours = typeof allDestinations !== "undefined" ? allDestinations : [];
    const booked = bookings.filter(x => String(x.status || "Booked").toLowerCase() === "booked").length;
    const newInq = inquiries.filter(x => String(x.status || "New").toLowerCase() === "new").length;

    box.innerHTML = `
      <div class="v2-hero">
        <h2>CeyBreez Admin V10 Modular V2</h2>
        <p>Stable V10 engine, cleaner Admin V2 style sidebar, dashboard and separated module files. Live V10 folder is untouched.</p>
      </div>
      <div class="v2-dashboard-grid">
        <div class="v2-stat-card"><span>Total Inquiries</span><strong>${inquiries.length}</strong></div>
        <div class="v2-stat-card"><span>New Inquiries</span><strong>${newInq}</strong></div>
        <div class="v2-stat-card"><span>Active Bookings</span><strong>${booked}</strong></div>
        <div class="v2-stat-card"><span>Properties</span><strong>${props.length}</strong></div>
      </div>
      <div class="v2-quick-grid">
        <div class="v2-quick-card" onclick="v2Navigate('inquiriesTab')"><h3>Inquiry Management</h3><p>Open, quote, confirm and manage guest inquiries.</p></div>
        <div class="v2-quick-card" onclick="v2Navigate('bookingsTab')"><h3>Booking Management</h3><p>Bookings list, calendar, manual bookings and notes.</p></div>
        <div class="v2-quick-card" onclick="v2Navigate('properties')"><h3>Properties CMS</h3><p>Manage villas, apartments and homestays.</p></div>
        <div class="v2-quick-card" onclick="v2Navigate('destinations')"><h3>Tours CMS</h3><p>Manage destinations and tour locations.</p></div>
        <div class="v2-quick-card" onclick="v2Navigate('services')"><h3>Services CMS</h3><p>Manage cafes and local services.</p></div>
        <div class="v2-quick-card" onclick="v2Navigate('reportsTab')"><h3>Reports</h3><p>View availability matrix and reports.</p></div>
      </div>`;
  }

  window.v2Navigate = function(tab){
    const sidebar = q("v2Sidebar");
    if(sidebar) sidebar.classList.remove("open");

    if(tab === "dashboardTab"){
      allContentSections().forEach(id => q(id)?.classList.add("hidden"));
      q("dashboardTab")?.classList.remove("hidden");
      renderDashboard();
      updateTop(tab);
      return;
    }

    q("dashboardTab")?.classList.add("hidden");
    if(typeof originalShowTab === "function") originalShowTab(tab);
    updateTop(tab);
  };

  function buildShell(){
    const panel = q("adminPanel");
    if(!panel || panel.dataset.v2Ready === "1") return;
    panel.dataset.v2Ready = "1";

    const children = Array.from(panel.children);
    const shell = document.createElement("div");
    shell.className = "v2-admin-shell";

    const sidebar = document.createElement("aside");
    sidebar.className = "v2-sidebar";
    sidebar.id = "v2Sidebar";
    sidebar.innerHTML = `
      <div class="v2-brand"><div class="v2-logo">CB</div><div><strong>CeyBreez</strong><span>V10 Modular V2</span></div></div>
      <nav class="v2-nav">
        ${NAV.map(x => `<button type="button" data-tab="${x[0]}" onclick="v2Navigate('${x[0]}')"><span>${x[1]}</span>${x[2]}</button>`).join("")}
      </nav>
      <div class="v2-sidebar-footer"><button type="button" onclick="logoutAdmin()">Logout</button></div>`;

    const main = document.createElement("main");
    main.className = "v2-main";
    main.innerHTML = `
      <header class="v2-topbar">
        <div style="display:flex;gap:12px;align-items:flex-start">
          <button type="button" class="v2-menu-toggle" onclick="document.getElementById('v2Sidebar')?.classList.toggle('open')">☰</button>
          <div><h1 id="v2PageTitle">Dashboard</h1><p id="v2PageSubtitle">Overview and quick access</p></div>
        </div>
        <button type="button" class="v2-refresh" onclick="loadAll(); setTimeout(renderV2Dashboard, 500)">Refresh Data</button>
      </header>
      <section id="dashboardTab" class="v2-dashboard"></section>`;

    children.forEach(child => main.appendChild(child));
    shell.appendChild(sidebar);
    shell.appendChild(main);
    panel.appendChild(shell);
  }

  window.renderV2Dashboard = renderDashboard;

  document.addEventListener("DOMContentLoaded", () => {
    originalShowTab = window.showTab;
    originalLoginAdmin = window.loginAdmin;

    if(typeof originalLoginAdmin === "function"){
      window.loginAdmin = function(){
        originalLoginAdmin();
        setTimeout(() => { buildShell(); window.v2Navigate("dashboardTab"); }, 250);
      };
    }

    buildShell();
    setTimeout(() => {
      if(localStorage.getItem("CEYBREEZ_ADMIN_TOKEN")) window.v2Navigate("dashboardTab");
    }, 450);
  });
})();
