// ---------------- Config ----------------
const INDIVIDUAL_MAX_AMOUNT = 500;
const sandbox = window.location.host.includes('local.') || window.location.host.includes('test.');
const API_BASE_URL = !sandbox ? "https://portal.simdsoft.com/sponsors/" : "https://local.simdsoft.com/sponsors/";

const individualTiers = {
  t01: { prod_id: "d101", title: "Backer", amount: 5 },
  t02: { prod_id: "d102", title: "Bronze", amount: 25 },
  t03: { prod_id: "d103", title: "Silver", amount: 50 },
  t04: { prod_id: "d104", title: "Gold", amount: 100 },
  t05: { prod_id: "d105", title: "Platinum", amount: 250 }
};

const corporateTiers = {
  t01: { prod_id: "d1001", title: "Bronze", amount: 128, osc_tier: 'sponsors-69888' },
  t02: { prod_id: "d1002", title: "Silver", amount: 256, osc_tier: 'silver-96259' },
  t03: { prod_id: "d1003", title: "Gold", amount: 1000, osc_tier: 'gold-96260' },
  t04: { prod_id: "d1004", title: "Platinum", amount: 3000, osc_tier: 'platinum-96261' },
  t05: { prod_id: "d1005", title: "Diamond", amount: 6000, osc_tier: 'diamond-96262' }
};

const VALID_CHANNELS = {
  paypal: "PayPal",
  github: "GitHub Sponsors",
  osc: "Open Source Collective"
};

// Map channel code to readable string
function channelName(code) {
  const map = {
    1: "Alipay",
    2: "WeChat",
    3: "PayPal",
    4: "OSC",
    5: "GitHub"
  };
  return map[code] || "Other";
}

// ---------------- Utils ----------------
function parseCurrency(input) {
  if (!input) return NaN;
  const cleaned = input.replace(/[^0-9.,]/g, "").replace(/,/g, "");
  return parseFloat(cleaned);
}

function formatDateDay(ts) {
  const d = new Date(ts * 1000);
  const dayStr = d.toLocaleDateString("en-US", { year: "numeric", month: "numeric", day: "numeric" });
  const localStr = d.toLocaleString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZoneName: "short" });
  const utcStr = d.toLocaleString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "UTC", timeZoneName: "short" });
  return { dayStr, timeHint: `Local Time: ${localStr}&#10;UTC Time: ${utcStr}` };
}

function maskName(name, currency) {
  if (currency !== 'CNY' || !name) return name;
  const chars = Array.from(name);
  if (chars.length === 1) return chars[0] + "*";
  if (chars.length === 2) return chars[0] + "*" + chars[1];
  return chars[0] + "*" + chars[chars.length - 1];
}

// ---------------- UI Components ----------------
class ModalManager {
  constructor(id) {
    this.el = document.getElementById(id);
    this.bsModal = new bootstrap.Modal(this.el);
    this.el.addEventListener("hidden.bs.modal", () => this.el.setAttribute("inert", ""));
    this.el.addEventListener("show.bs.modal", () => this.el.removeAttribute("inert"));
    this.el.addEventListener("hide.bs.modal", () => {
      if (this.el._triggerEl) this.el._triggerEl.focus();
    });
  }

  show({ title, body, buttons = [], triggerEl }) {
    this.el.querySelector(".modal-title").textContent = title;
    this.el.querySelector(".modal-body").innerHTML = body;
    const footer = this.el.querySelector(".modal-footer");
    footer.innerHTML = "";
    buttons.forEach(btn => footer.appendChild(btn));
    if (triggerEl) this.el._triggerEl = triggerEl;
    this.bsModal.show();
  }
}

