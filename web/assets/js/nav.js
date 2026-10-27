import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const DEFAULT_NAV = [
  { label: 'Home', href: '/', show: true },
  { label: 'Live Stream', href: '/live-stream/', show: true },
  { label: 'Figures Toy', href: '/figures-toy/', show: true },
  { label: 'Monthly Draw', href: '/monthly-draw/', show: true },
  { label: 'About Us', href: '/about-us/', show: true },
  { label: 'Contact Us', href: '/contact-us/', show: true }
];
const CACHE_KEY = 'navCache';
/* Monthly 下拉：1 每月抽奖结果页、2 实时抽奖大屏（直播时让观众用第二台手机看） */
const MONTHLY_HREF = '/monthly-draw/';
const MONTHLY_SUB = [
  { label: 'Monthly Draw', note: "This month's prizes & winners", href: '/monthly-draw/' },
  { label: 'Live Draw', note: 'Watch the draw live, in real time', href: '/live-draw/', live: true }
];
const menu = document.getElementById('menu');
const foot = document.querySelector('footer');

const norm = p => {
  p = String(p || '/').split('#')[0].split('?')[0];
  if (!p.startsWith('/')) return p;
  p = p.replace(/\/index\.html$/, '/');
  if (p.length > 1 && !p.endsWith('/')) p += '/';
  return p;
};
const clean = list => (Array.isArray(list) ? list : Object.values(list || {}))
  .filter(x => x && typeof x.label === 'string' && typeof x.href === 'string' && x.label.trim() && /^(\/|https:\/\/)/.test(x.href.trim()))
  .map(x => ({ label: x.label.trim(), href: x.href.trim(), show: x.show !== false }));

