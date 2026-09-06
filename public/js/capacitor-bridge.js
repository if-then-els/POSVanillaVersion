/**
 * Capacitor Bridge - same codebase for web & native
 * Detects native, exposes print/offline/helpers.
 * No build step required for web; native wrappers load via Capacitor.
 */
const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

async function getCapacitorModule(name) {
  if (!isNative) return null;
  try {
    // dynamic import via Capacitor registry
    const { Capacitor } = window;
    if (Capacitor && Capacitor.Plugins && Capacitor.Plugins[name]) return Capacitor.Plugins[name];
  } catch {}
  return null;
}

async function printReceipt({ html, url }) {
  if (isNative) {
    // Try capacitor-printer or escpos plugin if installed
    const Printer = await getCapacitorModule("Printer") || await getCapacitorModule("CapacitorPrinter");
    if (Printer && Printer.print) {
      try { await Printer.print({ html }); return { method: "native" }; } catch (e) { console.warn("native print failed", e); }
    }
    // fallback to system share
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share) {
      try { await window.Capacitor.Plugins.Share.share({ title: "Receipt", text: html, url }); return { method: "share" }; } catch {}
    }
  }
  // web fallback: open print window
  const w = window.open("", "_blank");
  if (w) { w.document.write(html || `<iframe src="${url}" style="width:100%;height:100vh;border:0"></iframe>`); w.document.close(); w.focus(); w.print(); }
  else window.print();
  return { method: "web" };
}

function onNetworkChange(cb) {
  if (isNative) {
    getCapacitorModule("Network").then(N => {
      if (N && N.addListener) N.addListener("networkStatusChange", cb);
    });
  } else {
    window.addEventListener("online", () => cb({ connected: true }));
    window.addEventListener("offline", () => cb({ connected: false }));
  }
}

async function hapticImpact(style = "LIGHT") {
  if (!isNative) return;
  const Haptics = await getCapacitorModule("Haptics");
  if (Haptics && Haptics.impact) try { await Haptics.impact({ style }); } catch {}
}

// expose globally for legacy scripts
window.SwiftBridge = { isNative, printReceipt, onNetworkChange, hapticImpact, getCapacitorModule };
