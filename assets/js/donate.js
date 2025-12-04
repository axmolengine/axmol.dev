// Define constant for individual sponsorship limit
const INDIVIDUAL_MAX_AMOUNT = 500;


// Individual tiers mapping
const individualTiers = {
  t01: { prod_id: "d101", title: "Backer", amount: 5 },
  t02: { prod_id: "d102", title: "Bronze", amount: 25 },
  t03: { prod_id: "d103", title: "Silver", amount: 50 },
  t04: { prod_id: "d104", title: "Gold", amount: 100 },
  t05: { prod_id: "d105", title: "Platinum", amount: 250 }
  // Reserved Diamond: { prod_id: "d106", title: "Diamond", amount: 500 }
};

// Corporate tiers mapping
const corporateTiers = {
  t01: { prod_id: "d1001", title: "Bronze", amount: 128, osc_teir: 'sponsors-69888' },
  t02: { prod_id: "d1002", title: "Silver", amount: 256, osc_teir: 'silver-96259' },
  t03: { prod_id: "d1003", title: "Gold", amount: 1000, osc_teir: 'gold-96260' },
  t04: { prod_id: "d1004", title: "Platinum", amount: 3000, osc_teir: 'platinum-96261' },
  t05: { prod_id: "d1005", title: "Diamond", amount: 6000, osc_teir: 'diamond-96262' }
};

const VALID_CHANNELS = new Map([
  ["paypal", "PayPal"],
  ["github", "GitHub Sponsors"],
  ["osc", "Open Source Collective"]
]);

// Unified amount validation function
function verifyDonateInput(amount, sponsor_channel, is_corporate, trigger, on_verified) {
  const channelSelect = document.getElementById("channel-options");
  const channel = channelSelect ? channelSelect.value : "";

  const value = parseCurrency(amount);

  const modal_options = { triggerEl: trigger };

  // Empty check
  if (!amount || amount.trim() === "") {
    showModal("Missing Amount", "Please input amount before confirming sponsorship.", modal_options);
    return;
  }

  // Must be >= 1
  if (isNaN(value) || value < 1) {
    showModal("Invalid Amount", "Please enter a valid amount greater than 0.", modal_options);
    return;
  }

  if (!VALID_CHANNELS.has(sponsor_channel)) {
    showModal("Invalid Channel", `Unsupported sponsor channel: ${sponsor_channel}`, modal_options);
    return;
  }

  // Limit check
  if (!(is_corporate && channel === "osc") && value > INDIVIDUAL_MAX_AMOUNT) {
    if (is_corporate) {
      const modalEl = document.getElementById("channelWarning");

      const bodyEl = modalEl.querySelector(".modal-body");
      bodyEl.innerHTML = `
        For corporate sponsorships <strong>&gt; USD$${INDIVIDUAL_MAX_AMOUNT}</strong>,
        we recommend using <strong>Open Source Collective</strong> for transparency and compliance.<br>
        PayPal/GitHub are intended for individual backers and not suitable for large payments.
      `;

      modalEl.dataset.triggerId = trigger.id;

      const modal = new bootstrap.Modal(modalEl);

      modalEl.querySelector(".btn-secondary").onclick = () => {
        modal.hide();
        modalEl.addEventListener("hidden.bs.modal", () => {
          if (typeof on_verified === "function") on_verified(sponsor_channel);
        }, { once: true });
      };

      modalEl.querySelector(".btn-primary").onclick = () => {
        if (channelSelect) {
          channelSelect.value = "osc";
          showToast('Channel switched to Open Source Collective.', 'info');
        }
        modal.hide();
        modalEl.addEventListener("hidden.bs.modal", () => {
          if (typeof on_verified === "function") on_verified("osc");
        }, { once: true });
      };

      modal.show();
    } else {
      showModal(
        "Limit Exceeded",
        `Individual sponsorship cannot exceed USD$${INDIVIDUAL_MAX_AMOUNT}. Please adjust your amount.`,
        modal_options
      );
    }
    return;
  }

  // verified
  if (typeof on_verified === "function") {
    on_verified(sponsor_channel);
  }
}

/**
 * Parse currency string like "USD$5,220.33" into number
 * Supports currency symbols, thousand separators, and decimals
 */
function parseCurrency(input) {
  if (!input) return NaN;

  // Remove everything except digits, comma, and dot
  const cleaned = input.replace(/[^0-9.,]/g, "");

  // Remove commas (thousand separators)
  const normalized = cleaned.replace(/,/g, "");

  // Convert to float
  const value = parseFloat(normalized);

  return isNaN(value) ? NaN : value
}

