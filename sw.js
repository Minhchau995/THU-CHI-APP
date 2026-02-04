const CACHE_NAME = "thuchi-v1";
const CORE = [
  "./",
  "./index.html",
  "./manifest.json"
];

// Install: cache core
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)).catch(()=>{})
  );
});

// Activate: remove old caches
self.addEventListener("activate", (event) => {
  event.waitUntil((async ()=>{
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : null));
    await self.clients.claim();
  })());
});

// Fetch strategy:
// - HTML: network-first (để update nhanh, tránh “kẹt bản cũ”)
// - Others: stale-while-revalidate
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith((async ()=>{
      try{
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      }catch{
        const cached = await caches.match(req);
        return cached || caches.match("./index.html");
      }
    })());
    return;
  }

  event.respondWith((async ()=>{
    const cached = await caches.match(req);
    const fetchPromise = fetch(req).then(async (res)=>{
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, res.clone());
      return res;
    }).catch(()=>null);

    return cached || await fetchPromise || Response.error();
  })());
});
