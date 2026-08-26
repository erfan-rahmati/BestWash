const CACHE = "bestwash-shell-v4";
const OFFLINE = ["/", "/icons/app-icon.svg", "/images/home/hero/hero-1.webp", "/images/home/promo/promo-banner.webp"];
const PRIVATE_PATHS = ["/admin", "/auth", "/profile", "/bookings", "/vehicles", "/wallet", "/loyalty", "/notifications", "/settings", "/support", "/payment"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(OFFLINE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
    self.registration.navigationPreload ? self.registration.navigationPreload.disable() : Promise.resolve(),
  ]));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || PRIVATE_PATHS.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`))) return;

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/")));
    return;
  }

  const cacheable = OFFLINE.includes(url.pathname) || url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/images/");
  if (!cacheable) return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;

    const response = await fetch(event.request);
    if (response.ok) {
      // Clone synchronously before the response is returned to the page. The
      // previous delayed clone raced with body consumption in Chromium.
      const cacheCopy = response.clone();
      event.waitUntil(
        caches.open(CACHE).then((cache) => cache.put(event.request, cacheCopy)),
      );
    }
    return response;
  })());
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || "BestWash", {
    body: data.body || "یک اعلان جدید دارید.",
    icon: "/icons/app-icon.svg",
    badge: "/icons/app-icon.svg",
    data: { url: data.url || "/notifications" },
    dir: "rtl",
    lang: "fa",
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/notifications", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => client.url === target);
    return existing ? existing.focus() : self.clients.openWindow(target);
  }));
});
