// 🎨 外观（浅色 / 深色）：在页面画出来之前先套用，避免闪一下深色。选择记在这台设备（右上角 ⚙️ 设定）
(function () {
  try { if (localStorage.getItem("mochii_theme") === "light") document.documentElement.setAttribute("data-theme", "light"); } catch (e) {}
})();
