const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";
const TOKEN_KEY = "CEYBREEZ_ADMIN_TOKEN";

let TOKEN = localStorage.getItem(TOKEN_KEY) || "";
let activeModule = "dashboard";
let cache = { inquiries: [], bookings: [], properties: [], tours: [], services: [], reviews: [] };
let bookingCalendarDate = new Date();

const moduleInfo = {
  dashboard: ["Dashboard", "Live operations overview"],
  inquiries: ["Inquiry CRM", "Manage guest inquiries, status, quote and booking flow"],
  bookings: ["Booking CRM", "Bookings, calendar and manual booking management"],
  availability: ["Availability", "Property availability summary from active bookings"],
  properties: ["Properties", "Villas, apartments and homestays CMS"],
  tours: ["Tours", "Tour destinations CMS"],
  services: ["Services", "Cafes and services CMS"],
  reviews: ["Reviews", "Guest reviews management"],
  reports: ["Reports", "Revenue, booking and inquiry performance"],
  settings: ["Settings", "Business settings and system preferences"]
};

document.addEventListener("DOMContentLoaded", () => {
  bindShell();
  TOKEN ? showApp() : showLogin();
});

function bindShell() {
  document.getElementById("loginBtn")?.addEventListener("click", loginAdmin);
  document.getElementById("adminToken")?.addEventListener("keydown", e => { if (e.key === "Enter") loginAdmin(); });
  document.getElementById("logoutBtn")?.addEventListener("click", logoutAdmin);
  document.getElementById("refreshBtn")?.addEventListener("click", () => loadModule(activeModule, true));
  document.getElementById("mobileMenuBtn")?.addEventListener("click", () => document.querySelector(".sidebar")?.classList.toggle("open"));
  document.querySelectorAll(".nav button").forEach(btn => btn.addEventListener("click", () => switchModule(btn.dataset.module)));
  document.getElementById("globalSearch")?.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const q = e.target.value.trim();
      if (!q) return;
      if (["dashboard", "reports", "settings"].includes(activeModule)) switchModule("inquiries");
      setTimeout(() => {
        const search = document.querySelector(`#${activeModule}Module input[data-search]`);
        if (search) { search.value = q; search.dispatchEvent(new Event("input")); }
      }, 50);
    }
  });
}

function loginAdmin() {
  const token = document.getElementById("adminToken")?.value.trim();
  if (!token) return setText("loginError", "Please enter admin token.");
  TOKEN = token;
  localStorage.setItem(TOKEN_KEY, TOKEN);
  showApp();
}

function logoutAdmin() { localStorage.removeItem(TOKEN_KEY); location.reload(); }
function showLogin(){ document.getElementById("loginView")?.classList.remove("hidden"); document.getElementById("appView")?.classList.add("hidden"); }
function showApp(){ document.getElementById("loginView")?.classList.add("hidden"); document.getElementById("appView")?.classList.remove("hidden"); switchModule("dashboard"); }

function switchModule(name) {
  activeModule = name;
  document.querySelectorAll(".module").forEach(x => x.classList.remove("active-module"));
  document.getElementById(`${name}Module`)?.classList.add("active-module");
  document.querySelectorAll(".nav button").forEach(x => x.classList.toggle("active", x.dataset.module === name));
  const info = moduleInfo[name] || ["CeyBreez", "Admin module"];
  setText("pageTitle", info[0]); setText("pageSubtitle", info[1]);
  document.querySelector(".sidebar")?.classList.remove("open");
  window.scrollTo(0,0);
  loadModule(name);
}

async function loadModule(name, force = false) {
  try {
    if (name === "dashboard") return renderDashboard(force);
    if (name === "inquiries") return renderInquiries(force);
    if (name === "bookings") return renderBookings(force);
    if (name === "availability") return renderAvailability(force);
    if (name === "properties") return renderProperties(force);
    if (name === "tours") return renderTours(force);
    if (name === "services") return renderServices(force);
    if (name === "reviews") return renderReviews(force);
    if (name === "reports") return renderReports(force);
    if (name === "settings") return renderSettings();
  } catch (e) { toast(e.message || "Load failed", "error"); }
}

