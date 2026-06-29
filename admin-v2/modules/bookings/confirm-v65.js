/* Override confirm booking so guest/admin confirmation data syncs to booking */
async function confirmBooking(sendEmail = true) {
  if (!currentInquiry) {
    alert("No inquiry selected");
    return;
  }

  if (!confirm("Confirm this booking?")) return;

  try {
    const quote = v65QuotePayloadFromModal();

    const res = await fetch(`${API_BASE}/api/admin/bookings`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        inquiryId: currentInquiry.id,
        reference: currentInquiry.reference,
        itemName: getItemNameForBooking(currentInquiry),
        serviceType: currentInquiry.serviceType || (classifyInquiryItem(currentInquiry) === "tour" ? "Tour Inquiry" : "Property Inquiry"),
        guestName: currentInquiry.guestName,
        guestEmail: currentInquiry.guestEmail,
        guestMobile: currentInquiry.guestMobile,
        dateFrom: currentInquiry.dateFrom,
        dateTo: safeBookingDateTo(currentInquiry),
        guests: currentInquiry.guests,
        checkInTime: document.getElementById("bookingConfirmCheckInTime")?.value || currentInquiry.checkInTime || "14:00",
        checkOutTime: document.getElementById("bookingConfirmCheckOutTime")?.value || currentInquiry.checkOutTime || "11:00",
        pickupTime: document.getElementById("tourPickupTime")?.value || currentInquiry.pickupTime || "",
        pickupLocation: document.getElementById("tourPickupLocation")?.value || currentInquiry.pickupLocation || "",
        childRate: document.getElementById("tourChildRate")?.value || currentInquiry.childRate || "",
        currency: quote.currency,
        dayRate: quote.unitRate,
        totalDays: document.getElementById("bookingConfirmNights")?.value || currentInquiry.totalDays || "1",
        discountPercent: quote.discountPercent,
        discountAmount: quote.discountAmount,
        totalAmount: quote.totalAmount,
        paymentStatus: quote.paymentStatus,
        advanceAmount: quote.advanceAmount,
        balanceAmount: quote.balanceAmount,
        guestConfirmed: v65Bool(currentInquiry.guestConfirmed),
        adminConfirmed: true,
        sendEmail,
        adminMessage: quote.adminMessage
      })
    });

    const result = await res.json();

    if (!res.ok) {
      alert(result.error || "Booking failed");
      return;
    }

    currentInquiry.status = "Booked";
    currentInquiry.adminConfirmed = true;

    await loadBookings();
    await loadInquiries();

    alert("Booking Confirmed");
    closeInquiryModal?.();

  } catch (err) {
    alert(err.message);
  }
}


