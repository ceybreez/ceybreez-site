/* =========================
   V6.1 HOTFIX OVERRIDES
========================= */

function classifyInquiryItem(item){
  const text = `${item.category || ""} ${item.serviceType || ""} ${item.itemName || ""} ${item.experiences || ""}`.toLowerCase();
  if (text.includes("tour")) return "tour";
  if (text.includes("cafe") || text.includes("service") || text.includes("restaurant") || text.includes("contact")) return "service";
  if (text.includes("villa") || text.includes("homestay") || text.includes("apartment") || text.includes("property")) return "property";
  return "property";
}

function classifyBookingItem(item){
  const text = `${item.category || ""} ${item.serviceType || ""} ${item.itemName || ""}`.toLowerCase();
  if (String(item.reference || "").startsWith("MAN-") || String(item.inquiryId || "").startsWith("MAN-")) return "manual";
  if (text.includes("tour")) return "tour";
  if (text.includes("villa") || text.includes("homestay") || text.includes("apartment") || text.includes("property")) return "property";
  return "property";
}

function datePlusOne(dateValue) {
  if (!dateValue) return "";
  const d = new Date(dateValue + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + 1);
  return toDateInputValue(d);
}

function safeBookingDateTo(inquiry) {
  const from = inquiry?.dateFrom || "";
  const to = inquiry?.dateTo || "";
  if (to && from && to > from) return to;
  if (classifyInquiryItem(inquiry) === "tour" && from) return datePlusOne(from);
  return to || from;
}

function renderDashboardCards(data) {
  const box = document.getElementById("inquiryCards");
  if (!box) return;

  const count = status => data.filter(x => normalizeStatus(x.status) === status.toLowerCase()).length;
  const propertyCount = data.filter(x => classifyInquiryItem(x) === "property").length;
  const tourCount = data.filter(x => classifyInquiryItem(x) === "tour").length;
  const serviceCount = data.filter(x => classifyInquiryItem(x) === "service").length;

  box.innerHTML = `
    <div class="dashboard-card"><h3>Total Inquiries</h3><div class="value">${data.length}</div></div>
    <div class="dashboard-card"><h3>Property Inquiries</h3><div class="value">${propertyCount}</div></div>
    <div class="dashboard-card"><h3>Tour Inquiries</h3><div class="value">${tourCount}</div></div>
    <div class="dashboard-card"><h3>Service / Contact</h3><div class="value">${serviceCount}</div></div>
    <div class="dashboard-card card-new"><h3>New</h3><div class="value">${count("New")}</div></div>
    <div class="dashboard-card card-booked"><h3>Booked</h3><div class="value">${count("Booked")}</div></div>
    <div class="dashboard-card card-closed"><h3>Cancelled / Closed</h3><div class="value">${count("Cancelled") + count("Closed")}</div></div>
  `;
}

function renderBookingStats(data) {
  const box = document.getElementById("bookingStats");
  if (!box) return;

  const count = status => data.filter(x => normalizeStatus(x.status) === status).length;
  const propertyCount = data.filter(x => classifyBookingItem(x) === "property").length;
  const tourCount = data.filter(x => classifyBookingItem(x) === "tour").length;
  const manualCount = data.filter(x => classifyBookingItem(x) === "manual").length;
  const today = toDateInputValue(new Date());
  const todayBookings = data.filter(x => normalizeStatus(x.status) === "booked" && bookingCoversDate(x, today)).length;

  box.innerHTML = `
    <div class="dashboard-card"><h3>Total Bookings</h3><div class="value">${data.length}</div></div>
    <div class="dashboard-card"><h3>Property Bookings</h3><div class="value">${propertyCount}</div></div>
    <div class="dashboard-card"><h3>Tour Bookings</h3><div class="value">${tourCount}</div></div>
    <div class="dashboard-card"><h3>Manual Bookings</h3><div class="value">${manualCount}</div></div>
    <div class="dashboard-card card-booked"><h3>Booked</h3><div class="value">${count("booked")}</div></div>
    <div class="dashboard-card"><h3>Today Active</h3><div class="value">${todayBookings}</div></div>
    <div class="dashboard-card card-closed"><h3>Cancelled</h3><div class="value">${count("cancelled")}</div></div>
  `;
}

async function saveV6Settings(){
  const payload = {
    setting_default_currency: document.getElementById("setting_default_currency")?.value || "USD",
    setting_checkin_time: document.getElementById("setting_checkin_time")?.value || "14:00",
    setting_checkout_time: document.getElementById("setting_checkout_time")?.value || "11:00",
    setting_admin_email: document.getElementById("setting_admin_email")?.value || "",
    setting_whatsapp: document.getElementById("setting_whatsapp")?.value || "",
    setting_quote_valid_days: document.getElementById("setting_quote_valid_days")?.value || "3",
    setting_booking_message: document.getElementById("setting_booking_message")?.value || ""
  };

  const res = await fetch(`${API_BASE}/api/admin/site-content`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

  const result = await res.json();
  if(!res.ok) return alert(result.error || "Settings save failed");
  alert("Settings saved");
}

async function loadV6Settings(){
  try{
    const res = await fetch(`${API_BASE}/api/admin/site-content`, { headers: authHeaders() });
    const data = await res.json();
    Object.entries(data || {}).forEach(([k,v]) => {
      const el = document.getElementById(k);
      if(el) el.value = v || "";
    });
  }catch(err){}
}