const amountInput = document.getElementById('amount-input');
amountInput.addEventListener('input', formatCurrency);

function formatCurrency(e) {
  let caretPos = e.target.selectionStart;
  const originalLen = e.target.value.length;

  let value = e.target.value
    .replace(/[^0-9.]/g, '')
    .replace(/(\..*)\./g, '$1')
    .replace(/(\.\d{2}).*/g, '$1')
    .replace(/^0+(\d)/, '$1');

  let [integer, decimal] = value.split('.');
  decimal = decimal ? '.' + decimal.slice(0, 2) : '';

  if (integer) {
    integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  const newValue = (integer || '0') + (decimal || '');
  e.target.value = newValue;
  const newLen = newValue.length;
  caretPos = newLen - (originalLen - caretPos);
  e.target.setSelectionRange(caretPos, caretPos);
}

amountInput.addEventListener('focus', (e) => {
  document.getElementById('custom').checked = true;
  document.querySelectorAll('.currency-symbol').forEach(el => el.style.opacity = 1);
});

amountInput.addEventListener('blur', (e) => {
  let numericValue = e.target.value.replace(/,/g, '');
  if (numericValue != '') {
    let val = parseCurrency(numericValue);
    if (val < 1) { numericValue = '1.00'; }
  }

  if (numericValue && !isNaN(numericValue)) {
    let formatted = parseCurrency(numericValue).toFixed(2)
      .replace(/\d(?=(\d{3})+\.)/g, '$&,');

    const [integerPart, decimalPart] = formatted.split('.');
    e.target.value = `${integerPart.replace(/,/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${decimalPart}`;
  }

  if (!e.target.value) {
    document.querySelectorAll('.currency-symbol').forEach(el => el.style.opacity = 0);
  }
});


const sandbox = window.location.host.includes('local.') || window.location.host.includes('test.');

document.querySelector('#confirm-btn').addEventListener('click', (e) => {
  e.preventDefault();

  // selected sponosr teir card
  const selected = document.querySelector('input[name="sponsor"]:checked');

  if (selected) {
    const is_custom = selected.id === 'custom';
    const amount_str = is_custom
      ? document.querySelector('.amount-input').value
      : selected.value;

    const is_monthly = is_custom
      ? document.querySelector('input[name="custom-cycle"]:checked').value === 'monthly'
      : true;

    const is_corporate = document.getElementById("btn-corporate-tiers").classList.contains("active");
    const channel = document.getElementById("channel-options").value;
    verifyDonateInput(amount_str, channel, is_corporate, e.currentTarget, (verified_channel) => {
      if ((window.cv_sel_amount !== amount_str) || (window.cv_is_mouthly !== is_monthly)) {
        window.cv_sel_amount = amount_str;
        window.cv_is_mouthly = is_monthly;
        window.cv_orderid = genOrderId();
      }

      console.log(`Amount: $${amount_str}${is_monthly ? '/month' : ''}`);

      const amount = parseCurrency(amount_str);
      const teir_info = is_corporate ? corporateTiers[selected.id] : individualTiers[selected.id];

      if (verified_channel == 'paypal') {
        let baseUrl = !sandbox ? 'simdsoft.com' : 'local.simdsoft.com';
        const actionUrl = `https://${baseUrl}/onlinepay/uniorder.php`;
        var form = $('#unipayment');
        form.attr('action', actionUrl);
        form.children('#WIDprod').attr('value', teir_info.prod_id);
        form.children('#WIDout_trade_no').attr('value', window.cv_orderid);
        form.children('#WIDmonthly').attr('value', is_monthly ? '1' : '0');
        form.children('#WIDamount').attr('value', amount.toString());
        form.submit();
      }
      else if (verified_channel == 'github') {
        const gh_freq = is_monthly ? 'recurring' : 'one-time';
        const actionUrl = `https://github.com/sponsors/axmolengine/sponsorships?preview=false&frequency=${gh_freq}&amount=${amount}`;
        window.open(actionUrl, '_blank');
      }
      else if (verified_channel == 'osc') {
        let actionUrl = '#';
        if (is_corporate) {
          if (is_monthly) {
            const osc_teir = teir_info.osc_teir;
            isPresetTeir = true;
            actionUrl = `https://opencollective.com/axmol/contribute/${osc_teir}/checkout?interval=month&amount=${amount}&contributeAs=me`;
          }
        }
        else {
          if (is_monthly) {
            isPresetTeir = true;
            actionUrl = `https://opencollective.com/axmol/contribute/backers-69887/checkout?interval=month&amount=${amount}&contributeAs=me`;
          }
        }
        if (actionUrl == '#') { // means no preset teir, use osc custom card
          const osc_interval = is_monthly ? 'month' : 'oneTime';
          actionUrl = `https://opencollective.com/axmol/donate?interval=${osc_interval}&amount=${amount}&contributeAs=me`;
        }
        window.open(actionUrl, '_blank');
      }
    });
  } else {
    showModal("Missing Tier", "Please select a tier before confirming sponsorship.", { triggerEl: e.currentTarget });
  }
});

// sponsor transactions
const API_BASE_URL = !sandbox ? "https://portal.simdsoft.com/sponsors/" : "https://local.simdsoft.com/sponsors/";
let currentPage = 1;
let perPage = 10;
let totalPages = 1;

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

function formatAmountAndTootip(r) {

  const grossStr = formatAmount(r.mc_gross, r.currency);
  const feeStr = formatAmount(r.mc_fee, r.currency);
  const hostFeeStr = formatAmount(r.host_fee, r.currency);

  let parts = [];

  // First line: only show processor fee part if > 0
  if (r.mc_fee != 0) {
    parts.push(`${grossStr} - ${feeStr} (payment processor fee)`);
  } else {
    parts.push(grossStr);
  }

  // Extra lines: only include if > 0
  if (r.mc_fee != 0) {
    parts.push(`This transaction includes ${feeStr} payment processor fees`);
  }
  if (r.host_fee != 0) {
    parts.push(`This transaction includes ${hostFeeStr} host fees`);
  }

  let amountTooltip = parts.join("\n");
  return { grossStr, amountTooltip };
}

function formatDateDay(ts) {
  const d = new Date(ts * 1000);

  // Fixed display: e.g. "1/25/2025"
  const dayStr = d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });

  // Tooltip: Local time with weekday + timezone
  const localStr = d.toLocaleString("en-US", {
    weekday: "short",   // e.g. "Sat"
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short"   // e.g. "GMT+8"
  });

  // Tooltip: UTC time with weekday + timezone
  const utcStr = d.toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
    timeZoneName: "short"   // will show "UTC"
  });

  const timeHint = `Local Time: ${localStr}&#10;UTC Time: ${utcStr}`;
  return { dayStr, timeHint };
}

