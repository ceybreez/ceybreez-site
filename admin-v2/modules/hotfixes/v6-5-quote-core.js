/* =========================
   V6.5 GUEST CONFIRMATION + QUOTE SYSTEM
========================= */

function v65Bool(value){
  return value === 1 || value === true || String(value || "").toLowerCase() === "true" || String(value || "") === "1";
}

function v65Money(value){
  if(value === null || value === undefined || value === "") return "-";
  return String(value);
}

function v65GuestBadge(item){
  if(v65Bool(item.guestConfirmed)){
    return `<span class="status-badge status-booked">Guest Confirmed</span>`;
  }
  return `<span class="status-badge status-quoted">Guest Pending</span>`;
}

function v65AdminBadge(item){
  if(v65Bool(item.adminConfirmed) || normalizeStatus(item.status) === "booked"){
    return `<span class="status-badge status-booked">Admin Confirmed</span>`;
  }
  return `<span class="status-badge status-contacted">Admin Pending</span>`;
}

function v65PaymentBadge(item){
  const s = String(item.paymentStatus || "Pending");
  const cls = s.toLowerCase().includes("paid") ? "status-booked" : "status-contacted";
  return `<span class="status-badge ${cls}">${escapeHtml(s)}</span>`;
}

function v65QuotePayloadFromModal(){
  return {
    currency: document.getElementById("bookingConfirmCurrency")?.value || document.getElementById("quoteCurrency")?.value || "USD",
    unitRate: document.getElementById("bookingConfirmDayRate")?.value || document.getElementById("quoteUnitRate")?.value || "",
    discountPercent: document.getElementById("quoteDiscountPercent")?.value || document.getElementById("bookingConfirmDiscountPercent")?.value || "0",
    discountAmount: document.getElementById("quoteDiscountAmount")?.value || document.getElementById("bookingConfirmDiscountAmount")?.value || "0",
    totalAmount: document.getElementById("bookingConfirmTotalAmount")?.value || document.getElementById("quoteTotalAmount")?.value || "",
    validUntil: document.getElementById("quoteValidUntil")?.value || "",
    paymentStatus: document.getElementById("quotePaymentStatus")?.value || "Pending",
    advanceAmount: document.getElementById("quoteAdvanceAmount")?.value || "",
    balanceAmount: document.getElementById("quoteBalanceAmount")?.value || "",
    adminMessage: document.getElementById("bookingConfirmAdminMessage")?.value || document.getElementById("quoteAdminMessage")?.value || "",
    sendEmail: true
  };
}

async function sendQuoteToGuest(id){
  const inquiry = allInquiries.find(x => String(x.id) === String(id));
  if(!inquiry) return alert("Inquiry not found");

  if(!inquiry.guestEmail){
    if(!confirm("Guest email is empty. Save quote without sending email?")) return;
  }else{
    if(!confirm("Send quote / invoice email to guest with confirmation button?")) return;
  }

  const res = await fetch(`${API_BASE}/api/admin/inquiries/${id}/quote`, {
    method:"POST",
    headers: authHeaders(),
    body: JSON.stringify(v65QuotePayloadFromModal())
  });

  const result = await res.json();

  if(!res.ok){
    alert(result.error || "Quote send failed");
    return;
  }

  alert(inquiry.guestEmail ? "Quote sent to guest" : "Quote saved");
  await loadInquiries();

  const refreshed = allInquiries.find(x => String(x.id) === String(id));
  if(refreshed){
    currentInquiry = refreshed;
    openInquiryModal(id);
  }
}

async function markGuestConfirmedManually(id){
  if(!confirm("Mark this inquiry as Guest Confirmed manually?")) return;

  const res = await fetch(`${API_BASE}/api/admin/inquiries/${id}/guest-confirm`, {
    method:"POST",
    headers: authHeaders(),
    body: JSON.stringify({ manual:true })
  });

  const result = await res.json();

  if(!res.ok){
    alert(result.error || "Guest confirm failed");
    return;
  }

  alert("Guest confirmation marked");
  await loadInquiries();

  const refreshed = allInquiries.find(x => String(x.id) === String(id));
  if(refreshed){
    currentInquiry = refreshed;
    openInquiryModal(id);
  }
}

async function adminConfirmFinalBooking(id){
  const inquiry = allInquiries.find(x => String(x.id) === String(id)) || currentInquiry;
  if(!inquiry) return alert("Inquiry not found");

  if(!v65Bool(inquiry.guestConfirmed)){
    if(!confirm("Guest has not confirmed yet. Do you still want to admin-confirm and book?")) return;
  }else{
    if(!confirm("Admin confirm this booking now?")) return;
  }

  currentInquiry = inquiry;
  await confirmBooking(true);
}

