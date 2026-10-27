// memberclub 共用功能
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
  { id: "mochii",  icon: "",   minSpend: 0,    multiplier: 1,   birthday: 88  },  // 图标用 member.jpg，见 tierIconHTML  { id: "silver",  icon: "🥈", minSpend: 300,  multiplier: 1.2, birthday: 128 },
  { id: "gold",    icon: "🥇", minSpend: 800,  multiplier: 1.5, birthday: 188 },
  { id: "diamond", icon: "💎", minSpend: 2000, multiplier: 2,   birthday: 288 },
];

// 等级图标：Mochii 会员用会员俱乐部 logo，其他等级用 emoji
export function tierIconHTML(tier) {
  return tier.id === "mochii"
    ? `<img class="tier-logo" src="img/member.jpg" alt="">`
    : tier.icon;
}
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
            // 俱乐部维修中：非管理员送回首页
      const club = await getDoc(doc(db, "settings", "club"));
      if (!(club.exists() && club.data().open === true)) {
        const adm = await getDoc(doc(db, "admins", user.uid)).catch(() => null);
        if (!adm || !adm.exists()) { location.replace("index.html"); return; }
      }
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

// ---------- 顶部导航：会员俱乐部 logo、铃铛、语言、三大分类 + 子分页 ----------
const NAV = [
  { key: "shop",   icon: "🛍️", label: "nav.shop",   href: "shop.html",    pages: ["shop"] },
  { key: "points", icon: "💎", label: "nav.points", href: "account.html", pages: ["account", "rewards"],
    sub: [["account", "account.html", "nav.account"], ["rewards", "rewards.html", "nav.rewards"]] },
  { key: "me",     icon: "👤", label: "nav.me",     href: "profile.html", pages: ["profile", "bind"],
    sub: [["profile", "profile.html", "nav.profile"], ["bind", "bind.html", "nav.bind"]] },
];

export function renderNav(active) {
  applyI18n();
  const el = document.getElementById("topbar");
  if (!el) return;
  const group = NAV.find(g => g.pages.includes(active));
  el.className = "topbar";
  el.innerHTML = `
    <div class="topbar-inner">
      <a class="brand" href="shop.html"><img class="brand-logo" src="img/member.jpg" alt=""><span>Mochii <b>Club</b></span></a>
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
      <nav class="main-nav">
        ${NAV.map(g => `<a href="${g.href}" class="${g === group ? "active" : ""}"><span>${g.icon}</span>${t(g.label)}</a>`).join("")}
      </nav>
    </div>
    ${group && group.sub ? `
    <div class="topbar-inner sub-nav-row">
      <nav class="sub-nav">
        ${group.sub.map(([k, href, key]) => `<a href="${href}" class="${k === active ? "active" : ""}">${t(key)}</a>`).join("")}
      </nav>
    </div>` : ""}`;
  bindLangSwitch(el);
}

// ---------- 🔔 通知铃铛：积分进账、积分可用、兑换批准/拒绝 ----------
const bell = { ledger: [], redemptions: [], seenAt: null, highlightSince: null };

function buildEvents() {
  const now = new Date();
  const ev = [];
  bell.ledger.forEach(x => {
    if (x.redemptionId) return; // 兑换扣分不另外通知，「兑换已批准」已经说明了
    const at = toDate(x.createdAt), avail = toDate(x.availableAt);
    if (!at) return;
    const stillPending = avail && avail > now;
    ev.push({
      time: at,
      icon: x.delta >= 0 ? "🎉" : "↩️",
      title: translateReason(x.reason),
      detail: (x.delta >= 0 ? t("notif.plus", { n: x.delta }) : t("notif.minus", { n: x.delta }))
        + (stillPending && x.delta > 0 ? " · " + t("notif.pendingUntil", { d: fmtDate(avail) }) : ""),
    });
    // 待确认积分到期转为可用
    if (x.delta > 0 && avail && avail <= now && avail - at > 12 * 3600 * 1000) {
      ev.push({ time: avail, icon: "✅", title: t("notif.nowAvailable", { n: x.delta }), detail: translateReason(x.reason) });
    }
  });
  bell.redemptions.forEach(r => {
    const at = toDate(r.decidedAt);
    if (!at) return;
    if (r.status === "approved") {
      ev.push({ time: at, icon: "🎁", title: t("notif.approved", { name: r.rewardName }),
        detail: r.couponCode ? t("notif.code", { code: r.couponCode }) : (r.note || "") });
    } else if (r.status === "rejected") {
      ev.push({ time: at, icon: "❌", title: t("notif.rejected", { name: r.rewardName }), detail: r.note || "" });
    }
  });
  return ev.filter(e => e.time <= now).sort((a, b) => b.time - a.time).slice(0, 50);
}

function renderBell() {
  const badge = document.getElementById("bellBadge");
  const list = document.getElementById("bellList");
  if (!badge || !list) return;
  const events = buildEvents();
  const unread = events.filter(e => !bell.seenAt || e.time > bell.seenAt).length;
  badge.hidden = !unread;
  badge.textContent = unread > 9 ? "9+" : unread;
  document.getElementById("bellBtn").classList.toggle("has-new", !!unread);
  const hl = bell.highlightSince;
  list.innerHTML = events.length ? events.map(e => `
    <li class="${!hl || e.time > hl ? "unread" : ""}">
      <span class="bell-icon">${e.icon}</span>
      <div>
        <div class="bell-title">${esc(e.title)}</div>
        ${e.detail ? `<div class="bell-detail">${esc(e.detail)}</div>` : ""}
        <div class="bell-time">${fmtDate(e.time, true)}</div>
      </div>
    </li>`).join("") : `<li class="bell-empty">${t("notif.empty")}</li>`;
}

export function initBell(user, member) {
  const btn = document.getElementById("bellBtn");
  const panel = document.getElementById("bellPanel");
  if (!btn || !panel) return;
  bell.seenAt = toDate(member.notifSeenAt);
  bell.highlightSince = bell.seenAt;

  const mine = c => query(collection(db, c), where("uid", "==", user.uid));
  onSnapshot(mine("pointsLedger"), s => { bell.ledger = s.docs.map(d => d.data()); renderBell(); });
  onSnapshot(mine("redemptions"), s => { bell.redemptions = s.docs.map(d => ({ id: d.id, ...d.data() })); renderBell(); });

  btn.addEventListener("click", async e => {
    e.stopPropagation();
    const opening = panel.classList.contains("hidden");
    panel.classList.toggle("hidden");
    if (!opening) return;
    // 打开时：新通知保持高亮，同时把「已读时间」存起来（换手机也同步）
    bell.highlightSince = bell.seenAt;
    bell.seenAt = new Date();
    renderBell();
    try { await updateDoc(doc(db, "members", user.uid), { notifSeenAt: serverTimestamp() }); }
    catch (err) { console.warn("notifSeenAt", err); }
  });
  document.addEventListener("click", e => {
    if (!e.target.closest("#bellPanel, #bellBtn")) panel.classList.add("hidden");
  });
}
