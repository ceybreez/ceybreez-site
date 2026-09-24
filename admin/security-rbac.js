/* =====================================================
   CEYBREEZ ADMIN SECURITY V5.3.2
   Username/password login, roles, user management,
   approval queue, non-admin delete lock and audit UI.
===================================================== */
(function () {
  const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";
  const TOKEN_KEY = "CEYBREEZ_SESSION_TOKEN";
  const VALIDATED_KEY = "CEYBREEZ_SESSION_VALIDATED";
  const USER_KEY = "CEYBREEZ_CURRENT_USER";

  const MODULES = [
    ["dashboard", "Dashboard"],
    ["inquiries", "Inquiry Management"],
    ["bookings", "Booking Management"],
    ["availability", "Availability / Matrix"],
    ["properties", "Properties CMS"],
    ["tours", "Tours CMS"],
    ["services", "Cafe & Services CMS"],
    ["reviews", "Reviews"],
    ["finance", "Finance"],
    ["reports", "Reports"],
    ["pageBuilder", "Page Builder / Visual Designer"],
    ["settings", "Settings"]
  ];

  let currentUser = null;
  let uiObserver = null;
  let restoring = false;
  let activePasswordResetToken = "";

  function token() {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  }

  function authHeaders(json = true) {
    const headers = { Authorization: `Bearer ${token()}` };
    if (json) headers["Content-Type"] = "application/json";
    return headers;
  }

  async function api(path, options = {}) {
    const res = await fetch(API_BASE + path, {
      ...options,
      headers: {
        ...authHeaders(options.body instanceof FormData ? false : true),
        ...(options.headers || {})
      }
    });
    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await res.json().catch(() => ({}))
      : { text: await res.text().catch(() => "") };
    if (!res.ok) {
      const error = new Error(data.error || data.message || `Request failed (${res.status})`);
      error.status = res.status;
      throw error;
    }
    return data;
  }

  function setGlobalToken(value) {
    try { ADMIN_TOKEN = value || ""; } catch (_) {}
  }

  function setStoredUser(user) {
    currentUser = user || null;
    window.CEYBREEZ_CURRENT_USER = currentUser;
    if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(USER_KEY);
  }

  function clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(VALIDATED_KEY);
    sessionStorage.removeItem(USER_KEY);
    setGlobalToken("");
    setStoredUser(null);
  }

  function isSuperAdmin() {
    return currentUser?.role === "super_admin";
  }

  function canModule(module) {
    if (!currentUser) return false;
    if (isSuperAdmin()) return true;
    if (module === "dashboard") return true;
    return Array.isArray(currentUser.permissions) && currentUser.permissions.includes(module);
  }

  function showLogin(message = "") {
    document.documentElement.classList.remove("v15-authenticated");
    document.documentElement.classList.add("v15-logged-out");
    document.body.classList.remove("v15-authenticated", "v15-booting");
    document.body.classList.add("v15-logged-out");
    const panel = document.getElementById("adminPanel");
    if (panel) { panel.classList.add("hidden"); panel.style.display = "none"; }
    const login = document.getElementById("loginBox");
    if (login) { login.classList.remove("hidden"); login.style.display = "block"; }
    const msg = document.getElementById("securityLoginMessage");
    if (msg) msg.textContent = message;
    document.getElementById("v15BootScreen")?.remove();
  }

  function showPanel() {
    document.documentElement.classList.remove("v15-logged-out");
    document.documentElement.classList.add("v15-authenticated");
    document.body.classList.remove("v15-logged-out");
    document.body.classList.add("v15-authenticated", "v15-booting");
    const login = document.getElementById("loginBox");
    if (login) { login.classList.add("hidden"); login.style.display = "none"; }
    const panel = document.getElementById("adminPanel");
    if (panel) { panel.classList.remove("hidden"); panel.style.display = ""; }
  }

  function setAuthBox(name) {
    const boxes = {
      login: document.getElementById("securityNormalLoginBox"),
      bootstrap: document.getElementById("securityBootstrapBox"),
      forgot: document.getElementById("securityForgotBox"),
      reset: document.getElementById("securityResetBox")
    };
    Object.entries(boxes).forEach(([key, el]) => {
      if (el) el.classList.toggle("hidden", key !== name);
    });
  }

  function resetTokenFromHash() {
    const hash = String(location.hash || "");
    const match = hash.match(/(?:^#|[&#])reset=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  window.openForgotPassword = function openForgotPassword() {
    const msg = document.getElementById("securityLoginMessage");
    if (msg) msg.textContent = "";
    const forgotMsg = document.getElementById("forgotPasswordMessage");
    if (forgotMsg) forgotMsg.textContent = "";
    setAuthBox("forgot");
    document.getElementById("forgotIdentity")?.focus();
  };

  window.backToSecurityLogin = async function backToSecurityLogin() {
    activePasswordResetToken = "";
    if (location.hash.includes("reset=")) {
      history.replaceState(null, "", location.pathname + location.search);
    }
    document.getElementById("resetNewPassword") && (document.getElementById("resetNewPassword").value = "");
    document.getElementById("resetNewPasswordConfirm") && (document.getElementById("resetNewPasswordConfirm").value = "");
    await checkBootstrapStatus();
  };

  window.requestPasswordReset = async function requestPasswordReset() {
    const identity = document.getElementById("forgotIdentity")?.value.trim() || "";
    const button = document.getElementById("forgotPasswordBtn");
    const msg = document.getElementById("forgotPasswordMessage");
    if (!identity) return alert("Enter your username or recovery email.");
    if (button) { button.disabled = true; button.textContent = "Sending…"; }
    if (msg) msg.textContent = "";
    try {
      const res = await fetch(`${API_BASE}/api/admin/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Reset request failed");
      if (msg) msg.textContent = data.message || "If the account exists, a reset link has been sent.";
    } catch (error) {
      if (msg) msg.textContent = error.message || "Reset request failed.";
    } finally {
      if (button) { button.disabled = false; button.textContent = "Send Reset Link"; }
    }
  };

  window.completePasswordReset = async function completePasswordReset() {
    const password = document.getElementById("resetNewPassword")?.value || "";
    const confirmPassword = document.getElementById("resetNewPasswordConfirm")?.value || "";
    const button = document.getElementById("resetPasswordBtn");
    const msg = document.getElementById("resetPasswordMessage");
    if (!activePasswordResetToken) return alert("Reset link is missing or invalid.");
    if (password.length < 10) return alert("Password must be at least 10 characters.");
    if (password !== confirmPassword) return alert("Passwords do not match.");
    if (button) { button.disabled = true; button.textContent = "Resetting…"; }
    if (msg) msg.textContent = "";
    try {
      const res = await fetch(`${API_BASE}/api/admin/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: activePasswordResetToken, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Password reset failed");
      clearSession();
      activePasswordResetToken = "";
      history.replaceState(null, "", location.pathname + location.search);
      if (msg) msg.textContent = data.message || "Password reset successfully.";
      alert(data.message || "Password reset successfully. Sign in with your new password.");
      await checkBootstrapStatus();
      document.getElementById("adminUsername")?.focus();
    } catch (error) {
      if (msg) msg.textContent = error.message || "Password reset failed.";
    } finally {
      if (button) { button.disabled = false; button.textContent = "Set New Password"; }
    }
  };

  window.emergencyPasswordReset = async function emergencyPasswordReset() {
    const adminToken = document.getElementById("emergencyAdminToken")?.value.trim() || "";
    const identity = document.getElementById("emergencyIdentity")?.value.trim() || "";
    const password = document.getElementById("emergencyPassword")?.value || "";
    const confirmPassword = document.getElementById("emergencyPasswordConfirm")?.value || "";
    if (!adminToken || !identity || !password) return alert("Enter ADMIN_TOKEN, Super Admin username/email and new password.");
    if (password.length < 10) return alert("Password must be at least 10 characters.");
    if (password !== confirmPassword) return alert("Passwords do not match.");
    try {
      const res = await fetch(`${API_BASE}/api/admin/auth/emergency-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ identity, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Emergency reset failed");
      ["emergencyAdminToken", "emergencyIdentity", "emergencyPassword", "emergencyPasswordConfirm"].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = "";
      });
      alert(data.message || "Super Admin password reset.");
      await window.backToSecurityLogin();
    } catch (error) {
      alert(error.message || "Emergency reset failed");
    }
  };

  async function checkBootstrapStatus() {
    try {
      const res = await fetch(`${API_BASE}/api/admin/auth/status`, { cache: "no-store" });
      const data = await res.json();
      if (activePasswordResetToken) setAuthBox("reset");
      else setAuthBox(data.configured ? "login" : "bootstrap");
      const text = document.getElementById("securitySetupStatus");
      if (text) text.textContent = data.configured
        ? "User login is configured."
        : "First-time setup required: create the Super Admin account using the current ADMIN_TOKEN.";
    } catch (_) {}
  }

  window.bootstrapSuperAdmin = async function bootstrapSuperAdmin() {
    const oldToken = document.getElementById("bootstrapAdminToken")?.value.trim() || "";
    const username = document.getElementById("bootstrapUsername")?.value.trim() || "";
    const displayName = document.getElementById("bootstrapDisplayName")?.value.trim() || "";
    const email = document.getElementById("bootstrapEmail")?.value.trim() || "";
    const password = document.getElementById("bootstrapPassword")?.value || "";
    const confirmPassword = document.getElementById("bootstrapPasswordConfirm")?.value || "";
    if (!oldToken || !username || !email || !password) return alert("Enter current ADMIN_TOKEN, display/recovery details, username and password.");
    if (password !== confirmPassword) return alert("Passwords do not match.");
    try {
      const res = await fetch(`${API_BASE}/api/admin/auth/bootstrap`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${oldToken}` },
        body: JSON.stringify({ username, displayName, email, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Setup failed");
      alert(data.message || "Super Admin created. Sign in with the new account.");
      document.getElementById("bootstrapAdminToken").value = "";
      document.getElementById("bootstrapEmail").value = "";
      document.getElementById("bootstrapPassword").value = "";
      document.getElementById("bootstrapPasswordConfirm").value = "";
      await checkBootstrapStatus();
      document.getElementById("adminUsername")?.focus();
    } catch (error) {
      alert(error.message || "Super Admin setup failed");
    }
  };

  window.loginAdmin = async function loginAdmin() {
    const username = document.getElementById("adminUsername")?.value.trim() || "";
    const password = document.getElementById("adminPassword")?.value || "";
    const button = document.getElementById("adminLoginBtn");
    if (!username || !password) return alert("Enter username and password.");
    if (button) { button.disabled = true; button.textContent = "Signing in…"; }
    try {
      const res = await fetch(`${API_BASE}/api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) throw new Error(data.error || "Login failed");
      sessionStorage.setItem(TOKEN_KEY, data.token);
      sessionStorage.setItem(VALIDATED_KEY, "1");
      setGlobalToken(data.token);
      setStoredUser(data.user || null);
      if (document.getElementById("adminPassword")) document.getElementById("adminPassword").value = "";
      showPanel();
      applySecurityUi();
      setTimeout(() => {
        if (typeof window.showTab === "function") window.showTab("dashboard");
      }, 40);
    } catch (error) {
      clearSession();
      showLogin(error.message || "Login failed");
    } finally {
      if (button) { button.disabled = false; button.textContent = "Login"; }
    }
  };

  window.logoutAdmin = async function logoutAdmin() {
    try {
      if (token()) await api("/api/admin/auth/logout", { method: "POST", body: "{}" });
    } catch (_) {}
    clearSession();
    location.reload();
  };

  window.restoreCeyBreezSession = async function restoreCeyBreezSession() {
    if (restoring) return;
    restoring = true;
    const saved = token();
    sessionStorage.removeItem(VALIDATED_KEY);
    if (!saved) {
      restoring = false;
      showLogin();
      await checkBootstrapStatus();
      return;
    }
    try {
      setGlobalToken(saved);
      const data = await api("/api/admin/auth/me");
      sessionStorage.setItem(VALIDATED_KEY, "1");
      setStoredUser(data.user || null);
      showPanel();
      applySecurityUi();
      setTimeout(() => {
        if (typeof window.showTab === "function") window.showTab("dashboard");
      }, 40);
    } catch (error) {
      clearSession();
      showLogin(error.status === 401 ? "Your session expired. Please sign in again." : (error.message || "Login validation failed"));
      await checkBootstrapStatus();
    } finally {
      restoring = false;
    }
  };

  function permissionCheckboxes(selected = []) {
    const set = new Set(selected || []);
    return MODULES.map(([value, label]) => `
      <label class="security-perm"><input type="checkbox" name="securityPermission" value="${value}" ${set.has(value) ? "checked" : ""}> <span>${label}</span></label>
    `).join("");
  }

  function userRoleLabel(role) {
    if (role === "super_admin") return "Super Admin";
    if (role === "viewer") return "Read Only";
    return "Staff Editor";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function readPermissions() {
    return [...document.querySelectorAll('input[name="securityPermission"]:checked')].map(x => x.value);
  }

  window.securityRoleChanged = function securityRoleChanged() {
    const role = document.getElementById("securityUserRole")?.value || "staff";
    const boxes = [...document.querySelectorAll('input[name="securityPermission"]')];
    if (role === "super_admin") {
      boxes.forEach(x => { x.checked = true; x.disabled = true; });
    } else {
      boxes.forEach(x => { x.disabled = false; });
    }
  };

  window.resetSecurityUserForm = function resetSecurityUserForm() {
    const form = document.getElementById("securityUserForm");
    form?.reset();
    if (document.getElementById("securityUserId")) document.getElementById("securityUserId").value = "";
    if (document.getElementById("securityUserFormTitle")) document.getElementById("securityUserFormTitle").textContent = "Create User";
    if (document.getElementById("securityEmail")) document.getElementById("securityEmail").value = "";
    if (document.getElementById("securityUsername")) document.getElementById("securityUsername").disabled = false;
    if (document.getElementById("securityPassword")) document.getElementById("securityPassword").placeholder = "Minimum 10 characters";
    document.querySelectorAll('input[name="securityPermission"]').forEach(x => { x.checked = ["dashboard", "inquiries", "bookings"].includes(x.value); x.disabled = false; });
    if (document.getElementById("securityUserActive")) document.getElementById("securityUserActive").checked = true;
  };

  window.editSecurityUser = function editSecurityUser(id) {
    const row = (window.__securityUsers || []).find(x => String(x.id) === String(id));
    if (!row) return alert("User not found.");
    document.getElementById("securityUserId").value = row.id;
    document.getElementById("securityDisplayName").value = row.displayName || "";
    document.getElementById("securityEmail").value = row.email || "";
    document.getElementById("securityUsername").value = row.username || "";
    document.getElementById("securityUsername").disabled = true;
    document.getElementById("securityUserRole").value = row.role || "staff";
    document.getElementById("securityUserActive").checked = row.active !== false;
    document.getElementById("securityPassword").value = "";
    document.getElementById("securityPassword").placeholder = "Leave blank to keep current password";
    const perms = new Set(row.permissions || []);
    document.querySelectorAll('input[name="securityPermission"]').forEach(x => { x.checked = row.role === "super_admin" || perms.has(x.value); });
    document.getElementById("securityUserFormTitle").textContent = `Edit User — ${row.username}`;
    window.securityRoleChanged();
    document.getElementById("securityUserForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  window.saveSecurityUser = async function saveSecurityUser(event) {
    event?.preventDefault?.();
    if (!isSuperAdmin()) return alert("Super Admin access required.");
    const id = document.getElementById("securityUserId")?.value || "";
    const payload = {
      displayName: document.getElementById("securityDisplayName")?.value.trim() || "",
      email: document.getElementById("securityEmail")?.value.trim() || "",
      username: document.getElementById("securityUsername")?.value.trim() || "",
      role: document.getElementById("securityUserRole")?.value || "staff",
      permissions: readPermissions(),
      active: !!document.getElementById("securityUserActive")?.checked
    };
    const password = document.getElementById("securityPassword")?.value || "";
    if (!id) payload.password = password;
    try {
      if (!id) {
        if (password.length < 10) return alert("Password must be at least 10 characters.");
        await api("/api/admin/users", { method: "POST", body: JSON.stringify(payload) });
        alert("User created.");
      } else {
        await api(`/api/admin/users/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) });
        if (password) {
          if (password.length < 10) return alert("New password must be at least 10 characters.");
          await api(`/api/admin/users/${encodeURIComponent(id)}/reset-password`, { method: "POST", body: JSON.stringify({ password }) });
        }
        alert(password ? "User updated and password reset." : "User updated.");
      }
      window.resetSecurityUserForm();
      await window.loadSecurityUsers();
    } catch (error) {
      alert(error.message || "User save failed");
    }
  };

  window.revokeSecuritySessions = async function revokeSecuritySessions(id, username) {
    if (!confirm(`Sign out ${username} from all active sessions?`)) return;
    try {
      await api(`/api/admin/users/${encodeURIComponent(id)}/revoke-sessions`, { method: "POST", body: "{}" });
      alert("Sessions revoked.");
    } catch (error) { alert(error.message || "Session revoke failed"); }
  };

  window.toggleSecurityUser = async function toggleSecurityUser(id, active) {
    const row = (window.__securityUsers || []).find(x => String(x.id) === String(id));
    if (!row) return;
    if (!confirm(`${active ? "Activate" : "Deactivate"} ${row.username}?`)) return;
    try {
      await api(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ displayName: row.displayName, role: row.role, permissions: row.permissions, active })
      });
      await window.loadSecurityUsers();
    } catch (error) { alert(error.message || "User update failed"); }
  };

  window.loadSecurityUsers = async function loadSecurityUsers() {
    const body = document.getElementById("securityUsersTableBody");
    if (!body || !isSuperAdmin()) return;
    body.innerHTML = '<tr><td colspan="8">Loading users…</td></tr>';
    try {
      const rows = await api("/api/admin/users");
      window.__securityUsers = Array.isArray(rows) ? rows : [];
      body.innerHTML = window.__securityUsers.length ? window.__securityUsers.map(row => `
        <tr>
          <td><strong>${escapeHtml(row.displayName || row.username)}</strong><br><small>${escapeHtml(row.username)}</small></td>
          <td>${escapeHtml(row.email || "Not set")}</td>
          <td>${escapeHtml(userRoleLabel(row.role))}</td>
          <td><span class="security-status ${row.active ? "active" : "inactive"}">${row.active ? "Active" : "Inactive"}</span></td>
          <td class="security-perm-list">${escapeHtml(row.role === "super_admin" ? "All modules" : (row.permissions || []).join(", ") || "None")}</td>
          <td>${escapeHtml(row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : "Never")}</td>
          <td>${escapeHtml(row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "-")}</td>
          <td class="security-actions">
            <button type="button" onclick="editSecurityUser('${row.id}')">Edit</button>
            <button type="button" onclick="revokeSecuritySessions('${row.id}','${escapeHtml(row.username)}')">Sign Out</button>
            ${row.id === currentUser?.id ? "" : `<button type="button" onclick="toggleSecurityUser('${row.id}',${row.active ? "false" : "true"})">${row.active ? "Deactivate" : "Activate"}</button>`}
          </td>
        </tr>`).join("") : '<tr><td colspan="8">No users found.</td></tr>';
    } catch (error) {
      body.innerHTML = `<tr><td colspan="8">${escapeHtml(error.message || "Users failed to load")}</td></tr>`;
    }
  };

  function approvalPayloadPreview(row) {
    if (!row.bodyText) return "No request body";
    try {
      const parsed = JSON.parse(row.bodyText);
      const text = JSON.stringify(parsed, null, 2);
      return text.length > 1600 ? text.slice(0, 1600) + "\n…" : text;
    } catch (_) {
      return String(row.bodyText).slice(0, 1600);
    }
  }

  window.loadSecurityApprovals = async function loadSecurityApprovals() {
    const status = document.getElementById("approvalStatusFilter")?.value || "Pending";
    const box = document.getElementById("securityApprovalsList");
    if (!box || !isSuperAdmin()) return;
    box.innerHTML = "<p>Loading approval queue…</p>";
    try {
      const rows = await api(`/api/admin/approvals?status=${encodeURIComponent(status)}`);
      window.__securityApprovals = Array.isArray(rows) ? rows : [];
      box.innerHTML = window.__securityApprovals.length ? window.__securityApprovals.map(row => `
        <article class="security-approval-card">
          <div class="security-approval-head">
            <div><strong>${escapeHtml(row.module || "General")}</strong> · ${escapeHtml(row.method || "")}<br><small>${escapeHtml(row.path || "")}</small></div>
            <span class="security-status ${String(row.status).toLowerCase().replaceAll(" ", "-")}">${escapeHtml(row.status || "Pending")}</span>
          </div>
          <div class="security-approval-meta">Requested by <strong>${escapeHtml(row.username)}</strong> · ${escapeHtml(row.createdAt ? new Date(row.createdAt).toLocaleString() : "")}</div>
          <details><summary>Review submitted details</summary><pre>${escapeHtml(approvalPayloadPreview(row))}</pre></details>
          ${String(row.status).toLowerCase() === "pending" ? `<div class="security-approval-actions"><button type="button" class="approve" onclick="approveSecurityChange('${row.id}')">Approve & Apply</button><button type="button" class="reject" onclick="rejectSecurityChange('${row.id}')">Reject</button></div>` : `<p class="security-review-note">${escapeHtml(row.reviewNote || "")} ${row.reviewedBy ? `— ${escapeHtml(row.reviewedBy)}` : ""}</p>`}
        </article>`).join("") : "<p>No approval requests in this filter.</p>";
      await loadSecurityAudit();
    } catch (error) {
      box.innerHTML = `<p>${escapeHtml(error.message || "Approval queue failed to load")}</p>`;
    }
  };

  window.approveSecurityChange = async function approveSecurityChange(id) {
    if (!confirm("Approve and apply this change to the live system?")) return;
    try {
      const data = await api(`/api/admin/approvals/${encodeURIComponent(id)}/approve`, { method: "POST", body: "{}" });
      alert(data.message || "Change approved and applied.");
      await window.loadSecurityApprovals();
    } catch (error) { alert(error.message || "Approval failed"); }
  };

  window.rejectSecurityChange = async function rejectSecurityChange(id) {
    const note = prompt("Reason for rejection (optional):", "Changes required");
    if (note === null) return;
    try {
      await api(`/api/admin/approvals/${encodeURIComponent(id)}/reject`, { method: "POST", body: JSON.stringify({ note }) });
      await window.loadSecurityApprovals();
    } catch (error) { alert(error.message || "Reject failed"); }
  };

  async function loadSecurityAudit() {
    const body = document.getElementById("securityAuditTableBody");
    if (!body || !isSuperAdmin()) return;
    try {
      const rows = await api("/api/admin/audit-log");
      body.innerHTML = (rows || []).slice(0, 100).map(row => `
        <tr><td>${escapeHtml(row.createdAt ? new Date(row.createdAt).toLocaleString() : "")}</td><td>${escapeHtml(row.actorUsername || "system")}</td><td>${escapeHtml(row.action || "")}</td><td>${escapeHtml(row.module || "")}</td><td>${escapeHtml(row.target || "")}</td></tr>
      `).join("") || '<tr><td colspan="5">No audit activity.</td></tr>';
    } catch (error) {
      body.innerHTML = `<tr><td colspan="5">${escapeHtml(error.message || "Audit log failed")}</td></tr>`;
    }
  }

  function moduleFromNavButton(btn) {
    const tab = btn?.dataset?.v14Tab;
    if (!tab) return btn?.dataset?.securityModule || "";
    return tab;
  }

  function protectDynamicActions() {
    if (!currentUser) return;
    const panel = document.getElementById("adminPanel") || document;
    if (!isSuperAdmin()) {
      panel.querySelectorAll(".delete-btn").forEach(el => el.style.display = "none");
      panel.querySelectorAll("button").forEach(btn => {
        if (btn.closest(".v14-nav")) return;
        const text = String(btn.textContent || "").trim().toLowerCase();
        const onclick = String(btn.getAttribute("onclick") || "").toLowerCase();
        const destructive = text.startsWith("delete") || text.includes("delete ") || text === "clean orphans" || onclick.includes("deletecurrent") || onclick.includes("deletebooking") || onclick.includes("deletefinance") || onclick.includes("v18deleteblock");
        if (destructive) btn.style.display = "none";
      });
    }
    if (currentUser.role === "viewer") {
      panel.querySelectorAll("button").forEach(btn => {
        if (btn.closest(".v14-nav") || btn.classList.contains("v14-refresh") || btn.classList.contains("v14-logout")) return;
        const text = String(btn.textContent || "").trim().toLowerCase();
        const allowed = text.includes("view") || text.includes("open") || text.includes("print") || text.includes("export") || text.includes("refresh") || text === "close" || text === "×";
        if (!allowed) btn.disabled = true;
      });
      panel.querySelectorAll("form input, form select, form textarea").forEach(el => { el.disabled = true; });
    }
  }

  function applySecurityUi() {
    if (!currentUser) return;
    setTimeout(() => {
      const nav = document.querySelector(".v14-nav");
      if (nav) {
        nav.querySelectorAll("[data-v14-tab]").forEach(btn => {
          const module = moduleFromNavButton(btn);
          if (["users", "approvals"].includes(module)) btn.style.display = isSuperAdmin() ? "" : "none";
          else btn.style.display = canModule(module) ? "" : "none";
        });
        nav.querySelectorAll("[data-security-module]").forEach(btn => {
          btn.style.display = canModule(btn.dataset.securityModule) ? "" : "none";
        });
      }
      document.querySelectorAll("[data-super-admin-only='1']").forEach(el => { el.style.display = isSuperAdmin() ? "" : "none"; });

      const top = document.querySelector(".v14-topbar-actions");
      if (top && !document.getElementById("securityUserBadge")) {
        const badge = document.createElement("div");
        badge.id = "securityUserBadge";
        badge.className = "security-user-badge";
        badge.innerHTML = `<strong>${escapeHtml(currentUser.displayName || currentUser.username)}</strong><span>${escapeHtml(userRoleLabel(currentUser.role))}</span>`;
        top.prepend(badge);
      }

      if (!document.getElementById("securityRoleBanner")) {
        const content = document.getElementById("v15Content");
        if (content && !isSuperAdmin()) {
          const banner = document.createElement("div");
          banner.id = "securityRoleBanner";
          banner.className = "security-role-banner";
          banner.textContent = currentUser.role === "viewer"
            ? "Read-only account: viewing is allowed; changes and deletes are blocked."
            : "Staff Editor: create/edit requests are submitted to the Super Admin for approval. Deletes are blocked.";
          content.prepend(banner);
        }
      }
      protectDynamicActions();
      if (!uiObserver) {
        uiObserver = new MutationObserver(() => protectDynamicActions());
        const target = document.getElementById("adminPanel");
        if (target) uiObserver.observe(target, { childList: true, subtree: true });
      }
    }, 100);
  }
  window.applySecurityUi = applySecurityUi;

  // Open/download protected Finance and Reports resources without putting tokens in the URL.
  window.openProtectedAdminResource = async function openProtectedAdminResource(path, { downloadName = "", newTab = true } = {}) {
    const res = await fetch(API_BASE + path, { headers: { Authorization: `Bearer ${token()}` } });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Protected download failed (${res.status})`);
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    if (downloadName) {
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else if (newTab) {
      window.open(objectUrl, "_blank", "noopener");
    }
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  };

  // Helpful toast for queued staff changes. It does not consume the original response.
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function securityAwareFetch(...args) {
    const res = await nativeFetch(...args);
    try {
      const clone = res.clone();
      if ((clone.headers.get("content-type") || "").includes("application/json")) {
        clone.json().then(data => {
          if (data?.pendingApproval) {
            const old = document.getElementById("securityApprovalToast");
            old?.remove();
            const toast = document.createElement("div");
            toast.id = "securityApprovalToast";
            toast.className = "security-toast";
            toast.textContent = `Submitted for Super Admin approval · ${data.approvalId || ""}`;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 5000);
          }
        }).catch(() => {});
      }
    } catch (_) {}
    return res;
  };

  document.addEventListener("DOMContentLoaded", async () => {
    const permBox = document.getElementById("securityPermissionGrid");
    if (permBox && !permBox.children.length) permBox.innerHTML = permissionCheckboxes(["dashboard", "inquiries", "bookings"]);
    document.getElementById("securityUserForm")?.addEventListener("submit", window.saveSecurityUser);
    document.getElementById("securityUserRole")?.addEventListener("change", window.securityRoleChanged);
    document.getElementById("approvalStatusFilter")?.addEventListener("change", window.loadSecurityApprovals);
    document.getElementById("adminPassword")?.addEventListener("keydown", e => { if (e.key === "Enter") window.loginAdmin(); });
    document.getElementById("adminUsername")?.addEventListener("keydown", e => { if (e.key === "Enter") window.loginAdmin(); });

    activePasswordResetToken = resetTokenFromHash();
    if (activePasswordResetToken) {
      clearSession();
      showLogin();
      setAuthBox("reset");
      const text = document.getElementById("securitySetupStatus");
      if (text) text.textContent = "Password reset link verified on submit.";
      document.getElementById("resetNewPassword")?.focus();
      return;
    }

    if (token()) await window.restoreCeyBreezSession();
    else {
      showLogin();
      await checkBootstrapStatus();
    }
  });
})();
