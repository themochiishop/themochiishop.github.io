// 常见问题（三语）。数字（等级门槛、福利分数、有效期）会自动带入目前的设定
import {
  TIERS, tierLabel, activeBonuses, bonusPoints, customPerks, EXPIRY_MONTHS, esc, t, lang
} from "./common.js";

const PENDING_DAYS = 14; // 待确认天数（和 Google 表格同步脚本的 MS_PENDING_DAYS 一致）

// ---------- 带入目前设定的清单 ----------
function tierList(L) {
  return "<ul>" + TIERS.map(x => {
    const name = (x.icon ? x.icon + " " : "") + tierLabel(x);
    const spend = x.minSpend ? L.tierSpend(x.minSpend) : L.tierFree;
    return `<li><b>${esc(name)}</b>${L.colon}${spend} · ${L.tierPerk(x.multiplier, x.birthday)}</li>`;
  }).join("") + "</ul>";
}
function perkList(L) {
  const list = activeBonuses();
  if (!list.length) return L.noPerks;
  return "<ul>" + list.map(b => `<li>${esc(t("task." + b.key))} · <b>${esc(t("notif.plus", { n: bonusPoints(b.key) }))}</b></li>`).join("") + "</ul>";
}

const TEXT = {
  // ======================= 中文 =======================
  zh: {
    colon: "：",
    tierSpend: n => `近一年消费满 RM${n}`,
    tierFree: "注册即享",
    tierPerk: (m, b) => `积分 ×${m} · 生日礼 ${b} 分`,
    noPerks: "目前没有开放中的额外福利。",
    tier: [
      ["会员等级怎么计算？", L => `按<b>最近 365 天的有效消费</b>计算，所有绑定账号的消费会合并，取消和退货的订单不算。等级每小时自动更新一次。${tierList(L)}`],
      ["等级会下降吗？", () => `会。超过 365 天的消费不再计入，如果近一年消费低于目前等级的门槛，等级会跟着调整。`],
      ["升级后，积分加成从什么时候开始？", () => `升级后的<b>新订单</b>才按新等级的加成计算，已经计过分的订单不会重算。绑定账号时补算的过往订单，按绑定当时的等级计算。`],
      ["生日礼怎么领？", () => `生日月份内系统自动发放，<b>每年一次</b>，积分马上可用，分数按领取时的等级。领取条件：已设定生日、已绑定购物账号，并至少有一笔有效订单。生日只能设定一次，如需更正请联系我们。`],
      ["额外福利是什么？", L => `完成指定任务就送积分。每项每人只能领一次，都需要先绑定购物账号，领到后积分马上可用，铃铛也会通知你：${perkList(L)}`],
      ["「由客服发放」的福利怎么领？", () => `这类福利（例如直播活动）由我们在活动结束后手动发放，会出现在积分明细里，原因写着「奖励：…」。如有疑问请联系我们。`, "custom"],
    ],
    points: [
      ["购物怎么得积分？", () => `每 RM1 得 1 分，再乘以你的等级加成，小数舍去。例如 ×1.2 加成时买 RM65，可得 78 分。`],
      ["为什么积分是「待确认」？", () => `订单日期起 ${PENDING_DAYS} 天内是待确认期，期间如取消或退货，积分会自动取消。${PENDING_DAYS} 天后自动转为可用，铃铛会通知你。`],
      ["下单后多久会看到积分？", () => `订单由我们人工录入系统，一般在 1–2 天内出现，有时会更久。积分和订单记录会同时更新。`],
      ["绑定前的订单算积分吗？", () => `算。绑定账号后，系统里已有的过往订单都会补算积分；订单日期已超过 ${PENDING_DAYS} 天的，补算后马上可用。`],
      ["有多个账号怎么算？", () => `同一位会员可以绑定多个 Shopee / TikTok 账号，没有数量限制。所有账号的积分合并成一个余额，等级消费也合并计算。每个账号只能被一位会员绑定。`],
      ["什么情况会扣积分？", () => `<ul><li><b>订单取消或退货</b>：该订单的积分扣回，即使已经转为可用。</li><li><b>订单金额更正</b>：按正确金额重新计算，多退少补。</li><li><b>解除绑定</b>：该账号订单的积分扣回（记录显示「订单转出」）；重新绑定后会再加回来。</li><li><b>兑换奖品</b>、<b>积分过期</b>（见下面）。</li></ul>`],
      ["兑换时积分怎么扣？", () => `提交兑换后，所需积分先<b>暂扣</b>（显示在「兑换审核中」），不能再用来兑换别的。审核通过后正式扣除；如未通过或你自己取消，暂扣的积分会退回。`],
      ["积分会过期吗？", () => `会。积分转为可用后 <b>${EXPIRY_MONTHS} 个月</b>过期；为过往订单补发的积分，从补发当天起算。使用时先扣最早的积分。过期前约一个月，铃铛会提醒你。已过期的积分无法恢复。`],
      ["为什么同一张订单有好几笔记录？", () => `订单金额更正、退货、解除后再重新绑定时，同一张订单会有多笔加减。积分记录会合并成一行显示净值，点开就能看到每一笔。`],
      ["额外福利和生日礼的积分什么时候能用？", () => `马上可用，不用等待确认期。各项福利的条件请见「会员 › 会员等级 › 额外福利」。`],
    ],
    bind: [
      ["为什么要填单号？", () => `用来确认这个账号是你的，防止别人用你的用户名领积分。`],
      ["刚下单，绑定失败？", () => `新订单需要 1–2 天才会录入系统，请用较早的订单，或稍后再试。`],
      ["可以绑定几个账号？", () => `没有限制。Shopee 和 TikTok 都可以，同一个平台多个账号也可以，所有账号的积分和消费都会合并计算。Shopee 和 TikTok 都绑定，还能领额外福利。`],
      ["显示账号已经被绑定？", () => `每个用户名只能绑定一位会员。如果不是你绑定的，请联系我们处理。`],
      ["绑定后多久有积分？", () => `系统每小时计算一次，绑定后最多一小时，过往订单的积分就会出现。`],
      ["可以解除绑定吗？", () => `请联系我们。解除后，该账号订单的积分会扣回，绑定记录会保留在「已解除的账号」里。`],
      ["改了平台用户名怎么办？", () => `系统是用用户名配对订单的。改名后的新订单可能配对不到，请用新用户名再绑定一次，或联系我们帮你处理。`],
    ],
  },

  // ======================= English =======================
  en: {
    colon: ": ",
    tierSpend: n => `spend RM${n} in the last 12 months`,
    tierFree: "on sign-up",
    tierPerk: (m, b) => `points ×${m} · birthday gift ${b} pts`,
    noPerks: "There are no extra perks open right now.",
    tier: [
      ["How is my tier calculated?", L => `By your <b>valid spending in the last 365 days</b>, combined across all your linked accounts. Cancelled and returned orders don't count. Tiers update every hour.${tierList(L)}`],
      ["Can my tier go down?", () => `Yes. Spending older than 365 days no longer counts, so if your last-12-month spending drops below your tier's level, your tier is adjusted.`],
      ["When does my points bonus start after upgrading?", () => `Your new tier's bonus applies to <b>new orders</b> after the upgrade. Orders that already earned points aren't recalculated. Past orders added when you link an account use your tier at that time.`],
      ["How do I get my birthday gift?", () => `It's given automatically in your birthday month, <b>once a year</b>, and can be used straight away. The amount depends on your tier at that time. To qualify, set your birthday, link a shopping account and have at least one valid order. Your birthday can only be set once — contact us if it needs correcting.`],
      ["What are extra perks?", L => `Bonus points for completing simple tasks. Each one can be received once per member, needs a linked shopping account, and can be used right away — you'll also get a 🔔 notification:${perkList(L)}`],
      ["How do I get perks “given by our team”?", () => `These perks (e.g. live-stream activities) are added by our team after the event. They appear in your points history as “Bonus: …”. Contact us if you have questions.`, "custom"],
    ],
    points: [
      ["How do I earn points from purchases?", () => `1 point for every RM1, multiplied by your tier bonus, rounded down. For example, RM65 with a ×1.2 bonus earns 78 points.`],
      ["Why are my points “pending”?", () => `Points are pending for ${PENDING_DAYS} days from the order date. If the order is cancelled or returned in that time, the points are cancelled automatically. After ${PENDING_DAYS} days they become available and you'll get a 🔔 notification.`],
      ["How long until I see my points?", () => `We record orders manually, so they usually appear within 1–2 days, sometimes longer. Your points and orders update together.`],
      ["Do orders before I linked my account count?", () => `Yes. Once you link an account, past orders in our system are counted too. Orders more than ${PENDING_DAYS} days old are available straight away.`],
      ["I have several accounts — how does it work?", () => `You can link as many Shopee / TikTok accounts as you like. Points from all of them go into one balance, and their spending counts together for your tier. Each account can only be linked to one member.`],
      ["When are points deducted?", () => `<ul><li><b>Cancelled or returned orders</b>: points for that order are removed, even if they were already available.</li><li><b>Order amount corrections</b>: points are recalculated on the correct amount.</li><li><b>Unlinking an account</b>: points from its orders are removed (shown as “Order unlinked”); they come back if you link it again.</li><li><b>Redeeming rewards</b> and <b>expired points</b> (see below).</li></ul>`],
      ["How are points deducted when I redeem?", () => `When you redeem, the points are <b>held</b> (shown as “In review”) and can't be used for anything else. They're deducted once approved, and returned if the request isn't approved or you cancel it.`],
      ["Do points expire?", () => `Yes. Points expire <b>${EXPIRY_MONTHS} months</b> after they become available (points added later for past orders count from the day they're added). Oldest points are used first. We'll remind you in 🔔 notifications about a month before. Expired points can't be restored.`],
      ["Why does one order have several records?", () => `When an order is corrected, returned, or its account is unlinked and linked again, the same order gets several entries. Your points history shows them as one line with the net total — tap it to see each entry.`],
      ["When can I use extra perk and birthday points?", () => `Straight away — there's no pending period. See “Member › Member Tier › Extra perks” for how to get each perk.`],
    ],
    bind: [
      ["Why do I need an order number?", () => `It confirms the account is really yours, so no one else can claim points with your username.`],
      ["Just ordered and linking failed?", () => `New orders take 1–2 days to enter our system. Try an older order, or try again later.`],
      ["How many accounts can I link?", () => `As many as you like — Shopee, TikTok, and more than one account on the same platform. Points and spending from all of them are combined. Linking both Shopee and TikTok also earns an extra perk.`],
      ["It says the account is already linked?", () => `Each username can only be linked to one member. If it wasn't you, please contact us.`],
      ["How soon do I get points after linking?", () => `Points are calculated every hour, so points for your past orders appear within an hour of linking.`],
      ["Can I unlink an account?", () => `Please contact us. Once unlinked, points from that account's orders are removed, and the record stays under “Removed links”.`],
      ["I changed my platform username?", () => `We match orders by username, so new orders under a new username may not match. Link the new username too, or contact us for help.`],
    ],
  },

  // ======================= Bahasa Melayu =======================
  ms: {
    colon: ": ",
    tierSpend: n => `belanja RM${n} dalam 12 bulan lepas`,
    tierFree: "sebaik mendaftar",
    tierPerk: (m, b) => `mata ×${m} · hadiah hari jadi ${b} mata`,
    noPerks: "Tiada ganjaran tambahan dibuka buat masa ini.",
    tier: [
      ["Bagaimana tahap ahli dikira?", L => `Berdasarkan <b>perbelanjaan sah dalam 365 hari lepas</b>, digabungkan bagi semua akaun yang dipautkan. Pesanan yang dibatalkan dan dipulangkan tidak dikira. Tahap dikemas kini setiap jam.${tierList(L)}`],
      ["Bolehkah tahap saya turun?", () => `Ya. Perbelanjaan lebih daripada 365 hari tidak lagi dikira, jadi jika perbelanjaan 12 bulan lepas jatuh di bawah paras tahap anda, tahap akan diselaraskan.`],
      ["Bilakah bonus mata bermula selepas naik tahap?", () => `Bonus tahap baharu terpakai pada <b>pesanan baharu</b> selepas naik tahap. Pesanan yang sudah dapat mata tidak dikira semula. Pesanan lama yang ditambah semasa memautkan akaun menggunakan tahap anda pada masa itu.`],
      ["Bagaimana mendapatkan hadiah hari jadi?", () => `Diberi secara automatik dalam bulan hari jadi anda, <b>sekali setahun</b>, dan boleh terus digunakan. Jumlahnya ikut tahap anda pada masa itu. Syarat: tetapkan hari jadi, pautkan akaun beli-belah dan ada sekurang-kurangnya satu pesanan sah. Hari jadi hanya boleh ditetapkan sekali — hubungi kami jika perlu dibetulkan.`],
      ["Apakah ganjaran tambahan?", L => `Mata bonus untuk tugasan mudah. Setiap satu hanya boleh diterima sekali bagi setiap ahli, memerlukan akaun beli-belah yang dipautkan, dan boleh terus digunakan — anda juga akan menerima 🔔 pemberitahuan:${perkList(L)}`],
      ["Bagaimana mendapatkan ganjaran “diberi oleh pasukan kami”?", () => `Ganjaran ini (cth. aktiviti siaran langsung) ditambah oleh pasukan kami selepas acara. Ia dipaparkan dalam sejarah mata sebagai “Bonus: …”. Hubungi kami jika ada pertanyaan.`, "custom"],
    ],
    points: [
      ["Bagaimana mengumpul mata daripada pembelian?", () => `1 mata bagi setiap RM1, didarab dengan bonus tahap anda, dibundarkan ke bawah. Contohnya RM65 dengan bonus ×1.2 memberi 78 mata.`],
      ["Kenapa mata saya “belum disahkan”?", () => `Mata belum disahkan selama ${PENDING_DAYS} hari dari tarikh pesanan. Jika pesanan dibatalkan atau dipulangkan dalam tempoh itu, mata dibatalkan secara automatik. Selepas ${PENDING_DAYS} hari ia menjadi tersedia dan anda akan menerima 🔔 pemberitahuan.`],
      ["Berapa lama sebelum mata dipaparkan?", () => `Pesanan direkodkan secara manual, jadi biasanya dipaparkan dalam 1–2 hari, kadang-kadang lebih lama. Mata dan pesanan dikemas kini serentak.`],
      ["Adakah pesanan sebelum saya memautkan akaun dikira?", () => `Ya. Selepas memautkan akaun, pesanan lama dalam sistem kami turut dikira. Pesanan yang lebih daripada ${PENDING_DAYS} hari terus tersedia.`],
      ["Saya ada beberapa akaun — bagaimana?", () => `Anda boleh memautkan seberapa banyak akaun Shopee / TikTok. Mata daripada semua akaun masuk ke satu baki, dan perbelanjaannya digabungkan untuk tahap anda. Setiap akaun hanya boleh dipautkan kepada seorang ahli.`],
      ["Bilakah mata ditolak?", () => `<ul><li><b>Pesanan dibatalkan atau dipulangkan</b>: mata pesanan itu ditolak, walaupun sudah tersedia.</li><li><b>Pembetulan jumlah pesanan</b>: mata dikira semula ikut jumlah yang betul.</li><li><b>Menyahpautkan akaun</b>: mata daripada pesanannya ditolak (dipaparkan sebagai “Pesanan dinyahpaut”); ia dikembalikan jika dipautkan semula.</li><li><b>Menebus ganjaran</b> dan <b>mata luput</b> (lihat di bawah).</li></ul>`],
      ["Bagaimana mata ditolak semasa penebusan?", () => `Apabila anda menebus, mata <b>ditahan</b> (dipaparkan sebagai “Dalam semakan”) dan tidak boleh digunakan untuk perkara lain. Ia ditolak selepas diluluskan, dan dikembalikan jika tidak diluluskan atau anda membatalkannya.`],
      ["Adakah mata luput?", () => `Ya. Mata luput <b>${EXPIRY_MONTHS} bulan</b> selepas menjadi tersedia (mata yang ditambah kemudian untuk pesanan lama dikira dari hari ia ditambah). Mata paling lama digunakan dahulu. Kami akan mengingatkan anda dalam 🔔 pemberitahuan kira-kira sebulan sebelum itu. Mata yang luput tidak boleh dipulihkan.`],
      ["Kenapa satu pesanan ada beberapa rekod?", () => `Apabila pesanan dibetulkan, dipulangkan, atau akaunnya dinyahpaut dan dipautkan semula, pesanan yang sama akan ada beberapa rekod. Sejarah mata memaparkannya sebagai satu baris dengan jumlah bersih — ketik untuk melihat setiap rekod.`],
      ["Bilakah mata ganjaran tambahan dan hari jadi boleh digunakan?", () => `Serta-merta — tiada tempoh belum disahkan. Lihat “Ahli › Tahap Ahli › Ganjaran tambahan” untuk syarat setiap ganjaran.`],
    ],
    bind: [
      ["Kenapa perlu nombor pesanan?", () => `Ia mengesahkan akaun itu benar-benar milik anda, supaya orang lain tidak boleh menuntut mata dengan nama pengguna anda.`],
      ["Baru membuat pesanan dan gagal memautkan?", () => `Pesanan baharu mengambil masa 1–2 hari untuk masuk ke sistem kami. Cuba pesanan yang lebih lama, atau cuba lagi kemudian.`],
      ["Berapa banyak akaun boleh dipautkan?", () => `Tiada had — Shopee, TikTok, dan lebih daripada satu akaun pada platform yang sama. Mata dan perbelanjaan daripada semua akaun digabungkan. Memautkan kedua-dua Shopee dan TikTok juga memberi ganjaran tambahan.`],
      ["Dikatakan akaun sudah dipautkan?", () => `Setiap nama pengguna hanya boleh dipautkan kepada seorang ahli. Jika bukan anda, sila hubungi kami.`],
      ["Berapa cepat saya dapat mata selepas memautkan?", () => `Mata dikira setiap jam, jadi mata untuk pesanan lama dipaparkan dalam masa sejam selepas memautkan.`],
      ["Bolehkah saya menyahpautkan akaun?", () => `Sila hubungi kami. Selepas dinyahpaut, mata daripada pesanan akaun itu ditolak, dan rekodnya kekal di bawah “Pautan yang telah dibuang”.`],
      ["Saya menukar nama pengguna platform?", () => `Kami memadankan pesanan ikut nama pengguna, jadi pesanan baharu dengan nama pengguna baharu mungkin tidak sepadan. Pautkan nama pengguna baharu juga, atau hubungi kami untuk bantuan.`],
    ],
  },
};

// 把某一区的常见问题放进 el（<details> 折叠式）
export function renderFaq(el, section) {
  if (!el) return;
  const L = TEXT[lang] || TEXT.en;
  const hasCustom = customPerks().length > 0;
  const items = (L[section] || []).filter(([, , only]) => only !== "custom" || hasCustom);
  el.innerHTML = `
    <h2>❓ ${esc(t("faq.title"))}</h2>
    <div class="faq-list">
      ${items.map(([q, a]) => `
        <details class="faq-item">
          <summary>${esc(q)}</summary>
          <div class="faq-a">${a(L)}</div>
        </details>`).join("")}
    </div>`;
  el.classList.remove("hidden");
}
