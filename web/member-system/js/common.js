// member-system 共用功能
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// ---------- 单号格式规则（必须和 Google 表格同步脚本的 MS_PLATFORMS 一致） ----------
export const PLATFORMS = [
  { platform: "tiktok", label: "TikTok", test: /^5\d{17}$/ },
  { platform: "shopee", label: "Shopee", test: /^\d{6}[0-9A-Z]{8}$/ },
];

export function normalizeOrderNo(s) {
  return String(s || "").replace(/\s/g, "").toUpperCase();
}

export function normalizeUsername(s) {
  return String(s || "").trim().replace(/^@/, "").toLowerCase();
}

export function detectPlatform(orderNo) {
  const rule = PLATFORMS.find(p => p.test.test(orderNo));
  return rule ? rule.platform : null;
}

export function platformLabel(p) {
  const rule = PLATFORMS.find(x => x.platform === p);
  return rule ? rule.label : p;
}

export function platformTag(p) {
  return `<span class="tag tag-${esc(p)}">${esc(platformLabel(p))}</span>`;
}

// ---------- 工具 ----------
export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

export function toDate(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  if (v instanceof Date) return v;
  return null;
}

export function fmtDate(d, withTime = false) {
  if (!d) return "-";
  const p = n => String(n).padStart(2, "0");
  let s = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  if (withTime) s += ` ${p(d.getHours())}:${p(d.getMinutes())}`;
  return s;
}

export function fmtMoney(n) {
  return "RM " + Number(n || 0).toFixed(2);
}

export function authErrorText(e) {
  const map = {
    "auth/invalid-credential": "电子邮件或密码不正确",
    "auth/wrong-password": "电子邮件或密码不正确",
    "auth/user-not-found": "找不到这个账号",
    "auth/email-already-in-use": "这个电子邮件已经注册过，请直接登录",
    "auth/weak-password": "密码至少要 6 个字",
    "auth/invalid-email": "电子邮件格式不正确",
    "auth/popup-closed-by-user": "登录视窗被关闭了，请再试一次",
    "auth/popup-blocked": "浏览器挡住了登录视窗，请允许弹出视窗后再试",
    "auth/cancelled-popup-request": "请再按一次登录",
    "auth/too-many-requests": "尝试次数太多，请稍后再试",
    "auth/network-request-failed": "网络连接失败，请检查网络",
    "auth/unauthorized-domain": "这个网址还没加入 Firebase 授权网域",
  };
  return map[e && e.code] || ("发生错误：" + (e && e.message ? e.message : e));
}

// ---------- 登录检查：未登录或未完成资料的人会被送回首页 ----------
export function requireMember(onReady) {
  onAuthStateChanged(auth, async user => {
    if (!user) { location.replace("index.html"); return; }
    try {
      const snap = await getDoc(doc(db, "members", user.uid));
      if (!snap.exists()) { location.replace("index.html"); return; }
      document.body.classList.remove("loading");
      onReady(user, snap.data());
    } catch (e) {
      console.error(e);
      const el = document.getElementById("pageError");
      if (el) { el.textContent = "载入失败：" + e.message; el.classList.remove("hidden"); }
    }
  });
}

export function logout() {
  signOut(auth).then(() => location.replace("index.html"));
}

// ---------- 顶部导航 ----------
export function renderNav(active) {
  const links = [
    ["account", "account.html", "我的积分"],
    ["bind", "bind.html", "绑定账号"],
    ["profile", "profile.html", "个人资料"],
  ];
  const el = document.getElementById("topbar");
  if (!el) return;
  el.className = "topbar";
  el.innerHTML = `
    <div class="topbar-inner">
      <a class="brand" href="https://www.themochiishop.com">The <span>Mochii</span> Shop</a>
      <nav>
        ${links.map(([k, href, text]) =>
          `<a href="${href}" class="${k === active ? "active" : ""}">${text}</a>`).join("")}
      </nav>
    </div>`;
}
