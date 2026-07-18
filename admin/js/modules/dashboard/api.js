import { apiGet } from "../../core/api.js";

export async function loadDashboardData(){
  const [inquiries, bookings, properties, tours, reviews] = await Promise.all([
    apiGet("/api/admin/inquiries").catch(()=>[]),
    apiGet("/api/admin/bookings").catch(()=>[]),
    apiGet("/api/admin/properties").catch(()=>[]),
    apiGet("/api/admin/destinations").catch(()=>[]),
    apiGet("/api/admin/reviews").catch(()=>[])
  ]);
  return {
    inquiries: Array.isArray(inquiries) ? inquiries : [],
    bookings: Array.isArray(bookings) ? bookings : [],
    properties: Array.isArray(properties) ? properties : [],
    tours: Array.isArray(tours) ? tours : [],
    reviews: Array.isArray(reviews) ? reviews : []
  };
}
