/* V6.3 hard modal open/close - wraps header + form in one centered shell */
function v6OpenCmsModal(formBoxId, title){
  const box = document.getElementById(formBoxId);
  if(!box) return;

  const form = box.querySelector("form");
  if(!form) return;

  // Remove any old/double headers and shells from earlier patches
  box.querySelectorAll(".v6-cms-modal-head").forEach(h => h.remove());

  let shell = box.querySelector(".v6-cms-modal-shell");

  if(!shell){
    shell = document.createElement("div");
    shell.className = "v6-cms-modal-shell";
    box.insertBefore(shell, box.firstChild);
  }

  const head = document.createElement("div");
  head.className = "v6-cms-modal-head";
  head.innerHTML = `<h3>${escapeHtml(title || "Edit Details")}</h3><button type="button" onclick="v6CloseCmsModal('${formBoxId}')">×</button>`;

  shell.innerHTML = "";
  shell.appendChild(head);
  shell.appendChild(form);

  // Inline hard styles to beat older CSS conflicts
  box.style.position = "fixed";
  box.style.inset = "0";
  box.style.width = "100vw";
  box.style.height = "100vh";
  box.style.margin = "0";
  box.style.padding = "24px";
  box.style.zIndex = "2147483000";
  box.style.background = "rgba(0,0,0,.62)";
  box.style.display = "block";

  shell.style.position = "fixed";
  shell.style.top = "50%";
  shell.style.left = "50%";
  shell.style.transform = "translate(-50%, -50%)";
  shell.style.width = "min(980px, 96vw)";
  shell.style.maxHeight = "92vh";
  shell.style.background = "#fff";
  shell.style.borderRadius = "22px";
  shell.style.overflow = "hidden";
  shell.style.boxShadow = "0 24px 70px rgba(0,0,0,.35)";

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

  // Clear only overlay inline display. Keep form inside shell; it will reopen correctly.
  box.style.display = "none";
}


