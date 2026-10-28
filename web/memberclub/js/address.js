// 📦 收货地址：个人资料的地址簿、兑换实体奖品时选地址，共用这里
import { db } from "./firebase-config.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { t, esc, MY_STATES, MY_CITIES, MAX_ADDRESSES, addressError, cleanAddress, addressHTML, stateFromPostcode } from "./common.js";

// 地址表单（root 里放这些栏位）。顺序：邮编 → 州属（按邮编自动选）→ 城市（按州属列出，找不到选「其他」）
export function addressFormHTML() {
  return `
    <div class="addr-form">
      <div class="grid2">
        <label><span>${t("addr.name")}</span><input data-a="name" maxlength="60" autocomplete="name"></label>
        <label><span>${t("addr.phone")}</span><input data-a="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="${esc(t("idx.phonePh"))}"></label>
      </div>
      <label><span>${t("addr.line1")}</span><input data-a="line1" maxlength="120" autocomplete="address-line1" placeholder="${esc(t("addr.line1Ph"))}"></label>
      <label><span>${t("addr.line2")}</span><input data-a="line2" maxlength="120" autocomplete="address-line2" placeholder="${esc(t("addr.line2Ph"))}"></label>
      <div class="grid2">
        <label><span>${t("addr.postcode")}</span><input data-a="postcode" inputmode="numeric" pattern="[0-9]*" maxlength="5" autocomplete="postal-code" placeholder="81300"></label>
        <label><span>${t("addr.state")}</span>
          <select data-a="state" autocomplete="address-level1">
            <option value="">${t("addr.choose")}</option>
            ${MY_STATES.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join("")}
          </select>
        </label>
      </div>
      <label><span>${t("addr.city")}</span>
        <select data-city-pick><option value="">${t("addr.pickStateFirst")}</option></select>
        <input data-a="city" class="hidden city-other" maxlength="60" autocomplete="address-level2" placeholder="${esc(t("addr.cityOtherPh"))}">
      </label>
      <p class="muted addr-country">🇲🇾 Malaysia</p>
    </div>`;
}

// 城市选单：照州属列出
function fillCities(root, state, city) {
  const pick = root.querySelector("[data-city-pick]");
  const other = root.querySelector('[data-a="city"]');
  const list = MY_CITIES[state] || [];
  if (!state) {
    pick.innerHTML = `<option value="">${t("addr.pickStateFirst")}</option>`;
    pick.disabled = true;
    other.classList.add("hidden");
    other.value = "";
    return;
  }
  pick.disabled = false;
  pick.innerHTML = `<option value="">${t("addr.choose")}</option>` +
    list.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("") +
    `<option value="__other">${t("addr.cityOther")}</option>`;
  if (city && list.includes(city)) { pick.value = city; other.value = city; other.classList.add("hidden"); }
  else if (city) { pick.value = "__other"; other.value = city; other.classList.remove("hidden"); }
  else if (list.length === 1) { pick.value = list[0]; other.value = list[0]; other.classList.add("hidden"); }
  else { pick.value = ""; other.value = ""; other.classList.add("hidden"); }
}

// 绑定表单的互动（每个表单呼叫一次）
export function bindAddressForm(root) {
  const pc = root.querySelector('[data-a="postcode"]');
  const st = root.querySelector('[data-a="state"]');
  const pick = root.querySelector("[data-city-pick]");
  const other = root.querySelector('[data-a="city"]');
  pc.addEventListener("input", () => {
    const digits = pc.value.replace(/\D/g, "").slice(0, 5);   // 邮编只能是数字
    if (pc.value !== digits) pc.value = digits;
    const guess = stateFromPostcode(digits);
    if (guess && st.value !== guess) { st.value = guess; fillCities(root, guess, ""); }
  });
  st.addEventListener("change", () => fillCities(root, st.value, ""));
  pick.addEventListener("change", () => {
    if (pick.value === "__other") { other.value = ""; other.classList.remove("hidden"); other.focus(); }
    else { other.value = pick.value; other.classList.add("hidden"); }
  });
}

export function fillAddressForm(root, a = {}) {
  root.querySelectorAll("[data-a]").forEach(el => { el.value = a[el.dataset.a] || ""; });
  fillCities(root, a.state || "", a.city || "");
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
