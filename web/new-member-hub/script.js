
const strings = {
  en: {
    headline: 'Unlock More Rewards!',
    intro: 'Thank you for shopping with us. Discover more benefits, rewards and exclusive updates.',
    memberDesc: 'Earn points on eligible purchases, redeem rewards and explore member perks.',
    memberCta: 'JOIN / LOGIN MEMBER CLUB',
    channelDesc: 'Follow us for giveaways, exclusive deals and shop updates.',
    channelCta: 'FOLLOW OUR CHANNEL',
    help: 'Need Help? Choose the right support team.',
    shop: 'Shop & Order Support',
    shopDesc: 'Products, orders, delivery and parcels',
    member: 'Member Club Support',
    memberHelp: 'Accounts, points and technical help',
    foot: 'Member benefits and promotions are subject to applicable terms.',
    nmLine: 'Link your Shopee / TikTok account to get {cost} welcome points and redeem a {gift}!',
    nmNote: 'Your gift ships with your next eligible order.'
  },

  zh: {
    headline: '解锁更多会员福利！',
    intro: '感谢您在 THE MOCHII SHOP 购物！探索会员奖励、专属优惠和最新活动。',
    memberDesc: '符合条件的订单可累积积分、兑换奖励，享受会员专属福利。',
    memberCta: '加入 / 登录会员俱乐部 ',
    channelDesc: '关注我们的频道，获取抽奖、独家优惠及店铺最新消息。',
    channelCta: '关注 WHATSAPP 频道 ',
    help: '需要帮助？请选择对应的客服。',
    shop: '店铺与订单客服',
    shopDesc: '商品、订单、物流及包裹问题',
    member: '会员俱乐部客服',
    memberHelp: '会员账号、积分及技术支援',
    foot: '会员福利及促销活动以适用条款为准。',
    nmLine: '绑定 Shopee / TikTok 账号，领取 {cost} 分迎新礼，兑换 {gift}！',
    nmNote: '礼品随你下一笔符合条件的订单寄出。'
  },

  ms: {
    headline: 'Nikmati Lebih Banyak Ganjaran!',
    intro: 'Terima kasih kerana membeli-belah dengan kami! Terokai ganjaran ahli, tawaran eksklusif dan berita terkini.',
    memberDesc: 'Kumpul mata untuk pembelian yang layak, tebus ganjaran dan nikmati manfaat ahli.',
    memberCta: 'DAFTAR / LOG MASUK KELAB AHLI →',
    channelDesc: 'Ikuti saluran kami untuk cabutan hadiah, tawaran eksklusif dan berita kedai.',
    channelCta: 'IKUTI SALURAN WHATSAPP ',
    help: 'Perlukan bantuan? Pilih pasukan sokongan yang sesuai.',
    shop: 'Sokongan Kedai & Pesanan',
    shopDesc: 'Produk, pesanan, penghantaran dan bungkusan',
    member: 'Sokongan Kelab Ahli',
    memberHelp: 'Akaun, mata ganjaran dan bantuan teknikal',
    foot: 'Manfaat ahli dan promosi tertakluk pada terma yang berkenaan.',
    nmLine: 'Pautkan akaun Shopee / TikTok anda untuk {cost} mata alu-aluan dan tebus {gift}!',
    nmNote: 'Hadiah dihantar bersama pesanan layak anda yang seterusnya.'
  },

  ta: {
    headline: 'மேலும் பல வெகுமதிகளைப் பெறுங்கள்!',
    intro: 'எங்களிடம் பொருட்கள் வாங்கியதற்கு நன்றி! உறுப்பினர் சலுகைகள், வெகுமதிகள் மற்றும் புதிய அறிவிப்புகளை அறிந்துகொள்ளுங்கள்.',
    memberDesc: 'தகுதியான வாங்குதல்களுக்கு புள்ளிகளைச் சேகரித்து, வெகுமதிகளைப் பெற்று, உறுப்பினர் சலுகைகளை அனுபவியுங்கள்.',
    memberCta: 'உறுப்பினராகச் சேர / உள்நுழைய',
    channelDesc: 'பரிசுக் குலுக்கல்கள், சிறப்புச் சலுகைகள் மற்றும் கடை அறிவிப்புகளுக்கு எங்கள் சேனலைப் பின்தொடருங்கள்.',
    channelCta: 'WHATSAPP சேனலைப் பின்தொடருங்கள்',
    help: 'உதவி தேவையா? சரியான ஆதரவுக் குழுவைத் தேர்ந்தெடுக்கவும்.',
    shop: 'கடை மற்றும் ஆர்டர் உதவி',
    shopDesc: 'பொருட்கள், ஆர்டர்கள், டெலிவரி மற்றும் பார்சல்கள்',
    member: 'உறுப்பினர் மன்ற உதவி',
    memberHelp: 'கணக்குகள், புள்ளிகள் மற்றும் தொழில்நுட்ப உதவி',
    foot: 'உறுப்பினர் சலுகைகளும் விளம்பரங்களும் பொருந்தும் விதிமுறைகளுக்கு உட்பட்டவை.',
    nmLine: 'உங்கள் Shopee / TikTok கணக்கை இணைத்து {cost} வரவேற்பு புள்ளிகளைப் பெற்று, {gift}-ஐப் பெற்றுக்கொள்ளுங்கள்!',
    nmNote: 'பரிசு உங்கள் அடுத்த தகுதியான ஆர்டருடன் அனுப்பப்படும்.'
  }
};