function formatAmount(value, currency) {
  if (value == null) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Mask sponsor name with a single asterisk, always showing the last character.
 * - If length = 1: show char + "*"
 * - If length = 2: show first + "*" (last still visible)
 * - If length >= 3: show first + "*" + last
 */
function maskName(name, currency) {
  if (currency != 'CNY') return name;
  if (!name) return "";

  const chars = Array.from(name); // handle UTF-8 safely
  const len = chars.length;

  if (len === 1) {
    // Single character: append "*"
    return chars[0] + "*";
  } else if (len === 2) {
    // Two characters: show first + "*" + last
    return chars[0] + "*" + chars[1];
  } else {
    // Three or more: show first + "*" + last
    return chars[0] + "*" + chars[len - 1];
  }
}

async function loadData(page = 1) {
  const url = `${API_BASE_URL}?action=query-records&per_page=${perPage}&page=${page}`;
  const res = await fetch(url);
  const result = await res.json();

  const data = result.rows || [];
  totalPages = result.total_pages || 1;
  currentPage = result.page || page;

  const tbody = document.querySelector("#recordsTable tbody");
  tbody.innerHTML = "";

  data.forEach(r => {
    const { dayStr, timeHint } = formatDateDay(r.mc_time);
    const { grossStr, amountTooltip } = formatAmountAndTootip(r);

    const tr = document.createElement("tr");
    if (amountTooltip) {
      tr.innerHTML = `
        <td><span role="button" data-bs-toggle="tooltip" data-bs-placement="right" title="${timeHint}">${dayStr}</span></td>
        <td>${maskName(r.contrib_name, r.currency)}</td>
        <td><span role="button" data-bs-toggle="tooltip" data-bs-placement="right" title="${amountTooltip}"><strong>${grossStr}</strong>&nbsp;<svg class="bi"
                  fill="currentColor"><use href="/assets/icons.svg#info-circle"></use></svg></span></td>
        <td>${channelName(r.channel)}</td>
        <td>${r.memo ?? ""}</td>
      `;
    } else {
      tr.innerHTML = `
      <td><span role="button" data-bs-toggle="tooltip" data-bs-placement="right" title="${timeHint}">${dayStr}</span></td>
      <td>${maskName(r.contrib_name, r.currency)}</td>
      <td><strong>${grossStr}</strong></td>
      <td>${channelName(r.channel)}</td>
      <td>${r.memo ?? ""}</td>
      `;
    }
    tbody.appendChild(tr);
  });

  document.getElementById("pageInfo").textContent = `(${currentPage}/${totalPages})`;
}

// Handle Previous button click
document.getElementById("prevBtn").addEventListener("click", () => {
  if (currentPage > 1) {
    loadData(currentPage - 1);
  } else {
    showToast('Already on the first page', 'info');
  }
});

// Handle Next button click
document.getElementById("nextBtn").addEventListener("click", () => {
  if (currentPage < totalPages) {
    loadData(currentPage + 1);
  } else {
    showToast('Already on the last page', 'info');
  }
});

// Handle per-page selection change
document.getElementById("perPageSelect").addEventListener("change", (e) => {
  perPage = parseInt(e.target.value, 10);
  loadData(1);
});

// Initial load
loadData();

async function loadWalletData() {
  // Construct the API URL with query parameters
  const url = `${API_BASE_URL}?action=query-wallet&oss_id=axmol&currency=USD`;

  try {
    // Send request to backend
    const res = await fetch(url);
    const result = await res.json();

    // Check if response is successful
    if (result.ret === 0 && result.wallet_info) {
      const wallet = result.wallet_info;

      // Update DOM elements with wallet data
      document.getElementById("usdBalance").textContent = `$${wallet.balance}`;
      document.getElementById("usdTotalRaised").textContent = `$${wallet.total_raised}`;
      document.getElementById("usdTotalSpent").textContent = `$${wallet.total_spent}`;
      document.getElementById("usdTotalFees").textContent = `$${wallet.total_fees}`;

      const total_contributed = (parseFloat(wallet.total_raised) + parseFloat(wallet.total_fees)).toFixed(2);
      const newTitle = `Total net amount available to spend after fees.\nTotal contributed before fees: $${total_contributed}, it's often appears higher than the amount shown on OpenCollective, since OpenCollective reports figures after Stripe transaction fees are deducted.`;
      document.getElementById("usdTotalRaisedTooltip").setAttribute("data-bs-original-title", newTitle);

      const { _, timeHint } = formatDateDay(wallet.last_updated);
      document.getElementById("usdWalletTooltip").setAttribute("data-bs-original-title", `The current balance, last updated on:\n ${timeHint}`);
    } else {
      console.warn("Wallet data not available or ret != 0");
    }
  } catch (error) {
    // Handle network or parsing errors
    console.error("Failed to load wallet data:", error);
  }
}

loadWalletData();

//// ---------------- Sponsor Teir Type and Sponsor Channel control

document.addEventListener("DOMContentLoaded", function () {
  const btnIndividual = document.getElementById("btn-individual-tiers");
  const btnCorporate = document.getElementById("btn-corporate-tiers");
  const channelSelect = document.getElementById("channel-options");

  // Update all sponsor cards based on mapping
  function updateTiers(dataMap) {
    // Step 1: record currently selected radio id
    const currentSelected = document.querySelector(".sponsor-radio:checked");
    const selectedId = currentSelected ? currentSelected.id : null;

    // Step 2: update card content
    Object.keys(dataMap).forEach(key => {
      const radio = document.getElementById(key); // card id is fixed (t01~t05)
      if (!radio) return;
      const tier = dataMap[key];
      const titleEl = radio.closest("label").querySelector(".tier-title");
      const priceEl = radio.closest("label").querySelector(".price");

      // Update radio attributes and card content
      radio.dataset.prod_id = tier.prod_id; // store sponsor id in data attribute
      radio.value = tier.amount;
      titleEl.textContent = tier.title;
      priceEl.textContent = `USD$${tier.amount}/month`;
    });

    // Step 3: restore previous selection if possible, otherwise select the first radio
    if (selectedId) {
      const restoredRadio = document.getElementById(selectedId);
      if (restoredRadio) {
        restoredRadio.checked = true;
      } else {
        const firstRadio = document.querySelector(".sponsor-radio");
        if (firstRadio) firstRadio.checked = true;
      }
    } else {
      const firstRadio = document.querySelector(".sponsor-radio");
      if (firstRadio) firstRadio.checked = true;
    }
  }

  // Switch to Individual tiers
  btnIndividual.addEventListener("click", () => {
    btnIndividual.classList.add("active");
    btnCorporate.classList.remove("active");
    updateTiers(individualTiers);
  });

  // Switch to Corporate tiers
  btnCorporate.addEventListener("click", () => {
    btnCorporate.classList.add("active");
    btnIndividual.classList.remove("active");
    updateTiers(corporateTiers);

    // Auto switch channel to OSC
    if (channelSelect && channelSelect.value != 'osc') {
      channelSelect.value = "osc";
      showToast("Channel automatically switched to Open Source Collective.", "info");
    }
  });

  // Channel change warning for Corporate mode
  channelSelect.addEventListener("change", (e) => {
    const channel = e.target.value;
    const isCorporate = btnCorporate.classList.contains("active");

    if (isCorporate && (channel === "paypal" || channel === "github")) {
      // Show Bootstrap modal warning
      const modalEl = document.getElementById("channelWarning");
      const modal = new bootstrap.Modal(modalEl);
      modalEl.dataset.triggerId = e.currentTarget.id;
      const bodyEl = modalEl.querySelector(".modal-body");
      bodyEl.innerHTML = `
        For corporate sponsorship, we recommend using <strong>Open Source
        Collective</strong>
        for transparency and compliance. PayPal/GitHub are intended for
        individual backers.
      `;
      modal.show();
    }
  });

  // handle focus when modal dlgs hide
  const modalDlgs = ['channelWarning', 'commonModal'];
  modalDlgs.forEach(name => {
    const modalEl = document.getElementById(name);
    if (!modalEl) return;

    // Store the trigger element when modal is shown
    modalEl.addEventListener("show.bs.modal", event => {
      // Bootstrap passes the trigger element in event.relatedTarget
      modalEl.removeAttribute("inert");
    });

    // Restore focus to the trigger element when modal is about to hide
    modalEl.addEventListener("hide.bs.modal", () => {
      const triggerId = modalEl.dataset.triggerId;
      if (triggerId) {
        document.getElementById(triggerId)?.focus();
      }
    });

    // Disable interaction when modal is fully hidden
    modalEl.addEventListener("hidden.bs.modal", () => {
      modalEl.setAttribute("inert", "");
    });
  });

});

// Helper function to switch back to OSC from modal
function switchToOSC() {
  const channelSelect = document.getElementById("channel-options");
  if (channelSelect) {
    channelSelect.value = "osc";
    const modalEl = document.getElementById("channelWarning");
    bootstrap.Modal.getInstance(modalEl).hide();
    showToast('Channel switched to Open Source Collective.', 'info');
  }
}

// Toast factory function
function showToast(message, type = "primary") {
  // Create toast element dynamically
  const toastContainer = document.querySelector(".toast-container") || createToastContainer();
  const toastId = "toast-" + Date.now();

  const toastEl = document.createElement("div");
  toastEl.id = toastId;
  toastEl.className = `toast align-items-center text-bg-${type} border-0`;
  toastEl.setAttribute("role", "alert");
  toastEl.setAttribute("aria-live", "assertive");
  toastEl.setAttribute("aria-atomic", "true");

  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" 
        data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  toastContainer.appendChild(toastEl);

  // Show toast using Bootstrap API
  const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
  toast.show();

  // Auto remove after hidden
  toastEl.addEventListener("hidden.bs.toast", () => {
    toastEl.remove();
  });
}

// Show a common modal with dynamic content
function showModal(title, message, options = {}) {
  const modalTitle = document.getElementById("commonModalTitle");
  const modalBody = document.getElementById("commonModalBody");
  const modalFooter = document.getElementById("commonModalFooter");
  const modalEl = document.getElementById("commonModal");

  modalTitle.textContent = title;
  modalBody.innerHTML = message;
  modalFooter.innerHTML = "";

  if (!options.buttons || options.buttons.length === 0) {
    const defaultBtn = document.createElement("button");
    defaultBtn.type = "button";
    defaultBtn.className = "btn btn-primary";
    defaultBtn.setAttribute("data-bs-dismiss", "modal");
    defaultBtn.textContent = "OK";
    modalFooter.appendChild(defaultBtn);
  } else {
    options.buttons.forEach(btn => {
      const buttonEl = document.createElement("button");
      buttonEl.type = "button";
      buttonEl.className = `btn ${btn.class || "btn-secondary"}`;
      if (btn.dismiss) {
        buttonEl.setAttribute("data-bs-dismiss", "modal");
      }
      buttonEl.textContent = btn.text;
      if (typeof btn.onClick === "function") {
        buttonEl.addEventListener("click", btn.onClick);
      }
      modalFooter.appendChild(buttonEl);
    });
  }

  // Store trigger element if provided
  if (options.triggerEl) {
    modalEl.dataset.triggerId = options.triggerEl.id || "";
  }

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