function authHeaders(json = true) { return json ? { "Content-Type":"application/json", "Authorization":`Bearer ${TOKEN}` } : { "Authorization":`Bearer ${TOKEN}` }; }
async function apiGet(path) { const r = await fetch(`${API_BASE}${path}`, { headers: authHeaders() }); const d = await r.json().catch(()=>null); if(!r.ok) throw new Error(d?.error || `Failed ${path}`); return d || []; }
async function apiSend(path, method, body) { const r = await fetch(`${API_BASE}${path}`, { method, headers: authHeaders(), body: body ? JSON.stringify(body) : undefined }); const d = await r.json().catch(()=>null); if(!r.ok) throw new Error(d?.error || `Failed ${path}`); return d || {}; }
async function getData(key, path, force = false){ if(force || !cache[key]?.length) cache[key] = await apiGet(path); return cache[key]; }
function setText(id, value){ const el = document.getElementById(id); if(el) el.textContent = value; }
function esc(v){ return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function norm(v){ return String(v || "").toLowerCase(); }
function fmt(v){ if(!v) return "-"; const d = new Date(String(v).slice(0,10)+"T00:00:00"); return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}); }
function iso(d){ return d.toISOString().slice(0,10); }
function addDays(n){ const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+n); return iso(d); }
function statusClass(s){ return `status-${norm(s || "new").replace(/\s+/g,"-")}`; }
function categoryFrom(item){ const t = `${item?.category||""} ${item?.serviceType||""} ${item?.itemName||""} ${item?.type||""}`.toLowerCase(); if(t.includes("tour")||t.includes("trip")||t.includes("safari")) return "tour"; if(t.includes("service")||t.includes("cafe")||t.includes("restaurant")||t.includes("contact")) return "service"; return "property"; }
function isBooked(b){ return norm(b.status || "Booked") === "booked"; }
function bookingCovers(b, date){ const f=String(b.dateFrom||"").slice(0,10), t=String(b.dateTo||"").slice(0,10); return f && t && f <= date && date < t; }
function toast(msg, type="info"){ const area=document.getElementById("toastArea"); if(!area) return alert(msg); const div=document.createElement("div"); div.className=`toast ${type}`; div.textContent=msg; area.appendChild(div); setTimeout(()=>div.remove(),3200); }
function closeModal(){ document.getElementById("modalRoot").innerHTML = ""; }
function openModal(title, html){ document.getElementById("modalRoot").innerHTML = `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>${esc(title)}</h3><button class="close-btn" onclick="closeModal()">×</button></div>${html}</div></div>`; }
window.closeModal = closeModal;

async function loadCore(force=false){
  await Promise.all([
    getData("inquiries","/api/admin/inquiries",force).catch(()=>[]),
    getData("bookings","/api/admin/bookings",force).catch(()=>[]),
    getData("properties","/api/admin/properties",force).catch(()=>[]),
    getData("tours","/api/admin/destinations",force).catch(()=>[]),
    getData("services","/api/admin/services",force).catch(()=>[])
  ]);
}

async function renderDashboard(force=false){
  const box = document.getElementById("dashboardModule");
  box.innerHTML = head("Dashboard", "Yesterday, today and tomorrow operations summary.", `<button class="primary-btn" onclick="renderDashboard(true)">Refresh Dashboard</button>`);
  await loadCore(force);
  const bookings = cache.bookings.filter(isBooked), inq = cache.inquiries;
  const y=addDays(-1), t=addDays(0), tm=addDays(1);
  const checkIn = d => bookings.filter(b => String(b.dateFrom||"").slice(0,10) === d);
  const checkOut = d => bookings.filter(b => String(b.dateTo||"").slice(0,10) === d);
  const inHouse = bookings.filter(b => bookingCovers(b,t));
  box.innerHTML += `
    <div class="stats-grid">
      ${stat("New Inquiries", inq.filter(i=>["new","contacted","quoted"].includes(norm(i.status||"New"))).length, "Need follow-up")}
      ${stat("Active Bookings", bookings.length, "Current booked records")}
      ${stat("Today Check-in", checkIn(t).length, fmt(t))}
      ${stat("Today Check-out", checkOut(t).length, fmt(t))}
      ${stat("In-house Today", inHouse.length, "Staying tonight")}
      ${stat("Tomorrow Check-in", checkIn(tm).length, fmt(tm))}
      ${stat("Properties", cache.properties.length, "CMS records")}
      ${stat("Tour Locations", cache.tours.length, "CMS records")}
    </div>
    <div class="ops-grid">
      ${opsPanel("Yesterday", y, checkIn(y), checkOut(y), [])}
      ${opsPanel("Today", t, checkIn(t), checkOut(t), inHouse)}
      ${opsPanel("Tomorrow", tm, checkIn(tm), checkOut(tm), [])}
    </div>
    <div class="grid-2">
      <div class="panel"><h3>Recent Inquiries</h3>${smallList([...inq].sort(sortCreated).slice(0,8), "Inquiry")}</div>
      <div class="panel"><h3>Recent Bookings</h3>${smallList([...cache.bookings].sort(sortCreated).slice(0,8), "Booking")}</div>
    </div>`;
}
function head(title, sub, action=""){ return `<div class="section-head"><div><h2>${esc(title)}</h2><p>${esc(sub)}</p></div><div>${action}</div></div>`; }
function stat(label,value,small=""){ return `<div class="stat-card"><span>${esc(label)}</span><strong>${value}</strong><small>${esc(small)}</small></div>`; }
function sortCreated(a,b){ return String(b.createdAt||b.created_at||b.dateFrom||"").localeCompare(String(a.createdAt||a.created_at||a.dateFrom||"")); }
function smallList(items, label="Open"){ if(!items.length) return `<div class="empty-row">No records</div>`; return `<div class="list-small">${items.map(x=>`<div class="list-item"><div><strong>${esc(x.guestName||x.reference||x.name||"Guest")}</strong><small>${esc(x.itemName||x.serviceType||x.location||"-")}</small><small>${esc(x.dateFrom||x.createdAt||x.created_at||"")}</small></div><span class="pill">${esc(x.status||label)}</span></div>`).join("")}</div>`; }
function opsPanel(title, date, ins, outs, inhouse){ return `<div class="panel"><h3>${title} <small>${fmt(date)}</small></h3><div class="mini-stats"><div><span>Check-ins</span><b>${ins.length}</b></div><div><span>Check-outs</span><b>${outs.length}</b></div><div><span>In-house</span><b>${inhouse.length}</b></div></div>${smallList([...ins,...outs,...inhouse].slice(0,8), title)}</div>`; }

