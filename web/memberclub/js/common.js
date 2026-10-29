// memberclub 共用功能
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit,
  onSnapshot, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { t, applyI18n, langSwitchHTML, bindLangSwitch, translateReason, lang } from "./i18n.js";

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
  { id: "mochii",  icon: "",   minSpend: 0,    multiplier: 1,   birthday: 88  },  // 图标用 member.jpg，见 tierIconHTML
  { id: "silver",  icon: "🥈", minSpend: 300,  multiplier: 1.2, birthday: 128 },
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

// ---------- 商城分类：后台「奖品管理 › 商城分类」可自订（settings/shop），没设定过就用预设 ----------
export const DEFAULT_SHOP_CATS = [
  { id: "coupon",   icon: "🎫", zh: "优惠券",   en: "Coupons",        ms: "Kupon" },
  { id: "bracelet", icon: "📿", zh: "手链",     en: "Bracelets",      ms: "Gelang" },
  { id: "blindbox", icon: "🎁", zh: "盲盒",     en: "Blind boxes",    ms: "Kotak misteri" },
  { id: "figure",   icon: "🧸", zh: "公仔玩具", en: "Figures & toys", ms: "Figura & mainan" },
  { id: "other",    icon: "✨", zh: "其他",     en: "Others",         ms: "Lain-lain" },
];
export async function loadShopCats() {
  try {
    const snap = await getDoc(doc(db, "settings", "shop"));
    const list = snap.exists() && snap.data().categories;
    if (Array.isArray(list) && list.length) return list;
  } catch (e) { console.warn("shop cats", e); }
  return DEFAULT_SHOP_CATS;
}
export function catOf(r, cats = DEFAULT_SHOP_CATS) {
  if (r.category && cats.some(c => c.id === r.category)) return r.category;
  if (r.type === "coupon" && cats.some(c => c.id === "coupon")) return "coupon";
  if (cats.some(c => c.id === "other")) return "other";
  return cats[0] ? cats[0].id : "";
}
export function catName(c) {
  return (c && (c[lang] || c.zh || c.en)) || "";
}

// 把图片缩到最长边 max 像素，转成小档案（会员上传签收照片用）
export function compressImage(file, max = 720) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      let url = c.toDataURL("image/webp", 0.8);
      if (!url.startsWith("data:image/webp")) url = c.toDataURL("image/jpeg", 0.82);
      URL.revokeObjectURL(img.src);
      resolve(url);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// ---------- 📦 实体奖品：收货地址、运输公司、进度 ----------
export const AUTO_COMPLETE_DAYS = 14;   // 发货后几天没确认就自动完成（和 Apps Script 的 MS_AUTO_COMPLETE_DAYS 一致）
export const MY_STATES = [
  "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang", "Perak", "Perlis",
  "Pulau Pinang", "Sabah", "Sarawak", "Selangor", "Terengganu",
  "W.P. Kuala Lumpur", "W.P. Labuan", "W.P. Putrajaya",
];
export const MAX_ADDRESSES = 5;

