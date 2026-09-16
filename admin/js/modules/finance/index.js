import {
  loadFinanceSummary,
  loadBookingFinanceHistory,
  savePayment,
  updatePayment,
  deletePayment,
  saveRefund,
  updateRefund,
  deleteRefund,
  saveAdjustment,
  saveCommission,
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

function financeNumber(value) {
  const n = Number(String(value ?? "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function showElements(selector, show) {
  document.querySelectorAll(selector).forEach((el) => {
    el.classList.toggle("hidden", !show);
    if (show) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "hidden");
  });
}

function setSelectOptions(select, options) {
  if (!select) return;
  select.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
}

function updateFinanceEntryUi() {
  const entryType = byId("financeEntryType")?.value || "Payment";
  const paymentType = byId("financePaymentType");
  const paymentTypeLabel = byId("financePaymentTypeLabel");
  const method = byId("financePaymentMethod");
  const transactionNo = byId("financeTransactionNo");
  const remarks = byId("financeRemarks");
  const amount = byId("financeAmount");

  showElements(".finance-commission-field", entryType === "Commission");

  if (entryType === "Payment") {
    if (paymentTypeLabel) paymentTypeLabel.textContent = "Payment Type";
    setSelectOptions(paymentType, [
      ["Advance", "Advance"],
      ["Balance", "Balance"],
      ["Extra Payment", "Extra Payment"]
    ]);
    if (transactionNo) transactionNo.placeholder = "Bank reference / card transaction / receipt ref";
    if (remarks) remarks.placeholder = "Payment note";
  }

  if (entryType === "Refund") {
    if (paymentTypeLabel) paymentTypeLabel.textContent = "Refund Reason";
    setSelectOptions(paymentType, [
      ["Early Checkout Refund", "Early Checkout Refund"],
      ["Cancellation Refund", "Cancellation Refund"],
      ["Overpayment Refund", "Overpayment Refund"],
      ["Goodwill Refund", "Goodwill Refund"],
      ["Other Refund", "Other Refund"]
    ]);
    if (transactionNo) transactionNo.placeholder = "Refund reference / voucher no.";
    if (remarks) remarks.placeholder = "Refund reason / note";
  }

  if (entryType === "Adjustment") {
    if (paymentTypeLabel) paymentTypeLabel.textContent = "Adjustment Type";
    setSelectOptions(paymentType, [
      ["Decrease", "Decrease Booking Total"],
      ["Increase", "Increase Booking Total"]
    ]);
    if (transactionNo) transactionNo.placeholder = "Adjustment reference";
    if (remarks) remarks.placeholder = "Example: Early checkout - unused 2 nights";
  }

  if (entryType === "Commission") {
    if (paymentTypeLabel) paymentTypeLabel.textContent = "Commission Type";
    setSelectOptions(paymentType, [
      ["Fixed", "Fixed Amount"],
      ["Percent", "Percentage"],
      ["Referral", "Referral"],
      ["Affiliate", "Affiliate"]
    ]);
    if (transactionNo) transactionNo.placeholder = "Commission payment / voucher ref";
    if (remarks) remarks.placeholder = "Agent commission note";
  }

  if (amount) {
    amount.placeholder = entryType === "Commission" ? "Commission amount / calculated value" : "Amount";
  }
}

async function reloadSelectedHistory() {
  if (!selectedBookingId) return;
  selectedHistoryState = await loadBookingFinanceHistory(selectedBookingId);
  renderSelectedBooking(document.getElementById("financeEntryBox"), selectedBooking(), selectedHistoryState);
}

function basePayload() {
  const booking = selectedBooking();
  const entryType = byId("financeEntryType")?.value || "Payment";
  const amount = Number(byId("financeAmount")?.value || 0);
  const dateValue = byId("financeDate")?.value || todayISO();
  const paymentType = byId("financePaymentType")?.value || "Payment";
  const paymentMethod = byId("financePaymentMethod")?.value || "Cash";
  const currency = byId("financeCurrency")?.value || booking?.currency || "USD";
  const remarks = byId("financeRemarks")?.value || "";

  return {
    bookingId: byId("financeBookingId")?.value || "",
    reference: booking?.reference || "",
    paymentDate: dateValue,
    refundDate: dateValue,
    adjustmentDate: dateValue,
    commissionDate: dateValue,
    paymentType,
    paymentMethod,
    currency,
    amount,
    transactionNo: byId("financeTransactionNo")?.value || "",
    remarks,
    reason: remarks || paymentType,
    adjustmentType: paymentType,
    agentName: byId("financeAgentName")?.value || "",
    commissionType: paymentType === "Percent" ? "Percent" : "Fixed",
    percent: financeNumber(byId("financeCommissionPercent")?.value || 0),
    paymentStatus: byId("financeCommissionStatus")?.value || "Pending",
    paidDate: byId("financeCommissionStatus")?.value === "Paid" ? dateValue : ""
  };
}

function validateFinancePayload(entryType, payload) {
  if (!payload.bookingId) return "Please select a booking first.";
  if (!Number.isFinite(payload.amount) || payload.amount <= 0) return "Enter a valid amount.";
  if (entryType === "Commission" && !payload.agentName.trim()) return "Agent name is required for commission.";
  return "";
}

function bindFinanceEvents() {
  byId("financeSearch")?.addEventListener("input", () => applyFinanceFilters(financeState));
  byId("financeStatusFilter")?.addEventListener("change", () => applyFinanceFilters(financeState));
  byId("financeMethodFilter")?.addEventListener("change", () => applyFinanceFilters(financeState));
  byId("financeEntryType")?.addEventListener("change", updateFinanceEntryUi);

  updateFinanceEntryUi();

  const form = byId("financeEntryForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const entryType = byId("financeEntryType")?.value || "Payment";
    const txnId = byId("financeTxnId")?.value || "";
    const editKind = byId("financeEditKind")?.value || "";
    const payload = basePayload();
    const validationError = validateFinancePayload(entryType, payload);

    if (validationError) return alert(validationError);

    try {
      if (txnId && editKind === "Payment") {
        await updatePayment(txnId, payload);
      } else if (txnId && editKind === "Refund") {
        await updateRefund(txnId, payload);
      } else if (entryType === "Refund") {
        await saveRefund(payload);
      } else if (entryType === "Adjustment") {
        await saveAdjustment(payload);
      } else if (entryType === "Commission") {
        await saveCommission(payload);
      } else {
        await savePayment(payload);
      }

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
  if (byId("financeTxnId")) byId("financeTxnId").value = "";
  if (byId("financeEditKind")) byId("financeEditKind").value = "";
  if (byId("financeSubmitBtn")) byId("financeSubmitBtn").textContent = "Save Finance Entry";

  if (clearBooking) selectedBookingId = "";

  if (!clearBooking && selectedBookingId) {
    if (byId("financeBookingId")) byId("financeBookingId").value = selectedBookingId;
    if (byId("financeDate")) byId("financeDate").value = todayISO();
    const b = selectedBooking();
    if (byId("financeCurrency")) byId("financeCurrency").value = b?.currency || "USD";
  }

  updateFinanceEntryUi();
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
        resetFinanceForm(false);
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

    if (byId("financeBookingId")) byId("financeBookingId").value = bookingId;
    if (byId("financeDate")) byId("financeDate").value = todayISO();
    if (byId("financeCurrency")) byId("financeCurrency").value = booking?.currency || "USD";
    if (byId("financeEntryTitle")) byId("financeEntryTitle").textContent = `Finance Entry - ${booking?.reference || bookingId}`;

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

    if (kind !== "Payment" && kind !== "Refund") {
      return alert("Only Payment and Refund edit is enabled now. Adjustment / Commission edit can be added next.");
    }

    if (byId("financeTxnId")) byId("financeTxnId").value = item.id;
    if (byId("financeEditKind")) byId("financeEditKind").value = kind;
    if (byId("financeEntryType")) byId("financeEntryType").value = kind;

    updateFinanceEntryUi();

    if (byId("financePaymentType")) byId("financePaymentType").value = item.paymentType || item.reason || "Advance";
    if (byId("financePaymentMethod")) byId("financePaymentMethod").value = item.paymentMethod || "Cash";
    if (byId("financeCurrency")) byId("financeCurrency").value = item.currency || selectedBooking()?.currency || "USD";
    if (byId("financeAmount")) byId("financeAmount").value = item.amount || "";
    if (byId("financeDate")) byId("financeDate").value = (item.paymentDate || item.refundDate || todayISO()).slice(0, 10);
    if (byId("financeTransactionNo")) byId("financeTransactionNo").value = item.transactionNo || "";
    if (byId("financeRemarks")) byId("financeRemarks").value = item.remarks || item.reason || "";
    if (byId("financeSubmitBtn")) byId("financeSubmitBtn").textContent = `Update ${kind}`;

    byId("financeEntryBox")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  window.deleteFinanceTxn = async function deleteFinanceTxn(kind, id) {
    if (kind !== "Payment" && kind !== "Refund") {
      return alert("Only Payment and Refund delete is enabled now. Adjustment / Commission delete can be added next.");
    }

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
    if (kind !== "Payment" && kind !== "Refund") return alert("Receipt is available for payments and refunds only.");
    window.open(financeReceiptUrl(kind, id), "_blank");
  };

  window.exportFinanceCSV = function exportFinanceCSV() {
    window.open(financeCsvUrl(), "_blank");
  };

  window.printFinanceInvoice = function printFinanceInvoice(bookingId) {
    window.open(financeInvoiceUrl(bookingId), "_blank");
  };

  window.emailFinanceReceipt = async function emailFinanceReceiptAction(kind, id) {
    if (kind !== "Payment" && kind !== "Refund") return alert("Receipt email is available for payments and refunds only.");
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
