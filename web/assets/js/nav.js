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
/* Monthly 下拉默认子菜单:后台没有为它配置子菜单时使用 */
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
const okHref = h => /^(\/|https:\/\/)/.test(h);
const isExt = h => /^https:\/\//i.test(h);
const cleanKid = c => ({ label: c.label.trim(), href: c.href.trim(), show: c.show !== false, note: typeof c.note === 'string' ? c.note.trim() : '', live: c.live === true });
const clean = list => (Array.isArray(list) ? list : Object.values(list || {}))
  .filter(x => x && typeof x.label === 'string' && x.label.trim())
  .map(x => {
    const href = typeof x.href === 'string' ? x.href.trim() : '';
    if (href && !okHref(href)) return null;
    const kids = (Array.isArray(x.children) ? x.children : Object.values(x.children || {}))
      .filter(c => c && typeof c.label === 'string' && c.label.trim() && typeof c.href === 'string' && okHref(c.href.trim()))
      .map(cleanKid);
    if (!href && !kids.length) return null;
    const it = { label: x.label.trim(), href, show: x.show !== false };
    if (kids.length) it.children = kids;
    if (x.nosub === true) it.nosub = true;
    return it;
  }).filter(Boolean);

/* 一个主菜单实际使用的子菜单 */
function kidsOf(x) {
  const all = x.children || [];
  const own = all.filter(c => c.show !== false);
  if (own.length) return own;
  if (!all.length && x.href && norm(x.href) === MONTHLY_HREF && !x.nosub) return MONTHLY_SUB;
  return [];
}

function makeLink(x, here, activeClass) {
  const a = document.createElement('a');
  a.textContent = x.label;
  a.href = x.href;
  if (isExt(x.href)) { a.target = '_blank'; a.rel = 'noopener'; }
  else if (norm(x.href) === here) a.className = activeClass;
  return a;
}

