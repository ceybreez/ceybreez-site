/* =========================
   REVIEWS MANAGEMENT
========================= */

async function loadReviews(){
  try{
    const res = await fetch(`${API_BASE}/api/admin/reviews`, { headers: authHeaders() });
    const data = await res.json();

    if(!res.ok) throw new Error(data.error || "Failed to load reviews");

    allReviews = data || [];
    renderReviewsSummary();
    renderReviewsTable();
  }catch(err){
    const tbody = document.getElementById("reviewsTableBody");
    if(tbody) tbody.innerHTML = `<tr><td colspan="8" class="empty-row">${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderReviewsSummary(){
  const box = document.getElementById("reviewsSummary");
  if(!box) return;

  const published = allReviews.filter(x => x.active).length;
  const featured = allReviews.filter(x => x.featured).length;
  const avg = allReviews.length
    ? (allReviews.reduce((s,x)=>s + Number(x.rating || 0),0) / allReviews.length).toFixed(1)
    : "0.0";

  box.innerHTML = `
    <div class="dashboard-card"><h3>Total Reviews</h3><div class="value">${allReviews.length}</div></div>
    <div class="dashboard-card card-booked"><h3>Published</h3><div class="value">${published}</div></div>
    <div class="dashboard-card"><h3>Featured</h3><div class="value">${featured}</div></div>
    <div class="dashboard-card"><h3>Average Rating</h3><div class="value">${avg}</div></div>
  `;
}

function renderReviewsTable(){
  const tbody = document.getElementById("reviewsTableBody");
  if(!tbody) return;

  const search = (document.getElementById("reviewSearch")?.value || "").toLowerCase();
  const type = document.getElementById("reviewTypeFilter")?.value || "all";
  const status = document.getElementById("reviewStatusFilter")?.value || "all";

  let data = allReviews.filter(r => {
    const text = `${r.guestName || ""} ${r.country || ""} ${r.itemName || ""} ${r.title || ""} ${r.message || ""}`.toLowerCase();
    const typeOk = type === "all" || String(r.type || "") === type;
    const statusOk =
      status === "all" ||
      (status === "published" && r.active) ||
      (status === "hidden" && !r.active) ||
      (status === "featured" && r.featured);

    return typeOk && statusOk && (!search || text.includes(search));
  });

  if(!data.length){
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row">No reviews found</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(r => `
    <tr class="clickable-row" onclick="editReview('${escapeJs(r.id)}')">
      <td>${formatDate(r.createdAt || r.created_at || "")}</td>
      <td><strong>${escapeHtml(r.guestName || "-")}</strong><br><small>${escapeHtml(r.country || "")}</small></td>
      <td>${escapeHtml(r.type || "-")}</td>
      <td>${escapeHtml(r.itemName || "-")}</td>
      <td>${"★".repeat(Number(r.rating || 0))}</td>
      <td>${r.active ? cmsStatusBadge(true) : cmsStatusBadge(false)}</td>
      <td>${cmsFeaturedBadge(r.featured)}</td>
      <td onclick="event.stopPropagation();">
        <button class="mini-btn" onclick="editReview('${escapeJs(r.id)}')">Edit</button>
        <button class="delete-btn mini-btn" onclick="deleteReview('${escapeJs(r.id)}')">Delete</button>
      </td>
    </tr>
  `).join("");
}

function openReviewForm(){
  document.getElementById("reviewForm")?.reset();
  document.getElementById("reviewEditId").value = "";
  document.getElementById("reviewActive").checked = true;
  document.getElementById("reviewFeatured").checked = false;
  document.getElementById("reviewModalTitle").textContent = "Add Review";
  document.getElementById("reviewModal").classList.remove("hidden");
}

function closeReviewForm(){
  document.getElementById("reviewModal").classList.add("hidden");
}

function editReview(id){
  const r = allReviews.find(x => String(x.id) === String(id));
  if(!r) return;

  document.getElementById("reviewModalTitle").textContent = "Edit Review";
  document.getElementById("reviewEditId").value = r.id || "";
  document.getElementById("reviewType").value = r.type || "property";
  document.getElementById("reviewItemName").value = r.itemName || "";
  document.getElementById("reviewGuestName").value = r.guestName || "";
  document.getElementById("reviewCountry").value = r.country || "";
  document.getElementById("reviewRating").value = r.rating || "5";
  document.getElementById("reviewTitle").value = r.title || "";
  document.getElementById("reviewMessage").value = r.message || "";
  document.getElementById("reviewGuestPhoto").value = r.guestPhoto || "";
  document.getElementById("reviewSource").value = r.source || "Manual";
  document.getElementById("reviewSourceUrl").value = r.sourceUrl || "";
  document.getElementById("reviewActive").checked = !!r.active;
  document.getElementById("reviewFeatured").checked = !!r.featured;

  document.getElementById("reviewModal").classList.remove("hidden");
}

async function saveReview(e){
  e.preventDefault();

  const id = document.getElementById("reviewEditId").value || "";

  const data = {
    id,
    type: document.getElementById("reviewType").value,
    itemName: document.getElementById("reviewItemName").value.trim(),
    guestName: document.getElementById("reviewGuestName").value.trim(),
    country: document.getElementById("reviewCountry").value.trim(),
    rating: document.getElementById("reviewRating").value,
    title: document.getElementById("reviewTitle").value.trim(),
    message: document.getElementById("reviewMessage").value.trim(),
    guestPhoto: document.getElementById("reviewGuestPhoto").value.trim(),
    source: document.getElementById("reviewSource").value,
    sourceUrl: document.getElementById("reviewSourceUrl").value.trim(),
    active: document.getElementById("reviewActive").checked,
    featured: document.getElementById("reviewFeatured").checked
  };

  if(!data.itemName || !data.guestName || !data.message){
    alert("Please fill item name, guest name and review message.");
    return;
  }

  const res = await fetch(`${API_BASE}/api/admin/reviews`, {
    method:"POST",
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  const result = await res.json();

  if(!res.ok){
    alert(result.error || "Review save failed");
    return;
  }

  alert(result.message || "Review saved");
  closeReviewForm();
  await loadReviews();
}

async function deleteReview(id){
  if(!confirm("Delete this review?")) return;

  const res = await fetch(`${API_BASE}/api/admin/reviews/${id}`, {
    method:"DELETE",
    headers: authHeaders()
  });

  const result = await res.json();

  if(!res.ok){
    alert(result.error || "Review delete failed");
    return;
  }

  alert("Review deleted");
  await loadReviews();
}

