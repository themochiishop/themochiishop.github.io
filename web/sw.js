// Mochii App（PWA）的 service worker —— 管整个 www.themochiishop.com
// 原则：只在「没网络」时出手。平时所有请求照常走网络，不缓存任何页面、会员资料、积分、订单。
// 缓存里只有：没网络页面 + 它用到的图标。改了 offline.html 或图标，把 VERSION 加一。
const VERSION = "mochii-pwa-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(PRECACHE.map(u => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith("mochii-pwa-") && k !== VERSION).map(k => caches.delete(k)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  // 只处理「打开本站页面」；图片、脚本、Firebase、外部网站全部不碰
  if (req.mode !== "navigate" || req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const preloaded = await event.preloadResponse;
      if (preloaded) return preloaded;
      return await fetch(req);
    } catch (e) {
      const cached = await caches.match(OFFLINE_URL);
      return cached || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
  })());
});
