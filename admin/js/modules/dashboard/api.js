import { apiGet } from "../../core/api.js";

async function safeGet(path){
  try {
    const data = await apiGet(path);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn("Dashboard source unavailable:", path, error?.message || error);
    return [];
  }
}

export async function loadDashboardData(){
  const [inquiries, bookings, properties, destinations, tourPackages, services, reviews] = await Promise.all([
    safeGet("/api/admin/inquiries"),
    safeGet("/api/admin/bookings"),
    safeGet("/api/admin/properties"),
    safeGet("/api/admin/destinations"),
    safeGet("/api/admin/tour-packages"),
    safeGet("/api/admin/services"),
    safeGet("/api/admin/reviews")
  ]);

  return { inquiries, bookings, properties, destinations, tourPackages, services, reviews };
}