function makeDropdown(x, here, kids) {
  const li = document.createElement('li');
  li.className = 'has-sub';
  const btn = document.createElement('button');
  btn.type = 'button';
  const kidHere = kids.some(c => c.href && !isExt(c.href) && norm(c.href) === here);
  const ownHere = x.href && !isExt(x.href) && norm(x.href) === here;
  btn.className = 'sub-toggle' + (kidHere || ownHere ? ' active' : '');
  btn.setAttribute('aria-haspopup', 'true');
  btn.setAttribute('aria-expanded', 'false');
  // Monthly 默认名字 "Monthly Draw" 显示为 "Monthly";其他菜单显示后台设置的名字
  const name = (x.href && norm(x.href) === MONTHLY_HREF && (!x.label || x.label === 'Monthly Draw')) ? 'Monthly' : x.label;
  btn.textContent = name + ' ';
  const caret = document.createElement('span'); caret.className = 'caret'; caret.setAttribute('aria-hidden', 'true'); caret.textContent = '▾';
  btn.appendChild(caret);
  const sub = document.createElement('ul');
  sub.className = 'sub';
  kids.forEach(c => {
    const a = makeLink(c, here, 'active');
    a.textContent = '';
    const t = document.createElement('span'); t.className = 'sub-t';
    if (c.live) { const d = document.createElement('i'); d.className = 'sub-live'; t.appendChild(d); }
    t.appendChild(document.createTextNode(c.label));
    a.appendChild(t);
    if (c.note) { const n = document.createElement('small'); n.textContent = c.note; a.appendChild(n); }
    const s = document.createElement('li'); s.appendChild(a); sub.appendChild(s);
  });
   btn.onclick = (e) => {
    e.stopPropagation();
    const open = !li.classList.contains('open');
    document.querySelectorAll('.nav li.has-sub.open').forEach(o => {
      if (o !== li) { o.classList.remove('open'); const b = o.querySelector('.sub-toggle'); if (b) b.setAttribute('aria-expanded', 'false'); }
    });
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
  const lis = [];
  items.forEach(x => {
    const kids = kidsOf(x);
    if (kids.length) { lis.push(makeDropdown(x, here, kids)); return; }
    if (!x.href) return;
    const li = document.createElement('li'); li.appendChild(makeLink(x, here, 'active')); lis.push(li);
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
  const seen = new Set(), flat = [];
  const add = x => { const k = isExt(x.href) ? x.href : norm(x.href); if (seen.has(k)) return; seen.add(k); flat.push(x); };
  items.forEach(x => { if (x.href) add(x); kidsOf(x).forEach(add); });
  flat.forEach(x => { const li = document.createElement('li'); li.appendChild(makeLink(x, here, 'cur')); ul.appendChild(li); });
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
  l.append(s1, document.createTextNode(' '), s2);
  const go = document.createElement('span'); go.className = 'dn-go'; go.textContent = 'View Cases →';
  const n = document.createElement('div'); n.className = 'dn-note'; n.textContent = "Opens the charity's own website. Donations are made directly to them.";

  a.append(t, imgs, l, go, n);
  box.appendChild(a);
  foot.insertBefore(box, foot.firstChild);
}
// 菜单里完全没有 Monthly Draw 时,自动加在 About Us 前面(后台设为隐藏的则尊重设置)
function withMonthly(list) {
  if (list.some(x => x.href && norm(x.href) === MONTHLY_HREF)) return list;
  const out = list.slice();
  const i = out.findIndex(x => x.href && norm(x.href) === '/about-us/');
  out.splice(i < 0 ? out.length : i, 0, { label: 'Monthly Draw', href: MONTHLY_HREF, show: true });
  return out;
}
function renderLegal() {
  if (!foot || foot.querySelector('.legal')) return;
  const ps = foot.querySelectorAll(':scope > p');
  const last = ps[ps.length - 1];            // 页脚最后一行(版权)
  if (!last) return;
  const sp = document.createElement('span'); sp.className = 'legal';
  [['Member Terms', '/memberclub/terms.html'], ['Privacy Policy', '/memberclub/privacy.html']].forEach(([label, href]) => {
    sp.appendChild(document.createTextNode(' · '));
    const a = document.createElement('a'); a.href = href; a.textContent = label;
    sp.appendChild(a);
  });
  last.appendChild(sp);
}
/* 全站页脚:注册号和 (WhatsApp only) 小一号(套 span,兼容两版页脚结构) */
function renderFooterMarks() {
  if (!foot) return;

  // 注册号 (202503305565):首页纯文本 / 内页 #fShop 里的 <strong>
  foot.querySelectorAll('#fShop, p').forEach(el => {
    if (el.querySelector('.reg-no')) return;              // 已处理过
    if (el.id === 'fShop' || el.closest('#fShop')) {
      // 内页:#fShop 是 strong,包 span 只缩括号部分
      el.innerHTML = el.innerHTML.replace(
        /\((202503305565)\)/g,
        '<span class="reg-no">($1)</span>'
      );
    } else {
      // 首页:footer p 里的纯文本
      el.innerHTML = el.innerHTML.replace(
        /\((202503305565)\)/g,
        '<span class="reg-no">($1)</span>'
      );
    }
  });

  // (WhatsApp only):已有 .wa-only 的内页跳过,首页纯文本补上
  foot.querySelectorAll('p').forEach(el => {
    if (el.querySelector('.wa-only')) return;             // 内页已有
    el.innerHTML = el.innerHTML.replace(
      /\(WhatsApp only\)/g,
      '<span class="wa-only">(WhatsApp only)</span>'
    );
  });
}


function render(list) {
  const here = norm(location.pathname);
  const items = withMonthly(list).filter(x => x.show !== false && (x.href || kidsOf(x).length));
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
/* ---------- 手机端:点菜单外面、点链接、按 Esc 自动收起 ---------- */
(function () {
  const btn = document.getElementById('menuBtn');
  if (!menu || !btn) return;
  const closeMenu = () => {
    menu.classList.remove('open');
    menu.querySelectorAll('li.has-sub.open').forEach(l => {
      l.classList.remove('open');
      const b = l.querySelector('.sub-toggle'); if (b) b.setAttribute('aria-expanded', 'false');
    });
    btn.setAttribute('aria-expanded', 'false');
  };
  btn.setAttribute('aria-expanded', 'false');
  btn.addEventListener('click', () => {
    setTimeout(() => btn.setAttribute('aria-expanded', menu.classList.contains('open') ? 'true' : 'false'), 0);
  });
  document.addEventListener('click', e => {
    if (!menu.classList.contains('open')) return;
    if (menu.contains(e.target) || btn.contains(e.target)) return;
    closeMenu();
  });
  menu.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (a && !a.closest('button')) closeMenu();          // 点了任何链接就收起
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 760) closeMenu(); });
})();
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
