import {
  loadFinanceSummary,
  loadBookingFinanceHistory,
  savePayment,
  updatePayment,
  deletePayment,
  saveRefund,
  updateRefund,
  deleteRefund,
  financeCsvUrl,
  financeReceiptUrl,
  financeInvoiceUrl,
  emailFinanceReceipt,
  emailFinanceInvoice
} from "./api.js";
import { renderFinance, applyFinanceFilters, renderSelectedBooking } from "./render.js";

let financeState = { bookings: [], history: [], totals: {} };
let selectedBookingId = "";
let selectedHistoryState = { items: [], summary: {} };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function byId(id) {
  return document.getElementById(id);
}

function selectedBooking() {
  return (financeState.bookings || []).find((b) => String(b.id) === String(selectedBookingId));
}

async function reloadSelectedHistory() {
  if (!selectedBookingId) return;
  selectedHistoryState = await loadBookingFinanceHistory(selectedBookingId);
  renderSelectedBooking(document.getElementById("financeEntryBox"), selectedBooking(), selectedHistoryState);
}

function bindFinanceEvents() {
  byId("financeSearch")?.addEventListener("input", () => applyFinanceFilters(financeState));
  byId("financeStatusFilter")?.addEventListener("change", () => applyFinanceFilters(financeState));
  byId("financeMethodFilter")?.addEventListener("change", () => applyFinanceFilters(financeState));

  const form = byId("financeEntryForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const bookingId = byId("financeBookingId")?.value || "";
    const entryType = byId("financeEntryType")?.value || "Payment";
    const amount = Number(byId("financeAmount")?.value || 0);
    const txnId = byId("financeTxnId")?.value || "";
    const editKind = byId("financeEditKind")?.value || "";

    if (!bookingId) return alert("Please select a booking first.");
    if (!Number.isFinite(amount) || amount <= 0) return alert("Enter a valid amount.");

    const payload = {
      bookingId,
      paymentDate: byId("financeDate")?.value || todayISO(),
      refundDate: byId("financeDate")?.value || todayISO(),
      paymentType: byId("financePaymentType")?.value || "Payment",
      paymentMethod: byId("financePaymentMethod")?.value || "Cash",
      currency: byId("financeCurrency")?.value || "USD",
      amount,
      transactionNo: byId("financeTransactionNo")?.value || "",
      remarks: byId("financeRemarks")?.value || "",
      reason: byId("financeRemarks")?.value || "Refund"
    };

    try {
      if (txnId && editKind === "Payment") await updatePayment(txnId, payload);
      else if (txnId && editKind === "Refund") await updateRefund(txnId, payload);
      else if (entryType === "Refund") await saveRefund(payload);
      else await savePayment(payload);

      alert(txnId ? "Finance entry updated." : "Finance entry saved.");
      resetFinanceForm(false);
      await window.renderFinanceModule(false);
      if (selectedBookingId) await reloadSelectedHistory();
    } catch (error) {
      alert(error.message || "Finance entry save failed");
    }
  });
}

function resetFinanceForm(clearBooking = true) {
  byId("financeEntryForm")?.reset();
  byId("financeTxnId").value = "";
  byId("financeEditKind").value = "";
  byId("financeSubmitBtn").textContent = "Save Finance Entry";
  if (clearBooking) selectedBookingId = "";
  if (!clearBooking && selectedBookingId) {
    byId("financeBookingId").value = selectedBookingId;
    byId("financeDate").value = todayISO();
    const b = selectedBooking();
    byId("financeCurrency").value = b?.currency || "USD";
  }
}

