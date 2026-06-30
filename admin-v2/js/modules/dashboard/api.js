import { apiGet } from "../../core/api.js";

export async function loadDashboardData() {

    const [
        inquiries,
        bookings,
        properties,
        tours
    ] = await Promise.all([

        apiGet("/api/admin/inquiries").catch(() => []),

        apiGet("/api/admin/bookings").catch(() => []),

        apiGet("/api/admin/properties").catch(() => []),

        apiGet("/api/admin/tours").catch(() => [])

    ]);

    return {
        inquiries: Array.isArray(inquiries) ? inquiries : [],
        bookings: Array.isArray(bookings) ? bookings : [],
        properties: Array.isArray(properties) ? properties : [],
        tours: Array.isArray(tours) ? tours : []
    };

}

export async function loadDashboardSummary(){

    const data = await loadDashboardData();

    return {

        inquiryCount:data.inquiries.length,

        bookingCount:data.bookings.length,

        propertyCount:data.properties.length,

        tourCount:data.tours.length

    };

}
