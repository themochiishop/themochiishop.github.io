// 常见问题（三语）。数字（等级门槛、福利分数、有效期）会自动带入目前的设定
import {
  TIERS, tierLabel, tierIconHTML, BLACK_CROWN, activeBonuses, bonusPoints, bonusActive, customPerks, EXPIRY_MONTHS, esc, t, lang
} from "./common.js";

const PENDING_DAYS = 14; // 待确认天数（和 Google 表格同步脚本的 MS_PENDING_DAYS 一致）

// ---------- 帮助中心传进来的目前设定（clubFaq(ctx)） ----------
// nm：新会员迎新礼 { cost, days, gift }（null = 这位会员看不到这一区）
// ci：每日签到 { active, points[7], starPts, sharePts, hasGift, giftDays }
// feed：Feed 权限 { replyRank, postRank, autoRank }
let CTX = { nm: null, ci: null, feed: {} };
const NM = () => CTX.nm || { cost: 30, days: 20, gift: "Home Diffuser" };
const CI = () => CTX.ci || { points: [1, 1, 2, 2, 3, 3, 8], starPts: 30, sharePts: 10, giftDays: 30 };
const ciDays = () => CI().points.join(" · ");
const ciSum = () => CI().points.reduce((a, n) => a + n, 0);
const RANK_IDS = ["mochii", "silver", "gold", "diamond", "black"];
const rankName = r => esc(tierLabel(TIERS.find(x => x.id === RANK_IDS[r]) || TIERS[0]));
const FD = () => ({ reply: CTX.feed.replyRank ?? 0, post: CTX.feed.postRank ?? 1, auto: CTX.feed.autoRank ?? 2 });
const avatarPts = () => (bonusActive("avatar") ? bonusPoints("avatar") : 0);
const welcomePts = () => bonusPoints("welcome");
// 有条件才显示的题目（题目第 3 格）
const SHOW = {
  custom: () => customPerks().length > 0,
  ciGift: () => !!CI().hasGift,
  avatar: () => avatarPts() > 0,
};
const visible = ([, , only]) => !only || !SHOW[only] || SHOW[only]();

