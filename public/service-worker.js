const CACHE_NAME = "swiftpos-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/sales.html",
  "/inventory.html",
  "/settings.html",
  "/js/main.js",
  "/js/sales.js",
  "/js/inventory.js",
  "/js/utils.js",
  "/js/sidebar.js",
  "/css/styles.css",
  "/manifest.json",
  // Add other assets as needed
];

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// Activate event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
  );
});

// Fetch event
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
