import { updateBookingStatus, deleteBooking } from "./api.js";

export async function cancelBooking(ctx, id) {
  if (!confirm("Cancel this booking? The dates will become available again.")) return;

  try {
    await updateBookingStatus(id, "Cancelled", {
      sendEmail: false,
      adminMessage: "Booking cancelled from CeyBreez admin."
    });

    ctx.selectedId = id;
    await ctx.load();

    alert("Booking cancelled");
  } catch (error) {
    alert(error.message);
  }
}

export async function markBooked(ctx, id) {
  if (!confirm("Mark this booking as Booked?")) return;

  try {
    await updateBookingStatus(id, "Booked", {
      sendEmail: false,
      adminMessage: "Booking marked as booked from CeyBreez admin."
    });

    ctx.selectedId = id;
    await ctx.load();

    alert("Booking marked as booked");
  } catch (error) {
    alert(error.message);
  }
}

export async function markClosed(ctx, id) {
  if (!confirm("Close this booking?")) return;

  try {
    await updateBookingStatus(id, "Closed", {
      sendEmail: false,
      adminMessage: "Booking closed from CeyBreez admin."
    });

    ctx.selectedId = id;
    await ctx.load();

    alert("Booking closed");
  } catch (error) {
    alert(error.message);
  }
}

export async function removeBooking(ctx, id) {
  if (!confirm("Delete this booking permanently?")) return;

  try {
    await deleteBooking(id);

    ctx.selectedId = null;
    await ctx.load();

    alert("Booking deleted");
  } catch (error) {
    alert(error.message);
  }
}
