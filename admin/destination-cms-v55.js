/* =========================================================
   CEYBREEZ DESTINATION CMS V5.9
   Safe UI enhancement only. Uses the existing destinations API,
   current D1 fields and R2 upload endpoint. No Worker change.
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

function v59HttpUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch (_) {
    return "";
  }
}

function v59Coords() {
  const latRaw = String(document.getElementById("destLat")?.value || "").trim();
  const lngRaw = String(document.getElementById("destLng")?.value || "").trim();
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  const valid = latRaw !== "" && lngRaw !== "" && Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  return { latRaw, lngRaw, lat, lng, valid };
}

function v59DestinationReadiness() {
  const get = id => String(document.getElementById(id)?.value || "").trim();
  const photos = v55DestinationPhotoUrls();
  const cover = get("destLogo") || photos[0] || "";
  const description = get("destDescription");
  const coords = v59Coords();
  const mapUrl = get("destMapUrl");
  const active = !!document.getElementById("destActive")?.checked;

  const checks = [
    { label: "Destination name", ok: !!get("destName"), level: "required" },
    { label: "Province", ok: !!get("destProvince"), level: "required" },
    { label: "Nearest city / area", ok: !!get("destArea"), level: "required" },
    { label: "Map coordinates", ok: coords.valid, level: "required" },
    { label: "Cover image", ok: !!cover, level: active ? "recommended" : "optional" },
    { label: "Travel article", ok: description.length >= 80, level: "recommended" },
    { label: "Gallery (2+ photos)", ok: photos.length >= 2, level: "recommended" },
    { label: "Best For", ok: !!get("destBestFor"), level: "recommended" },
    { label: "Time Needed", ok: !!get("destTime"), level: "recommended" },
    { label: "Nearby Places", ok: !!get("destNearby"), level: "recommended" },
    { label: "Map link", ok: !mapUrl || !!v59HttpUrl(mapUrl), level: mapUrl ? "required" : "optional" }
  ];

  const requiredMissing = checks.filter(x => x.level === "required" && !x.ok);
  const recommendations = checks.filter(x => x.level === "recommended" && !x.ok);
  return { checks, requiredMissing, recommendations, cover, photos, description, coords, mapUrl, active };
}

function v59RenderDestinationChecklist() {
  let panel = document.getElementById("v59DestinationChecklist");
  const side = document.querySelector("#destinationForm .v55-editor-side");
  if (!side) return;

  if (!panel) {
    panel = document.createElement("section");
    panel.id = "v59DestinationChecklist";
    panel.className = "v55-editor-card v59-readiness-card";
    const savePanel = side.querySelector(".v55-save-panel");
    if (savePanel) side.insertBefore(panel, savePanel);
    else side.appendChild(panel);
  }

  const state = v59DestinationReadiness();
  const ready = state.requiredMissing.length === 0;
  const statusText = ready
    ? (state.recommendations.length ? `Ready to save · ${state.recommendations.length} improvement${state.recommendations.length === 1 ? "" : "s"}` : "Ready to publish")
    : `${state.requiredMissing.length} required item${state.requiredMissing.length === 1 ? "" : "s"} missing`;

  const row = item => `
    <li class="${item.ok ? "ok" : (item.level === "required" ? "bad" : "warn")}">
      <span class="v59-check-icon">${item.ok ? "✓" : (item.level === "required" ? "!" : "•")}</span>
      <span>${item.label}</span>
    </li>`;

  panel.innerHTML = `
    <div class="v55-editor-card-head">
      <div><span>Check</span><h3>Publishing Checklist</h3></div>
    </div>
    <div class="v59-readiness-status ${ready ? "ready" : "needs-work"}">${statusText}</div>
    <ul class="v59-readiness-list">${state.checks.filter(x => x.level !== "optional").map(row).join("")}</ul>
    <div class="v59-readiness-actions">
      <button type="button" class="mini-btn" onclick="window.open('../tours.html#destinationDiscovery','_blank','noopener')">Open Public Tours Page</button>
      <button type="button" class="mini-btn" onclick="v59UseFirstGalleryAsCover()" ${state.photos.length ? "" : "disabled"}>Use First Gallery Photo</button>
    </div>`;
}

function v59UseFirstGalleryAsCover() {
  const first = v55DestinationPhotoUrls()[0] || "";
  if (!first) return;
  v55SetCoverFromUrl(first);
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
    v59RenderDestinationChecklist();
    return;
  }

  const img = document.createElement("img");
  img.src = cover;
  img.alt = "Destination cover preview";
  img.loading = "lazy";
  img.addEventListener("error", () => {
    preview.innerHTML = '<span class="v59-image-error">Cover image could not be loaded</span>';
  }, { once: true });
  img.addEventListener("click", () => {
    if (typeof openImagePreview === "function") openImagePreview(cover);
  });
  preview.appendChild(img);
  v59RenderDestinationChecklist();
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
  if (Number(file.size || 0) > 15 * 1024 * 1024) {
    alert("Please use an image smaller than 15 MB.");
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
  v59RenderDestinationChecklist();
}

function v55OpenDestinationMapPreview() {
  const mapUrl = (document.getElementById("destMapUrl")?.value || "").trim();
  const { latRaw, lngRaw, valid } = v59Coords();

  let target = mapUrl ? v59HttpUrl(mapUrl) : "";
  if (!target && valid) target = `https://www.google.com/maps?q=${encodeURIComponent(latRaw + "," + lngRaw)}`;
  if (!target) {
    alert("Add a valid map URL or valid latitude / longitude first.");
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
      img.addEventListener("error", () => {
        imageBox.innerHTML = '<span class="v59-image-error">Image unavailable</span>';
      }, { once: true });
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
  const articleSmall = count?.parentElement;
  if (articleSmall) {
    const words = description.trim() ? description.trim().split(/\s+/).filter(Boolean).length : 0;
    articleSmall.title = `${words} words`;
  }

  v59RenderDestinationChecklist();
}

function v59ValidateDestinationSubmit(event) {
  const state = v59DestinationReadiness();
  if (state.requiredMissing.length) {
    event.preventDefault();
    event.stopImmediatePropagation();
    alert(`Please complete these required destination details:\n\n- ${state.requiredMissing.map(x => x.label).join("\n- ")}`);
    return false;
  }

  if (state.mapUrl && !v59HttpUrl(state.mapUrl)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    alert("The map link is not a valid http/https URL.");
    return false;
  }

  if (state.active && !state.cover) {
    if (!confirm("This destination is Active but has no cover image. The public site will use a fallback image. Save anyway?")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return false;
    }
  }

  if (state.active && state.description.length < 80) {
    if (!confirm("The travel article is very short. Save this Active destination anyway?")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return false;
    }
  }
  return true;
}

(function initDestinationCmsV59(){
  function bind() {
    const ids = ["destName", "destProvince", "destArea", "destBestFor", "destTime", "destNearby", "destDescription", "destLat", "destLng", "destMapUrl", "destPhotos", "destActive", "destFeatured"];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el || el.dataset.v59Bound === "1") return;
      const handler = () => {
        if (id === "destPhotos" && typeof renderPhotoPreview === "function") renderPhotoPreview("dest");
        else v55RenderDestinationPreview();
        if (id === "destFeatured" && el.checked) {
          const active = document.getElementById("destActive");
          if (active && !active.checked) active.checked = true;
        }
        v59RenderDestinationChecklist();
      };
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
      el.dataset.v59Bound = "1";
    });

    const coverUrl = document.getElementById("v55DestCoverUrl");
    if (coverUrl && coverUrl.dataset.v59Bound !== "1") {
      coverUrl.addEventListener("input", () => {
        const hidden = document.getElementById("destLogo");
        if (hidden) hidden.value = coverUrl.value.trim();
        v55RenderDestinationPreview();
      });
      coverUrl.dataset.v59Bound = "1";
    }

    const form = document.getElementById("destinationForm");
    if (form && form.dataset.v59ValidationBound !== "1") {
      form.addEventListener("submit", v59ValidateDestinationSubmit, true);
      form.dataset.v59ValidationBound = "1";
    }

    v55RenderDestinationPreview();
    v59RenderDestinationChecklist();
    if (typeof v55UpdateDestinationStats === "function" && typeof allDestinations !== "undefined") v55UpdateDestinationStats(allDestinations || []);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