function showToast(message, type = "primary") {
  const toastContainer = document.querySelector(".toast-container") || createToastContainer();
  const toastEl = document.createElement("div");
  toastEl.className = `toast align-items-center text-bg-${type} border-0`;
  toastEl.setAttribute("role", "alert");
  toastEl.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  toastContainer.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
  toast.show();
  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

function createToastContainer() {
  const container = document.createElement("div");
  container.className = "toast-container position-fixed bottom-0 end-0 p-3";
  document.body.appendChild(container);
  return container;
}

// ---------------- Donation Logic ----------------
function verifyDonateInputs(amount, sponsor_channel, is_corporate, triggerEl, on_verified) {
  const channelSelect = document.getElementById("channel-options");
  const channel = channelSelect ? channelSelect.value : "";
  const value = parseCurrency(amount);

  const commonModal = new ModalManager("commonModal");
  const channelWarning = new ModalManager("channelWarning");

  if (!amount || amount.trim() === "") {
    commonModal.show({ title: "Missing Amount", body: "Please input amount.", triggerEl });
    return;
  }
  if (isNaN(value) || value < 1) {
    commonModal.show({ title: "Invalid Amount", body: "Please enter a valid amount greater than 0.", triggerEl });
    return;
  }
  if (!VALID_CHANNELS[sponsor_channel]) {
    commonModal.show({ title: "Invalid Channel", body: `Unsupported channel: ${sponsor_channel}`, triggerEl });
    return;
  }

  if (!(is_corporate && channel === "osc") && value > INDIVIDUAL_MAX_AMOUNT) {
    if (is_corporate) {
      channelWarning.show({
        title: "Large Corporate Sponsorship",
        body: `For corporate sponsorships > USD$${INDIVIDUAL_MAX_AMOUNT}, please use Open Source Collective.`,
        triggerEl,
        buttons: [
          Object.assign(document.createElement("button"), { className: "btn btn-secondary", textContent: "Continue Anyway", onclick: () => { channelWarning.bsModal.hide(); on_verified(sponsor_channel); } }),
          Object.assign(document.createElement("button"), { className: "btn btn-primary", textContent: "Switch to OSC", onclick: () => { channelSelect.value = "osc"; showToast("Channel switched to OSC", "info"); channelWarning.bsModal.hide(); on_verified("osc"); } })
        ]
      });
    } else {
      commonModal.show({ title: "Limit Exceeded", body: `Individual sponsorship cannot exceed USD$${INDIVIDUAL_MAX_AMOUNT}.`, triggerEl });
    }
    return;
  }

  if (typeof on_verified === "function") on_verified(sponsor_channel);
}

// ---------------- Event Handlers ----------------
function updateTiers(dataMap) {
  const currentSelected = document.querySelector(".sponsor-radio:checked");
  const selectedId = currentSelected ? currentSelected.id : null;
  Object.keys(dataMap).forEach(key => {
    const radio = document.getElementById(key);
    if (!radio) return;
    const tier = dataMap[key];
    const titleEl = radio.closest("label").querySelector(".tier-title");
    const priceEl = radio.closest("label").querySelector(".price");
    radio.dataset.prod_id = tier.prod_id;
    radio.value = tier.amount;
    titleEl.textContent = tier.title;
    priceEl.textContent = `USD$${tier.amount}/month`;
  });
  if (selectedId) {
    const restoredRadio = document.getElementById(selectedId);
    if (restoredRadio) restoredRadio.checked = true;
  } else {
    const firstRadio = document.querySelector(".sponsor-radio");
    if (firstRadio) firstRadio.checked = true;
  }
}

function initEventHandlers() {
  const confirmBtn = document.getElementById("confirm-btn");
  confirmBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const selected = document.querySelector('input[name="sponsor"]:checked');
    if (!selected) {
      new ModalManager("commonModal").show({ title: "Missing Tier", body: "Please select a tier.", triggerEl: e.currentTarget });
      return;
    }
    const is_custom = selected.id === 'custom';
    const amount_str = is_custom ? document.querySelector('.amount-input').value : selected.value;
    const is_monthly = is_custom ? document.querySelector('input[name="custom-cycle"]:checked').value === 'monthly' : true;
    const is_corporate = document.getElementById("btn-corporate-tiers").classList.contains("active");
    const channel = document.getElementById("channel-options").value;

    verifyDonateInputs(amount_str, channel, is_corporate, e.currentTarget, (verified_channel) => {
      // Generate order id if amount or cycle changed
      if ((window.cv_sel_amount !== amount_str) || (window.cv_is_monthly !== is_monthly)) {
        window.cv_sel_amount = amount_str;
        window.cv_is_monthly = is_monthly;
        window.cv_orderid = genOrderId();
      }

      console.log(`Amount: $${amount_str}${is_monthly ? '/month' : ''}, Channel: ${verified_channel}`);

      const amount = parseCurrency(amount_str);
      let prod_id = null;
      let osc_tier = null;
      if (!is_custom) {
        const tier_info = is_corporate ? corporateTiers[selected.id] : individualTiers[selected.id];
        prod_id = tier_info.prod_id;
        osc_tier = tier_info.osc_tier;
      }
      else {
        prod_id = 'custom';
      }

      // Payment redirect logic
      if (verified_channel === 'paypal') {
        let baseUrl = !sandbox ? 'simdsoft.com' : 'local.simdsoft.com';
        const actionUrl = `https://${baseUrl}/onlinepay/uniorder.php`;
        const form = $('#unipayment');
        form.attr('action', actionUrl);
        form.children('#WIDprod').attr('value', prod_id);
        form.children('#WIDout_trade_no').attr('value', window.cv_orderid);
        form.children('#WIDmonthly').attr('value', is_monthly ? '1' : '0');
        form.children('#WIDamount').attr('value', amount.toString());
        form.submit();
      } else if (verified_channel === 'github') {
        const gh_freq = is_monthly ? 'recurring' : 'one-time';
        const actionUrl = `https://github.com/sponsors/axmolengine/sponsorships?preview=false&frequency=${gh_freq}&amount=${amount}`;
        window.open(actionUrl, '_blank');
      } else if (verified_channel === 'osc') {
        let actionUrl = '#';
        if (is_corporate) {
          if (osc_tier !== null) {
            actionUrl = `https://opencollective.com/axmol/contribute/${osc_tier}/checkout?interval=month&amount=${amount}&contributeAs=me`;
          }
        } else {
          if (is_monthly) {
            actionUrl = `https://opencollective.com/axmol/contribute/backers-69887/checkout?interval=month&amount=${amount}&contributeAs=me`;
          }
        }
        if (actionUrl === '#') {
          const osc_interval = is_monthly ? 'month' : 'oneTime';
          actionUrl = `https://opencollective.com/axmol/donate?interval=${osc_interval}&amount=${amount}&contributeAs=me`;
        }
        window.open(actionUrl, '_blank');
      }
    });
  });

  // Switch to Individual tiers
  const btnIndividual = document.getElementById("btn-individual-tiers");
  const btnCorporate = document.getElementById("btn-corporate-tiers");
  const channelSelect = document.getElementById("channel-options");

  let lastIndividualChannel = "github";
  btnIndividual.addEventListener("click", () => {
    btnIndividual.classList.add("active");
    btnCorporate.classList.remove("active");
    updateTiers(individualTiers);
    // restore last individual channel
    if (channelSelect) {
      channelSelect.value = lastIndividualChannel;
    }
  });

  // Switch to Corporate tiers
  btnCorporate.addEventListener("click", () => {
    btnCorporate.classList.add("active");
    btnIndividual.classList.remove("active");
    updateTiers(corporateTiers);
    if (channelSelect && channelSelect.value !== 'osc') {
      channelSelect.value = "osc";
      showToast("Channel automatically switched to Open Source Collective.", "info");
    }
  });

  // Channel change warning
  channelSelect.addEventListener("change", (e) => {
    const channel = e.target.value;
    const isCorporate = btnCorporate.classList.contains("active");
    if (!isCorporate) {
      // remember previous individual channel
      lastIndividualChannel = channelSelect.value;
    }
    if (isCorporate && (channel === "paypal" || channel === "github")) {
      const channelWarning = new ModalManager("channelWarning");
      channelWarning.show({
        title: "Channel Warning",
        body: `For corporate sponsorship, we recommend using <strong>Open Source Collective</strong> for transparency and compliance. PayPal/GitHub are intended for individual backers.`,
        triggerEl: e.currentTarget,
        buttons: [
          Object.assign(document.createElement("button"), { className: "btn btn-secondary", textContent: "Continue Anyway", onclick: () => { channelWarning.bsModal.hide(); } }),
          Object.assign(document.createElement("button"), { className: "btn btn-primary", textContent: "Switch to OSC", onclick: () => { channelSelect.value = "osc"; showToast("Channel switched to OSC", "info"); channelWarning.bsModal.hide(); } })
        ]
      });
    }
  });

  // Auto select Custom card when interacting with its inputs
  const customRadio = document.getElementById("custom");
  const customInputs = document.querySelectorAll(
    ".amount-input, input[name='custom-cycle']"
  );

  customInputs.forEach(el => {
    el.addEventListener("focus", () => {
      customRadio.checked = true;
    });
    el.addEventListener("click", () => {
      customRadio.checked = true;
    });
    el.addEventListener("change", () => {
      customRadio.checked = true;
    });
  });

  // Pagination controls
  document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentPage > 1) {
      loadData(currentPage - 1);
    } else {
      showToast("Already on the first page", "info");
    }
  });

  document.getElementById("nextBtn").addEventListener("click", () => {
    if (currentPage < totalPages) {
      loadData(currentPage + 1);
    } else {
      showToast("Already on the last page", "info");
    }
  });

  // Per-page selection
  document.getElementById("perPageSelect").addEventListener("change", (e) => {
    perPage = parseInt(e.target.value, 10);
    loadData(1);
  });

  // ---------------- Custom amount formatting ----------------
  const amountInput = document.getElementById('amount-input');

  // Format while typing
  function formatCurrency(e) {
    let caretPos = e.target.selectionStart;
    const originalLen = e.target.value.length;

    let value = e.target.value
      .replace(/[^0-9.]/g, '')           // remove non-numeric
      .replace(/(\..*)\./g, '$1')        // only one decimal point
      .replace(/(\.\d{2}).*/g, '$1')     // max two decimals
      .replace(/^0+(\d)/, '$1');         // no leading zeros

    let [integer, decimal] = value.split('.');
    decimal = decimal ? '.' + decimal.slice(0, 2) : '';

    if (integer) {
      integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    const newValue = (integer || '0') + (decimal || '');
    e.target.value = newValue;

    // restore caret position
    const newLen = newValue.length;
    caretPos = newLen - (originalLen - caretPos);
    e.target.setSelectionRange(caretPos, caretPos);
  }

  amountInput.addEventListener('input', formatCurrency);

  // Auto select Custom card when focusing input
  amountInput.addEventListener('focus', () => {
    document.getElementById('custom').checked = true;
    document.querySelectorAll('.currency-symbol').forEach(el => el.style.opacity = 1);
  });

  // Format on blur
  amountInput.addEventListener('blur', (e) => {
    let numericValue = e.target.value.replace(/,/g, '');
    if (numericValue !== '') {
      let val = parseCurrency(numericValue);
      if (val < 1) { numericValue = '1.00'; }
    }

    if (numericValue && !isNaN(numericValue)) {
      let formatted = parseCurrency(numericValue).toFixed(2)
        .replace(/\d(?=(\d{3})+\.)/g, '$&,');
      e.target.value = formatted;
    }

    if (!e.target.value) {
      document.querySelectorAll('.currency-symbol').forEach(el => el.style.opacity = 0);
    }
  });
}

