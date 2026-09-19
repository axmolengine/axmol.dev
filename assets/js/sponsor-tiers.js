(() => {
  const maxIndividualAmount = 500;
  const paypalProducts = { 5: "s101", 25: "s102", 50: "s103", 100: "s104", 250: "s105" };
  const isChinese = document.documentElement.lang.toLowerCase().startsWith("zh");
  const qrChannels = {
    alipay: {
      name: isChinese ? "支付宝" : "Alipay",
      image: "/assets/img/alipay.jpg",
      alt: isChinese ? "支付宝赞助二维码" : "Alipay sponsorship QR code"
    },
    wechat: {
      name: isChinese ? "微信支付" : "WeChat Pay",
      image: "/assets/img/wxpay.jpg",
      alt: isChinese ? "微信支付赞助二维码" : "WeChat Pay sponsorship QR code"
    }
  };
  const githubUrl = (amount, monthly = true) => `https://github.com/sponsors/axmolengine/sponsorships?preview=false&frequency=${monthly ? "recurring" : "one-time"}&amount=${amount}`;

  const oscUrl = (amount, monthly = true) => `https://opencollective.com/axmol/contribute/backers-69887/checkout?interval=${monthly ? "month" : "oneTime"}&amount=${amount}&contributeAs=me&opensourcePlatformTipAb=true`;

  const showAmountLimitNotice = (input) => {
    const modalElement = document.getElementById("commonModal");
    const title = document.getElementById("commonModalTitle");
    const body = document.getElementById("commonModalBody");
    const footer = document.getElementById("commonModalFooter");
    const message = isChinese
      ? `个人赞助金额最高为 USD ${maxIndividualAmount}。请调整金额后重试。`
      : `Individual sponsorship is limited to USD ${maxIndividualAmount}. Please adjust the amount and try again.`;

    if (!modalElement || !title || !body || !footer || !window.bootstrap?.Modal) {
      window.alert(message);
      input?.focus();
      return;
    }

    title.textContent = isChinese ? "赞助金额提示" : "Sponsorship amount limit";
    body.textContent = message;
    footer.replaceChildren();

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "btn btn-primary";
    closeButton.dataset.bsDismiss = "modal";
    closeButton.textContent = isChinese ? "知道了" : "OK";
    footer.append(closeButton);

    modalElement.addEventListener("hidden.bs.modal", () => input?.focus(), { once: true });
    window.bootstrap.Modal.getOrCreateInstance(modalElement).show();
  };

  document.querySelectorAll("[data-sponsor-tiers]").forEach((tierGrid) => {
    const channelSelect = tierGrid.parentElement?.querySelector("[data-sponsor-channel]");
    const channelHelp = tierGrid.parentElement?.querySelector("[data-sponsor-channel-help]");
    const qrPanel = tierGrid.parentElement?.querySelector("[data-sponsor-qr-panel]");
    const qrTitle = qrPanel?.querySelector("[data-sponsor-qr-title]");
    const qrImage = qrPanel?.querySelector("[data-sponsor-qr-image]");
    const qrOpenButtons = qrPanel?.querySelectorAll("[data-sponsor-qr-open]") || [];
    const qrModal = document.getElementById("sponsorQrModal");
    const qrModalTitle = qrModal?.querySelector("[data-sponsor-qr-modal-title]");
    const qrModalImage = qrModal?.querySelector("[data-sponsor-qr-modal-image]");
    const qrInstruction = qrPanel?.querySelector("[data-sponsor-qr-instruction]");
    const qrNote = qrPanel?.querySelector("[data-sponsor-qr-note]");
    const qrModalInstruction = qrModal?.querySelector("[data-sponsor-qr-modal-instruction]");
    const qrModalNote = qrModal?.querySelector("[data-sponsor-qr-modal-note]");
    const channel = () => channelSelect?.value || "paypal";

    const updateQrPanel = () => {
      const qr = qrChannels[channel()];
      if (!qrPanel || !tierGrid) return;
      qrPanel.hidden = !qr;
      tierGrid.hidden = Boolean(qr);
      if (channelHelp) {
        channelHelp.textContent = qr
          ? (isChinese ? "扫码后请在支付 App 内输入任意金额。" : "Scan the QR code and enter any amount in your payment app.")
          : (isChinese
            ? `选择支付通道和赞助金额。PayPal、GitHub Sponsors 和 OSC 的个人赞助上限为 USD ${maxIndividualAmount}。`
            : `Choose a payment channel and contribution amount. Individual sponsorship through PayPal, GitHub Sponsors, and OSC is limited to USD ${maxIndividualAmount}.`);
      }
      if (!qr) return;
      qrTitle.textContent = qr.name;
      qrImage.src = qr.image;
      qrImage.alt = qr.alt;
      qrOpenButtons.forEach((button) => button.setAttribute("aria-label", isChinese ? `放大${qr.name}二维码` : `Enlarge ${qr.name} QR code`));
      if (qrInstruction) qrInstruction.textContent = isChinese
        ? "扫码后，请在支付 App 内输入任意金额。"
        : "Scan the QR code and enter any amount in your payment app.";
      if (qrNote) qrNote.textContent = isChinese ? "请备注：赞助 Axmol" : "Please add the note: Sponsor Axmol";
      if (qrModalTitle) qrModalTitle.textContent = isChinese ? `${qr.name}二维码` : `${qr.name} QR code`;
      if (qrModalImage) {
        qrModalImage.src = qr.image;
        qrModalImage.alt = qr.alt;
      }
      if (qrModalInstruction) qrModalInstruction.textContent = isChinese
        ? "扫码后，请在支付 App 内输入任意金额。"
        : "Scan the QR code and enter any amount in your payment app.";
      if (qrModalNote) qrModalNote.textContent = isChinese ? "请备注：赞助 Axmol" : "Please add the note: Sponsor Axmol";
    };

    channelSelect?.addEventListener("change", updateQrPanel);
    qrOpenButtons.forEach((button) => button.addEventListener("click", () => {
      if (!qrModal || !window.bootstrap?.Modal) return;
      window.bootstrap.Modal.getOrCreateInstance(qrModal).show();
    }));
    updateQrPanel();

    const submitPaypal = (amount, monthly) => {
      const sandbox = window.location.hostname.startsWith("local.") || window.location.hostname.startsWith("test.");
      const form = document.getElementById("unipayment");
      if (!form) return;
      form.action = `https://${sandbox ? "local.simdsoft.com" : "simdsoft.com"}/onlinepay/uniorder.php`;
      const fields = {
        WIDout_trade_no: typeof window.genOrderId === "function" ? window.genOrderId() : (window.crypto?.randomUUID?.().replaceAll("-", "") || `${Date.now()}${Math.random().toString(36).slice(2)}`),
        WIDprod: paypalProducts[amount] || "custom",
        WIDamount: amount.toString(), WIDsponsor: "Axmol", WIDchannel: "3", WIDmonthly: monthly ? "1" : "0",
        WIDlang: document.getElementById("WIDlang")?.value || "en"
      };
      Object.entries(fields).forEach(([name, value]) => { document.getElementById(name).value = value; });
      form.submit();
    };

    tierGrid.querySelectorAll("[data-tier-amount]").forEach((tier) => {
      tier.addEventListener("click", () => {
        if (qrChannels[channel()]) return;
        let amount = tier.dataset.tierAmount;
        let monthly = true;
        if (amount === "custom") {
          const input = tierGrid.querySelector("[data-custom-amount]");
          const monthlyInput = tierGrid.querySelector("[data-custom-monthly]");
          amount = input?.value.trim();
          const numericAmount = Number(amount);
          if (numericAmount > maxIndividualAmount) {
            showAmountLimitNotice(input);
            return;
          }
          if (!amount || numericAmount < 1) {
            input?.focus();
            return;
          }
          monthly = monthlyInput?.checked ?? true;
        }
        if (channel() === "paypal") submitPaypal(amount, monthly);
        else if (channel() === "osc") window.open(oscUrl(amount, monthly), "_blank", "noopener");
        else window.open(githubUrl(amount, monthly), "_blank", "noopener");
      });
    });

    tierGrid.querySelectorAll("[data-custom-amount]").forEach((input) => {
      const wrapper = input.closest(".custom-tier-input-wrap");
      const updateState = () => wrapper?.classList.toggle("has-value", input.value.trim() !== "");
      input.addEventListener("input", updateState);
      input.addEventListener("blur", () => {
        const value = Number(input.value);
        if (Number.isFinite(value) && value > 0 && value <= maxIndividualAmount) input.value = value.toFixed(2);
        updateState();
      });
      updateState();
    });
  });
})();