// 各州属的城市（选了州属才出现；找不到可以选「其他」自己填）
export const MY_CITIES = {
  "Johor": ["Johor Bahru", "Iskandar Puteri", "Skudai", "Pasir Gudang", "Masai", "Ulu Tiram", "Senai", "Kulai", "Kota Tinggi", "Pontian", "Batu Pahat", "Muar", "Tangkak", "Kluang", "Simpang Renggam", "Yong Peng", "Segamat", "Labis", "Mersing", "Pagoh"],
  "Kedah": ["Alor Setar", "Sungai Petani", "Kulim", "Langkawi", "Jitra", "Gurun", "Baling", "Pendang", "Yan", "Kuala Kedah", "Pokok Sena", "Bandar Baharu"],
  "Kelantan": ["Kota Bharu", "Pasir Mas", "Tumpat", "Tanah Merah", "Machang", "Kuala Krai", "Gua Musang", "Pasir Puteh", "Bachok", "Jeli"],
  "Melaka": ["Melaka", "Ayer Keroh", "Batu Berendam", "Bukit Beruang", "Alor Gajah", "Masjid Tanah", "Jasin", "Merlimau"],
  "Negeri Sembilan": ["Seremban", "Nilai", "Port Dickson", "Mantin", "Rembau", "Kuala Pilah", "Tampin", "Bahau", "Gemas"],
  "Pahang": ["Kuantan", "Temerloh", "Mentakab", "Bentong", "Raub", "Jerantut", "Pekan", "Kuala Lipis", "Maran", "Rompin", "Cameron Highlands", "Genting Highlands"],
  "Perak": ["Ipoh", "Taiping", "Teluk Intan", "Sitiawan", "Lumut", "Manjung", "Kampar", "Batu Gajah", "Kuala Kangsar", "Seri Iskandar", "Tapah", "Tanjung Malim", "Slim River", "Parit Buntar", "Bagan Serai", "Gerik"],
  "Perlis": ["Kangar", "Arau", "Padang Besar", "Kuala Perlis"],
  "Pulau Pinang": ["George Town", "Air Itam", "Gelugor", "Bayan Lepas", "Balik Pulau", "Tanjung Bungah", "Butterworth", "Perai", "Seberang Jaya", "Bukit Mertajam", "Kepala Batas", "Nibong Tebal"],
  "Sabah": ["Kota Kinabalu", "Penampang", "Putatan", "Papar", "Tuaran", "Sandakan", "Tawau", "Lahad Datu", "Semporna", "Keningau", "Kudat", "Beaufort", "Ranau"],
  "Sarawak": ["Kuching", "Kota Samarahan", "Serian", "Bau", "Sri Aman", "Sibu", "Sarikei", "Kapit", "Mukah", "Bintulu", "Miri", "Limbang"],
  "Terengganu": ["Kuala Terengganu", "Kemaman", "Chukai", "Dungun", "Marang", "Kuala Berang", "Jerteh", "Besut", "Setiu"],
  "Selangor": ["Shah Alam", "Petaling Jaya", "Subang Jaya", "Puchong", "Klang", "Port Klang", "Kajang", "Bangi", "Semenyih", "Seri Kembangan", "Cyberjaya", "Sepang", "Ampang", "Cheras", "Selayang", "Batu Caves", "Rawang", "Sungai Buloh", "Kuala Selangor", "Banting", "Damansara"],
  "W.P. Kuala Lumpur": ["Kuala Lumpur"],
  "W.P. Labuan": ["Labuan"],
  "W.P. Putrajaya": ["Putrajaya"],
};

// 邮编前两位 → 州属（帮会员自动选；少数交界地区会员可以自己改）
export function stateFromPostcode(pc) {
  const n = parseInt(String(pc || "").slice(0, 2), 10);
  if (!/^\d{5}$/.test(String(pc || "")) || isNaN(n)) return "";
  if (n <= 2) return "Perlis";
  if (n <= 9) return "Kedah";
  if (n <= 14) return "Pulau Pinang";
  if (n <= 18) return "Kelantan";
  if (n <= 24) return "Terengganu";
  if (n <= 28) return "Pahang";
  if (n <= 36) return "Perak";
  if (n === 39) return "Pahang";
  if (n <= 48) return "Selangor";
  if (n <= 60) return "W.P. Kuala Lumpur";
  if (n === 62) return "W.P. Putrajaya";
  if (n <= 68) return "Selangor";
  if (n === 69) return "Pahang";
  if (n <= 73) return "Negeri Sembilan";
  if (n <= 78) return "Melaka";
  if (n <= 86) return "Johor";
  if (n === 87) return "W.P. Labuan";
  if (n <= 91) return "Sabah";
  if (n <= 98) return "Sarawak";
  return "";
}

// 检查地址；回传错误的 i18n key，没问题回传 ""
export function addressError(a) {
  if (!a.name) return "addr.errName";
  if (!isValidPhone(a.phone || "")) return "idx.phoneBad";
  if (!a.line1) return "addr.errLine";
  if (!/^\d{5}$/.test(a.postcode || "")) return "addr.errPostcode";
  if (!a.city) return "addr.errCity";
  if (!a.state) return "addr.errState";
  return "";
}
export function cleanAddress(a) {
  return {
    name: String(a.name || "").trim().slice(0, 60),
    phone: normalizePhone(a.phone),
    line1: String(a.line1 || "").trim().slice(0, 120),
    line2: String(a.line2 || "").trim().slice(0, 120),
    postcode: String(a.postcode || "").trim(),
    city: String(a.city || "").trim().slice(0, 60),
    state: String(a.state || "").trim(),
    country: "Malaysia",
  };
}
export function addressHTML(a) {
  if (!a) return "";
  return `<b>${esc(a.name)}</b> · ${esc(a.phone)}<br>${esc(a.line1)}${a.line2 ? ", " + esc(a.line2) : ""}<br>${esc(a.postcode)} ${esc(a.city)}, ${esc(a.state)}`;
}

