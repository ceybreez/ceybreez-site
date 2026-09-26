
async function v72SendEmail(env, to, subject, html) {
  if (!to) {
    return false;
  }

  if (typeof sendResendEmail === "function") {
    const result = await sendResendEmail(env, {
      to,
      subject,
      html,
      reply_to: "ceybreez@gmail.com"
    });

    return !!result.success;
  }

  if (!env.RESEND_API_KEY) {
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL || "CeyBreez <inquiry@ceybreez.com>",
      to: [to],
      subject,
      html,
      reply_to: "ceybreez@gmail.com"
    })
  });

  return res.ok;
}



async function handleRequest(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);

    try {
      const securityResponse = await securityPreRoute(request, env, url);
      if (securityResponse) return securityResponse;
      /* V8 FINAL STABLE ROUTES */
      if (url.pathname.match(/^\/api\/admin\/inquiries\/[^\/]+$/) && request.method === "DELETE") {
        await checkAdmin(request, env);
        const id = url.pathname.split("/").pop();
        await env.DB.prepare("DELETE FROM bookings WHERE inquiryId=?").bind(id).run();
        await env.DB.prepare("DELETE FROM inquiry_notes WHERE inquiryId=?").bind(id).run();
        await env.DB.prepare("DELETE FROM inquiries WHERE id=?").bind(id).run();
        return jsonResponse({ success:true, message:"Inquiry and related records deleted" }, 200);
      }
      if (url.pathname === "/api/admin/bookings/cleanup-orphans" && request.method === "POST") {
        await checkAdmin(request, env);
        const rows = await env.DB.prepare(`SELECT b.id FROM bookings b LEFT JOIN inquiries i ON i.id=b.inquiryId WHERE b.inquiryId IS NOT NULL AND b.inquiryId!='' AND i.id IS NULL`).all();
        const ids=(rows.results||[]).map(x=>x.id);
        for (const id of ids) await env.DB.prepare("DELETE FROM bookings WHERE id=?").bind(id).run();
        return jsonResponse({ success:true, deleted:ids.length }, 200);
      }
      if (url.pathname === "/api/admin/bookings/sync-from-inquiries" && request.method === "POST") {
        await checkAdmin(request, env);
        await env.DB.prepare(`UPDATE bookings SET
          guestConfirmed=COALESCE((SELECT guestConfirmed FROM inquiries WHERE inquiries.id=bookings.inquiryId),guestConfirmed),
          guestConfirmedAt=COALESCE((SELECT guestConfirmedAt FROM inquiries WHERE inquiries.id=bookings.inquiryId),guestConfirmedAt),
          adminConfirmed=COALESCE((SELECT adminConfirmed FROM inquiries WHERE inquiries.id=bookings.inquiryId),adminConfirmed),
          adminConfirmedAt=COALESCE((SELECT adminConfirmedAt FROM inquiries WHERE inquiries.id=bookings.inquiryId),adminConfirmedAt),
          currency=COALESCE(NULLIF(currency,''),(SELECT quoteCurrency FROM inquiries WHERE inquiries.id=bookings.inquiryId)),
          discountPercent=COALESCE(NULLIF(discountPercent,''),(SELECT quoteDiscountPercent FROM inquiries WHERE inquiries.id=bookings.inquiryId)),
          discountAmount=COALESCE(NULLIF(discountAmount,''),(SELECT quoteDiscountAmount FROM inquiries WHERE inquiries.id=bookings.inquiryId)),
          totalAmount=COALESCE(NULLIF(totalAmount,''),(SELECT quoteTotalAmount FROM inquiries WHERE inquiries.id=bookings.inquiryId)),
          paymentStatus=COALESCE(NULLIF(paymentStatus,''),(SELECT paymentStatus FROM inquiries WHERE inquiries.id=bookings.inquiryId)),
          advanceAmount=COALESCE(NULLIF(advanceAmount,''),(SELECT advanceAmount FROM inquiries WHERE inquiries.id=bookings.inquiryId)),
          balanceAmount=COALESCE(NULLIF(balanceAmount,''),(SELECT balanceAmount FROM inquiries WHERE inquiries.id=bookings.inquiryId)),
          bookingCategory=CASE WHEN LOWER(COALESCE(serviceType,'')||' '||COALESCE(itemName,'')) LIKE '%tour%' THEN 'tour' WHEN LOWER(COALESCE(serviceType,'')||' '||COALESCE(itemName,'')) LIKE '%trip%' THEN 'tour' WHEN LOWER(COALESCE(serviceType,'')||' '||COALESCE(itemName,'')) LIKE '%safari%' THEN 'tour' WHEN LOWER(COALESCE(serviceType,'')||' '||COALESCE(itemName,'')) LIKE '%manual%' THEN 'manual' ELSE 'property' END,
          updatedAt=datetime('now') WHERE inquiryId IS NOT NULL AND inquiryId!=''`).run();
        return jsonResponse({ success:true, message:"Bookings synced from inquiries" }, 200);
      }


      /* =========================
         V7.2 PAYMENT + INVOICE SYNC
      ========================= */

      if (url.pathname.match(/^\/api\/admin\/inquiries\/[^\/]+\/payment-sync$/) && request.method === "POST") {
        await checkAdmin(request, env);

        const id = url.pathname.split("/")[4];
        const data = await request.json();

        const inquiryRow = await env.DB.prepare("SELECT * FROM inquiries WHERE id=?").bind(id).first();
        if (!inquiryRow) return jsonResponse({ error: "Inquiry not found" }, 404);

        const paymentStatus = data.paymentStatus || "Pending";
        const quoteCurrency = data.currency || inquiryRow.quoteCurrency || "USD";
        const quoteTotalAmount = data.totalAmount || inquiryRow.quoteTotalAmount || "";
        const advanceAmount = data.advanceAmount || "";
        const balanceAmount = data.balanceAmount || "";
        const adminMessage = data.adminMessage || inquiryRow.adminMessage || "";

        await env.DB.prepare(`
          UPDATE inquiries SET
            paymentStatus=?,
            quoteCurrency=?,
            quoteUnitRate=?,
            quoteDiscountPercent=?,
            quoteDiscountAmount=?,
            quoteTotalAmount=?,
            quoteValidUntil=?,
            advanceAmount=?,
            balanceAmount=?,
            adminMessage=?,
            updatedAt=datetime('now')
          WHERE id=?
        `).bind(
          paymentStatus,
          quoteCurrency,
          data.unitRate || inquiryRow.quoteUnitRate || "",
          data.discountPercent || inquiryRow.quoteDiscountPercent || "0",
          data.discountAmount || inquiryRow.quoteDiscountAmount || "0",
          quoteTotalAmount,
          data.validUntil || inquiryRow.quoteValidUntil || "",
          advanceAmount,
          balanceAmount,
          adminMessage,
          id
        ).run();

        await env.DB.prepare(`
          UPDATE bookings SET
            paymentStatus=?,
            currency=?,
            dayRate=?,
            discountPercent=?,
            discountAmount=?,
            totalAmount=?,
            advanceAmount=?,
            balanceAmount=?,
            adminMessage=?,
            updatedAt=datetime('now')
          WHERE inquiryId=?
        `).bind(
          paymentStatus,
          quoteCurrency,
          data.unitRate || "",
          data.discountPercent || "0",
          data.discountAmount || "0",
          quoteTotalAmount,
          advanceAmount,
          balanceAmount,
          adminMessage,
          id
        ).run();

        try {
          await env.DB.prepare(`
            INSERT INTO inquiry_notes (id, inquiryId, note, createdAt)
            VALUES (?, ?, ?, datetime('now'))
          `).bind(
            `NOTE-${Date.now()}-${Math.floor(Math.random()*10000)}`,
            id,
            `Payment status updated to ${paymentStatus}. Total: ${quoteCurrency} ${quoteTotalAmount}. Advance: ${advanceAmount}. Balance: ${balanceAmount}.`
          ).run();
        } catch (e) {}

        let emailSent = false;

        if (data.sendEmail === true && inquiryRow.guestEmail) {
          const subject = paymentStatus.toLowerCase().includes("paid")
            ? `CeyBreez Payment Confirmation - ${inquiryRow.reference || id}`
            : `CeyBreez Invoice Update - ${inquiryRow.reference || id}`;

          const html = `
            <div style="font-family:Arial,sans-serif;background:#f8f3eb;padding:24px">
              <div style="max-width:680px;margin:auto;background:#fff;border-radius:18px;overflow:hidden">
                <div style="background:#0f766e;color:#fff;padding:24px;text-align:center">
                  <h1 style="margin:0">${paymentStatus.toLowerCase().includes("paid") ? "Payment Confirmed" : "Invoice Update"}</h1>
                  <p style="margin:8px 0 0">Reference: ${inquiryRow.reference || id}</p>
                </div>
                <div style="padding:24px;color:#222">
                  <p>Dear ${inquiryRow.guestName || "Guest"},</p>
                  <p>Your CeyBreez booking/payment details have been updated.</p>
                  <table style="width:100%;border-collapse:collapse">
                    <tr><td style="padding:10px;border-bottom:1px solid #eee"><b>Property / Tour</b></td><td style="padding:10px;border-bottom:1px solid #eee">${inquiryRow.itemName || inquiryRow.serviceType || "-"}</td></tr>
                    <tr><td style="padding:10px;border-bottom:1px solid #eee"><b>Dates</b></td><td style="padding:10px;border-bottom:1px solid #eee">${inquiryRow.dateFrom || "-"} to ${inquiryRow.dateTo || inquiryRow.dateFrom || "-"}</td></tr>
                    <tr><td style="padding:10px;border-bottom:1px solid #eee"><b>Payment Status</b></td><td style="padding:10px;border-bottom:1px solid #eee"><b>${paymentStatus}</b></td></tr>
                    <tr><td style="padding:10px;border-bottom:1px solid #eee"><b>Total Amount</b></td><td style="padding:10px;border-bottom:1px solid #eee">${quoteCurrency} ${quoteTotalAmount || "-"}</td></tr>
                    <tr><td style="padding:10px;border-bottom:1px solid #eee"><b>Advance Paid</b></td><td style="padding:10px;border-bottom:1px solid #eee">${quoteCurrency} ${advanceAmount || "0"}</td></tr>
                    <tr><td style="padding:10px;border-bottom:1px solid #eee"><b>Balance</b></td><td style="padding:10px;border-bottom:1px solid #eee">${quoteCurrency} ${balanceAmount || "0"}</td></tr>
                  </table>
                  ${adminMessage ? `<p style="background:#f8f3eb;padding:14px;border-radius:12px;margin-top:18px">${adminMessage}</p>` : ""}
                  <p style="font-size:13px;color:#666;margin-top:22px">Thank you,<br>CeyBreez</p>
                </div>
              </div>
            </div>
          `;

          emailSent = await v72SendEmail(env, inquiryRow.guestEmail, subject, html);
        }

        return jsonResponse({ success: true, emailSent, message: "Payment status synced" }, 200);
      }


  /* =========================
         PUBLIC DESTINATIONS API
      ========================= */
  
if (url.pathname === "/api/destinations" && request.method === "GET") {
  const featured = url.searchParams.get("featured");

  let query = "SELECT * FROM destinations WHERE active = 1";

  if (featured === "1") {
    query += " AND featured = 1";
  }

  query += " ORDER BY province, name";

  const rows = await env.DB.prepare(query).all();

  return jsonResponse(rows.results.map(formatDestination), 200);
}

      /* =========================
         PUBLIC PROPERTIES API
      ========================= */

      if (url.pathname === "/api/properties" && request.method === "GET") {
        const type = url.searchParams.get("type");

        let query = "SELECT * FROM properties WHERE active = 1";
        let params = [];

        if (type) {
          query += " AND type = ?";
          params.push(type);
        }

        query += " ORDER BY type, name";

        const rows = await env.DB.prepare(query).bind(...params).all();

        return jsonResponse(rows.results.map(formatProperty), 200);
      }
      /* =========================
   TOUR PACKAGES API
========================= */

function tpArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}
  return String(value).split("\n").map(x => x.trim()).filter(Boolean);
}

function tpSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `tour-${Date.now()}`;
}

function formatTourPackage(row) {
  return {
    ...row,
    pickupAvailable: Number(row.pickupAvailable || 0) === 1,
    active: Number(row.active || 0) === 1,
    featured: Number(row.featured || 0) === 1,
    photos: tpArray(row.photos),
    inclusions: tpArray(row.inclusions),
    exclusions: tpArray(row.exclusions),
    itinerary: tpArray(row.itinerary)
  };
}

/* PUBLIC TOURS */
if (url.pathname === "/api/tour-packages" && request.method === "GET") {
  const featured = url.searchParams.get("featured");

  let query = "SELECT * FROM tour_packages WHERE active=1";
  const params = [];

  if (featured === "1") query += " AND featured=1";

  query += " ORDER BY sortOrder ASC, title ASC";

  const rows = await env.DB.prepare(query).bind(...params).all();
  return jsonResponse((rows.results || []).map(formatTourPackage), 200);
}

if (url.pathname.match(/^\/api\/tour-packages\/[^/]+$/) && request.method === "GET") {
  const slug = decodeURIComponent(url.pathname.split("/").pop());

  const row = await env.DB.prepare(`
    SELECT * FROM tour_packages
    WHERE slug=? AND active=1
    LIMIT 1
  `).bind(slug).first();

  if (!row) return jsonResponse({ error: "Tour not found" }, 404);
  return jsonResponse(formatTourPackage(row), 200);
}

/* ADMIN TOURS */
if (url.pathname === "/api/admin/tour-packages" && request.method === "GET") {
  await checkAdmin(request, env);

  const rows = await env.DB.prepare(
    "SELECT * FROM tour_packages ORDER BY sortOrder ASC, title ASC"
  ).all();

  return jsonResponse((rows.results || []).map(formatTourPackage), 200);
}

if (url.pathname === "/api/admin/tour-packages" && request.method === "POST") {
  await checkAdmin(request, env);
  const data = await request.json();

  if (!data.title) return jsonResponse({ error: "Tour title is required" }, 400);

  const id = data.id || `TOUR-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const slug = data.slug || tpSlug(data.title);

  await env.DB.prepare(`
    INSERT INTO tour_packages (
      id, title, slug, category, location, duration, pickupAvailable,
      basePrice, childPrice, currency,
      shortDescription, fullDescription, itinerary, inclusions, exclusions,
      mainImage, photos, active, featured, sortOrder, createdAt, updatedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(
    id,
    data.title || "",
    slug,
    data.category || "",
    data.location || "",
    data.duration || "",
    data.pickupAvailable === false ? 0 : 1,
    data.basePrice || "",
    data.childPrice || "",
    data.currency || "USD",
    data.shortDescription || "",
    data.fullDescription || "",
    JSON.stringify(tpArray(data.itinerary)),
    JSON.stringify(tpArray(data.inclusions)),
    JSON.stringify(tpArray(data.exclusions)),
    data.mainImage || "",
    JSON.stringify(tpArray(data.photos)),
    data.active === false ? 0 : 1,
    data.featured ? 1 : 0,
    Number(data.sortOrder || 0)
  ).run();

  return jsonResponse({ success: true, id, message: "Tour package added" }, 200);
}

if (url.pathname.match(/^\/api\/admin\/tour-packages\/[^/]+$/) && request.method === "PUT") {
  await checkAdmin(request, env);
  const id = decodeURIComponent(url.pathname.split("/").pop());
  const data = await request.json();

  if (!data.title) return jsonResponse({ error: "Tour title is required" }, 400);

  const slug = data.slug || tpSlug(data.title);

  await env.DB.prepare(`
    UPDATE tour_packages SET
      title=?, slug=?, category=?, location=?, duration=?, pickupAvailable=?,
      basePrice=?, childPrice=?, currency=?,
      shortDescription=?, fullDescription=?, itinerary=?, inclusions=?, exclusions=?,
      mainImage=?, photos=?, active=?, featured=?, sortOrder=?, updatedAt=datetime('now')
    WHERE id=?
  `).bind(
    data.title || "",
    slug,
    data.category || "",
    data.location || "",
    data.duration || "",
    data.pickupAvailable === false ? 0 : 1,
    data.basePrice || "",
    data.childPrice || "",
    data.currency || "USD",
    data.shortDescription || "",
    data.fullDescription || "",
    JSON.stringify(tpArray(data.itinerary)),
    JSON.stringify(tpArray(data.inclusions)),
    JSON.stringify(tpArray(data.exclusions)),
    data.mainImage || "",
    JSON.stringify(tpArray(data.photos)),
    data.active === false ? 0 : 1,
    data.featured ? 1 : 0,
    Number(data.sortOrder || 0),
    id
  ).run();

  return jsonResponse({ success: true, id, message: "Tour package updated" }, 200);
}

if (url.pathname.match(/^\/api\/admin\/tour-packages\/[^/]+$/) && request.method === "DELETE") {
  await checkAdmin(request, env);
  const id = decodeURIComponent(url.pathname.split("/").pop());

  await env.DB.prepare("DELETE FROM tour_packages WHERE id=?").bind(id).run();

  return jsonResponse({ success: true, message: "Tour package deleted" }, 200);
}
/* =========================
         VIDEO UPLOAD API
      ========================= */

      if (url.pathname === "/api/admin/upload-video" && request.method === "POST") {
        await checkAdmin(request, env);

        if (!env.IMAGES_BUCKET) {
          return jsonResponse({ error: "R2 binding IMAGES_BUCKET is not configured" }, 500);
        }

        const formData = await request.formData();
        const file = formData.get("file");
        const folder = formData.get("folder") || "review-reels";

        if (!file || typeof file.arrayBuffer !== "function") {
          return jsonResponse({ error: "No video file uploaded" }, 400);
        }

        const allowedTypes = new Set([
          "video/mp4",
          "video/webm",
          "video/quicktime"
        ]);

        const originalName = String(file.name || "travel-reel.mp4");
        const extension = originalName.includes(".")
          ? originalName.split(".").pop().toLowerCase()
          : "";

        const allowedExtensions = new Set(["mp4", "webm", "mov"]);

        if (!allowedTypes.has(file.type) && !allowedExtensions.has(extension)) {
          return jsonResponse({
            error: "Only MP4, WebM or MOV video files are allowed"
          }, 415);
        }

        const maxSize = 100 * 1024 * 1024;
        if (Number(file.size || 0) > maxSize) {
          return jsonResponse({
            error: "Video is too large. Maximum allowed size is 100 MB"
          }, 413);
        }

        const safeFolder = String(folder)
          .toLowerCase()
          .replaceAll(" ", "-")
          .replace(/[^a-z0-9\-_]/g, "") || "review-reels";

        const safeName = originalName
          .toLowerCase()
          .replaceAll(" ", "-")
          .replace(/[^a-z0-9.\-_]/g, "") || `travel-reel.${extension || "mp4"}`;

        const fileName = `${safeFolder}/${Date.now()}-${safeName}`;
        const fileBuffer = await file.arrayBuffer();

        await env.IMAGES_BUCKET.put(fileName, fileBuffer, {
          httpMetadata: {
            contentType: file.type || (extension === "webm" ? "video/webm" : extension === "mov" ? "video/quicktime" : "video/mp4"),
            cacheControl: "public, max-age=31536000, immutable"
          },
          customMetadata: {
            uploadedBy: "ceybreez-admin",
            mediaType: "travel-reel"
          }
        });

        const publicUrl =
          `https://pub-9f9a730a365d401d9d825d80c4132b82.r2.dev/${fileName}`;

        return jsonResponse({
          success: true,
          url: publicUrl,
          path: fileName,
          fileName: safeName,
          size: Number(file.size || fileBuffer.byteLength),
          contentType: file.type || "video/mp4"
        }, 200);
      }

/* =========================
         IMAGE UPLOAD API
      ========================= */

      if (url.pathname === "/api/admin/upload-image" && request.method === "POST") {
        await checkAdmin(request, env);

        const formData = await request.formData();

        const file = formData.get("file");
        const folder = formData.get("folder") || "uploads";

        if (!file) {
          return jsonResponse({ error: "No file uploaded" }, 400);
        }

        const safeFolder = String(folder)
          .toLowerCase()
          .replaceAll(" ", "-")
          .replace(/[^a-z0-9\-_]/g, "");

        const safeName = file.name
          .toLowerCase()
          .replaceAll(" ", "-")
          .replace(/[^a-z0-9.\-_]/g, "");

        const fileName = `${safeFolder}/${Date.now()}-${safeName}`;

        await env.IMAGES_BUCKET.put(
          fileName,
          await file.arrayBuffer(),
          {
            httpMetadata: {
              contentType: file.type || "image/jpeg"
            }
          }
        );

        const publicUrl =
          `https://pub-9f9a730a365d401d9d825d80c4132b82.r2.dev/${fileName}`;

        return jsonResponse({
          success: true,
          url: publicUrl,
          path: fileName
        }, 200);
      }
            /* =========================
         PAGE BUILDER - PUBLIC API
      ========================= */

      if (url.pathname === "/api/site-content" && request.method === "GET") {
        const rows = await env.DB.prepare(
          "SELECT * FROM site_content"
        ).all();

        const content = {};
        rows.results.forEach(row => {
          content[row.key] = row.value;
        });

        return jsonResponse(content, 200);
      }

      if (url.pathname === "/api/page-sections" && request.method === "GET") {
        const page = url.searchParams.get("page") || "home";

        const rows = await env.DB.prepare(
          "SELECT * FROM page_sections WHERE page=? AND active=1 ORDER BY sortOrder"
        ).bind(page).all();

        return jsonResponse(rows.results.map(formatPageSection), 200);
      }

      /* =========================
         PAGE BUILDER - ADMIN API
      ========================= */


      if (url.pathname === "/api/admin/site-content" && request.method === "POST") {
        await checkAdmin(request, env);
        const data = await request.json();

        await env.DB.prepare(`
          INSERT OR REPLACE INTO site_content (key, value)
          VALUES (?, ?)
        `).bind(
          data.key,
          data.value || ""
        ).run();

        return jsonResponse({ success: true, message: "Site content saved" }, 200);
      }

      if (url.pathname === "/api/admin/page-sections" && request.method === "GET") {
        await checkAdmin(request, env);

        const page = url.searchParams.get("page") || "home";

        const rows = await env.DB.prepare(
          "SELECT * FROM page_sections WHERE page=? ORDER BY sortOrder"
        ).bind(page).all();

        return jsonResponse(rows.results.map(formatPageSection), 200);
      }

      if (url.pathname === "/api/admin/page-sections" && request.method === "POST") {
        await checkAdmin(request, env);

        const data = await request.json();

        const id =
          data.id ||
          slugify(`${data.page || "home"}-${data.sectionKey || "section"}-${Date.now()}`);

        await env.DB.prepare(`
          INSERT OR REPLACE INTO page_sections (
            id,
            page,
            sectionKey,
            sectionType,
            title,
            subtitle,
            content,
            mediaUrl,
            backgroundType,
            backgroundColor,
            backgroundImage,
            textColor,
            headingColor,
            buttonText,
            buttonUrl,
            buttonColor,
            fontFamily,
            fontSize,
            sortOrder,
            active,
            settings,
            updatedAt
          )
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).bind(
          id,
          data.page || "home",
          data.sectionKey || "",
          data.sectionType || "custom",
          data.title || "",
          data.subtitle || "",
          data.content || "",
          data.mediaUrl || "",
          data.backgroundType || "color",
          data.backgroundColor || "",
          data.backgroundImage || "",
          data.textColor || "",
          data.headingColor || "",
          data.buttonText || "",
          data.buttonUrl || "",
          data.buttonColor || "",
          data.fontFamily || "",
          data.fontSize || "",
          Number(data.sortOrder || 0),
          data.active === false ? 0 : 1,
          JSON.stringify(data.settings || {}),
          new Date().toISOString()
        ).run();

        return jsonResponse({
          success: true,
          id,
          message: "Section saved"
        }, 200);
      }

      if (url.pathname.startsWith("/api/admin/page-sections/") && request.method === "DELETE") {
        await checkAdmin(request, env);

        const id = url.pathname.split("/").pop();

        await env.DB.prepare(
          "DELETE FROM page_sections WHERE id=?"
        ).bind(id).run();

        return jsonResponse({ success: true, message: "Section deleted" }, 200);
      }
      /* =========================
   ADMIN DESTINATIONS API
========================= */

if (url.pathname === "/api/admin/destinations" && request.method === "GET") {
  await checkAdmin(request, env);

  const rows = await env.DB.prepare(
    "SELECT * FROM destinations ORDER BY province, name"
  ).all();

  return jsonResponse(rows.results.map(formatDestination), 200);
}

if (url.pathname === "/api/admin/destinations" && request.method === "POST") {
  await checkAdmin(request, env);
  const data = await request.json();
  const id = slugify(data.id || data.name);

  if (!data.name || !data.province || !data.area) {
    return jsonResponse({ error: "Tour destination area is required" }, 400);
  }

  await env.DB.prepare(`
    INSERT INTO destinations
    (id, province, name, area, lat, lng, mapUrl, bestFor, timeNeeded, nearby, description, logoImage, photos, active, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    data.province || "",
    data.name || "",
    data.area || "",
    Number(data.lat || 0),
Number(data.lng || 0),
data.mapUrl || "",
data.bestFor || "",
    data.timeNeeded || "",
    data.nearby || "",
    data.description || "",
    data.logoImage || "",
    JSON.stringify(toArray(data.photos)),
    data.active === false ? 0 : 1,
    data.featured ? 1 : 0
  ).run();

  return jsonResponse({ success: true, id, message: "Destination added" }, 200);
}

if (url.pathname.startsWith("/api/admin/destinations/") && request.method === "PUT") {
  await checkAdmin(request, env);
  const id = url.pathname.split("/").pop();
  const data = await request.json();

  await env.DB.prepare(`
    UPDATE destinations
    SET province=?, name=?, area=?, lat=?, lng=?, mapUrl=?, bestFor=?, timeNeeded=?, nearby=?, description=?, logoImage=?, photos=?, active=?, featured=?
    WHERE id=?
  `).bind(
    data.province || "",
    data.name || "",
    data.area || "",
    Number(data.lat || 0),
    Number(data.lng || 0),
    data.mapUrl || "",
    data.bestFor || "",
    data.timeNeeded || "",
    data.nearby || "",
    data.description || "",
    data.logoImage || "",
    JSON.stringify(toArray(data.photos)),
    data.active === false ? 0 : 1,
    data.featured ? 1 : 0,
    id
  ).run();

  return jsonResponse({ success: true, message: "Destination updated" }, 200);
}

if (url.pathname.startsWith("/api/admin/destinations/") && request.method === "DELETE") {
  await checkAdmin(request, env);
  const id = url.pathname.split("/").pop();

  await env.DB.prepare("DELETE FROM destinations WHERE id=?").bind(id).run();

  return jsonResponse({ success: true, message: "Destination deleted" }, 200);
}
 /* =====================================================
   CEYBREEZ ENTERPRISE PMS - PROPERTIES ENTERPRISE ROUTES
   Replace only the old ADMIN PROPERTIES API block with this block.
===================================================== */

function peToArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}
  return String(value).split("\n").map(x => x.trim()).filter(Boolean);
}

function peSlugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `property-${Date.now()}`;
}

function peFormatProperty(row) {
  return {
    ...row,
    lat: Number(row.lat || 0),
    lng: Number(row.lng || 0),
    facilities: peToArray(row.facilities),
    photos: peToArray(row.photos),
    active: row.active === 1 || row.active === true,
    featured: row.featured === 1 || row.featured === true
  };
}

function pePropertyPayload(data, idFallback = "") {
  const id = idFallback || data.id || peSlugify(data.name || `property-${Date.now()}`);
  const slug = data.slug || peSlugify(data.name || id);
  return {
    id,
    type: data.type || "villa",
    name: data.name || "",
    location: data.location || "",
    lat: Number(data.lat || 0),
    lng: Number(data.lng || 0),
    mapUrl: data.mapUrl || "",
    mainImage: data.mainImage || "",
    logoImage: data.logoImage || "",
    price: data.price || data.basePrice || "",
    guests: data.guests || data.maxGuests || "",
    bedrooms: data.bedrooms || "",
    bathrooms: data.bathrooms || "",
    facilities: JSON.stringify(peToArray(data.facilities)),
    description: data.description || "",
    photos: JSON.stringify(peToArray(data.photos)),
    active: data.active === false ? 0 : 1,
    featured: data.featured ? 1 : 0,
    slug,
    seoTitle: data.seoTitle || data.name || "",
    seoDescription: data.seoDescription || "",
    basePrice: data.basePrice || data.price || "",
    weekendPrice: data.weekendPrice || "",
    seasonalPrice: data.seasonalPrice || "",
    cleaningFee: data.cleaningFee || "",
    extraGuestFee: data.extraGuestFee || "",
    childPrice: data.childPrice || "",
    securityDeposit: data.securityDeposit || "",
    checkInTime: data.checkInTime || "",
    checkOutTime: data.checkOutTime || "",
    beds: data.beds || "",
    maxGuests: data.maxGuests || data.guests || "",
    sortOrder: Number(data.sortOrder || 0),
    updatedAt: new Date().toISOString()
  };
}

/* =========================
   ADMIN PROPERTIES API
========================= */

if (url.pathname === "/api/admin/properties" && request.method === "GET") {
  await checkAdmin(request, env);
  const rows = await env.DB.prepare("SELECT * FROM properties ORDER BY sortOrder ASC, type, name").all();
  return jsonResponse((rows.results || []).map(peFormatProperty), 200);
}

if (url.pathname === "/api/admin/properties" && request.method === "POST") {
  await checkAdmin(request, env);
  const data = await request.json();
  if (!data.name || !data.type) return jsonResponse({ error: "Property name and type are required" }, 400);
  const p = pePropertyPayload(data);

  await env.DB.prepare(`
    INSERT INTO properties (
      id, type, name, location, lat, lng, mapUrl, mainImage, logoImage,
      price, guests, bedrooms, bathrooms, facilities, description, photos,
      active, featured, slug, seoTitle, seoDescription, basePrice, weekendPrice,
      seasonalPrice, cleaningFee, extraGuestFee, childPrice, securityDeposit,
      checkInTime, checkOutTime, beds, maxGuests, sortOrder, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    p.id, p.type, p.name, p.location, p.lat, p.lng, p.mapUrl, p.mainImage, p.logoImage,
    p.price, p.guests, p.bedrooms, p.bathrooms, p.facilities, p.description, p.photos,
    p.active, p.featured, p.slug, p.seoTitle, p.seoDescription, p.basePrice, p.weekendPrice,
    p.seasonalPrice, p.cleaningFee, p.extraGuestFee, p.childPrice, p.securityDeposit,
    p.checkInTime, p.checkOutTime, p.beds, p.maxGuests, p.sortOrder, p.updatedAt
  ).run();

  return jsonResponse({ success: true, id: p.id, message: "Property added" }, 200);
}

if (url.pathname.match(/^\/api\/admin\/properties\/[^/]+$/) && request.method === "PUT") {
  await checkAdmin(request, env);
  const id = decodeURIComponent(url.pathname.split("/").pop());
  const data = await request.json();
  if (!data.name || !data.type) return jsonResponse({ error: "Property name and type are required" }, 400);
  const p = pePropertyPayload(data, id);

  await env.DB.prepare(`
    UPDATE properties SET
      type=?, name=?, location=?, lat=?, lng=?, mapUrl=?, mainImage=?, logoImage=?,
      price=?, guests=?, bedrooms=?, bathrooms=?, facilities=?, description=?, photos=?,
      active=?, featured=?, slug=?, seoTitle=?, seoDescription=?, basePrice=?, weekendPrice=?,
      seasonalPrice=?, cleaningFee=?, extraGuestFee=?, childPrice=?, securityDeposit=?,
      checkInTime=?, checkOutTime=?, beds=?, maxGuests=?, sortOrder=?, updatedAt=?
    WHERE id=?
  `).bind(
    p.type, p.name, p.location, p.lat, p.lng, p.mapUrl, p.mainImage, p.logoImage,
    p.price, p.guests, p.bedrooms, p.bathrooms, p.facilities, p.description, p.photos,
    p.active, p.featured, p.slug, p.seoTitle, p.seoDescription, p.basePrice, p.weekendPrice,
    p.seasonalPrice, p.cleaningFee, p.extraGuestFee, p.childPrice, p.securityDeposit,
    p.checkInTime, p.checkOutTime, p.beds, p.maxGuests, p.sortOrder, p.updatedAt, id
  ).run();

  return jsonResponse({ success: true, id, message: "Property updated" }, 200);
}

if (url.pathname.match(/^\/api\/admin\/properties\/[^/]+$/) && request.method === "DELETE") {
  await checkAdmin(request, env);
  const id = decodeURIComponent(url.pathname.split("/").pop());
  await env.DB.prepare("DELETE FROM properties WHERE id=?").bind(id).run();
  return jsonResponse({ success: true, message: "Property deleted" }, 200);
}
     
      /* =========================
         PUBLIC SERVICES API
      ========================= */

      if (url.pathname === "/api/services" && request.method === "GET") {
        const category = url.searchParams.get("category") || "";
        const location = url.searchParams.get("location") || "";

        let query = "SELECT * FROM services WHERE active=1";
        const params = [];

        if (category) {
          query += " AND category=?";
          params.push(category);
        }

        if (location) {
          query += " AND location=?";
          params.push(location);
        }

        query += " ORDER BY category, location, name";

        const rows = await env.DB.prepare(query).bind(...params).all();

        return jsonResponse(rows.results.map(formatService), 200);
      }

      /* =========================
         ADMIN SERVICES API
      ========================= */

      if (url.pathname === "/api/admin/services" && request.method === "GET") {
        await checkAdmin(request, env);

        const rows = await env.DB.prepare(
          "SELECT * FROM services ORDER BY category, location, name"
        ).all();

        return jsonResponse(rows.results.map(formatService), 200);
      }

      if (url.pathname === "/api/admin/services" && request.method === "POST") {
        await checkAdmin(request, env);
        const data = await request.json();

        if (!data.name || !data.category || !data.location || !data.nearestCity) {
          return jsonResponse({ error: "Service location and nearest city are required" }, 400);
        }

        const id = data.id || slugify(`${data.category || "service"}-${data.location || "place"}-${data.name || Date.now()}`);

        await env.DB.prepare(`
          INSERT OR REPLACE INTO services
          (id, name, category, location, nearestCity, lat, lng, shortDescription, fullDescription, phone, whatsapp, website, mapUrl, openingHours, logoImage, image, photos, active, featured, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT createdAt FROM services WHERE id=?), datetime('now')), datetime('now'))
        `).bind(
          id,
          data.name || "",
          data.category || "",
          data.location || "",
          data.nearestCity || "",
          Number(data.lat || 0),
          Number(data.lng || 0),
          data.shortDescription || "",
          data.fullDescription || "",
          data.phone || "",
          data.whatsapp || "",
          data.website || "",
          data.mapUrl || "",
          data.openingHours || "",
          data.logoImage || "",
          data.image || "",
          JSON.stringify(toArray(data.photos)),
          data.active === false ? 0 : 1,
data.featured ? 1 : 0,
          id
        ).run();

        return jsonResponse({ success: true, id, message: "Service saved" }, 200);
      }

      if (url.pathname.startsWith("/api/admin/services/") && request.method === "DELETE") {
        await checkAdmin(request, env);
        const id = url.pathname.split("/").pop();

        await env.DB.prepare("DELETE FROM services WHERE id=?").bind(id).run();

        return jsonResponse({ success: true, message: "Service deleted" }, 200);
      }




      /* =========================
         V6.5 QUOTE + GUEST CONFIRMATION
      ========================= */

      if (url.pathname.match(/^\/api\/admin\/inquiries\/[^\/]+\/quote$/) && request.method === "POST") {
  await checkAdmin(request, env);

  const id = url.pathname.split("/")[4];
  const data = await request.json();

  const inquiryRow = await env.DB.prepare("SELECT * FROM inquiries WHERE id=?")
    .bind(id)
    .first();

  if (!inquiryRow) {
    return jsonResponse({ error: "Inquiry not found" }, 404);
  }

  const token = makeGuestConfirmToken(inquiryRow.id, inquiryRow.reference);
  const confirmUrl = `${publicBaseUrl(request)}/api/guest-confirm?token=${token}`;

  await env.DB.prepare(`
    UPDATE inquiries SET
      status='Quoted',
      quoteStatus='Sent',
      quoteCurrency=?,
      quoteUnitRate=?,
      quoteDiscountPercent=?,
      quoteDiscountAmount=?,
      quoteTotalAmount=?,
      quoteValidUntil=?,
      paymentStatus=?,
      advanceAmount=?,
      balanceAmount=?,
      quoteToken=?,
      adminMessage=?,
      updatedAt=datetime('now')
    WHERE id=?
  `).bind(
    data.currency || "USD",
    data.unitRate || "",
    data.discountPercent || "0",
    data.discountAmount || "0",
    data.totalAmount || "",
    data.validUntil || "",
    data.paymentStatus || "Pending",
    data.advanceAmount || "",
    data.balanceAmount || "",
    token,
    data.adminMessage || "",
    id
  ).run();

  await env.DB.prepare(`
    INSERT INTO inquiry_notes (id, inquiryId, note, createdAt)
    VALUES (?, ?, ?, datetime('now'))
  `).bind(
    `NOTE-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    id,
    `Quote / Invoice sent.
Currency: ${data.currency || "USD"}
Unit Rate: ${data.unitRate || ""}
Discount %: ${data.discountPercent || "0"}
Discount Amount: ${data.discountAmount || "0"}
Total: ${data.totalAmount || ""}
Payment Status: ${data.paymentStatus || "Pending"}
Guest confirmation link generated.`
  ).run();

  let emailSent = false;

  if (data.sendEmail !== false && inquiryRow.guestEmail) {
    const subject = `CeyBreez Quote / Invoice - ${inquiryRow.reference || id}`;

    const html = `
      <div style="font-family:Arial,sans-serif;background:#f8f3eb;padding:24px">
        <div style="max-width:680px;margin:auto;background:#fff;border-radius:18px;overflow:hidden">
          <div style="background:#0f766e;color:#fff;padding:24px;text-align:center">
            <h1 style="margin:0">Your CeyBreez Quote</h1>
            <p style="margin:8px 0 0">Reference: ${inquiryRow.reference || id}</p>
          </div>
          <div style="padding:24px;color:#222">
            <p>Dear ${inquiryRow.guestName || "Guest"},</p>
            <p>Please review your quote details below.</p>

            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:10px;border-bottom:1px solid #eee"><b>Property / Tour</b></td><td style="padding:10px;border-bottom:1px solid #eee">${inquiryRow.itemName || inquiryRow.serviceType || "-"}</td></tr>
              <tr><td style="padding:10px;border-bottom:1px solid #eee"><b>Dates</b></td><td style="padding:10px;border-bottom:1px solid #eee">${inquiryRow.dateFrom || "-"} to ${inquiryRow.dateTo || inquiryRow.dateFrom || "-"}</td></tr>
              <tr><td style="padding:10px;border-bottom:1px solid #eee"><b>Currency</b></td><td style="padding:10px;border-bottom:1px solid #eee">${data.currency || "USD"}</td></tr>
              <tr><td style="padding:10px;border-bottom:1px solid #eee"><b>Unit Rate</b></td><td style="padding:10px;border-bottom:1px solid #eee">${data.unitRate || "-"}</td></tr>
              <tr><td style="padding:10px;border-bottom:1px solid #eee"><b>Discount</b></td><td style="padding:10px;border-bottom:1px solid #eee">${data.discountPercent || "0"}% / ${data.discountAmount || "0"}</td></tr>
              <tr><td style="padding:10px;border-bottom:1px solid #eee"><b>Total</b></td><td style="padding:10px;border-bottom:1px solid #eee"><b>${data.currency || "USD"} ${data.totalAmount || "-"}</b></td></tr>
              <tr><td style="padding:10px;border-bottom:1px solid #eee"><b>Valid Until</b></td><td style="padding:10px;border-bottom:1px solid #eee">${data.validUntil || "-"}</td></tr>
            </table>

            ${data.adminMessage ? `<p style="background:#f8f3eb;padding:14px;border-radius:12px;margin-top:18px">${data.adminMessage}</p>` : ""}

            <p style="text-align:center;margin:28px 0">
              <a href="${confirmUrl}" style="background:#0f766e;color:#fff;text-decoration:none;padding:14px 24px;border-radius:999px;font-weight:bold">
                Confirm This Quote
              </a>
            </p>

            <p style="font-size:13px;color:#666">After you confirm, our admin team will double-check and send the final booking confirmation shortly.</p>
          </div>
        </div>
      </div>
    `;

    emailSent = await v72SendEmail(env, inquiryRow.guestEmail, subject, html);
  }

  return jsonResponse({
    success: true,
    emailSent,
    token,
    confirmUrl,
    message: emailSent ? "Quote saved / sent" : "Quote saved, but email was not sent"
  }, 200);
}
if (url.pathname === "/api/guest-confirm" && request.method === "GET") {
  const token = url.searchParams.get("token") || "";
  const decoded = decodeGuestConfirmToken(token);

  if (!decoded.id) {
    return new Response("<h2>Invalid confirmation link.</h2>", {
      status: 400,
      headers: { "Content-Type": "text/html;charset=utf-8", ...corsHeaders() }
    });
  }

  const row = await env.DB.prepare(`
    SELECT *
    FROM inquiries
    WHERE id=?
       OR reference=?
    LIMIT 1
  `).bind(
    decoded.id,
    decoded.reference || decoded.id
  ).first();

  if (!row) {
    return new Response("<h2>Inquiry not found.</h2>", {
      status: 404,
      headers: { "Content-Type": "text/html;charset=utf-8", ...corsHeaders() }
    });
  }

  const firstGuestConfirmation = Number(row.guestConfirmed || 0) !== 1;
  const analyticsQuoteValue = Number(row.quoteTotalAmount || 0) || 0;
  const analyticsQuoteCurrency = String(row.quoteCurrency || "USD").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3) || "USD";

  await env.DB.prepare(`
    UPDATE inquiries
    SET guestConfirmed=1,
        guestConfirmedAt=datetime('now'),
        quoteStatus='Guest Confirmed',
        updatedAt=datetime('now')
    WHERE id=?
       OR reference=?
  `).bind(
    row.id,
    row.reference || decoded.reference || decoded.id
  ).run();

  await env.DB.prepare(`
    UPDATE bookings
    SET guestConfirmed=1,
        guestConfirmedAt=datetime('now'),
        updatedAt=datetime('now')
    WHERE inquiryId=?
       OR reference=?
  `).bind(
    row.id,
    row.reference || decoded.reference || decoded.id
  ).run();

  await env.DB.prepare(`
    INSERT INTO inquiry_notes (id, inquiryId, note, createdAt)
    VALUES (?, ?, ?, datetime('now'))
  `).bind(
    `NOTE-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    row.id,
    "Guest clicked email confirmation button and confirmed the quote."
  ).run();

  const html = `
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-3QG71CWHW2"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-3QG71CWHW2', {send_page_view:false});
      ${firstGuestConfirmation ? `gtag('event','quote_confirmed',{page_location:'https://ceybreez.com/conversions/quote-confirmed',page_title:'Quote confirmed',currency:'${analyticsQuoteCurrency}',value:${analyticsQuoteValue}});` : ``}
    <\/script>
    <div style="font-family:Arial,sans-serif;background:#f8f3eb;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">
      <div style="max-width:620px;background:#fff;border-radius:20px;padding:30px;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.12)">
        <h1 style="color:#0f766e;margin:0 0 12px">Thank you!</h1>
        <h2 style="margin:0 0 12px">Your quote has been confirmed.</h2>
        <p>Reference: <b>${row.reference || row.id}</b></p>
        <p>Our admin team will check availability/payment status and send the final booking confirmation shortly.</p>
        <p style="margin-top:24px;color:#666">CeyBreez</p>
      </div>
    </div>
  `;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html;charset=utf-8", ...corsHeaders() }
  });
}
      /* =========================
         REVIEWS API
      ========================= */

      if (url.pathname === "/api/reviews" && request.method === "GET") {
        const type = url.searchParams.get("type") || "";
        const featured = url.searchParams.get("featured") || "";

        let query = "SELECT * FROM reviews WHERE active=1";
        const params = [];

        if (type) {
          query += " AND type=?";
          params.push(type);
        }

        if (featured === "1") {
          query += " AND featured=1";
        }

        query += " ORDER BY featured DESC, createdAt DESC";

        const rows = await env.DB.prepare(query).bind(...params).all();

        return jsonResponse((rows.results || []).map(formatReview), 200);
      }

      if (url.pathname === "/api/admin/reviews" && request.method === "GET") {
        await checkAdmin(request, env);

        const rows = await env.DB.prepare(
          "SELECT * FROM reviews ORDER BY createdAt DESC"
        ).all();

        return jsonResponse((rows.results || []).map(formatReview), 200);
      }

      if (url.pathname === "/api/admin/reviews" && request.method === "POST") {
        await checkAdmin(request, env);
        const data = await request.json();

        if (!data.itemName || !data.guestName || !data.message) {
          return jsonResponse({ error: "Item name, guest name and message are required" }, 400);
        }

        const id = data.id || `REV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        await env.DB.prepare(`
          INSERT INTO reviews (
            id, type, itemName, guestName, country, rating, title, message,
            guestPhoto, source, sourceUrl, active, featured, createdAt, updatedAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT createdAt FROM reviews WHERE id=?), datetime('now')), datetime('now'))
          ON CONFLICT(id)
          DO UPDATE SET
            type=excluded.type,
            itemName=excluded.itemName,
            guestName=excluded.guestName,
            country=excluded.country,
            rating=excluded.rating,
            title=excluded.title,
            message=excluded.message,
            guestPhoto=excluded.guestPhoto,
            source=excluded.source,
            sourceUrl=excluded.sourceUrl,
            active=excluded.active,
            featured=excluded.featured,
            updatedAt=datetime('now')
        `).bind(
          id,
          data.type || "property",
          data.itemName || "",
          data.guestName || "",
          data.country || "",
          Number(data.rating || 5),
          data.title || "",
          data.message || "",
          data.guestPhoto || "",
          data.source || "Manual",
          data.sourceUrl || "",
          data.active === false ? 0 : 1,
          data.featured ? 1 : 0,
          id
        ).run();

        return jsonResponse({ success: true, id, message: "Review saved" }, 200);
      }

      if (url.pathname.startsWith("/api/admin/reviews/") && request.method === "DELETE") {
        await checkAdmin(request, env);
        const id = url.pathname.split("/").pop();

        await env.DB.prepare("DELETE FROM reviews WHERE id=?").bind(id).run();

        return jsonResponse({ success: true, message: "Review deleted" }, 200);
      }

      /* =========================
         ROUTE TEST
      ========================= */

      if (url.pathname === "/route-test") {
        const testCoordinates = [
          [79.888084, 7.174459],
          [80.751209, 7.957650],
          [80.460628, 5.944642]
        ];

        const orsResponse = await fetch(
          "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
          {
            method: "POST",
            headers: {
              "Authorization": env.ORS_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              coordinates: testCoordinates,
              instructions: false,
              radiuses: testCoordinates.map(() => 15000)
            }),
          }
        );

        const orsText = await orsResponse.text();

        return new Response(orsText, {
          status: orsResponse.status,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(),
          },
        });
      }

      /* =========================
         ROUTE API
      ========================= */

      if (url.pathname === "/route" && request.method === "POST") {
        const data = await request.json();

        if (!data.coordinates || !Array.isArray(data.coordinates) || data.coordinates.length < 2) {
          return jsonResponse({ error: "At least 2 coordinates are required." }, 400);
        }

        const orsResponse = await fetch(
          "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
          {
            method: "POST",
            headers: {
              "Authorization": env.ORS_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              coordinates: data.coordinates,
              instructions: false,
              radiuses: data.coordinates.map(() => 15000)
            }),
          }
        );

        const orsResult = await orsResponse.json();

        if (!orsResponse.ok) {
          return jsonResponse({
            status: orsResponse.status,
            message: "OpenRouteService error",
            details: orsResult
          }, 400);
        }

        return jsonResponse(orsResult, 200);
      }
/* =========================
   ADMIN INQUIRIES API
========================= */

if (url.pathname === "/api/admin/inquiries" && request.method === "GET") {
  await checkAdmin(request, env);

  const rows = await env.DB.prepare(
    "SELECT * FROM inquiries ORDER BY createdAt DESC"
  ).all();

  return jsonResponse(rows.results, 200);
}