async function renderInquiries(force=false){
  const box=document.getElementById("inquiriesModule");
  await getData("inquiries","/api/admin/inquiries",force);
  const data=cache.inquiries;
  box.innerHTML=head("Inquiry CRM", "Property, tour and service inquiries in one clean table.", `<button class="primary-btn" onclick="exportInquiriesCSV()">Export CSV</button>`) + `
    <div class="filterbar"><input data-search id="inqSearch" placeholder="Search reference, guest, email, mobile..."/><select id="inqStatus"><option value="all">All Status</option><option>New</option><option>Contacted</option><option>Quoted</option><option>Booked</option><option>Cancelled</option><option>Closed</option></select><select id="inqType"><option value="all">All Types</option><option value="property">Property</option><option value="tour">Tour</option><option value="service">Service</option></select><button class="secondary-btn" onclick="renderInquiries(true)">Refresh</button></div>
    <div id="inqStats" class="stats-grid"></div><div id="inqTable"></div>`;
  const apply=()=>renderInquiryTable(data);
  document.getElementById("inqSearch").addEventListener("input",apply); document.getElementById("inqStatus").addEventListener("change",apply); document.getElementById("inqType").addEventListener("change",apply); apply();
}
function renderInquiryTable(data){
  const s=(document.getElementById("inqSearch")?.value||"").toLowerCase(), st=(document.getElementById("inqStatus")?.value||"all").toLowerCase(), ty=(document.getElementById("inqType")?.value||"all");
  const filtered=data.filter(x=>{ const text=`${x.reference||""} ${x.guestName||""} ${x.guestEmail||""} ${x.guestMobile||""} ${x.itemName||""} ${x.serviceType||""}`.toLowerCase(); return (!s||text.includes(s)) && (st==="all"||norm(x.status||"New")===st) && (ty==="all"||categoryFrom(x)===ty); });
  document.getElementById("inqStats").innerHTML = ["Total","New","Quoted","Booked"].map(k=> stat(k, k==="Total"?filtered.length:filtered.filter(x=>norm(x.status)===k.toLowerCase()).length, "Inquiries")).join("");
  document.getElementById("inqTable").innerHTML = `<div class="table-wrap"><table class="admin-table"><thead><tr><th>Reference</th><th>Created</th><th>Type</th><th>Item</th><th>Guest</th><th>Dates</th><th>Status</th><th>Action</th></tr></thead><tbody>${filtered.length?filtered.map(x=>`<tr><td>${esc(x.reference||x.id)}</td><td>${fmt(x.createdAt||x.created_at)}</td><td>${esc(x.serviceType||categoryFrom(x))}</td><td>${esc(x.itemName||"-")}</td><td><strong>${esc(x.guestName||"-")}</strong><br><small>${esc(x.guestEmail||"")}</small><br><small>${esc(x.guestMobile||"")}</small></td><td>${esc(x.dateFrom||"-")} → ${esc(x.dateTo||"-")}</td><td><span class="status-badge ${statusClass(x.status)}">${esc(x.status||"New")}</span></td><td><button class="mini-btn" onclick="openInquiry('${esc(x.id)}')">Manage</button></td></tr>`).join(""):`<tr><td colspan="8" class="empty-row">No inquiries found</td></tr>`}</tbody></table></div>`;
}
window.openInquiry=function(id){ const x=cache.inquiries.find(i=>String(i.id)===String(id)); if(!x)return; openModal(`Inquiry ${x.reference||id}`, `<div class="detail-grid">${detail("Reference",x.reference||id)}${detail("Service",x.serviceType)}${detail("Item",x.itemName)}${detail("Guest",x.guestName)}${detail("Email",x.guestEmail)}${detail("Mobile",x.guestMobile)}${detail("Country",x.guestCountry)}${detail("Guests",x.guests)}${detail("Date From",x.dateFrom)}${detail("Date To",x.dateTo)}${detail("Status",x.status||"New")}</div><div class="panel" style="margin-top:14px"><h3>Message</h3><p>${esc(x.message||"-")}</p></div><div class="action-row"><select id="modalStatus"><option>New</option><option>Contacted</option><option>Quoted</option><option>Booked</option><option>Cancelled</option><option>Closed</option></select><button class="primary-btn" onclick="updateInquiry('${esc(x.id)}')">Update Status</button><button class="secondary-btn" onclick="confirmBookingFromInquiry('${esc(x.id)}')">Confirm Booking</button><button class="danger-btn" onclick="deleteInquiry('${esc(x.id)}')">Delete</button></div>`); const sel=document.getElementById("modalStatus"); if(sel) sel.value=x.status||"New"; };
function detail(k,v){return `<p><b>${esc(k)}:</b><br>${esc(v||"-")}</p>`}
window.updateInquiry=async function(id){ const status=document.getElementById("modalStatus")?.value||"New"; await apiSend(`/api/admin/inquiries/${id}/status`,"PUT",{status,sendEmail:false}); toast("Inquiry updated","success"); closeModal(); await renderInquiries(true); };
window.confirmBookingFromInquiry=async function(id){ const x=cache.inquiries.find(i=>String(i.id)===String(id)); if(!x)return; if(!confirm("Confirm this inquiry as booking?"))return; await apiSend("/api/admin/bookings","POST",{inquiryId:x.id,reference:x.reference,itemName:x.itemName||x.serviceType,serviceType:x.serviceType,guestName:x.guestName,guestEmail:x.guestEmail,guestMobile:x.guestMobile,dateFrom:x.dateFrom,dateTo:x.dateTo||x.dateFrom,guests:x.guests,sendEmail:false}); toast("Booking confirmed","success"); closeModal(); await loadModule("inquiries",true); };
window.deleteInquiry=async function(id){ if(!confirm("Delete this inquiry?"))return; await apiSend(`/api/admin/inquiries/${id}`,"DELETE"); toast("Inquiry deleted","success"); closeModal(); await renderInquiries(true); };
window.exportInquiriesCSV=function(){ const rows=cache.inquiries.map(x=>({Reference:x.reference||"",Status:x.status||"",Service:x.serviceType||"",Item:x.itemName||"",Guest:x.guestName||"",Email:x.guestEmail||"",Mobile:x.guestMobile||"",DateFrom:x.dateFrom||"",DateTo:x.dateTo||""})); downloadCSV(rows,"ceybreez-inquiries.csv"); };