// ---------------- Data Loading ----------------
let currentPage = 1;
let perPage = 10;
let totalPages = 1;

async function loadData(page = 1) {
  const url = `${API_BASE_URL}?action=query-records&per_page=${perPage}&page=${page}`;
  try {
    const res = await fetch(url);
    const result = await res.json();
    const data = result.rows || [];
    totalPages = result.total_pages || 1;
    currentPage = result.page || page;

    const tbody = document.querySelector("#recordsTable tbody");
    tbody.innerHTML = "";

    data.forEach(r => {
      const { dayStr, timeHint } = formatDateDay(r.mc_time);
      const grossStr = new Intl.NumberFormat("en-US", { style: "currency", currency: r.currency }).format(r.mc_gross);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span role="button" data-bs-toggle="tooltip" title="${timeHint}">${dayStr}</span></td>
        <td>${maskName(r.contrib_name, r.currency)}</td>
        <td><strong>${grossStr}</strong></td>
        <td>${channelName(r.channel)}</td>
        <td>${r.memo ?? ""}</td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById("pageInfo").textContent = `(${currentPage}/${totalPages})`;
  } catch (err) {
    console.error("Failed to load records:", err);
    showToast("Failed to load records", "danger");
  }
}

async function loadWalletData() {
  const url = `${API_BASE_URL}?action=query-wallet&oss_id=axmol&currency=USD`;
  try {
    const res = await fetch(url);
    const result = await res.json();
    if (result.ret === 0 && result.wallet_info) {
      const wallet = result.wallet_info;
      document.getElementById("usdBalance").textContent = `$${wallet.balance}`;
      document.getElementById("usdTotalRaised").textContent = `$${wallet.total_raised}`;
      document.getElementById("usdTotalSpent").textContent = `$${wallet.total_spent}`;
      document.getElementById("usdTotalFees").textContent = `$${wallet.total_fees}`;
      const total_contributed = (parseFloat(wallet.total_raised) + parseFloat(wallet.total_fees)).toFixed(2);
      document.getElementById("usdTotalRaisedTooltip").setAttribute("data-bs-original-title", `Total contributed before fees: $${total_contributed}`);
      const { timeHint } = formatDateDay(wallet.last_updated);
      document.getElementById("usdWalletTooltip").setAttribute("data-bs-original-title", `Last updated:\n ${timeHint}`);
    }
  } catch (err) {
    console.error("Failed to load wallet data:", err);
  }
}

// ---------------- Init ----------------
document.addEventListener("DOMContentLoaded", () => {
  initEventHandlers();
  loadData();
  loadWalletData();
});