function makeLink(x, here, activeClass) {
  const a = document.createElement('a');
  a.textContent = x.label;
  a.href = x.href;
  if (/^https:\/\//i.test(x.href)) { a.target = '_blank'; a.rel = 'noopener'; }
  else if (norm(x.href) === here) a.className = activeClass;
  return a;
}

function makeMonthlyDropdown(here, label) {
  const li = document.createElement('li');
  li.className = 'has-sub';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sub-toggle' + (here === MONTHLY_HREF ? ' active' : '');
  btn.setAttribute('aria-haspopup', 'true');
  btn.setAttribute('aria-expanded', 'false');
  // 下拉标题跟后台导航菜单设定的名字走（默认的 "Monthly Draw" 显示为 "Monthly"）
  const name = (!label || label === 'Monthly Draw') ? 'Monthly' : label;
  btn.textContent = name + ' ';
  const caret = document.createElement('span'); caret.className = 'caret'; caret.setAttribute('aria-hidden', 'true'); caret.textContent = '▾';
  btn.appendChild(caret);
  const sub = document.createElement('ul');
  sub.className = 'sub';
  MONTHLY_SUB.forEach(x => {
    const a = makeLink(x, here, 'active');
    a.textContent = '';
    const t = document.createElement('span'); t.className = 'sub-t';
    if (x.live) { const d = document.createElement('i'); d.className = 'sub-live'; t.appendChild(d); }
    t.appendChild(document.createTextNode(x.label));
    const n = document.createElement('small'); n.textContent = x.note;
    a.append(t, n);
    const s = document.createElement('li'); s.appendChild(a); sub.appendChild(s);
  });
  btn.onclick = (e) => {
    e.stopPropagation();
    const open = !li.classList.contains('open');
    li.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  };
  li.append(btn, sub);
  return li;
}
// 点外面或按 Esc 收起下拉
document.addEventListener('click', e => {
  document.querySelectorAll('.nav li.has-sub.open').forEach(li => { if (!li.contains(e.target)) { li.classList.remove('open'); li.firstChild.setAttribute('aria-expanded', 'false'); } });
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.nav li.has-sub.open').forEach(li => { li.classList.remove('open'); li.firstChild.setAttribute('aria-expanded', 'false'); });
});

function renderMenu(items, here) {
  if (!menu) return;
  const lis = items.map(x => {
    if (norm(x.href) === MONTHLY_HREF) return makeMonthlyDropdown(here, x.label);
    const li = document.createElement('li'); li.appendChild(makeLink(x, here, 'active')); return li;
  });
  if (lis.length) menu.replaceChildren(...lis);
}

function renderSitemap(items, here) {
  if (!foot) return;
  let box = foot.querySelector('.sitemap');
  if (!box) {
    box = document.createElement('nav');
    box.className = 'sitemap';
    box.setAttribute('aria-label', 'Site map');
    foot.insertBefore(box, foot.firstChild);
  }
  const title = document.createElement('div'); title.className = 'sm-title'; title.textContent = 'Site Map';
  const ul = document.createElement('ul');
   items.forEach(x => { const li = document.createElement('li'); li.appendChild(makeLink(x, here, 'cur')); ul.appendChild(li); });
  box.replaceChildren(title, ul);
}

function renderCompanyTitle() {
  if (!foot || foot.querySelector('.foot-title')) return;
  const sm = foot.querySelector('.sitemap');
  const first = sm ? sm.nextElementSibling : foot.firstElementChild;
  if (!first) return;
  const t = document.createElement('div');
  t.className = 'foot-title';
  t.textContent = 'Company';
  foot.insertBefore(t, first);
}
function renderDonate() {
  if (!foot || foot.querySelector('.donate')) return;
  if (norm(location.pathname) !== '/') return;
  const box = document.createElement('div'); box.className = 'donate';
  const a = document.createElement('a'); a.className = 'dn-card';
  a.href = 'https://www.onehopecharity.org/case'; a.target = '_blank'; a.rel = 'noopener';
  a.setAttribute('aria-label', 'One Hope Charity & Welfare (opens in a new tab)');

  const t = document.createElement('div'); t.className = 'dn-title'; t.textContent = 'Share the Love';

  const imgs = document.createElement('div'); imgs.className = 'dn-imgs';
   [['/assets/images/OHC_Logo-white.png', 'One Hope Charity & Welfare', 'dn-logo'], ['/assets/images/OHC-Slogan.png', '', 'dn-slogan']].forEach(([src, alt, cls]) => {
    const im = document.createElement('img'); im.className = cls; im.alt = alt; im.decoding = 'async'; im.src = src;
    im.onerror = () => im.remove();
    imgs.appendChild(im);
  });

  const l = document.createElement('div'); l.className = 'dn-line';
  const s1 = document.createElement('span'); s1.textContent = 'Support One Hope Charity & Welfare.';
  const s2 = document.createElement('span'); s2.textContent = 'Your kindness brings health and hope.';
  l.append(s1, document.createTextNode(' '), s2);  const go = document.createElement('span'); go.className = 'dn-go'; go.textContent = 'View Cases →';
  const n = document.createElement('div'); n.className = 'dn-note'; n.textContent = "Opens the charity's own website. Donations are made directly to them.";

  a.append(t, imgs, l, go, n);
  box.appendChild(a);
  foot.insertBefore(box, foot.firstChild);
}
// 菜单里完全没有 Monthly Draw 时，自动加在 About Us 前面（后台设为隐藏的则尊重设置）
function withMonthly(list) {
  if (list.some(x => norm(x.href) === MONTHLY_HREF)) return list;
  const out = list.slice();
  const i = out.findIndex(x => norm(x.href) === '/about-us/');
  out.splice(i < 0 ? out.length : i, 0, { label: 'Monthly Draw', href: MONTHLY_HREF, show: true });
  return out;
}
function renderLegal() {
  if (!foot || foot.querySelector('.legal')) return;
  const ps = foot.querySelectorAll(':scope > p');
  const last = ps[ps.length - 1];            // 页脚最后一行(版权)
  if (!last) return;
  const sp = document.createElement('span'); sp.className = 'legal';
  [['Member Terms', '/member-system/terms.html'], ['Privacy Policy', '/member-system/privacy.html']].forEach(([label, href]) => {
    sp.appendChild(document.createTextNode(' · '));
    const a = document.createElement('a'); a.href = href; a.textContent = label;
    sp.appendChild(a);
  });
  last.appendChild(sp);
}
function render(list) {
  const here = norm(location.pathname);
  const items = withMonthly(list).filter(x => x.show !== false);
  renderMenu(items, here);
  renderSitemap(items, here);
    renderCompanyTitle();
    renderDonate();
    renderLegal();
}
/* ---------- 弹窗公告(后台「📣 弹窗公告」设定) ---------- */
function showPopup(p) {
  const old = document.getElementById('sitePopup');
  if (old) old.remove();
  if (!p || p.on !== true || !(p.title || p.text)) return;
  if (location.pathname.startsWith('/home-editor')) return;
  const key = JSON.stringify([p.title || '', p.text || '', p.btn || '', p.link || '']);
  try { if (sessionStorage.getItem('popupSeen') === key) return; } catch (e) {}
  const seen = () => { try { sessionStorage.setItem('popupSeen', key); } catch (e) {} };
  const box = document.createElement('div');
  box.id = 'sitePopup'; box.className = 'sp-mask';
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
  const close = () => { seen(); box.remove(); };
  const card = document.createElement('div'); card.className = 'sp-card';
  const x = document.createElement('button');
  x.type = 'button'; x.className = 'sp-x'; x.setAttribute('aria-label', 'Close'); x.textContent = '✕'; x.onclick = close;
  card.appendChild(x);
  if (p.title) { const h = document.createElement('h3'); h.className = 'sp-title'; h.textContent = p.title; card.appendChild(h); }
  if (p.text) { const t = document.createElement('p'); t.className = 'sp-text'; t.textContent = p.text; card.appendChild(t); }
  if (p.btn && /^(\/|https:\/\/)/i.test(p.link || '')) {
    const a = document.createElement('a');
    a.className = 'sp-btn'; a.href = p.link; a.textContent = p.btn; a.onclick = seen;
    if (/^https:\/\//i.test(p.link)) { a.target = '_blank'; a.rel = 'noopener'; }
    card.appendChild(a);
  }
  box.appendChild(card);
  box.addEventListener('click', e => { if (e.target === box) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('sitePopup')) close(); });
  document.body.appendChild(box);
}
/* 先用上次记住的菜单(没有就用默认),避免闪烁 */
let cached = null;
try { cached = clean(JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')); } catch (e) {}
render(cached && cached.length ? cached : DEFAULT_NAV);

/* 再读取后台保存的菜单 */
try {
  const cfg = {
    apiKey: "AIzaSyDJrsKAjWqz0AmjEtBzz4CeswiskdQqASw",
    authDomain: "admin-status-c3bdb.firebaseapp.com",
    databaseURL: "https://admin-status-c3bdb-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "admin-status-c3bdb",
    storageBucket: "admin-status-c3bdb.firebasestorage.app",
    messagingSenderId: "377694458194",
    appId: "1:377694458194:web:71a78ba5dbed4df1b1aa8b"
  };
  const app = getApps().length ? getApp() : initializeApp(cfg);
    onValue(ref(getDatabase(app), 'homepage/popup'), snap => showPopup(snap.val()));
  onValue(ref(getDatabase(app), 'homepage/nav'), snap => {
    const list = clean(snap.val());
    if (list.length) {
      render(list);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch (e) {}
    } else {
      render(DEFAULT_NAV);
      try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
    }
  });
} catch (e) { console.error('nav:', e); }