// HTML element IDs
const ids = {
  headline: 'headline',
  intro: 'intro',
  memberDesc: 'member-desc',
  memberCta: 'member-cta',
  channelDesc: 'channel-desc',
  channelCta: 'channel-cta',
  help: 'help-heading',
  shop: 'shop-support',
  shopDesc: 'shop-desc',
  member: 'member-support',
  memberHelp: 'member-help-desc',
  foot: 'foot'
};

// 🎉 新会员奖励（New Member Special）：读会员系统的活动设定（公开资料），启用中才显示
const nm = { on: false, cost: 30, gift: 'Home Diffuser', i18n: {} };
let curLang = 'en';
function paintNm() {
  const box = document.getElementById('nm-special');
  if (!box) return;
  box.hidden = !nm.on;
  if (!nm.on) return;
  const t = strings[curLang] || strings.en;
  const gift = (nm.i18n[curLang] && nm.i18n[curLang].name) || nm.gift;
  document.getElementById('nm-line').textContent = (t.nmLine || strings.en.nmLine)
    .split('{cost}').join(nm.cost).split('{gift}').join(gift);
  document.getElementById('nm-note').textContent = t.nmNote || strings.en.nmNote;
}
fetch('https://firestore.googleapis.com/v1/projects/member-system-27ae0/databases/(default)/documents/settings/newMember')
  .then(r => (r.ok ? r.json() : null))
  .then(d => {
    const f = (d && d.fields) || {};
    nm.on = !!(f.active && f.active.booleanValue === true);
    if (f.cost && f.cost.integerValue) nm.cost = Number(f.cost.integerValue);
    const g = f.gift && f.gift.mapValue && f.gift.mapValue.fields;
    if (g && g.name && g.name.stringValue) nm.gift = g.name.stringValue;
    const gi = g && g.i18n && g.i18n.mapValue && g.i18n.mapValue.fields;
    if (gi) Object.keys(gi).forEach(l => {
      const v = gi[l].mapValue && gi[l].mapValue.fields;
      if (v && v.name && v.name.stringValue) nm.i18n[l] = { name: v.name.stringValue };
    });
    paintNm();
  })
  .catch(() => {});

// 📦 从包裹卡片扫进来：记下来源，加入会员时一起记录（会员系统读同一个网域的 localStorage）
try { localStorage.setItem('mochiiFromCard', String(Date.now())); } catch (e) {}

// Language switching
function setLanguage(lang) {
  const t = strings[lang] || strings.en;

  for (const [key, id] of Object.entries(ids)) {
    const element = document.getElementById(id);

    if (element && t[key] !== undefined) {
      element.textContent = t[key];
    }
  }

  curLang = lang;
  paintNm();

  // Update HTML language
  document.documentElement.lang =
    lang === 'zh' ? 'zh-CN' : lang;

  // Update active language button
  document.querySelectorAll('[data-lang]').forEach(button => {
    button.setAttribute(
      'aria-pressed',
      String(button.dataset.lang === lang)
    );
  });
}

// Language button events
document.querySelectorAll('[data-lang]').forEach(button => {
  button.addEventListener('click', () => {
    setLanguage(button.dataset.lang);
  });
});
