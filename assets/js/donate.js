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

        let sandbox = window.location.host.includes('local');

        console.log(`Amount: $${amount}${isMonthly ? '/month' : ''}`);

        let baseUrl = !sandbox ? 'simdsoft.com' : 'local.simdsoft.com';
        let actionUrl = `https://${baseUrl}/onlinepay/unipay.php`;

        var form = $('#unipayment');
        form.attr('action', actionUrl);
        form.children('#WIDbtype').attr('value', selected.id);
        form.children('#WIDout_trade_no').attr('value', window.cv_orderid);
        form.children('#WIDmonthly').attr('value', isMonthly ? '1' : '0');
        form.children('#WIDamount').attr('value', amount.toString());
        form.submit();
    } else {
        window.alert('Please select a tier!');
    }
});
