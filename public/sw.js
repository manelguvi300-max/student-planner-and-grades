// Mi semestre: modo sin conexión.
// - Archivos de la app (/_next/static, iconos): caché primero (llevan hash, nunca cambian).
// - La página principal: red primero; si no hay red se muestra la última copia (con tus datos de la última vez).
// - Todo lo demás (API, guardados, inicio de sesión): siempre a la red, nunca se guarda.
const STATIC = "ms-static-v1"
const PAGES = "ms-pages-v1"

self.addEventListener("install", () => self.skipWaiting())

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC, PAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return

  if (url.pathname.startsWith("/_next/static/") || /^\/(icon|apple-icon)/.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok) cache.put(req, res.clone())
        return res
      })
    )
    return
  }

  if (req.mode === "navigate" && url.pathname === "/") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // solo se guarda la página real (no la redirección al inicio de sesión)
          if (res.ok && !res.redirected) { const copy = res.clone(); caches.open(PAGES).then((c) => c.put("/", copy)) }
          return res
        })
        .catch(async () => (await caches.match("/", { cacheName: PAGES })) ?? new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }))
    )
  }
})
