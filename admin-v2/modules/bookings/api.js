import { apiGet, apiPost, apiPut, apiDelete } from "../../utils/api.js";

export async function loadBookings() {
  const data = await apiGet("/api/admin/bookings");
  return Array.isArray(data) ? data : [];
}

export async function createBooking(payload) {
  return await apiPost("/api/admin/bookings", payload);
}

export async function updateBookingStatus(id, status, options = {}) {
  return await apiPut(`/api/admin/bookings/${id}/status`, {
    status,
    sendEmail: options.sendEmail === true,
    adminMessage: options.adminMessage || ""
  });
}

export async function deleteBooking(id) {
  return await apiDelete(`/api/admin/bookings/${id}`);
}

export async function loadPublicBookings(itemName = "") {
  const query = itemName ? `?itemName=${encodeURIComponent(itemName)}` : "";
  const data = await apiGet(`/api/bookings${query}`);
  return Array.isArray(data) ? data : [];
}

export async function syncBookingsFromInquiries() {
  return await apiPost("/api/admin/bookings/sync-from-inquiries", {});
}

export async function cleanupOrphanBookings() {
  return await apiPost("/api/admin/bookings/cleanup-orphans", {});
}
