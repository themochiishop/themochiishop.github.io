// 📅 每日签到（首页卡片）
// 7 天一轮，分数在后台「额外福利 › 每日签到」设定（settings/perks.checkin）；积分由后端 Cloud Function ciMember 发放。
// 每天 00:00（马来西亚时间）换日。会员只读自己的 checkins/{uid}，一次读取。
import { app, db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-functions.js";
import { lang } from "./i18n.js";

const DEFAULT_POINTS = [1, 1, 2, 2, 3, 3, 8];   // 要和后端 src/checkin.js 一致

const TXT = {
  en: {
    title: "📅 Daily check-in",
    pDaily: "Check in {r}",
    pDailySub: "7-day round, {n} pts total · miss a day, restart",
    pStar: "Check-in Star: 30 days",
    pStarPts: "+{n} points",
    pStarGift: "🎁 free gift",
    pStarShare: "Feed share +{n}",
    pGo: "Check in",
    pDone: "✅ Done today",
    pLeft: "{n} days to go",
    toStar: "{n} more day(s) to become a Check-in Star 🏅",
    shareBtn: "✨ Share on Feed +{n}",
    shareShort: "Share +{n}",
    mTitle: "🏅 You're a Check-in Star!",
    mSub: "{n} days in a row — amazing!",
    mPts: "+{n} points",
    mGift: "🎁 {g} — ships with your next order (order within {d} days)",
    mGiftBack: "🎁 {g} — restocking, ships with your next order",
    mBadge: "Check-in Star badge ×{n} on your Feed profile",
    mShare: "Share it on the Feed and get +{n} more points!",
    mLater: "Later",
    btnShort: "Check in +{n}",
    barDone: "Done today",
    roundDone: "Round complete",
    streakShort: "{n}",
    barTitle: "Check-in",
    needBindShort: "Link an order to start",
    fold: "Collapse",
    unfold: "Show details",
    btn: "Check in +{n}",
    done: "Checked in today",
    tomorrow: "Come back tomorrow for +{n}",
    streak: "{n}-day streak",
    needBind: "Link an order to start checking in",
    bindBtn: "Link now",
    day: "Day {n}",
    got: "🎉 Checked in! +{n} points",
    gotZero: "✅ Checked in!",
    rule: "7 days per round. Miss a day and it restarts from Day 1. Resets at 00:00 (Malaysia time).",
    preview: "Preview mode — check-in is disabled",
    "err.ci/off": "Check-in isn't available right now.",
    "err.ci/need-bind": "Link an order first to check in.",
    "err.other": "Check-in failed: ",
  },
  ms: {
    title: "📅 Daftar masuk harian",
    pDaily: "Daftar masuk {r}",
    pDailySub: "7 hari sepusingan, {n} mata · terlepas, mula semula",
    pStar: "Bintang: 30 hari berturut",
    pStarPts: "+{n} mata",
    pStarGift: "🎁 hadiah percuma",
    pStarShare: "kongsi Feed +{n}",
    pGo: "Daftar",
    pDone: "✅ Selesai",
    pLeft: "{n} hari lagi",
    toStar: "{n} hari lagi untuk jadi Bintang Daftar Masuk 🏅",
    shareBtn: "✨ Kongsi di Feed +{n}",
    shareShort: "Kongsi +{n}",
    mTitle: "🏅 Anda Bintang Daftar Masuk!",
    mSub: "{n} hari berturut-turut — hebat!",
    mPts: "+{n} mata",
    mGift: "🎁 {g} — dihantar bersama pesanan seterusnya (pesan dalam {d} hari)",
    mGiftBack: "🎁 {g} — stok sedang ditambah, dihantar bersama pesanan seterusnya",
    mBadge: "Lencana Bintang Daftar Masuk ×{n} di profil Feed anda",
    mShare: "Kongsi di Feed dan dapat +{n} mata lagi!",
    mLater: "Nanti",
    btnShort: "Daftar +{n}",
    barDone: "Selesai hari ini",
    roundDone: "Pusingan selesai",
    streakShort: "{n}",
    barTitle: "Daftar masuk",
    needBindShort: "Pautkan pesanan untuk mula",
    fold: "Tutup",
    unfold: "Lihat butiran",
    btn: "Daftar masuk +{n}",
    done: "Sudah daftar masuk hari ini",
    tomorrow: "Datang semula esok untuk +{n}",
    streak: "{n} hari berturut-turut",
    needBind: "Pautkan pesanan untuk mula daftar masuk",
    bindBtn: "Pautkan",
    day: "Hari {n}",
    got: "🎉 Berjaya! +{n} mata",
    gotZero: "✅ Berjaya daftar masuk!",
    rule: "7 hari satu pusingan. Terlepas sehari, bermula semula dari Hari 1. Ditetapkan semula pada 00:00 (waktu Malaysia).",
    preview: "Mod pratonton — daftar masuk dimatikan",
    "err.ci/off": "Daftar masuk tidak tersedia buat masa ini.",
    "err.ci/need-bind": "Pautkan pesanan dahulu untuk daftar masuk.",
    "err.other": "Daftar masuk gagal: ",
  },
  zh: {
    title: "📅 每日签到",
    pDaily: "每天签到 {r}",
    pDailySub: "7 天一轮共 {n} 分，断签从第 1 天重来",
    pStar: "签到达人：连续 30 天",
    pStarPts: "+{n} 积分",
    pStarGift: "🎁 礼物随单寄",
    pStarShare: "分享 Feed +{n}",
    pGo: "去签到",
    pDone: "✅ 已签到",
    pLeft: "再 {n} 天",
    toStar: "再签 {n} 天成为签到达人 🏅",
    shareBtn: "✨ 分享到 Feed +{n}",
    shareShort: "分享 +{n}",
    mTitle: "🏅 你成为签到达人了！",
    mSub: "连续签到 {n} 天，太厉害了！",
    mPts: "+{n} 积分",
    mGift: "🎁 {g}：随下一单寄出（{d} 天内下单）",
    mGiftBack: "🎁 {g}：补货中，随下一单寄出",
    mBadge: "Feed 个人主页的签到达人徽章 ×{n}",
    mShare: "分享到 Feed 再拿 +{n} 积分！",
    mLater: "稍后",
    btnShort: "签到 +{n}",
    barDone: "今日已签",
    roundDone: "一轮完成",
    streakShort: "{n}天",
    barTitle: "每日签到",
    needBindShort: "绑定订单即可开始",
    fold: "收起",
    unfold: "展开明细",
    btn: "签到 +{n}",
    done: "今天已签到",
    tomorrow: "明天再来可拿 +{n}",
    streak: "已连续签到 {n} 天",
    needBind: "绑定订单即可开始签到",
    bindBtn: "去绑定",
    day: "第{n}天",
    got: "🎉 签到成功！+{n} 积分",
    gotZero: "✅ 签到成功！",
    rule: "7 天一轮，中间断了一天就从第 1 天重新开始。每天 00:00（马来西亚时间）更新。",
    preview: "会员视角预览中，不能签到",
    "err.ci/off": "签到功能目前没有开放。",
    "err.ci/need-bind": "请先绑定订单再签到。",
    "err.other": "签到失败：",
  },
};
export function ct(key, vars) {
  let s = (TXT[lang] || TXT.en)[key] ?? TXT.en[key] ?? key;
  if (vars) Object.keys(vars).forEach(k => { s = s.split("{" + k + "}").join(vars[k]); });
  return s;
}

// 马来西亚日期 "YYYY-MM-DD"（和后端一样）
const mytDate = ms => new Date(ms + 8 * 3600000).toISOString().slice(0, 10);
const prevDate = d => new Date(Date.parse(d + "T00:00:00Z") - 86400000).toISOString().slice(0, 10);

export function settingsOf(perks) {
  const c = (perks && perks.checkin) || {};
  const ok = Array.isArray(c.points) && c.points.length === 7 && c.points.every(n => Number.isInteger(n) && n >= 0);
  const m = c.m30 || {};
  return { active: c.active === true, points: ok ? c.points : DEFAULT_POINTS,
    sharePts: Number.isInteger(m.sharePts) ? m.sharePts : 10,     // 🏅 签到达人分享奖励（要和后端预设一致）
    starPts: Number.isInteger(m.points) ? m.points : 30,          // 🏅 签到达人 30 天奖励
    hasGift: !!m.giftRewardId };                                  // 🏅 有没有签到达人礼物
}

export async function loadState(uid) {
  try {
    const s = await getDoc(doc(db, "checkins", uid));
    return s.exists() ? s.data() : null;
  } catch (e) { return null; }
}

// 现在的画面：done = 这一轮已签几格；next = 下一格是第几天；today = 今天签过没
export function viewOf(state, now = Date.now()) {
  const today = mytDate(now);
  if (state && state.lastDate === today) return { today: true, done: state.day, next: (state.day % 7) + 1, streak: state.streak || 1 };
  if (state && state.lastDate === prevDate(today) && state.day >= 1 && state.day <= 7) {
    // 昨天签完第 7 天：今天开始新的一轮
    if (state.day === 7) return { today: false, done: 0, next: 1, streak: state.streak || 0 };
    return { today: false, done: state.day, next: state.day + 1, streak: state.streak || 0 };
  }
  return { today: false, done: 0, next: 1, streak: 0 };
}

// 🏅 签到达人：还有没用掉的分享资格 → 「分享到 Feed +10」；还差几天到 30 天
const MILESTONE = 30;
const shareOpen = state => !!(state && state.share && state.share.ms && state.share.claimed !== true);
const shareHref = state => "feed.html?ci=" + encodeURIComponent(state.share.ms);
function toStar(v) {
  const s = v.streak || 0;   // 今天签了：含今天；还没签：到昨天为止（今天签了会 +1，所以剩下的天数已经算进今天）
  const r = MILESTONE - (s % MILESTONE);
  return v.today && s % MILESTONE === 0 ? MILESTONE : r;
}

// 完整卡片（电脑版一直显示；手机版展开时显示）
function fullCardHTML(settings, v, opts) {
  const P = settings.points;
  const cells = P.map((p, i) => {
    const n = i + 1;
    const cls = n <= v.done ? " on" : (!v.today && opts.bound && n === v.next ? " next" : "");
    return `<li class="ci-cell${cls}${n === 7 ? " big" : ""}">
      <span class="ci-day">${ct("day", { n })}</span>
      <span class="ci-pts">+${p}</span>${n === 7 && n > v.done ? `<span class="ci-gift" aria-hidden="true">🎁</span>` : ""}
    </li>`;
  }).join("");
  let action;
  if (!opts.bound) {
    action = `<div class="ci-foot"><span class="muted">${ct("needBind")}</span><a class="btn btn-primary btn-inline btn-xs" href="bind.html">${ct("bindBtn")}</a></div>`;
  } else if (v.today) {
    action = `<div class="ci-foot"><span class="ci-ok">✅ ${ct("done")}</span><span class="muted">${ct("tomorrow", { n: P[v.next - 1] })}</span></div>`;
  } else {
    action = `<div class="ci-foot"><span class="muted">${v.streak ? ct("streak", { n: v.streak }) : ""}</span>
      <button type="button" class="btn btn-primary btn-inline ci-btn" data-checkin ${opts.preview ? `disabled title="${ct("preview")}"` : ""}>${ct("btn", { n: P[v.next - 1] })}</button></div>`;
  }
  return `<div class="card ci-card${!opts.bound ? " ci-locked" : ""}">
    <div class="card-head"><h2>${ct("title")}</h2>${v.today && v.streak > 1 ? `<span class="ci-streak">🔥 ${ct("streak", { n: v.streak })}</span>` : ""}
      <button type="button" class="ci-fold" data-ci-fold aria-label="${ct("fold")}" title="${ct("fold")}">⌃</button></div>
    <ol class="ci-cells">${cells}</ol>
    ${action}
    ${opts.bound && shareOpen(opts.state) ? `<a class="btn btn-primary ci-share" href="${shareHref(opts.state)}">${ct("shareBtn", { n: settings.sharePts })}</a>` : ""}
    ${opts.bound ? `<p class="ci-star"><img src="img/ci-badge.png" alt="">${ct("toStar", { n: toStar(v) })}</p>` : ""}
    <p class="ci-rule">${ct("rule")}</p>
  </div>`;
}

// 📱 手机版一行签到条：今天第几天 + 7 个小圆点 + 签到按钮（点其他地方展开完整卡片）
function barHTML(settings, v, opts) {
  const P = settings.points;
  const dots = `<span class="ci-dots" aria-hidden="true">${P.map((_, i) => {
    const n = i + 1;
    if (n <= v.done) return `<i class="on"></i>`;
    if (n === 7) return `<b>🎁</b>`;
    return `<i class="${!v.today && opts.bound && n === v.next ? "nx" : ""}"></i>`;
  }).join("")}</span>`;
  const chev = `<span class="ci-chev" aria-hidden="true">⌄</span>`;
  let inner;
  if (!opts.bound) {
    inner = `<span class="ci-bt">📅 ${ct("barTitle")}</span><span class="ci-bm">${ct("needBindShort")}</span>
      <a class="btn btn-primary ci-bbtn" href="bind.html">${ct("bindBtn")}</a>`;
  } else if (v.today && v.done === 7) {
    inner = `<span class="ci-bt">🎉 ${ct("roundDone")}</span>${dots}<span class="ci-fire">+${P[6]}</span>${chev}`;
  } else if (v.today) {
    inner = `<span class="ci-bt">✅ ${ct("barDone")}</span>${dots}${shareOpen(opts.state)
      ? `<a class="btn btn-primary ci-bbtn" href="${shareHref(opts.state)}">${ct("shareShort", { n: settings.sharePts })}</a>`
      : `${v.streak > 1 ? `<span class="ci-fire">🔥${ct("streakShort", { n: v.streak })}</span>` : ""}${chev}`}`;
  } else {
    inner = `<span class="ci-bt">📅 ${ct("day", { n: v.next })}</span>${dots}
      <button type="button" class="btn btn-primary ci-bbtn" data-checkin ${opts.preview ? `disabled title="${ct("preview")}"` : ""}>${ct("btnShort", { n: P[v.next - 1] })}</button>`;
  }
  return `<div class="ci-bar${v.today && v.done === 7 ? " gift" : ""}" data-ci-open role="button" tabindex="0" aria-label="${ct("unfold")}">${inner}</div>`;
}

// 📱 展开 / 收起（记在这台手机）；第 7 天还没签那天自动展开，突出 🎁（当天按过收起就不再自动展开）
const OPEN_KEY = "mochii_ci_open", FOLD7_KEY = "mochii_ci_fold7";
const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
function isOpen(v, opts) {
  if (opts.bound && !v.today && v.next === 7 && store(FOLD7_KEY) !== mytDate(Date.now())) return true;
  return store(OPEN_KEY) === "1";
}

// 卡片 HTML；opts = { bound, preview }
export function cardHTML(settings, state, opts = {}) {
  if (!settings.active) return "";
  const v = viewOf(state);
  opts = { ...opts, state };
  return `<div class="ci-wrap${isOpen(v, opts) ? " open" : ""}" data-ci-wrap>${barHTML(settings, v, opts)}${fullCardHTML(settings, v, opts)}</div>`;
}

// 首页的点击：展开 / 收起。有处理就回传 true（签到按钮、绑定连结不在这里处理）
export function onToggle(e) {
  if (e.target.closest("[data-checkin], a")) return false;
  const fold = e.target.closest("[data-ci-fold]");
  const bar = !fold && e.target.closest("[data-ci-open]");
  if (!fold && !bar) return false;
  const wrap = e.target.closest("[data-ci-wrap]");
  if (!wrap) return false;
  const open = !!bar;
  wrap.classList.toggle("open", open);
  store(OPEN_KEY, open ? "1" : "0");
  if (!open) store(FOLD7_KEY, mytDate(Date.now()));
  return true;
}

// 🎁 会员等级页「额外福利」：精简两行（每天签到 +1~+8 / 签到达人 30 天奖励）
export function perksRowsHTML(settings, state, opts = {}) {
  if (!settings.active) return "";
  const P = settings.points, v = viewOf(state);
  const pos = P.filter(n => n > 0), lo = Math.min(...pos), hi = Math.max(...pos);
  const range = !pos.length ? "" : lo === hi ? `+${hi}` : `+${lo}\u00a0~\u00a0+${hi}`;   // 不让数字拆成两行
  const total = P.reduce((a, n) => a + n, 0);
  let act;
  if (!opts.bound) act = `<a class="btn btn-ghost" href="bind.html">${ct("bindBtn")}</a>`;
  else if (v.today) act = `<span class="pill">${ct("pDone")}</span>`;
  else act = `<a class="btn btn-primary" href="home.html#checkin">${ct("pGo")}</a>`;
  const star = [settings.starPts > 0 ? ct("pStarPts", { n: settings.starPts }) : "", settings.hasGift ? ct("pStarGift") : "",
    settings.sharePts > 0 ? ct("pStarShare", { n: settings.sharePts }) : ""].filter(Boolean).join(" · ");
  return `<li><span class="ic">📅</span><span class="tx"><b>${ct("pDaily", { r: range })}</b><small>${ct("pDailySub", { n: total })}</small></span><span class="act">${act}</span></li>
    <li><span class="ic"><img src="img/ci-badge.png" alt=""></span><span class="tx"><b>${ct("pStar")}</b><small>${star}</small></span>
      <span class="act">${opts.bound ? `<span class="pill">${ct("pLeft", { n: toStar(v) })}</span>` : ""}</span></li>`;
}

// ---------- 后端 ----------
let fn = null;
export async function checkIn() {
  if (!fn) fn = httpsCallable(getFunctions(app, "asia-southeast1"), "ciMember");
  const r = await fn({ op: "checkIn" });
  return r.data || {};
}
export function errText(e) {
  const key = e && e.details && e.details.key;
  if (key && TXT.en["err." + key]) return ct("err." + key);
  return ct("err.other") + (e && e.message ? e.message : "");
}
// 签到成功后把新的状态写回（不用再读一次）
export function stateAfter(r, prev) {
  const next = { ...(prev || {}), lastDate: r.today, day: r.day, streak: r.streak };
  if (r.milestone) { next.badges = r.milestone.badges; next.share = { ms: r.today, claimed: false, postId: null }; }
  return next;
}

// 🎉 签到达人达标弹窗：积分、礼物、徽章、分享到 Feed
export function showMilestone(r) {
  const m = r.milestone;
  if (!m) return;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const el = document.createElement("div");
  el.className = "ci-modal";
  el.innerHTML = `<div class="ci-modal-card" role="dialog" aria-modal="true">
    <img class="ci-modal-badge" src="img/ci-badge.png" alt="">
    <h3>${ct("mTitle")}</h3>
    <p class="muted">${ct("mSub", { n: m.streak })}</p>
    <ul>
      ${m.points > 0 ? `<li>💰 ${ct("mPts", { n: m.points })}</li>` : ""}
      ${m.gift ? `<li>${esc(ct(m.gift.backorder ? "mGiftBack" : "mGift", { g: m.gift.name, d: m.gift.days }))}</li>` : ""}
      <li><img src="img/ci-badge.png" alt="">${ct("mBadge", { n: m.badges })}</li>
    </ul>
    ${m.sharePts > 0 ? `<p class="ci-modal-share">${ct("mShare", { n: m.sharePts })}</p>` : ""}
    <a class="btn btn-primary" href="feed.html?ci=${encodeURIComponent(r.today)}">${ct("shareBtn", { n: m.sharePts })}</a>
    <button type="button" class="btn btn-ghost" data-close>${ct("mLater")}</button>
  </div>`;
  const close = () => el.remove();
  el.addEventListener("click", e => { if (e.target === el || e.target.closest("[data-close]")) close(); });
  document.body.appendChild(el);
}
