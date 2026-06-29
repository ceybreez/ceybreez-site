/* V6.2 override CMS modal open/close to prevent duplicate floating headers */
function v6OpenCmsModal(formBoxId, title){
  const box = document.getElementById(formBoxId);
  if(!box) return;

  box.querySelectorAll(".v6-cms-modal-head").forEach(h => h.remove());

  const head = document.createElement("div");
  head.className = "v6-cms-modal-head";
  head.innerHTML = `<h3>${escapeHtml(title || "Edit Details")}</h3><button type="button" onclick="v6CloseCmsModal('${formBoxId}')">×</button>`;
  box.insertBefore(head, box.firstChild);

  box.classList.remove("hidden");
  box.classList.add("v6-cms-modal-open");

  v6WrapFormFields("#propertyForm");
  v6WrapFormFields("#destinationForm");
  v6WrapFormFields("#serviceForm");
}

function v6CloseCmsModal(formBoxId){
  const box = document.getElementById(formBoxId);
  if(!box) return;
  box.classList.add("hidden");
  box.classList.remove("v6-cms-modal-open");
  box.querySelectorAll(".v6-cms-modal-head").forEach(h => h.remove());
}


