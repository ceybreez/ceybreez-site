import {
    bookingCheckIn,
    bookingCheckOut,
    bookingInHouse,
    propertyTypeCounts,
    addDays
} from "./helpers.js";

export function calculateDashboardCards(data){

    const today = addDays(0);

    const tomorrow = addDays(1);

    const yesterday = addDays(-1);

    const bookings = data.bookings;

    const properties = propertyTypeCounts(data.properties);

    return {

        yesterdayCheckIn:
            bookings.filter(b=>bookingCheckIn(b,yesterday)).length,

        todayCheckIn:
            bookings.filter(b=>bookingCheckIn(b,today)).length,

        tomorrowCheckIn:
            bookings.filter(b=>bookingCheckIn(b,tomorrow)).length,

        yesterdayCheckOut:
            bookings.filter(b=>bookingCheckOut(b,yesterday)).length,

        todayCheckOut:
            bookings.filter(b=>bookingCheckOut(b,today)).length,

        tomorrowCheckOut:
            bookings.filter(b=>bookingCheckOut(b,tomorrow)).length,

        inHouse:
            bookings.filter(b=>bookingInHouse(b,today)).length,

        villas:
            properties.villa,

        apartments:
            properties.apartment,

        homestays:
            properties.homestay

    };

}
