// 🎉 新会员奖励（New Member Special）— 会员前台共用
// 首页弹窗与卡片、商城迎新礼卡片、铃铛、绑定成功提示、兑换记录都用这里
// 所有积分、兑换、状态都由后端（Cloud Functions）处理；这里只负责显示和呼叫
import { app, db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-functions.js";
import { lang } from "./i18n.js";

// ---------- 三语文案（后台「活动设定」有填文案就用后台的） ----------
const TXT = {
  zh: {
    tag: "NEW MEMBER SPECIAL",
    popupTitle: "NEW MEMBER SPECIAL",
    popupL1: "绑定 Shopee / TikTok 账号，领取 {cost} 分迎新礼。",
    popupL2: "{cost} 分可兑换 {gift}。",
    popupL3: "礼品随下一笔符合条件的订单寄出。",
    popupCta: "立即绑定 · 领取 {cost} 分",
    later: "稍后再看",
    boundTitle: "🎉 你已获得 {cost} 分迎新礼！",
    boundBody: "现在就可以用 {cost} 分兑换 {gift}，礼品会随你的下一笔订单寄出。",
    goRedeem: "前往兑换 {gift}",
    cardBind: "绑定 Shopee / TikTok 账号领取 {cost} 分，兑换 {gift}",
    cardRedeem: "你的 {cost} 分迎新礼可兑换 {gift}",
    bindBtn: "立即绑定",
    redeemBtn: "去兑换",
    redeemedTitle: "您的 {gift} 已成功兑换！",
    "st.pending_approval": "兑换已送出，正在审核中（{cost} 分暂扣中）。",
    "st.pending_order": "请在剩余 {days} 天内通过已绑定的 Shopee / TikTok 账号再次下单，礼品将随符合条件的订单包裹寄出。",
    "st.order_review": "已收到你的新订单，正在确认中。礼品会随这笔订单寄出。",
    "st.expired_review": "您的迎新礼已超过下单期限，正在等待管理员审核。",
    "st.ready_to_pack": "订单已确认，礼品会放进订单 {order} 的包裹一起寄出。",
    "st.packed": "礼品已放进订单 {order} 的包裹，准备寄出。",
    "st.shipped": "礼品已随订单 {order} 寄出 🎉",
    "st.cancelled": "这份迎新礼已取消。有疑问请联系客服。",
    "st.refunded": "这份迎新礼已取消，{cost} 分已退回。",
    "lbl.pending_approval": "审核中", "lbl.pending_order": "等待下一笔订单", "lbl.order_review": "订单确认中",
    "lbl.expired_review": "等待管理员审核", "lbl.ready_to_pack": "准备寄出", "lbl.packed": "准备寄出",
    "lbl.shipped": "已寄出", "lbl.cancelled": "已取消", "lbl.refunded": "已取消 · 积分已退回",
    kStatus: "当前状态", kDays: "剩余天数", kGift: "兑换商品", kDate: "兑换日期", kDeadline: "截止日期",
    days: "{n} 天", deadlineAfter: "批准后开始计算",
    orderHint: "💡 用任何一个已绑定的 Shopee / TikTok 账号下单都可以。",
    shopTitle: "🎉 新会员专属",
    shopDesc: "用 {cost} 分兑换 {gift}，礼品随你下一笔订单寄出。兑换批准后 {days} 天内下单。每人限一次。",
    shopBtn: "兑换",
    shopNeedBind: "先绑定账号",
    shopShort: "积分不足（还差 {n} 分）",
    shopDone: "查看迎新礼状态",
    shopOut: "已换完",
    shopTest: "🧪 内部会员测试",
    confirm: "用 {cost} 分兑换 {gift}？\n\n礼品不单独寄送，会随你下一笔 Shopee / TikTok 订单一起寄出。兑换批准后 {days} 天内请下单。",
    sending: "兑换中…",
    ok: "🎉 已兑换 {gift}！",
    bindDone: "🎉 你已获得 {cost} 分迎新礼！",
    bindDoneGo: "前往兑换商城 ➔",
    bellTitle: "🎁 新会员专属：{gift}",
    bellBind: "绑定 Shopee / TikTok 账号领取 {cost} 分，可兑换 {gift}",
    bellRedeem: "你的 {cost} 分迎新礼可兑换 {gift}",
    bellStatus: "迎新礼：{status}",
    rwNote: "🎉 新会员迎新礼 · {status}",
    rwSee: "查看状态 ➔",
    "err.nm/insufficient": "积分不足，暂时不能兑换。",
    "err.nm/need-bind": "请先绑定 Shopee / TikTok 账号。",
    "err.nm/already": "你已经有一份迎新礼在处理中。",
    "err.nm/limit": "每位会员只能兑换一次迎新礼。",
    "err.nm/out-of-stock": "迎新礼已经换完了。",
    "err.nm/inactive": "活动目前暂停中。",
    "err.nm/not-eligible": "这个活动只限活动期间加入的新会员。",
    "err.nm/negative": "你的积分目前是负数，暂时不能兑换。",
    "err.nm/bad-move": "这份迎新礼已经在处理中，不能取消，请联系客服。",
    "err.other": "兑换失败，请稍后再试：",
  },
  en: {
    tag: "NEW MEMBER SPECIAL",
    popupTitle: "NEW MEMBER SPECIAL",
    popupL1: "Link your Shopee / TikTok account to get {cost} welcome points.",
    popupL2: "Redeem a {gift} with {cost} points.",
    popupL3: "Your gift ships with your next eligible order.",
    popupCta: "Link now · Get {cost} pts",
    later: "Maybe later",
    boundTitle: "🎉 You've got {cost} welcome points!",
    boundBody: "Use {cost} points to redeem a {gift} now. It ships together with your next order.",
    goRedeem: "Redeem {gift}",
    cardBind: "Link a Shopee / TikTok account to get {cost} pts and redeem a {gift}",
    cardRedeem: "Your {cost} welcome points can redeem a {gift}",
    bindBtn: "Link now",
    redeemBtn: "Redeem",
    redeemedTitle: "Your {gift} has been redeemed!",
    "st.pending_approval": "Your redemption has been sent and is being reviewed ({cost} pts on hold).",
    "st.pending_order": "Place another order with a linked Shopee / TikTok account within {days} days. Your gift will ship in the parcel of that eligible order.",
    "st.order_review": "We've received your new order and are checking it. Your gift will ship with this order.",
    "st.expired_review": "Your welcome gift has passed its order deadline and is waiting for admin review.",
    "st.ready_to_pack": "Order confirmed. Your gift will be packed into the parcel of order {order}.",
    "st.packed": "Your gift is packed with order {order} and ready to ship.",
    "st.shipped": "Your gift has shipped with order {order} 🎉",
    "st.cancelled": "This welcome gift has been cancelled. Please contact us if you have questions.",
    "st.refunded": "This welcome gift has been cancelled and {cost} pts were returned.",
    "lbl.pending_approval": "Under review", "lbl.pending_order": "Waiting for your next order", "lbl.order_review": "Checking order",
    "lbl.expired_review": "Waiting for admin review", "lbl.ready_to_pack": "Preparing to ship", "lbl.packed": "Preparing to ship",
    "lbl.shipped": "Shipped", "lbl.cancelled": "Cancelled", "lbl.refunded": "Cancelled · points returned",
    kStatus: "Status", kDays: "Days left", kGift: "Gift", kDate: "Redeemed on", kDeadline: "Order by",
    days: "{n} days", deadlineAfter: "Starts once approved",
    orderHint: "💡 Any of your linked Shopee / TikTok accounts can place the order.",
    shopTitle: "🎉 New member exclusive",
    shopDesc: "Redeem a {gift} for {cost} pts. It ships with your next order. Order within {days} days after approval. Once per member.",
    shopBtn: "Redeem",
    shopNeedBind: "Link an account first",
    shopShort: "Not enough points ({n} more)",
    shopDone: "View gift status",
    shopOut: "All gone",
    shopTest: "🧪 Internal test",
    confirm: "Redeem a {gift} for {cost} pts?\n\nThe gift is not shipped separately — it ships with your next Shopee / TikTok order. Please order within {days} days after approval.",
    sending: "Redeeming…",
    ok: "🎉 {gift} redeemed!",
    bindDone: "🎉 You've got {cost} welcome points!",
    bindDoneGo: "Go to the Rewards Mall ➔",
    bellTitle: "🎁 New member exclusive: {gift}",
    bellBind: "Link a Shopee / TikTok account to get {cost} pts and redeem a {gift}",
    bellRedeem: "Your {cost} welcome points can redeem a {gift}",
    bellStatus: "Welcome gift: {status}",
    rwNote: "🎉 New member welcome gift · {status}",
    rwSee: "View status ➔",
    "err.nm/insufficient": "Not enough points to redeem.",
    "err.nm/need-bind": "Please link a Shopee / TikTok account first.",
    "err.nm/already": "You already have a welcome gift in progress.",
    "err.nm/limit": "Each member can redeem the welcome gift once.",
    "err.nm/out-of-stock": "The welcome gift is out of stock.",
    "err.nm/inactive": "This campaign is paused.",
    "err.nm/not-eligible": "This offer is only for new members who joined during the campaign.",
    "err.nm/negative": "Your points balance is negative, so you can't redeem right now.",
    "err.nm/bad-move": "This welcome gift is already being processed and can't be cancelled. Please contact us.",
    "err.other": "Couldn't redeem, please try again: ",
  },
  ms: {
    tag: "NEW MEMBER SPECIAL",
    popupTitle: "NEW MEMBER SPECIAL",
    popupL1: "Pautkan akaun Shopee / TikTok anda untuk {cost} mata alu-aluan.",
    popupL2: "Tebus {gift} dengan {cost} mata.",
    popupL3: "Hadiah dihantar bersama pesanan layak anda yang seterusnya.",
    popupCta: "Pautkan sekarang · Dapat {cost} mata",
    later: "Nanti dulu",
    boundTitle: "🎉 Anda telah mendapat {cost} mata alu-aluan!",
    boundBody: "Tebus {gift} dengan {cost} mata sekarang. Ia dihantar bersama pesanan anda yang seterusnya.",
    goRedeem: "Tebus {gift}",
    cardBind: "Pautkan akaun Shopee / TikTok untuk {cost} mata dan tebus {gift}",
    cardRedeem: "{cost} mata alu-aluan anda boleh menebus {gift}",
    bindBtn: "Pautkan sekarang",
    redeemBtn: "Tebus",
    redeemedTitle: "{gift} anda berjaya ditebus!",
    "st.pending_approval": "Penebusan anda telah dihantar dan sedang disemak ({cost} mata ditahan).",
    "st.pending_order": "Sila buat pesanan lagi melalui akaun Shopee / TikTok yang dipautkan dalam masa {days} hari. Hadiah akan dihantar dalam bungkusan pesanan yang layak.",
    "st.order_review": "Pesanan baharu anda telah diterima dan sedang disemak. Hadiah akan dihantar bersama pesanan ini.",
    "st.expired_review": "Hadiah alu-aluan anda telah melepasi tarikh akhir pesanan dan sedang menunggu semakan admin.",
    "st.ready_to_pack": "Pesanan disahkan. Hadiah akan dimasukkan ke dalam bungkusan pesanan {order}.",
    "st.packed": "Hadiah telah dibungkus bersama pesanan {order} dan sedia dihantar.",
    "st.shipped": "Hadiah telah dihantar bersama pesanan {order} 🎉",
    "st.cancelled": "Hadiah alu-aluan ini telah dibatalkan. Sila hubungi kami jika ada pertanyaan.",
    "st.refunded": "Hadiah alu-aluan ini telah dibatalkan dan {cost} mata telah dikembalikan.",
    "lbl.pending_approval": "Sedang disemak", "lbl.pending_order": "Menunggu pesanan seterusnya", "lbl.order_review": "Menyemak pesanan",
    "lbl.expired_review": "Menunggu semakan admin", "lbl.ready_to_pack": "Sedang disediakan", "lbl.packed": "Sedang disediakan",
    "lbl.shipped": "Telah dihantar", "lbl.cancelled": "Dibatalkan", "lbl.refunded": "Dibatalkan · mata dikembalikan",
    kStatus: "Status", kDays: "Baki hari", kGift: "Hadiah", kDate: "Tarikh tebus", kDeadline: "Pesan sebelum",
    days: "{n} hari", deadlineAfter: "Bermula selepas diluluskan",
    orderHint: "💡 Mana-mana akaun Shopee / TikTok yang dipautkan boleh membuat pesanan.",
    shopTitle: "🎉 Eksklusif ahli baharu",
    shopDesc: "Tebus {gift} dengan {cost} mata. Ia dihantar bersama pesanan anda yang seterusnya. Pesan dalam {days} hari selepas diluluskan. Sekali bagi setiap ahli.",
    shopBtn: "Tebus",
    shopNeedBind: "Pautkan akaun dahulu",
    shopShort: "Mata tidak cukup (kurang {n})",
    shopDone: "Lihat status hadiah",
    shopOut: "Habis",
    shopTest: "🧪 Ujian dalaman",
    confirm: "Tebus {gift} dengan {cost} mata?\n\nHadiah tidak dihantar berasingan — ia dihantar bersama pesanan Shopee / TikTok anda yang seterusnya. Sila buat pesanan dalam {days} hari selepas diluluskan.",
    sending: "Sedang menebus…",
    ok: "🎉 {gift} berjaya ditebus!",
    bindDone: "🎉 Anda telah mendapat {cost} mata alu-aluan!",
    bindDoneGo: "Pergi ke Pusat Ganjaran ➔",
    bellTitle: "🎁 Eksklusif ahli baharu: {gift}",
    bellBind: "Pautkan akaun Shopee / TikTok untuk {cost} mata dan tebus {gift}",
    bellRedeem: "{cost} mata alu-aluan anda boleh menebus {gift}",
    bellStatus: "Hadiah alu-aluan: {status}",
    rwNote: "🎉 Hadiah alu-aluan ahli baharu · {status}",
    rwSee: "Lihat status ➔",
    "err.nm/insufficient": "Mata tidak mencukupi untuk menebus.",
    "err.nm/need-bind": "Sila pautkan akaun Shopee / TikTok dahulu.",
    "err.nm/already": "Anda sudah mempunyai hadiah alu-aluan yang sedang diproses.",
    "err.nm/limit": "Setiap ahli hanya boleh menebus hadiah alu-aluan sekali.",
    "err.nm/out-of-stock": "Hadiah alu-aluan telah habis.",
    "err.nm/inactive": "Kempen ini sedang dihentikan sementara.",
    "err.nm/not-eligible": "Tawaran ini hanya untuk ahli baharu yang menyertai semasa kempen.",
    "err.nm/negative": "Baki mata anda negatif, jadi anda tidak boleh menebus buat masa ini.",
    "err.nm/bad-move": "Hadiah alu-aluan ini sedang diproses dan tidak boleh dibatalkan. Sila hubungi kami.",
    "err.other": "Gagal menebus, sila cuba lagi: ",
  },
};
// 后台「活动设定」可以覆盖的文案键 → 这里对应的键
const COPY_MAP = { popupTitle: "popupTitle", popupCta: "popupCta" };

const L = TXT[lang] ? lang : "en";
let S = null;   // 活动设定

export function nt(key, vars = {}) {
  let s = (TXT[L] && TXT[L][key]) ?? TXT.en[key] ?? key;
  const copy = S && S.copy && S.copy[L];
  if (copy && COPY_MAP[key] && copy[COPY_MAP[key]]) s = copy[COPY_MAP[key]];
  const v = { cost: S ? S.cost : 30, gift: giftName(), days: S ? S.validDays : 20, ...vars };
  Object.keys(v).forEach(k => { s = String(s).split("{" + k + "}").join(v[k]); });
  return s;
}
// 后台文案（整段）：有填就用，没填回传空字串
function copyOf(k) {
  const c = S && S.copy && S.copy[L];
  return c && c[k] ? fill(c[k]) : "";
}
function fill(s) {
  const v = { cost: S ? S.cost : 30, gift: giftName(), days: S ? S.validDays : 20 };
  Object.keys(v).forEach(k => { s = String(s).split("{" + k + "}").join(v[k]); });
  return s;
}
export function giftName() {
  const g = (S && S.gift) || {};
  return ((g.i18n || {})[L] || {}).name || g.name || "Home Diffuser";
}
function giftDesc() {
  const g = (S && S.gift) || {};
  return ((g.i18n || {})[L] || {}).desc || "";
}
const giftImg = () => (S && S.gift && S.gift.image) || "";

// ---------- 小工具（不依赖 common.js，避免互相引用） ----------
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function toMs(v) {
  if (!v) return null;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (v instanceof Date) return v.getTime();
  if (typeof v.seconds === "number") return v.seconds * 1000;
  return null;
}
function fmtDate(ms) {
  if (!ms) return "-";
  const d = new Date(ms), p = n => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
const daysLeft = ms => Math.max(0, Math.ceil((ms - Date.now()) / 86400000));
function newTxId() {
  const r = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()).replace(/[^A-Za-z0-9]/g, "");
  return r.slice(0, 40);
}

// ---------- 活动设定（公开资料；同一次浏览暂存 10 分钟） ----------
const SKEY = "mcNmSettings";
export function peekSettings() {
  if (S) return S;
  try {
    const c = JSON.parse(sessionStorage.getItem(SKEY) || "null");
    if (c && c.at > Date.now() - 600000) { S = c.s; return S; }
  } catch (e) {}
  return null;
}
export async function loadSettings(force = false) {
  if (!force && peekSettings()) return S;
  try {
    const snap = await getDoc(doc(db, "settings", "newMember"));
    S = snap.exists() ? snap.data() : {};
  } catch (e) { S = S || {}; }
  S.cost = typeof S.cost === "number" ? S.cost : 30;
  S.validDays = typeof S.validDays === "number" ? S.validDays : 20;
  try { sessionStorage.setItem(SKEY, JSON.stringify({ at: Date.now(), s: S })); } catch (e) {}
  return S;
}

// ---------- 📦 包裹卡片来源（Welcome Hub ?from=card） ----------
const FROM_KEY = "mochiiFromCard";
(function rememberSource() {
  try {
    if (new URLSearchParams(location.search).get("from") === "card") localStorage.setItem(FROM_KEY, String(Date.now()));
  } catch (e) {}
})();
function source() {
  try {
    const t = Number(localStorage.getItem(FROM_KEY) || 0);
    return t && Date.now() - t < 14 * 86400000 ? "card" : null;
  } catch (e) { return null; }
}

// ---------- 后端 ----------
let fnMember = null;
function call(data) {
  if (!fnMember) fnMember = httpsCallable(getFunctions(app, "asia-southeast1"), "nmMember");
  return fnMember(data).then(r => r.data || {});
}
export function errText(e) {
  const key = e && e.details && e.details.key;
  if (key && TXT.en["err." + key]) return nt("err." + key);
  return nt("err.other") + (e && e.message ? e.message : "");
}

// ---------- 会员状态 ----------
// 回传 { show, kind: "none" | "offer" | "status", eligible, rid, status, deadline }
export function stateOf(member) {
  const n = (member && member.nmr) || {};
  const internal = !!(member && member.internal && member.internal.on === true);
  if (n.rid) return { kind: "status", rid: n.rid, status: n.status, deadline: toMs(n.deadline), internal, eligible: !!n.eligible };
  if (!S || S.active !== true) return { kind: "none" };
  if (n.eligible === true) return { kind: "offer", eligible: true, popupSeen: !!n.popupSeenAt, internal };
  if (internal) return { kind: "offer", eligible: false, popupSeen: true, internal };
  return { kind: "none" };
}

// 刚注册的会员：触发器可能还没写入资格，自己问一次（只在注册后 1 天内问）
export async function ensureFresh(user, member) {
  if (member.nmr || user.isPreview) return member;
  const c = toMs(member.createdAt);
  if (!c || Date.now() - c > 86400000) return member;
  try {
    const r = await call({ op: "ensure" });
    if (r && r.eligible) return { ...member, nmr: { eligible: true } };
  } catch (e) { console.warn("nm ensure", e); }
  return member;
}

// ---------- 🪟 首页弹窗 ----------
const SEEN_KEY = "mochiiNmPopup_";
export function shouldPopup(user, member, st) {
  if (!S || S.active !== true || S.popupOn === false) return false;
  if (st.kind !== "offer" || !st.eligible || st.popupSeen || user.isPreview) return false;
  try { if (localStorage.getItem(SEEN_KEY + user.uid)) return false; } catch (e) {}
  return true;
}
function markSeen(user, onPatch) {
  try { localStorage.setItem(SEEN_KEY + user.uid, "1"); } catch (e) {}
  if (onPatch) onPatch({ popupSeenAt: { seconds: Math.floor(Date.now() / 1000) } });
  call({ op: "dismissPopup", source: source() }).catch(e => console.warn("nm dismiss", e));
}
// bound：已经绑定账号（领过欢迎礼）
export function showPopup(user, { bound, onPatch } = {}) {
  if (document.getElementById("nmPopup")) return;
  const img = giftImg();
  const body = copyOf("popupBody");
  const el = document.createElement("div");
  el.id = "nmPopup";
  el.className = "modal nm-modal";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.innerHTML = `
    <div class="modal-card nm-pop">
      <button type="button" class="modal-x" data-nm-close aria-label="close">✕</button>
      <div class="nm-pop-tag">✨ ${esc(nt("popupTitle"))} ✨</div>
      ${img ? `<img class="nm-pop-img" src="${esc(img)}" alt="">` : `<div class="nm-pop-img nm-pop-ico">🎁</div>`}
      ${bound ? `<h2>${esc(nt("boundTitle"))}</h2><p class="nm-pop-text">${esc(nt("boundBody"))}</p>`
        : body ? `<p class="nm-pop-text">${esc(body)}</p>`
        : `<ul class="nm-pop-list">
            <li><b>①</b>${esc(nt("popupL1"))}</li>
            <li><b>②</b>${esc(nt("popupL2"))}</li>
            <li><b>③</b>${esc(nt("popupL3"))}</li>
          </ul>`}
      <a class="btn btn-primary nm-pop-cta" href="${bound ? "shop.html#nm" : "profile.html#bind"}" data-nm-go>${esc(bound ? nt("goRedeem") : nt("popupCta"))}</a>
      <button type="button" class="nm-pop-later" data-nm-close>${esc(nt("later"))}</button>
    </div>`;
  document.body.appendChild(el);
  const close = () => { el.remove(); markSeen(user, onPatch); };
  el.addEventListener("click", e => {
    if (e.target === el || e.target.closest("[data-nm-close]")) close();
    else if (e.target.closest("[data-nm-go]")) markSeen(user, onPatch);
  });
}

// ---------- 🏠 首页卡片 ----------
// reward：newMemberRewards 文件（已兑换才有）
export async function loadReward(rid) {
  try {
    const s = await getDoc(doc(db, "newMemberRewards", rid));
    return s.exists() ? s.data() : null;
  } catch (e) { return null; }
}
export function homeCardHTML(st, { bound, reward } = {}) {
  if (st.kind === "offer") {
    const img = giftImg();
    const title = copyOf("cardTitle") || nt("tag");
    const body = copyOf("cardBody") || nt(bound || st.internal ? "cardRedeem" : "cardBind");
    return `
      <a class="card nm-card nm-offer" href="${bound || st.internal ? "shop.html#nm" : "profile.html#bind"}">
        ${img ? `<img class="nm-thumb" src="${esc(img)}" alt="">` : `<span class="nm-thumb">🎁</span>`}
        <div class="nm-tx"><div class="nm-tag">✨ ${esc(title)}</div><div class="nm-body">${esc(body)}</div></div>
        <span class="btn btn-primary btn-inline btn-xs">${esc(nt(bound || st.internal ? "redeemBtn" : "bindBtn"))}</span>
      </a>`;
  }
  if (st.kind !== "status") return "";
  const r = reward || {};
  const status = r.status || st.status;
  const cost = r.cost ?? (S ? S.cost : 30);
  const dl = toMs(r.deadline) ?? st.deadline;
  const order = (r.linkedOrder && r.linkedOrder.orderNo) || "";
  const gift = (r.gift && (((r.gift.i18n || {})[L] || {}).name || r.gift.name)) || giftName();
  const img = (r.gift && r.gift.image) || giftImg();
  const live = ["pending_order", "order_review", "expired_review"].includes(status);
  const tone = { pending_order: "tag-pending", order_review: "tag-ship", expired_review: "tag-pending",
    ready_to_pack: "tag-ship", packed: "tag-ship", shipped: "tag-ok", pending_approval: "tag-pending" }[status] || "";
  const rows = [
    [nt("kStatus"), `<span class="tag ${tone}">${esc(nt("lbl." + status))}</span>`],
    status === "pending_order" && dl ? [nt("kDays"), `<b class="nm-days${daysLeft(dl) <= 5 ? " soon" : ""}">${esc(nt("days", { n: daysLeft(dl) }))}</b>`] : null,
    [nt("kGift"), esc(gift)],
    [nt("kDate"), fmtDate(toMs(r.requestedAt))],
    live || status === "pending_approval" ? [nt("kDeadline"), dl ? fmtDate(dl) : esc(nt("deadlineAfter"))] : null,
  ].filter(Boolean);
  return `
    <div class="card nm-card nm-status${status === "pending_order" ? " has-todo" : ""}">
      <div class="nm-head">
        ${img ? `<img class="nm-thumb" src="${esc(img)}" alt="">` : `<span class="nm-thumb">🎁</span>`}
        <div class="nm-tx">
          <div class="nm-tag">✨ ${esc(nt("tag"))}</div>
          <div class="nm-title">${esc(["cancelled", "refunded"].includes(status) ? gift : nt("redeemedTitle", { gift }))}</div>
        </div>
      </div>
      <p class="nm-msg">${esc(nt("st." + status, { cost, order, days: dl ? daysLeft(dl) : (S ? S.validDays : 20), gift }))}</p>
      <dl class="nm-kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("")}</dl>
      ${status === "pending_order" ? `<p class="nm-hint">${esc(nt("orderHint"))}</p>` : ""}
    </div>`;
}

// ---------- 🛍️ 商城迎新礼卡片 ----------
// bal：loadBalance() 的结果；bound：已绑定
export function shopCardHTML(st, { bal, bound } = {}) {
  if (st.kind === "status") {
    // 已兑换：直接打开「兑换记录」里的那一笔（会捲到那一笔并闪一下）
    return `<a class="card nm-card nm-shop done" id="nm" href="rewards.html#r-nm_${esc(st.rid)}">
      <span class="nm-thumb">${giftImg() ? `<img src="${esc(giftImg())}" alt="">` : "🎁"}</span>
      <div class="nm-tx"><div class="nm-tag">${esc(nt("shopTitle"))}</div><div class="nm-body">${esc(giftName())} · ${esc(nt("lbl." + st.status))}</div></div>
      <span class="btn btn-ghost btn-inline btn-xs">${esc(nt("shopDone"))}</span></a>`;
  }
  if (st.kind !== "offer") return "";
  const cost = S.cost;
  const out = typeof S.stock === "number" && S.stock <= 0 && !st.internal;
  const short = bal ? cost - bal.spendable : 0;
  let btn;
  if (out) btn = `<button class="btn btn-ghost btn-inline" disabled>${esc(nt("shopOut"))}</button>`;
  else if (!bound && !st.internal) btn = `<a class="btn btn-primary btn-inline" href="profile.html#bind">${esc(nt("shopNeedBind"))}</a>`;
  else if (short > 0) btn = `<button class="btn btn-ghost btn-inline" disabled>${esc(nt("shopShort", { n: short }))}</button>`;
  else btn = `<button class="btn btn-primary btn-inline" data-nm-redeem>${esc(nt("shopBtn"))} · ${esc(String(cost))} pts</button>`;
  const desc = giftDesc();
  return `
    <div class="card nm-card nm-shop" id="nm">
      <span class="nm-thumb">${giftImg() ? `<img src="${esc(giftImg())}" alt="">` : "🎁"}</span>
      <div class="nm-tx">
        <div class="nm-tag">${esc(nt("shopTitle"))}${st.internal && !st.eligible ? ` · ${esc(nt("shopTest"))}` : ""}</div>
        <div class="nm-title">${esc(giftName())}</div>
        ${desc ? `<div class="nm-body">${esc(desc)}</div>` : ""}
        <div class="nm-body muted">${esc(nt("shopDesc"))}</div>
        <p class="msg" id="nmMsg"></p>
      </div>
      <div class="nm-act">${btn}</div>
    </div>`;
}
// 商城：按「兑换」
let redeemTx = null;
export function bindShopCard(root, user, { onDone } = {}) {
  root.addEventListener("click", async e => {
    const b = e.target.closest("[data-nm-redeem]");
    if (!b || user.isPreview) return;
    if (!confirm(nt("confirm"))) return;
    const msg = root.querySelector("#nmMsg");
    b.disabled = true;
    if (msg) { msg.className = "msg"; msg.textContent = nt("sending"); }
    redeemTx = redeemTx || newTxId();   // 网络不稳重按：同一个事务，不会重复兑换
    try {
      const r = await call({ op: "redeem", txId: redeemTx, source: source() });
      redeemTx = null;
      if (msg) { msg.className = "msg ok"; msg.textContent = nt("ok"); }
      if (onDone) onDone(r);
    } catch (err) {
      const key = err && err.details && err.details.key;
      if (key) redeemTx = null;   // 后端明确拒绝：下次用新的事务
      if (msg) { msg.className = "msg err"; msg.textContent = errText(err); }
      b.disabled = false;
    }
  });
}

// 兑换记录：取消还没批准的迎新礼
export async function cancelPending(rid) {
  return call({ op: "cancel", rid, txId: newTxId() });
}

// ---------- 🔔 铃铛 ----------
// 回传要加进铃铛的项目（只看会员资料上的摘要，不另外读资料）
export function bellEvents(member) {
  const n = (member && member.nmr) || {};
  const s = peekSettings();
  const out = [];
  if (n.rid && n.status) {
    const at = toMs(n.updatedAt);
    if (at) out.push({ time: new Date(at), icon: "🎁", title: nt("bellStatus", { status: nt("lbl." + n.status) }),
      detail: n.status === "pending_order" && toMs(n.deadline) ? nt("kDeadline") + " " + fmtDate(toMs(n.deadline)) : "",
      link: "rewards.html#r-nm_" + n.rid });
  } else if (n.eligible && n.popupSeenAt && s && s.active === true) {
    // 关闭弹窗后：铃铛留一则，找得回活动
    out.push({ time: new Date(toMs(n.popupSeenAt)), icon: "🎁", title: nt("bellTitle"), detail: nt("bellBind"), link: "shop.html#nm" });
  }
  return out;
}

// ---------- 兑换记录：迎新礼说明列 ----------
export function rewardsNote(r, member) {
  if (!r.newMember) return "";
  const n = (member && member.nmr) || {};
  // 已寄出 / 已完成 / 已取消：以兑换记录本身为准（会员资料可能是几分钟前的暂存）
  const byRed = { shipped: "shipped", completed: "shipped", cancelled: "cancelled", rejected: "cancelled" }[r.status];
  const status = byRed || (n.rid === r.nmrId && n.status ? n.status : null);
  if (!status) return "";
  return `<div class="nm-rw">${esc(nt("rwNote", { status: nt("lbl." + status) }))} <a href="home.html">${esc(nt("rwSee"))}</a></div>`;
}
export const isNmRedemption = r => r && r.newMember === true;
