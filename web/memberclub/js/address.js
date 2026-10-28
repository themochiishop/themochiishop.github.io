// 📦 收货地址：个人资料的地址簿、兑换实体奖品时选地址，共用这里
import { db } from "./firebase-config.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { t, esc, MY_STATES, MAX_ADDRESSES, addressError, cleanAddress, addressHTML } from "./common.js";

// 地址表单（root 里放这些栏位）
export function addressFormHTML() {
  return `
    <div class="addr-form">
      <div class="grid2">
        <label><span>${t("addr.name")}</span><input data-a="name" maxlength="60" autocomplete="name"></label>
        <label><span>${t("addr.phone")}</span><input data-a="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="${esc(t("idx.phonePh"))}"></label>
      </div>
      <label><span>${t("addr.line1")}</span><input data-a="line1" maxlength="120" autocomplete="address-line1" placeholder="${esc(t("addr.line1Ph"))}"></label>
      <label><span>${t("addr.line2")}</span><input data-a="line2" maxlength="120" autocomplete="address-line2" placeholder="${esc(t("addr.line2Ph"))}"></label>
      <div class="grid3">
        <label><span>${t("addr.postcode")}</span><input data-a="postcode" inputmode="numeric" maxlength="5" autocomplete="postal-code"></label>
        <label><span>${t("addr.city")}</span><input data-a="city" maxlength="60" autocomplete="address-level2"></label>
        <label><span>${t("addr.state")}</span>
          <select data-a="state" autocomplete="address-level1">
            <option value="">${t("addr.choose")}</option>
            ${MY_STATES.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join("")}
          </select>
        </label>
      </div>
      <p class="muted addr-country">🇲🇾 Malaysia</p>
    </div>`;
}

export function fillAddressForm(root, a = {}) {
  root.querySelectorAll("[data-a]").forEach(el => { el.value = a[el.dataset.a] || ""; });
}

export function readAddressForm(root) {
  const a = {};
  root.querySelectorAll("[data-a]").forEach(el => { a[el.dataset.a] = el.value; });
  return cleanAddress(a);
}

// 检查并回传 { address } 或 { error }
export function validateAddressForm(root) {
  const a = readAddressForm(root);
  const err = addressError(a);
  return err ? { error: t(err) } : { address: a };
}

export async function saveAddresses(uid, list) {
  await updateDoc(doc(db, "members", uid), { addresses: list.slice(0, MAX_ADDRESSES) });
}

export function addressCardHTML(a, i, opts = {}) {
  return `
    <li class="addr-item${opts.selected ? " selected" : ""}" data-i="${i}">
      ${opts.radio ? `<input type="radio" name="addrPick" value="${i}" ${opts.selected ? "checked" : ""}>` : ""}
      <div class="addr-text">${i === 0 ? `<span class="tag tag-ok">${t("addr.default")}</span> ` : ""}${addressHTML(a)}</div>
      ${opts.actions ? `
        <div class="addr-actions">
          ${i !== 0 ? `<button type="button" class="btn btn-ghost btn-inline" data-addr="default">${t("addr.setDefault")}</button>` : ""}
          <button type="button" class="btn btn-ghost btn-inline" data-addr="edit">${t("addr.edit")}</button>
          <button type="button" class="btn btn-ghost btn-inline" data-addr="del">${t("addr.delete")}</button>
        </div>` : ""}
    </li>`;
}
