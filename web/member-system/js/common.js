// member-system 共用功能
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  doc, getDoc, collection, query, where, getDocs,
  onSnapshot, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { t, applyI18n, langSwitchHTML, bindLangSwitch, translateReason } from "./i18n.js";

export { t, applyI18n, translateReason, lang } from "./i18n.js";

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

// ---------- 手机号码：统一存成国际格式 +60123456789 ----------
export function normalizePhone(s) {
  let d = String(s || "").trim();
  if (d.startsWith("+")) return "+" + d.slice(1).replace(/\D/g, "");
  d = d.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("60")) return "+" + d;     // 60123456789
  if (d.startsWith("0")) return "+60" + d.slice(1); // 0123456789
  if (d.startsWith("1")) return "+60" + d;    // 123456789
  return "+" + d;
}

export function isValidPhone(p) {
  if (p.startsWith("+60")) return /^\+601\d{8,9}$/.test(p); // 马来西亚手机
  return /^\+[1-9]\d{7,14}$/.test(p);                        // 其他国家
}

// ---------- 会员等级（必须和 Google 表格同步脚本的 MS_TIERS 一致；名称在 i18n.js） ----------
export const TIERS = [
  { id: "mochii",  icon: "🍡", minSpend: 0,    multiplier: 1,   birthday: 88  },
  { id: "silver",  icon: "🥈", minSpend: 300,  multiplier: 1.2, birthday: 128 },
  { id: "gold",    icon: "🥇", minSpend: 800,  multiplier: 1.5, birthday: 188 },
  { id: "diamond", icon: "💎", minSpend: 2000, multiplier: 2,   birthday: 288 },
];

export function tierLabel(tier) {
  return t("tier." + tier.id);
}

// 目前等级、下一级、还差多少
export function tierProgress(member) {
  const spend = Number(member.spend12m || 0);
  const idx = Math.max(0, TIERS.findIndex(x => x.id === member.tier));
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
    "auth/invalid-credential": "auth.invalid",
    "auth/wrong-password": "auth.invalid",
    "auth/user-not-found": "auth.notFound",
    "auth/email-already-in-use": "auth.inUse",
    "auth/weak-password": "auth.weak",
    "auth/invalid-email": "auth.badEmail",
    "auth/popup-closed-by-user": "auth.popupClosed",
    "auth/popup-blocked": "auth.popupBlocked",
    "auth/cancelled-popup-request": "auth.cancelled",
    "auth/too-many-requests": "auth.tooMany",
    "auth/network-request-failed": "auth.network",
    "auth/unauthorized-domain": "auth.domain",
  };
  const key = map[e && e.code];
  return key ? t(key) : t("common.error") + (e && e.message ? e.message : e);
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
            initBell(user, snap.data());
    } catch (e) {
      console.error(e);
      const el = document.getElementById("pageError");
      if (el) { el.textContent = t("common.loadFail") + e.message; el.classList.remove("hidden"); }
    }
  });
}

export function logout() {
  signOut(auth).then(() => location.replace("index.html"));
}

// ---------- 顶部导航（含语言切换），同时翻译页面文字 ----------
export function renderNav(active) {
  applyI18n();
  const links = [
    ["account", "account.html", "nav.account"],
    ["rewards", "rewards.html", "nav.rewards"],
    ["bind", "bind.html", "nav.bind"],
    ["profile", "profile.html", "nav.profile"],
  ];
  const el = document.getElementById("topbar");
  if (!el) return;
  el.className = "topbar";
  el.innerHTML = `
    <div class="topbar-inner">
      <a class="brand" href="https://www.themochiishop.com">The <span>Mochii</span> Shop</a>
           <div class="topbar-tools">
        <button type="button" id="bellBtn" class="bell" aria-label="${t("notif.title")}">🔔<span id="bellBadge" class="bell-badge" hidden></span></button>
        ${langSwitchHTML()}
      </div>
      <div id="bellPanel" class="bell-panel hidden">
        <div class="bell-head">${t("notif.title")}</div>
        <ul id="bellList" class="bell-list"></ul>
      </div>
    </div>
    <div class="topbar-inner topbar-nav">
      <nav>
        ${links.map(([k, href, key]) =>
          `<a href="${href}" class="${k === active ? "active" : ""}">${t(key)}</a>`).join("")}
      </nav>
    </div>`;
  bindLangSwitch(el);
}