if (url.pathname.startsWith("/api/admin/inquiries/") && request.method === "PUT") {
  await checkAdmin(request, env);

  const parts = url.pathname.split("/");
  const id = parts[parts.length - 2];
  const action = parts[parts.length - 1];

  if (action !== "status") {
    return jsonResponse({ error: "Invalid inquiry action" }, 400);
  }

  const data = await request.json();
  const newStatus = data.status || "New";
  const adminMessage = data.adminMessage || "";

  const inquiry = await env.DB.prepare(`
    SELECT *
    FROM inquiries
    WHERE id=?
    LIMIT 1
  `).bind(id).first();

  if (!inquiry) {
    return jsonResponse({ error: "Inquiry not found" }, 404);
  }

  await env.DB.prepare(`
    UPDATE inquiries
    SET status=?, updatedAt=datetime('now')
    WHERE id=?
  `).bind(
    newStatus,
    id
  ).run();

  await env.DB.prepare(`
    UPDATE bookings
    SET status=?, updatedAt=datetime('now')
    WHERE inquiryId=?
       OR reference=?
  `).bind(
    newStatus,
    id,
    inquiry.reference || id
  ).run();

  const relatedBooking = await env.DB.prepare(`
    SELECT *
    FROM bookings
    WHERE inquiryId=?
       OR reference=?
    ORDER BY updatedAt DESC, createdAt DESC
    LIMIT 1
  `).bind(
    id,
    inquiry.reference || id
  ).first();

  let emailResult = null;

  if (data.sendEmail && inquiry.guestEmail) {
    emailResult = await sendResendEmail(env, {
      to: inquiry.guestEmail,
      subject: `CeyBreez ${newStatus} Update - ${inquiry.reference || id}`,
      html: buildStatusEmail({
        ...inquiry,
        ...(relatedBooking || {}),
        status: newStatus,
        adminMessage
      }),
      reply_to: "ceybreez@gmail.com"
    });
  }

  return jsonResponse({
    success: true,
    email: emailResult,
    message: "Inquiry and related booking status updated"
  }, 200);
}

/* =========================
   ADMIN INQUIRY NOTES API
========================= */

if (url.pathname.match(/^\/api\/admin\/inquiries\/[^/]+\/notes$/) && request.method === "GET") {
  await checkAdmin(request, env);

  const parts = url.pathname.split("/");
  const inquiryId = parts[4];

  const rows = await env.DB.prepare(
    "SELECT * FROM inquiry_notes WHERE inquiryId=? ORDER BY createdAt DESC"
  ).bind(inquiryId).all();

  return jsonResponse(rows.results || [], 200);
}

