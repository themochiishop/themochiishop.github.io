// 🛍️ 商城兑换：交给后端 Cloud Function rdMember（检查库存、款式、限兑次数、积分，建立兑换时马上扣库存，不会超卖）
import { app } from "./firebase-config.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-functions.js";
import { t } from "./i18n.js";

let fn = null;
const call = data => {
  if (!fn) fn = httpsCallable(getFunctions(app, "asia-southeast1"), "rdMember");
  return fn(data).then(r => r.data || {});
};
// 兑换：回传 { id }（新的兑换编号）
export const redeem = (rewardId, variantId) => call({ op: "redeem", rewardId, ...(variantId ? { variantId } : {}) });
// 取消审核中的兑换（库存会加回）
export const cancel = id => call({ op: "cancel", id });
// 错误代号 → 三语讯息
export const errKey = e => (e && e.details && e.details.key) || "";
export function errText(e, prefix = "rw.fail") {
  const k = errKey(e);
  const msg = k ? t("rd.err." + k.replace("rd/", "")) : "";
  return msg && !msg.startsWith("rd.err.") ? msg : t(prefix) + (e && e.message ? e.message : "");
}
