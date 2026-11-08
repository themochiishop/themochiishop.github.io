// 📵 电话号码过滤：会员发帖、回复、编辑、简介时，把电话号码换成 ***
// ⚠️ 规则要和 Firestore 规则的 fdNoPhone() 一致（改这里也要改规则，不然会被后端挡下）
//   1. 马来西亚手机：012-345 6789、011-1234 5678、+60 12 345 6789、60123456789
//   2. 马来西亚市话：03-1234 5678、07 123 4567
//   3. 连续 9 位以上的数字（其他国家的号码、订单号等）
const PHONE = /(?:\+?60[\s.-]?|0)(?:1\d|[3-9])[\s.-]?\d{3,4}[\s.-]?\d{4}|\d{9,}/g;

// 全形数字 ０-９ 先换成一般数字，避免用全形字绕过
const halfWidth = s => s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));

// 回传 { text: 屏蔽后的文字, hit: 有没有屏蔽到 }
export function maskPhones(raw) {
  const src = halfWidth(String(raw || ""));
  let hit = false;
  const text = src.replace(PHONE, () => { hit = true; return "***"; });
  return { text, hit };
}