async function renderBookings(force=false){
  const box=document.getElementById("bookingsModule"); await getData("bookings","/api/admin/bookings",force);
  box.innerHTML=head("Booking CRM", "Confirmed bookings, manual bookings and monthly calendar.", `<button class="primary-btn" onclick="openManualBooking()">+ Manual Booking</button>`) + `<div class="stats-grid" id="bookingStats"></div><div class="filterbar"><input data-search id="bookingSearch" placeholder="Search booking, guest, property..."/><select id="bookingStatus"><option value="all">All Status</option><option>Booked</option><option>Cancelled</option><option>Closed</option></select><select id="bookingType"><option value="all">All Types</option><option value="property">Property</option><option value="tour">Tour</option><option value="manual">Manual</option></select><button class="secondary-btn" onclick="renderBookings(true)">Refresh</button></div><div id="bookingTable"></div><div class="section-head" style="margin-top:16px"><div><h2 id="calendarTitle">Calendar</h2><p>Monthly booking overview</p></div><div><button class="secondary-btn" onclick="changeMonth(-1)">‹</button><button class="secondary-btn" onclick="changeMonth(1)">›</button></div></div><div id="bookingCalendar" class="calendar-grid"></div>`;
  const apply=()=>renderBookingContent(cache.bookings); ["bookingSearch","bookingStatus","bookingType"].forEach(id=>document.getElementById(id)?.addEventListener(id==="bookingSearch"?"input":"change",apply)); apply();
}
function renderBookingContent(data){ const s=(document.getElementById("bookingSearch")?.value||"").toLowerCase(), st=(document.getElementById("bookingStatus")?.value||"all").toLowerCase(), ty=(document.getElementById("bookingType")?.value||"all"); const filtered=data.filter(x=>{const text=`${x.reference||""} ${x.guestName||""} ${x.guestEmail||""} ${x.guestMobile||""} ${x.itemName||""} ${x.serviceType||""}`.toLowerCase(); const type = String(x.reference||"").startsWith("MAN-")||norm(x.serviceType).includes("manual")?"manual":categoryFrom(x); return (!s||text.includes(s))&&(st==="all"||norm(x.status||"Booked")===st)&&(ty==="all"||type===ty);}); document.getElementById("bookingStats").innerHTML=[stat("Total Bookings",filtered.length,"Records"),stat("Booked",filtered.filter(isBooked).length,"Active"),stat("Property",filtered.filter(x=>categoryFrom(x)==="property").length,"Bookings"),stat("Tour",filtered.filter(x=>categoryFrom(x)==="tour").length,"Bookings")].join(""); document.getElementById("bookingTable").innerHTML=`<div class="table-wrap"><table class="admin-table"><thead><tr><th>Reference</th><th>Created</th><th>Type</th><th>Item</th><th>Guest</th><th>Dates</th><th>Status</th><th>Action</th></tr></thead><tbody>${filtered.length?filtered.map(x=>`<tr><td>${esc(x.reference||x.id)}</td><td>${fmt(x.createdAt||x.created_at)}</td><td>${esc(x.serviceType||categoryFrom(x))}</td><td>${esc(x.itemName||"-")}</td><td><strong>${esc(x.guestName||"-")}</strong><br><small>${esc(x.guestEmail||"")}</small><br><small>${esc(x.guestMobile||"")}</small></td><td>${esc(x.dateFrom||"-")} → ${esc(x.dateTo||"-")}</td><td><span class="status-badge ${statusClass(x.status||"Booked")}">${esc(x.status||"Booked")}</span></td><td><button class="mini-btn" onclick="openBooking('${esc(x.id)}')">View</button></td></tr>`).join(""):`<tr><td colspan="8" class="empty-row">No bookings found</td></tr>`}</tbody></table></div>`; renderBookingCalendar(filtered); }
function renderBookingCalendar(data){ const box=document.getElementById("bookingCalendar"), title=document.getElementById("calendarTitle"); if(!box)return; const year=bookingCalendarDate.getFullYear(), month=bookingCalendarDate.getMonth(), first=new Date(year,month,1), last=new Date(year,month+1,0), offset=first.getDay(); if(title) title.textContent=first.toLocaleDateString("en-GB",{month:"long",year:"numeric"}); let html=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>`<div class="calendar-head">${d}</div>`).join(""); for(let i=0;i<offset;i++)html+=`<div class="calendar-day empty"></div>`; const active=data.filter(isBooked); for(let day=1;day<=last.getDate();day++){ const d=iso(new Date(year,month,day)); const dayBookings=active.filter(b=>bookingCovers(b,d)||String(b.dateFrom||"").slice(0,10)===d); html+=`<div class="calendar-day"><strong>${day}</strong>${dayBookings.slice(0,3).map(b=>`<div class="calendar-booking" onclick="openBooking('${esc(b.id)}')">${esc(b.itemName||b.reference||"Booking")}</div>`).join("")}</div>`;} box.innerHTML=html; }
window.changeMonth=function(n){ bookingCalendarDate.setMonth(bookingCalendarDate.getMonth()+n); renderBookingContent(cache.bookings); };
window.openBooking=function(id){ const b=cache.bookings.find(x=>String(x.id)===String(id)); if(!b)return; openModal(`Booking ${b.reference||id}`, `<div class="detail-grid">${detail("Reference",b.reference||id)}${detail("Type",b.serviceType)}${detail("Item",b.itemName)}${detail("Guest",b.guestName)}${detail("Email",b.guestEmail)}${detail("Mobile",b.guestMobile)}${detail("Check-in",b.dateFrom)}${detail("Check-out",b.dateTo)}${detail("Guests",b.guests)}${detail("Status",b.status||"Booked")}${detail("Payment",b.paymentStatus||"-")}${detail("Amount",`${b.currency||""} ${b.totalAmount||""}`)}</div><div class="action-row"><button class="secondary-btn" onclick="openRelatedInquiry('${esc(b.inquiryId||b.reference||"")}')">Open Related Inquiry</button><button class="danger-btn" onclick="cancelBooking('${esc(b.id)}')">Cancel Booking</button></div>`); };
window.openRelatedInquiry=async function(ref){ await getData("inquiries","/api/admin/inquiries",true); const i=cache.inquiries.find(x=>String(x.id)===String(ref)||String(x.reference)===String(ref)); if(!i)return toast("Related inquiry not found","error"); closeModal(); switchModule("inquiries"); setTimeout(()=>openInquiry(i.id),200); };
window.cancelBooking=async function(id){ if(!confirm("Cancel this booking?"))return; await apiSend(`/api/admin/bookings/${id}/status`,"PUT",{status:"Cancelled",sendEmail:false}); toast("Booking cancelled","success"); closeModal(); await renderBookings(true); };
window.openManualBooking=async function(){ await getData("properties","/api/admin/properties"); const options=cache.properties.map(p=>`<option value="${esc(p.name)}">${esc(p.name)} (${esc(p.type||"")})</option>`).join(""); openModal("Manual Booking", `<form id="manualForm" class="form-grid"><select name="itemName" required><option value="">Select property</option>${options}</select><input name="guestName" placeholder="Guest name" required/><input name="guestMobile" placeholder="Mobile"/><input name="guestEmail" placeholder="Email"/><input name="dateFrom" type="date" required/><input name="dateTo" type="date" required/><input name="guests" placeholder="Guests"/><textarea name="adminMessage" placeholder="Internal note"></textarea><button class="primary-btn" type="submit">Save Manual Booking</button></form>`); document.getElementById("manualForm").addEventListener("submit", async e=>{e.preventDefault(); const f=Object.fromEntries(new FormData(e.target)); const ref=`MAN-${Date.now()}`; await apiSend("/api/admin/bookings","POST",{inquiryId:ref,reference:ref,serviceType:"Manual Booking",...f,sendEmail:false}); toast("Manual booking saved","success"); closeModal(); await renderBookings(true);}); };