function v65QuotePanelHtml(item){
  const isTour = classifyInquiryItem(item) === "tour";
  const defaultCurrency = item.quoteCurrency || item.currency || "USD";
  const defaultRate = item.quoteUnitRate || item.dayRate || "";
  const defaultDiscountPercent = item.quoteDiscountPercent || item.discountPercent || "0";
  const defaultDiscountAmount = item.quoteDiscountAmount || item.discountAmount || "0";
  const defaultTotal = item.quoteTotalAmount || item.totalAmount || "";
  const defaultValid = item.quoteValidUntil || "";
  const paymentStatus = item.paymentStatus || "Pending";

  return `
    <div class="modal-section booking-confirm-panel v65-quote-panel">
      <h4>${isTour ? "Tour Quote / Invoice" : "Property Quote / Invoice"}</h4>

      <div class="v65-confirm-row">
        ${v65GuestBadge(item)}
        ${v65AdminBadge(item)}
        ${v65PaymentBadge(item)}
      </div>

      <div class="booking-confirm-grid v65-quote-grid">
        <label>Currency
          <select id="bookingConfirmCurrency">
            ${["USD","LKR","EUR","OMR"].map(c => `<option value="${c}" ${defaultCurrency === c ? "selected" : ""}>${c}</option>`).join("")}
          </select>
        </label>

        <label>${isTour ? "Adult / Unit Rate" : "Night / Unit Rate"}
          <input id="bookingConfirmDayRate" type="number" step="0.01" value="${escapeHtml(defaultRate)}" oninput="v65RecalcQuote()" />
        </label>

        <label>${isTour ? "Qty / Guests" : "Nights"}
          <input id="bookingConfirmNights" type="number" step="1" value="${escapeHtml(item.totalDays || item.guests || calcBookingNights?.(item.dateFrom, item.dateTo) || 1)}" oninput="v65RecalcQuote()" />
        </label>

        <label>Discount %
          <input id="quoteDiscountPercent" type="number" step="0.01" value="${escapeHtml(defaultDiscountPercent)}" oninput="v65RecalcQuote()" />
        </label>

        <label>Discount Amount
          <input id="quoteDiscountAmount" type="number" step="0.01" value="${escapeHtml(defaultDiscountAmount)}" oninput="v65RecalcQuote()" />
        </label>

        <label>Total Amount
          <input id="bookingConfirmTotalAmount" type="number" step="0.01" value="${escapeHtml(defaultTotal)}" />
        </label>

        <label>Advance Paid
          <input id="quoteAdvanceAmount" type="number" step="0.01" value="${escapeHtml(item.advanceAmount || "")}" oninput="v65RecalcBalance()" />
        </label>

        <label>Balance
          <input id="quoteBalanceAmount" type="number" step="0.01" value="${escapeHtml(item.balanceAmount || "")}" />
        </label>

        <label>Payment Status
          <select id="quotePaymentStatus">
            ${["Pending","Advance Paid","Paid","Refunded"].map(s => `<option value="${s}" ${paymentStatus === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </label>

        <label>Quote Valid Until
          <input id="quoteValidUntil" type="date" value="${escapeHtml(defaultValid)}" />
        </label>
      </div>

      ${isTour ? `
        <div class="booking-confirm-grid v65-quote-grid">
          <label>Pickup Time <input id="tourPickupTime" type="time" value="${escapeHtml(item.pickupTime || "")}" /></label>
          <label>Pickup Location <input id="tourPickupLocation" value="${escapeHtml(item.pickupLocation || "")}" /></label>
          <label>Child Rate <input id="tourChildRate" type="number" step="0.01" value="${escapeHtml(item.childRate || "")}" /></label>
        </div>
      ` : `
        <div class="booking-confirm-grid v65-quote-grid">
          <label>Check-in Time <input id="bookingConfirmCheckInTime" type="time" value="${escapeHtml(item.checkInTime || "14:00")}" /></label>
          <label>Check-out Time <input id="bookingConfirmCheckOutTime" type="time" value="${escapeHtml(item.checkOutTime || "11:00")}" /></label>
        </div>
      `}

      <label class="v65-full-label">Admin Message to Guest
        <textarea id="bookingConfirmAdminMessage" placeholder="Example: Please arrive after 2.00 PM. Contact us before check-in.">${escapeHtml(item.adminMessage || item.quoteAdminMessage || "")}</textarea>
      </label>

      <div class="v65-action-row">
        <button type="button" onclick="sendQuoteToGuest('${escapeJs(item.id)}')">Send Quote / Invoice</button>
        <button type="button" onclick="markGuestConfirmedManually('${escapeJs(item.id)}')">Mark Guest Confirmed</button>
        <button type="button" onclick="adminConfirmFinalBooking('${escapeJs(item.id)}')">Admin Confirm Booking</button>
      </div>
    </div>
  `;
}

function v65RecalcQuote(){
  const rate = Number(document.getElementById("bookingConfirmDayRate")?.value || 0);
  const qty = Number(document.getElementById("bookingConfirmNights")?.value || 1);
  const percent = Number(document.getElementById("quoteDiscountPercent")?.value || 0);
  const discountAmount = Number(document.getElementById("quoteDiscountAmount")?.value || 0);
  const gross = rate * qty;
  const percentDiscount = gross * percent / 100;
  const total = Math.max(gross - percentDiscount - discountAmount, 0);
  const totalBox = document.getElementById("bookingConfirmTotalAmount");
  if(totalBox) totalBox.value = total ? total.toFixed(2) : "";
  v65RecalcBalance();
}

function v65RecalcBalance(){
  const total = Number(document.getElementById("bookingConfirmTotalAmount")?.value || 0);
  const advance = Number(document.getElementById("quoteAdvanceAmount")?.value || 0);
  const balance = Math.max(total - advance, 0);
  const box = document.getElementById("quoteBalanceAmount");
  if(box) box.value = total ? balance.toFixed(2) : "";
}

