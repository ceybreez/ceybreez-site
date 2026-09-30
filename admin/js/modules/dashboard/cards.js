import {
  addDays,
  activeFlag,
  bookingAmount,
  bookingCheckIn,
  bookingCheckOut,
  bookingInHouse,
  featuredFlag,
  isBooked,
  latest,
  needsFollowUp,
  paymentPending,
  percent,
  propertyTypeCounts,
  safeArray
} from "./helpers.js";

function rowDate(row){ return String(row?.createdAt || row?.created_at || row?.updatedAt || row?.dateFrom || "").slice(0,10); }

export function calculateDashboard(data){
  const today=addDays(0), tomorrow=addDays(1), yesterday=addDays(-1), next7=addDays(7);
  const bookings=safeArray(data.bookings), inquiries=safeArray(data.inquiries), properties=safeArray(data.properties);
  const destinations=safeArray(data.destinations), tourPackages=safeArray(data.tourPackages), services=safeArray(data.services), reviews=safeArray(data.reviews);

  const yIn=bookings.filter(b=>bookingCheckIn(b,yesterday));
  const yOut=bookings.filter(b=>bookingCheckOut(b,yesterday));
  const tIn=bookings.filter(b=>bookingCheckIn(b,today));
  const tOut=bookings.filter(b=>bookingCheckOut(b,today));
  const tmIn=bookings.filter(b=>bookingCheckIn(b,tomorrow));
  const tmOut=bookings.filter(b=>bookingCheckOut(b,tomorrow));
  const house=bookings.filter(b=>bookingInHouse(b,today));
  const activeBookings=bookings.filter(isBooked);
  const upcoming7=activeBookings.filter(b=>{ const d=String(b.dateFrom||"").slice(0,10); return d>=today && d<=next7; });
  const pendingPayments=bookings.filter(paymentPending);
  const followUps=inquiries.filter(needsFollowUp);
  const newInq=inquiries.filter(i=>String(i.status||"New").toLowerCase()==="new");
  const quoted=inquiries.filter(i=>String(i.status||"").toLowerCase()==="quoted");
  const bookedInq=inquiries.filter(i=>String(i.status||"").toLowerCase()==="booked");
  const todayInquiries=inquiries.filter(i=>rowDate(i)===today);
  const yesterdayInquiries=inquiries.filter(i=>rowDate(i)===yesterday);

  const month=today.slice(0,7);
  const thisMonthRevenue=activeBookings.filter(b=>String(b.dateFrom||"").slice(0,7)===month).reduce((s,b)=>s+bookingAmount(b),0);
  const todayRevenue=activeBookings.filter(b=>bookingCheckIn(b,today)||bookingCheckOut(b,today)).reduce((s,b)=>s+bookingAmount(b),0);
  const activePropertyCount=properties.filter(activeFlag).length;
  const props=propertyTypeCounts(properties);
  const occupancy=percent(house.length,Math.max(activePropertyCount,1));

  const reviewRatings=reviews.map(r=>Number(r.rating||0)).filter(n=>Number.isFinite(n)&&n>0);
  const averageRating=reviewRatings.length ? (reviewRatings.reduce((a,b)=>a+b,0)/reviewRatings.length).toFixed(1) : "-";

  return {
    today,tomorrow,yesterday,yIn,yOut,tIn,tOut,tmIn,tmOut,house,activeBookings,upcoming7,pendingPayments,followUps,
    newInq,quoted,bookedInq,todayInquiries,yesterdayInquiries,thisMonthRevenue,todayRevenue,occupancy,props,
    activePropertyCount,
    destinationsTotal:destinations.length,
    destinationsLive:destinations.filter(activeFlag).length,
    tourPackagesTotal:tourPackages.length,
    tourPackagesLive:tourPackages.filter(activeFlag).length,
    tourPackagesFeatured:tourPackages.filter(featuredFlag).length,
    servicesTotal:services.length,
    servicesLive:services.filter(activeFlag).length,
    reviewsTotal:reviews.length,
    averageRating,
    latestBookings:latest(bookings),
    latestInquiries:latest(inquiries),
    latestReviews:latest(reviews,5)
  };
}
