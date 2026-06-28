export function exportCSV(ctx) {
  if (!ctx.items.length) { alert("No inquiries to export"); return; }

  const rows = ctx.items.map(x => ({
    Reference: x.reference || "",
    Status: x.status || "",
    Type: ctx.type(x),
    Service: x.serviceType || "",
    Item: x.itemName || "",
    Guest: x.guestName || "",
    Email: x.guestEmail || "",
    Mobile: x.guestMobile || "",
    Country: x.guestCountry || "",
    Guests: x.guests || "",
    DateFrom: x.dateFrom || "",
    DateTo: x.dateTo || "",
    CreatedAt: x.createdAt || x.created_at || ""
  }));

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(row => headers.map(h => `"${String(row[h]).replaceAll('"', '""')}"`).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ceybreez-inquiries.csv";
  a.click();
}