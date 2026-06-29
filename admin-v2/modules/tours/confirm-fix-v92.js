/* =========================
   V9.2 TOUR CONFIRM FIX
   Tour booking uses Tour Date / Pickup details and does not require property fields.
========================= */

function v92IsTourInquiry(item){
  const t = `${item?.serviceType || ""} ${item?.itemName || ""} ${item?.message || ""}`.toLowerCase();
  return t.includes("tour") || t.includes("trip") || t.includes("safari") || t.includes("excursion") || t.includes("pickup") || t.includes("round tour");
}

function v92DatePlusOne(value){
  if(!value) return "";
  const d = new Date(value + "T00:00:00");
  if(isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0,10);
}

function v92GetTourDate(){
  return document.getElementById("tourDate")?.value ||
         document.getElementById("bookingConfirmTourDate")?.value ||
         document.querySelector("input[type='date']")?.value ||
         currentInquiry?.dateFrom ||
         "";
}

function v92GetBookingDates(inquiry){
  if(v92IsTourInquiry(inquiry)){
    const d = v92GetTourDate();
    return { dateFrom: d, dateTo: v92DatePlusOne(d) };
  }
  return {
    dateFrom: inquiry?.dateFrom || document.getElementById("bookingConfirmDateFrom")?.value || "",
    dateTo: inquiry?.dateTo || document.getElementById("bookingConfirmDateTo")?.value || ""
  };
}

function v92GetItemName(inquiry){
  return inquiry?.itemName ||
    String(inquiry?.serviceType || "")
      .replace("Tour Inquiry - ","")
      .replace("Tours Inquiry - ","")
      .replace("Villa Inquiry - ","")
      .replace("Apartment Inquiry - ","")
      .replace("Homestay Inquiry - ","")
      .trim() ||
    (v92IsTourInquiry(inquiry) ? "Tour Booking" : "Property Booking");
}

async function confirmBooking(sendEmail = true) {
  if (!currentInquiry) {
    alert("No inquiry selected");
    return;
  }

  const isTour = v92IsTourInquiry(currentInquiry);
  const dates = v92GetBookingDates(currentInquiry);
  const itemName = v92GetItemName(currentInquiry);

  if(!itemName || !dates.dateFrom){
    alert(isTour ? "Please enter Tour Date before confirming." : "Missing property/tour or booking dates");
    return;
  }

  if(!isTour && !dates.dateTo){
    alert("Please enter check-out date before confirming.");
    return;
  }

  if (!confirm("Confirm this booking?")) return;

  try {
    const currency = document.getElementById("bookingConfirmCurrency")?.value || "USD";
    const rate = document.getElementById("bookingConfirmDayRate")?.value ||
                 document.getElementById("tourAdultRate")?.value ||
                 document.getElementById("adultRate")?.value || "";
    const totalAmount = document.getElementById("bookingConfirmTotalAmount")?.value || "";
    const discountPercent = document.getElementById("quoteDiscountPercent")?.value || "0";
    const discountAmount = document.getElementById("quoteDiscountAmount")?.value || "0";
    const paymentStatus = document.getElementById("quotePaymentStatus")?.value || "Pending";
    const advanceAmount = document.getElementById("quoteAdvanceAmount")?.value || "";
    const balanceAmount = document.getElementById("quoteBalanceAmount")?.value || "";
    const adminMessage = document.getElementById("bookingConfirmAdminMessage")?.value || "";

    const payload = {
      inquiryId: currentInquiry.id,
      reference: currentInquiry.reference,
      itemName,
      serviceType: currentInquiry.serviceType || (isTour ? "Tour Inquiry" : "Property Inquiry"),
      guestName: currentInquiry.guestName,
      guestEmail: currentInquiry.guestEmail,
      guestMobile: currentInquiry.guestMobile,
      dateFrom: dates.dateFrom,
      dateTo: dates.dateTo,
      guests: document.getElementById("bookingConfirmNights")?.value || currentInquiry.guests || "1",
      checkInTime: document.getElementById("bookingConfirmCheckInTime")?.value || currentInquiry.checkInTime || "14:00",
      checkOutTime: document.getElementById("bookingConfirmCheckOutTime")?.value || currentInquiry.checkOutTime || "11:00",
      pickupTime: document.getElementById("tourPickupTime")?.value || currentInquiry.pickupTime || "",
      pickupLocation: document.getElementById("tourPickupLocation")?.value || currentInquiry.pickupLocation || "",
      childRate: document.getElementById("tourChildRate")?.value || currentInquiry.childRate || "",
      currency,
      dayRate: rate,
      adultRate: rate,
      totalDays: isTour ? "1" : (document.getElementById("bookingConfirmNights")?.value || "1"),
      discountPercent,
      discountAmount,
      totalAmount,
      paymentStatus,
      advanceAmount,
      balanceAmount,
      guestConfirmed: currentInquiry.guestConfirmed ? 1 : 0,
      adminConfirmed: 1,
      bookingCategory: isTour ? "tour" : "property",
      sendEmail,
      adminMessage
    };

    const res = await fetch(`${API_BASE}/api/admin/bookings`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (!res.ok) {
      alert(result.error || "Booking failed");
      return;
    }

    await loadBookings();
    await loadInquiries();

    alert("Booking Confirmed");
    closeInquiryModal?.();

  } catch (err) {
    alert(err.message);
  }
}