if (url.pathname.match(/^\/api\/admin\/inquiries\/[^/]+\/notes$/) && request.method === "POST") {
  await checkAdmin(request, env);

  const parts = url.pathname.split("/");
  const inquiryId = parts[4];
  const data = await request.json();

  const id = `NOTE-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  await env.DB.prepare(`
    INSERT INTO inquiry_notes (id, inquiryId, note, createdAt)
    VALUES (?, ?, ?, datetime('now'))
  `).bind(
    id,
    inquiryId,
    data.note || ""
  ).run();

  return jsonResponse({ success: true, id }, 200);
}
 /*=====================================================
   CEYBREEZ ENTERPRISE PMS - FINANCE COMPLETE ROUTES
   Remove the older FINANCE API - SPRINT 1 block first.
   Paste this block BEFORE the existing BOOKINGS API block.
===================================================== */

function financeNumber(value) {
  const n = Number(String(value ?? "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function financeDateOnly(value) {
  return String(value || new Date().toISOString()).slice(0, 10);
}

function financeReceiptNo(kind, id, dateValue) {
  const prefix = kind === "Refund" ? "REF" : "RCPT";
  const d = financeDateOnly(dateValue).replaceAll("-", "");
  const tail = String(id || Date.now()).replace(/[^0-9]/g, "").slice(-5).padStart(5, "0");
  return `${prefix}-${d}-${tail}`;
}

async function financeRecalculateBooking(env, bookingId) {
  const booking = await env.DB.prepare("SELECT * FROM bookings WHERE id=? LIMIT 1").bind(bookingId).first();
  if (!booking) return null;

  const sums = await env.DB.prepare(`
    SELECT
      COALESCE((SELECT SUM(amount) FROM payments WHERE bookingId=?), 0) AS paidAmount,
      COALESCE((SELECT SUM(amount) FROM refunds WHERE bookingId=?), 0) AS refundAmount
  `).bind(bookingId, bookingId).first();

  const totalAmount = financeNumber(booking.totalAmount);
  const paidAmount = financeNumber(sums?.paidAmount);
  const refundAmount = financeNumber(sums?.refundAmount);
  const adjustedTotal = Math.max(totalAmount - refundAmount, 0);
const balanceAmount = Math.max(adjustedTotal - paidAmount, 0);
  const paymentStatus = refundAmount > 0 && balanceAmount > 0
    ? "Refunded / Partial"
    : refundAmount > 0 && balanceAmount <= 0
      ? "Refunded"
      : totalAmount > 0 && balanceAmount <= 0
        ? "Paid"
        : paidAmount > 0
          ? "Partial"
          : "Pending";

  const firstPayment = await env.DB.prepare(`
    SELECT amount FROM payments WHERE bookingId=? ORDER BY paymentDate ASC, createdAt ASC LIMIT 1
  `).bind(bookingId).first();

  await env.DB.prepare(`
    UPDATE bookings SET
      advanceAmount=?,
      balanceAmount=?,
      paymentStatus=?,
      updatedAt=datetime('now')
    WHERE id=?
  `).bind(String(firstPayment?.amount || ""), String(balanceAmount), paymentStatus, bookingId).run();

  await env.DB.prepare(`
  UPDATE inquiries SET
    advanceAmount=?,
    balanceAmount=?,
    paymentStatus=?,
    updatedAt=datetime('now')
  WHERE id=?
     OR reference=?
`).bind(
  String(firstPayment?.amount || ""),
  String(balanceAmount),
  paymentStatus,
  booking.inquiryId || "",
  booking.reference || booking.inquiryId || ""
).run();

  return { booking, paidAmount, refundAmount, balanceAmount, paymentStatus };
}

async function financeHistoryPayload(env, bookingId) {
  const booking = await env.DB.prepare("SELECT * FROM bookings WHERE id=? LIMIT 1").bind(bookingId).first();
  if (!booking) return null;

  const paymentsRows = await env.DB.prepare(`
    SELECT p.*, 'Payment' AS kind
    FROM payments p
    WHERE p.bookingId=?
    ORDER BY p.paymentDate ASC, p.createdAt ASC
  `).bind(bookingId).all();

  const refundsRows = await env.DB.prepare(`
    SELECT r.*, 'Refund' AS kind, r.refundDate AS paymentDate, r.reason AS paymentType, '' AS transactionNo
    FROM refunds r
    WHERE r.bookingId=?
    ORDER BY r.refundDate ASC, r.createdAt ASC
  `).bind(bookingId).all();

  const items = [...(paymentsRows.results || []), ...(refundsRows.results || [])]
    .sort((a, b) => String(a.paymentDate || a.refundDate || a.createdAt || '').localeCompare(String(b.paymentDate || b.refundDate || b.createdAt || '')))
    .map(x => ({
      ...x,
      receiptNo: financeReceiptNo(x.kind, x.id, x.paymentDate || x.refundDate || x.createdAt)
    }));

  const paidAmount = items.filter(x => x.kind === "Payment").reduce((s, x) => s + financeNumber(x.amount), 0);
  const refundAmount = items.filter(x => x.kind === "Refund").reduce((s, x) => s + financeNumber(x.amount), 0);
  const totalAmount = financeNumber(booking.totalAmount);
  const adjustedTotal = Math.max(totalAmount - refundAmount, 0);
const outstanding = Math.max(adjustedTotal - paidAmount, 0);

  return { booking, items, summary: { totalAmount, paidAmount, refundAmount, outstanding, currency: booking.currency || "USD" } };
}

if (url.pathname === "/api/admin/finance/summary" && request.method === "GET") {
  await checkAdmin(request, env);

  const bookingsRows = await env.DB.prepare(`
    SELECT
      b.*,
      COALESCE((SELECT SUM(amount) FROM payments WHERE bookingId=b.id), 0) AS paidAmount,
      COALESCE((SELECT SUM(amount) FROM refunds WHERE bookingId=b.id), 0) AS refundAmount,
      COALESCE((SELECT paymentMethod FROM payments WHERE bookingId=b.id ORDER BY paymentDate DESC, createdAt DESC LIMIT 1), '') AS lastPaymentMethod
    FROM bookings b
    ORDER BY b.createdAt DESC
  `).all();

  const paymentsRows = await env.DB.prepare(`
    SELECT p.*, 'Payment' AS kind, b.reference AS bookingReference, b.guestName, b.itemName, b.serviceType
    FROM payments p LEFT JOIN bookings b ON b.id=p.bookingId
    ORDER BY p.paymentDate DESC, p.createdAt DESC LIMIT 100
  `).all();

  const refundsRows = await env.DB.prepare(`
    SELECT r.*, 'Refund' AS kind, b.reference AS bookingReference, b.guestName, b.itemName, b.serviceType
    FROM refunds r LEFT JOIN bookings b ON b.id=r.bookingId
    ORDER BY r.refundDate DESC, r.createdAt DESC LIMIT 100
  `).all();

  const bookings = bookingsRows.results || [];
  const payments = (paymentsRows.results || []).map(x => ({ ...x, receiptNo: financeReceiptNo("Payment", x.id, x.paymentDate || x.createdAt) }));
  const refunds = (refundsRows.results || []).map(x => ({ ...x, receiptNo: financeReceiptNo("Refund", x.id, x.refundDate || x.createdAt) }));
  const history = [...payments, ...refunds]
    .sort((a, b) => String(b.paymentDate || b.refundDate || b.createdAt || '').localeCompare(String(a.paymentDate || a.refundDate || a.createdAt || '')))
    .slice(0, 100);

  const totalBookingValue = bookings.reduce((sum, b) => sum + financeNumber(b.totalAmount), 0);
  const totalReceived = bookings.reduce((sum, b) => sum + financeNumber(b.paidAmount), 0);
  const totalRefunded = bookings.reduce((sum, b) => sum + financeNumber(b.refundAmount), 0);
  const outstanding = bookings.reduce((sum, b) => {
  const total = financeNumber(b.totalAmount);
  const paid = financeNumber(b.paidAmount);
  const refunded = financeNumber(b.refundAmount);
  return sum + Math.max(total - Math.max(paid - refunded, 0), 0);
}, 0);
  const currency = bookings.find(b => b.currency)?.currency || "USD";

  return jsonResponse({ bookings, payments, refunds, history, totals: { currency, totalBookingValue, totalReceived, totalRefunded, outstanding } }, 200);
}

if (url.pathname.match(/^\/api\/admin\/finance\/history\/[^/]+$/) && request.method === "GET") {
  await checkAdmin(request, env);
  const bookingId = decodeURIComponent(url.pathname.split("/").pop());
  const payload = await financeHistoryPayload(env, bookingId);
  if (!payload) return jsonResponse({ error: "Booking not found" }, 404);
  return jsonResponse(payload, 200);
}

if (url.pathname === "/api/admin/finance/payments" && request.method === "POST") {
  await checkAdmin(request, env);
  const data = await request.json();
  if (!data.bookingId) return jsonResponse({ error: "bookingId is required" }, 400);
  const amount = financeNumber(data.amount);
  if (amount <= 0) return jsonResponse({ error: "Valid payment amount is required" }, 400);
  const booking = await env.DB.prepare("SELECT * FROM bookings WHERE id=? LIMIT 1").bind(data.bookingId).first();
  if (!booking) return jsonResponse({ error: "Booking not found" }, 404);
  const id = data.id || `PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const paymentDate = data.paymentDate || new Date().toISOString().slice(0, 10);
  const currency = data.currency || booking.currency || "USD";
  await env.DB.prepare(`
    INSERT INTO payments (id, bookingId, reference, paymentDate, paymentType, paymentMethod, currency, amount, exchangeRate, receivedBy, transactionNo, remarks, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(id, data.bookingId, booking.reference || data.reference || "", paymentDate, data.paymentType || "Payment", data.paymentMethod || "Cash", currency, amount, financeNumber(data.exchangeRate || 1), data.receivedBy || "Admin", data.transactionNo || "", data.remarks || "").run();
  const recalc = await financeRecalculateBooking(env, data.bookingId);
  return jsonResponse({ success: true, id, receiptNo: financeReceiptNo("Payment", id, paymentDate), ...recalc }, 200);
}

if (url.pathname.match(/^\/api\/admin\/finance\/payments\/[^/]+$/) && request.method === "PUT") {
  await checkAdmin(request, env);
  const id = decodeURIComponent(url.pathname.split("/").pop());
  const data = await request.json();
  const row = await env.DB.prepare("SELECT * FROM payments WHERE id=? LIMIT 1").bind(id).first();
  if (!row) return jsonResponse({ error: "Payment not found" }, 404);
  const amount = financeNumber(data.amount);
  if (amount <= 0) return jsonResponse({ error: "Valid payment amount is required" }, 400);
  await env.DB.prepare(`
    UPDATE payments SET paymentDate=?, paymentType=?, paymentMethod=?, currency=?, amount=?, exchangeRate=?, receivedBy=?, transactionNo=?, remarks=?, updatedAt=datetime('now') WHERE id=?
  `).bind(data.paymentDate || row.paymentDate || new Date().toISOString().slice(0,10), data.paymentType || row.paymentType || "Payment", data.paymentMethod || row.paymentMethod || "Cash", data.currency || row.currency || "USD", amount, financeNumber(data.exchangeRate || row.exchangeRate || 1), data.receivedBy || row.receivedBy || "Admin", data.transactionNo || "", data.remarks || "", id).run();
  const recalc = await financeRecalculateBooking(env, row.bookingId);
  return jsonResponse({ success: true, id, ...recalc }, 200);
}

if (url.pathname.match(/^\/api\/admin\/finance\/payments\/[^/]+$/) && request.method === "DELETE") {
  await checkAdmin(request, env);
  const id = decodeURIComponent(url.pathname.split("/").pop());
  const row = await env.DB.prepare("SELECT * FROM payments WHERE id=? LIMIT 1").bind(id).first();
  if (!row) return jsonResponse({ error: "Payment not found" }, 404);
  await env.DB.prepare("DELETE FROM payments WHERE id=?").bind(id).run();
  const recalc = await financeRecalculateBooking(env, row.bookingId);
  return jsonResponse({ success: true, id, ...recalc }, 200);
}

if (url.pathname === "/api/admin/finance/refunds" && request.method === "POST") {
  await checkAdmin(request, env);
  const data = await request.json();
  if (!data.bookingId) return jsonResponse({ error: "bookingId is required" }, 400);
  const amount = financeNumber(data.amount);
  if (amount <= 0) return jsonResponse({ error: "Valid refund amount is required" }, 400);
  const booking = await env.DB.prepare("SELECT * FROM bookings WHERE id=? LIMIT 1").bind(data.bookingId).first();
  if (!booking) return jsonResponse({ error: "Booking not found" }, 404);
  const id = data.id || `REF-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const refundDate = data.refundDate || data.paymentDate || new Date().toISOString().slice(0, 10);
  const currency = data.currency || booking.currency || "USD";
  await env.DB.prepare(`
    INSERT INTO refunds (id, bookingId, reference, refundDate, amount, paymentMethod, currency, reason, approvedBy, remarks, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(id, data.bookingId, booking.reference || data.reference || "", refundDate, amount, data.paymentMethod || "Cash", currency, data.reason || data.remarks || "Refund", data.approvedBy || "Admin", data.remarks || "").run();
  const recalc = await financeRecalculateBooking(env, data.bookingId);
  return jsonResponse({ success: true, id, receiptNo: financeReceiptNo("Refund", id, refundDate), ...recalc }, 200);
}
if (url.pathname === "/api/admin/finance/adjustments" && request.method === "POST") {
  await checkAdmin(request, env);
  const data = await request.json();

  if (!data.bookingId) return jsonResponse({ error: "bookingId is required" }, 400);

  const amount = financeNumber(data.amount);
  if (amount <= 0) return jsonResponse({ error: "Valid adjustment amount is required" }, 400);

  const booking = await env.DB.prepare("SELECT * FROM bookings WHERE id=? LIMIT 1")
    .bind(data.bookingId)
    .first();

  if (!booking) return jsonResponse({ error: "Booking not found" }, 404);

  const id = data.id || `ADJ-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const adjustmentDate = data.adjustmentDate || data.paymentDate || new Date().toISOString().slice(0, 10);
  const currency = data.currency || booking.currency || "USD";
  const adjustmentType = data.adjustmentType || "Decrease";

  await env.DB.prepare(`
    INSERT INTO booking_adjustments
    (id, bookingId, reference, adjustmentDate, adjustmentType, currency, amount, reason, remarks, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(
    id,
    data.bookingId,
    booking.reference || "",
    adjustmentDate,
    adjustmentType,
    currency,
    amount,
    data.reason || "Booking total adjustment",
    data.remarks || ""
  ).run();

  const currentTotal = financeNumber(booking.totalAmount);
  const newTotal = adjustmentType === "Increase"
    ? currentTotal + amount
    : Math.max(currentTotal - amount, 0);

  await env.DB.prepare(`
    UPDATE bookings
    SET totalAmount=?,
        updatedAt=datetime('now')
    WHERE id=?
  `).bind(String(newTotal), data.bookingId).run();

  await env.DB.prepare(`
    UPDATE inquiries
    SET quoteTotalAmount=?,
        updatedAt=datetime('now')
    WHERE id=?
       OR reference=?
  `).bind(
    String(newTotal),
    booking.inquiryId || "",
    booking.reference || ""
  ).run();

  const recalc = await financeRecalculateBooking(env, data.bookingId);

  return jsonResponse({
    success: true,
    id,
    newTotal,
    message: "Booking adjustment saved",
    ...recalc
  }, 200);
}
if (url.pathname === "/api/admin/finance/commissions" && request.method === "POST") {
  await checkAdmin(request, env);
  const data = await request.json();

  if (!data.bookingId) return jsonResponse({ error: "bookingId is required" }, 400);
  if (!data.agentName) return jsonResponse({ error: "agentName is required" }, 400);

  const booking = await env.DB.prepare("SELECT * FROM bookings WHERE id=? LIMIT 1")
    .bind(data.bookingId)
    .first();

  if (!booking) return jsonResponse({ error: "Booking not found" }, 404);

  const total = financeNumber(booking.totalAmount);
  const percent = financeNumber(data.percent);
  const amount = data.commissionType === "Percent"
    ? Number(((total * percent) / 100).toFixed(2))
    : financeNumber(data.amount);

  if (amount <= 0) return jsonResponse({ error: "Valid commission amount is required" }, 400);

  const id = data.id || `COM-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const commissionDate = data.commissionDate || data.paymentDate || new Date().toISOString().slice(0, 10);

  await env.DB.prepare(`
    INSERT INTO agent_commissions
    (id, bookingId, reference, agentName, commissionDate, commissionType, currency, amount, percent, paymentStatus, paidDate, paymentMethod, remarks, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(
    id,
    data.bookingId,
    booking.reference || "",
    data.agentName,
    commissionDate,
    data.commissionType || "Fixed",
    data.currency || booking.currency || "USD",
    amount,
    percent,
    data.paymentStatus || "Pending",
    data.paidDate || "",
    data.paymentMethod || "",
    data.remarks || ""
  ).run();

  return jsonResponse({
    success: true,
    id,
    amount,
    message: "Agent commission saved"
  }, 200);
}

if (url.pathname.match(/^\/api\/admin\/finance\/refunds\/[^/]+$/) && request.method === "PUT") {
  await checkAdmin(request, env);
  const id = decodeURIComponent(url.pathname.split("/").pop());
  const data = await request.json();
  const row = await env.DB.prepare("SELECT * FROM refunds WHERE id=? LIMIT 1").bind(id).first();
  if (!row) return jsonResponse({ error: "Refund not found" }, 404);
  const amount = financeNumber(data.amount);
  if (amount <= 0) return jsonResponse({ error: "Valid refund amount is required" }, 400);
  await env.DB.prepare(`
    UPDATE refunds SET refundDate=?, amount=?, paymentMethod=?, currency=?, reason=?, approvedBy=?, remarks=?, updatedAt=datetime('now') WHERE id=?
  `).bind(data.refundDate || data.paymentDate || row.refundDate || new Date().toISOString().slice(0,10), amount, data.paymentMethod || row.paymentMethod || "Cash", data.currency || row.currency || "USD", data.reason || data.remarks || row.reason || "Refund", data.approvedBy || row.approvedBy || "Admin", data.remarks || "", id).run();
  const recalc = await financeRecalculateBooking(env, row.bookingId);
  return jsonResponse({ success: true, id, ...recalc }, 200);
}

if (url.pathname.match(/^\/api\/admin\/finance\/refunds\/[^/]+$/) && request.method === "DELETE") {
  await checkAdmin(request, env);
  const id = decodeURIComponent(url.pathname.split("/").pop());
  const row = await env.DB.prepare("SELECT * FROM refunds WHERE id=? LIMIT 1").bind(id).first();
  if (!row) return jsonResponse({ error: "Refund not found" }, 404);
  await env.DB.prepare("DELETE FROM refunds WHERE id=?").bind(id).run();
  const recalc = await financeRecalculateBooking(env, row.bookingId);
  return jsonResponse({ success: true, id, ...recalc }, 200);
}

if (url.pathname.match(/^\/api\/admin\/finance\/receipt\/(Payment|Refund)\/[^/]+$/) && request.method === "GET") {
  await checkAdmin(request, env);
  const parts = url.pathname.split("/");
  const kind = parts[5];
  const id = decodeURIComponent(parts[6]);
  const row = kind === "Payment"
    ? await env.DB.prepare("SELECT p.*, b.guestName, b.itemName, b.dateFrom, b.dateTo FROM payments p LEFT JOIN bookings b ON b.id=p.bookingId WHERE p.id=? LIMIT 1").bind(id).first()
    : await env.DB.prepare("SELECT r.*, b.guestName, b.itemName, b.dateFrom, b.dateTo FROM refunds r LEFT JOIN bookings b ON b.id=r.bookingId WHERE r.id=? LIMIT 1").bind(id).first();
  if (!row) return new Response("Receipt not found", { status: 404 });
  const dateValue = row.paymentDate || row.refundDate || row.createdAt;
  const receiptNo = financeReceiptNo(kind, row.id, dateValue);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${receiptNo}</title><style>body{font-family:Arial,sans-serif;background:#f8f3eb;padding:30px}.box{max-width:760px;margin:auto;background:#fff;border-radius:18px;padding:30px;border:1px solid #e5dfd2}.head{display:flex;justify-content:space-between;border-bottom:2px solid #0f766e;padding-bottom:18px;margin-bottom:22px}.brand{font-size:28px;color:#0f766e;font-weight:700}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.item{background:#f8fafc;padding:12px;border-radius:10px}.amount{font-size:32px;color:#0f766e;font-weight:700;text-align:center;margin:24px 0}.print{margin-top:25px;text-align:center}@media print{button{display:none}body{background:#fff;padding:0}.box{border:none}}</style></head><body><div class="box"><div class="head"><div><div class="brand">CeyBreez</div><p>Stay. Taste. Explore Sri Lanka.</p></div><div><h2>${kind} Receipt</h2><strong>${receiptNo}</strong></div></div><div class="grid"><div class="item"><b>Reference</b><br>${row.reference || '-'}</div><div class="item"><b>Date</b><br>${dateValue || '-'}</div><div class="item"><b>Guest</b><br>${row.guestName || '-'}</div><div class="item"><b>Property / Tour</b><br>${row.itemName || '-'}</div><div class="item"><b>Method</b><br>${row.paymentMethod || '-'}</div><div class="item"><b>Transaction No.</b><br>${row.transactionNo || '-'}</div></div><div class="amount">${row.currency || 'USD'} ${financeNumber(row.amount).toFixed(2)}</div><p><b>Remarks:</b> ${row.remarks || row.reason || '-'}</p><div class="print"><button onclick="window.print()">Print / Save PDF</button></div></div></body></html>`;
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html;charset=utf-8" } });
}

if (url.pathname === "/api/admin/finance/export/csv" && request.method === "GET") {
  await checkAdmin(request, env);
  const rows = await env.DB.prepare(`
    SELECT 'Payment' AS type, p.paymentDate AS date, p.reference, b.guestName, b.itemName, p.paymentMethod, p.currency, p.amount, p.remarks
    FROM payments p LEFT JOIN bookings b ON b.id=p.bookingId
    UNION ALL
    SELECT 'Refund' AS type, r.refundDate AS date, r.reference, b.guestName, b.itemName, r.paymentMethod, r.currency, r.amount, r.remarks
    FROM refunds r LEFT JOIN bookings b ON b.id=r.bookingId
    ORDER BY date DESC
  `).all();
  const esc = v => `"${String(v ?? '').replaceAll('"','""')}"`;
  const csv = ["Type,Date,Reference,Guest,Item,Method,Currency,Amount,Remarks", ...(rows.results || []).map(r => [r.type,r.date,r.reference,r.guestName,r.itemName,r.paymentMethod,r.currency,r.amount,r.remarks].map(esc).join(','))].join("\n");
  return new Response(csv, { status: 200, headers: { "Content-Type": "text/csv;charset=utf-8", "Content-Disposition": `attachment; filename="ceybreez-finance-${new Date().toISOString().slice(0,10)}.csv"`, ...corsHeaders() } });
}
/* =====================================================
   CEYBREEZ ENTERPRISE PMS - FINANCE FINAL 2% ROUTES
   Paste this block AFTER finance_complete_routes.js and BEFORE BOOKINGS API.
   Adds: Invoice HTML/PDF print, receipt email, invoice email.
===================================================== */

function fc2Escape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fc2Number(value) {
  const n = Number(String(value ?? "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function fc2DateOnly(value) {
  return String(value || new Date().toISOString()).slice(0, 10);
}

function fc2ReceiptNo(kind, id, dateValue) {
  const prefix = kind === "Refund" ? "REF" : "RCPT";
  const d = fc2DateOnly(dateValue).replaceAll("-", "");
  const tail = String(id || Date.now()).replace(/[^0-9]/g, "").slice(-5).padStart(5, "0");
  return `${prefix}-${d}-${tail}`;
}

function fc2InvoiceNo(booking) {
  const d = fc2DateOnly(booking.createdAt || booking.dateFrom || new Date().toISOString()).replaceAll("-", "");
  const tail = String(booking.id || booking.reference || Date.now()).replace(/[^0-9]/g, "").slice(-5).padStart(5, "0");
  return `INV-${d}-${tail}`;
}

async function fc2SendEmail(env, { to, subject, html, reply_to }) {
  if (!to) return { success: false, error: "Missing guest email" };

  if (typeof sendResendEmail === "function") {
    return await sendResendEmail(env, { to, subject, html, reply_to: reply_to || "ceybreez@gmail.com" });
  }

  if (!env.RESEND_API_KEY) return { success: false, error: "RESEND_API_KEY missing" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL || "CeyBreez <inquiry@ceybreez.com>",
      to: [to],
      subject,
      html,
      reply_to: reply_to || "ceybreez@gmail.com"
    })
  });

  const result = await response.json().catch(() => ({}));
  return { success: response.ok, status: response.status, result };
}

async function fc2BookingInvoicePayload(env, bookingId) {
  const booking = await env.DB.prepare("SELECT * FROM bookings WHERE id=? LIMIT 1").bind(bookingId).first();
  if (!booking) return null;

  const paymentsRows = await env.DB.prepare(`
    SELECT p.*, 'Payment' AS kind
    FROM payments p
    WHERE p.bookingId=?
    ORDER BY p.paymentDate ASC, p.createdAt ASC
  `).bind(bookingId).all();

  const refundsRows = await env.DB.prepare(`
    SELECT r.*, 'Refund' AS kind, r.refundDate AS paymentDate, r.reason AS paymentType, '' AS transactionNo
    FROM refunds r
    WHERE r.bookingId=?
    ORDER BY r.refundDate ASC, r.createdAt ASC
  `).bind(bookingId).all();

  const items = [...(paymentsRows.results || []), ...(refundsRows.results || [])]
    .sort((a, b) => String(a.paymentDate || a.refundDate || a.createdAt || "").localeCompare(String(b.paymentDate || b.refundDate || b.createdAt || "")))
    .map(x => ({ ...x, receiptNo: fc2ReceiptNo(x.kind, x.id, x.paymentDate || x.refundDate || x.createdAt) }));

  const paidAmount = items.filter(x => x.kind === "Payment").reduce((s, x) => s + fc2Number(x.amount), 0);
  const refundAmount = items.filter(x => x.kind === "Refund").reduce((s, x) => s + fc2Number(x.amount), 0);
  const totalAmount = fc2Number(booking.totalAmount);
  const outstanding = Math.max(totalAmount - Math.max(paidAmount - refundAmount, 0), 0);
  const currency = booking.currency || "USD";

  return { booking, items, summary: { totalAmount, paidAmount, refundAmount, outstanding, currency } };
}

function fc2InvoiceHtml(payload) {
  const { booking, items, summary } = payload;
  const invoiceNo = fc2InvoiceNo(booking);
  const currency = summary.currency || booking.currency || "USD";
  const rows = items.length
    ? items.map(x => `
      <tr>
        <td>${fc2Escape(fc2DateOnly(x.paymentDate || x.refundDate || x.createdAt))}</td>
        <td>${fc2Escape(x.kind)}</td>
        <td>${fc2Escape(x.paymentType || x.reason || "-")}</td>
        <td>${fc2Escape(x.receiptNo || x.transactionNo || x.id || "-")}</td>
        <td>${fc2Escape(x.paymentMethod || "-")}</td>
        <td style="text-align:right">${x.kind === "Refund" ? "-" : "+"}${fc2Escape(currency)} ${fc2Number(x.amount).toFixed(2)}</td>
      </tr>`).join("")
    : `<tr><td colspan="6" style="text-align:center;color:#777;padding:18px">No payments or refunds recorded.</td></tr>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${fc2Escape(invoiceNo)}</title>
  <style>
    body{font-family:Arial,sans-serif;background:#f8f3eb;padding:30px;color:#111827}.box{max-width:900px;margin:auto;background:#fff;border-radius:18px;padding:30px;border:1px solid #e5dfd2}.head{display:flex;justify-content:space-between;gap:18px;border-bottom:2px solid #0f766e;padding-bottom:18px;margin-bottom:22px}.brand{font-size:30px;color:#0f766e;font-weight:700}.muted{color:#667085}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:18px 0}.item{background:#f8fafc;padding:12px;border-radius:10px}.totals{max-width:360px;margin-left:auto;margin-top:22px}.totals div{display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding:10px 0}.totals .due{font-size:22px;color:#0f766e;font-weight:700}table{width:100%;border-collapse:collapse;margin-top:22px}th,td{border-bottom:1px solid #e5e7eb;padding:10px;text-align:left}th{background:#f5f7fa}.print{text-align:center;margin-top:25px}@media print{button{display:none}body{background:#fff;padding:0}.box{border:none;max-width:100%;padding:10px}}
  </style>
</head>
<body>
  <div class="box">
    <div class="head">
      <div><div class="brand">CeyBreez</div><p class="muted">Stay. Taste. Explore Sri Lanka.</p></div>
      <div><h1>Invoice</h1><p><b>${fc2Escape(invoiceNo)}</b></p><p class="muted">Issue Date: ${fc2Escape(fc2DateOnly(new Date().toISOString()))}</p></div>
    </div>

    <div class="grid">
      <div class="item"><b>Reference</b><br>${fc2Escape(booking.reference || booking.id || "-")}</div>
      <div class="item"><b>Guest</b><br>${fc2Escape(booking.guestName || "Guest")}</div>
      <div class="item"><b>Property / Tour</b><br>${fc2Escape(booking.itemName || booking.serviceType || "-")}</div>
      <div class="item"><b>Dates</b><br>${fc2Escape(booking.dateFrom || "-")} to ${fc2Escape(booking.dateTo || "-")}</div>
    </div>

    <table>
      <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Receipt / Ref</th><th>Method</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div><span>Total Booking Value</span><b>${fc2Escape(currency)} ${summary.totalAmount.toFixed(2)}</b></div>
      <div><span>Total Received</span><b>${fc2Escape(currency)} ${summary.paidAmount.toFixed(2)}</b></div>
      <div><span>Total Refunded</span><b>${fc2Escape(currency)} ${summary.refundAmount.toFixed(2)}</b></div>
      <div class="due"><span>Outstanding</span><b>${fc2Escape(currency)} ${summary.outstanding.toFixed(2)}</b></div>
    </div>

    <p class="muted" style="margin-top:26px">Thank you for choosing CeyBreez.</p>
    <div class="print"><button onclick="window.print()">Print / Save PDF</button></div>
  </div>
</body>
</html>`;
}

function fc2ReceiptEmailHtml(kind, row) {
  const dateValue = row.paymentDate || row.refundDate || row.createdAt;
  const receiptNo = fc2ReceiptNo(kind, row.id, dateValue);
  const title = kind === "Refund" ? "Refund Receipt" : "Payment Receipt";
  return `
  <div style="font-family:Arial,sans-serif;background:#f8f3eb;padding:24px;color:#111827">
    <div style="max-width:720px;margin:auto;background:#fff;border-radius:18px;padding:28px;border:1px solid #e5dfd2">
      <h1 style="color:#0f766e;margin:0 0 6px">CeyBreez ${title}</h1>
      <p style="margin:0 0 18px;color:#667085">Receipt No: <b>${fc2Escape(receiptNo)}</b></p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:10px;border-bottom:1px solid #eee"><b>Reference</b></td><td style="padding:10px;border-bottom:1px solid #eee">${fc2Escape(row.reference || "-")}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #eee"><b>Guest</b></td><td style="padding:10px;border-bottom:1px solid #eee">${fc2Escape(row.guestName || "Guest")}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #eee"><b>Property / Tour</b></td><td style="padding:10px;border-bottom:1px solid #eee">${fc2Escape(row.itemName || "-")}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #eee"><b>Date</b></td><td style="padding:10px;border-bottom:1px solid #eee">${fc2Escape(fc2DateOnly(dateValue))}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #eee"><b>Method</b></td><td style="padding:10px;border-bottom:1px solid #eee">${fc2Escape(row.paymentMethod || "-")}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #eee"><b>Amount</b></td><td style="padding:10px;border-bottom:1px solid #eee"><b>${fc2Escape(row.currency || "USD")} ${fc2Number(row.amount).toFixed(2)}</b></td></tr>
      </table>
      <p style="margin-top:22px;color:#667085">Thank you,<br>CeyBreez Team</p>
    </div>
  </div>`;
}

if (url.pathname.match(/^\/api\/admin\/finance\/invoice\/[^/]+$/) && request.method === "GET") {
  await checkAdmin(request, env);
  const bookingId = decodeURIComponent(url.pathname.split("/").pop());
  const payload = await fc2BookingInvoicePayload(env, bookingId);
  if (!payload) return new Response("Invoice not found", { status: 404, headers: corsHeaders() });
  return new Response(fc2InvoiceHtml(payload), { status: 200, headers: { "Content-Type": "text/html;charset=utf-8", ...corsHeaders() } });
}

if (url.pathname === "/api/admin/finance/email-receipt" && request.method === "POST") {
  await checkAdmin(request, env);
  const data = await request.json();
  const kind = data.kind === "Refund" ? "Refund" : "Payment";
  const id = data.id || "";
  const row = kind === "Payment"
    ? await env.DB.prepare("SELECT p.*, b.guestEmail, b.guestName, b.itemName, b.dateFrom, b.dateTo FROM payments p LEFT JOIN bookings b ON b.id=p.bookingId WHERE p.id=? LIMIT 1").bind(id).first()
    : await env.DB.prepare("SELECT r.*, b.guestEmail, b.guestName, b.itemName, b.dateFrom, b.dateTo FROM refunds r LEFT JOIN bookings b ON b.id=r.bookingId WHERE r.id=? LIMIT 1").bind(id).first();
  if (!row) return jsonResponse({ error: `${kind} not found` }, 404);
  if (!row.guestEmail) return jsonResponse({ success: false, emailSent: false, error: "Guest email missing" }, 200);

  const receiptNo = fc2ReceiptNo(kind, row.id, row.paymentDate || row.refundDate || row.createdAt);
  const email = await fc2SendEmail(env, {
    to: row.guestEmail,
    subject: `CeyBreez ${kind} Receipt - ${receiptNo}`,
    html: fc2ReceiptEmailHtml(kind, row),
    reply_to: "ceybreez@gmail.com"
  });

  return jsonResponse({ success: true, emailSent: !!email.success, email, receiptNo }, 200);
}

if (url.pathname === "/api/admin/finance/email-invoice" && request.method === "POST") {
  await checkAdmin(request, env);
  const data = await request.json();
  const bookingId = data.bookingId || "";
  const payload = await fc2BookingInvoicePayload(env, bookingId);
  if (!payload) return jsonResponse({ error: "Booking not found" }, 404);
  if (!payload.booking.guestEmail) return jsonResponse({ success: false, emailSent: false, error: "Guest email missing" }, 200);

  const invoiceNo = fc2InvoiceNo(payload.booking);
  const email = await fc2SendEmail(env, {
    to: payload.booking.guestEmail,
    subject: `CeyBreez Invoice - ${invoiceNo}`,
    html: fc2InvoiceHtml(payload).replace('<button onclick="window.print()">Print / Save PDF</button>', ''),
    reply_to: "ceybreez@gmail.com"
  });

  return jsonResponse({ success: true, emailSent: !!email.success, email, invoiceNo }, 200);
}
/* =====================================================
   CEYBREEZ ENTERPRISE PMS - REPORTS MODULE V1 ROUTES
   Paste inside Worker fetch() router, before the final 404 response.
   No new D1 tables required.
===================================================== */

function rptNumber(value) {
  const n = Number(String(value ?? "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function rptDateOnly(value) { return String(value || "").slice(0, 10); }
function rptMonth(value) { return rptDateOnly(value).slice(0, 7) || "Unknown"; }
function rptNorm(value) { return String(value || "").trim().toLowerCase(); }

function rptItemCategory(row) {
  const text = rptNorm(`${row.bookingCategory || ""} ${row.serviceType || ""} ${row.itemName || ""}`);
  if (text.includes("tour") || text.includes("trip") || text.includes("safari")) return "tour";
  if (text.includes("homestay")) return "homestay";
  if (text.includes("apartment")) return "apartment";
  if (text.includes("manual")) return "manual";
  if (text.includes("villa")) return "villa";
  return "villa";
}

function rptNights(from, to) {
  const a = new Date(String(from || "").slice(0, 10) + "T00:00:00");
  const b = new Date(String(to || "").slice(0, 10) + "T00:00:00");
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b <= a) return 0;
  return Math.round((b - a) / 86400000);
}

function rptMatchFilters(row, filters) {
  const type = rptNorm(filters.type || "all");
  const status = rptNorm(filters.status || "all");
  const from = String(filters.from || "");
  const to = String(filters.to || "");
  const date = rptDateOnly(row.dateFrom || row.createdAt || row.created_at || "");
  if (type !== "all" && rptItemCategory(row) !== type) return false;
  if (status !== "all") {
    const statusText = rptNorm(`${row.status || ""} ${row.paymentStatus || ""}`);
    if (!statusText.includes(status)) return false;
  }
  if (from && date && date < from) return false;
  if (to && date && date > to) return false;
  return true;
}

function rptConversion(booked, total) { return total ? Math.round((booked / total) * 100) : 0; }
function rptCsvEscape(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

function rptApplyBookingFinance(bookings, payments, refunds) {
  const payMap = new Map();
  const refMap = new Map();
  const methodMap = new Map();

  payments.forEach((p) => {
    const key = String(p.bookingId || "");
    payMap.set(key, (payMap.get(key) || 0) + rptNumber(p.amount));
    methodMap.set(key, p.paymentMethod || methodMap.get(key) || "");
  });

  refunds.forEach((r) => {
    const key = String(r.bookingId || "");
    refMap.set(key, (refMap.get(key) || 0) + rptNumber(r.amount));
  });

  return bookings.map((b) => {
    const total = rptNumber(b.totalAmount || b.finalAmount || 0);
    const paid = payMap.get(String(b.id)) || rptNumber(b.paidAmount || 0);
    const refunded = refMap.get(String(b.id)) || rptNumber(b.refundAmount || 0);
    const outstanding = Math.max(total - Math.max(paid - refunded, 0), 0);
    return { ...b, category: rptItemCategory(b), nights: rptNights(b.dateFrom, b.dateTo), paidAmount: paid, refundAmount: refunded, outstanding, lastPaymentMethod: methodMap.get(String(b.id)) || b.lastPaymentMethod || "" };
  });
}

async function rptBuildPayload(env, filters) {
  const bookingsRows = await env.DB.prepare("SELECT * FROM bookings ORDER BY createdAt DESC").all();
  const inquiriesRows = await env.DB.prepare("SELECT * FROM inquiries ORDER BY createdAt DESC").all();
  const paymentsRows = await env.DB.prepare("SELECT * FROM payments ORDER BY paymentDate DESC, createdAt DESC").all();
  const refundsRows = await env.DB.prepare("SELECT * FROM refunds ORDER BY refundDate DESC, createdAt DESC").all();
  const propertiesRows = await env.DB.prepare("SELECT * FROM properties").all();

  const rawBookings = bookingsRows.results || [];
  const inquiriesAll = inquiriesRows.results || [];
  const paymentsAll = paymentsRows.results || [];
  const refundsAll = refundsRows.results || [];
  const properties = propertiesRows.results || [];

  const enrichedBookings = rptApplyBookingFinance(rawBookings, paymentsAll, refundsAll);
  const bookings = enrichedBookings.filter((b) => rptMatchFilters(b, filters));
  const type = rptNorm(filters.type || "all");
  const from = String(filters.from || "");
  const to = String(filters.to || "");

  const inquiries = inquiriesAll.filter((i) => {
    const row = { ...i, serviceType: i.serviceType || i.category || "", itemName: i.itemName || "" };
    const date = rptDateOnly(i.createdAt || i.created_at || i.dateFrom || "");
    if (type !== "all" && rptItemCategory(row) !== type) return false;
    if (from && date && date < from) return false;
    if (to && date && date > to) return false;
    return true;
  });

  const bookingIds = new Set(bookings.map((b) => String(b.id)));
  const payments = paymentsAll.filter((p) => bookingIds.has(String(p.bookingId)));
  const refunds = refundsAll.filter((r) => bookingIds.has(String(r.bookingId)));
  const currency = bookings.find((b) => b.currency)?.currency || payments.find((p) => p.currency)?.currency || "USD";

  const booked = bookings.filter((b) => rptNorm(b.status || "Booked") === "booked").length;
  const cancelled = bookings.filter((b) => rptNorm(b.status).includes("cancel")).length;
  const completed = bookings.filter((b) => { const toDate = rptDateOnly(b.dateTo); return toDate && toDate < new Date().toISOString().slice(0, 10); }).length;
  const upcoming = bookings.filter((b) => { const fromDate = rptDateOnly(b.dateFrom); return fromDate && fromDate >= new Date().toISOString().slice(0, 10); }).length;

  const totalBookingValue = bookings.reduce((s, b) => s + rptNumber(b.totalAmount || b.finalAmount), 0);
  const totalReceived = bookings.reduce((s, b) => s + rptNumber(b.paidAmount), 0);
  const totalRefunded = bookings.reduce((s, b) => s + rptNumber(b.refundAmount), 0);
  const outstanding = bookings.reduce((s, b) => s + rptNumber(b.outstanding), 0);
  const averageBookingValue = bookings.length ? totalBookingValue / bookings.length : 0;

  const propertyMap = new Map();
  bookings.forEach((b) => {
    const key = b.itemName || b.serviceType || "Unknown";
    const current = propertyMap.get(key) || { name: key, type: b.category || rptItemCategory(b), bookings: 0, nights: 0, guests: 0, revenue: 0, received: 0, outstanding: 0, occupancy: 0 };
    current.bookings += 1;
    current.nights += rptNumber(b.nights);
    current.guests += rptNumber(b.guests);
    current.revenue += rptNumber(b.totalAmount || b.finalAmount);
    current.received += rptNumber(b.paidAmount);
    current.outstanding += rptNumber(b.outstanding);
    propertyMap.set(key, current);
  });

  const propertyPerformance = [...propertyMap.values()].map((x) => {
    const denominator = Math.max((filters.from && filters.to ? rptNights(filters.from, filters.to) : 30), 1);
    return { ...x, occupancy: Math.min(100, Math.round((x.nights / denominator) * 100)) };
  }).sort((a, b) => b.revenue - a.revenue);

  const monthMap = new Map();
  bookings.forEach((b) => {
    const key = rptMonth(b.dateFrom || b.createdAt);
    const row = monthMap.get(key) || { month: key, bookings: 0, inquiries: 0, revenue: 0, received: 0, refunds: 0, outstanding: 0 };
    row.bookings += 1; row.revenue += rptNumber(b.totalAmount || b.finalAmount); row.received += rptNumber(b.paidAmount); row.refunds += rptNumber(b.refundAmount); row.outstanding += rptNumber(b.outstanding); monthMap.set(key, row);
  });
  inquiries.forEach((i) => {
    const key = rptMonth(i.createdAt || i.created_at || i.dateFrom);
    const row = monthMap.get(key) || { month: key, bookings: 0, inquiries: 0, revenue: 0, received: 0, refunds: 0, outstanding: 0 };
    row.inquiries += 1; monthMap.set(key, row);
  });
  const monthlyTrend = [...monthMap.values()].filter((x) => x.month !== "Unknown").sort((a, b) => String(a.month).localeCompare(String(b.month)));

  const inquiryStatusMap = new Map();
  inquiries.forEach((i) => {
    const status = i.status || "New";
    const cat = rptItemCategory({ serviceType: i.serviceType || i.category || "", itemName: i.itemName || "" });
    const row = inquiryStatusMap.get(status) || { status, count: 0, property: 0, tour: 0, service: 0, conversion: 0 };
    row.count += 1; if (cat === "tour") row.tour += 1; else if (cat === "manual") row.service += 1; else row.property += 1; inquiryStatusMap.set(status, row);
  });
  const bookedInquiries = inquiries.filter((i) => rptNorm(i.status) === "booked").length;
  const byStatus = [...inquiryStatusMap.values()].map((x) => ({ ...x, conversion: rptConversion(bookedInquiries, inquiries.length) }));

  const paymentMethodMap = new Map();
  payments.forEach((p) => { const method = p.paymentMethod || "Unknown"; const row = paymentMethodMap.get(method) || { method, count: 0, amount: 0, refunds: 0 }; row.count += 1; row.amount += rptNumber(p.amount); paymentMethodMap.set(method, row); });
  refunds.forEach((r) => { const method = r.paymentMethod || "Unknown"; const row = paymentMethodMap.get(method) || { method, count: 0, amount: 0, refunds: 0 }; row.refunds += rptNumber(r.amount); paymentMethodMap.set(method, row); });
  const byMethod = [...paymentMethodMap.values()].sort((a, b) => b.amount - a.amount);

  const occupiedNights = bookings.reduce((s, b) => s + rptNumber(b.nights), 0);
  const reportDays = filters.from && filters.to ? Math.max(rptNights(filters.from, filters.to), 1) : 30;
  const activeProperties = properties.filter((p) => p.active !== 0 && p.active !== false).length || propertyPerformance.length || 1;
  const availableNights = activeProperties * reportDays;
  const occupancyRate = availableNights ? Math.round((occupiedNights / availableNights) * 100) : 0;

  const paymentActivity = payments.slice(0, 25).map((p) => ({ date: p.paymentDate || p.createdAt, type: "Payment", reference: p.reference || p.id, guestName: "", itemName: p.paymentType || "Payment", amount: p.amount, currency: p.currency || currency, status: p.paymentMethod || "Payment" }));
  const refundActivity = refunds.slice(0, 25).map((r) => ({ date: r.refundDate || r.createdAt, type: "Refund", reference: r.reference || r.id, guestName: "", itemName: r.reason || "Refund", amount: r.amount, currency: r.currency || currency, status: "Refunded" }));
  const bookingActivity = bookings.slice(0, 25).map((b) => ({ date: b.createdAt || b.dateFrom, type: "Booking", reference: b.reference || b.id, guestName: b.guestName || "", itemName: b.itemName || b.serviceType || "", amount: b.totalAmount || 0, currency: b.currency || currency, status: b.status || b.paymentStatus || "Booked" }));
  const inquiryActivity = inquiries.slice(0, 25).map((i) => ({ date: i.createdAt || i.created_at || i.dateFrom, type: "Inquiry", reference: i.reference || i.id, guestName: i.guestName || "", itemName: i.itemName || i.serviceType || "", amount: 0, currency, status: i.status || "New" }));
  const latestActivity = [...paymentActivity, ...refundActivity, ...bookingActivity, ...inquiryActivity].sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))).slice(0, 50);

  return { filters, summary: { currency, totalBookings: bookings.length, totalInquiries: inquiries.length, conversionRate: rptConversion(bookedInquiries, inquiries.length) }, revenue: { currency, totalBookingValue, totalReceived, totalRefunded, outstanding, averageBookingValue }, bookings: { total: bookings.length, booked, cancelled, completed, upcoming }, inquiries: { total: inquiries.length, booked: bookedInquiries, byStatus }, occupancy: { activeProperties, occupiedNights, availableNights, rate: occupancyRate }, payments: { totalPayments: payments.length, totalRefunds: refunds.length, byMethod }, propertyPerformance, monthlyTrend, bookingDetails: bookings.slice(0, 250), latestActivity };
}

if (url.pathname === "/api/admin/reports" && request.method === "GET") {
  await checkAdmin(request, env);
  const filters = { type: url.searchParams.get("type") || "all", status: url.searchParams.get("status") || "all", from: url.searchParams.get("from") || "", to: url.searchParams.get("to") || "" };
  return jsonResponse(await rptBuildPayload(env, filters), 200);
}

if (url.pathname === "/api/admin/reports/export/csv" && request.method === "GET") {
  await checkAdmin(request, env);
  const filters = { type: url.searchParams.get("type") || "all", status: url.searchParams.get("status") || "all", from: url.searchParams.get("from") || "", to: url.searchParams.get("to") || "" };
  const payload = await rptBuildPayload(env, filters);
  const rows = payload.bookingDetails || [];
  const headers = ["Reference","Guest","Email","Mobile","Item","Service Type","Date From","Date To","Guests","Currency","Total","Paid","Refund","Outstanding","Booking Status","Payment Status"];
  const csvRows = rows.map((b) => [b.reference || b.id || "", b.guestName || "", b.guestEmail || "", b.guestMobile || "", b.itemName || "", b.serviceType || "", b.dateFrom || "", b.dateTo || "", b.guests || "", b.currency || payload.summary.currency || "USD", b.totalAmount || "0", b.paidAmount || "0", b.refundAmount || "0", b.outstanding || "0", b.status || "", b.paymentStatus || ""].map(rptCsvEscape).join(","));
  const csv = [headers.join(","), ...csvRows].join("\n");
  return new Response(csv, { status: 200, headers: { "Content-Type": "text/csv;charset=utf-8", "Content-Disposition": `attachment; filename="ceybreez-reports-${new Date().toISOString().slice(0,10)}.csv"`, ...corsHeaders() } });
}

/* =========================
   BOOKINGS API
========================= */


if (url.pathname === "/api/admin/bookings" && request.method === "GET") {
  await checkAdmin(request, env);

  await env.DB.prepare(`
    UPDATE bookings
    SET status = 'Closed',
        updatedAt = datetime('now')
    WHERE status = 'Booked'
      AND dateTo < date('now')
  `).run();

  await env.DB.prepare(`
    UPDATE inquiries
    SET status = 'Closed',
        updatedAt = datetime('now')
    WHERE id IN (
      SELECT inquiryId
      FROM bookings
      WHERE status = 'Closed'
        AND inquiryId IS NOT NULL
        AND inquiryId != ''
    )
      AND status = 'Booked'
  `).run();

  const rows = await env.DB.prepare(`
    SELECT *
    FROM bookings
    ORDER BY createdAt DESC
  `).all();

  return jsonResponse(rows.results || [], 200);
}

if (url.pathname === "/api/admin/bookings" && request.method === "POST") {
  await checkAdmin(request, env);

  const data = await request.json();
  const inquiryId = data.inquiryId || data.reference || "";

  if (!inquiryId) {
    return jsonResponse({ error: "Missing inquiryId" }, 400);
  }

  const itemName = data.itemName || "";
  const serviceType = data.serviceType || "Manual Booking";
  const guestName = data.guestName || "";
  const guestEmail = data.guestEmail || "";
  const guestMobile = data.guestMobile || "";
  const dateFrom = data.dateFrom || "";
  let dateTo = data.dateTo || "";
  const originalDateTo = dateTo;
  const isTourBooking = String(data.serviceType || "").toLowerCase().includes("tour");
  if (isTourBooking && dateFrom && (!dateTo || dateTo <= dateFrom)) {
    const d = new Date(dateFrom + "T00:00:00");
    d.setDate(d.getDate() + 1);
    dateTo = d.toISOString().slice(0, 10);
  }
  const guests = data.guests || "";
  const bookingCurrency = data.currency || data.quoteCurrency || "";
  const bookingDiscountPercent = data.discountPercent || "";
  const bookingDiscountAmount = data.discountAmount || "";
  const bookingPaymentStatus = data.paymentStatus || "Pending";
  const bookingAdvanceAmount = data.advanceAmount || "";
  const bookingBalanceAmount = data.balanceAmount || "";
  const bookingGuestConfirmed = data.guestConfirmed ? 1 : 0;
  const bookingAdminConfirmed = data.adminConfirmed === false ? 0 : 1;
  const checkInTime = data.checkInTime || "14:00";
  const checkOutTime = data.checkOutTime || "11:00";
  const totalDays = data.totalDays || "";
  const dayRate = data.dayRate || "";
  const totalAmount = data.totalAmount || "";
  const adminMessage = data.adminMessage || "";
  const reference = data.reference || inquiryId;

  if (!itemName || !dateFrom || !dateTo) {
    return jsonResponse({ error: "Missing property/tour or booking dates" }, 400);
  }

  if (dateFrom >= dateTo) {
    return jsonResponse({ error: "Check-out date must be after check-in date" }, 400);
  }

  const conflict = await env.DB.prepare(`
    SELECT id, reference, itemName, dateFrom, dateTo
    FROM bookings
    WHERE status = 'Booked'
      AND LOWER(TRIM(itemName)) = LOWER(TRIM(?))
      AND dateFrom < ?
      AND dateTo > ?
      AND inquiryId != ?
    LIMIT 1
  `).bind(
    itemName,
    dateTo,
    dateFrom,
    inquiryId
  ).first();

  if (conflict) {
    return jsonResponse({
      error: `Already booked: ${conflict.itemName} (${conflict.dateFrom} to ${conflict.dateTo})`,
      conflict
    }, 409);
  }

  const existing = await env.DB.prepare(`
    SELECT id
    FROM bookings
    WHERE inquiryId = ?
    LIMIT 1
  `).bind(inquiryId).first();

  if (existing) {
    await env.DB.prepare(`
      UPDATE bookings
      SET
        reference=?,
        itemName=?,
        serviceType=?,
        guestName=?,
        guestEmail=?,
        guestMobile=?,
        dateFrom=?,
        dateTo=?,
        guests=?,
        checkInTime=?,
        checkOutTime=?,
        totalDays=?,
        dayRate=?,
        totalAmount=?,
        adminMessage=?,
        status='Booked',
        updatedAt=datetime('now')
      WHERE inquiryId=?
    `).bind(
      reference,
      itemName,
      serviceType,
      guestName,
      guestEmail,
      guestMobile,
      dateFrom,
      dateTo,
      guests,
      checkInTime,
      checkOutTime,
      totalDays,
      dayRate,
      totalAmount,
      adminMessage,
      inquiryId
    ).run();

    await env.DB.prepare(`
      INSERT INTO inquiries
      (id, reference, serviceType, itemName, guestName, guestEmail, guestMobile, guestCountry, guests, dateFrom, dateTo, message, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(id)
      DO UPDATE SET
        reference=excluded.reference,
        serviceType=excluded.serviceType,
        itemName=excluded.itemName,
        guestName=excluded.guestName,
        guestEmail=excluded.guestEmail,
        guestMobile=excluded.guestMobile,
        guests=excluded.guests,
        dateFrom=excluded.dateFrom,
        dateTo=excluded.dateTo,
        status='Booked',
        updatedAt=datetime('now')
    `).bind(
      inquiryId,
      reference,
      serviceType,
      itemName,
      guestName,
      guestEmail,
      guestMobile,
      data.guestCountry || "",
      guests,
      dateFrom,
      dateTo,
      data.message || "Manual booking / booking confirmed from admin panel",
      "Booked"
    ).run();

    return jsonResponse({
      success: true,
      id: existing.id,
      message: "Booking updated"
    }, 200);
  }

  const id = `BOOK-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  await env.DB.prepare(`
    INSERT INTO bookings (
      id, inquiryId, reference, itemName, serviceType,
      guestName, guestEmail, guestMobile,
      dateFrom, dateTo, guests,
      checkInTime, checkOutTime, totalDays, dayRate, totalAmount, adminMessage,
      status, createdAt, updatedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(
    id,
    inquiryId,
    reference,
    itemName,
    serviceType,
    guestName,
    guestEmail,
    guestMobile,
    dateFrom,
    dateTo,
    guests,
    checkInTime,
    checkOutTime,
    totalDays,
    dayRate,
    totalAmount,
    adminMessage,
    "Booked"
  ).run();

  await env.DB.prepare(`
    INSERT INTO inquiries
    (id, reference, serviceType, itemName, guestName, guestEmail, guestMobile, guestCountry, guests, dateFrom, dateTo, message, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(id)
    DO UPDATE SET
      reference=excluded.reference,
      serviceType=excluded.serviceType,
      itemName=excluded.itemName,
      guestName=excluded.guestName,
      guestEmail=excluded.guestEmail,
      guestMobile=excluded.guestMobile,
      guests=excluded.guests,
      dateFrom=excluded.dateFrom,
      dateTo=excluded.dateTo,
      status='Booked',
      updatedAt=datetime('now')
  `).bind(
    inquiryId,
    reference,
    serviceType,
    itemName,
    guestName,
    guestEmail,
    guestMobile,
    data.guestCountry || "",
    guests,
    dateFrom,
    dateTo,
    data.message || "Manual booking / booking confirmed from admin panel",
    "Booked"
  ).run();

  let bookingEmailResult = null;

  if (data.sendEmail && guestEmail) {
    bookingEmailResult = await sendResendEmail(env, {
      to: guestEmail,
      subject: `Your Booking Has Been Confirmed - ${reference}`,
      html: buildStatusEmail({
        reference,
        serviceType,
        itemName,
        guestName,
        guestEmail,
        guestMobile,
        dateFrom,
        dateTo,
        guests,
        checkInTime,
        checkOutTime,
        totalDays,
        dayRate,
        totalAmount,
        adminMessage,
        status: "Booked"
      }),
      reply_to: "ceybreez@gmail.com"
    });
  }

  return jsonResponse({ success: true, id, email: bookingEmailResult, message: "Booking confirmed" }, 200);
}

if (url.pathname === "/api/bookings" && request.method === "GET") {
  const itemName = url.searchParams.get("itemName") || "";

  let query = "SELECT * FROM bookings WHERE status='Booked'";
  const params = [];

  if (itemName) {
    query += " AND itemName=?";
    params.push(itemName);
  }

  query += " ORDER BY dateFrom ASC";

  const rows = await env.DB.prepare(query).bind(...params).all();

  return jsonResponse(rows.results || [], 200);
}

if (url.pathname.match(/^\/api\/admin\/bookings\/[^/]+\/status$/) && request.method === "PUT") {
  await checkAdmin(request, env);

  const parts = url.pathname.split("/");
  const id = parts[4];
  const data = await request.json();
  const newStatus = data.status || "Booked";
  const adminMessage = data.adminMessage || "";

  const booking = await env.DB.prepare(`
    SELECT *
    FROM bookings
    WHERE id=?
    LIMIT 1
  `).bind(id).first();

  if (!booking) {
    return jsonResponse({ error: "Booking not found" }, 404);
  }

  await env.DB.prepare(`
    UPDATE bookings
    SET status=?, updatedAt=datetime('now')
    WHERE id=?
  `).bind(newStatus, id).run();

  let inquiry = null;

  if (booking.inquiryId || booking.reference) {
    inquiry = await env.DB.prepare(`
      SELECT *
      FROM inquiries
      WHERE id=?
         OR reference=?
      LIMIT 1
    `).bind(
      booking.inquiryId || "",
      booking.reference || ""
    ).first();

    await env.DB.prepare(`
      UPDATE inquiries
      SET status=?, updatedAt=datetime('now')
      WHERE id=?
         OR reference=?
    `).bind(
      newStatus,
      booking.inquiryId || "",
      booking.reference || ""
    ).run();
  }

  let emailResult = null;

  if (data.sendEmail && inquiry?.guestEmail) {
    emailResult = await sendResendEmail(env, {
      to: inquiry.guestEmail,
      subject: `CeyBreez ${newStatus} Update - ${inquiry.reference || booking.reference || id}`,
      html: buildStatusEmail({
        ...inquiry,
        ...booking,
        status: newStatus,
        adminMessage
      }),
      reply_to: "ceybreez@gmail.com"
    });
  }

  return jsonResponse({
    success: true,
    email: emailResult,
    message: "Booking and related inquiry status updated"
  }, 200);
}

if (url.pathname.startsWith("/api/admin/bookings/") && request.method === "DELETE") {
  await checkAdmin(request, env);

  const id = url.pathname.split("/").pop();

  const booking = await env.DB.prepare(`
    SELECT inquiryId
    FROM bookings
    WHERE id=?
  `).bind(id).first();

  if (booking?.inquiryId) {
    await env.DB.prepare(`
      DELETE FROM inquiry_notes
      WHERE inquiryId=?
    `).bind(booking.inquiryId).run();

    await env.DB.prepare(`
      DELETE FROM inquiries
      WHERE id=?
    `).bind(booking.inquiryId).run();
  }

  await env.DB.prepare(`
    DELETE FROM bookings
    WHERE id=?
  `).bind(id).run();

  return jsonResponse({
    success: true,
    message: "Booking and related inquiry deleted"
  }, 200);
}
/* =========================
   ADMIN V2 AVAILABILITY API
========================= */

if (url.pathname === "/api/admin/v2/availability" && request.method === "GET") {
  await checkAdmin(request, env);

  const propertyName = url.searchParams.get("propertyName") || "";
  const dateFrom = url.searchParams.get("dateFrom") || "";
  const dateTo = url.searchParams.get("dateTo") || "";

  let query = "SELECT * FROM admin_v2_availability WHERE 1=1";
  const params = [];

  if (propertyName) {
    query += " AND LOWER(TRIM(propertyName)) = LOWER(TRIM(?))";
    params.push(propertyName);
  }

  if (dateFrom) {
    query += " AND date >= ?";
    params.push(dateFrom);
  }

  if (dateTo) {
    query += " AND date <= ?";
    params.push(dateTo);
  }

  query += " ORDER BY date ASC, propertyName ASC";

  const rows = await env.DB.prepare(query).bind(...params).all();

  return jsonResponse(rows.results || [], 200);
}

if (url.pathname === "/api/admin/v2/availability/block" && request.method === "POST") {
  await checkAdmin(request, env);

  const data = await request.json();

  const propertyId = data.propertyId || "";
  const propertyName = data.propertyName || data.itemName || "";
  const dateFrom = data.dateFrom || "";
  const dateTo = data.dateTo || "";
  const type = data.type || "Private";
  const reason = data.reason || "";
  const source = data.source || "Admin";

  if (!propertyName || !dateFrom || !dateTo) {
    return jsonResponse({ error: "Property name and dates are required" }, 400);
  }

  if (dateFrom >= dateTo) {
    return jsonResponse({ error: "End date must be after start date" }, 400);
  }

  const conflict = await env.DB.prepare(`
    SELECT *
    FROM admin_v2_availability
    WHERE LOWER(TRIM(propertyName)) = LOWER(TRIM(?))
      AND date >= ?
      AND date < ?
    LIMIT 1
  `).bind(propertyName, dateFrom, dateTo).first();

  if (conflict) {
    return jsonResponse({
      error: `Already unavailable: ${propertyName} on ${conflict.date}`,
      conflict
    }, 409);
  }

  const blockId = `BLK-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const dates = getDateRange(dateFrom, dateTo);

  for (const date of dates) {
    await env.DB.prepare(`
      INSERT INTO admin_v2_availability
      (id, propertyId, propertyName, bookingId, date, status, type, source, reason, guestName, guestMobile, createdBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      `${blockId}-${date}`,
      propertyId,
      propertyName,
      blockId,
      date,
      "Unavailable",
      type,
      source,
      reason,
      "",
      "",
      "Admin"
    ).run();
  }

  return jsonResponse({
    success: true,
    id: blockId,
    days: dates.length,
    message: "Dates blocked successfully"
  }, 200);
}

if (url.pathname === "/api/admin/v2/availability/manual-booking" && request.method === "POST") {
  await checkAdmin(request, env);

  const data = await request.json();

  const propertyId = data.propertyId || "";
  const propertyName = data.propertyName || data.itemName || "";
  const guestName = data.guestName || "";
  const guestMobile = data.guestMobile || "";
  const guestEmail = data.guestEmail || "";
  const dateFrom = data.dateFrom || "";
  const dateTo = data.dateTo || "";
  const guests = data.guests || "";
  const source = data.source || "Manual";
  const reason = data.reason || "Manual booking from admin";
  const totalAmount =
  data.totalAmount ||
  data.finalAmount ||
  data.bookingTotal ||
  data.amount ||
  data.price ||
  "";

const dayRate =
  data.dayRate ||
  data.nightRate ||
  data.rate ||
  "";

  if (!propertyName || !guestName || !dateFrom || !dateTo) {
    return jsonResponse({ error: "Property, guest name and dates are required" }, 400);
  }

  if (dateFrom >= dateTo) {
    return jsonResponse({ error: "Check-out date must be after check-in date" }, 400);
  }

  const conflict = await env.DB.prepare(`
    SELECT *
    FROM admin_v2_availability
    WHERE LOWER(TRIM(propertyName)) = LOWER(TRIM(?))
      AND date >= ?
      AND date < ?
    LIMIT 1
  `).bind(propertyName, dateFrom, dateTo).first();

  if (conflict) {
    return jsonResponse({
      error: `Already unavailable: ${propertyName} on ${conflict.date}`,
      conflict
    }, 409);
  }

  const reference = data.reference || `MAN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const bookingId = `BOOK-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  await env.DB.prepare(`
    INSERT INTO bookings (
      id, inquiryId, reference, itemName, serviceType,
      guestName, guestEmail, guestMobile,
      dateFrom, dateTo, guests,
      checkInTime, checkOutTime, totalDays, dayRate, totalAmount, adminMessage,
      status, createdAt, updatedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(
    bookingId,
    reference,
    reference,
    propertyName,
    "Manual Booking",
    guestName,
    guestEmail,
    guestMobile,
    dateFrom,
    dateTo,
    guests,
    data.checkInTime || "14:00",
    data.checkOutTime || "11:00",
    data.totalDays || "",
    dayRate,
totalAmount,
    reason,
    "Booked"
  ).run();

  const dates = getDateRange(dateFrom, dateTo);

  for (const date of dates) {
    await env.DB.prepare(`
      INSERT INTO admin_v2_availability
      (id, propertyId, propertyName, bookingId, date, status, type, source, reason, guestName, guestMobile, createdBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      `${bookingId}-${date}`,
      propertyId,
      propertyName,
      bookingId,
      date,
      "Unavailable",
      "Manual Booking",
      source,
      reason,
      guestName,
      guestMobile,
      "Admin"
    ).run();
  }

  return jsonResponse({
    success: true,
    id: bookingId,
    reference,
    days: dates.length,
    message: "Manual booking created and dates blocked"
  }, 200);
}
if (url.pathname === "/api/admin/v2/availability/sync-bookings" && request.method === "POST") {
  await checkAdmin(request, env);

  const rows = await env.DB.prepare(`
    SELECT *
    FROM bookings
    WHERE status='Booked'
      AND itemName IS NOT NULL
      AND itemName!=''
      AND dateFrom IS NOT NULL
      AND dateFrom!=''
      AND dateTo IS NOT NULL
      AND dateTo!=''
  `).all();

  let inserted = 0;
  let skipped = 0;

  for (const booking of rows.results || []) {
    const dates = getDateRange(booking.dateFrom, booking.dateTo);

    for (const date of dates) {
      const exists = await env.DB.prepare(`
        SELECT id
        FROM admin_v2_availability
        WHERE bookingId=?
          AND date=?
        LIMIT 1
      `).bind(
        booking.id,
        date
      ).first();

      if (exists) {
        skipped++;
        continue;
      }

      await env.DB.prepare(`
        INSERT INTO admin_v2_availability
        (id, propertyId, propertyName, bookingId, date, status, type, source, reason, guestName, guestMobile, createdBy, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        `${booking.id}-${date}`,
        "",
        booking.itemName,
        booking.id,
        date,
        "Unavailable",
        booking.serviceType && String(booking.serviceType).toLowerCase().includes("manual")
          ? "Manual Booking"
          : "Booking",
        "System Sync",
        "Synced from existing bookings table",
        booking.guestName || "",
        booking.guestMobile || "",
        "System"
      ).run();

      inserted++;
    }
  }

  return jsonResponse({
    success: true,
    inserted,
    skipped,
    message: "Bookings synced to availability"
  }, 200);
}
if (url.pathname.startsWith("/api/admin/v2/availability/") && request.method === "DELETE") {
  await checkAdmin(request, env);

  const id = url.pathname.split("/").pop();

  await env.DB.prepare(`
    DELETE FROM admin_v2_availability
    WHERE id=?
       OR bookingId=?
  `).bind(id, id).run();

  return jsonResponse({
    success: true,
    message: "Availability block deleted"
  }, 200);
}
/* =========================
   ADMIN SITE CONTENT API
========================= */

if (url.pathname === "/api/admin/site-content" && request.method === "GET") {
  await checkAdmin(request, env);

  const rows = await env.DB.prepare(
    "SELECT * FROM site_content"
  ).all();

  const result = {};

  (rows.results || []).forEach(item => {
    result[item.key] = item.value;
  });

  return jsonResponse(result, 200);
}

if (url.pathname === "/api/admin/site-content" && request.method === "PUT") {
  await checkAdmin(request, env);

  const data = await request.json();

  for (const [key, value] of Object.entries(data)) {
    await env.DB.prepare(`
      INSERT INTO site_content (key, value, updatedAt)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key)
      DO UPDATE SET
        value = excluded.value,
        updatedAt = datetime('now')
    `).bind(key, value).run();
  }

  return jsonResponse({
    success: true,
    message: "Site content updated"
  }, 200);
}   
if (url.pathname.match(/^\/api\/admin\/inquiries\/[^\/]+\/guest-confirm$/) && request.method === "POST") {
  await checkAdmin(request, env);

  const id = url.pathname.split("/")[4];

  const inquiry = await env.DB.prepare(`
    SELECT *
    FROM inquiries
    WHERE id=?
       OR reference=?
    LIMIT 1
  `).bind(id, id).first();

  if (!inquiry) {
    return jsonResponse({ error: "Inquiry not found" }, 404);
  }

  await env.DB.prepare(`
    UPDATE inquiries
    SET guestConfirmed=1,
        guestConfirmedAt=datetime('now'),
        quoteStatus='Guest Confirmed',
        updatedAt=datetime('now')
    WHERE id=?
       OR reference=?
  `).bind(
    inquiry.id,
    inquiry.reference || id
  ).run();

  await env.DB.prepare(`
    UPDATE bookings
    SET guestConfirmed=1,
        guestConfirmedAt=datetime('now'),
        updatedAt=datetime('now')
    WHERE inquiryId=?
       OR reference=?
  `).bind(
    inquiry.id,
    inquiry.reference || id
  ).run();

  await env.DB.prepare(`
    INSERT INTO inquiry_notes (id, inquiryId, note, createdAt)
    VALUES (?, ?, ?, datetime('now'))
  `).bind(
    `NOTE-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    inquiry.id,
    "Guest confirmation marked manually from admin."
  ).run();

  return jsonResponse({
    success: true,
    guestConfirmed: 1,
    quoteStatus: "Guest Confirmed",
    message: "Guest confirmed"
  }, 200);
}  
/* =========================
         EMAIL INQUIRY API
      ========================= */

      if (request.method !== "POST") {
        return new Response("Method not allowed", {
          status: 405,
          headers: corsHeaders(),
        });
      }

      const data = await request.json();

      const now = new Date();
      const reference =
        "CB-" +
        now.toISOString().slice(0, 10).replaceAll("-", "") +
        "-" +
        now.toISOString().slice(11, 19).replaceAll(":", "") +
        "-" +
        Math.floor(100 + Math.random() * 900);

      const serviceType = data.experiences || "Travel Inquiry";
      const guestName = data.name || "Guest";
      const guestEmail = String(data.email || "").trim();
      const rawMobile = String(data.mobile || "").trim();
      const rawCountryCode = String(data.countryCode || "").trim();
      const guestMobile = rawMobile.startsWith("+")
        ? rawMobile
        : `${rawCountryCode} ${rawMobile}`.trim();
      const guestCountry = data.country || "";
      const dateFrom = data.dateFrom || "";
      const dateTo = data.dateTo || "";
      const guests = data.guests || "";
      const message = data.message || "";
      const itemName = data.itemName || "";

      const adminHtml = buildAdminEmail({
        reference,
        serviceType,
        guestName,
        guestEmail,
        guestMobile,
        guestCountry,
        dateFrom,
        dateTo,
        guests,
        itemName,
        message
      });

      const guestHtml = buildGuestEmail({
        reference,
        serviceType,
        guestName,
        itemName,
        dateFrom,
        dateTo,
        guests,
        message
      });
      /* SERVER-SIDE AVAILABILITY CHECK */

if (itemName && dateFrom && dateTo) {
  const conflict = await env.DB.prepare(`
    SELECT id, reference, itemName, dateFrom, dateTo
    FROM bookings
    WHERE status = 'Booked'
      AND LOWER(TRIM(itemName)) = LOWER(TRIM(?))
      AND dateFrom < ?
      AND dateTo > ?
    LIMIT 1
  `).bind(
    itemName,
    dateTo,
    dateFrom
  ).first();

  if (conflict) {
    return jsonResponse({
      success: false,
      error: `Already booked: ${conflict.itemName} (${conflict.dateFrom} to ${conflict.dateTo})`,
      conflict
    }, 409);
  }
}

/* SAVE INQUIRY TO D1 */

await env.DB.prepare(`
  INSERT INTO inquiries
  (id, reference, serviceType, itemName, guestName, guestEmail, guestMobile, guestCountry, guests, dateFrom, dateTo, message, status, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`).bind(
  reference,
  reference,
  serviceType,
  itemName || "",
  guestName,
  guestEmail,
  guestMobile,
  guestCountry,
  guests,
  dateFrom,
  dateTo,
  message,
  "New"
).run();

/* SEND EMAILS */

let inquiryType = "TRAVEL";

if ((serviceType || "").toLowerCase().includes("villa")) {
  inquiryType = "VILLA";
}

if ((serviceType || "").toLowerCase().includes("apartment")) {
  inquiryType = "APARTMENT";
}

if ((serviceType || "").toLowerCase().includes("homestay")) {
  inquiryType = "HOMESTAY";
}

if ((serviceType || "").toLowerCase().includes("tour")) {
  inquiryType = "TOUR";
}

if ((serviceType || "").toLowerCase().includes("contact")) {
  inquiryType = "CONTACT";
}

const inquiryTitle =
  itemName ||
  serviceType ||
  guestName ||
  "Inquiry";

const adminEmail = await sendResendEmail(env, {
  to: env.ADMIN_EMAIL || "ceybreez@gmail.com",
  subject: `[NEW ${inquiryType} INQUIRY] ${inquiryTitle} - ${reference}`,
  html: adminHtml,
  reply_to: guestEmail
});

let guestEmailResult = null;

if (guestEmail) {
  guestEmailResult = await sendResendEmail(env, {
    to: guestEmail,
    subject: `Your CeyBreez ${inquiryType} Inquiry Has Been Received - ${reference}`,
    html: guestHtml,
    reply_to: "ceybreez@gmail.com"
  });
}

return jsonResponse({
  success: true,
  reference,
  adminEmail,
  guestEmail: guestEmailResult,
  emailDeliveryOk: adminEmail?.success === true && guestEmailResult?.success === true
}, 200);

} catch (error) {
  const status = Number(error?.status || 500);
  return jsonResponse({ error: error?.message || "Server error" }, status);
}
}

export default {
  fetch: handleRequest,
  scheduled(event, env, ctx) {
    ctx.waitUntil(backupScheduledMaintenance(env));
  }
};

/* =========================
   FORMATTERS
========================= */

function formatDestination(row) {
  return {
    ...row,
    photos: safeJson(row.photos),
    active: row.active === 1,
    featured: row.featured === 1
  };
}

function formatProperty(row) {
  return {
    ...row,
    facilities: safeJson(row.facilities),
    photos: safeJson(row.photos),
    active: row.active === 1,
    featured: row.featured === 1
  };
}

function formatService(row) {
  return {
    ...row,
    photos: safeJson(row.photos),
    active: row.active === 1,
    featured: row.featured === 1
  };
}


function makeGuestConfirmToken(id, reference) {
  const raw = `${id || ""}|${reference || ""}`;
  return btoa(raw).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeGuestConfirmToken(token) {
  try {
    const fixed = String(token || "").replaceAll("-", "+").replaceAll("_", "/");
    const pad = fixed.length % 4 ? "=".repeat(4 - (fixed.length % 4)) : "";
    const raw = atob(fixed + pad);
    const [id, reference] = raw.split("|");
    return { id, reference };
  } catch (e) {
    return { id: "", reference: "" };
  }
}

function publicBaseUrl(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function formatReview(row) {
  return {
    ...row,
    active: row.active === 1,
    featured: row.featured === 1
  };
}

function formatPageSection(row) {
  return {
    ...row,
    active: row.active === 1
  };
}

/* =========================
   ADMIN SECURITY V5.3.2
   - Username/password accounts
   - PBKDF2 password hashing
   - Server-side sessions
   - Per-module permissions
   - Staff changes require Super Admin approval
   - Non-admin users cannot delete records
   - Audit log
========================= */

const SECURITY_SESSION_HOURS = 12;
const SECURITY_PASSWORD_ITERATIONS = 100000;
const SECURITY_MODULES = [
  "dashboard", "inquiries", "bookings", "availability", "properties", "tours",
  "services", "reviews", "finance", "reports", "pageBuilder", "settings"
];

function securityHttpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function securityNowIso() {
  return new Date().toISOString();
}

function securityAddHours(hours) {
  return new Date(Date.now() + Number(hours || 0) * 3600000).toISOString();
}

function securityBytesToBase64Url(bytes) {
  let binary = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (const b of arr) binary += String.fromCharCode(b);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function securityBase64UrlToBytes(value) {
  const fixed = String(value || "").replaceAll("-", "+").replaceAll("_", "/");
  const pad = fixed.length % 4 ? "=".repeat(4 - (fixed.length % 4)) : "";
  const binary = atob(fixed + pad);
  return Uint8Array.from(binary, ch => ch.charCodeAt(0));
}

function securityRandomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return securityBytesToBase64Url(bytes);
}

async function securitySha256(value) {
  const bytes = new TextEncoder().encode(String(value || ""));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, "0")).join("");
}

async function securityHashPassword(password, saltText = "") {
  const salt = saltText ? securityBase64UrlToBytes(saltText) : (() => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return bytes;
  })();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(password || "")),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: SECURITY_PASSWORD_ITERATIONS },
    key,
    256
  );
  return {
    salt: securityBytesToBase64Url(salt),
    hash: securityBytesToBase64Url(new Uint8Array(bits))
  };
}

