// 🎨 外观（浅色 / 深色）和 🔠 字体大小：在页面画出来之前先套用，避免闪一下。选择记在这台设备（右上角 ⚙️ 设定）
(function () {
  try { if (localStorage.getItem("mochii_theme") === "light") document.documentElement.setAttribute("data-theme", "light"); } catch (e) {}
  try {
    var fs = localStorage.getItem("mochii_fs");
    if (fs === "s" || fs === "l" || fs === "xl") document.documentElement.setAttribute("data-fs", fs);
  } catch (e) {}
})();
