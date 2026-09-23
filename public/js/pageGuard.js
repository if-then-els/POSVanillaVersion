/**
 * Page-level authorization guard (production).
 *
 * Usage (one line in <head> or before this script at end of body):
 *   <script>window.PAGE_ROLES = ["admin", "manager"];</script>
 *   <script src="./js/pageGuard.js"></script>
 *
 * - Pages WITHOUT window.PAGE_ROLES are open to any authenticated user.
 * - The role is always read server-side via /userDetails (never from
 *   localStorage/JWT claims) with the httpOnly cookie.
 * - No session  -> /login.html?session=expired
 * - Wrong role  -> /dashboard.html?denied=1 (dashboard shows the notice)
 * - ?denied=1   -> stripped + self-rendered notice (no dependency on the
 *   page's own toast implementation).
 * - Network failure -> fail open (backend APIs still enforce everything).
 */
(function () {
  function guardToast(message) {
    try {
      const el = document.createElement("div");
      el.style.cssText =
        "position:fixed;top:88px;right:16px;z-index:9999;max-width:20rem;" +
        "background:rgba(15,23,42,.95);color:#fff;font:600 13px/1.4 Inter,system-ui,sans-serif;" +
        "border-left:4px solid #f59e0b;border-radius:12px;padding:12px 16px;" +
        "box-shadow:0 8px 32px rgba(0,0,0,.3);";
      el.textContent = message;
      document.body.appendChild(el);
      setTimeout(() => {
        el.style.transition = "opacity .4s,transform .4s";
        el.style.opacity = "0";
        el.style.transform = "translateX(100%)";
        setTimeout(() => el.remove(), 450);
      }, 4500);
    } catch (_) {}
  }

  async function run() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("denied")) {
        params.delete("denied");
        const clean =
          window.location.pathname +
          (params.toString() ? "?" + params.toString() : "");
        window.history.replaceState({}, document.title, clean);
        guardToast("Access denied: your role cannot open that page.");
      }
    } catch (_) {}

    const allow = window.PAGE_ROLES;
    if (!allow || !allow.length) return; // open page

    try {
      const res = await fetch("/userDetails", { credentials: "include" });
      if (!res.ok) {
        window.location.href = "/login.html?session=expired";
        return;
      }
      const data = await res.json().catch(() => ({}));
      const role = data.user?.role;
      if (!role || allow.indexOf(role) === -1) {
        window.location.href = "/dashboard.html?denied=1";
      }
    } catch (_) {
      // Offline / transient: stay on page; backend APIs enforce authz.
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
