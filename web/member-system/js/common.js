// member-system 共用功能
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  doc, getDoc, collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

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

// ---------- 会员等级（必须和 Google 表格同步脚本的 MS_TIERS 一致） ----------
export const TIERS = [
  { id: "mochii",  label: "Mochii 会员", icon: "🍡", minSpend: 0,    multiplier: 1,   birthday: 88  },
  { id: "silver",  label: "银卡",        icon: "🥈", minSpend: 300,  multiplier: 1.2, birthday: 128 },
  { id: "gold",    label: "金卡",        icon: "🥇", minSpend: 800,  multiplier: 1.5, birthday: 188 },
  { id: "diamond", label: "钻石",        icon: "💎", minSpend: 2000, multiplier: 2,   birthday: 288 },
];

// 目前等级、下一级、还差多少
export function tierProgress(member) {
  const spend = Number(member.spend12m || 0);
  const idx = Math.max(0, TIERS.findIndex(t => t.id === member.tier));
  const tier = TIERS[idx];
  const next = TIERS[idx + 1] || null;
  const need = next ? Math.max(0, next.minSpend - spend) : 0;
  const pct = next ? Math.min(100, Math.round(((spend - tier.minSpend) / (next.minSpend - tier.minSpend)) * 100)) : 100;
  return { tier, next, spend, need, pct: Math.max(0, pct) };
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

// ---------- 积分余额 ----------
// available：已生效的积分；pending：待确认；reserved：兑换审核中暂扣；spendable：现在能用来兑换的
export async function loadBalance(uid) {
  const mine = c => getDocs(query(collection(db, c), where("uid", "==", uid)));
  const [lSnap, rSnap] = await Promise.all([mine("pointsLedger"), mine("redemptions")]);
  const now = new Date();

  const ledger = lSnap.docs.map(d => d.data())
    .map(x => ({ ...x, availableAt: toDate(x.availableAt), createdAt: toDate(x.createdAt) }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const redemptions = rSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    .map(r => ({ ...r, createdAt: toDate(r.createdAt), decidedAt: toDate(r.decidedAt) }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  let available = 0, pending = 0, nextUnlock = null;
  ledger.forEach(x => {
    if (x.availableAt && x.availableAt > now) {
      pending += x.delta;
      if (x.delta > 0 && (!nextUnlock || x.availableAt < nextUnlock)) nextUnlock = x.availableAt;
    } else {
      available += x.delta;
    }
  });
  const reserved = redemptions.filter(r => r.status === "pending").reduce((s, r) => s + (r.cost || 0), 0);

  return { ledger, redemptions, available, pending, reserved, spendable: available - reserved, nextUnlock };
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
    ["rewards", "rewards.html", "积分兑换"],
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
