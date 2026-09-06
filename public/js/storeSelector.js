/**
 * Store Selector - populates dropdowns for multi-store support
 * Usage: include script and add <select id="storeSelector"></select>
 */
async function loadStores() {
  try {
    const res = await fetch("/api/stores", { credentials: "include" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.stores || [];
  } catch { return []; }
}

async function populateStoreSelectors() {
  const stores = await loadStores();
  const selectors = document.querySelectorAll("#storeSelector, .store-selector");
  selectors.forEach(sel => {
    sel.innerHTML = "";
    if (!stores.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Default Store";
      sel.appendChild(opt);
      return;
    }
    stores.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s._id;
      opt.textContent = s.name + (s.isMain ? " (Main)" : "");
      sel.appendChild(opt);
    });
    // restore previous selection
    const saved = localStorage.getItem("selectedStoreId");
    if (saved) sel.value = saved;
    sel.addEventListener("change", e => {
      localStorage.setItem("selectedStoreId", e.target.value);
      // sync all selectors
      selectors.forEach(other => { if (other!==sel) other.value = e.target.value; });
    });
  });
  return stores;
}

function getSelectedStoreId() {
  return localStorage.getItem("selectedStoreId") || document.getElementById("storeSelector")?.value || "";
}

document.addEventListener("DOMContentLoaded", populateStoreSelectors);