// 兑换编号：#加上兑换 ID 前 6 码（前后台一样，方便核对）
export function redeemCode(id) {
  return "#" + String(id || "").slice(0, 6).toUpperCase();
}
export const DETAIL_COLLAPSE_DAYS = 3;   // 收货几天后，查询物流链接变灰（详情在收货后马上收起）

// 实体奖品进度：0 已申请 · 1 已通过 · 2 已发货 · 3 已签收 · 4 完成
export const GIFT_STEPS = ["pending", "approved", "shipped", "received", "completed"];
export function giftStep(r) {
  if (r.status === "completed") return 4;
  if (r.status === "shipped") return 2;
  if (r.status === "approved" || r.status === "problem") return 1;
  return 0;
}

// ---------- ⏰ 即将下架 ----------
// 回传 null（没设定）、{ ended: true }（已过时间，前台隐藏）或 { end, label }（倒数文字）
export function endState(r, now = new Date()) {
  const end = toDate(r.endAt);
  if (!end) return null;
  if (end <= now) return { ended: true, end };
  const hours = (end - now) / 3600000;
  const label = hours < 24
    ? t("shop.leftHours", { n: Math.max(1, Math.ceil(hours)) })
    : t("shop.leftDays", { n: Math.ceil(hours / 24) });
  return { ended: false, end, label };
}

// ---------- 绑定账号：每个账号的订单统计 ----------
// 回传 { "shopee_alai": { orders, spend, points, last } }；退货的订单不算
export function accountStats(orders) {
  const out = {};
  orders.forEach(o => {
    if (!o.platform || !o.username) return;
    const k = o.platform + "_" + o.username;
    const a = out[k] = out[k] || { orders: 0, spend: 0, points: 0, last: null };
    if (o.status === "refunded") return;
    a.orders++;
    a.spend += Number(o.amount || 0);
    a.points += Number(o.points || 0);
    const at = toDate(o.orderTime);
    if (at && (!a.last || at > a.last)) a.last = at;
  });
  return out;
}

// 单号只显示最后 4 码
export function maskOrderNo(no) {
  const s = String(no || "");
  return s.length > 4 ? "••••" + s.slice(-4) : s;
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
  if (typeof v.seconds === "number") return new Date(v.seconds * 1000);   // 从暂存读回来的时间
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
  const expiring = expiringSoon(pointLots(ledger, reserved), now);

  return { ledger, redemptions, available, pending, reserved, spendable: available - reserved, nextUnlock, expiring };
}

// ---------- ⏳ 积分有效期（必须和 Google 表格同步脚本的 MS_EXPIRY_MONTHS / msPointLots_ 一致） ----------
export const EXPIRY_MONTHS = 12;    // 积分入账后几个月过期
export const EXPIRY_WARN_DAYS = 30; // 过期前几天开始提醒

function addMonths(d, n) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

// 每笔积分的起算日：入账时间与可用时间较晚者（补算的旧订单从补算那天起算）
function lotStart(x) {
  const a = toDate(x.availableAt), c = toDate(x.createdAt);
  if (!a) return c;
  if (!c) return a;
  return a > c ? a : c;
}

// 还没用掉的积分批次（先进先出：兑换、扣分、过期都先扣最旧的；审核中的兑换也算已用）
// 同一张订单的加减先合并，退货不会扣到别的订单的积分
export function pointLots(ledger, reserved = 0) {
  const credits = [];
  const byOrder = {};
  let used = reserved;
  ledger.forEach(x => {
    if (x.orderNo) { (byOrder[x.orderNo] = byOrder[x.orderNo] || []).push(x); return; }
    if (x.delta > 0) credits.push({ amount: x.delta, start: lotStart(x) });
    else used -= x.delta;
  });
  Object.values(byOrder).forEach(list => {
    const net = list.reduce((s, x) => s + x.delta, 0);
    if (net > 0) {
      const starts = list.filter(x => x.delta > 0).map(lotStart).filter(Boolean);
      credits.push({ amount: net, start: starts.length ? new Date(Math.min(...starts)) : null });
    } else if (net < 0) used -= net;
  });
  credits.sort((a, b) => (a.start || 0) - (b.start || 0));
  const lots = [];
  credits.forEach(c => {
    const take = Math.min(used, c.amount);
    used -= take;
    if (c.amount - take > 0 && c.start) {
      lots.push({ amount: c.amount - take, start: c.start, expires: addMonths(c.start, EXPIRY_MONTHS) });
    }
  });
  return lots;
}

