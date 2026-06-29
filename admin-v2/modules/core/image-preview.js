/* IMAGE PREVIEW */

function openImagePreview(url) {
  document.getElementById("previewFullImage").src = url;
  document.getElementById("imagePreviewModal").style.display = "flex";
}

function closeImagePreview() {
  document.getElementById("imagePreviewModal").style.display = "none";
}

