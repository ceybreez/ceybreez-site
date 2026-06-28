import { apiPut, apiDelete, apiPost } from "../../utils/api.js";

export async function updateStatus(ctx, id, status) {
  try {
    await apiPut(`/api/admin/inquiries/${id}/status`, { status, sendEmail: false });
    ctx.selectedId = id;
    await ctx.load();
    alert("Inquiry status updated");
  } catch (error) {
    alert(error.message);
  }
}

export async function confirmBooking(ctx, item) {
  if (!confirm("Confirm this inquiry as booking?")) return;

  try {
    const dateTo = item.dateTo && item.dateTo > item.dateFrom ? item.dateTo : ctx.datePlusOne(item.dateFrom);

    await apiPost("/api/admin/bookings", {
      inquiryId: item.id,
      reference: item.reference || item.id,
      itemName: item.itemName || item.serviceType || "CeyBreez Booking",
      serviceType: item.serviceType || "Property Inquiry",
      guestName: item.guestName || "",
      guestEmail: item.guestEmail || "",
      guestMobile: item.guestMobile || "",
      dateFrom: item.dateFrom || "",
      dateTo,
      guests: item.guests || "",
      checkInTime: "14:00",
      checkOutTime: "11:00",
      sendEmail: true
    });

    ctx.selectedId = item.id;
    await ctx.load();
    alert("Booking confirmed");
  } catch (error) {
    alert(error.message);
  }
}

export async function deleteItem(ctx, id) {
  if (!confirm("Delete this inquiry?")) return;
  try {
    await apiDelete(`/api/admin/inquiries/${id}`);
    ctx.selectedId = null;
    await ctx.load();
    alert("Inquiry deleted");
  } catch (error) {
    alert(error.message);
  }
}