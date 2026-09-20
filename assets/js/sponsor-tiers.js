(() => {
  const maxIndividualAmount = 500;
  const paypalProducts = { 5: "s101", 25: "s102", 50: "s103", 100: "s104", 250: "s105" };
  const i18nConfig = document.getElementById("axmol-i18n-config");
  const text = JSON.parse(i18nConfig?.textContent || "{}");
  const format = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
  const qrChannels = {
    alipay: {
      name: text.alipay,
      image: "/assets/img/alipay.jpg",
      alt: text.alipayAlt
    },
    wechat: {
      name: text.wechat,
      image: "/assets/img/wxpay.jpg",
      alt: text.wechatAlt
    }
  };
  const githubUrl = (amount, monthly = true) => `https://github.com/sponsors/axmolengine/sponsorships?preview=false&frequency=${monthly ? "recurring" : "one-time"}&amount=${amount}`;

  const oscUrl = (amount, monthly = true) => `https://opencollective.com/axmol/contribute/backers-69887/checkout?interval=${monthly ? "month" : "oneTime"}&amount=${amount}&contributeAs=me&opensourcePlatformTipAb=true`;

  const showAmountLimitNotice = (input) => {
    const modalElement = document.getElementById("commonModal");
    const title = document.getElementById("commonModalTitle");
    const body = document.getElementById("commonModalBody");
    const footer = document.getElementById("commonModalFooter");
    const message = format(text.limitMessage, { amount: maxIndividualAmount });

    if (!modalElement || !title || !body || !footer || !window.bootstrap?.Modal) {
      window.alert(message);
      input?.focus();
      return;
    }

    title.textContent = text.limitTitle;
    body.textContent = message;
    footer.replaceChildren();

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "btn btn-primary";
    closeButton.dataset.bsDismiss = "modal";
    closeButton.textContent = text.ok;
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
        channelHelp.textContent = qr ? text.qrHelp : format(text.tierHelp, { amount: maxIndividualAmount });
      }
      if (!qr) return;
      qrTitle.textContent = qr.name;
      qrImage.src = qr.image;
      qrImage.alt = qr.alt;
      qrOpenButtons.forEach((button) => button.setAttribute("aria-label", format(text.enlarge, { name: qr.name })));
      if (qrInstruction) qrInstruction.textContent = text.qrHelp;
      if (qrNote) qrNote.textContent = text.note;
      if (qrModalTitle) qrModalTitle.textContent = format(text.qrTitle, { name: qr.name });
      if (qrModalImage) {
        qrModalImage.src = qr.image;
        qrModalImage.alt = qr.alt;
      }
      if (qrModalInstruction) qrModalInstruction.textContent = text.qrHelp;
      if (qrModalNote) qrModalNote.textContent = text.note;
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
