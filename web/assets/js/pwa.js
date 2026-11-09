// 📲 Mochii App（PWA）：状态栏颜色、App 里的返回按钮、「安装 App」（入口在帮助中心 › App 与网址）
// 整个网站共用（商店页面 + /memberclub/）。不碰登录、Firebase、会员资料。
(function () {
  "use strict";
  var path = location.pathname;
  var IN_CLUB = path.indexOf("/memberclub/") === 0;
  var standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  var ua = navigator.userAgent || "";
  var IS_IOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (standalone) document.documentElement.classList.add("pwa-standalone");

  // ---------- 文字（三语）----------
  var TXT = {
    en: {
      sec: "App", install: "Install Mochii Club app", shop: "Back to The Mochii Shop", back: "Back",
      iosT: "Add Mochii Club to your Home Screen",
      ios1: "Open this page in <b>Safari</b> (not inside Facebook, Instagram, TikTok or WhatsApp).",
      ios2: "Tap the <b>Share</b> button <span class=\"pwa-k\">⬆️</span> at the bottom (or top) of Safari.",
      ios3: "Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.",
      andT: "Install Mochii Club",
      and1: "Open this page in <b>Chrome</b>.",
      and2: "Tap the menu <span class=\"pwa-k\">⋮</span> at the top right.",
      and3: "Tap <b>Install app</b> (or <b>Add to Home screen</b>).",
      ok: "Got it", done: "Installed! Look for the Mochii Club icon on your home screen."
    },
    ms: {
      sec: "Aplikasi", install: "Pasang aplikasi Mochii Club", shop: "Kembali ke The Mochii Shop", back: "Kembali",
      iosT: "Tambah Mochii Club ke Skrin Utama",
      ios1: "Buka halaman ini dalam <b>Safari</b> (bukan dalam Facebook, Instagram, TikTok atau WhatsApp).",
      ios2: "Tekan butang <b>Kongsi</b> <span class=\"pwa-k\">⬆️</span> di bahagian bawah (atau atas) Safari.",
      ios3: "Tatal ke bawah, tekan <b>Tambah ke Skrin Utama</b>, kemudian <b>Tambah</b>.",
      andT: "Pasang Mochii Club",
      and1: "Buka halaman ini dalam <b>Chrome</b>.",
      and2: "Tekan menu <span class=\"pwa-k\">⋮</span> di penjuru kanan atas.",
      and3: "Tekan <b>Pasang aplikasi</b> (atau <b>Tambah ke Skrin utama</b>).",
      ok: "Faham", done: "Sudah dipasang! Cari ikon Mochii Club di skrin utama anda."
    },
    zh: {
      sec: "App", install: "安装 Mochii Club App", shop: "回到 Mochii 商店", back: "返回",
      iosT: "把 Mochii Club 加到主屏幕",
      ios1: "用 <b>Safari</b> 打开这个页面（不能在 Facebook、Instagram、TikTok、WhatsApp 里面打开）。",
      ios2: "点 Safari 下方（或上方）的 <b>分享</b> 按钮 <span class=\"pwa-k\">⬆️</span>。",
      ios3: "往下滑，点 <b>添加到主屏幕</b>，再点 <b>添加</b>。",
      andT: "安装 Mochii Club",
      and1: "用 <b>Chrome</b> 打开这个页面。",
      and2: "点右上角的菜单 <span class=\"pwa-k\">⋮</span>。",
      and3: "点 <b>安装应用</b>（或 <b>添加到主屏幕</b>）。",
      ok: "知道了", done: "安装好了！在手机桌面找 Mochii Club 的图标。"
    }
  };
  function lang() {
    var l = "";
    try { l = localStorage.getItem("mochii_lang") || ""; } catch (e) {}
    if (TXT[l]) return l;
    var n = (navigator.language || "en").toLowerCase();
    return n.indexOf("zh") === 0 ? "zh" : (n.indexOf("ms") === 0 || n.indexOf("id") === 0) ? "ms" : "en";
  }
  function t(k) { return (TXT[lang()] || TXT.en)[k] || TXT.en[k]; }

  // ---------- 1. 不使用 service worker ----------
  // 有 service worker 时，iPhone / iPad 的 Safari 换页后 Firebase 读不到资料（2026-11-09 实测），所以拿掉。
  // 这里把之前已经装上的 /sw.js 清掉；安装 App 只需要 manifest，不需要 service worker。
  if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistrations) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) {
        var sw = r.active || r.waiting || r.installing;
        if (sw && /\/sw\.js(\?|$)/.test(sw.scriptURL)) r.unregister();
      });
    }).catch(function () {});
  }

  // ---------- 2. 状态栏颜色：club 跟着浅色 / 深色模式 ----------
  function themeMeta() {
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement("meta"); m.name = "theme-color"; document.head.appendChild(m); }
    return m;
  }
  if (IN_CLUB) {
    var syncTheme = function () {
      themeMeta().content = document.documentElement.getAttribute("data-theme") === "light" ? "#f5f6fb" : "#0b1020";
    };
    syncTheme();
    new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  // ---------- 样式 ----------
  var css = [
    ".pwa-back{position:fixed;z-index:9999;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);left:12px;display:flex;align-items:center;gap:2px;",
    "padding:7px 13px 7px 9px;border-radius:999px;border:1px solid rgba(255,111,174,.45);background:rgba(20,24,40,.82);color:#fff;",
    "font:600 14px/1 Inter,'Noto Sans SC',-apple-system,sans-serif;cursor:pointer;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}",
    ".pwa-back:active{transform:scale(.96)}",
    ".pwa-modal{position:fixed;inset:0;z-index:10000;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55);padding:16px}",
    "@media(min-width:600px){.pwa-modal{align-items:center}}",
    ".pwa-card{width:100%;max-width:400px;border-radius:18px;padding:20px 20px 16px;background:var(--card,#131a2e);color:var(--text,#e8ecf8);",
    "border:1px solid var(--line,#26304d);font-family:Inter,'Noto Sans SC',-apple-system,sans-serif;margin-bottom:env(safe-area-inset-bottom,0px)}",
    ".pwa-card h3{margin:0 0 14px;font-size:1.05rem;display:flex;align-items:center;gap:10px}",
    ".pwa-card h3 img{width:40px;height:40px;border-radius:10px}",
    ".pwa-card ol{margin:0;padding-left:20px;line-height:1.6;font-size:.92rem}",
    ".pwa-card li{margin-bottom:8px}",
    ".pwa-k{display:inline-block;padding:0 4px;border-radius:5px;background:rgba(255,111,174,.15)}",
    ".pwa-card button{width:100%;margin-top:10px;padding:11px;border:0;border-radius:12px;background:var(--accent,#ff6fae);color:#fff;font-weight:700;font-size:.95rem;cursor:pointer}"
  ].join("");
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  // ---------- 3. 安装 ----------
  var deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
  });
  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    document.querySelectorAll("[data-pwa-install]").forEach(function (b) { b.hidden = true; });
  });

  function showGuide(ios) {
    var p = ios ? "ios" : "and";
    var m = document.createElement("div");
    m.className = "pwa-modal";
    m.innerHTML = '<div class="pwa-card" role="dialog" aria-modal="true">' +
      '<h3><img src="/icons/icon-192.png" alt="">' + t(p + "T") + "</h3>" +
      "<ol><li>" + t(p + "1") + "</li><li>" + t(p + "2") + "</li><li>" + t(p + "3") + "</li></ol>" +
      '<button type="button">' + t("ok") + "</button></div>";
    function close() { m.remove(); }
    m.addEventListener("click", function (e) { if (e.target === m) close(); });
    m.querySelector("button").addEventListener("click", close);
    document.body.appendChild(m);
  }

  function install() {
    if (deferredPrompt) {
      var p = deferredPrompt;
      deferredPrompt = null;
      p.prompt();
      return;
    }
    showGuide(IS_IOS);
  }

  // ---------- 4. 给帮助中心「App 与网址」分页用（help.html 的安装按钮会叫 MochiiPWA.install()）----------
  window.MochiiPWA = { install: install, standalone: standalone };

  // ---------- 6. App 里的返回按钮（左下角）：只在全屏 App、而且页面没有自己的导航时出现 ----------
  function addBackButton() {
    if (!standalone) return;
    if (document.getElementById("topbar") || document.getElementById("menu")) return;   // club 顶部导航 / 商店导航
    if (/^\/memberclub\/(index\.html)?$/.test(path)) return;               // App 的起始页（登录页）
    var b = document.createElement("button");
    b.type = "button";
    b.className = "pwa-back";
    b.setAttribute("aria-label", t("back"));
    b.innerHTML = '<span aria-hidden="true" style="font-size:18px;line-height:14px">‹</span>' + t("back");
    b.addEventListener("click", function () {
      if (history.length > 1) history.back();
      else location.href = IN_CLUB ? "/memberclub/home.html" : "/";
    });
    document.body.appendChild(b);
  }

  function onReady() {
    addBackButton();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", onReady);
  else onReady();
})();
