import { apiGet, apiPost, apiPut, apiDelete } from "../../utils/api.js";

export async function loadBookings() {
  const data = await apiGet("/api/admin/bookings");
  return Array.isArray(data) ? data : [];
}

export async function loadProperties() {
  const data = await apiGet("/api/admin/properties");
  return Array.isArray(data) ? data : [];
}

export async function createBooking(payload) {
  return await apiPost("/api/admin/bookings", payload);
}

export async function createManualBooking(payload) {
  return await apiPost("/api/admin/v2/availability/manual-booking", payload);
}

export async function createAvailabilityBlock(payload) {
  return await apiPost("/api/admin/v2/availability/block", payload);
}

export async function loadAvailability(params = {}) {
  const query = new URLSearchParams();

  if (params.propertyName) query.set("propertyName", params.propertyName);
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const data = await apiGet(`/api/admin/v2/availability${suffix}`);

  return Array.isArray(data) ? data : [];
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

export async function deleteAvailabilityBlock(id) {
  return await apiDelete(`/api/admin/v2/availability/${id}`);
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
