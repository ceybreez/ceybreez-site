(function(){
  const TOKEN_KEY = "CEYBREEZ_ADMIN_TOKEN";
  const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";

  const modules = {
    dashboard: "dashboardTab",
    inquiries: "inquiriesTab",
    bookings: "bookingsTab",
    availability: "availabilityTab",
    properties: "propertiesTab",
    tours: "destinationsTab",
    services: "servicesTab",
    reviews: "reviewsTab",
    finance: "financeTab",
    reports: "reportsTab",
    pageBuilder: "pageControlTab",
    settings: "settingsTab"
  };

  const legacyCall = {
    dashboard: "dashboard",
    inquiries: "inquiriesTab",
    bookings: "bookingsTab",
    availability: "availabilityTab",
    properties: "properties",
    tours: "destinations",
    services: "services",
    reviews: "reviewsTab",
    finance: "financeTab",
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
    finance:["Finance","Booking payments, advances, balances and refunds"],
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

  function money(value){
    const n = Number(String(value||"0").replace(/[^0-9.-]/g,""));
    return Number.isFinite(n) ? n : 0;
  }
  function bookingAmount(b){return money(b.totalAmount || b.quoteTotalAmount || b.amount || b.price || 0);}
  function paymentPending(b){
    const text = norm(`${b.paymentStatus||""} ${b.advanceAmount||""} ${b.balanceAmount||""}`);
    if(!isBooked(b)) return false;
    if(text.includes("paid") && !text.includes("partial")) return false;
    if(text.includes("pending") || text.includes("unpaid") || text.includes("partial")) return true;
    return !!money(b.balanceAmount || 0);
  }
  function needsFollowUp(i){
    const s=norm(i.status||"New");
    return ["new","contacted","quoted"].includes(s);
  }
  function safeArray(v){return Array.isArray(v)?v:[];}
  function dateOnly(v){return String(v||"").slice(0,10);}
  function monthKey(){return new Date().toISOString().slice(0,7);}
  function latest(items, count=8){
    return [...items].sort((a,b)=>String(b.createdAt||b.created_at||b.dateFrom||"").localeCompare(String(a.createdAt||a.created_at||a.dateFrom||""))).slice(0,count);
  }
  function opList(title, items, empty){
    return `<div class="v17-op-box"><h4>${escapeHtml(title)}</h4>${listHtml(items, empty)}</div>`;
  }
  function smallMetric(label, value, tone=""){
    return `<div class="v17-mini-metric ${tone}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }
  function percent(n,d){return d?Math.round((n/d)*100):0;}
  function propertyTypeCounts(properties){
    const map={villa:0,homestay:0,apartment:0,active:0,featured:0};
    properties.forEach(p=>{
      const type=norm(p.type);
      if(map[type]!==undefined) map[type]++;
      if(p.active!==false && Number(p.active)!==0) map.active++;
      if(p.featured===true || Number(p.featured)===1) map.featured++;
    });
    return map;
  }

  async function renderDashboard(){
    const box=document.getElementById("dashboardTab");
    if(!box) return;
    box.innerHTML=`<div class="v14-section-head"><div><h2>Dashboard</h2><p>Loading CeyBreez live operations summary...</p></div><button class="v14-refresh" type="button" onclick="v14RenderDashboard()">Refresh Dashboard</button></div>`;
    try{
      const [inquiriesRaw, bookingsRaw, propertiesRaw, toursRaw, reviewsRaw] = await Promise.all([
        fetchJson("/api/admin/inquiries").catch(()=>[]),
        fetchJson("/api/admin/bookings").catch(()=>[]),
        fetchJson("/api/admin/properties").catch(()=>[]),
        fetchJson("/api/admin/destinations").catch(()=>[]),
        fetchJson("/api/admin/reviews").catch(()=>[])
      ]);
      const inquiries=safeArray(inquiriesRaw), bookings=safeArray(bookingsRaw), properties=safeArray(propertiesRaw), tours=safeArray(toursRaw), reviews=safeArray(reviewsRaw);
      const yesterday=addDays(-1), today=addDays(0), tomorrow=addDays(1);
      const yIn=bookings.filter(b=>checkin(b,yesterday));
      const yOut=bookings.filter(b=>checkout(b,yesterday));
      const tIn=bookings.filter(b=>checkin(b,today));
      const tOut=bookings.filter(b=>checkout(b,today));
      const tmIn=bookings.filter(b=>checkin(b,tomorrow));
      const tmOut=bookings.filter(b=>checkout(b,tomorrow));
      const house=bookings.filter(b=>inHouse(b,today));
      const activeBookings=bookings.filter(isBooked);
      const pendingPayments=bookings.filter(paymentPending);
      const followUps=inquiries.filter(needsFollowUp);
      const newInq=inquiries.filter(x=>norm(x.status||"New")==="new");
      const quoted=inquiries.filter(x=>norm(x.status)==="quoted");
      const bookedInq=inquiries.filter(x=>norm(x.status)==="booked");
      const todayInquiries=inquiries.filter(x=>dateOnly(x.createdAt||x.created_at||x.dateFrom)===today);
      const yesterdayInquiries=inquiries.filter(x=>dateOnly(x.createdAt||x.created_at||x.dateFrom)===yesterday);
      const tomorrowBookings=bookings.filter(b=>checkin(b,tomorrow)||checkout(b,tomorrow));
      const thisMonthRevenue=activeBookings.filter(b=>dateOnly(b.dateFrom).slice(0,7)===monthKey()).reduce((s,b)=>s+bookingAmount(b),0);
      const todayRevenue=activeBookings.filter(b=>checkin(b,today)||checkout(b,today)).reduce((s,b)=>s+bookingAmount(b),0);
      const occ=percent(house.length, Math.max(properties.filter(p=>p.active!==false && Number(p.active)!==0).length,1));
      const pc=propertyTypeCounts(properties);

      box.innerHTML=`
        <div class="v17-hero">
          <div>
            <span class="v17-kicker">CeyBreez Enterprise PMS</span>
            <h2>Good day, Admin</h2>
            <p>Today is ${escapeHtml(fmtDate(today))}. Here is your live check-in, check-out, inquiry and booking overview.</p>
          </div>
          <div class="v17-hero-actions">
            <button type="button" onclick="showTab('inquiries')">+ Inquiry</button>
            <button type="button" onclick="showTab('bookings')">+ Booking</button>
            <button type="button" onclick="v14RenderDashboard()">Refresh</button>
          </div>
        </div>

        <div class="v14-dashboard-grid v17-main-stats">
          ${stat("Today Check-in",tIn.length,fmtDate(today))}
          ${stat("Today Check-out",tOut.length,fmtDate(today))}
          ${stat("In-house Guests",house.length,`${occ}% estimated occupancy`)}
          ${stat("Pending Payments",pendingPayments.length,"Need follow-up")}
          ${stat("New Inquiries",newInq.length,"Unanswered leads")}
          ${stat("Pending Follow-ups",followUps.length,"New / contacted / quoted")}
          ${stat("Revenue Today",todayRevenue ? todayRevenue.toFixed(2) : "0","From active bookings")}
          ${stat("Revenue This Month",thisMonthRevenue ? thisMonthRevenue.toFixed(2) : "0","Based on check-in month")}
        </div>

        <div class="v17-timeline-grid">
          <div class="v17-day-card yesterday"><h3>Yesterday</h3><div class="v17-mini-grid">${smallMetric("Check-ins",yIn.length)}${smallMetric("Check-outs",yOut.length)}${smallMetric("Inquiries",yesterdayInquiries.length)}</div>${listHtml([...yIn,...yOut],"No operations yesterday")}</div>
          <div class="v17-day-card today"><h3>Today</h3><div class="v17-mini-grid">${smallMetric("Check-ins",tIn.length,"good")}${smallMetric("Check-outs",tOut.length,"warn")}${smallMetric("Inquiries",todayInquiries.length)}</div>${listHtml([...tIn,...tOut],"No check-ins or check-outs today")}</div>
          <div class="v17-day-card tomorrow"><h3>Tomorrow</h3><div class="v17-mini-grid">${smallMetric("Check-ins",tmIn.length)}${smallMetric("Check-outs",tmOut.length)}${smallMetric("Bookings",tomorrowBookings.length)}</div>${listHtml([...tmIn,...tmOut],"No operations tomorrow")}</div>
        </div>

        <div class="v17-ops-board">
          <div class="v14-panel"><h3>Today Check-ins</h3>${listHtml(tIn,"No arrivals today")}</div>
          <div class="v14-panel"><h3>Today Check-outs</h3>${listHtml(tOut,"No departures today")}</div>
          <div class="v14-panel"><h3>Arrivals Without Full Payment</h3>${listHtml(tIn.filter(paymentPending),"No payment alerts for today's arrivals")}</div>
          <div class="v14-panel"><h3>Tomorrow Arrivals</h3>${listHtml(tmIn,"No arrivals tomorrow")}</div>
        </div>

        <div class="v17-ops-grid-wide">
          <div class="v14-panel"><h3>Inquiry Pipeline</h3><div class="v17-mini-grid four">${smallMetric("New",newInq.length)}${smallMetric("Quoted",quoted.length)}${smallMetric("Booked",bookedInq.length,"good")}${smallMetric("Conversion",`${percent(bookedInq.length,inquiries.length)}%`)}</div>${listHtml(latest(followUps,6),"No pending inquiries")}</div>
          <div class="v14-panel"><h3>Property Summary</h3><div class="v17-mini-grid four">${smallMetric("Villas",pc.villa)}${smallMetric("Apartments",pc.apartment)}${smallMetric("Homestays",pc.homestay)}${smallMetric("Featured",pc.featured)}</div>${listHtml(properties.map(p=>({guestName:p.name,itemName:p.location||p.type,reference:p.active!==false&&Number(p.active)!==0?'Active':'Hidden'})).slice(0,8),"No properties")}</div>
        </div>

        <div class="v17-ops-grid-wide">
          <div class="v14-panel"><h3>Latest Bookings</h3>${listHtml(latest(bookings,8),"No bookings found")}</div>
          <div class="v14-panel"><h3>Latest Inquiries</h3>${listHtml(latest(inquiries,8).map(i=>({guestName:i.guestName,itemName:i.itemName||i.serviceType,reference:i.status||i.reference})),"No inquiries found")}</div>
        </div>

        <div class="v17-ops-grid-wide">
          <div class="v14-panel"><h3>Tour & Review Snapshot</h3><div class="v17-mini-grid four">${smallMetric("Tour Locations",tours.length)}${smallMetric("Reviews",reviews.length)}${smallMetric("Active Bookings",activeBookings.length)}${smallMetric("Properties",properties.length)}</div></div>
          <div class="v14-panel"><h3>Quick Actions</h3><div class="v17-quick-actions"><button onclick="showTab('inquiries')">Open Inquiries</button><button onclick="showTab('bookings')">Open Bookings</button><button onclick="showTab('availability')">Open Matrix</button><button onclick="showTab('reports')">Open Reports</button></div></div>
        </div>
      `;
    }catch(err){
      box.innerHTML=`<div class="v14-section-head"><div><h2>Dashboard</h2><p>${escapeHtml(err.message)}</p></div><button class="v14-refresh" onclick="v14RenderDashboard()">Retry</button></div>`;
    }
  }
  window.v14RenderDashboard = renderDashboard;

  function callDashboard(){
    if (window.v14RenderDashboard && window.v14RenderDashboard !== renderDashboard) {
      return window.v14RenderDashboard();
    }
    return renderDashboard();
  }


  function availabilityBlocks(){
    try{return JSON.parse(localStorage.getItem("CEYBREEZ_V18_AVAILABILITY_BLOCKS")||"[]");}
    catch(e){return [];}
  }
  function saveAvailabilityBlocks(rows){localStorage.setItem("CEYBREEZ_V18_AVAILABILITY_BLOCKS", JSON.stringify(rows||[]));}
  function dateRange(from,to){
    const out=[]; if(!from||!to) return out;
    const a=new Date(from+"T00:00:00"), b=new Date(to+"T00:00:00");
    if(isNaN(a)||isNaN(b)||a>=b) return out;
    for(let d=new Date(a); d<b; d.setDate(d.getDate()+1)) out.push(toISO(d));
    return out;
  }
  function activePropertiesByType(properties,type){
    return properties.filter(p=>{
      const active = p.active!==false && Number(p.active)!==0;
      const okType = !type || type==="all" || norm(p.type)===norm(type);
      return active && okType;
    });
  }
  function bookingCovers(b, property, date){
    const f=dateOnly(b.dateFrom), t=dateOnly(b.dateTo);
    return isBooked(b) && String(b.itemName||"").trim().toLowerCase()===String(property||"").trim().toLowerCase() && f && t && f<=date && t>date;
  }
  function blockCovers(block, property, date){
    return String(block.propertyName||"").trim().toLowerCase()===String(property||"").trim().toLowerCase() && (block.dates||[]).includes(date);
  }
  function availabilityTypeClass(type){
    const t=norm(type);
    if(t.includes("owner")) return "owner";
    if(t.includes("maintenance")) return "maintenance";
    if(t.includes("private")) return "private";
    if(t.includes("hold")) return "hold";
    return "blocked";
  }
  function availabilityShort(type){
    const t=norm(type);
    if(t.includes("owner")) return "O";
    if(t.includes("maintenance")) return "M";
    if(t.includes("private")) return "P";
    if(t.includes("hold")) return "H";
    return "X";
  }
  function getBookedDatesForProperty(propertyName, bookings){
  const disabled = [];

  bookings.forEach(b=>{
    const sameProperty =
      String(b.itemName || "").trim().toLowerCase() ===
      String(propertyName || "").trim().toLowerCase();

    const bookedStatus =
      String(b.status || "Booked").toLowerCase() === "booked";

    if(!sameProperty || !bookedStatus) return;

    const from = String(b.dateFrom || "").slice(0,10);
    const to = String(b.dateTo || "").slice(0,10);

    dateRange(from, to).forEach(d=>{
      disabled.push(d);
    });
  });

  return disabled;
}

function initV18BlockDatePickers(bookings){
  const propertyInput = document.getElementById("v18BlockProperty");
  const fromInput = document.getElementById("v18BlockFrom");
  const toInput = document.getElementById("v18BlockTo");

  if(!propertyInput || !fromInput || !toInput || typeof flatpickr === "undefined") return;

  let disabledDates = [];

  const refreshDisabledDates = () => {
    disabledDates = getBookedDatesForProperty(propertyInput.value, bookings);

    if(fromPicker){
      fromPicker.set("disable", disabledDates);
      fromPicker.redraw();
    }

    if(toPicker){
      toPicker.set("disable", disabledDates);
      toPicker.redraw();
    }
  };

  const fromPicker = flatpickr(fromInput, {
    dateFormat: "Y-m-d",
    disable: disabledDates,
    onChange: function(selectedDates, dateStr){
      if(toPicker){
        toPicker.set("minDate", dateStr);
      }
    },
    onDayCreate: function(dObj, dStr, fp, dayElem){
      const date = dayElem.dateObj.toISOString().slice(0,10);
      if(disabledDates.includes(date)){
        dayElem.classList.add("cey-booked-date");
        dayElem.title = "Not Available";
      }
    }
  });

  const toPicker = flatpickr(toInput, {
    dateFormat: "Y-m-d",
    disable: disabledDates,
    onDayCreate: function(dObj, dStr, fp, dayElem){
      const date = dayElem.dateObj.toISOString().slice(0,10);
      if(disabledDates.includes(date)){
        dayElem.classList.add("cey-booked-date");
        dayElem.title = "Not Available";
      }
    }
  });

  propertyInput.addEventListener("change", refreshDisabledDates);
  propertyInput.addEventListener("input", refreshDisabledDates);

  refreshDisabledDates();
}
  async function renderAvailabilityManager(){
    const box=document.getElementById("availabilityTab");
    if(!box) return;
    box.innerHTML=`<div class="v19-page-head"><div><h2>Availability Manager</h2><p>Loading property calendar and blocks...</p></div></div>`;
    try{
      const [bookingsRaw, propertiesRaw] = await Promise.all([
        fetchJson("/api/admin/bookings").catch(()=>[]),
        fetchJson("/api/admin/properties").catch(()=>[])
      ]);
      const bookings=safeArray(bookingsRaw);
      const properties=safeArray(propertiesRaw);
      const blocks=availabilityBlocks();
      const selectedType=document.getElementById("v18AvailType")?.value || "all";
      const daysCount=Number(document.getElementById("v18AvailDays")?.value || 30);
      const start=document.getElementById("v18AvailStart")?.value || addDays(0);
      const props=activePropertiesByType(properties, selectedType);
      const dates=[];
      const startDate=new Date(start+"T00:00:00");
      for(let i=0;i<daysCount;i++){const d=new Date(startDate); d.setDate(startDate.getDate()+i); dates.push(toISO(d));}

      let bookedCount=0, ownerCount=0, maintenanceCount=0, privateCount=0, holdCount=0, freeCount=0;
      const matrixRows=props.map(p=>{
        const cells=dates.map(d=>{
          const b=bookings.find(x=>bookingCovers(x,p.name,d));
          if(b){
            bookedCount++;
            return `<td class="v19-cell booked" title="${escapeHtml(b.reference||'Booking')} - ${escapeHtml(b.guestName||'')}"><button type="button" onclick="openBookingDetails && openBookingDetails('${escapeHtml(b.id||'')}')">B</button></td>`;
          }
          const bl=blocks.find(x=>blockCovers(x,p.name,d));
          if(bl){
            const cls=availabilityTypeClass(bl.type); const sh=availabilityShort(bl.type);
            if(cls==='owner') ownerCount++; else if(cls==='maintenance') maintenanceCount++; else if(cls==='private') privateCount++; else if(cls==='hold') holdCount++;
            return `<td class="v19-cell ${cls}" title="${escapeHtml(bl.type||'Blocked')} - ${escapeHtml(bl.reason||'')}"><button type="button" onclick="v18DeleteBlock('${escapeHtml(bl.id)}')">${sh}</button></td>`;
          }
          freeCount++;
          return `<td class="v19-cell free"><span>A</span></td>`;
        }).join("");
        return `<tr><td class="v19-property"><strong>${escapeHtml(p.name||'-')}</strong><small>${escapeHtml(p.type||'')}</small></td>${cells}</tr>`;
      }).join("");

      const propOptions=props.map(p=>`<option value="${escapeHtml(p.name||'')}">${escapeHtml(p.name||'')} (${escapeHtml(p.type||'')})</option>`).join("");
      const blockRows=blocks.length ? blocks.slice().reverse().map(bl=>`<tr><td><strong>${escapeHtml(bl.propertyName)}</strong></td><td><span class="v19-chip ${availabilityTypeClass(bl.type)}">${escapeHtml(bl.type)}</span></td><td>${escapeHtml(bl.dateFrom)} → ${escapeHtml(bl.dateTo)}</td><td>${escapeHtml(bl.reason||'-')}</td><td><button class="delete-btn mini-btn" onclick="v18DeleteBlock('${escapeHtml(bl.id)}')">Delete</button></td></tr>`).join("") : `<tr><td colspan="5" class="empty-row">No owner / maintenance / private blocks saved yet.</td></tr>`;

      box.innerHTML=`
        <div class="v19-page-head">
          <div>
            <h2>Availability Manager</h2>
            <p>Booking calendar, matrix, owner stay, maintenance, private and hold blocks.</p>
          </div>
          <div class="v19-head-actions">
            <input id="v18AvailStart" type="date" value="${escapeHtml(start)}">
            <select id="v18AvailType"><option value="all">All Types</option><option value="villa">Villas</option><option value="apartment">Apartments</option><option value="homestay">Homestays</option></select>
            <select id="v18AvailDays"><option value="14">14 Days</option><option value="30">30 Days</option><option value="45">45 Days</option><option value="60">60 Days</option></select>
            <button class="v14-refresh" type="button" onclick="v18RenderAvailability()">Refresh</button>
          </div>
        </div>

        <div class="v19-availability-shell">
          <div class="v19-stat-strip">
            ${stat("Available",freeCount,"Open nights")}
            ${stat("Booked",bookedCount,"Confirmed bookings")}
            ${stat("Owner Stay",ownerCount,"Owner blocks")}
            ${stat("Maintenance",maintenanceCount,"Repair / cleaning")}
            ${stat("Private / Hold",privateCount+holdCount,"Private and holds")}
          </div>

          <div class="v19-grid-two">
            <section class="v19-card v19-block-card">
              <div class="v19-card-head"><div><h3>Quick Block</h3><p>Block selected dates for owner, maintenance, private or hold.</p></div></div>
              <form id="v18BlockForm" class="v19-block-form">
                <label><span>Property</span><select id="v18BlockProperty" required><option value="">Select Property</option>${propOptions}</select></label>
                <label><span>Type</span><select id="v18BlockType" required><option value="Owner Stay">Owner Stay</option><option value="Maintenance">Maintenance</option><option value="Private">Private</option><option value="Hold">Hold</option></select></label>
                <label><span>From</span><input id="v18BlockFrom" type="date" required></label>
                <label><span>To</span><input id="v18BlockTo" type="date" required></label>
                <label class="wide"><span>Reason / note</span><input id="v18BlockReason" placeholder="Example: Owner family stay / painting / repair"></label>
                <button type="submit">Save Block</button>
              </form>
            </section>

            <section class="v19-card v19-legend-card">
              <div class="v19-card-head"><div><h3>Legend</h3><p>Matrix color codes.</p></div></div>
              <div class="v19-legend-list">
                <span class="free">A <b>Available</b></span>
                <span class="booked">B <b>Booked</b></span>
                <span class="owner">O <b>Owner stay</b></span>
                <span class="maintenance">M <b>Maintenance</b></span>
                <span class="private">P <b>Private</b></span>
                <span class="hold">H <b>Hold</b></span>
              </div>
            </section>
          </div>

          <section class="v19-card v19-matrix-card">
            <div class="v19-card-head">
              <div><h3>Availability Matrix</h3><p>Click B to open booking details. Click O/M/P/H to delete the block.</p></div>
            </div>
            <div class="v19-matrix-scroll"><table class="v19-matrix"><thead><tr><th class="v19-property-head">Property</th>${dates.map(d=>`<th><strong>${fmtDate(d).replace(' 2026','')}</strong></th>`).join("")}</tr></thead><tbody>${matrixRows || `<tr><td colspan="${dates.length+1}" class="empty-row">No active properties found.</td></tr>`}</tbody></table></div>
          </section>

          <section class="v19-card">
            <div class="v19-card-head"><div><h3>Saved Blocks</h3><p>Owner, maintenance, private and hold blocks saved in this admin.</p></div></div>
            <div class="table-wrap"><table class="admin-table"><thead><tr><th>Property</th><th>Type</th><th>Dates</th><th>Reason</th><th>Action</th></tr></thead><tbody>${blockRows}</tbody></table></div>
          </section>
        </div>`;
      
      document.getElementById("v18AvailType").value=selectedType;
      document.getElementById("v18AvailDays").value=String(daysCount);
      setTimeout(()=>initV18BlockDatePickers(bookings), 100);
      document.getElementById("v18BlockForm")?.addEventListener("submit", (e)=>{
        e.preventDefault();
        const propertyName=document.getElementById("v18BlockProperty").value;
        const type=document.getElementById("v18BlockType").value;
        const dateFrom=document.getElementById("v18BlockFrom").value;
        const dateTo=document.getElementById("v18BlockTo").value;
        const reason=document.getElementById("v18BlockReason").value.trim();
        const dates=dateRange(dateFrom,dateTo);
        if(!propertyName||!type||!dates.length) return alert("Please select property and valid date range. Check-out/end date must be after start date.");
        const conflictBooking=bookings.find(b=>String(b.itemName||"").trim().toLowerCase()===String(propertyName).trim().toLowerCase() && dates.some(d=>bookingCovers(b,propertyName,d)));
       if(conflictBooking){
  alert("This property is already booked in the selected date range.");
  return;
}
        const rows=availabilityBlocks();
        rows.push({id:"BLK-"+Date.now()+"-"+Math.floor(Math.random()*10000), propertyName,type,dateFrom,dateTo,reason,dates,createdAt:new Date().toISOString()});
        saveAvailabilityBlocks(rows);
        alert("Availability block saved.");
        renderAvailabilityManager();
      });
    }catch(err){
      box.innerHTML=`<div class="v19-page-head"><div><h2>Availability Manager</h2><p>${escapeHtml(err.message)}</p></div><button class="v14-refresh" onclick="v18RenderAvailability()">Retry</button></div>`;
    }
  }
  window.v18RenderAvailability = renderAvailabilityManager;
  window.v18DeleteBlock = function(id){
    if(!confirm("Delete this availability block?")) return;
    saveAvailabilityBlocks(availabilityBlocks().filter(x=>String(x.id)!==String(id)));
    renderAvailabilityManager();
  };

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
      <div class="v14-brand"><div class="v14-logo">CB</div><div><strong>CeyBreez</strong><small>V19 · Availability Pro</small></div></div>
      <nav class="v14-nav">
        <button data-v14-tab="dashboard">📊 Dashboard</button>
        <button data-v14-tab="inquiries">💬 Inquiry Management</button>
        <button data-v14-tab="bookings">📅 Booking Management</button>
        <button data-v14-tab="availability">🗓 Availability / Matrix</button>
        <button data-v14-tab="properties">🏡 Properties CMS</button>
        <button data-v14-tab="tours">🚌 Tours CMS</button>
        <button data-v14-tab="services">☕ Cafe & Services CMS</button>
        <button data-v14-tab="reviews">⭐ Reviews</button>
        <button data-v14-tab="finance">💰 Finance</button>
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

    // V19 availability is a real independent module section.
    if(!document.getElementById("availabilityTab")){
      const avail=document.createElement("section");
      avail.id="availabilityTab";
      avail.className="hidden";
      panel.appendChild(avail);
    }

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
      if(active==="dashboard") callDashboard();
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
      if(logical==="bookings" && typeof loadBookings==="function") loadBookings();
      if(logical==="availability") renderAvailabilityManager();
      if(logical==="properties" && typeof loadProperties==="function") loadProperties();
      if(logical==="tours" && typeof loadDestinations==="function") loadDestinations();
      if(logical==="services" && typeof loadServices==="function") loadServices();
      if(logical==="reviews" && typeof loadReviews==="function") loadReviews();
      if(logical==="finance" && typeof window.renderFinanceModule==="function")
    window.renderFinanceModule();
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

    if(logical==="dashboard") callDashboard();
    else refreshLegacy(logical);

    if(logical==="availability") renderAvailabilityManager();
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
