import {
  addDays,
  bookingAmount,
  bookingCheckIn,
  bookingCheckOut,
  bookingInHouse,
  latest,
  needsFollowUp,
  paymentPending,
  percent,
  propertyTypeCounts,
  isBooked
} from "./helpers.js";

import { dateOnly } from "../../core/utils.js";

export function calculateDashboard(data){
  const today=addDays(0), tomorrow=addDays(1), yesterday=addDays(-1);
  const bookings=data.bookings || [], inquiries=data.inquiries || [], properties=data.properties || [];
  const yIn=bookings.filter(b=>bookingCheckIn(b,yesterday));
  const yOut=bookings.filter(b=>bookingCheckOut(b,yesterday));
  const tIn=bookings.filter(b=>bookingCheckIn(b,today));
  const tOut=bookings.filter(b=>bookingCheckOut(b,today));
  const tmIn=bookings.filter(b=>bookingCheckIn(b,tomorrow));
  const tmOut=bookings.filter(b=>bookingCheckOut(b,tomorrow));
  const house=bookings.filter(b=>bookingInHouse(b,today));
  const activeBookings=bookings.filter(isBooked);
  const pendingPayments=bookings.filter(paymentPending);
  const followUps=inquiries.filter(needsFollowUp);
  const newInq=inquiries.filter(i=>String(i.status||"New").toLowerCase()==="new");
  const quoted=inquiries.filter(i=>String(i.status||"").toLowerCase()==="quoted");
  const bookedInq=inquiries.filter(i=>String(i.status||"").toLowerCase()==="booked");
  const month=new Date().toISOString().slice(0,7);
  const thisMonthRevenue=activeBookings.filter(b=>String(b.dateFrom||"").slice(0,7)===month).reduce((s,b)=>s+bookingAmount(b),0);
  const todayRevenue=activeBookings.filter(b=>bookingCheckIn(b,today)||bookingCheckOut(b,today)).reduce((s,b)=>s+bookingAmount(b),0);
  const activePropertyCount=Math.max(properties.filter(p=>p.active!==false && Number(p.active)!==0).length,1);
  const props=propertyTypeCounts(properties);
  return {today,tomorrow,yesterday,yIn,yOut,tIn,tOut,tmIn,tmOut,house,activeBookings,pendingPayments,followUps,newInq,quoted,bookedInq,thisMonthRevenue,todayRevenue,occupancy:percent(house.length,activePropertyCount),props,latestBookings:latest(bookings),latestInquiries:latest(inquiries)};
}
