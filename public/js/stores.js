/**
 * My Stores — business-owned store manager (NOT superadmin).
 * - SuperAdmin lives at /admin/* with its own adminToken login; this module
 *   never links there and only touches /api/stores scoped to req.user.business.
 * - Plan-gated: trial/basic = 1 store, standard = 3, premium = 0 (unlimited).
 *   Server enforces via requireLimit("maxStores"); UI mirrors the limit.
 */
(function () {
  let myStores = [];
  let planName = "";
  let maxStores = 1; // safe default until plan loads
  let planLoaded = false;

  function esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function toast(msg, type) {
    if (window.showToast) window.showToast(msg, type || "info");
    else alert(msg);
  }

  function featVal(features, key) {
    if (!features) return undefined;
    if (features instanceof Map) return features.get(key);
    return features[key];
  }

  async function loadPlanLimit() {
    try {
      const r = await fetch("/api/business/my-subscription", { credentials: "include" });
      if (!r.ok) return;
      const d = await r.json();
      planName = d.plan?.name || "";
      const v = featVal(d.plan?.features || d.features, "maxStores");
      maxStores = (v === undefined || v === null) ? 1 : Number(v); // 0 = unlimited
      planLoaded = true;
    } catch (_) { /* keep safe default */ }
  }

  function limitText() {
    if (!planLoaded) return "";
    const label = planName ? planName.charAt(0).toUpperCase() + planName.slice(1) : "Current plan";
    if (maxStores === 0) return `${label}: unlimited stores`;
    return `${label}: ${myStores.length}/${maxStores} store${maxStores === 1 ? "" : "s"} used`;
  }

  async function fetchStores() {
    const r = await fetch("/api/stores", { credentials: "include" });
    if (!r.ok) throw new Error("Failed to load stores");
    const d = await r.json();
    myStores = d.stores || [];
    return myStores;
  }

  function renderStores() {
    const list = document.getElementById("stores-list");
    const planLine = document.getElementById("stores-plan-line");
    const hint = document.getElementById("store-plan-hint");
    const note = document.getElementById("stores-limit-note");
    const addBtn = document.getElementById("store-add-btn");
    if (planLine) planLine.textContent = limitText() || "Your stores";
    if (hint) hint.textContent = limitText();
    const atLimit = planLoaded && maxStores !== 0 && myStores.length >= maxStores;
    if (addBtn) {
      addBtn.disabled = !!atLimit;
      addBtn.classList.toggle("opacity-50", !!atLimit);
      addBtn.classList.toggle("cursor-not-allowed", !!atLimit);
    }
    if (note) {
      if (atLimit) {
        note.classList.remove("hidden");
        note.innerHTML = `Store limit reached (${maxStores}). <a href="/manageSubscriptions.html" class="underline">Upgrade plan</a> for more stores.`;
      } else note.classList.add("hidden");
    }
    if (!list) return;
    if (!myStores.length) {
      list.innerHTML = `<div class="py-6 text-center text-sm text-slate-400">No stores yet — add your first branch below.</div>`;
      return;
    }
    list.innerHTML = myStores.map(s => `
      <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <div class="min-w-0 flex-1">
          <div class="font-bold text-sm truncate">${esc(s.name)} ${s.isMain ? '<span class="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-600 text-white font-black">MAIN</span>' : ""}</div>
          <div class="text-[11px] text-slate-400 truncate">${esc(s.location || "—")}${s.phone ? " • " + esc(s.phone) : ""}</div>
        </div>
        ${s.isMain ? "" : `<button data-act="main" data-id="${s._id}" title="Set as main" class="text-[11px] px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-800">Main</button>`}
        <button data-act="del" data-id="${s._id}" title="Delete store" class="text-[11px] px-2 py-1.5 rounded-lg border border-red-200 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>
      </div>`).join("");
    list.querySelectorAll("button[data-act]").forEach(b => {
      b.addEventListener("click", () => {
        if (b.dataset.act === "del") deleteStore(b.dataset.id);
        if (b.dataset.act === "main") setMainStore(b.dataset.id);
      });
    });
  }

  async function refreshStores() {
    try {
      await Promise.all([loadPlanLimit(), fetchStores()]);
    } catch (e) {
      const list = document.getElementById("stores-list");
      if (list) list.innerHTML = `<div class="py-6 text-center text-sm text-red-400">Could not load stores.</div>`;
      return;
    }
    renderStores();
    // keep existing selectors/filters in sync
    if (typeof loadStoreOptions === "function") loadStoreOptions();
    if (typeof populateStoreSelectors === "function") populateStoreSelectors();
  }

  async function addStore(e) {
    e.preventDefault();
    const name = document.getElementById("store-name-input")?.value.trim();
    const location = document.getElementById("store-location-input")?.value.trim();
    const phone = document.getElementById("store-phone-input")?.value.trim();
    const isMain = document.getElementById("store-main-input")?.checked;
    if (!name) { toast("Store name required", "error"); return; }
    try {
      const r = await fetch("/api/stores", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ name, location, phone, isMain }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast(d.message || "Failed to add store", "error");
        if (d.upgradeRequired) setTimeout(() => { window.location.href = "/manageSubscriptions.html"; }, 1200);
        return;
      }
      document.getElementById("store-form")?.reset();
      toast(`Store "${name}" added`, "success");
      await refreshStores();
    } catch (_) { toast("Network error adding store", "error"); }
  }

  async function deleteStore(id) {
    const s = myStores.find(x => x._id === id);
    if (!confirm(`Delete store "${s?.name || ""}"? Products linked to it fall back to Default.`)) return;
    try {
      const r = await fetch(`/api/stores/${id}`, { method: "DELETE", credentials: "include" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast(d.message || "Delete failed", "error"); return; }
      if (localStorage.getItem("selectedStoreId") === id) localStorage.removeItem("selectedStoreId");
      toast("Store deleted", "success");
      await refreshStores();
    } catch (_) { toast("Network error", "error"); }
  }

  async function setMainStore(id) {
    try {
      const r = await fetch(`/api/stores/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ isMain: true }),
      });
      if (!r.ok) { toast("Failed to set main store", "error"); return; }
      toast("Main store updated", "success");
      await refreshStores();
    } catch (_) { toast("Network error", "error"); }
  }

  function openModal() {
    document.getElementById("stores-modal")?.classList.remove("hidden");
    refreshStores();
  }
  function closeModal() { document.getElementById("stores-modal")?.classList.add("hidden"); }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("manage-stores-btn")?.addEventListener("click", openModal);
    document.getElementById("stores-modal-close")?.addEventListener("click", closeModal);
    document.getElementById("stores-modal-backdrop")?.addEventListener("click", closeModal);
    document.getElementById("store-form")?.addEventListener("submit", addStore);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && !document.getElementById("stores-modal")?.classList.contains("hidden")) closeModal();
    });
    // plan hint next to filter (no modal open needed)
    loadPlanLimit().then(() => {
      const hint = document.getElementById("store-plan-hint");
      if (hint) hint.textContent = planLoaded ? limitText() + " — manage your own stores only" : "";
    });
  });

  window.MyStores = { refreshStores, openModal };
})();
