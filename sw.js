/* Bendito Closet: app instalável. Rede primeiro (nunca mostra preços antigos); sem rede, usa a última cópia. */
const C = "bendito-v159";
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  e.respondWith((r.mode === "navigate" ? fetch(r.url, { cache: "no-cache", credentials: "same-origin" }) : fetch(r)).then(res => { if (r.mode === "navigate" && res.redirected) return Response.redirect(res.url, 301); if (res.ok && r.mode === "navigate") { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r).then(m => m || caches.match("/"))));
});
