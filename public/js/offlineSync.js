/**
 * Offline Sync - queues sales when offline (IndexedDB-lite via localStorage for vanilla)
 * Works on web + Capacitor (same codebase, tier-gated offlineMode requires Standard+ but queues for all for demo).
 */
const PENDING_KEY = "swiftpos_pending_sales";

function getPending() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]"); } catch { return []; }
}
function setPending(arr) { localStorage.setItem(PENDING_KEY, JSON.stringify(arr)); }

function queueSale(payload) {
  const pending = getPending();
  const entry = { id: `off_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, payload, queuedAt: new Date().toISOString() };
  pending.push(entry);
  setPending(pending);
  updatePendingBadge();
  return entry;
}

async function syncPending() {
  if (!navigator.onLine) return { synced: 0, pending: getPending().length };
  const pending = getPending();
  if (!pending.length) return { synced: 0, pending: 0 };
  let synced = 0;
  const remaining = [];
  for (const entry of pending) {
    try {
      const res = await fetch("/processSale", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": entry.id },
        credentials: "include",
        body: JSON.stringify({ ...entry.payload, offlineId: entry.id }),
      });
      if (res.ok) synced++;
      else if (res.status === 403 || res.status === 401) { remaining.push(entry); break; } // stop on auth/upgrade
      else remaining.push(entry);
    } catch { remaining.push(entry); }
  }
  setPending(remaining);
  updatePendingBadge();
  if (synced) {
    const toast = window.showToast || ((m)=>alert(m));
    toast(`${synced} queued sale(s) synced`, "success");
  }
  return { synced, pending: remaining.length };
}

function updatePendingBadge() {
  const n = getPending().length;
  const el = document.getElementById("pendingSyncBadge");
  if (el) { el.textContent = n; el.classList.toggle("hidden", n===0); el.classList.toggle("flex", n>0); }
  const banner = document.getElementById("offlineBanner");
  if (banner) banner.classList.toggle("hidden", navigator.onLine);
}

// auto sync on online + periodic
window.addEventListener("online", () => { updatePendingBadge(); syncPending(); });
window.addEventListener("offline", updatePendingBadge);
if (window.SwiftBridge && window.SwiftBridge.onNetworkChange) {
  window.SwiftBridge.onNetworkChange((s) => { if (s.connected) syncPending(); });
}
document.addEventListener("DOMContentLoaded", () => {
  updatePendingBadge();
  // expose manual sync button
  const btn = document.getElementById("syncPendingBtn");
  if (btn) btn.addEventListener("click", syncPending);
  // periodic every 30s
  setInterval(() => { if (navigator.onLine) syncPending(); }, 30000);
});

window.OfflineSync = { queueSale, syncPending, getPending };
