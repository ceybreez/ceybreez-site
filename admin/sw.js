const CACHE_VERSION = "ceybreez-admin-v6.4.0";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const APP_SHELL = [
  "./",
  "./index.html",
  "./admin.css",
  "./v3-admin-theme.css",
  "./pwa-admin.css",
  "./pwa-admin.js",
  "./manifest.webmanifest",
  "./icons/admin-icon-192.png",
  "./icons/admin-icon-512.png",
  "./icons/admin-icon-maskable-512.png",
  "./icons/admin-apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("ceybreez-admin-") && key !== STATIC_CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isSensitiveOrDynamic(request, url) {
  if (request.method !== "GET") return true;
  if (url.origin !== self.location.origin) return true;
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname.includes("/api/")) return true;
  if (request.headers.has("Authorization")) return true;
  return false;
}

function isStaticAsset(url) {
  return /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?|ttf|json|webmanifest)$/i.test(url.pathname);
}

async function networkFirst(request, fallbackUrl = "") {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === "basic") cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl, { ignoreSearch: true });
      if (fallback) return fallback;
    }
    throw error;
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (isSensitiveOrDynamic(request, url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "./index.html"));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(networkFirst(request));
  }
});

self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