function securitySafePermissions(value) {
  if (Array.isArray(value)) return [...new Set(value.map(String).filter(x => SECURITY_MODULES.includes(x)))];
  try {
    const parsed = JSON.parse(value || "[]");
    return securitySafePermissions(parsed);
  } catch (_) {
    return [];
  }
}

function securityPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName || row.username,
    email: row.email || "",
    role: row.role || "staff",
    permissions: securitySafePermissions(row.permissions),
    active: Number(row.active || 0) === 1,
    createdAt: row.createdAt || "",
    updatedAt: row.updatedAt || "",
    lastLoginAt: row.lastLoginAt || ""
  };
}

let SECURITY_SCHEMA_READY = false;
let SECURITY_SCHEMA_PROMISE = null;

async function securityEnsureColumn(env, tableName, columnName, definition) {
  const info = await env.DB.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = (info.results || []).some(row => String(row.name || "").toLowerCase() === String(columnName).toLowerCase());
  if (!exists) {
    await env.DB.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`).run();
  }
}

function securityValidEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function ensureSecuritySchema(env) {
  if (SECURITY_SCHEMA_READY) return;
  if (!SECURITY_SCHEMA_PROMISE) {
    SECURITY_SCHEMA_PROMISE = (async () => {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    displayName TEXT,
    email TEXT,
    passwordHash TEXT NOT NULL,
    passwordSalt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    permissions TEXT NOT NULL DEFAULT '[]',
    active INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL,
    createdBy TEXT,
    updatedAt TEXT NOT NULL,
    lastLoginAt TEXT
  )`).run();

  await securityEnsureColumn(env, "admin_users", "email", "TEXT");

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_password_resets (
    tokenHash TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    usedAt TEXT
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_sessions (
    tokenHash TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    lastSeenAt TEXT NOT NULL
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_pending_changes (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    username TEXT NOT NULL,
    module TEXT NOT NULL,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    contentType TEXT,
    bodyText TEXT,
    actionLabel TEXT,
    status TEXT NOT NULL DEFAULT 'Pending',
    createdAt TEXT NOT NULL,
    reviewedAt TEXT,
    reviewedBy TEXT,
    reviewNote TEXT,
    applyStatus INTEGER,
    applyResponse TEXT
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_audit_log (
    id TEXT PRIMARY KEY,
    actorUserId TEXT,
    actorUsername TEXT,
    action TEXT NOT NULL,
    module TEXT,
    target TEXT,
    details TEXT,
    createdAt TEXT NOT NULL
  )`).run();

  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(userId)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_admin_password_resets_user ON admin_password_resets(userId, createdAt)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_admin_password_resets_expiry ON admin_password_resets(expiresAt)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_admin_pending_status ON admin_pending_changes(status, createdAt)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(createdAt)").run();

    })();
  }
  try {
    await SECURITY_SCHEMA_PROMISE;
    SECURITY_SCHEMA_READY = true;
  } catch (error) {
    SECURITY_SCHEMA_PROMISE = null;
    throw error;
  }
}

async function securityAudit(env, actor, action, module = "", target = "", details = "") {
  try {
    await env.DB.prepare(`
      INSERT INTO admin_audit_log (id, actorUserId, actorUsername, action, module, target, details, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      `AUD-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      actor?.id || "",
      actor?.username || "system",
      action || "",
      module || "",
      target || "",
      typeof details === "string" ? details : JSON.stringify(details || {}),
      securityNowIso()
    ).run();
  } catch (_) {}
}

function securityModuleFromPath(pathname) {
  const p = String(pathname || "").toLowerCase();
  if (p.includes("/inquiries")) return "inquiries";
  if (p.includes("/bookings")) return "bookings";
  if (p.includes("/availability")) return "availability";
  if (p.includes("/properties")) return "properties";
  if (p.includes("/tour-packages") || p.includes("/destinations")) return "tours";
  if (p.includes("/services")) return "services";
  if (p.includes("/reviews")) return "reviews";
  if (p.includes("/finance")) return "finance";
  if (p.includes("/reports")) return "reports";
  if (p.includes("/page-sections") || p.includes("/site-content")) return "pageBuilder";
  if (p.includes("/settings")) return "settings";
  if (p.includes("/upload-image") || p.includes("/upload-video")) return "pageBuilder";
  return "dashboard";
}

function securityCanAccess(actor, module) {
  if (!actor) return false;
  if (actor.role === "super_admin" || actor.legacy === true) return true;
  if (module === "dashboard") return true;
  return securitySafePermissions(actor.permissions).includes(module);
}

function securityIsUploadPath(pathname) {
  return pathname === "/api/admin/upload-image" || pathname === "/api/admin/upload-video";
}

function securityIsAuthPath(pathname) {
  return pathname.startsWith("/api/admin/auth/");
}

function securityIsControlPath(pathname) {
  return pathname.startsWith("/api/admin/users") ||
    pathname.startsWith("/api/admin/approvals") ||
    pathname.startsWith("/api/admin/audit-log");
}

async function getAdminActor(request, env, { allowLegacy = true } = {}) {
  await ensureSecuritySchema(env);
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;

  const replayId = request.headers.get("X-CeyBreez-Approval-Replay") || "";
  if (allowLegacy && replayId && env.ADMIN_TOKEN && token === env.ADMIN_TOKEN) {
    return {
      id: "internal-approval-replay",
      username: "approval-engine",
      displayName: "Approval Engine",
      role: "super_admin",
      permissions: [...SECURITY_MODULES],
      active: true,
      legacy: true
    };
  }

  const tokenHash = await securitySha256(token);
  const row = await env.DB.prepare(`
    SELECT s.tokenHash, s.expiresAt, s.userId, u.*
    FROM admin_sessions s
    JOIN admin_users u ON u.id=s.userId
    WHERE s.tokenHash=?
    LIMIT 1
  `).bind(tokenHash).first();

  if (!row || Number(row.active || 0) !== 1) return null;
  if (!row.expiresAt || new Date(row.expiresAt).getTime() <= Date.now()) {
    await env.DB.prepare("DELETE FROM admin_sessions WHERE tokenHash=?").bind(tokenHash).run();
    return null;
  }

  await env.DB.prepare("UPDATE admin_sessions SET lastSeenAt=? WHERE tokenHash=?").bind(securityNowIso(), tokenHash).run();
  return { ...securityPublicUser(row), expiresAt: row.expiresAt || "", tokenHash, legacy: false };
}

async function checkAdmin(request, env) {
  const actor = await getAdminActor(request, env);
  if (!actor) throw securityHttpError("Unauthorized admin request", 401);
  return actor;
}

async function securityRequireSuperAdmin(request, env) {
  const actor = await checkAdmin(request, env);
  if (actor.role !== "super_admin" && actor.legacy !== true) {
    throw securityHttpError("Super Admin access required", 403);
  }
  return actor;
}

async function securityReadJson(request) {
  try { return await request.json(); } catch (_) { return {}; }
}

async function securityLogin(request, env) {
  await ensureSecuritySchema(env);
  const data = await securityReadJson(request);
  const username = String(data.username || "").trim().toLowerCase();
  const password = String(data.password || "");
  if (!username || !password) return jsonResponse({ error: "Username and password are required" }, 400);

  const row = await env.DB.prepare("SELECT * FROM admin_users WHERE LOWER(username)=LOWER(?) LIMIT 1").bind(username).first();
  if (!row || Number(row.active || 0) !== 1) return jsonResponse({ error: "Invalid username or password" }, 401);

  const candidate = await securityHashPassword(password, row.passwordSalt);
  if (candidate.hash !== row.passwordHash) {
    await securityAudit(env, securityPublicUser(row), "LOGIN_FAILED", "security", row.username, "Invalid password");
    return jsonResponse({ error: "Invalid username or password" }, 401);
  }

  const rawToken = securityRandomToken(32);
  const tokenHash = await securitySha256(rawToken);
  const now = securityNowIso();
  const expiresAt = securityAddHours(SECURITY_SESSION_HOURS);
  await env.DB.prepare(`
    INSERT INTO admin_sessions (tokenHash, userId, expiresAt, createdAt, lastSeenAt)
    VALUES (?, ?, ?, ?, ?)
  `).bind(tokenHash, row.id, expiresAt, now, now).run();
  await env.DB.prepare("UPDATE admin_users SET lastLoginAt=?, updatedAt=? WHERE id=?").bind(now, now, row.id).run();
  const user = securityPublicUser({ ...row, lastLoginAt: now, updatedAt: now });
  await securityAudit(env, user, "LOGIN_SUCCESS", "security", user.username, "Admin login");
  return jsonResponse({ success: true, token: rawToken, expiresAt, user }, 200);
}

async function securityLogout(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const actor = await getAdminActor(request, env);
  if (token && !actor?.legacy) {
    const tokenHash = await securitySha256(token);
    await env.DB.prepare("DELETE FROM admin_sessions WHERE tokenHash=?").bind(tokenHash).run();
  }
  if (actor) await securityAudit(env, actor, "LOGOUT", "security", actor.username, "Admin logout");
  return jsonResponse({ success: true }, 200);
}

async function securityBootstrap(request, env) {
  await ensureSecuritySchema(env);
  const auth = request.headers.get("Authorization") || "";
  const expected = env.ADMIN_TOKEN ? `Bearer ${env.ADMIN_TOKEN}` : "";
  if (!expected || auth !== expected) return jsonResponse({ error: "Current ADMIN_TOKEN is required for first setup" }, 401);

  const existing = await env.DB.prepare("SELECT COUNT(*) AS count FROM admin_users WHERE role='super_admin' AND active=1").first();
  if (Number(existing?.count || 0) > 0) return jsonResponse({ error: "Super Admin is already configured" }, 409);

  const data = await securityReadJson(request);
  const username = String(data.username || "").trim().toLowerCase();
  const displayName = String(data.displayName || username).trim();
  const email = String(data.email || "").trim().toLowerCase();
  const password = String(data.password || "");
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) return jsonResponse({ error: "Username must be 3-40 characters using letters, numbers, dot, dash or underscore" }, 400);
  if (!securityValidEmail(email)) return jsonResponse({ error: "A valid recovery email is required" }, 400);
  if (password.length < 10) return jsonResponse({ error: "Password must be at least 10 characters" }, 400);

  const p = await securityHashPassword(password);
  const id = `USR-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const now = securityNowIso();
  await env.DB.prepare(`
    INSERT INTO admin_users (id, username, displayName, email, passwordHash, passwordSalt, role, permissions, active, createdAt, createdBy, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, 'super_admin', ?, 1, ?, 'bootstrap', ?)
  `).bind(id, username, displayName, email, p.hash, p.salt, JSON.stringify(SECURITY_MODULES), now, now).run();
  await securityAudit(env, { id, username }, "BOOTSTRAP_SUPER_ADMIN", "security", username, "First Super Admin created");
  return jsonResponse({ success: true, message: "Super Admin created. Sign in with the new username and password." }, 200);
}

async function securityAuthStatus(env) {
  await ensureSecuritySchema(env);
  const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM admin_users WHERE role='super_admin' AND active=1").first();
  return jsonResponse({ configured: Number(row?.count || 0) > 0 }, 200);
}

async function securityAuthMe(request, env) {
  const actor = await getAdminActor(request, env);
  if (!actor) return jsonResponse({ error: "Session expired or unauthorized" }, 401);
  return jsonResponse({ success: true, user: securityPublicUser(actor), expiresAt: actor.expiresAt || "" }, 200);
}

async function securityForgotPassword(request, env) {
  await ensureSecuritySchema(env);
  const data = await securityReadJson(request);
  const identity = String(data.identity || data.username || data.email || "").trim().toLowerCase();
  const generic = {
    success: true,
    message: "If an active account matches that username or email, a password reset link has been sent."
  };
  if (!identity) return jsonResponse(generic, 200);

  const row = await env.DB.prepare(`
    SELECT * FROM admin_users
    WHERE active=1 AND (LOWER(username)=LOWER(?) OR LOWER(COALESCE(email,''))=LOWER(?))
    LIMIT 1
  `).bind(identity, identity).first();

  if (!row || !securityValidEmail(row.email || "")) {
    return jsonResponse(generic, 200);
  }

  await env.DB.prepare("DELETE FROM admin_password_resets WHERE expiresAt<? OR usedAt IS NOT NULL")
    .bind(securityNowIso()).run();

  const recent = await env.DB.prepare(`
    SELECT createdAt FROM admin_password_resets
    WHERE userId=? AND usedAt IS NULL
    ORDER BY createdAt DESC LIMIT 1
  `).bind(row.id).first();
  if (recent?.createdAt && Date.now() - new Date(recent.createdAt).getTime() < 60000) {
    return jsonResponse(generic, 200);
  }

  const rawToken = securityRandomToken(32);
  const tokenHash = await securitySha256(rawToken);
  const now = securityNowIso();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await env.DB.prepare("DELETE FROM admin_password_resets WHERE userId=? AND usedAt IS NULL").bind(row.id).run();
  await env.DB.prepare(`
    INSERT INTO admin_password_resets (tokenHash, userId, expiresAt, createdAt, usedAt)
    VALUES (?, ?, ?, ?, NULL)
  `).bind(tokenHash, row.id, expiresAt, now).run();

  const siteBase = String(env.PUBLIC_SITE_URL || "https://ceybreez.com").replace(/\/+$/, "");
  const resetUrl = `${siteBase}/admin/#reset=${encodeURIComponent(rawToken)}`;
  const html = `
    <div style="font-family:Arial,sans-serif;background:#f6f3ec;padding:24px;color:#222">
      <div style="max-width:650px;margin:auto;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #e5dfd2">
        <div style="background:#0f766e;color:#fff;padding:24px;text-align:center">
          <h1 style="margin:0;font-size:24px">CeyBreez Admin Password Reset</h1>
        </div>
        <div style="padding:26px">
          <p>Hello ${String(row.displayName || row.username).replace(/[<>&"]/g, "")},</p>
          <p>A password reset was requested for your CeyBreez Admin account.</p>
          <p style="text-align:center;margin:28px 0">
            <a href="${resetUrl}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:bold">Reset Password</a>
          </p>
          <p>This link expires in <strong>15 minutes</strong> and can be used only once.</p>
          <p style="font-size:13px;color:#666">If you did not request this reset, ignore this email. Your current password will continue to work.</p>
        </div>
      </div>
    </div>
  `;

  const sent = await v72SendEmail(env, row.email, "CeyBreez Admin Password Reset", html);
  await securityAudit(env, securityPublicUser(row), sent ? "PASSWORD_RESET_LINK_SENT" : "PASSWORD_RESET_EMAIL_FAILED", "security", row.username, {
    expiresAt,
    email: row.email
  });
  return jsonResponse(generic, 200);
}

async function securityCompletePasswordReset(request, env) {
  await ensureSecuritySchema(env);
  const data = await securityReadJson(request);
  const rawToken = String(data.token || "").trim();
  const password = String(data.password || "");
  if (!rawToken) return jsonResponse({ error: "Reset token is required" }, 400);
  if (password.length < 10) return jsonResponse({ error: "Password must be at least 10 characters" }, 400);

  const tokenHash = await securitySha256(rawToken);
  const reset = await env.DB.prepare(`
    SELECT r.*, u.username, u.displayName, u.email, u.active
    FROM admin_password_resets r
    JOIN admin_users u ON u.id=r.userId
    WHERE r.tokenHash=? AND r.usedAt IS NULL
    LIMIT 1
  `).bind(tokenHash).first();

  if (!reset || Number(reset.active || 0) !== 1 || !reset.expiresAt || new Date(reset.expiresAt).getTime() <= Date.now()) {
    if (reset?.tokenHash) {
      await env.DB.prepare("UPDATE admin_password_resets SET usedAt=? WHERE tokenHash=?").bind(securityNowIso(), tokenHash).run();
    }
    return jsonResponse({ error: "This password reset link is invalid or has expired." }, 400);
  }

  const p = await securityHashPassword(password);
  const now = securityNowIso();
  await env.DB.prepare("UPDATE admin_users SET passwordHash=?, passwordSalt=?, updatedAt=? WHERE id=?")
    .bind(p.hash, p.salt, now, reset.userId).run();
  await env.DB.prepare("UPDATE admin_password_resets SET usedAt=? WHERE userId=? AND usedAt IS NULL")
    .bind(now, reset.userId).run();
  await env.DB.prepare("DELETE FROM admin_sessions WHERE userId=?").bind(reset.userId).run();
  await securityAudit(env, {
    id: reset.userId,
    username: reset.username,
    displayName: reset.displayName,
    email: reset.email
  }, "PASSWORD_RESET_SELF_SERVICE", "security", reset.username, "Password reset link used; all sessions revoked");

  return jsonResponse({ success: true, message: "Password reset successfully. Sign in with your new password." }, 200);
}

async function securityEmergencyPasswordReset(request, env) {
  await ensureSecuritySchema(env);
  const auth = request.headers.get("Authorization") || "";
  const expected = env.ADMIN_TOKEN ? `Bearer ${env.ADMIN_TOKEN}` : "";
  if (!expected || auth !== expected) return jsonResponse({ error: "Current ADMIN_TOKEN is required for emergency recovery" }, 401);

  const data = await securityReadJson(request);
  const identity = String(data.identity || "").trim().toLowerCase();
  const password = String(data.password || "");
  if (!identity) return jsonResponse({ error: "Super Admin username or email is required" }, 400);
  if (password.length < 10) return jsonResponse({ error: "Password must be at least 10 characters" }, 400);

  const row = await env.DB.prepare(`
    SELECT * FROM admin_users
    WHERE role='super_admin' AND active=1
      AND (LOWER(username)=LOWER(?) OR LOWER(COALESCE(email,''))=LOWER(?))
    LIMIT 1
  `).bind(identity, identity).first();
  if (!row) return jsonResponse({ error: "Active Super Admin account not found" }, 404);

  const p = await securityHashPassword(password);
  const now = securityNowIso();
  await env.DB.prepare("UPDATE admin_users SET passwordHash=?, passwordSalt=?, updatedAt=? WHERE id=?")
    .bind(p.hash, p.salt, now, row.id).run();
  await env.DB.prepare("DELETE FROM admin_sessions WHERE userId=?").bind(row.id).run();
  await env.DB.prepare("UPDATE admin_password_resets SET usedAt=? WHERE userId=? AND usedAt IS NULL").bind(now, row.id).run();
  await securityAudit(env, { id: "emergency-admin-token", username: "admin-token-recovery" }, "PASSWORD_RESET_EMERGENCY", "security", row.username, "Recovered with Cloudflare ADMIN_TOKEN; all sessions revoked");
  return jsonResponse({ success: true, message: "Super Admin password reset. Sign in with the new password." }, 200);
}

async function securityListUsers(request, env) {
  await securityRequireSuperAdmin(request, env);
  const rows = await env.DB.prepare(`
    SELECT id, username, displayName, email, role, permissions, active, createdAt, createdBy, updatedAt, lastLoginAt
    FROM admin_users ORDER BY role='super_admin' DESC, username ASC
  `).all();
  return jsonResponse((rows.results || []).map(securityPublicUser), 200);
}

function securityNormalizeUserRole(role) {
  return ["super_admin", "staff", "viewer"].includes(role) ? role : "staff";
}

async function securityCreateUser(request, env) {
  const actor = await securityRequireSuperAdmin(request, env);
  const data = await securityReadJson(request);
  const username = String(data.username || "").trim().toLowerCase();
  const displayName = String(data.displayName || username).trim();
  const email = String(data.email || "").trim().toLowerCase();
  const password = String(data.password || "");
  const role = securityNormalizeUserRole(String(data.role || "staff"));
  const permissions = role === "super_admin" ? [...SECURITY_MODULES] : securitySafePermissions(data.permissions);
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) return jsonResponse({ error: "Invalid username" }, 400);
  if (!securityValidEmail(email)) return jsonResponse({ error: "A valid recovery email is required" }, 400);
  if (password.length < 10) return jsonResponse({ error: "Password must be at least 10 characters" }, 400);
  const exists = await env.DB.prepare("SELECT id FROM admin_users WHERE LOWER(username)=LOWER(?) LIMIT 1").bind(username).first();
  if (exists) return jsonResponse({ error: "Username already exists" }, 409);
  const emailExists = await env.DB.prepare("SELECT id FROM admin_users WHERE LOWER(COALESCE(email,''))=LOWER(?) LIMIT 1").bind(email).first();
  if (emailExists) return jsonResponse({ error: "Recovery email is already used by another admin user" }, 409);

  const p = await securityHashPassword(password);
  const id = `USR-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const now = securityNowIso();
  await env.DB.prepare(`
    INSERT INTO admin_users (id, username, displayName, email, passwordHash, passwordSalt, role, permissions, active, createdAt, createdBy, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).bind(id, username, displayName, email, p.hash, p.salt, role, JSON.stringify(permissions), now, actor.username, now).run();
  await securityAudit(env, actor, "USER_CREATED", "security", username, { role, permissions, email });
  return jsonResponse({ success: true, id, message: "User created" }, 200);
}

async function securityUpdateUser(request, env, userId) {
  const actor = await securityRequireSuperAdmin(request, env);
  const current = await env.DB.prepare("SELECT * FROM admin_users WHERE id=? LIMIT 1").bind(userId).first();
  if (!current) return jsonResponse({ error: "User not found" }, 404);
  const data = await securityReadJson(request);
  const displayName = String(data.displayName ?? current.displayName ?? current.username).trim();
  const email = String(data.email ?? current.email ?? "").trim().toLowerCase();
  const role = securityNormalizeUserRole(String(data.role ?? current.role));
  const active = data.active === false || Number(data.active) === 0 ? 0 : 1;
  const permissions = role === "super_admin" ? [...SECURITY_MODULES] : securitySafePermissions(data.permissions ?? current.permissions);

  if (!securityValidEmail(email)) return jsonResponse({ error: "A valid recovery email is required" }, 400);
  const emailExists = await env.DB.prepare("SELECT id FROM admin_users WHERE id<>? AND LOWER(COALESCE(email,''))=LOWER(?) LIMIT 1").bind(userId, email).first();
  if (emailExists) return jsonResponse({ error: "Recovery email is already used by another admin user" }, 409);

  if (actor.id === userId && (active !== 1 || role !== "super_admin")) {
    return jsonResponse({ error: "You cannot deactivate or demote your own Super Admin account" }, 400);
  }

  await env.DB.prepare(`
    UPDATE admin_users SET displayName=?, email=?, role=?, permissions=?, active=?, updatedAt=? WHERE id=?
  `).bind(displayName, email, role, JSON.stringify(permissions), active, securityNowIso(), userId).run();
  if (!active) await env.DB.prepare("DELETE FROM admin_sessions WHERE userId=?").bind(userId).run();
  await securityAudit(env, actor, "USER_UPDATED", "security", current.username, { role, permissions, active, email });
  return jsonResponse({ success: true, message: "User updated" }, 200);
}

async function securityResetPassword(request, env, userId) {
  const actor = await securityRequireSuperAdmin(request, env);
  const current = await env.DB.prepare("SELECT * FROM admin_users WHERE id=? LIMIT 1").bind(userId).first();
  if (!current) return jsonResponse({ error: "User not found" }, 404);
  const data = await securityReadJson(request);
  const password = String(data.password || "");
  if (password.length < 10) return jsonResponse({ error: "Password must be at least 10 characters" }, 400);
  const p = await securityHashPassword(password);
  const now = securityNowIso();
  await env.DB.prepare("UPDATE admin_users SET passwordHash=?, passwordSalt=?, updatedAt=? WHERE id=?").bind(p.hash, p.salt, now, userId).run();
  await env.DB.prepare("DELETE FROM admin_sessions WHERE userId=?").bind(userId).run();
  await env.DB.prepare("UPDATE admin_password_resets SET usedAt=? WHERE userId=? AND usedAt IS NULL").bind(now, userId).run();
  await securityAudit(env, actor, "PASSWORD_RESET", "security", current.username, "Sessions and reset links revoked");
  return jsonResponse({ success: true, message: "Password reset and existing sessions revoked" }, 200);
}

async function securityRevokeSessions(request, env, userId) {
  const actor = await securityRequireSuperAdmin(request, env);
  const current = await env.DB.prepare("SELECT username FROM admin_users WHERE id=? LIMIT 1").bind(userId).first();
  if (!current) return jsonResponse({ error: "User not found" }, 404);
  await env.DB.prepare("DELETE FROM admin_sessions WHERE userId=?").bind(userId).run();
  await securityAudit(env, actor, "SESSIONS_REVOKED", "security", current.username, "All sessions revoked");
  return jsonResponse({ success: true, message: "User sessions revoked" }, 200);
}

async function securityQueueChange(request, env, actor, module, url) {
  const clone = request.clone();
  const contentType = request.headers.get("Content-Type") || "application/json";
  let bodyText = "";
  try { bodyText = await clone.text(); } catch (_) {}
  if (bodyText.length > 500000) return jsonResponse({ error: "Change request is too large for approval queue" }, 413);
  const id = `APR-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const path = `${url.pathname}${url.search || ""}`;
  const actionLabel = `${request.method.toUpperCase()} ${url.pathname}`;
  await env.DB.prepare(`
    INSERT INTO admin_pending_changes
    (id, userId, username, module, method, path, contentType, bodyText, actionLabel, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
  `).bind(id, actor.id, actor.username, module, request.method.toUpperCase(), path, contentType, bodyText, actionLabel, securityNowIso()).run();
  await securityAudit(env, actor, "CHANGE_SUBMITTED", module, path, { approvalId: id, method: request.method });
  return jsonResponse({
    success: true,
    pendingApproval: true,
    approvalId: id,
    message: "Change submitted for Super Admin approval. It is not live yet."
  }, 202);
}

async function securityListApprovals(request, env, url) {
  await securityRequireSuperAdmin(request, env);
  const status = String(url.searchParams.get("status") || "Pending");
  const rows = await env.DB.prepare(`
    SELECT * FROM admin_pending_changes
    WHERE (?='all' OR LOWER(status)=LOWER(?))
    ORDER BY createdAt DESC
    LIMIT 500
  `).bind(status, status).all();
  return jsonResponse(rows.results || [], 200);
}

async function securityApproveChange(request, env, approvalId) {
  const actor = await securityRequireSuperAdmin(request, env);
  const row = await env.DB.prepare("SELECT * FROM admin_pending_changes WHERE id=? LIMIT 1").bind(approvalId).first();
  if (!row) return jsonResponse({ error: "Approval request not found" }, 404);
  if (String(row.status || "").toLowerCase() !== "pending") return jsonResponse({ error: `Request is already ${row.status}` }, 409);
  if (!env.ADMIN_TOKEN) return jsonResponse({ error: "ADMIN_TOKEN secret is required for secure approval replay" }, 500);

  const sourceUrl = new URL(request.url);
  const replayUrl = `${sourceUrl.protocol}//${sourceUrl.host}${row.path}`;
  const headers = new Headers({
    "Authorization": `Bearer ${env.ADMIN_TOKEN}`,
    "X-CeyBreez-Approval-Replay": approvalId
  });
  if (row.contentType) headers.set("Content-Type", row.contentType);
  const init = { method: row.method, headers };
  if (!["GET", "HEAD"].includes(String(row.method || "").toUpperCase())) init.body = row.bodyText || "";

  const replayResponse = await handleRequest(new Request(replayUrl, init), env);
  const responseText = await replayResponse.clone().text();
  const ok = replayResponse.ok;
  await env.DB.prepare(`
    UPDATE admin_pending_changes
    SET status=?, reviewedAt=?, reviewedBy=?, reviewNote=?, applyStatus=?, applyResponse=?
    WHERE id=?
  `).bind(
    ok ? "Approved" : "Apply Failed",
    securityNowIso(),
    actor.username,
    ok ? "Approved and applied" : "Approval attempted but original action failed",
    replayResponse.status,
    responseText.slice(0, 50000),
    approvalId
  ).run();
  await securityAudit(env, actor, ok ? "CHANGE_APPROVED" : "CHANGE_APPLY_FAILED", row.module, row.path, { approvalId, status: replayResponse.status });

  let payload;
  try { payload = JSON.parse(responseText || "{}"); } catch (_) { payload = { response: responseText }; }
  return jsonResponse({
    success: ok,
    applied: ok,
    approvalId,
    originalStatus: replayResponse.status,
    result: payload,
    message: ok ? "Change approved and applied" : "Approval recorded, but applying the change failed"
  }, ok ? 200 : 400);
}

async function securityRejectChange(request, env, approvalId) {
  const actor = await securityRequireSuperAdmin(request, env);
  const row = await env.DB.prepare("SELECT * FROM admin_pending_changes WHERE id=? LIMIT 1").bind(approvalId).first();
  if (!row) return jsonResponse({ error: "Approval request not found" }, 404);
  if (String(row.status || "").toLowerCase() !== "pending") return jsonResponse({ error: `Request is already ${row.status}` }, 409);
  const data = await securityReadJson(request);
  const note = String(data.note || "Rejected by Super Admin").slice(0, 1000);
  await env.DB.prepare(`
    UPDATE admin_pending_changes SET status='Rejected', reviewedAt=?, reviewedBy=?, reviewNote=? WHERE id=?
  `).bind(securityNowIso(), actor.username, note, approvalId).run();
  await securityAudit(env, actor, "CHANGE_REJECTED", row.module, row.path, { approvalId, note });
  return jsonResponse({ success: true, message: "Change rejected" }, 200);
}

async function securityListAudit(request, env) {
  await securityRequireSuperAdmin(request, env);
  const rows = await env.DB.prepare("SELECT * FROM admin_audit_log ORDER BY createdAt DESC LIMIT 300").all();
  return jsonResponse(rows.results || [], 200);
}


/* =========================
   SECURITY V5.4 — BACKUP & RECOVERY
   - D1 data snapshots to R2
   - Optional dedicated R2 media mirror (BACKUP_BUCKET)
   - 30-day automatic snapshot retention
   - Safety snapshot before restore
   - Super Admin only restore/download controls
========================= */

const BACKUP_RETENTION_DAYS = 30;
const BACKUP_FORMAT = "ceybreez-d1-backup-v1";
const BACKUP_DB_PREFIX = "system-backups/database/";
const BACKUP_MEDIA_PREFIX = "media-mirror/";
const BACKUP_EXCLUDED_TABLES = new Set([
  "admin_sessions",
  "admin_password_resets",
  "admin_backups",
  "admin_backup_state"
]);
let BACKUP_SCHEMA_READY = false;

function backupQuoteIdent(name) {
  return `"${String(name || "").replaceAll('"', '""')}"`;
}

function backupId(kind = "manual") {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const rand = Math.floor(100000 + Math.random() * 900000);
  const prefix = kind === "automatic" ? "AUTO" : kind === "pre_restore" ? "SAFE" : "BKP";
  return `${prefix}-${stamp}-${rand}`;
}

function backupSystemActor(label = "scheduled-backup") {
  return { id: "system", username: label, displayName: "CeyBreez System", role: "super_admin", permissions: [...SECURITY_MODULES] };
}

async function backupEnsureSchema(env) {
  if (BACKUP_SCHEMA_READY) return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_backups (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    storageKey TEXT NOT NULL,
    storageBinding TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Ready',
    createdBy TEXT,
    createdAt TEXT NOT NULL,
    sizeBytes INTEGER DEFAULT 0,
    tablesCount INTEGER DEFAULT 0,
    rowsCount INTEGER DEFAULT 0,
    mediaCount INTEGER DEFAULT 0,
    checksum TEXT,
    notes TEXT
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_backup_state (
    key TEXT PRIMARY KEY,
    value TEXT,
    updatedAt TEXT
  )`).run();
  BACKUP_SCHEMA_READY = true;
}

async function backupSetState(env, key, value) {
  await backupEnsureSchema(env);
  await env.DB.prepare(`
    INSERT INTO admin_backup_state (key, value, updatedAt)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updatedAt=excluded.updatedAt
  `).bind(String(key), String(value ?? ""), securityNowIso()).run();
}

async function backupGetState(env, key) {
  await backupEnsureSchema(env);
  const row = await env.DB.prepare("SELECT value, updatedAt FROM admin_backup_state WHERE key=? LIMIT 1").bind(String(key)).first();
  return row || null;
}

function backupStorage(env) {
  if (env.BACKUP_BUCKET) return { bucket: env.BACKUP_BUCKET, binding: "BACKUP_BUCKET", dedicated: true };
  if (env.IMAGES_BUCKET) return { bucket: env.IMAGES_BUCKET, binding: "IMAGES_BUCKET", dedicated: false };
  return null;
}

function backupStorageFromRow(env, row) {
  if (row?.storageBinding === "BACKUP_BUCKET") {
    if (!env.BACKUP_BUCKET) throw securityHttpError("BACKUP_BUCKET binding is not available", 503);
    return env.BACKUP_BUCKET;
  }
  if (row?.storageBinding === "IMAGES_BUCKET") {
    if (!env.IMAGES_BUCKET) throw securityHttpError("IMAGES_BUCKET binding is not available", 503);
    return env.IMAGES_BUCKET;
  }
  const storage = backupStorage(env);
  if (!storage) throw securityHttpError("No R2 backup storage binding is configured", 503);
  return storage.bucket;
}

async function backupSha256Text(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text || "")));
  return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, "0")).join("");
}

async function backupCaptureMediaManifest(env, maxObjects = 5000) {
  if (!env.IMAGES_BUCKET) return { count: 0, totalBytes: 0, truncated: false, objects: [] };
  let cursor = undefined;
  let totalBytes = 0;
  const objects = [];
  let truncated = false;
  do {
    const listed = await env.IMAGES_BUCKET.list({ cursor, limit: 1000 });
    for (const obj of listed.objects || []) {
      const key = String(obj.key || "");
      if (!key || key.startsWith(BACKUP_DB_PREFIX) || key.startsWith(BACKUP_MEDIA_PREFIX)) continue;
      objects.push({
        key,
        size: Number(obj.size || 0),
        etag: obj.etag || "",
        uploaded: obj.uploaded instanceof Date ? obj.uploaded.toISOString() : String(obj.uploaded || "")
      });
      totalBytes += Number(obj.size || 0);
      if (objects.length >= maxObjects) { truncated = true; break; }
    }
    if (truncated || !listed.truncated) break;
    cursor = listed.cursor || undefined;
  } while (cursor);
  return { count: objects.length, totalBytes, truncated, objects };
}

async function backupListD1Tables(env) {
  const rows = await env.DB.prepare(`
    SELECT name, sql
    FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'
    ORDER BY name
  `).all();
  return (rows.results || []).filter(row => row.name && !BACKUP_EXCLUDED_TABLES.has(String(row.name)));
}

async function backupCreateDatabaseSnapshot(env, actor, kind = "manual", notes = "") {
  await backupEnsureSchema(env);
  const storage = backupStorage(env);
  if (!storage) throw securityHttpError("No R2 storage is configured. Bind BACKUP_BUCKET or IMAGES_BUCKET first.", 503);

  const id = backupId(kind);
  const createdAt = securityNowIso();
  const tableDefs = await backupListD1Tables(env);
  const tables = [];
  let rowsCount = 0;

  for (const def of tableDefs) {
    const name = String(def.name);
    const rows = await env.DB.prepare(`SELECT * FROM ${backupQuoteIdent(name)}`).all();
    const data = rows.results || [];
    rowsCount += data.length;
    tables.push({ name, schema: def.sql || "", rowCount: data.length, rows: data });
  }

  const media = await backupCaptureMediaManifest(env);
  const snapshot = {
    format: BACKUP_FORMAT,
    version: 1,
    id,
    kind,
    createdAt,
    createdBy: actor?.username || "system",
    source: "ceybreez.com",
    restoreMode: "data-only-current-schema",
    excludedTables: [...BACKUP_EXCLUDED_TABLES],
    mediaManifest: media,
    tables
  };
  const text = JSON.stringify(snapshot);
  const checksum = await backupSha256Text(text);
  const storageKey = `${BACKUP_DB_PREFIX}${id}.json`;
  await storage.bucket.put(storageKey, text, {
    httpMetadata: { contentType: "application/json", cacheControl: "private, no-store" },
    customMetadata: { backupId: id, kind, checksum, createdAt }
  });

  await env.DB.prepare(`
    INSERT INTO admin_backups
    (id, kind, storageKey, storageBinding, status, createdBy, createdAt, sizeBytes, tablesCount, rowsCount, mediaCount, checksum, notes)
    VALUES (?, ?, ?, ?, 'Ready', ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, kind, storageKey, storage.binding, actor?.username || "system", createdAt,
    new TextEncoder().encode(text).byteLength, tables.length, rowsCount, media.count, checksum, String(notes || "")
  ).run();

  await backupSetState(env, kind === "automatic" ? "lastAutomaticBackup" : "lastManualBackup", createdAt);
  await securityAudit(env, actor || backupSystemActor(), "BACKUP_CREATED", "backup", id, {
    kind, storageBinding: storage.binding, tables: tables.length, rows: rowsCount, mediaManifestCount: media.count
  });

  return {
    success: true,
    id,
    kind,
    createdAt,
    storageBinding: storage.binding,
    storageDedicated: storage.dedicated,
    tablesCount: tables.length,
    rowsCount,
    mediaCount: media.count,
    sizeBytes: new TextEncoder().encode(text).byteLength,
    checksum
  };
}

async function backupListSnapshots(env) {
  await backupEnsureSchema(env);
  const rows = await env.DB.prepare(`
    SELECT id, kind, storageKey, storageBinding, status, createdBy, createdAt,
           sizeBytes, tablesCount, rowsCount, mediaCount, checksum, notes
    FROM admin_backups
    ORDER BY createdAt DESC
    LIMIT 200
  `).all();
  return rows.results || [];
}

async function backupStatus(env) {
  await backupEnsureSchema(env);
  const storage = backupStorage(env);
  const mediaState = await backupGetState(env, "lastMediaSync");
  const autoState = await backupGetState(env, "lastAutomaticBackup");
  return {
    success: true,
    storageAvailable: !!storage,
    storageDedicated: !!storage?.dedicated,
    storageBinding: storage?.binding || "",
    storageLabel: storage ? (storage.dedicated ? "Dedicated R2" : "Shared R2 fallback") : "Unavailable",
    mediaMirrorEnabled: !!(env.BACKUP_BUCKET && env.IMAGES_BUCKET),
    lastMediaSync: mediaState?.value || "",
    lastAutomaticBackup: autoState?.value || "",
    retentionDays: BACKUP_RETENTION_DAYS,
    cronRequired: true,
    recommendedCron: "0 2 * * *"
  };
}

async function backupGetSnapshotObject(env, id) {
  await backupEnsureSchema(env);
  const row = await env.DB.prepare("SELECT * FROM admin_backups WHERE id=? LIMIT 1").bind(id).first();
  if (!row) throw securityHttpError("Backup not found", 404);
  const bucket = backupStorageFromRow(env, row);
  const object = await bucket.get(row.storageKey);
  if (!object) throw securityHttpError("Backup file is missing from R2 storage", 404);
  return { row, object, bucket };
}

async function backupDownloadSnapshot(env, id) {
  const { row, object } = await backupGetSnapshotObject(env, id);
  return new Response(object.body, {
    status: 200,
    headers: {
      "Content-Type": "application/json;charset=utf-8",
      "Content-Disposition": `attachment; filename="ceybreez-backup-${row.id}.json"`,
      "Cache-Control": "private, no-store",
      ...corsHeaders()
    }
  });
}

async function backupSyncMediaBatch(env, cursor = "") {
  await backupEnsureSchema(env);
  if (!env.IMAGES_BUCKET || !env.BACKUP_BUCKET) {
    throw securityHttpError("A dedicated BACKUP_BUCKET and the existing IMAGES_BUCKET are both required for media mirroring", 409);
  }
  const listed = await env.IMAGES_BUCKET.list({ cursor: cursor || undefined, limit: 50 });
  let copied = 0, skipped = 0, processed = 0;
  for (const item of listed.objects || []) {
    const key = String(item.key || "");
    if (!key || key.startsWith(BACKUP_DB_PREFIX) || key.startsWith(BACKUP_MEDIA_PREFIX)) continue;
    processed++;
    const destinationKey = `${BACKUP_MEDIA_PREFIX}${key}`;
    const existing = await env.BACKUP_BUCKET.head(destinationKey);
    const existingEtag = existing?.customMetadata?.sourceEtag || "";
    if (existing && existingEtag && existingEtag === String(item.etag || "")) {
      skipped++;
      continue;
    }
    const source = await env.IMAGES_BUCKET.get(key);
    if (!source) continue;
    const buffer = await source.arrayBuffer();
    const customMetadata = { ...(source.customMetadata || {}), sourceEtag: String(item.etag || ""), sourceSize: String(item.size || 0), sourceKey: key };
    await env.BACKUP_BUCKET.put(destinationKey, buffer, {
      httpMetadata: source.httpMetadata || undefined,
      customMetadata
    });
    copied++;
  }
  const nextCursor = listed.truncated ? (listed.cursor || "") : "";
  if (!nextCursor) await backupSetState(env, "lastMediaSync", securityNowIso());
  return { success: true, processed, copied, skipped, nextCursor, complete: !nextCursor };
}

async function backupRestoreMediaBatch(env, cursor = "") {
  if (!env.IMAGES_BUCKET || !env.BACKUP_BUCKET) {
    throw securityHttpError("A dedicated BACKUP_BUCKET and IMAGES_BUCKET are both required for media restore", 409);
  }
  const listed = await env.BACKUP_BUCKET.list({ prefix: BACKUP_MEDIA_PREFIX, cursor: cursor || undefined, limit: 50 });
  let copied = 0, processed = 0;
  for (const item of listed.objects || []) {
    const mirrorKey = String(item.key || "");
    if (!mirrorKey.startsWith(BACKUP_MEDIA_PREFIX)) continue;
    const liveKey = mirrorKey.slice(BACKUP_MEDIA_PREFIX.length);
    if (!liveKey) continue;
    processed++;
    const source = await env.BACKUP_BUCKET.get(mirrorKey);
    if (!source) continue;
    const buffer = await source.arrayBuffer();
    const customMetadata = { ...(source.customMetadata || {}) };
    delete customMetadata.sourceEtag;
    delete customMetadata.sourceSize;
    delete customMetadata.sourceKey;
    await env.IMAGES_BUCKET.put(liveKey, buffer, {
      httpMetadata: source.httpMetadata || undefined,
      customMetadata
    });
    copied++;
  }
  const nextCursor = listed.truncated ? (listed.cursor || "") : "";
  return { success: true, processed, copied, nextCursor, complete: !nextCursor };
}

async function backupCurrentColumns(env, tableName) {
  const result = await env.DB.prepare(`PRAGMA table_info(${backupQuoteIdent(tableName)})`).all();
  return (result.results || []).map(row => String(row.name || "")).filter(Boolean);
}

async function backupForeignParents(env, tableName, allowed) {
  try {
    const result = await env.DB.prepare(`PRAGMA foreign_key_list(${backupQuoteIdent(tableName)})`).all();
    return [...new Set((result.results || []).map(row => String(row.table || "")).filter(name => allowed.has(name)))];
  } catch (_) {
    return [];
  }
}

async function backupTableOrder(env, tableNames) {
  const allowed = new Set(tableNames);
  const parents = new Map();
  for (const name of tableNames) parents.set(name, await backupForeignParents(env, name, allowed));
  const result = [], perm = new Set(), temp = new Set();
  function visit(name) {
    if (perm.has(name)) return;
    if (temp.has(name)) return;
    temp.add(name);
    for (const parent of parents.get(name) || []) visit(parent);
    temp.delete(name);
    perm.add(name);
    result.push(name);
  }
  for (const name of tableNames) visit(name);
  return result;
}

async function backupInsertRows(env, tableName, rows) {
  if (!rows?.length) return 0;
  const currentColumns = await backupCurrentColumns(env, tableName);
  const allowed = new Set(currentColumns);
  let inserted = 0;
  let batch = [];
  for (const row of rows) {
    const cols = Object.keys(row || {}).filter(col => allowed.has(col));
    if (!cols.length) continue;
    const sql = `INSERT OR REPLACE INTO ${backupQuoteIdent(tableName)} (${cols.map(backupQuoteIdent).join(",")}) VALUES (${cols.map(() => "?").join(",")})`;
    batch.push(env.DB.prepare(sql).bind(...cols.map(col => row[col] ?? null)));
    if (batch.length >= 40) {
      await env.DB.batch(batch);
      inserted += batch.length;
      batch = [];
    }
  }
  if (batch.length) { await env.DB.batch(batch); inserted += batch.length; }
  return inserted;
}

async function backupRestoreSnapshot(env, actor, id, confirmation) {
  const expected = `RESTORE ${id}`;
  if (String(confirmation || "") !== expected) throw securityHttpError(`Confirmation phrase must be exactly: ${expected}`, 400);
  const { row, object } = await backupGetSnapshotObject(env, id);
  const text = await object.text();
  const checksum = await backupSha256Text(text);
  if (row.checksum && checksum !== row.checksum) throw securityHttpError("Backup checksum verification failed. Restore cancelled.", 409);
  let snapshot;
  try { snapshot = JSON.parse(text); } catch (_) { throw securityHttpError("Backup JSON is invalid", 409); }
  if (!snapshot || snapshot.format !== BACKUP_FORMAT || !Array.isArray(snapshot.tables)) throw securityHttpError("Unsupported or invalid CeyBreez backup format", 409);

  const preservedAdmin = actor?.id ? await env.DB.prepare("SELECT * FROM admin_users WHERE id=? LIMIT 1").bind(actor.id).first() : null;
  const safety = await backupCreateDatabaseSnapshot(env, actor, "pre_restore", `Safety snapshot before restore ${id}`);
  const existingRows = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const existing = new Set((existingRows.results || []).map(x => String(x.name || "")));
  const restoreTables = snapshot.tables.filter(t => t?.name && !BACKUP_EXCLUDED_TABLES.has(String(t.name)) && existing.has(String(t.name)));
  const names = restoreTables.map(t => String(t.name));
  const insertOrder = await backupTableOrder(env, names);
  const deleteOrder = [...insertOrder].reverse();
  const byName = new Map(restoreTables.map(t => [String(t.name), t]));

  for (const name of deleteOrder) {
    await env.DB.prepare(`DELETE FROM ${backupQuoteIdent(name)}`).run();
  }

  let rowsRestored = 0;
  for (const name of insertOrder) {
    rowsRestored += await backupInsertRows(env, name, byName.get(name)?.rows || []);
  }

  if (preservedAdmin) {
    await backupInsertRows(env, "admin_users", [preservedAdmin]);
  }

  await securityAudit(env, actor, "BACKUP_RESTORED", "backup", id, {
    safetyBackupId: safety.id,
    tablesRestored: restoreTables.length,
    rowsRestored,
    preservedCurrentSuperAdmin: !!preservedAdmin
  });
  await backupSetState(env, "lastRestore", securityNowIso());
  return { success: true, id, safetyBackupId: safety.id, tablesRestored: restoreTables.length, rowsRestored };
}

async function backupPurgeRetention(env, days = BACKUP_RETENTION_DAYS) {
  await backupEnsureSchema(env);
  const cutoff = new Date(Date.now() - Number(days || BACKUP_RETENTION_DAYS) * 86400000).toISOString();
  const rows = await env.DB.prepare("SELECT * FROM admin_backups WHERE kind='automatic' AND createdAt < ? ORDER BY createdAt ASC").bind(cutoff).all();
  let deleted = 0;
  for (const row of rows.results || []) {
    try {
      const bucket = backupStorageFromRow(env, row);
      await bucket.delete(row.storageKey);
      await env.DB.prepare("DELETE FROM admin_backups WHERE id=?").bind(row.id).run();
      deleted++;
    } catch (_) {}
  }
  return deleted;
}

async function backupScheduledMaintenance(env) {
  const actor = backupSystemActor("scheduled-backup");
  try {
    await ensureSecuritySchema(env);
    await backupEnsureSchema(env);
    const snapshot = await backupCreateDatabaseSnapshot(env, actor, "automatic", "Daily scheduled backup");
    let media = { processed: 0, copied: 0, skipped: 0 };
    if (env.BACKUP_BUCKET && env.IMAGES_BUCKET) {
      let cursor = "";
      for (let page = 0; page < 10; page++) {
        const out = await backupSyncMediaBatch(env, cursor);
        media.processed += Number(out.processed || 0);
        media.copied += Number(out.copied || 0);
        media.skipped += Number(out.skipped || 0);
        cursor = out.nextCursor || "";
        if (!cursor) break;
      }
    }
    const purged = await backupPurgeRetention(env, BACKUP_RETENTION_DAYS);
    await securityAudit(env, actor, "BACKUP_SCHEDULED_COMPLETE", "backup", snapshot.id, { media, purged });
    return { snapshot, media, purged };
  } catch (error) {
    try {
      await v72SendEmail(env, env.ADMIN_EMAIL || "ceybreez@gmail.com", "CeyBreez automatic backup failed", `<p>The scheduled CeyBreez backup failed.</p><p><b>${escapeHtml(error?.message || String(error))}</b></p>`);
    } catch (_) {}
    throw error;
  }
}

async function backupHandleAdminRoute(request, env, url, actor) {
  if (actor?.role !== "super_admin") return jsonResponse({ error: "Super Admin access required" }, 403);
  await backupEnsureSchema(env);
  const path = url.pathname;

  if (path === "/api/admin/backups/status" && request.method === "GET") return jsonResponse(await backupStatus(env), 200);
  if (path === "/api/admin/backups" && request.method === "GET") return jsonResponse(await backupListSnapshots(env), 200);
  if (path === "/api/admin/backups" && request.method === "POST") {
    const data = await securityReadJson(request);
    return jsonResponse(await backupCreateDatabaseSnapshot(env, actor, "manual", data.notes || ""), 200);
  }
  if (path === "/api/admin/backups/media-sync" && request.method === "POST") {
    const data = await securityReadJson(request);
    const out = await backupSyncMediaBatch(env, data.cursor || "");
    await securityAudit(env, actor, "MEDIA_BACKUP_SYNC", "backup", "R2 media mirror", out);
    return jsonResponse(out, 200);
  }
  if (path === "/api/admin/backups/media-restore" && request.method === "POST") {
    const data = await securityReadJson(request);
    if (String(data.confirmation || "") !== "RESTORE MEDIA") return jsonResponse({ error: "Confirmation phrase must be exactly: RESTORE MEDIA" }, 400);
    const out = await backupRestoreMediaBatch(env, data.cursor || "");
    await securityAudit(env, actor, "MEDIA_BACKUP_RESTORE", "backup", "R2 media mirror", out);
    return jsonResponse(out, 200);
  }
  const download = path.match(/^\/api\/admin\/backups\/([^/]+)\/download$/);
  if (download && request.method === "GET") return backupDownloadSnapshot(env, decodeURIComponent(download[1]));
  const restore = path.match(/^\/api\/admin\/backups\/([^/]+)\/restore$/);
  if (restore && request.method === "POST") {
    const data = await securityReadJson(request);
    return jsonResponse(await backupRestoreSnapshot(env, actor, decodeURIComponent(restore[1]), data.confirmation || ""), 200);
  }
  return null;
}

async function securityPreRoute(request, env, url) {
  const path = url.pathname;
  if (!path.startsWith("/api/admin/")) return null;
  await ensureSecuritySchema(env);

  if (path === "/api/admin/auth/status" && request.method === "GET") return securityAuthStatus(env);
  if (path === "/api/admin/auth/bootstrap" && request.method === "POST") return securityBootstrap(request, env);
  if (path === "/api/admin/auth/login" && request.method === "POST") return securityLogin(request, env);
  if (path === "/api/admin/auth/logout" && request.method === "POST") return securityLogout(request, env);
  if (path === "/api/admin/auth/me" && request.method === "GET") return securityAuthMe(request, env);
  if (path === "/api/admin/auth/forgot-password" && request.method === "POST") return securityForgotPassword(request, env);
  if (path === "/api/admin/auth/reset-password" && request.method === "POST") return securityCompletePasswordReset(request, env);
  if (path === "/api/admin/auth/emergency-reset" && request.method === "POST") return securityEmergencyPasswordReset(request, env);

  const actor = await getAdminActor(request, env);
  if (!actor) return jsonResponse({ error: "Unauthorized or expired admin session" }, 401);

  if (path === "/api/admin/backups" || path.startsWith("/api/admin/backups/")) {
    const backupResponse = await backupHandleAdminRoute(request, env, url, actor);
    if (backupResponse) return backupResponse;
  }

  if (path === "/api/admin/users" && request.method === "GET") return securityListUsers(request, env);
  if (path === "/api/admin/users" && request.method === "POST") return securityCreateUser(request, env);
  const userMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (userMatch && request.method === "PUT") return securityUpdateUser(request, env, decodeURIComponent(userMatch[1]));
  const resetMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/reset-password$/);
  if (resetMatch && request.method === "POST") return securityResetPassword(request, env, decodeURIComponent(resetMatch[1]));
  const revokeMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/revoke-sessions$/);
  if (revokeMatch && request.method === "POST") return securityRevokeSessions(request, env, decodeURIComponent(revokeMatch[1]));

  if (path === "/api/admin/approvals" && request.method === "GET") return securityListApprovals(request, env, url);
  const approveMatch = path.match(/^\/api\/admin\/approvals\/([^/]+)\/approve$/);
  if (approveMatch && request.method === "POST") return securityApproveChange(request, env, decodeURIComponent(approveMatch[1]));
  const rejectMatch = path.match(/^\/api\/admin\/approvals\/([^/]+)\/reject$/);
  if (rejectMatch && request.method === "POST") return securityRejectChange(request, env, decodeURIComponent(rejectMatch[1]));
  if (path === "/api/admin/audit-log" && request.method === "GET") return securityListAudit(request, env);

  if (securityIsControlPath(path)) return jsonResponse({ error: "Super Admin access required" }, 403);

  const module = securityModuleFromPath(path);
  if (securityIsUploadPath(path)) {
    const cmsPerms = actor.role === "super_admin" || ["properties", "tours", "services", "pageBuilder"].some(p => securitySafePermissions(actor.permissions).includes(p));
    if (!cmsPerms) return jsonResponse({ error: "No media upload permission" }, 403);
    if (actor.role === "viewer") return jsonResponse({ error: "Read-only users cannot upload media" }, 403);
    return null;
  }
  if (!securityCanAccess(actor, module)) return jsonResponse({ error: `No permission for ${module}` }, 403);

  if (actor.role === "viewer" && !["GET", "HEAD"].includes(request.method)) {
    return jsonResponse({ error: "Read-only users cannot make changes" }, 403);
  }

  if (actor.role !== "super_admin" && actor.legacy !== true) {
    if (request.method === "DELETE") {
      return jsonResponse({ error: "Only Super Admin can delete records" }, 403);
    }
    if (["POST", "PUT", "PATCH"].includes(request.method)) {
      return securityQueueChange(request, env, actor, module, url);
    }
  }

  return null;
}

/* =========================
   HELPERS
========================= */

function safeJson(value) {
  try {
    return JSON.parse(value || "[]");
  } catch {
    return [];
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value)
    .split("\n")
    .map(item => item.trim())
    .filter(Boolean);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function getDateRange(dateFrom, dateTo) {
  const dates = [];
  const start = new Date(`${dateFrom}T00:00:00`);
  const end = new Date(`${dateTo}T00:00:00`);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return dates;
  }

  const cursor = new Date(start);

  while (cursor < end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}
async function sendResendEmail(env, { to, subject, html, reply_to }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "CeyBreez <inquiry@ceybreez.com>",
      to: [to],
      subject,
      html,
      reply_to
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      result
    };
  }

  return {
    success: true,
    result
  };
}

function buildAdminEmail(data) {
  const cleanMobile = String(data.guestMobile || "").replace(/[^\d]/g, "");
  const whatsappUrl = cleanMobile
    ? `https://api.whatsapp.com/send?phone=${cleanMobile}`
    : "https://api.whatsapp.com/send?phone=94704620017";

  const replyUrl = data.guestEmail
    ? `mailto:${encodeURIComponent(data.guestEmail)}?subject=${encodeURIComponent("Re: CeyBreez Inquiry " + data.reference)}`
    : "mailto:ceybreez@gmail.com";

  return `
  <div style="font-family:Arial,sans-serif;background:#f6f3ec;padding:24px;color:#222;">
    <div style="max-width:760px;margin:auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5dfd2;">

      <div style="background:#0f766e;color:white;padding:24px;">
        <img src="https://ceybreez.com/logo.png" alt="CeyBreez" width="110" style="display:block;margin-bottom:14px;">
        <h1 style="margin:0;font-size:26px;">New CeyBreez Travel Inquiry</h1>
        <p style="margin:8px 0 0;">Reference: <strong>${escapeHtml(data.reference)}</strong></p>
      </div>

      <div style="padding:24px;">
        <div style="margin-bottom:18px;">
          <span style="display:inline-block;background:#0f766e;color:#fff;padding:7px 14px;border-radius:999px;font-size:13px;font-weight:bold;">
            ${escapeHtml(data.serviceType || "Travel Inquiry")}
          </span>
        </div>

        <h2 style="color:#0f766e;margin-top:0;">Guest Details</h2>

        ${tableRows([
          ["Reference No", data.reference],
          ["Service Type", data.serviceType],
          ["Property / Tour / Request", data.itemName || "-"],
          ["Guest Name", data.guestName],
          ["Email", data.guestEmail],
          ["Mobile", data.guestMobile],
          ["Country", data.guestCountry],
          ["Guests", data.guests],
          ["Travel Dates", `${data.dateFrom || "Not provided"} to ${data.dateTo || "Not provided"}`]
        ])}

        <div style="margin:22px 0;">
          <a href="${replyUrl}"
             style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold;margin:0 8px 8px 0;">
             Reply to Guest
          </a>

          <a href="${whatsappUrl}"
             style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold;margin:0 8px 8px 0;">
             WhatsApp Guest
          </a>

          <a href="https://ceybreez.com/admin"
             style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold;margin:0 8px 8px 0;">
             Open Admin Panel
          </a>
        </div>

        <h2 style="color:#0f766e;margin-top:28px;">Inquiry Details</h2>

        <div style="background:#f8f3eb;border-radius:14px;padding:18px;white-space:pre-wrap;line-height:1.6;border:1px solid #eee;">
${escapeHtml(data.message)}
        </div>
      </div>

      <div style="background:#111827;color:#fff;padding:18px;text-align:center;font-size:13px;">
        CeyBreez Travel Inquiry System<br>
        <span style="opacity:.8;">Stay. Taste. Explore Sri Lanka.</span>
      </div>

    </div>
  </div>
  `;
}

function buildGuestEmail(data) {
  return `
  <div style="font-family:Arial,sans-serif;background:#f6f3ec;padding:24px;color:#222;">
    <div style="max-width:720px;margin:auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5dfd2;">

      <div style="background:#0f766e;color:white;padding:24px;text-align:center;">
        <img src="https://ceybreez.com/logo.png" alt="CeyBreez" width="120" style="display:block;margin:0 auto 14px;">
        <h1 style="margin:0;font-size:26px;">Thank You For Your Inquiry</h1>
        <p style="margin:8px 0 0;">Your travel request has been received successfully.</p>
      </div>

      <div style="padding:24px;">
        <p>Dear ${escapeHtml(data.guestName)},</p>

        <p>
          Thank you for choosing <strong>CeyBreez</strong>. We have successfully received your inquiry.
          Our team will review your details and contact you shortly with the next steps.
        </p>

        <div style="background:#f8f3eb;border:1px solid #eadfce;border-radius:14px;padding:18px;margin:22px 0;text-align:center;">
          <p style="margin:0 0 8px;color:#555;">Your Reference Number</p>
          <div style="font-size:24px;font-weight:bold;color:#0f766e;">
            ${escapeHtml(data.reference)}
          </div>
        </div>

        <h2 style="color:#0f766e;">Your Inquiry Summary</h2>

        ${tableRows([
          ["Service Type", data.serviceType],
          ["Property / Tour / Request", data.itemName || "-"],
          ["Travel Dates", `${data.dateFrom || "Not provided"} to ${data.dateTo || "Not provided"}`],
          ["Guests", data.guests || "Not provided"]
        ])}

        <h2 style="color:#0f766e;margin-top:28px;">Submitted Details</h2>

        <div style="background:#f8f3eb;border-radius:14px;padding:18px;white-space:pre-wrap;line-height:1.6;border:1px solid #eee;">
${escapeHtml(data.message)}
        </div>

        <div style="margin-top:24px;text-align:center;">
          <a href="https://api.whatsapp.com/send?phone=94704620017"
             style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold;margin:0 8px 8px 0;">
             Contact on WhatsApp
          </a>

          <a href="https://ceybreez.com"
             style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold;margin:0 8px 8px 0;">
             Visit Website
          </a>
        </div>

        <p style="margin-top:24px;">
          Best regards,<br>
          <strong>CeyBreez Team</strong><br>
          <a href="https://ceybreez.com" style="color:#0f766e;">www.ceybreez.com</a>
        </p>
      </div>

      <div style="background:#111827;color:#fff;padding:18px;text-align:center;font-size:13px;">
        CeyBreez — Stay. Taste. Explore Sri Lanka.
      </div>

    </div>
  </div>
  `;
}

function buildStatusEmail(data) {
  const status = String(data.status || "").toLowerCase();
  const isBooked = status === "booked";

  const titles = {
    contacted: "We Are Reviewing Your Inquiry",
    quoted: "Your CeyBreez Quote Update",
    booked: "Your Booking Has Been Confirmed",
    cancelled: "Your Booking Has Been Cancelled",
    closed: "Your CeyBreez Inquiry Has Been Closed"
  };

  const messages = {
    contacted: "Our team has reviewed your inquiry and will contact you shortly.",
    quoted: "We have updated your inquiry status to Quoted. Please contact us if you need any clarification.",
    booked: "We are pleased to confirm your booking with CeyBreez.",
    cancelled: "Your booking has been marked as Cancelled. Please contact us if this needs correction.",
    closed: "Your inquiry has been closed. Thank you for choosing CeyBreez."
  };

  const title = titles[status] || `CeyBreez Status Update: ${data.status || ""}`;
  const message = messages[status] || "Your CeyBreez inquiry status has been updated.";

  const rows = [
    ["Reference", data.reference],
    ["Status", data.status],
    ["Service Type", data.serviceType],
    ["Property / Tour", data.itemName],
    ["Check In Date", data.dateFrom],
    ["Check Out Date", data.dateTo]
  ];

  if (isBooked) {
    rows.push(
      ["Check-in Time", data.checkInTime],
      ["Check-out Time", data.checkOutTime],
      ["Guests", data.guests],
      ["Total Nights", data.totalDays],
      ["Day / Night Rate", data.dayRate],
      ["Total Amount", data.totalAmount]
    );
  }

  if (data.adminMessage) {
    rows.push(["Message from CeyBreez", data.adminMessage]);
  }

  return `
  <div style="font-family:Arial,sans-serif;background:#f6f3ec;padding:24px;color:#222;">
    <div style="max-width:720px;margin:auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5dfd2;">
      <div style="background:#0f766e;color:white;padding:24px;text-align:center;">
        <img src="https://ceybreez.com/logo.png" alt="CeyBreez" width="120" style="display:block;margin:0 auto 14px;">
        <h1 style="margin:0;font-size:26px;">${escapeHtml(title)}</h1>
        <p style="margin:8px 0 0;">Reference: <strong>${escapeHtml(data.reference || "")}</strong></p>
      </div>

      <div style="padding:24px;">
        <p>Dear ${escapeHtml(data.guestName || "Guest")},</p>
        <p>${escapeHtml(message)}</p>

        ${tableRows(rows)}

        <div style="margin-top:24px;text-align:center;">
          <a href="https://api.whatsapp.com/send?phone=94704620017"
             style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold;margin:0 8px 8px 0;">
             Contact CeyBreez on WhatsApp
          </a>

          <a href="https://ceybreez.com"
             style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold;margin:0 8px 8px 0;">
             Visit Website
          </a>
        </div>

        <p style="margin-top:24px;">
          Best regards,<br>
          <strong>CeyBreez Team</strong>
        </p>
      </div>

      <div style="background:#111827;color:#fff;padding:18px;text-align:center;font-size:13px;">
        CeyBreez — Stay. Taste. Explore Sri Lanka.
      </div>
    </div>
  </div>
  `;
}

function tableRows(rows) {
  const body = rows.map(([key, value]) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #eee;font-weight:bold;width:35%;background:#fafafa;color:#111827;">${escapeHtml(key)}</td>
      <td style="padding:12px;border-bottom:1px solid #eee;color:#222;">${escapeHtml(value || "Not provided")}</td>
    </tr>
  `).join("");

  return `
    <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:12px;overflow:hidden;">
      ${body}
    </table>
  `;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "https://ceybreez.com",
    "Access-Control-Allow-Methods": "POST, GET, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
