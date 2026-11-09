// 🧹 自我注销版：Mochii 网站已经不用 service worker 了。
// 之前装过旧版 sw.js 的手机 / iPad，浏览器会自动更新成这个版本，然后它会清掉缓存、注销自己、重新载入页面。
// 这个文件请保留一段时间（至少一两个月），让所有旧会员的设备都清干净；之后才可以删除。
// 注意：这里故意没有 fetch 处理，所有请求都直接走网络。
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k.startsWith("mochii-pwa-")).map(k => caches.delete(k)));
    } catch (e) {}
    await self.registration.unregister();
    const list = await self.clients.matchAll({ type: "window" });
    list.forEach(c => { try { c.navigate(c.url); } catch (e) {} });
  })());
});
