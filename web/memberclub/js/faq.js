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
    redeem: [
      ["怎么兑换奖品？", () => `到「兑换商城」选奖品，按「兑换」就好。<b>优惠券</b>审核通过后，券码会出现在「兑换记录」；<b>实体奖品</b>兑换时要选收货地址，审核通过后我们会寄出。`],
      ["兑换后积分什么时候扣？", () => `提交后积分先<b>暂扣</b>（显示在「兑换审核中」）。审核通过才正式扣除；没通过或你自己取消，暂扣的积分会退回。`],
      ["可以取消兑换吗？", () => `「审核中」的兑换可以在「兑换记录」自己取消。审核通过后如需取消，请联系我们。`],
      ["优惠券怎么用？", () => `在「兑换记录」复制券码，到 Shopee 或 TikTok 结账时输入。使用条件（最低消费、有效期等）请看奖品说明。`],
      ["实体奖品要运费吗？寄到哪里？", () => `<b>免运费</b>，由 The Mochii Shop 寄出。目前只寄马来西亚境内地址。`],
      ["实体奖品多久寄出？怎么查物流？", () => `审核通过后会尽快安排寄出。发货后，「兑换记录」会显示运输公司、追踪单号和「查询物流」链接，铃铛也会通知你。`],
      ["地址填错了怎么办？", () => `<b>发货前</b>可以在「兑换记录」那一笔按「修改」更改地址。已经发货的话，请马上联系我们。`],
      ["收到奖品后要做什么？", () => `在「兑换记录」按「确认收货」，可以选填照片和留言。如果没有确认，发货 14 天后会自动完成。`],
      ["「即将下架」是什么意思？", () => `奖品设定了下架时间，时间一到就不能再兑换。商城会显示剩余天数或小时。`],
    ],
    account: [
      ["怎么修改昵称？", () => `到「我的 › 个人资料」修改。昵称<b>每 30 天只能改一次</b>。`],
      ["手机号码、WhatsApp 通知可以改吗？", () => `可以，在「个人资料」随时修改。手机号码用来联系你领取奖品，请填可以用 WhatsApp 联系的号码。`],
      ["生日可以改吗？", () => `生日只能设定一次，用来发生日礼。如果填错，请联系我们更正。`],
      ["收货地址怎么管理？", () => `在「个人资料 › 收货地址」新增、修改或删除，最多存 5 个，第一个是默认地址。邮编填好后会自动选州属，城市照州属选择。`],
      ["怎么换语言？", () => `点右上角的国旗，可以选 English、Bahasa Melayu 或中文。`],
      ["想删除账号或个人资料？", () => `请联系我们，我们会按马来西亚个人资料保护法（PDPA）处理你的要求。`],
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
    redeem: [
      ["How do I redeem a reward?", () => `Go to the Rewards Mall, choose a reward and tap “Redeem”. For <b>coupons</b>, the code appears in “My Redemptions” once approved. For <b>physical rewards</b>, choose a shipping address — we'll send it after approval.`],
      ["When are my points deducted?", () => `Points are <b>held</b> when you submit (shown as “In review”). They're deducted once approved, and returned if the request isn't approved or you cancel it.`],
      ["Can I cancel a redemption?", () => `Redemptions still “In review” can be cancelled in “My Redemptions”. After approval, please contact us.`],
      ["How do I use a coupon?", () => `Copy the code in “My Redemptions” and enter it at Shopee or TikTok checkout. See the reward description for conditions such as minimum spend and validity.`],
      ["Is there a shipping fee? Where do you ship?", () => `<b>Free shipping</b> by The Mochii Shop. We currently ship to addresses in Malaysia only.`],
      ["When will my physical reward ship? How do I track it?", () => `We ship as soon as possible after approval. Once shipped, “My Redemptions” shows the courier, tracking number and a “Track parcel” link, and you'll get a 🔔 notification.`],
      ["I entered the wrong address?", () => `<b>Before it ships</b>, tap “Edit” on that redemption in “My Redemptions”. If it has already shipped, please contact us right away.`],
      ["What should I do after receiving it?", () => `Tap “Confirm receipt” in “My Redemptions” (photo and comment are optional). If you don't, it completes automatically 14 days after shipping.`],
      ["What does “Ending soon” mean?", () => `The reward has an end time. After that it can no longer be redeemed. The mall shows the days or hours left.`],
    ],
    account: [
      ["How do I change my name?", () => `In “Me › Profile”. Your name can be changed <b>once every 30 days</b>.`],
      ["Can I change my phone number or WhatsApp updates?", () => `Yes, any time in “Profile”. We use your number to contact you about rewards, so please use a number reachable on WhatsApp.`],
      ["Can I change my birthday?", () => `Your birthday can only be set once (it's used for your birthday gift). Contact us if it needs correcting.`],
      ["How do I manage shipping addresses?", () => `In “Profile › Shipping addresses” — add, edit or delete up to 5. The first one is your default. The state is picked from your postcode, then choose the city.`],
      ["How do I change the language?", () => `Tap the flag at the top right to choose English, Bahasa Melayu or 中文.`],
      ["I want my account or data deleted?", () => `Please contact us and we'll handle your request under Malaysia's Personal Data Protection Act (PDPA).`],
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
    redeem: [
      ["Bagaimana menebus ganjaran?", () => `Pergi ke Pusat Ganjaran, pilih ganjaran dan ketik “Tebus”. Bagi <b>kupon</b>, kod dipaparkan dalam “Penebusan Saya” selepas diluluskan. Bagi <b>ganjaran fizikal</b>, pilih alamat penghantaran — kami akan menghantarnya selepas diluluskan.`],
      ["Bilakah mata ditolak?", () => `Mata <b>ditahan</b> semasa anda menghantar permohonan (dipaparkan sebagai “Dalam semakan”). Ia ditolak selepas diluluskan, dan dikembalikan jika tidak diluluskan atau anda membatalkannya.`],
      ["Bolehkah saya membatalkan penebusan?", () => `Penebusan yang masih “Dalam semakan” boleh dibatalkan di “Penebusan Saya”. Selepas diluluskan, sila hubungi kami.`],
      ["Bagaimana menggunakan kupon?", () => `Salin kod di “Penebusan Saya” dan masukkan semasa pembayaran di Shopee atau TikTok. Lihat keterangan ganjaran untuk syarat seperti perbelanjaan minimum dan tempoh sah.`],
      ["Ada caj penghantaran? Hantar ke mana?", () => `<b>Penghantaran percuma</b> oleh The Mochii Shop. Buat masa ini kami hanya menghantar ke alamat di Malaysia.`],
      ["Bilakah ganjaran fizikal dihantar? Bagaimana menjejaknya?", () => `Kami menghantar secepat mungkin selepas diluluskan. Selepas dihantar, “Penebusan Saya” memaparkan syarikat kurier, nombor penjejakan dan pautan “Jejak bungkusan”, dan anda akan menerima 🔔 pemberitahuan.`],
      ["Saya tersalah alamat?", () => `<b>Sebelum dihantar</b>, ketik “Ubah” pada penebusan itu di “Penebusan Saya”. Jika sudah dihantar, sila hubungi kami segera.`],
      ["Apa perlu dibuat selepas menerimanya?", () => `Ketik “Sahkan penerimaan” di “Penebusan Saya” (foto dan komen adalah pilihan). Jika tidak, ia selesai secara automatik 14 hari selepas dihantar.`],
      ["Apa maksud “Hampir tamat”?", () => `Ganjaran itu ada masa tamat. Selepas itu ia tidak boleh ditebus lagi. Pusat Ganjaran memaparkan baki hari atau jam.`],
    ],
    account: [
      ["Bagaimana menukar nama?", () => `Di “Saya › Profil”. Nama boleh ditukar <b>sekali setiap 30 hari</b>.`],
      ["Boleh tukar nombor telefon atau makluman WhatsApp?", () => `Boleh, bila-bila masa di “Profil”. Nombor anda digunakan untuk menghubungi anda berkenaan ganjaran, jadi gunakan nombor yang ada WhatsApp.`],
      ["Boleh tukar tarikh lahir?", () => `Tarikh lahir hanya boleh ditetapkan sekali (untuk hadiah hari jadi). Hubungi kami jika perlu dibetulkan.`],
      ["Bagaimana mengurus alamat penghantaran?", () => `Di “Profil › Alamat penghantaran” — tambah, ubah atau padam sehingga 5 alamat. Alamat pertama ialah alamat utama. Negeri dipilih mengikut poskod, kemudian pilih bandar.`],
      ["Bagaimana menukar bahasa?", () => `Ketik bendera di penjuru kanan atas untuk memilih English, Bahasa Melayu atau 中文.`],
      ["Saya mahu akaun atau data saya dipadam?", () => `Sila hubungi kami dan kami akan mengendalikan permintaan anda mengikut Akta Perlindungan Data Peribadi Malaysia (PDPA).`],
    ],
  },
};

// 帮助中心：会员俱乐部的分类（顺序 = 显示顺序）
export const CLUB_SECTIONS = ["points", "tier", "redeem", "bind", "account"];
export function clubFaq() {
  const L = TEXT[lang] || TEXT.en;
  const hasCustom = customPerks().length > 0;
  return CLUB_SECTIONS.map(sec => ({
    sec,
    items: (L[sec] || []).filter(([, , only]) => only !== "custom" || hasCustom).map(([q, a]) => ({ q, a: a(L) })),
  }));
}

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
