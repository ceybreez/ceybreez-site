/* SECTION BUILDER MEDIA UPLOADS */

function handleSectionImageDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-active");
  uploadSectionFile(event.dataTransfer.files[0], "sectionImage", "section-images");
}

function handleSectionVideoDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-active");
  uploadSectionFile(event.dataTransfer.files[0], "sectionVideo", "section-videos");
}

function handleSectionBackgroundDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-active");
  uploadSectionFile(event.dataTransfer.files[0], "sectionBackgroundImage", "section-backgrounds");
}

function uploadSectionImage() {
  const input = document.getElementById("sectionImageUploader");
  if (!input.files.length) return;
  uploadSectionFile(input.files[0], "sectionImage", "section-images");
  input.value = "";
}

function uploadSectionVideo() {
  const input = document.getElementById("sectionVideoUploader");
  if (!input.files.length) return;
  uploadSectionFile(input.files[0], "sectionVideo", "section-videos");
  input.value = "";
}

function uploadSectionBackground() {
  const input = document.getElementById("sectionBackgroundUploader");
  if (!input.files.length) return;
  uploadSectionFile(input.files[0], "sectionBackgroundImage", "section-backgrounds");
  input.value = "";
}

async function uploadSectionFile(file, targetInputId, folder) {
  if (!file) return alert("Please select a file first.");

  const target = document.getElementById(targetInputId);
  if (target) target.value = "Uploading...";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  try {
    const res = await fetch(`${API_BASE}/api/admin/upload-image`, {
      method: "POST",
      headers: uploadHeaders(),
      body: formData
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Upload failed");

    if (target) target.value = result.url;
    alert("Upload completed");
  } catch (err) {
    if (target) target.value = "";
    alert(err.message);
  }
}

function renderPhotoPreview(type) {
  const photosBox = getPhotosBox(type);
  const previewBox = type === "dest"
    ? document.getElementById("destPhotoPreview")
    : document.getElementById("propPhotoPreview");

  const urls = linesToArray(photosBox.value);
  previewBox.innerHTML = "";

  urls.forEach((url, index) => {
    const item = document.createElement("div");
    item.className = "preview-item";
    item.innerHTML = `
      <img src="${url}" alt="Photo ${index + 1}" onclick="openImagePreview('${url}')">
      <button type="button" onclick="removePhoto('${type}', ${index})">×</button>
    `;
    previewBox.appendChild(item);
  });
}

function removePhoto(type, index) {
  const photosBox = getPhotosBox(type);
  const urls = linesToArray(photosBox.value);
  urls.splice(index, 1);
  photosBox.value = urls.join("\n");
  renderPhotoPreview(type);
}