// 未来 EXPIRY_WARN_DAYS 天内过期的积分，按日期合并：[{ date, amount }]
export function expiringSoon(lots, now = new Date()) {
  const limitAt = new Date(now.getTime() + EXPIRY_WARN_DAYS * 86400000);
  const map = {};
  lots.filter(l => l.start <= now && l.expires <= limitAt).forEach(l => {
    const key = fmtDate(l.expires);
    if (!map[key]) map[key] = { date: l.expires, amount: 0 };
    map[key].amount += l.amount;
  });
  return Object.values(map).sort((a, b) => a.date - b.date);
}

// ---------- 🎁 额外福利：新会员欢迎礼 / 完善资料奖励 ----------
// 分数、开关由后台「额外福利」设定（settings/perks）；还没设定过就用这里的预设分数
// Firestore 规则的 bonusOk 也会读同一份设定
export const BONUSES = [
  { key: "welcome",   id: "welcome",          points: 50, reason: "新会员欢迎礼" },
  { key: "birthday",  id: "profile_birthday",  points: 10, reason: "完善资料：生日" },
  { key: "whatsapp",  id: "profile_whatsapp",  points: 10, reason: "完善资料：WhatsApp 通知" },
  { key: "platform2", id: "profile_platform2", points: 20, reason: "完善资料：绑定第二个平台" },
];

let perkCfg = null;
export async function loadPerks(force = false) {
  if (perkCfg && !force) return perkCfg;
  try {
    const snap = await getDoc(doc(db, "settings", "perks"));
    perkCfg = snap.exists() ? snap.data() : {};
  } catch (e) { perkCfg = perkCfg || {}; }
  return perkCfg;
}
export function bonusPoints(key) {
  const b = BONUSES.find(x => x.key === key);
  const c = perkCfg && perkCfg[key];
  return c && typeof c.points === "number" ? c.points : (b ? b.points : 0);
}
export function bonusActive(key) {
  const c = perkCfg && perkCfg[key];
  return !c || c.active !== false;
}
export function activeBonuses() {
  return BONUSES.filter(b => bonusActive(b.key));
}
// 后台自订的福利（只显示说明，由客服手动发放）
export function customPerks() {
  return ((perkCfg && perkCfg.custom) || []).filter(p => p.active !== false).map(p => {
    const loc = (p.i18n && p.i18n[lang]) || {};
    return { ...p, title: loc.title || p.title || "", desc: loc.desc || p.desc || "" };
  });
}

