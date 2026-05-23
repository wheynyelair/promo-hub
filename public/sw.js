// DAM Lâminas — Service Worker
// Estratégias:
//  - Imagens de lâmina (Supabase Storage): cache-first com expiração
//  - Navegação (HTML): network-first com fallback ao cache
//  - Demais GET: stale-while-revalidate
//  - Push notifications: exibe alerta visual quando o backend enviar

const VERSION = "v4";
const SHELL_CACHE = `dam-shell-${VERSION}`;
const IMG_CACHE = `dam-img-${VERSION}`;
const RUNTIME_CACHE = `dam-runtime-${VERSION}`;

const SHELL_URLS = ["/", "/galeria", "/manifest.webmanifest", "/favicon.png", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => ![SHELL_CACHE, IMG_CACHE, RUNTIME_CACHE].includes(k)).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

const isImageRequest = (req) => {
  if (req.destination === "image") return true;
  const url = new URL(req.url);
  return /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(url.pathname);
};

const isSupabaseAPI = (url) => /\.supabase\.co\/(rest|auth|functions|realtime)\//.test(url);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Nunca cachear chamadas dinâmicas do Supabase (REST/Auth/Functions/Realtime)
  if (isSupabaseAPI(url.href)) return;

  // Imagens — cache-first
  if (isImageRequest(req)) {
    event.respondWith(
      caches.open(IMG_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          return hit ?? Response.error();
        }
      })
    );
    return;
  }

  // Navegação HTML — network-first com fallback
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r ?? caches.match("/galeria")))
    );
    return;
  }

  // Outros GETs — stale-while-revalidate
  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit || fetchPromise;
    })
  );
});

// ───────────────────────────── Push Notifications ─────────────────────────────
// O backend envia payload JSON: { title, body, url?, tag?, icon?, badge? }
// Fallback amigável quando vier vazio.

self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try { payload = event.data.json(); }
    catch { payload = { title: "Centrofarma", body: event.data.text() }; }
  }
  const title = payload.title || "Nova oferta disponível";
  const options = {
    body: payload.body || "Abra a Galeria para conferir as novidades.",
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/favicon.png",
    tag: payload.tag || "dam-novidade",
    renotify: true,
    data: { url: payload.url || "/galeria" },
    vibrate: [120, 60, 120],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/galeria";
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of all) {
      try {
        const url = new URL(client.url);
        if (url.pathname === targetUrl || url.pathname.startsWith(targetUrl)) {
          await client.focus();
          return;
        }
      } catch { /* ignore */ }
    }
    await self.clients.openWindow(targetUrl);
  })());
});