async function renderAvailability(force=false){ await Promise.all([getData("bookings","/api/admin/bookings",force),getData("properties","/api/admin/properties",force)]); const box=document.getElementById("availabilityModule"); const days=Array.from({length:30},(_,i)=>addDays(i)); box.innerHTML=head("Availability", "30-day property availability matrix from active bookings.", `<button class="secondary-btn" onclick="renderAvailability(true)">Refresh</button>`) + `<div class="table-wrap"><table class="admin-table"><thead><tr><th>Property</th>${days.map(d=>`<th>${fmt(d).slice(0,6)}</th>`).join("")}</tr></thead><tbody>${cache.properties.map(p=>`<tr><td><strong>${esc(p.name)}</strong><br><small>${esc(p.type||"")}</small></td>${days.map(d=>{const b=cache.bookings.find(x=>isBooked(x)&&String(x.itemName||"").trim().toLowerCase()===String(p.name||"").trim().toLowerCase()&&bookingCovers(x,d)); return b?`<td><span class="status-badge status-cancelled" onclick="openBooking('${esc(b.id)}')">B</span></td>`:`<td><span class="status-badge status-active">A</span></td>`;}).join("")}</tr>`).join("")}</tbody></table></div>`; }

async function renderProperties(force=false){ await getData("properties","/api/admin/properties",force); renderCms("properties", "Properties", "Villas, apartments and homestays.", cache.properties, ["name","type","location","price","guests","active"], openPropertyForm); }
async function renderTours(force=false){ await getData("tours","/api/admin/destinations",force); renderCms("tours", "Tours", "Tour destination CMS.", cache.tours, ["name","province","area","bestFor","active"], openTourForm); }
async function renderServices(force=false){ await getData("services","/api/admin/services",force); renderCms("services", "Services", "Cafes and services CMS.", cache.services, ["name","category","location","phone","whatsapp","active"], openServiceForm); }
function renderCms(module,title,sub,data,cols,formFn){ const box=document.getElementById(`${module}Module`); box.innerHTML=head(title,sub,`<button class="primary-btn" id="addCmsBtn">+ Add New</button>`) + `<div class="filterbar"><input data-search id="${module}Search" placeholder="Search ${title.toLowerCase()}..."/><select id="${module}Status"><option value="all">All Status</option><option value="active">Active</option><option value="hidden">Hidden</option></select><span></span><button class="secondary-btn" onclick="loadModule('${module}',true)">Refresh</button></div><div id="${module}Table"></div>`; document.getElementById("addCmsBtn").onclick=()=>formFn(); const apply=()=>{ const s=(document.getElementById(`${module}Search`)?.value||"").toLowerCase(), st=document.getElementById(`${module}Status`)?.value||"all"; const f=data.filter(x=>{const text=cols.map(c=>x[c]||"").join(" ").toLowerCase(); const active=x.active!==false && x.active!==0; return (!s||text.includes(s)) && (st==="all"||(st==="active"&&active)||(st==="hidden"&&!active));}); document.getElementById(`${module}Table`).innerHTML=`<div class="table-wrap"><table class="admin-table"><thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join("")}<th>Action</th></tr></thead><tbody>${f.length?f.map(x=>`<tr>${cols.map(c=>`<td>${c==="active"?`<span class="status-badge ${x.active!==false&&x.active!==0?"status-active":"status-hidden"}">${x.active!==false&&x.active!==0?"Active":"Hidden"}</span>`:esc(x[c]||"-")}</td>`).join("")}<td><button class="mini-btn" onclick="editCms('${module}','${esc(x.id)}')">Edit</button></td></tr>`).join(""):`<tr><td class="empty-row" colspan="${cols.length+1}">No records found</td></tr>`}</tbody></table></div>`; }; document.getElementById(`${module}Search`).addEventListener("input",apply); document.getElementById(`${module}Status`).addEventListener("change",apply); apply(); }
window.editCms=function(module,id){ const map={properties:[cache.properties,openPropertyForm],tours:[cache.tours,openTourForm],services:[cache.services,openServiceForm]}; const [arr,fn]=map[module]; fn(arr.find(x=>String(x.id)===String(id))); };
function openPropertyForm(item={}){ openModal(item.id?"Edit Property":"Add Property", `<form id="cmsForm" class="form-grid"><input name="name" placeholder="Property name" value="${esc(item.name)}" required/><select name="type"><option value="villa">Villa</option><option value="homestay">Homestay</option><option value="apartment">Apartment</option></select><input name="location" placeholder="Location" value="${esc(item.location)}"/><input name="price" placeholder="Price" value="${esc(item.price)}"/><input name="guests" placeholder="Guests" value="${esc(item.guests)}"/><input name="bedrooms" placeholder="Bedrooms" value="${esc(item.bedrooms)}"/><input name="bathrooms" placeholder="Bathrooms" value="${esc(item.bathrooms)}"/><textarea name="description" placeholder="Description">${esc(item.description)}</textarea><button class="primary-btn" type="submit">Save Property</button></form>`); const type=document.querySelector('[name=type]'); if(type)type.value=item.type||"villa"; bindCmsForm("properties", item, async data=>{ const path=item.id?`/api/admin/properties/${item.id}`:"/api/admin/properties"; const method=item.id?"PUT":"POST"; await apiSend(path,method,{...item,...data,active:true}); }); }
function openTourForm(item={}){ openModal(item.id?"Edit Tour":"Add Tour", `<form id="cmsForm" class="form-grid"><input name="name" placeholder="Location name" value="${esc(item.name)}" required/><input name="province" placeholder="Province" value="${esc(item.province)}" required/><input name="area" placeholder="Nearest city / area" value="${esc(item.area)}" required/><input name="bestFor" placeholder="Best for" value="${esc(item.bestFor)}"/><input name="timeNeeded" placeholder="Time needed" value="${esc(item.timeNeeded)}"/><textarea name="description" placeholder="Description">${esc(item.description)}</textarea><button class="primary-btn" type="submit">Save Tour</button></form>`); bindCmsForm("tours", item, async data=>{ const path=item.id?`/api/admin/destinations/${item.id}`:"/api/admin/destinations"; const method=item.id?"PUT":"POST"; await apiSend(path,method,{...item,...data,active:true}); }); }
function openServiceForm(item={}){ openModal(item.id?"Edit Service":"Add Service", `<form id="cmsForm" class="form-grid"><input name="name" placeholder="Service name" value="${esc(item.name)}" required/><input name="category" placeholder="Category" value="${esc(item.category||"Cafe")}" required/><input name="location" placeholder="Location" value="${esc(item.location)}" required/><input name="nearestCity" placeholder="Nearest city" value="${esc(item.nearestCity||item.location||"")}" required/><input name="phone" placeholder="Phone" value="${esc(item.phone)}"/><input name="whatsapp" placeholder="WhatsApp" value="${esc(item.whatsapp)}"/><textarea name="fullDescription" placeholder="Description">${esc(item.fullDescription||item.description)}</textarea><button class="primary-btn" type="submit">Save Service</button></form>`); bindCmsForm("services", item, async data=>{ await apiSend("/api/admin/services","POST",{...item,...data,active:true}); }); }
function bindCmsForm(module,item,saveFn){ document.getElementById("cmsForm").addEventListener("submit", async e=>{ e.preventDefault(); const data=Object.fromEntries(new FormData(e.target)); await saveFn(data); toast("Saved","success"); closeModal(); cache[module]=[]; await loadModule(module,true); }); }