// 检查并领取所有符合条件的奖励；回传 { done: 已领过的 key, claimed: 这次新领的 [{key, points}] }
export async function claimBonuses(uid) {
  await loadPerks();
  const mine = c => getDocs(query(collection(db, c), where("uid", "==", uid)));
  const [mSnap, bSnap, lSnap] = await Promise.all([getDoc(doc(db, "members", uid)), mine("bindings"), mine("pointsLedger")]);
  const member = mSnap.exists() ? mSnap.data() : {};
  const binds = bSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (toDate(a.createdAt) || 0) - (toDate(b.createdAt) || 0));
  const have = new Set(lSnap.docs.map(d => d.id));
  const docId = b => b.id + "_" + uid;

  const done = BONUSES.filter(b => have.has(docId(b))).map(b => b.key);
  const claimed = [];
  const internal = isInternalMember(member);
  if (!binds.length && !internal) return { done, claimed, member, binds };

  let eligible;
  if (internal) {
    // 🏷️ 内部会员：不用绑定账号
    eligible = {
      welcome: [],
      birthday: member.birthday ? [] : null,
      whatsapp: member.waOptIn === true && member.phone ? [] : null,
      platform2: [],
    };
  } else {
    const first = binds[0];
    const other = binds.find(b => b.platform !== first.platform);
    eligible = {
      welcome: [first.id],
      birthday: member.birthday ? [first.id] : null,
      whatsapp: member.waOptIn === true && member.phone ? [first.id] : null,
      platform2: other ? [first.id, other.id] : null,
    };
  }

  for (const b of activeBonuses()) {
    const pts = bonusPoints(b.key);
    if (have.has(docId(b)) || !eligible[b.key] || !(pts > 0)) continue;
    try {
      await setDoc(doc(db, "pointsLedger", docId(b)), {
        uid,
        delta: pts,
        reason: b.reason,
        orderNo: null,
        bindingIds: eligible[b.key],
        availableAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      claimed.push({ key: b.key, points: pts });
      done.push(b.key);
    } catch (e) {
      console.warn("bonus " + b.key, e);
    }
  }
  return { done, claimed, member, binds };
}

// ---------- 📣 关注我们（会员自己按「我已关注」领取，每个平台一次） ----------
// 分数、开关、链接在后台「额外福利 → 关注我们」设定（settings/perks 的 follow_xxx）；没填链接的平台不显示
// reason 要和 Firestore 规则 followOk 一致
// 和主页 Stay Connected 一样的线条图标
export const SOCIAL_ICONS = {
  shopee: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12.5H6z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/><path d="M14.2 12.2c-.4-.6-1.2-.9-2.2-.9-1.2 0-2 .5-2 1.3s.7 1.1 2 1.4 2.1.6 2.1 1.5-.9 1.4-2.1 1.4c-1 0-1.9-.4-2.3-1"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3v11.2a3.8 3.8 0 1 1-3.8-3.8"/><path d="M14 3c.2 2.5 2 4.3 4.6 4.5"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3.5h-2.2A3.8 3.8 0 0 0 9 7.3V10H6.5v3.5H9V21h3.5v-7.5h2.7L16 10h-3.5V7.9c0-.8.4-1.4 1.3-1.4H15z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8l-1.2 4.2 4.3-1.2A8.5 8.5 0 1 0 12 3.5z"/><path d="M9.2 8.4c-.3.5-.3 1.3.3 2.3.9 1.6 2.4 3 4 3.6.9.3 1.5.2 1.8-.2l.5-.8-1.8-1-.8.7c-.8-.3-1.9-1.4-2.3-2.3l.7-.8-.9-1.9z"/></svg>',
};
export const FOLLOWS = [
  { key: "follow_shopee",    icon: SOCIAL_ICONS.shopee, name: "Shopee",           points: 10, reason: "关注我们：Shopee" },
  { key: "follow_tiktok",    icon: SOCIAL_ICONS.tiktok, name: "TikTok",           points: 10, reason: "关注我们：TikTok" },
  { key: "follow_instagram", icon: SOCIAL_ICONS.instagram, name: "Instagram",        points: 10, reason: "关注我们：Instagram" },
  { key: "follow_facebook",  icon: SOCIAL_ICONS.facebook, name: "Facebook",         points: 10, reason: "关注我们：Facebook" },
  { key: "follow_whatsapp",  icon: SOCIAL_ICONS.whatsapp, name: "WhatsApp Channel", points: 10, reason: "关注我们：WhatsApp Channel" },
];
export function followList() {
  return FOLLOWS.map(f => {
    const c = (perkCfg && perkCfg[f.key]) || {};
    const link = /^https:\/\//i.test(c.link || "") ? c.link : "";
    return { ...f, link, points: typeof c.points === "number" ? c.points : f.points };
  }).filter(f => f.link && bonusActive(f.key) && f.points > 0);
}
// 领取：内部会员不用绑定；一般会员要有至少一个绑定账号（bindingIds 放第一个绑定）
export async function claimFollow(uid, key, bindingId) {
  const f = followList().find(x => x.key === key);
  if (!f) throw new Error("off");
  await setDoc(doc(db, "pointsLedger", key + "_" + uid), {
    uid,
    delta: f.points,
    reason: f.reason,
    orderNo: null,
    bindingIds: bindingId ? [bindingId] : [],
    availableAt: serverTimestamp(),
    createdAt: serverTimestamp()
  });
  return f.points;
}

// 🏷️ 内部会员（店主在后台标记，员工 / 测试用）
export function isInternalMember(m) {
  return !!(m && m.internal && m.internal.on === true);
}

// 领到奖励时跳出提示
export function toastBonuses(claimed) {
  claimed.forEach((c, i) => setTimeout(() => toast("🎉 " + t("bonus.toast", { n: c.points, what: t("bonus." + c.key) })), i * 2600));
}

export function toast(text) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), 2400);
}

// ---------- 登录检查：未登录或未完成资料的人会被送回首页 ----------
// ⚡ 加快换页：同一次浏览里，会员资料、俱乐部开关、福利设定先用上一页暂存的马上显示，
// 同时在背景重新读取最新的（只要一来一回），有变化下一页就会用新的
const BOOT_KEY = "mcBoot_";
// 更新暂存里的会员资料（例如铃铛已读时间），下一页不用等重新读取
export function patchMemberCache(uid, patch) {
  try {
    const key = BOOT_KEY + uid;
    const c = JSON.parse(sessionStorage.getItem(key) || "null");
    if (!c || !c.member) return;
    c.member = { ...c.member, ...patch };
    sessionStorage.setItem(key, JSON.stringify(c));
  } catch (e) {}
}
export function invalidateMemberCache() {
  try { Object.keys(sessionStorage).filter(k => k.startsWith(BOOT_KEY)).forEach(k => sessionStorage.removeItem(k)); } catch (e) {}
}

