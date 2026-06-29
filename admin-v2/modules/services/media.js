/* SERVICE IMAGE UPLOADS */

function handleServiceImageDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-active");

  const file = event.dataTransfer.files[0];
  uploadSingleServiceImage(file);
}

function uploadServiceImage() {
  const input = document.getElementById("serviceImageUploader");
  if (!input.files.length) return;

  uploadSingleServiceImage(input.files[0]);
  input.value = "";
}

async function uploadSingleServiceImage(file) {
  if (!file) return alert("Please select image first.");

  const status = document.getElementById("serviceImageUploadStatus");
  const imageBox = document.getElementById("serviceImage");

  status.textContent = "Uploading image...";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "services");

  try {
    const res = await fetch(`${API_BASE}/api/admin/upload-image`, {
      method: "POST",
      headers: uploadHeaders(),
      body: formData
    });

    const result = await res.json();

    if (!res.ok) throw new Error(result.error || "Upload failed");

    imageBox.value = result.url;
    status.textContent = "Main image uploaded.";
  } catch (err) {
    status.textContent = "";
    alert(err.message);
  }
}

function handleServicePhotosDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-active");

  uploadServicePhotosList(event.dataTransfer.files);
}

function uploadServicePhotos() {
  const input = document.getElementById("servicePhotosUploader");
  if (!input.files.length) return;

  uploadServicePhotosList(input.files);
  input.value = "";
}

async function uploadServicePhotosList(files) {
  const status = document.getElementById("servicePhotosUploadStatus");
  const photosBox = document.getElementById("servicePhotos");

  if (!files || !files.length) return alert("Please select photos first.");

  status.textContent = `Uploading ${files.length} photo(s)...`;

  const uploadedUrls = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "services");

    try {
      const res = await fetch(`${API_BASE}/api/admin/upload-image`, {
        method: "POST",
        headers: uploadHeaders(),
        body: formData
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Upload failed");

      uploadedUrls.push(result.url);
    } catch (err) {
      alert(err.message);
    }
  }

  if (uploadedUrls.length) {
    const existing = photosBox.value.trim();
    photosBox.value = [existing, ...uploadedUrls].filter(Boolean).join("\n");
    renderServicePhotosPreview();
    status.textContent = "Gallery photos uploaded.";
  } else {
    status.textContent = "No photos uploaded.";
  }
}

function renderServicePhotosPreview() {
  const box = document.getElementById("servicePhotosPreview");
  const photosBox = document.getElementById("servicePhotos");

  if (!box || !photosBox) return;

  const urls = linesToArray(photosBox.value);

  box.innerHTML = "";

  urls.forEach((url, index) => {
    const item = document.createElement("div");
    item.className = "preview-item";

    item.innerHTML = `
      <img src="${url}" alt="Service Photo ${index + 1}" onclick="openImagePreview('${url}')">
      <button type="button" onclick="removeServicePhoto(${index})">×</button>
    `;

    box.appendChild(item);
  });
}

function removeServicePhoto(index) {
  const photosBox = document.getElementById("servicePhotos");
  const urls = linesToArray(photosBox.value);

  urls.splice(index, 1);
  photosBox.value = urls.join("\n");

  renderServicePhotosPreview();
}


