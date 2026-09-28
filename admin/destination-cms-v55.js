/* =========================================================
   CEYBREEZ DESTINATION CMS V5.5
   UI-only enhancement. Uses the existing destinations API,
   D1 fields and R2 image upload endpoint. No Worker change.
========================================================= */

function v55UpdateDestinationStats(items) {
  const rows = Array.isArray(items) ? items : [];
  const total = rows.length;
  const active = rows.filter(x => !!x.active).length;
  const featured = rows.filter(x => !!x.featured).length;
  const photos = rows.reduce((sum, x) => sum + (Array.isArray(x.photos) ? x.photos.filter(Boolean).length : 0), 0);

  const values = {
    v55DestTotal: total,
    v55DestActive: active,
    v55DestFeatured: featured,
    v55DestPhotos: photos
  };

  Object.entries(values).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  });
}

function v55DestinationPhotoUrls() {
  const box = document.getElementById("destPhotos");
  if (!box) return [];
  if (typeof linesToArray === "function") return linesToArray(box.value);
  return String(box.value || "").split("\n").map(x => x.trim()).filter(Boolean);
}

function renderDestinationCoverPreview() {
  const coverInput = document.getElementById("destLogo");
  const urlInput = document.getElementById("v55DestCoverUrl");
  const preview = document.getElementById("v55DestCoverPreview");
  if (!preview) return;

  const photos = v55DestinationPhotoUrls();
  const cover = (coverInput?.value || "").trim() || photos[0] || "";
  if (coverInput && !coverInput.value && cover) coverInput.value = cover;
  if (urlInput) urlInput.value = cover;

  preview.innerHTML = "";
  if (!cover) {
    const empty = document.createElement("span");
    empty.textContent = "No cover selected";
    preview.appendChild(empty);
    return;
  }

  const img = document.createElement("img");
  img.src = cover;
  img.alt = "Destination cover preview";
  img.loading = "lazy";
  img.addEventListener("click", () => {
    if (typeof openImagePreview === "function") openImagePreview(cover);
  });
  preview.appendChild(img);
}

function v55SetCoverFromUrl(value) {
  const cover = document.getElementById("destLogo");
  if (cover) cover.value = String(value || "").trim();
  renderDestinationCoverPreview();
  if (typeof renderPhotoPreview === "function") renderPhotoPreview("dest");
  v55RenderDestinationPreview();
}

async function v55UploadDestinationCover() {
  const input = document.getElementById("destLogoUploader");
  if (!input || !input.files || !input.files.length) return;
  await v55UploadDestinationCoverFile(input.files[0]);
  input.value = "";
}

function v55HandleCoverDrop(event) {
  event.preventDefault();
  event.currentTarget?.classList.remove("drag-active");
  const file = event.dataTransfer?.files?.[0];
  if (file) v55UploadDestinationCoverFile(file);
}

async function v55UploadDestinationCoverFile(file) {
  if (!file || !String(file.type || "").startsWith("image/")) {
    alert("Please select an image file.");
    return;
  }

  const status = document.getElementById("v55DestCoverStatus");
  if (status) status.textContent = "Uploading cover image...";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "destination-covers");

  try {
    const res = await fetch(`${API_BASE}/api/admin/upload-image`, {
      method: "POST",
      headers: typeof uploadHeaders === "function" ? uploadHeaders() : {},
      body: formData
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Cover upload failed");

    const cover = document.getElementById("destLogo");
    if (cover) cover.value = result.url || "";
    if (status) status.textContent = "Cover image uploaded.";
    renderDestinationCoverPreview();
    if (typeof renderPhotoPreview === "function") renderPhotoPreview("dest");
    v55RenderDestinationPreview();
  } catch (err) {
    if (status) status.textContent = "";
    alert(err.message || "Cover upload failed");
  }
}

function v55SetDestinationCover(index) {
  const photos = v55DestinationPhotoUrls();
  const url = photos[index];
  if (!url) return;
  const cover = document.getElementById("destLogo");
  if (cover) cover.value = url;
  renderDestinationCoverPreview();
  if (typeof renderPhotoPreview === "function") renderPhotoPreview("dest");
  v55RenderDestinationPreview();
}

function v55MoveDestinationPhoto(index, direction) {
  const photos = v55DestinationPhotoUrls();
  const next = index + Number(direction || 0);
  if (index < 0 || index >= photos.length || next < 0 || next >= photos.length) return;
  [photos[index], photos[next]] = [photos[next], photos[index]];
  const box = document.getElementById("destPhotos");
  if (box) box.value = photos.join("\n");
  if (typeof renderPhotoPreview === "function") renderPhotoPreview("dest");
}

function v55OpenDestinationMapPreview() {
  const mapUrl = (document.getElementById("destMapUrl")?.value || "").trim();
  const lat = (document.getElementById("destLat")?.value || "").trim();
  const lng = (document.getElementById("destLng")?.value || "").trim();

  let target = mapUrl;
  if (!target && lat && lng) target = `https://www.google.com/maps?q=${encodeURIComponent(lat + "," + lng)}`;
  if (!target) {
    alert("Add a map URL or latitude / longitude first.");
    return;
  }
  window.open(target, "_blank", "noopener,noreferrer");
}

function v55RenderDestinationPreview() {
  const preview = document.getElementById("v55DestinationCardPreview");
  if (!preview) return;

  const name = (document.getElementById("destName")?.value || "").trim() || "Destination Name";
  const province = (document.getElementById("destProvince")?.value || "").trim() || "Sri Lanka";
  const bestFor = (document.getElementById("destBestFor")?.value || "").trim() || "Best for travel experiences";
  const description = document.getElementById("destDescription")?.value || "";
  const cover = (document.getElementById("destLogo")?.value || "").trim() || v55DestinationPhotoUrls()[0] || "";

  const imageBox = preview.querySelector(".v55-public-card-image");
  if (imageBox) {
    imageBox.innerHTML = "";
    if (cover) {
      const img = document.createElement("img");
      img.src = cover;
      img.alt = name;
      imageBox.appendChild(img);
    } else {
      const span = document.createElement("span");
      span.textContent = "Destination image";
      imageBox.appendChild(span);
    }
  }

  const small = preview.querySelector("small");
  const strong = preview.querySelector("strong");
  const p = preview.querySelector("p");
  if (small) small.textContent = province.replace(/ Province$/i, "");
  if (strong) strong.textContent = name;
  if (p) p.textContent = bestFor;

  const count = document.getElementById("v55ArticleCount");
  if (count) count.textContent = String(description.length);

  renderDestinationCoverPreview();
}

(function initDestinationCmsV55(){
  function bind() {
    const ids = ["destName", "destProvince", "destArea", "destBestFor", "destTime", "destNearby", "destDescription", "destLat", "destLng", "destMapUrl", "destPhotos"];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el || el.dataset.v55Bound === "1") return;
      const handler = () => {
        if (id === "destPhotos" && typeof renderPhotoPreview === "function") renderPhotoPreview("dest");
        else v55RenderDestinationPreview();
      };
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
      el.dataset.v55Bound = "1";
    });
    v55RenderDestinationPreview();
    if (typeof v55UpdateDestinationStats === "function" && typeof allDestinations !== "undefined") v55UpdateDestinationStats(allDestinations || []);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
