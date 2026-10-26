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

function renderMenu(items, here) {
  if (!menu) return;
  const lis = items.map(x => { const li = document.createElement('li'); li.appendChild(makeLink(x, here, 'active')); return li; });
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

function render(list) {
  const here = norm(location.pathname);
  const items = list.filter(x => x.show !== false);
  renderMenu(items, here);
  renderSitemap(items, here);
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