async function renderReviews(force=false){ const box=document.getElementById("reviewsModule"); try{ await getData("reviews","/api/admin/reviews",force);}catch(e){cache.reviews=[];} box.innerHTML=head("Reviews", "Guest reviews shown on the website.", `<button class="primary-btn" onclick="openReviewForm()">+ Add Review</button>`) + `<div class="stats-grid">${stat("Total Reviews",cache.reviews.length,"Records")}${stat("Published",cache.reviews.filter(x=>x.active).length,"Active")}${stat("Featured",cache.reviews.filter(x=>x.featured).length,"Home page")}${stat("Average Rating",cache.reviews.length?(cache.reviews.reduce((s,x)=>s+Number(x.rating||0),0)/cache.reviews.length).toFixed(1):"0.0","Stars")}</div><div class="table-wrap"><table class="admin-table"><thead><tr><th>Date</th><th>Guest</th><th>Item</th><th>Rating</th><th>Status</th></tr></thead><tbody>${cache.reviews.length?cache.reviews.map(r=>`<tr><td>${fmt(r.createdAt||r.created_at)}</td><td>${esc(r.guestName||"-")}</td><td>${esc(r.itemName||"-")}</td><td>${"★".repeat(Number(r.rating||0))}</td><td><span class="status-badge ${r.active?"status-active":"status-hidden"}">${r.active?"Published":"Hidden"}</span></td></tr>`).join(""):`<tr><td colspan="5" class="empty-row">No reviews found</td></tr>`}</tbody></table></div>`; }
window.openReviewForm=function(){ openModal("Add Review", `<form id="reviewForm" class="form-grid"><select name="type"><option value="property">Property</option><option value="tour">Tour</option><option value="service">Service</option></select><input name="itemName" placeholder="Property / Tour / Service" required/><input name="guestName" placeholder="Guest name" required/><input name="country" placeholder="Country"/><select name="rating"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select><input name="title" placeholder="Review title"/><textarea name="message" placeholder="Review message" required></textarea><button class="primary-btn" type="submit">Save Review</button></form>`); document.getElementById("reviewForm").addEventListener("submit",async e=>{e.preventDefault(); await apiSend("/api/admin/reviews","POST",{...Object.fromEntries(new FormData(e.target)),active:true,featured:false}); toast("Review saved","success"); closeModal(); await renderReviews(true);}); };