// ---------- 带入目前设定的清单 ----------
function tierList(L) {
  return "<ul>" + TIERS.map(x => {
    const ico = x.id === "mochii" ? "" : tierIconHTML(x) + " ";
    const spend = x.invite ? L.tierInvite : x.minSpend ? L.tierSpend(x.minSpend) : L.tierFree;
    return `<li><b>${ico}${esc(tierLabel(x))}</b>${L.colon}${spend} · ${L.tierPerk(x.multiplier, x.birthday)}</li>`;
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
    tierInvite: "邀请制",
    tierPerk: (m, b) => `积分 ×${m} · 生日礼 ${b} 分`,
    noPerks: "目前没有开放中的额外福利。",
    tier: [
      ["会员等级怎么计算？", L => `按<b>最近 365 天的有效消费</b>计算，所有关联平台账号的消费会合并，取消和退货的订单不算。订单或绑定有变动后，等级约 30 分钟内自动更新。${tierList(L)}`],
      ["等级会下降吗？", () => `升级后，新等级<b>有效 12 个月</b>，期间不会降级。到期时看近一年的消费：达到该等级门槛的<b>一半</b>，就自动再续 12 个月；不到一半，<b>只会降一级</b>（例如金卡变银卡），不会一下子掉回 Mochii 会员。到期前 30 天，铃铛会提醒你还差多少可以保级。你达到过的最高等级会一直显示在等级页。`],
      ["Black Elite 是什么？", () => `${BLACK_CROWN} Black Elite 是 Mochii Member Club 最高的身份，采<b>邀请制</b>，由我们邀请长期支持的会员加入，没有有效期。享有积分 ×2、生日礼 888 分，以及专属的会员封面。`],
      ["升级后，积分加成从什么时候开始？", () => `升级后的<b>新订单</b>才按新等级的加成计算，已经计过分的订单不会重算。关联平台时补算的过往订单，按绑定当时的等级计算。`],
      ["生日礼怎么领？", () => `生日月份内系统自动发放，<b>每年一次</b>，积分马上可用，分数按领取时的等级。领取条件：已设定生日、已绑定购物账号，并至少有一笔有效订单。生日只能设定一次，如需更正请联系我们。`],
      ["额外福利是什么？", L => `完成指定任务就送积分。每项每人只能领一次，都需要先绑定购物账号，领到后积分马上可用，铃铛也会通知你：${perkList(L)}`],
      ["「由客服发放」的福利怎么领？", () => `这类福利（例如直播活动）由我们在活动结束后手动发放，会出现在积分明细里，原因写着「奖励：…」。如有疑问请联系我们。`, "custom"],
    ],
    points: [
      ["购物怎么得积分？", () => `每 RM1 得 1 分，再乘以你的等级加成，小数舍去。例如 ×1.2 加成时买 RM65，可得 78 分。`],
      ["为什么积分是「待确认」？", () => `订单日期起 ${PENDING_DAYS} 天内是待确认期，期间如取消或退货，积分会自动取消。${PENDING_DAYS} 天后自动转为可用，铃铛会通知你。`],
      ["下单后多久会看到积分？", () => `订单由我们人工录入系统，一般在 1 天内出现；遇到网络或系统问题等情况，有时会稍微延迟。录入后积分和订单记录会同时更新。<br>新积分会先显示为「待确认」，订单时间满 ${PENDING_DAYS} 天后会转为可用积分，即可用于兑换奖品；若订单提早确认完成，积分也会提早转为可用。`],
      ["绑定前的订单算积分吗？", () => `算。关联平台后，系统里已有的过往订单都会补算积分；订单日期已超过 ${PENDING_DAYS} 天的，补算后马上可用。`],
      ["为什么我以前的订单没有显示？", () => `会员系统的订单记录从 <b>2026 年 9 月</b>开始建立，9 月之前的订单没有存档，所以无法显示，也不能计算积分或会员等级。从 9 月起的订单都会正常记录。如有疑问，请联系我们。`],
      ["有多个账号怎么算？", () => `同一位会员可以绑定多个 Shopee / TikTok 账号，没有数量限制。所有账号的积分合并成一个余额，等级消费也合并计算。每个账号只能被一位会员绑定。`],
      ["什么情况会扣积分？", () => `<ul><li><b>订单取消或退货</b>：该订单的积分扣回，即使已经转为可用。</li><li><b>订单金额更正</b>：按正确金额重新计算，多退少补。</li><li><b>解除绑定</b>：该账号订单的积分扣回（记录显示「订单转出」）；重新绑定后会再加回来。</li><li><b>兑换奖品</b>、<b>积分过期</b>（见下面）。</li></ul>`],
      ["兑换时积分怎么扣？", () => `提交兑换后，所需积分先<b>暂扣</b>（显示在「兑换审核中」），不能再用来兑换别的。审核通过后正式扣除；如未通过或你自己取消，暂扣的积分会退回。`],
      ["积分会过期吗？", () => `会。积分转为可用后 <b>${EXPIRY_MONTHS} 个月</b>过期；为过往订单补发的积分，从补发当天起算。使用时先扣最早的积分。过期前约一个月，铃铛会提醒你。已过期的积分无法恢复。`],
      ["为什么同一张订单有好几笔记录？", () => `订单金额更正、退货、解除后再重新绑定时，同一张订单会有多笔加减。积分记录会合并成一行显示净值，点开就能看到每一笔。`],
      ["额外福利和生日礼的积分什么时候能用？", () => `马上可用，不用等待确认期。各项福利的条件请见「会员 › 会员等级 › 额外福利」。`],
      ["为什么我突然多了积分或优惠券？", () => `店家有时会直接送积分或优惠券给会员（例如活动奖励）。积分会出现在「积分明细」并写明原因，优惠券会出现在「兑换记录」。如有疑问请联系我们。`],
    ],
    bind: [
      ["为什么要填单号？", () => `用来确认这个账号是你的，防止别人用你的用户名领积分。`],
      ["刚下单，绑定失败？", () => `新订单一般需要 1 天才会录入系统，请用较早的订单，或稍后再试。`],
      ["用旧订单绑定失败？", () => `绑定需要用 <b>2026 年 9 月起</b>的订单号码，9 月之前的订单没有存档，无法用来验证。`],
      ["可以绑定几个账号？", () => `没有限制。Shopee 和 TikTok 都可以，同一个平台多个账号也可以，所有账号的积分和消费都会合并计算。Shopee 和 TikTok 都绑定，还能领额外福利。`],
      ["显示账号已经被绑定？", () => `每个用户名只能绑定一位会员。如果不是你绑定的，请联系我们处理。`],
      ["绑定后多久有积分？", () => `绑定后约 30 分钟内，过往订单的积分就会出现。`],
      ["可以解除绑定吗？", () => `请联系我们。解除后，该账号订单的积分会扣回，绑定记录会保留在「已解除的账号」里。`],
      ["改了平台用户名怎么办？", () => `系统是用用户名配对订单的。改名后的新订单可能配对不到，请用新用户名再绑定一次，或联系我们帮你处理。`],
    ],
    redeem: [
      ["怎么兑换奖品？", () => `到「兑换商城」选奖品，按「兑换」就好。<b>优惠券</b>审核通过后，券码会出现在「兑换记录」。<b>实体奖品</b>默认和你的下一张订单一起寄出；体积较大的奖品会<b>单独寄出</b>，需要收货地址，所以请先在「我的 › 个人资料 › 收货地址」填好地址，需要时「兑换记录」也会请你填写。`],
      ["兑换后积分什么时候扣？", () => `提交后积分先<b>暂扣</b>（显示在「兑换审核中」）。审核通过才正式扣除；没通过或你自己取消，暂扣的积分会退回。`],
      ["可以取消兑换吗？", () => `「审核中」的兑换可以在「兑换记录」自己取消。审核通过后如需取消，请联系我们。`],
      ["优惠券怎么用？", () => `在「兑换记录」复制券码，到 Shopee 或 TikTok 结账时输入。使用条件（最低消费、有效期等）请看奖品说明。`],
      ["实体奖品要运费吗？寄到哪里？", () => `<b>免运费</b>，由 The Mochii Shop 寄出。目前只寄马来西亚境内地址。`],
      ["实体奖品多久寄出？怎么查物流？", () => `随单寄出的奖品，会在你下一张订单发货时一起寄出。单独寄出的奖品，审核通过后会尽快寄出；发货后，「兑换记录」会显示运输公司、追踪单号和「查询物流」链接，铃铛也会通知你。`],
      ["地址填错了怎么办？", () => `随单寄出的奖品跟着你的订单包裹走，不用另外填地址。单独寄出的奖品在<b>发货前</b>，可以在「兑换记录」那一笔按「修改」更改地址；已经发货的话，请马上联系我们。`],
      ["收到奖品后要做什么？", () => `在「兑换记录」按「确认收货」，可以选填照片和留言。如果没有确认，发货 14 天后会自动完成。`],
      ["「即将下架」是什么意思？", () => `奖品设定了下架时间，时间一到就不能再兑换。商城会显示剩余天数或小时。`],
      ["「已下架」是什么意思？", () => `这个奖品已经停止兑换，按钮会变灰色，30 天后就不再显示在商城里。`],
      ["「即将开放」或倒数是什么意思？", () => `奖品还没开放，会显示灰色，暂时不能兑换。有的会显示开放日期，有的在最后 24 小时倒数，时间一到就自动开放。`],
      ["有好几种款式的奖品怎么选？", () => `左右滑动奖品图片，可以看到每一款（显示 1/5 这样的页数）和该款的库存。按「兑换」后，再选你要的款式。`],
      ["库存和「已售完」是怎么算的？", () => `商城的库存是<b>实时更新</b>的，别人兑换后，你的画面也会马上更新。你提交兑换时，系统就会为你保留一件，不会被别人抢走；如果兑换被拒绝或取消，库存会放回去。售完的奖品补货后，会重新变成可以兑换。`],
      ["为什么优惠券有兑换次数上限？", () => `有些优惠券每人限兑几次，商城会显示「限兑 N 次 · 已兑 N 次」。兑满之后，等我们补上新的券码就可以再兑换。`],
      ["券码下面的提示是什么？", () => `告诉你这张券适用哪个平台、怎么输入。结账前看一下，比较不会用错。`],
    ],
    prize: [
      ["怎么知道我有没有中奖？", () => `每月抽奖结束后，得奖名单会放在网站的 <a href="/monthly-draw/" target="_blank" rel="noopener">Monthly Draw</a> 页面。我们把奖品放进你的俱乐部后，「中奖记录」和首页会出现，铃铛也会通知你。`],
      ["中奖后要怎么领奖？", () => `<ol><li>在「我的 → 个人资料 → 关联平台」绑定你中奖的那张订单。</li><li>等待管理员确认并绑定中奖订单。</li><li>奖品出现在「中奖记录」后，按「领取奖品」。奖品会在你下次下单时一起寄出；体积较大的奖品会单独寄，领取时要填收货地址。</li></ol>`],
      ["领奖有期限吗？", () => `有。奖品放进来后 <b>30 天</b>内要按「领取奖品」，期限显示在每个奖品下面，到期前 7 天铃铛会提醒你。过期会自动作废；来不及的话，请在期限前联系客服。`],
      ["奖品怎么寄？「随单发送」是什么？", () => `奖品<b>默认随单发送</b>：领取后，你下次在 Shopee 或 TikTok 下单时，奖品会和你买的商品放在同一个包裹寄出，顺便挑点喜欢的吧！只有奖品体积较大、放不进订单包裹时，我们才会<b>单独寄出</b>，这类奖品领取时要填收货地址。`],
      ["领取后多久寄出？怎么查？", () => `随单发送的奖品，会在你下一张订单发货时一起寄出；单独寄出的奖品，审核通过后尽快寄出。进度条会显示到哪一步，每一步铃铛都会通知；发货后会显示运单号和查询链接。`],
      ["地址填错了怎么办？", () => `「待审核」或「待发货」时，在那个奖品的地址下按「修改」。已经寄出的话，请马上联系客服。`],
      ["收到奖品后要做什么？", () => `在「中奖记录」按「确认收到」。没有按的话，发货 ${14} 天后会自动完成。`],
      ["领奖要扣积分吗？", () => `不用，中奖奖品不扣积分。`],
      ["没有注册会员也可以领奖吗？", () => `可以，请私讯客服，告诉我们你的名字和中奖订单编号，一样要在 30 天内联系。注册会员的话，可以自己在俱乐部领奖、看寄送进度，还能累积积分。`],
      ["中了好几次奖，可以一起领吗？", () => `可以。我们可能会把你的几个奖品合并成一笔，一次领取，一起寄出，用同一个运单号。`],
      ["奖品显示「已取消」是什么原因？", () => `请看那个奖品下面的「备注：」，例如「兑换已逾期」。如有疑问请联系我们。`],
    ],
    nm: [
      ["谁可以领新会员迎新礼？", () => `活动开始后才注册的<b>新会员</b>，每人一次。在「我的 › 个人资料 › 关联平台」绑定你的第一个购物账号，就可以开始领取。`],
      ["迎新礼怎么领？", () => `<ol><li>绑定第一个购物账号，得到 <b>${welcomePts()} 分</b>新会员欢迎礼。</li><li>到「兑换商城」最上面的「🎉 新会员专属」，用 ${NM().cost} 分兑换 <b>${esc(NM().gift)}</b>。</li><li>管理员批准后 <b>${NM().days} 天内</b>，用已绑定的 Shopee 或 TikTok 账号下单，${esc(NM().gift)} 会和这张订单一起寄出。</li></ol>`],
      ["下单期限从什么时候开始算？", () => `从管理员<b>批准兑换</b>那天开始算，共 ${NM().days} 天。首页的迎新礼卡片会显示剩余天数和截止日期。`],
      ["超过期限还没下单会怎样？", () => `迎新礼会显示「等待管理员审核」，由管理员处理。如果你快来不及下单，请先联系我们。`],
      ["可以取消迎新礼兑换吗？", () => `「待审核」时，可以在「兑换记录」自己取消，积分会退回。审核通过后如需取消，请联系我们。`],
      ["弹窗关掉了，去哪里再看？", () => `铃铛 🔔 里会留一则提醒，「兑换商城」最上面也有「🎉 新会员专属」卡片。兑换后，首页会显示迎新礼的进度。`],
    ],
    checkin: [
      ["每日签到怎么玩？", () => `在首页最上面的签到卡片，每天按一次「签到」。<b>7 天一轮</b>，第 1 到第 7 天分别得 <b>${ciDays()}</b> 分，一轮共 ${ciSum()} 分；签完第 7 天后，再从第 1 天开始。`],
      ["漏签一天会怎样？", () => `中间断一天，就要从第 1 天重新开始。`],
      ["几点可以再签到？", () => `每天 <b>00:00（马来西亚时间）</b>换日，每天只能签一次，重复按不会多拿分。`],
      ["谁可以签到？", () => `至少绑定了一个有订单的购物账号的会员。还没绑定的话，请到「我的 › 个人资料 › 关联平台」绑定。`],
      ["签到积分什么时候能用？会过期吗？", () => `签到后马上可用。签到积分<b>不会</b>计入会员等级（等级只看消费），和其他积分一样，${EXPIRY_MONTHS} 个月后过期。`],
      ["签到达人是什么？", () => `<b>连续签到满 30 天</b>就是签到达人，之后每满 30 天（第 30、60、90…天）都会再达标一次。每次达标可以得到：<ul><li><b>+${CI().starPts} 分</b></li>${CI().hasGift ? `<li>🎁 一份签到达人礼物</li>` : ""}<li>签到达人徽章次数 +1，显示在你的 Feed 个人主页（×1、×2…）</li><li>一次「分享到 Feed」的机会</li></ul>中间断签的话，就从头开始算。`],
      ["签到达人礼物怎么收到？", () => `达标后，系统会自动帮你建立一笔兑换（不扣积分），出现在「兑换记录」。礼物默认<b>和下一张订单一起寄出</b>，请在 <b>${CI().giftDays} 天内</b>下单，到期前 7 天铃铛会提醒你；没有下单的话礼物会自动取消（签到积分照样保留）。礼物暂时缺货时会显示「补货中」，补货后照常寄出。`, "ciGift"],
      ["商城里的签到达人礼物，为什么不能兑换？", () => `这份礼物只能通过<b>签到达人</b>获得，不能用积分兑换。`, "ciGift"],
      ["「分享到 Feed」怎么加分？", () => `达标后，首页签到卡片会出现「✨ 分享到 Feed」，每次达标可以分享一次，帖子发布后 <b>+${CI().sharePts} 分</b>。${rankName(FD().auto)}以下的会员，帖子要审核通过后才会显示和加分。`],
      ["签到会有通知吗？", () => `签到不会发铃铛通知，记得每天打开首页签到。`],
    ],
    feed: [
      ["Feed 是什么？在哪里？", () => `Mochii Feed 是会员的动态社区，可以看店家和其他会员的帖子、按赞、回复。入口在铃铛 🔔 旁边的「✨ Feed」（有新帖时会有红点）；你自己的主页在「我的 › 我的 Feed」。`],
      ["谁可以看、按赞、回复、发帖？", () => `<ul><li><b>看帖子、按赞</b>：所有会员（每篇帖子赞一次）</li><li><b>回复</b>：已绑定订单${FD().reply > 0 ? `，${rankName(FD().reply)}以上` : ""}的会员</li><li><b>发帖</b>：已绑定订单、${rankName(FD().post)}以上的会员</li><li><b>${rankName(FD().auto)}以上</b>发的帖子直接显示，其他会员的帖子要先审核</li></ul>有些帖子只开放给特定等级，会显示 🔒。`],
      ["为什么我的帖子在「待审核」？", () => `需要审核的会员发的帖子，要等管理员看过才会显示。已发布的帖子修改后，也要重新审核才会再显示。`],
      ["为什么我的电话号码变成 ***？", () => `为了保护你的隐私，帖子、回复和简介里的电话号码会<b>自动隐藏</b>（9 位以上的连续数字也会，例如订单号）。需要联系我们的话，请用 WhatsApp。`],
      ["别人的留言不恰当，可以删除吗？", () => `不能删除别人的留言，但可以按留言旁边的 ⋯ ›「检举」。管理员审核后，该内容会显示为 ***。你自己的帖子和留言，可以在 ⋯ 里修改或删除。`],
      ["怎么换头像和简介？", () => `到「我的 › 我的 Feed」按「编辑」。可以选预设头像，或上传自己的照片（需要先绑定订单）。`],
      ["上传头像有奖励吗？", () => `有。第一次在 Feed 上传<b>自己的照片</b>当头像，可以得 <b>${avatarPts()} 分</b>（系统头像不算）。`, "avatar"],
      ["怎么分享我的个人主页？", () => `在你的 Feed 个人主页按「分享」，会得到一个短链接（themochiishop.com/u/…），可以传给朋友。`],
      ["名字旁边的徽章是什么？", () => `可能是等级标志、签到达人徽章，或是店主、管理员等身份标签。`],
    ],
    account: [
      ["怎么修改昵称？", () => `到「我的 › 个人资料」修改。昵称<b>每 30 天只能改一次</b>。`],
      ["手机号码、WhatsApp 通知可以改吗？", () => `可以，在「个人资料」随时修改。手机号码用来联系你领取奖品，请填可以用 WhatsApp 联系的号码。`],
      ["生日可以改吗？", () => `生日只能设定一次，用来发生日礼。如果填错，请联系我们更正。`],
      ["收货地址怎么管理？", () => `在「个人资料 › 收货地址」新增、修改或删除，最多存 5 个，第一个是默认地址。邮编填好后会自动选州属，城市照州属选择。`],
      ["怎么换语言？", () => `点右上角的国旗（带小齿轮）打开「设定」，在「语言」选 English、Bahasa Melayu 或中文。`],
      ["怎么切换深色或浅色、调整字体大小？", () => `同样在右上角的「设定」里：「外观」可以选浅色或深色，「字体大小」可以调大或调小。这些设定只记在你现在用的这台装置上。`],
      ["铃铛的分类和「LIVE」是什么？", () => `铃铛 🔔 通知分成 全部｜积分｜兑换｜Feed｜公告，打开时会自动跳到有最新未读的那一类。我们正在直播时，铃铛上方会显示「LIVE on 平台」，点一下就直接进入直播间。`],
      ["有问题要找谁？", () => `右上角「设定」里有两个联系方式：<b>Club Tech Support</b> 处理俱乐部的问题（积分、兑换、账号），<b>Mochii Shop Support</b> 处理订单和商品问题。帮助中心最下面也有联系按钮。`],
      ["想删除账号或个人资料？", () => `请联系我们，我们会按马来西亚个人资料保护法（PDPA）处理你的要求。`],
    ],
  },

  // ======================= English =======================
  en: {
    colon: ": ",
    tierSpend: n => `spend RM${n} in the last 12 months`,
    tierFree: "on sign-up",
    tierInvite: "by invitation",
    tierPerk: (m, b) => `points ×${m} · birthday gift ${b} pts`,
    noPerks: "There are no extra perks open right now.",
    tier: [
      ["How is my tier calculated?", L => `By your <b>valid spending in the last 365 days</b>, combined across all your linked platforms. Cancelled and returned orders don't count. Tiers update within about 30 minutes of any order or account change.${tierList(L)}`],
      ["Can my tier go down?", () => `After an upgrade, your new tier <b>lasts 12 months</b> and won't drop during that time. When it ends, we look at your last 12 months of spending: reach <b>half</b> of your tier's level and it renews for another 12 months; otherwise you move down <b>one tier only</b> (e.g. Gold to Silver), never straight back to Mochii Member. The bell reminds you 30 days before it ends, with how much more you need. Your highest tier ever stays on your tier page.`],
      ["What is Black Elite?", () => `${BLACK_CROWN} Black Elite is the highest status in Mochii Member Club. It's <b>by invitation</b> — we invite our most loyal members — and it doesn't expire. It comes with points ×2, an 888-point birthday gift and an exclusive profile cover.`],
      ["When does my points bonus start after upgrading?", () => `Your new tier's bonus applies to <b>new orders</b> after the upgrade. Orders that already earned points aren't recalculated. Past orders added when you link an account use your tier at that time.`],
      ["How do I get my birthday gift?", () => `It's given automatically in your birthday month, <b>once a year</b>, and can be used straight away. The amount depends on your tier at that time. To qualify, set your birthday, link a shopping account and have at least one valid order. Your birthday can only be set once — contact us if it needs correcting.`],
      ["What are extra perks?", L => `Bonus points for completing simple tasks. Each one can be received once per member, needs a linked shopping account, and can be used right away — you'll also get a 🔔 notification:${perkList(L)}`],
      ["How do I get perks “given by our team”?", () => `These perks (e.g. live-stream activities) are added by our team after the event. They appear in your points history as “Bonus: …”. Contact us if you have questions.`, "custom"],
    ],
    points: [
      ["How do I earn points from purchases?", () => `1 point for every RM1, multiplied by your tier bonus, rounded down. For example, RM65 with a ×1.2 bonus earns 78 points.`],
      ["Why are my points “pending”?", () => `Points are pending for ${PENDING_DAYS} days from the order date. If the order is cancelled or returned in that time, the points are cancelled automatically. After ${PENDING_DAYS} days they become available and you'll get a 🔔 notification.`],
      ["How long until I see my points?", () => `We record orders manually, so they usually appear within 1 day; occasionally a network or system issue may cause a short delay. Once recorded, your points and orders update together.<br>New points show as “pending” at first and become available ${PENDING_DAYS} days after the order date, ready to redeem for rewards. If an order is confirmed as completed early, its points become available early too.`],
      ["Do orders before I linked my account count?", () => `Yes. Once you link an account, past orders in our system are counted too. Orders more than ${PENDING_DAYS} days old are available straight away.`],
      ["Why don't my older orders show up?", () => `Our member system started recording orders in <b>September 2026</b>. Orders before September weren't archived, so they can't be shown or counted for points or tiers. All orders from September onwards are recorded as usual. If you have any questions, please contact us.`],
      ["I have several accounts — how does it work?", () => `You can link as many Shopee / TikTok accounts as you like. Points from all of them go into one balance, and their spending counts together for your tier. Each account can only be linked to one member.`],
      ["When are points deducted?", () => `<ul><li><b>Cancelled or returned orders</b>: points for that order are removed, even if they were already available.</li><li><b>Order amount corrections</b>: points are recalculated on the correct amount.</li><li><b>Unlinking an account</b>: points from its orders are removed (shown as “Order unlinked”); they come back if you link it again.</li><li><b>Redeeming rewards</b> and <b>expired points</b> (see below).</li></ul>`],
      ["How are points deducted when I redeem?", () => `When you redeem, the points are <b>held</b> (shown as “In review”) and can't be used for anything else. They're deducted once approved, and returned if the request isn't approved or you cancel it.`],
      ["Do points expire?", () => `Yes. Points expire <b>${EXPIRY_MONTHS} months</b> after they become available (points added later for past orders count from the day they're added). Oldest points are used first. We'll remind you in 🔔 notifications about a month before. Expired points can't be restored.`],
      ["Why does one order have several records?", () => `When an order is corrected, returned, or its account is unlinked and linked again, the same order gets several entries. Your points history shows them as one line with the net total — tap it to see each entry.`],
      ["When can I use extra perk and birthday points?", () => `Straight away — there's no pending period. See “Member › Member Tier › Extra perks” for how to get each perk.`],
      ["Why did I suddenly get points or a coupon?", () => `Sometimes we send points or coupons directly to members (e.g. as an event reward). Points appear in your points history with the reason, and coupons appear in “My Redemptions”. Contact us if you have questions.`],
    ],
    bind: [
      ["Why do I need an order number?", () => `It confirms the account is really yours, so no one else can claim points with your username.`],
      ["Just ordered and linking failed?", () => `New orders usually take about 1 day to enter our system. Try an older order, or try again later.`],
      ["Linking failed with an older order?", () => `Please link using an order number from <b>September 2026 onwards</b>. Orders before September weren't archived, so they can't be used to verify your account.`],
      ["How many accounts can I link?", () => `As many as you like — Shopee, TikTok, and more than one account on the same platform. Points and spending from all of them are combined. Linking both Shopee and TikTok also earns an extra perk.`],
      ["It says the account is already linked?", () => `Each username can only be linked to one member. If it wasn't you, please contact us.`],
      ["How soon do I get points after linking?", () => `Points for your past orders appear within about 30 minutes of linking.`],
      ["Can I unlink an account?", () => `Please contact us. Once unlinked, points from that account's orders are removed, and the record stays under “Removed links”.`],
      ["I changed my platform username?", () => `We match orders by username, so new orders under a new username may not match. Link the new username too, or contact us for help.`],
    ],
    redeem: [
      ["How do I redeem a reward?", () => `Go to the Rewards Mall, choose a reward and tap “Redeem”. For <b>coupons</b>, the code appears in “My Redemptions” once approved. <b>Physical rewards</b> ship with your next order by default; larger rewards are <b>sent separately</b> and need a delivery address, so please save one first in “Me › Profile › Shipping addresses” — “My Redemptions” will also ask you for it when needed.`],
      ["When are my points deducted?", () => `Points are <b>held</b> when you submit (shown as “In review”). They're deducted once approved, and returned if the request isn't approved or you cancel it.`],
      ["Can I cancel a redemption?", () => `Redemptions still “In review” can be cancelled in “My Redemptions”. After approval, please contact us.`],
      ["How do I use a coupon?", () => `Copy the code in “My Redemptions” and enter it at Shopee or TikTok checkout. See the reward description for conditions such as minimum spend and validity.`],
      ["Is there a shipping fee? Where do you ship?", () => `<b>Free shipping</b> by The Mochii Shop. We currently ship to addresses in Malaysia only.`],
      ["When will my physical reward ship? How do I track it?", () => `A reward that ships with your order goes out with your next order. A reward sent separately ships as soon as possible after approval; once shipped, “My Redemptions” shows the courier, tracking number and a “Track parcel” link, and you'll get a 🔔 notification.`],
      ["I entered the wrong address?", () => `Rewards that ship with your order go in your order's parcel, so no separate address is needed. For rewards sent separately, tap “Edit” on that redemption in “My Redemptions” <b>before it ships</b>. If it has already shipped, please contact us right away.`],
      ["What should I do after receiving it?", () => `Tap “Confirm receipt” in “My Redemptions” (photo and comment are optional). If you don't, it completes automatically 14 days after shipping.`],
      ["What does “Ending soon” mean?", () => `The reward has an end time. After that it can no longer be redeemed. The mall shows the days or hours left.`],
      ["What does “No longer available” mean?", () => `The reward can no longer be redeemed — its button turns grey, and it disappears from the mall after 30 days.`],
      ["What do “Coming soon” and the countdown mean?", () => `The reward isn't open yet, so it's greyed out and can't be redeemed. Some show the opening date, others count down in the last 24 hours, and they open automatically on time.`],
      ["How do I choose a style?", () => `Swipe the reward's pictures left or right to see each style (shown as 1/5 and so on) and its stock. Tap “Redeem”, then pick the style you want.`],
      ["How do stock and “Sold out” work?", () => `Mall stock updates <b>in real time</b> — when someone redeems, your screen updates too. When you submit a redemption, one unit is held for you so no one else can take it; if it's rejected or cancelled, the stock goes back. Sold-out rewards become redeemable again once restocked.`],
      ["Why is there a limit on some coupons?", () => `Some coupons can only be redeemed a few times per member — the mall shows “Limit N per member · redeemed N”. Once you reach it, you can redeem again when we add new codes.`],
      ["What is the tip under my coupon code?", () => `It tells you which platform the coupon is for and how to enter it. Have a quick look before checkout.`],
    ],
    prize: [
      ["How do I know if I won?", () => `After each Monthly Draw, the winners are posted on the <a href="/monthly-draw/" target="_blank" rel="noopener">Monthly Draw</a> page. Once we add your prize to the club, it appears in "My Prizes" and on the home page, and the bell notifies you.`],
      ["I won — how do I claim my prize?", () => `<ol><li>Link the order you won with under "Me → Profile → Linked Platforms".</li><li>Wait for our admin to confirm and link your winning order.</li><li>When the prize appears in "My Prizes", tap "Claim prize". It ships with your next order; large prizes are sent separately, so you'll enter a delivery address when claiming.</li></ol>`],
      ["Is there a deadline?", () => `Yes. Please tap "Claim prize" within <b>30 days</b> of it being added — the date is shown under each prize, and the bell reminds you 7 days before. Unclaimed prizes expire automatically; if you need more time, contact us before the deadline.`],
      ["How is my prize sent? What does \"ships with your order\" mean?", () => `Prizes <b>ship with your next order</b> by default: after you claim, the next time you order on Shopee or TikTok, your prize goes in the same parcel — a great time to pick something you like! Only prizes too large for an order parcel are <b>sent separately</b>; for those, you'll enter a delivery address when claiming.`],
      ["How soon is it shipped? How do I track it?", () => `A prize that ships with your order goes out with your next order; a prize sent separately ships as soon as it's approved. The progress bar shows each step and the bell notifies you; once shipped, the tracking number and link appear.`],
      ["I entered the wrong address", () => `While it's "In review" or "Awaiting shipment", tap "Edit" under the prize's address. If it has already shipped, contact us right away.`],
      ["What do I do when it arrives?", () => `Tap "I've received it" in "My Prizes". If you don't, it completes automatically ${14} days after shipping.`],
      ["Does claiming a prize use my points?", () => `No, draw prizes don't use any points.`],
      ["Can I claim without joining the club?", () => `Yes — message our customer service with your name and winning order number, also within 30 days. As a member you can claim in the club yourself, follow the delivery and earn points too.`],
      ["I won several times — can I claim them together?", () => `Yes. We may combine your prizes into one, so you claim them at once and they ship together under one tracking number.`],
      ["Why does my prize say “Cancelled”?", () => `See the “Note:” under that prize, e.g. “Claim expired”. Contact us if you have questions.`],
    ],
    nm: [
      ["Who can get the new member gift?", () => `<b>New members</b> who join after the campaign starts — once per member. Link your first shopping account under “Me › Profile › Linked Platforms” to get started.`],
      ["How do I get the new member gift?", () => `<ol><li>Link your first shopping account and get the <b>${welcomePts()}-point</b> welcome bonus.</li><li>At the top of the Rewards Mall, under “🎉 New member exclusive”, redeem <b>${esc(NM().gift)}</b> for ${NM().cost} points.</li><li>Within <b>${NM().days} days</b> of our approval, place an order with a linked Shopee or TikTok account — ${esc(NM().gift)} ships in that order's parcel.</li></ol>`],
      ["When does the order deadline start?", () => `On the day we <b>approve your redemption</b>, for ${NM().days} days. The gift card on the home page shows the days left and the deadline.`],
      ["What if I don't order in time?", () => `Your gift will show “Waiting for admin review” and our team will handle it. If you're running out of time, please contact us first.`],
      ["Can I cancel the new member gift?", () => `While it's “In review”, you can cancel it in “My Redemptions” and get your points back. After approval, please contact us.`],
      ["I closed the pop-up — where can I find it again?", () => `There's a reminder in the 🔔 bell, and the “🎉 New member exclusive” card is at the top of the Rewards Mall. After redeeming, the home page shows your gift's progress.`],
    ],
    checkin: [
      ["How does daily check-in work?", () => `Tap “Check in” on the check-in card at the top of the home page once a day. It runs in <b>7-day rounds</b>: days 1 to 7 give <b>${ciDays()}</b> points, ${ciSum()} points per round. After day 7, it starts again from day 1.`],
      ["What if I miss a day?", () => `If you miss a day, you start again from day 1.`],
      ["When can I check in again?", () => `The day changes at <b>00:00 Malaysia time</b>. You can check in once a day — tapping again won't give extra points.`],
      ["Who can check in?", () => `Members with at least one linked shopping account that has an order. If you haven't linked one yet, go to “Me › Profile › Linked Platforms”.`],
      ["When can I use check-in points? Do they expire?", () => `Straight away. Check-in points <b>don't</b> count towards your tier (tiers only use spending), and like other points they expire after ${EXPIRY_MONTHS} months.`],
      ["What is Check-in Star?", () => `Check in <b>30 days in a row</b> to become a Check-in Star — and again every 30 days after that (day 30, 60, 90…). Each time you get:<ul><li><b>+${CI().starPts} points</b></li>${CI().hasGift ? `<li>🎁 a Check-in Star gift</li>` : ""}<li>+1 on your Check-in Star badge, shown on your Feed profile (×1, ×2…)</li><li>one “Share to Feed” chance</li></ul>Missing a day restarts the count.`],
      ["How do I get the Check-in Star gift?", () => `When you reach it, a redemption is created for you automatically (no points used) in “My Redemptions”. The gift <b>ships with your next order</b> — please order within <b>${CI().giftDays} days</b>; the bell reminds you 7 days before. If there's no order in time, the gift is cancelled automatically (your check-in points stay). If it's out of stock it shows “Restocking” and ships once restocked.`, "ciGift"],
      ["Why can't I redeem the Check-in Star gift in the mall?", () => `This gift can only be earned as a <b>Check-in Star</b> reward — it can't be redeemed with points.`, "ciGift"],
      ["How do I earn points with “Share to Feed”?", () => `After reaching Check-in Star, the check-in card shows “✨ Share to Feed”. You can share once each time, and get <b>+${CI().sharePts} points</b> when the post is published. For members below ${rankName(FD().auto)}, the post is reviewed first and points are given once it's approved.`],
      ["Will I get a check-in notification?", () => `Check-in doesn't send bell notifications — remember to open the home page and check in each day.`],
    ],
    feed: [
      ["What is the Feed? Where is it?", () => `Mochii Feed is our members' community: see posts from the shop and other members, like and reply. Open it with “✨ Feed” next to the 🔔 bell (a red dot means new posts); your own page is under “Me › My Feed”.`],
      ["Who can view, like, reply and post?", () => `<ul><li><b>View and like</b>: all members (one like per post)</li><li><b>Reply</b>: members with a linked order${FD().reply > 0 ? `, ${rankName(FD().reply)} and above` : ""}</li><li><b>Post</b>: members with a linked order, ${rankName(FD().post)} and above</li><li>Posts from <b>${rankName(FD().auto)} and above</b> appear right away; other members' posts are reviewed first</li></ul>Some posts are only open to certain tiers and show a 🔒.`],
      ["Why is my post “Pending review”?", () => `Posts from members who need review are shown once our team has checked them. If you edit a published post, it's reviewed again before it shows.`],
      ["Why did my phone number turn into ***?", () => `To protect your privacy, phone numbers in posts, replies and bios are <b>hidden automatically</b> (so are 9 or more digits in a row, such as order numbers). To reach us, please use WhatsApp.`],
      ["Can I delete someone's inappropriate reply?", () => `You can't delete other members' replies, but you can tap ⋯ › “Report”. Once our team approves the report, the content shows as ***. You can edit or delete your own posts and replies from the ⋯ menu.`],
      ["How do I change my photo and bio?", () => `Go to “Me › My Feed” and tap “Edit”. Choose a preset avatar or upload your own photo (after linking an order).`],
      ["Is there a reward for uploading a photo?", () => `Yes — the first time you upload <b>your own photo</b> as your Feed avatar, you get <b>${avatarPts()} points</b> (preset avatars don't count).`, "avatar"],
      ["How do I share my profile?", () => `Tap “Share” on your Feed profile to get a short link (themochiishop.com/u/…) you can send to friends.`],
      ["What's the badge next to a name?", () => `It may be a tier mark, the Check-in Star badge, or a title such as Shop Owner or Admin.`],
    ],
    account: [
      ["How do I change my name?", () => `In “Me › Profile”. Your name can be changed <b>once every 30 days</b>.`],
      ["Can I change my phone number or WhatsApp updates?", () => `Yes, any time in “Profile”. We use your number to contact you about rewards, so please use a number reachable on WhatsApp.`],
      ["Can I change my birthday?", () => `Your birthday can only be set once (it's used for your birthday gift). Contact us if it needs correcting.`],
      ["How do I manage shipping addresses?", () => `In “Profile › Shipping addresses” — add, edit or delete up to 5. The first one is your default. The state is picked from your postcode, then choose the city.`],
      ["How do I change the language?", () => `Tap the flag (with the small gear) at the top right to open Settings, then choose English, Bahasa Melayu or 中文 under “Language”.`],
      ["How do I switch light/dark mode or change the text size?", () => `In the same Settings at the top right: “Appearance” switches between light and dark, and “Text size” makes text bigger or smaller. These settings are saved on this device only.`],
      ["What are the bell categories and “LIVE”?", () => `🔔 notifications are grouped into All | Points | Redeem | Feed | Announcements, and the bell opens on the category with the newest unread item. When we're live, the bell shows “LIVE on (platform)” — tap it to go straight to the live stream.`],
      ["Who do I contact for help?", () => `Settings at the top right has two contacts: <b>Club Tech Support</b> for club questions (points, redemptions, account) and <b>Mochii Shop Support</b> for orders and products. There are also contact buttons at the bottom of the Help Centre.`],
      ["I want my account or data deleted?", () => `Please contact us and we'll handle your request under Malaysia's Personal Data Protection Act (PDPA).`],
    ],
  },

  // ======================= Bahasa Melayu =======================
  ms: {
    colon: ": ",
    tierSpend: n => `belanja RM${n} dalam 12 bulan lepas`,
    tierFree: "sebaik mendaftar",
    tierInvite: "melalui jemputan",
    tierPerk: (m, b) => `mata ×${m} · hadiah hari jadi ${b} mata`,
    noPerks: "Tiada ganjaran tambahan dibuka buat masa ini.",
    tier: [
      ["Bagaimana tahap ahli dikira?", L => `Berdasarkan <b>perbelanjaan sah dalam 365 hari lepas</b>, digabungkan bagi semua platform yang dipautkan. Pesanan yang dibatalkan dan dipulangkan tidak dikira. Tahap dikemas kini dalam kira-kira 30 minit selepas sebarang perubahan pesanan atau akaun.${tierList(L)}`],
      ["Bolehkah tahap saya turun?", () => `Selepas naik tahap, tahap baharu anda <b>sah 12 bulan</b> dan tidak akan turun dalam tempoh itu. Apabila tamat, kami lihat perbelanjaan 12 bulan lepas: capai <b>separuh</b> daripada syarat tahap anda dan ia disambung 12 bulan lagi; jika tidak, anda turun <b>satu tahap sahaja</b> (cth. Emas ke Perak), tidak terus ke Ahli Mochii. Loceng akan mengingatkan anda 30 hari sebelum tamat, berserta jumlah yang diperlukan. Tahap tertinggi anda akan sentiasa dipaparkan di halaman tahap.`],
      ["Apakah Black Elite?", () => `${BLACK_CROWN} Black Elite ialah status tertinggi dalam Mochii Member Club. Ia <b>melalui jemputan</b> — kami menjemput ahli yang paling setia — dan tiada tarikh tamat. Ia memberi mata ×2, hadiah hari jadi 888 mata dan kulit profil eksklusif.`],
      ["Bilakah bonus mata bermula selepas naik tahap?", () => `Bonus tahap baharu terpakai pada <b>pesanan baharu</b> selepas naik tahap. Pesanan yang sudah dapat mata tidak dikira semula. Pesanan lama yang ditambah semasa memautkan akaun menggunakan tahap anda pada masa itu.`],
      ["Bagaimana mendapatkan hadiah hari jadi?", () => `Diberi secara automatik dalam bulan hari jadi anda, <b>sekali setahun</b>, dan boleh terus digunakan. Jumlahnya ikut tahap anda pada masa itu. Syarat: tetapkan hari jadi, pautkan akaun beli-belah dan ada sekurang-kurangnya satu pesanan sah. Hari jadi hanya boleh ditetapkan sekali — hubungi kami jika perlu dibetulkan.`],
      ["Apakah ganjaran tambahan?", L => `Mata bonus untuk tugasan mudah. Setiap satu hanya boleh diterima sekali bagi setiap ahli, memerlukan akaun beli-belah yang dipautkan, dan boleh terus digunakan — anda juga akan menerima 🔔 pemberitahuan:${perkList(L)}`],
      ["Bagaimana mendapatkan ganjaran “diberi oleh pasukan kami”?", () => `Ganjaran ini (cth. aktiviti siaran langsung) ditambah oleh pasukan kami selepas acara. Ia dipaparkan dalam sejarah mata sebagai “Bonus: …”. Hubungi kami jika ada pertanyaan.`, "custom"],
    ],
    points: [
      ["Bagaimana mengumpul mata daripada pembelian?", () => `1 mata bagi setiap RM1, didarab dengan bonus tahap anda, dibundarkan ke bawah. Contohnya RM65 dengan bonus ×1.2 memberi 78 mata.`],
      ["Kenapa mata saya “belum disahkan”?", () => `Mata belum disahkan selama ${PENDING_DAYS} hari dari tarikh pesanan. Jika pesanan dibatalkan atau dipulangkan dalam tempoh itu, mata dibatalkan secara automatik. Selepas ${PENDING_DAYS} hari ia menjadi tersedia dan anda akan menerima 🔔 pemberitahuan.`],
      ["Berapa lama sebelum mata dipaparkan?", () => `Pesanan direkodkan secara manual, jadi biasanya dipaparkan dalam 1 hari; sekali-sekala masalah rangkaian atau sistem boleh menyebabkan sedikit kelewatan. Selepas direkodkan, mata dan pesanan dikemas kini serentak.<br>Mata baharu dipaparkan sebagai “belum disahkan” dahulu dan menjadi tersedia ${PENDING_DAYS} hari selepas tarikh pesanan, sedia untuk ditebus. Jika pesanan disahkan selesai lebih awal, matanya juga tersedia lebih awal.`],
      ["Adakah pesanan sebelum saya memautkan akaun dikira?", () => `Ya. Selepas memautkan akaun, pesanan lama dalam sistem kami turut dikira. Pesanan yang lebih daripada ${PENDING_DAYS} hari terus tersedia.`],
      ["Kenapa pesanan lama saya tidak dipaparkan?", () => `Sistem ahli kami mula merekod pesanan pada <b>September 2026</b>. Pesanan sebelum September tidak diarkibkan, jadi ia tidak boleh dipaparkan atau dikira untuk mata dan tahap. Semua pesanan dari September dan seterusnya direkodkan seperti biasa. Jika ada pertanyaan, sila hubungi kami.`],
      ["Saya ada beberapa akaun — bagaimana?", () => `Anda boleh memautkan seberapa banyak akaun Shopee / TikTok. Mata daripada semua akaun masuk ke satu baki, dan perbelanjaannya digabungkan untuk tahap anda. Setiap akaun hanya boleh dipautkan kepada seorang ahli.`],
      ["Bilakah mata ditolak?", () => `<ul><li><b>Pesanan dibatalkan atau dipulangkan</b>: mata pesanan itu ditolak, walaupun sudah tersedia.</li><li><b>Pembetulan jumlah pesanan</b>: mata dikira semula ikut jumlah yang betul.</li><li><b>Menyahpautkan akaun</b>: mata daripada pesanannya ditolak (dipaparkan sebagai “Pesanan dinyahpaut”); ia dikembalikan jika dipautkan semula.</li><li><b>Menebus ganjaran</b> dan <b>mata luput</b> (lihat di bawah).</li></ul>`],
      ["Bagaimana mata ditolak semasa penebusan?", () => `Apabila anda menebus, mata <b>ditahan</b> (dipaparkan sebagai “Dalam semakan”) dan tidak boleh digunakan untuk perkara lain. Ia ditolak selepas diluluskan, dan dikembalikan jika tidak diluluskan atau anda membatalkannya.`],
      ["Adakah mata luput?", () => `Ya. Mata luput <b>${EXPIRY_MONTHS} bulan</b> selepas menjadi tersedia (mata yang ditambah kemudian untuk pesanan lama dikira dari hari ia ditambah). Mata paling lama digunakan dahulu. Kami akan mengingatkan anda dalam 🔔 pemberitahuan kira-kira sebulan sebelum itu. Mata yang luput tidak boleh dipulihkan.`],
      ["Kenapa satu pesanan ada beberapa rekod?", () => `Apabila pesanan dibetulkan, dipulangkan, atau akaunnya dinyahpaut dan dipautkan semula, pesanan yang sama akan ada beberapa rekod. Sejarah mata memaparkannya sebagai satu baris dengan jumlah bersih — ketik untuk melihat setiap rekod.`],
      ["Bilakah mata ganjaran tambahan dan hari jadi boleh digunakan?", () => `Serta-merta — tiada tempoh belum disahkan. Lihat “Ahli › Tahap Ahli › Ganjaran tambahan” untuk syarat setiap ganjaran.`],
      ["Kenapa saya tiba-tiba dapat mata atau kupon?", () => `Kadang-kadang kami menghantar mata atau kupon terus kepada ahli (cth. ganjaran acara). Mata dipaparkan dalam sejarah mata berserta sebabnya, dan kupon dipaparkan di “Penebusan Saya”. Hubungi kami jika ada pertanyaan.`],
    ],
    bind: [
      ["Kenapa perlu nombor pesanan?", () => `Ia mengesahkan akaun itu benar-benar milik anda, supaya orang lain tidak boleh menuntut mata dengan nama pengguna anda.`],
      ["Baru membuat pesanan dan gagal memautkan?", () => `Pesanan baharu biasanya mengambil masa kira-kira 1 hari untuk masuk ke sistem kami. Cuba pesanan yang lebih lama, atau cuba lagi kemudian.`],
      ["Gagal memautkan dengan pesanan lama?", () => `Sila pautkan menggunakan nombor pesanan dari <b>September 2026 dan seterusnya</b>. Pesanan sebelum September tidak diarkibkan, jadi ia tidak boleh digunakan untuk pengesahan.`],
      ["Berapa banyak akaun boleh dipautkan?", () => `Tiada had — Shopee, TikTok, dan lebih daripada satu akaun pada platform yang sama. Mata dan perbelanjaan daripada semua akaun digabungkan. Memautkan kedua-dua Shopee dan TikTok juga memberi ganjaran tambahan.`],
      ["Dikatakan akaun sudah dipautkan?", () => `Setiap nama pengguna hanya boleh dipautkan kepada seorang ahli. Jika bukan anda, sila hubungi kami.`],
      ["Berapa cepat saya dapat mata selepas memautkan?", () => `Mata untuk pesanan lama dipaparkan dalam kira-kira 30 minit selepas memautkan.`],
      ["Bolehkah saya menyahpautkan akaun?", () => `Sila hubungi kami. Selepas dinyahpaut, mata daripada pesanan akaun itu ditolak, dan rekodnya kekal di bawah “Pautan yang telah dibuang”.`],
      ["Saya menukar nama pengguna platform?", () => `Kami memadankan pesanan ikut nama pengguna, jadi pesanan baharu dengan nama pengguna baharu mungkin tidak sepadan. Pautkan nama pengguna baharu juga, atau hubungi kami untuk bantuan.`],
    ],
    redeem: [
      ["Bagaimana menebus ganjaran?", () => `Pergi ke Pusat Ganjaran, pilih ganjaran dan ketik “Tebus”. Bagi <b>kupon</b>, kod dipaparkan dalam “Penebusan Saya” selepas diluluskan. <b>Ganjaran fizikal</b> secara lalai dihantar bersama pesanan anda yang seterusnya; ganjaran yang besar <b>dihantar berasingan</b> dan memerlukan alamat, jadi sila simpan alamat dahulu di “Saya › Profil › Alamat penghantaran” — “Penebusan Saya” juga akan meminta alamat jika perlu.`],
      ["Bilakah mata ditolak?", () => `Mata <b>ditahan</b> semasa anda menghantar permohonan (dipaparkan sebagai “Dalam semakan”). Ia ditolak selepas diluluskan, dan dikembalikan jika tidak diluluskan atau anda membatalkannya.`],
      ["Bolehkah saya membatalkan penebusan?", () => `Penebusan yang masih “Dalam semakan” boleh dibatalkan di “Penebusan Saya”. Selepas diluluskan, sila hubungi kami.`],
      ["Bagaimana menggunakan kupon?", () => `Salin kod di “Penebusan Saya” dan masukkan semasa pembayaran di Shopee atau TikTok. Lihat keterangan ganjaran untuk syarat seperti perbelanjaan minimum dan tempoh sah.`],
      ["Ada caj penghantaran? Hantar ke mana?", () => `<b>Penghantaran percuma</b> oleh The Mochii Shop. Buat masa ini kami hanya menghantar ke alamat di Malaysia.`],
      ["Bilakah ganjaran fizikal dihantar? Bagaimana menjejaknya?", () => `Ganjaran yang dihantar bersama pesanan akan dihantar dengan pesanan anda yang seterusnya. Ganjaran berasingan dihantar secepat mungkin selepas diluluskan; selepas dihantar, “Penebusan Saya” memaparkan syarikat kurier, nombor penjejakan dan pautan “Jejak bungkusan”, dan anda akan menerima 🔔 pemberitahuan.`],
      ["Saya tersalah alamat?", () => `Ganjaran yang dihantar bersama pesanan masuk ke dalam bungkusan pesanan anda, jadi tiada alamat berasingan diperlukan. Bagi ganjaran berasingan, ketik “Ubah” pada penebusan itu di “Penebusan Saya” <b>sebelum dihantar</b>. Jika sudah dihantar, sila hubungi kami segera.`],
      ["Apa perlu dibuat selepas menerimanya?", () => `Ketik “Sahkan penerimaan” di “Penebusan Saya” (foto dan komen adalah pilihan). Jika tidak, ia selesai secara automatik 14 hari selepas dihantar.`],
      ["Apa maksud “Hampir tamat”?", () => `Ganjaran itu ada masa tamat. Selepas itu ia tidak boleh ditebus lagi. Pusat Ganjaran memaparkan baki hari atau jam.`],
      ["Apa maksud “Tidak lagi ditawarkan”?", () => `Ganjaran itu tidak boleh ditebus lagi — butangnya bertukar kelabu, dan ia hilang dari Pusat Ganjaran selepas 30 hari.`],
      ["Apa maksud “Akan datang” dan kiraan detik?", () => `Ganjaran itu belum dibuka, jadi ia berwarna kelabu dan belum boleh ditebus. Ada yang memaparkan tarikh dibuka, ada yang mengira detik dalam 24 jam terakhir, dan ia dibuka secara automatik tepat pada masanya.`],
      ["Bagaimana memilih gaya?", () => `Leret gambar ganjaran ke kiri atau kanan untuk melihat setiap gaya (dipaparkan seperti 1/5) dan stoknya. Ketik “Tebus”, kemudian pilih gaya yang anda mahu.`],
      ["Bagaimana stok dan “Habis” berfungsi?", () => `Stok di Pusat Ganjaran dikemas kini <b>secara masa nyata</b> — apabila orang lain menebus, skrin anda turut dikemas kini. Apabila anda menghantar penebusan, satu unit ditahan untuk anda supaya tidak diambil orang lain; jika ia ditolak atau dibatalkan, stok dikembalikan. Ganjaran yang habis boleh ditebus semula selepas stok ditambah.`],
      ["Kenapa sesetengah kupon ada had?", () => `Sesetengah kupon hanya boleh ditebus beberapa kali bagi setiap ahli — Pusat Ganjaran memaparkan “Had N kali setiap ahli · sudah tebus N”. Selepas mencapai had, anda boleh menebus lagi apabila kami menambah kod baharu.`],
      ["Apakah petua di bawah kod kupon saya?", () => `Ia memberitahu platform mana kupon itu digunakan dan cara memasukkannya. Lihat sebentar sebelum membuat pembayaran.`],
    ],
    prize: [
      ["Bagaimana saya tahu jika saya menang?", () => `Selepas setiap Cabutan Bulanan, senarai pemenang dipaparkan di halaman <a href="/monthly-draw/" target="_blank" rel="noopener">Monthly Draw</a>. Selepas kami tambah hadiah ke kelab anda, ia muncul di "Hadiah Saya" dan halaman utama, dan loceng akan memaklumkan anda.`],
      ["Saya menang — bagaimana nak tuntut?", () => `<ol><li>Pautkan pesanan yang menang di "Saya → Profil → Platform Dipautkan".</li><li>Tunggu admin kami mengesahkan dan memautkan pesanan anda yang menang.</li><li>Apabila hadiah muncul di "Hadiah Saya", ketik "Tuntut hadiah". Ia dihantar bersama pesanan anda yang seterusnya; hadiah yang besar dihantar berasingan, jadi anda perlu isi alamat semasa menuntut.</li></ol>`],
      ["Ada tarikh akhir?", () => `Ya. Sila ketik "Tuntut hadiah" dalam <b>30 hari</b> selepas ia ditambah — tarikhnya dipaparkan di bawah setiap hadiah, dan loceng akan mengingatkan 7 hari sebelumnya. Hadiah yang tidak dituntut akan tamat tempoh secara automatik; jika perlukan masa, hubungi kami sebelum tarikh akhir.`],
      ["Bagaimana hadiah dihantar? Apa maksud \"dihantar bersama pesanan\"?", () => `Secara lalai, hadiah <b>dihantar bersama pesanan anda yang seterusnya</b>: selepas dituntut, kali seterusnya anda membeli di Shopee atau TikTok, hadiah dimasukkan dalam bungkusan yang sama — masa yang sesuai untuk pilih barang kegemaran anda! Hanya hadiah yang terlalu besar untuk bungkusan pesanan akan <b>dihantar berasingan</b>; untuk hadiah ini, anda perlu isi alamat semasa menuntut.`],
      ["Bila ia dihantar? Bagaimana nak jejak?", () => `Hadiah yang dihantar bersama pesanan akan dihantar dengan pesanan anda yang seterusnya; hadiah berasingan dihantar secepat mungkin selepas diluluskan. Bar kemajuan menunjukkan setiap langkah dan loceng memaklumkan anda; selepas dihantar, nombor penjejakan dan pautan akan dipaparkan.`],
      ["Saya tersilap isi alamat", () => `Semasa "Dalam semakan" atau "Menunggu penghantaran", ketik "Ubah" di bawah alamat hadiah. Jika sudah dihantar, hubungi kami segera.`],
      ["Apa perlu dibuat bila hadiah tiba?", () => `Ketik "Saya sudah terima" di "Hadiah Saya". Jika tidak, ia selesai secara automatik ${14} hari selepas dihantar.`],
      ["Adakah menuntut hadiah menggunakan mata?", () => `Tidak, hadiah cabutan tidak menggunakan sebarang mata.`],
      ["Boleh tuntut tanpa menyertai kelab?", () => `Boleh — mesej khidmat pelanggan kami dengan nama dan nombor pesanan yang menang, juga dalam 30 hari. Sebagai ahli, anda boleh tuntut sendiri di kelab, ikuti penghantaran dan kumpul mata.`],
      ["Saya menang beberapa kali — boleh tuntut sekali gus?", () => `Boleh. Kami mungkin menggabungkan hadiah anda menjadi satu, jadi anda boleh menuntut sekali gus dan ia dihantar bersama dengan satu nombor penjejakan.`],
      ["Kenapa hadiah saya dipaparkan “Dibatalkan”?", () => `Lihat “Nota:” di bawah hadiah itu, cth. “Tuntutan tamat tempoh”. Hubungi kami jika ada pertanyaan.`],
    ],
    nm: [
      ["Siapa boleh dapat hadiah ahli baharu?", () => `<b>Ahli baharu</b> yang mendaftar selepas kempen bermula — sekali bagi setiap ahli. Pautkan akaun beli-belah pertama anda di “Saya › Profil › Platform Dipautkan” untuk bermula.`],
      ["Bagaimana mendapatkan hadiah ahli baharu?", () => `<ol><li>Pautkan akaun beli-belah pertama anda dan dapatkan bonus selamat datang <b>${welcomePts()} mata</b>.</li><li>Di bahagian atas Pusat Ganjaran, di bawah “🎉 Eksklusif ahli baharu”, tebus <b>${esc(NM().gift)}</b> dengan ${NM().cost} mata.</li><li>Dalam <b>${NM().days} hari</b> selepas kami meluluskannya, buat pesanan dengan akaun Shopee atau TikTok yang dipautkan — ${esc(NM().gift)} dihantar dalam bungkusan pesanan itu.</li></ol>`],
      ["Bilakah tempoh pesanan bermula?", () => `Pada hari kami <b>meluluskan penebusan anda</b>, selama ${NM().days} hari. Kad hadiah di halaman utama memaparkan baki hari dan tarikh akhir.`],
      ["Bagaimana jika saya tidak sempat membuat pesanan?", () => `Hadiah anda akan dipaparkan “Menunggu semakan admin” dan pasukan kami akan menguruskannya. Jika masa hampir tamat, sila hubungi kami dahulu.`],
      ["Bolehkah saya membatalkan hadiah ahli baharu?", () => `Semasa “Dalam semakan”, anda boleh membatalkannya di “Penebusan Saya” dan mata akan dikembalikan. Selepas diluluskan, sila hubungi kami.`],
      ["Saya tutup pop-up — di mana nak cari semula?", () => `Ada peringatan dalam loceng 🔔, dan kad “🎉 Eksklusif ahli baharu” ada di bahagian atas Pusat Ganjaran. Selepas menebus, halaman utama memaparkan kemajuan hadiah anda.`],
    ],
    checkin: [
      ["Bagaimana daftar masuk harian berfungsi?", () => `Ketik “Daftar masuk” pada kad di bahagian atas halaman utama sekali sehari. Ia berjalan dalam <b>pusingan 7 hari</b>: hari 1 hingga 7 memberi <b>${ciDays()}</b> mata, ${ciSum()} mata setiap pusingan. Selepas hari 7, ia bermula semula dari hari 1.`],
      ["Bagaimana jika saya terlepas sehari?", () => `Jika terlepas sehari, anda bermula semula dari hari 1.`],
      ["Bilakah saya boleh daftar masuk lagi?", () => `Hari bertukar pada <b>00:00 waktu Malaysia</b>. Anda boleh daftar masuk sekali sehari — ketik lagi tidak memberi mata tambahan.`],
      ["Siapa boleh daftar masuk?", () => `Ahli yang ada sekurang-kurangnya satu akaun beli-belah dipautkan yang mempunyai pesanan. Jika belum, pergi ke “Saya › Profil › Platform Dipautkan”.`],
      ["Bilakah mata daftar masuk boleh digunakan? Adakah ia luput?", () => `Serta-merta. Mata daftar masuk <b>tidak</b> dikira untuk tahap (tahap hanya ikut perbelanjaan), dan seperti mata lain ia luput selepas ${EXPIRY_MONTHS} bulan.`],
      ["Apakah Bintang Daftar Masuk?", () => `Daftar masuk <b>30 hari berturut-turut</b> untuk menjadi Bintang Daftar Masuk — dan sekali lagi setiap 30 hari selepas itu (hari 30, 60, 90…). Setiap kali anda dapat:<ul><li><b>+${CI().starPts} mata</b></li>${CI().hasGift ? `<li>🎁 hadiah Bintang Daftar Masuk</li>` : ""}<li>+1 pada lencana Bintang Daftar Masuk, dipaparkan di profil Feed anda (×1, ×2…)</li><li>satu peluang “Kongsi ke Feed”</li></ul>Terlepas sehari akan memulakan kiraan semula.`],
      ["Bagaimana saya dapat hadiah Bintang Daftar Masuk?", () => `Apabila anda mencapainya, satu penebusan dibuat secara automatik (tiada mata digunakan) di “Penebusan Saya”. Hadiah <b>dihantar bersama pesanan anda yang seterusnya</b> — sila buat pesanan dalam <b>${CI().giftDays} hari</b>; loceng akan mengingatkan 7 hari sebelumnya. Jika tiada pesanan, hadiah dibatalkan secara automatik (mata daftar masuk kekal). Jika stok habis, ia dipaparkan “Stok sedang ditambah” dan dihantar selepas stok tiba.`, "ciGift"],
      ["Kenapa hadiah Bintang Daftar Masuk tidak boleh ditebus di Pusat Ganjaran?", () => `Hadiah ini hanya boleh diperoleh sebagai ganjaran <b>Bintang Daftar Masuk</b> — ia tidak boleh ditebus dengan mata.`, "ciGift"],
      ["Bagaimana dapat mata dengan “Kongsi ke Feed”?", () => `Selepas menjadi Bintang Daftar Masuk, kad daftar masuk memaparkan “✨ Kongsi ke Feed”. Anda boleh berkongsi sekali setiap kali, dan dapat <b>+${CI().sharePts} mata</b> apabila siaran diterbitkan. Bagi ahli di bawah ${rankName(FD().auto)}, siaran disemak dahulu dan mata diberi selepas diluluskan.`],
      ["Adakah daftar masuk menghantar pemberitahuan?", () => `Daftar masuk tidak menghantar pemberitahuan loceng — ingat untuk buka halaman utama dan daftar masuk setiap hari.`],
    ],
    feed: [
      ["Apakah Feed? Di mana ia?", () => `Mochii Feed ialah komuniti ahli kami: lihat siaran kedai dan ahli lain, suka dan balas. Buka dengan “✨ Feed” di sebelah loceng 🔔 (titik merah bermaksud ada siaran baharu); halaman anda sendiri di “Saya › Feed Saya”.`],
      ["Siapa boleh melihat, suka, membalas dan menyiarkan?", () => `<ul><li><b>Lihat dan suka</b>: semua ahli (satu suka bagi setiap siaran)</li><li><b>Balas</b>: ahli dengan pesanan dipautkan${FD().reply > 0 ? `, ${rankName(FD().reply)} dan ke atas` : ""}</li><li><b>Siar</b>: ahli dengan pesanan dipautkan, ${rankName(FD().post)} dan ke atas</li><li>Siaran daripada <b>${rankName(FD().auto)} dan ke atas</b> terus dipaparkan; siaran ahli lain disemak dahulu</li></ul>Sesetengah siaran hanya untuk tahap tertentu dan memaparkan 🔒.`],
      ["Kenapa siaran saya “Menunggu semakan”?", () => `Siaran daripada ahli yang perlu disemak akan dipaparkan selepas pasukan kami menyemaknya. Jika anda mengubah siaran yang sudah diterbitkan, ia disemak semula sebelum dipaparkan.`],
      ["Kenapa nombor telefon saya menjadi ***?", () => `Untuk melindungi privasi anda, nombor telefon dalam siaran, balasan dan bio <b>disembunyikan secara automatik</b> (begitu juga 9 digit atau lebih berturut-turut, seperti nombor pesanan). Untuk menghubungi kami, sila gunakan WhatsApp.`],
      ["Bolehkah saya memadam balasan orang lain yang tidak sesuai?", () => `Anda tidak boleh memadam balasan ahli lain, tetapi boleh ketik ⋯ › “Lapor”. Selepas pasukan kami meluluskan laporan, kandungan itu dipaparkan sebagai ***. Siaran dan balasan anda sendiri boleh diubah atau dipadam melalui menu ⋯.`],
      ["Bagaimana menukar foto dan bio?", () => `Pergi ke “Saya › Feed Saya” dan ketik “Ubah”. Pilih avatar sedia ada atau muat naik foto sendiri (selepas memautkan pesanan).`],
      ["Ada ganjaran untuk muat naik foto?", () => `Ada — kali pertama anda memuat naik <b>foto sendiri</b> sebagai avatar Feed, anda dapat <b>${avatarPts()} mata</b> (avatar sedia ada tidak dikira).`, "avatar"],
      ["Bagaimana berkongsi profil saya?", () => `Ketik “Kongsi” di profil Feed anda untuk mendapatkan pautan pendek (themochiishop.com/u/…) yang boleh dihantar kepada rakan.`],
      ["Apakah lencana di sebelah nama?", () => `Ia mungkin tanda tahap, lencana Bintang Daftar Masuk, atau gelaran seperti Pemilik Kedai atau Admin.`],
    ],
    account: [
      ["Bagaimana menukar nama?", () => `Di “Saya › Profil”. Nama boleh ditukar <b>sekali setiap 30 hari</b>.`],
      ["Boleh tukar nombor telefon atau makluman WhatsApp?", () => `Boleh, bila-bila masa di “Profil”. Nombor anda digunakan untuk menghubungi anda berkenaan ganjaran, jadi gunakan nombor yang ada WhatsApp.`],
      ["Boleh tukar tarikh lahir?", () => `Tarikh lahir hanya boleh ditetapkan sekali (untuk hadiah hari jadi). Hubungi kami jika perlu dibetulkan.`],
      ["Bagaimana mengurus alamat penghantaran?", () => `Di “Profil › Alamat penghantaran” — tambah, ubah atau padam sehingga 5 alamat. Alamat pertama ialah alamat utama. Negeri dipilih mengikut poskod, kemudian pilih bandar.`],
      ["Bagaimana menukar bahasa?", () => `Ketik bendera (dengan gear kecil) di penjuru kanan atas untuk membuka Tetapan, kemudian pilih English, Bahasa Melayu atau 中文 di bawah “Bahasa”.`],
      ["Bagaimana menukar mod cerah/gelap atau saiz teks?", () => `Dalam Tetapan yang sama di penjuru kanan atas: “Paparan” untuk cerah atau gelap, dan “Saiz teks” untuk membesarkan atau mengecilkan teks. Tetapan ini disimpan pada peranti ini sahaja.`],
      ["Apakah kategori loceng dan “LIVE”?", () => `Pemberitahuan 🔔 dibahagikan kepada Semua | Mata | Tebus | Feed | Pengumuman, dan loceng dibuka pada kategori yang ada item belum dibaca terbaharu. Semasa kami bersiaran langsung, loceng memaparkan “LIVE on (platform)” — ketik untuk terus ke siaran langsung.`],
      ["Siapa yang perlu saya hubungi?", () => `Tetapan di penjuru kanan atas ada dua kenalan: <b>Club Tech Support</b> untuk soalan kelab (mata, penebusan, akaun) dan <b>Mochii Shop Support</b> untuk pesanan dan produk. Butang hubungi juga ada di bahagian bawah Pusat Bantuan.`],
      ["Saya mahu akaun atau data saya dipadam?", () => `Sila hubungi kami dan kami akan mengendalikan permintaan anda mengikut Akta Perlindungan Data Peribadi Malaysia (PDPA).`],
    ],
  },
};

// 帮助中心：会员俱乐部的分类（顺序 = 显示顺序）
// nm（新会员）只给看得到迎新礼的会员；checkin（每日签到）只在后台开启签到时显示
export const CLUB_SECTIONS = ["nm", "points", "checkin", "tier", "redeem", "prize", "feed", "bind", "account"];
export function clubFaq(ctx = {}) {
  CTX = { nm: ctx.nm || null, ci: ctx.ci || null, feed: ctx.feed || {} };
  const L = TEXT[lang] || TEXT.en;
  return CLUB_SECTIONS
    .filter(sec => sec !== "nm" || CTX.nm)
    .filter(sec => sec !== "checkin" || (CTX.ci && CTX.ci.active))
    .map(sec => ({ sec, items: (L[sec] || []).filter(visible).map(([q, a]) => ({ q, a: a(L) })) }))
    .filter(g => g.items.length);
}

// 把某一区的常见问题放进 el（<details> 折叠式）
export function renderFaq(el, section) {
  if (!el) return;
  const L = TEXT[lang] || TEXT.en;
  const items = (L[section] || []).filter(visible);
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
