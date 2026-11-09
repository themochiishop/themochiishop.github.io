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
  return { active: c.active === true, points: ok ? c.points : DEFAULT_POINTS };
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

// 卡片 HTML；opts = { bound, preview }
export function cardHTML(settings, state, opts = {}) {
  if (!settings.active) return "";
  const v = viewOf(state);
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
    <div class="card-head"><h2>${ct("title")}</h2>${v.today && v.streak > 1 ? `<span class="ci-streak">🔥 ${ct("streak", { n: v.streak })}</span>` : ""}</div>
    <ol class="ci-cells">${cells}</ol>
    ${action}
    <p class="ci-rule">${ct("rule")}</p>
  </div>`;
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
  return {
    ...(prev || {}), lastDate: r.today, day: r.day, streak: r.streak,
  };
}