export function initFinanceModule() {
  window.renderFinanceModule = async function renderFinanceModule(closeBox = false) {
    const root = byId("financeModuleRoot") || byId("financeTab");
    if (!root) return;
    if (closeBox) selectedBookingId = "";
    root.innerHTML = `<div class="section-head"><div><h2>Finance</h2><p>Loading finance records...</p></div></div>`;
    try {
      financeState = await loadFinanceSummary();
      renderFinance(root, financeState);
      bindFinanceEvents();
      if (selectedBookingId) {
        byId("financeEntryBox")?.classList.remove("hidden");
        await reloadSelectedHistory();
      }
    } catch (error) {
      root.innerHTML = `<div class="section-head"><div><h2>Finance</h2><p>${String(error.message || "Finance load failed")}</p></div><button class="v14-refresh" onclick="window.renderFinanceModule()">Retry</button></div>`;
    }
  };

  window.openFinanceEntry = async function openFinanceEntry(bookingId) {
    selectedBookingId = bookingId;
    const booking = selectedBooking();
    const box = byId("financeEntryBox");
    if (!box) return;
    box.classList.remove("hidden");
    resetFinanceForm(false);
    byId("financeBookingId").value = bookingId;
    byId("financeDate").value = todayISO();
    byId("financeCurrency").value = booking?.currency || "USD";
    byId("financeEntryTitle").textContent = `Finance Entry - ${booking?.reference || bookingId}`;
    await reloadSelectedHistory();
    box.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  window.openFinanceHistory = window.openFinanceEntry;

  window.closeFinanceEntry = function closeFinanceEntry() {
    resetFinanceForm(true);
    byId("financeEntryBox")?.classList.add("hidden");
  };

  window.editFinanceTxn = async function editFinanceTxn(kind, id) {
    const item = (selectedHistoryState.items || []).find((x) => String(x.id) === String(id) && x.kind === kind);
    if (!item) return alert("Transaction not found in selected history.");
    byId("financeTxnId").value = item.id;
    byId("financeEditKind").value = kind;
    byId("financeEntryType").value = kind;
    byId("financePaymentType").value = item.paymentType || "Advance";
    byId("financePaymentMethod").value = item.paymentMethod || "Cash";
    byId("financeCurrency").value = item.currency || selectedBooking()?.currency || "USD";
    byId("financeAmount").value = item.amount || "";
    byId("financeDate").value = (item.paymentDate || item.refundDate || todayISO()).slice(0, 10);
    byId("financeTransactionNo").value = item.transactionNo || "";
    byId("financeRemarks").value = item.remarks || item.reason || "";
    byId("financeSubmitBtn").textContent = `Update ${kind}`;
    byId("financeEntryBox")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  window.deleteFinanceTxn = async function deleteFinanceTxn(kind, id) {
    if (!confirm(`Delete this ${kind.toLowerCase()}? This will recalculate the balance.`)) return;
    try {
      if (kind === "Payment") await deletePayment(id);
      else await deleteRefund(id);
      await window.renderFinanceModule(false);
      if (selectedBookingId) await reloadSelectedHistory();
    } catch (error) {
      alert(error.message || "Delete failed");
    }
  };

  window.printFinanceReceipt = function printFinanceReceipt(kind, id) {
    window.open(financeReceiptUrl(kind, id), "_blank");
  };

  window.exportFinanceCSV = function exportFinanceCSV() {
    window.open(financeCsvUrl(), "_blank");
  };


  window.printFinanceInvoice = function printFinanceInvoice(bookingId) {
    window.open(financeInvoiceUrl(bookingId), "_blank");
  };

  window.emailFinanceReceipt = async function emailFinanceReceiptAction(kind, id) {
    if (!confirm(`Email this ${kind.toLowerCase()} receipt to the guest?`)) return;
    try {
      const res = await emailFinanceReceipt(kind, id);
      alert(res.emailSent ? "Receipt email sent." : "Receipt email request completed, but email was not sent. Check guest email / Resend settings.");
    } catch (error) {
      alert(error.message || "Receipt email failed");
    }
  };

  window.emailFinanceInvoice = async function emailFinanceInvoiceAction(bookingId) {
    if (!confirm("Email this invoice to the guest?")) return;
    try {
      const res = await emailFinanceInvoice(bookingId);
      alert(res.emailSent ? "Invoice email sent." : "Invoice email request completed, but email was not sent. Check guest email / Resend settings.");
    } catch (error) {
      alert(error.message || "Invoice email failed");
    }
  };

  const active = document.querySelector(".v14-nav button.active")?.dataset?.v14Tab;
  if (active === "finance") window.renderFinanceModule();
}
