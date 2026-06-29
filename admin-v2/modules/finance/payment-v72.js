/* =========================
   V7.2 PAYMENT + INVOICE SYNC
========================= */

function v72PaymentPayloadFromModal(){
  return {
    currency: document.getElementById("bookingConfirmCurrency")?.value || "USD",
    unitRate: document.getElementById("bookingConfirmDayRate")?.value || "",
    discountPercent: document.getElementById("quoteDiscountPercent")?.value || "0",
    discountAmount: document.getElementById("quoteDiscountAmount")?.value || "0",
    totalAmount: document.getElementById("bookingConfirmTotalAmount")?.value || "",
    validUntil: document.getElementById("quoteValidUntil")?.value || "",
    paymentStatus: document.getElementById("quotePaymentStatus")?.value || "Pending",
    advanceAmount: document.getElementById("quoteAdvanceAmount")?.value || "",
    balanceAmount: document.getElementById("quoteBalanceAmount")?.value || "",
    adminMessage: document.getElementById("bookingConfirmAdminMessage")?.value || ""
  };
}

async function savePaymentStatus(sendEmail = false){
  const inquiry = currentInquiry || {};
  const id = inquiry.id;

  if(!id){
    alert("Inquiry not selected");
    return;
  }

  const payload = v72PaymentPayloadFromModal();
  payload.sendEmail = !!sendEmail;

  const msg = sendEmail
    ? "Save payment status and send invoice/payment email to guest?"
    : "Save payment status and sync with booking?";

  if(!confirm(msg)) return;

  const res = await fetch(`${API_BASE}/api/admin/inquiries/${id}/payment-sync`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

  const result = await res.json();

  if(!res.ok){
    alert(result.error || "Payment sync failed");
    return;
  }

  alert(sendEmail ? (result.emailSent ? "Payment saved and email sent" : "Payment saved, but email was not sent") : "Payment status saved");

  await loadInquiries();
  await loadBookings();

  const refreshed = allInquiries.find(x => String(x.id) === String(id));
  if(refreshed){
    currentInquiry = refreshed;
    openInquiryModal(id);
  }
}

function v72InjectPaymentButtons(){
  const panel = document.querySelector(".v65-quote-panel, .booking-confirm-panel");
  if(!panel || document.getElementById("v72SavePaymentBtn")) return;

  const row = panel.querySelector(".v65-action-row") || panel.querySelector(".booking-actions") || panel;

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.id = "v72SavePaymentBtn";
  saveBtn.textContent = "Save Payment Status";
  saveBtn.onclick = () => savePaymentStatus(false);

  const emailBtn = document.createElement("button");
  emailBtn.type = "button";
  emailBtn.id = "v72SendPaymentInvoiceBtn";
  emailBtn.textContent = "Send Payment / Invoice Email";
  emailBtn.onclick = () => savePaymentStatus(true);

  row.appendChild(saveBtn);
  row.appendChild(emailBtn);
}

const v72OldOpenInquiryModal = typeof openInquiryModal === "function" ? openInquiryModal : null;
if(v72OldOpenInquiryModal){
  openInquiryModal = function(id){
    v72OldOpenInquiryModal(id);
    setTimeout(v72InjectPaymentButtons, 150);
  };
}