async function renderReports(force=false){ await loadCore(force); const box=document.getElementById("reportsModule"); const bookings=cache.bookings, inquiries=cache.inquiries; const booked=bookings.filter(isBooked); const map={}; booked.forEach(b=>{const k=b.itemName||"Unknown"; map[k]=(map[k]||0)+1;}); box.innerHTML=head("Reports", "Simple performance summary from inquiries and bookings.", `<button class="secondary-btn" onclick="exportReportCSV()">Export CSV</button>`) + `<div class="stats-grid">${stat("Total Inquiries",inquiries.length,"All time")}${stat("Total Bookings",bookings.length,"All time")}${stat("Active Bookings",booked.length,"Booked")}${stat("Cancelled",bookings.filter(b=>norm(b.status)==="cancelled").length,"Cancelled")}</div><div class="grid-2"><div class="panel"><h3>Property Performance</h3><div class="table-wrap"><table class="admin-table"><thead><tr><th>Item</th><th>Bookings</th></tr></thead><tbody>${Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join("")||`<tr><td colspan="2" class="empty-row">No booking data</td></tr>`}</tbody></table></div></div><div class="panel"><h3>Status Summary</h3><div class="table-wrap"><table class="admin-table"><thead><tr><th>Status</th><th>Inquiries</th><th>Bookings</th></tr></thead><tbody>${["new","contacted","quoted","booked","cancelled","closed"].map(s=>`<tr><td>${s}</td><td>${inquiries.filter(x=>norm(x.status)===s).length}</td><td>${bookings.filter(x=>norm(x.status)===s).length}</td></tr>`).join("")}</tbody></table></div></div></div>`; }
window.exportReportCSV=function(){ downloadCSV(cache.bookings.map(b=>({Reference:b.reference||"",Guest:b.guestName||"",Item:b.itemName||"",DateFrom:b.dateFrom||"",DateTo:b.dateTo||"",Status:b.status||""})),"ceybreez-booking-report.csv"); };
function downloadCSV(rows, filename){ if(!rows.length)return toast("No data to export","error"); const headers=Object.keys(rows[0]); const csv=[headers.join(","),...rows.map(r=>headers.map(h=>`"${String(r[h]||"").replaceAll('"','""')}"`).join(","))].join("\n"); const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download=filename; a.click(); }

function renderSettings(){ document.getElementById("settingsModule").innerHTML=head("Settings", "Local admin defaults. Worker settings remain unchanged.") + `<div class="settings-grid"><div class="settings-card"><h3>Business Settings</h3><label>Default Currency</label><select><option>USD</option><option>LKR</option><option>OMR</option></select><label>Check-in Time</label><input type="time" value="14:00"><label>Check-out Time</label><input type="time" value="11:00"><button class="primary-btn" onclick="toast('Saved locally','success')">Save Settings</button></div><div class="settings-card"><h3>System Notes</h3><p>This V13 build uses your existing V10 Worker API. No D1 migration and no Worker replacement required.</p><p>Live /admin/ remains untouched.</p></div></div>`; }