export function requireMember(onReady, opts = {}) {
  onAuthStateChanged(auth, async user => {
    if (!user) { location.replace("index.html"); return; }
    const key = BOOT_KEY + user.uid;
    let cached = null;
    if (!opts.fresh) { try { cached = JSON.parse(sessionStorage.getItem(key) || "null"); } catch (e) {} }

    // 背景读取最新资料（会员资料、俱乐部开关、福利设定一起读）
    const fresh = (async () => {
      const [snap, club] = await Promise.all([
        getDoc(doc(db, "members", user.uid)),
        getDoc(doc(db, "settings", "club")),
        loadPerks(true),
      ]);
      if (!snap.exists()) { invalidateMemberCache(); location.replace("index.html"); return null; }
      // 俱乐部维修中：非管理员送回首页
      if (!(club.exists() && club.data().open === true)) {
        const adm = await getDoc(doc(db, "admins", user.uid)).catch(() => null);
        if (!adm || !adm.exists()) { invalidateMemberCache(); location.replace("index.html"); return null; }
      }
      const member = snap.data();
      try { sessionStorage.setItem(key, JSON.stringify({ member, perks: perkCfg })); } catch (e) {}
      return member;
    })();

    const start = member => {
      document.body.classList.remove("loading");
      onReady(user, member);
      initBell(user, member);
      // 额外福利：在背景检查（开放中的都领过了就不再检查）
      const doneKey = "mochiiBonusDone_" + user.uid;
      let doneList = [];
      try { doneList = JSON.parse(localStorage.getItem(doneKey) || "[]"); } catch (e) {}
      if (!Array.isArray(doneList)) doneList = [];
      if (!activeBonuses().every(b => doneList.includes(b.key))) {
        claimBonuses(user.uid).then(r => {
          try { localStorage.setItem(doneKey, JSON.stringify(r.done)); } catch (e) {}
          if (r.claimed.length) invalidateMemberCache();
          toastBonuses(r.claimed);
        }).catch(e => console.warn("claimBonuses", e));
      }
    };

    try {
      if (cached && cached.member) {
        perkCfg = cached.perks || {};
        start(cached.member);
        fresh.catch(e => console.warn("refresh", e));
      } else {
        const member = await fresh;
        if (member) start(member);
      }
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
  { key: "home",   icon: "🏠", label: "nav.home",   href: "home.html",    pages: ["home"] },
  { key: "shop",   icon: "🛍️", label: "nav.shop",   href: "shop.html",    pages: ["shop", "rewards"],
    sub: [["shop", "shop.html", "nav.mall"], ["rewards", "rewards.html", "nav.rewards"]] },
  { key: "member", icon: "💎", label: "nav.points", href: "account.html", pages: ["account", "points"],
    sub: [["account", "account.html", "nav.account"], ["points", "points.html", "nav.pointsDetail"]] },
  { key: "me",     icon: "👤", label: "nav.me",     href: "profile.html", pages: ["profile", "bind", "help"],
    sub: [["profile", "profile.html", "nav.profile"], ["bind", "bind.html", "nav.bind"], ["help", "help.html", "nav.help"]] },
];

export function renderNav(active) {
  applyI18n();
  const el = document.getElementById("topbar");
  if (!el) return;
  const group = NAV.find(g => g.pages.includes(active));
  el.className = "topbar";
  el.innerHTML = `
    <div class="topbar-inner">
      <a class="brand" href="home.html"><img class="brand-logo" src="img/member.jpg" alt=""><span>Mochii <b>Club</b></span></a>
      <div class="topbar-tools">
        <button type="button" id="bellBtn" class="bell" aria-label="${t("notif.title")}">🔔<span id="bellBadge" class="bell-badge" hidden></span></button>
        ${langSwitchHTML()}
      </div>
      <div id="bellPanel" class="bell-panel hidden">
        <div class="bell-head">
          <span>🔔 ${t("notif.title")}</span>
          <button type="button" id="bellReadAll" class="bell-readall">${t("notif.readAll")}</button>
        </div>
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
  speedUpNav(el);
}

// ---------- ⚡ 换页更顺：预先下载、按下马上有反应 ----------
let navSpeedInit = false;
function speedUpNav(el) {
  // 按下时马上显示「换页中」，不用等网络
  el.querySelectorAll("a[href$='.html']").forEach(a => {
    a.addEventListener("click", e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
      el.querySelectorAll(".main-nav a, .sub-nav a").forEach(x => x.classList.remove("active"));
      a.classList.add("active");
      document.body.classList.add("navigating");
    });
  });
  if (navSpeedInit) return;
  navSpeedInit = true;
  // 浏览器支持的话：用 Speculation Rules 预先下载会员页（手指按住或滑鼠移过去时）
  try {
    if (HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules")) {
      const sr = document.createElement("script");
      sr.type = "speculationrules";
      sr.textContent = JSON.stringify({ prefetch: [{ source: "document", where: { href_matches: "*.html" }, eagerness: "moderate" }] });
      document.head.appendChild(sr);
      return;
    }
  } catch (e) {}
  // 不支持的话：闲下来时预先下载主要页面
  const pages = ["home.html", "shop.html", "rewards.html", "account.html", "points.html", "profile.html", "bind.html"];
  const idle = window.requestIdleCallback || (f => setTimeout(f, 1200));
  idle(() => pages.filter(p => !location.pathname.endsWith(p)).forEach(p => {
    const l = document.createElement("link");
    l.rel = "prefetch"; l.href = p;
    document.head.appendChild(l);
  }));
}
// 从别页按「上一页」回来时，取消换页中的状态
window.addEventListener("pageshow", () => document.body.classList.remove("navigating"));

// ---------- 🔔 通知铃铛：积分进账、积分可用、兑换批准/拒绝 ----------
const bell = { ledger: [], redemptions: [], announcements: [], bindLogs: [], seenAt: null, highlightSince: null };
const ANNOUNCE_DAYS = 60; // 公告在铃铛里显示多少天

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
      icon: x.reason === "积分过期" ? "⌛" : x.delta >= 0 ? "🎉" : "↩️",
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
    const v = { name: r.rewardName };
    if (at && r.status === "rejected") {
      ev.push({ time: at, icon: "❌", title: t("notif.rejected", v), detail: r.note || "", link: "rewards.html" });
    } else if (at && r.status !== "pending") {
      ev.push({ time: at, icon: "🎁", title: t(r.kind === "gift" ? "notif.approvedGift" : "notif.approved", v),
        detail: r.couponCode ? t("notif.code", { code: r.couponCode }) : (r.note || ""), link: "rewards.html" });
    }
    // 📦 实体奖品：发货、配送异常、取消、完成、快自动完成
    const sh = toDate(r.shippedAt);
    if (sh) ev.push({ time: sh, icon: "🚚", title: t("notif.shipped", v),
      detail: r.shipping ? [r.shipping.carrierName, r.shipping.trackingNo].filter(Boolean).join(" · ") : "", link: "rewards.html" });
    const pr = toDate(r.problemAt);
    if (pr && r.status === "problem") ev.push({ time: pr, icon: "⚠️", title: t("notif.problem", v), detail: r.problemNote || "", link: "rewards.html" });
    const cc = toDate(r.cancelledAt);
    if (cc && r.adminCancelled) ev.push({ time: cc, icon: "↩️", title: t("notif.adminCancelled", v), detail: r.cancelNote || t("notif.refunded", { n: r.cost }), link: "rewards.html" });
    const done = toDate(r.completedAt);
    if (done && r.autoCompleted) ev.push({ time: done, icon: "✅", title: t("notif.autoCompleted", v), detail: "", link: "rewards.html" });
    if (sh && r.status === "shipped") {
      const remind = new Date(sh.getTime() + (AUTO_COMPLETE_DAYS - 2) * 86400000);
      ev.push({ time: remind, icon: "📦", title: t("notif.confirmSoon", v), detail: t("notif.confirmSoonDetail"), link: "rewards.html" });
    }
  });
  // ⏳ 积分快过期：过期前 EXPIRY_WARN_DAYS 天提醒
  const reserved = bell.redemptions.filter(r => r.status === "pending").reduce((s, r) => s + (r.cost || 0), 0);
  expiringSoon(pointLots(bell.ledger, reserved), now).forEach(x => {
    ev.push({
      time: new Date(x.date.getTime() - EXPIRY_WARN_DAYS * 86400000),
      icon: "⏳",
      title: t("notif.expiring", { n: x.amount, d: fmtDate(x.date) }),
      detail: t("notif.expiringDetail"),
      link: "shop.html",
    });
  });
  // 🔗 客服代为绑定 / 解除绑定
  bell.bindLogs.forEach(l => {
    const at = toDate(l.at);
    if (!at) return;
    const v = { platform: platformLabel(l.platform), user: l.username };
    if (l.action === "bind") ev.push({ time: at, icon: "🔗", title: t("notif.linkedByAdmin", v), detail: "", link: "bind.html" });
    if (l.action === "unbind") ev.push({ time: at, icon: "✂️", title: t("notif.unlinked", v), detail: t("notif.unlinkedDetail"), link: "bind.html" });
  });
  // 📢 管理员公告（有当前语言的版本就用那个）
  bell.announcements.forEach(a => {
    const at = toDate(a.createdAt);
    if (!at) return;
    const loc = (a.i18n && a.i18n[lang]) || {};
    ev.push({
      time: at,
      icon: "📢",
      title: loc.title || a.title || "",
      detail: loc.body || a.body || "",
      link: a.link || "",
      announce: true,
    });
  });
  return ev.filter(e => e.time <= now).sort((a, b) => b.time - a.time).slice(0, 50);
}

// 只允许站内页面或 https 链接
function safeLink(u) {
  u = String(u || "").trim();
  if (!u) return "";
  if (/^https:\/\//i.test(u)) return u;
  if (/^[a-z0-9_-]+\.html(#[\w-]*)?$/i.test(u)) return u;
  return "";
}

// 每种通知的颜色
const BELL_TONE = { "🎉": "green", "✅": "green", "↩️": "red", "⌛": "orange", "⏳": "orange",
  "🎁": "pink", "❌": "red", "🔗": "blue", "✂️": "red", "📢": "purple", "🚚": "blue", "⚠️": "orange", "📦": "orange" };

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
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  let group = "";
  list.innerHTML = events.length ? events.map(e => {
    const g = e.time >= todayStart ? "today" : "earlier";
    const head = g !== group ? `<li class="bell-group">${t("notif." + g)}</li>` : "";
    group = g;
    const isNew = !hl || e.time > hl;
    return head + `
    <li class="bell-item${isNew ? " unread" : ""}${e.announce ? " announce" : ""}">
      <span class="bell-icon tone-${BELL_TONE[e.icon] || "pink"}">${e.icon}</span>
      <div class="bell-body">
        <div class="bell-title">${esc(e.title)}</div>
        ${e.detail ? `<div class="bell-detail">${esc(e.detail)}</div>` : ""}
        <div class="bell-foot">
          <span class="bell-time">${g === "today" ? fmtTime(e.time) : fmtDate(e.time, true)}</span>
          ${safeLink(e.link) ? `<a class="bell-link" href="${esc(safeLink(e.link))}">${t("notif.open")}</a>` : ""}
        </div>
      </div>
      ${isNew ? '<span class="bell-dot" aria-hidden="true"></span>' : ""}
    </li>`;
  }).join("") : `<li class="bell-empty">🔕<br>${t("notif.empty")}</li>`;
}

function fmtTime(d) {
  const p = n => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
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
  onSnapshot(mine("bindingLogs"), s => { bell.bindLogs = s.docs.map(d => d.data()); renderBell(); },
    err => console.warn("bindingLogs", err));
  const since = new Date(Date.now() - ANNOUNCE_DAYS * 86400000);
  onSnapshot(
    query(collection(db, "announcements"), where("createdAt", ">=", since), orderBy("createdAt", "desc"), limit(20)),
    s => { bell.announcements = s.docs.map(d => ({ id: d.id, ...d.data() })); renderBell(); },
    err => console.warn("announcements", err)
  );

  btn.addEventListener("click", async e => {
    e.stopPropagation();
    const opening = panel.classList.contains("hidden");
    panel.classList.toggle("hidden");
    if (!opening) return;
    // 打开时：新通知保持高亮，同时把「已读时间」存起来（换手机也同步）
    bell.highlightSince = bell.seenAt;
    bell.seenAt = new Date();
    renderBell();
    patchMemberCache(user.uid, { notifSeenAt: { seconds: Math.floor(Date.now() / 1000) } });
    try { await updateDoc(doc(db, "members", user.uid), { notifSeenAt: serverTimestamp() }); }
    catch (err) { console.warn("notifSeenAt", err); }
  });
  // 全部已读：清除高亮
  const readAll = document.getElementById("bellReadAll");
  if (readAll) readAll.addEventListener("click", async e => {
    e.stopPropagation();
    bell.seenAt = bell.highlightSince = new Date();
    renderBell();
    patchMemberCache(user.uid, { notifSeenAt: { seconds: Math.floor(Date.now() / 1000) } });
    try { await updateDoc(doc(db, "members", user.uid), { notifSeenAt: serverTimestamp() }); }
    catch (err) { console.warn("notifSeenAt", err); }
  });
  document.addEventListener("click", e => {
    if (!e.target.closest("#bellPanel, #bellBtn")) panel.classList.add("hidden");
  });
}
