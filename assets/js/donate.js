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
        let val = parseFloat(numericValue);
        if (val < 1) { numericValue = '1.00'; }
    }

    if (numericValue && !isNaN(numericValue)) {
        let formatted = parseFloat(numericValue).toFixed(2)
            .replace(/\d(?=(\d{3})+\.)/g, '$&,');

        const [integerPart, decimalPart] = formatted.split('.');
        e.target.value = `${integerPart.replace(/,/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${decimalPart}`;
    }

    if (!e.target.value) {
        document.querySelectorAll('.currency-symbol').forEach(el => el.style.opacity = 0);
    }
});


const sandbox = window.location.host.includes('local');

document.querySelector('.submit-btn').addEventListener('click', () => {
    const selected = document.querySelector('input[name="sponsor"]:checked');
    const isMonthly = document.getElementById('monthly').checked;

    if (selected) {
        const amount = selected.id === 'custom'
            ? document.querySelector('.amount-input').value
            : selected.value;

        if (amount == '') {
            window.alert('Please input amount!');
            return;
        }

        if ((window.cv_sel_amount !== amount) || (window.cv_is_mouthly !== isMonthly)) {
            window.cv_sel_amount = amount;
            window.cv_is_mouthly = isMonthly;
            window.cv_orderid = genOrderId();
        }

        console.log(`Amount: $${amount}${isMonthly ? '/month' : ''}`);

        const f_amount = parseFloat(amount);
        const paypal_fee = (0.043 * f_amount) + 0.30;
        const gh_fee = 0.10 * f_amount;

        if (paypal_fee < gh_fee) {
          let baseUrl = !sandbox ? 'simdsoft.com' : 'local.simdsoft.com';
          const actionUrl = `https://${baseUrl}/onlinepay/uniorder.php`;
          var form = $('#unipayment');
          form.attr('action', actionUrl);
          form.children('#WIDprod').attr('value', selected.id);
          form.children('#WIDout_trade_no').attr('value', window.cv_orderid);
          form.children('#WIDmonthly').attr('value', isMonthly ? '1' : '0');
          form.children('#WIDamount').attr('value', amount.toString());
          form.submit();
        }
        else {
          const gh_freq = isMonthly ?  'recurring' : 'one-time';
          const actionUrl = `https://github.com/sponsors/axmolengine/sponsorships?preview=false&frequency=${gh_freq}&amount=${amount}`;
          window.open(actionUrl, '_blank');
        }
    } else {
        window.alert('Please select a tier!');
    }
});

// sponsor transactions
const API_URL = !sandbox ? "https://portal.simdsoft.com/sponsors/?action=query" : "https://local.simdsoft.com/sponsors/?action=query";
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

  const tooltip = `Local Time: ${localStr}\nUTC: ${utcStr}`;
  return { dayStr, tooltip };
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
  const url = `${API_URL}&per_page=${perPage}&page=${page}`;
  const res = await fetch(url);
  const result = await res.json();

  const data = result.rows || [];
  totalPages = result.total_pages || 1;
  currentPage = result.page || page;

  const tbody = document.querySelector("#recordsTable tbody");
  tbody.innerHTML = "";

  data.forEach(r => {
    const { dayStr, tooltip } = formatDateDay(r.mc_time);
    const { grossStr, amountTooltip } = formatAmountAndTootip(r);

    const tr = document.createElement("tr");
    if (amountTooltip) {
      tr.innerHTML = `
        <td title="${tooltip}">${dayStr}</td>
        <td>${maskName(r.contrib_name, r.currency)}</td>
        <td>${channelName(r.channel)}</td>
        <td class="amount" title="${amountTooltip}"><span title="${amountTooltip}">ℹ️</span><strong>${grossStr}</strong></td>
        <td>${r.memo ?? ""}</td>
      `;
    } else {
      tr.innerHTML = `
      <td title="${tooltip}">${dayStr}</td>
      <td>${maskName(r.contrib_name, r.currency)}</td>
      <td>${channelName(r.channel)}</td>
      <td class="amount"><strong>${grossStr}</strong></td>
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
    alert("Already on the first page");
  }
});

// Handle Next button click
document.getElementById("nextBtn").addEventListener("click", () => {
  if (currentPage < totalPages) {
    loadData(currentPage + 1);
  } else {
    alert("Already on the last page");
  }
});

// Handle per-page selection change
document.getElementById("perPageSelect").addEventListener("change", (e) => {
  perPage = parseInt(e.target.value, 10);
  loadData(1);
});

// Initial load
loadData();
