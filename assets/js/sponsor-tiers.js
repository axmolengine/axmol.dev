(() => {
  const maxIndividualAmount = 500;
  const paypalProducts = { 5: "s101", 25: "s102", 50: "s103", 100: "s104", 250: "s105" };
  const locale = document.documentElement.lang.toLowerCase().split("-")[0];
  const sponsorText = {
    en: {
      alipay: "Alipay", wechat: "WeChat Pay",
      alipayAlt: "Alipay sponsorship QR code", wechatAlt: "WeChat Pay sponsorship QR code",
      limitMessage: (amount) => `Individual sponsorship is limited to USD ${amount}. Please adjust the amount and try again.`,
      limitTitle: "Sponsorship amount limit", ok: "OK",
      qrHelp: "Scan the QR code and enter any amount in your payment app.",
      tierHelp: (amount) => `Choose a payment channel and contribution amount. Individual sponsorship through PayPal, GitHub Sponsors, and OSC is limited to USD ${amount}.`,
      enlarge: (name) => `Enlarge ${name} QR code`,
      note: "Please add the note: Sponsor Axmol",
      qrTitle: (name) => `${name} QR code`
    },
    zh: {
      alipay: "支付宝", wechat: "微信支付",
      alipayAlt: "支付宝赞助二维码", wechatAlt: "微信支付赞助二维码",
      limitMessage: (amount) => `个人赞助金额最高为 USD ${amount}。请调整金额后重试。`,
      limitTitle: "赞助金额提示", ok: "知道了",
      qrHelp: "扫码后，请在支付 App 内输入任意金额。",
      tierHelp: (amount) => `选择支付通道和赞助金额。PayPal、GitHub Sponsors 和 OSC 的个人赞助上限为 USD ${amount}。`,
      enlarge: (name) => `放大${name}二维码`,
      note: "请备注：赞助 Axmol",
      qrTitle: (name) => `${name}二维码`
    },
    ja: {
      alipay: "Alipay", wechat: "WeChat Pay",
      alipayAlt: "Alipay 支援用 QR コード", wechatAlt: "WeChat Pay 支援用 QR コード",
      limitMessage: (amount) => `個人スポンサーは USD ${amount} までです。金額を調整してもう一度お試しください。`,
      limitTitle: "スポンサー金額の上限", ok: "OK",
      qrHelp: "QR コードを読み取り、決済アプリで任意の金額を入力してください。",
      tierHelp: (amount) => `支払い方法と支援額を選択してください。PayPal、GitHub Sponsors、OSC の個人スポンサーは USD ${amount} までです。`,
      enlarge: (name) => `${name} の QR コードを拡大`,
      note: "備考欄に「Sponsor Axmol」とご記入ください。",
      qrTitle: (name) => `${name} QR コード`
    },
    es: {
      alipay: "Alipay", wechat: "WeChat Pay",
      alipayAlt: "Código QR de patrocinio de Alipay", wechatAlt: "Código QR de patrocinio de WeChat Pay",
      limitMessage: (amount) => `El patrocinio individual está limitado a USD ${amount}. Ajusta el importe e inténtalo de nuevo.`,
      limitTitle: "Límite de patrocinio", ok: "Aceptar",
      qrHelp: "Escanea el código QR e introduce cualquier importe en tu aplicación de pago.",
      tierHelp: (amount) => `Elige un canal de pago y un importe. El patrocinio individual mediante PayPal, GitHub Sponsors y OSC está limitado a USD ${amount}.`,
      enlarge: (name) => `Ampliar código QR de ${name}`,
      note: "Añade la nota: Sponsor Axmol",
      qrTitle: (name) => `Código QR de ${name}`
    },
    ru: {
      alipay: "Alipay", wechat: "WeChat Pay",
      alipayAlt: "QR-код для поддержки через Alipay", wechatAlt: "QR-код для поддержки через WeChat Pay",
      limitMessage: (amount) => `Индивидуальная поддержка ограничена USD ${amount}. Измените сумму и повторите попытку.`,
      limitTitle: "Лимит суммы поддержки", ok: "OK",
      qrHelp: "Отсканируйте QR-код и укажите любую сумму в приложении для оплаты.",
      tierHelp: (amount) => `Выберите способ оплаты и сумму. Индивидуальная поддержка через PayPal, GitHub Sponsors и OSC ограничена USD ${amount}.`,
      enlarge: (name) => `Увеличить QR-код ${name}`,
      note: "Добавьте примечание: Sponsor Axmol",
      qrTitle: (name) => `QR-код ${name}`
    }
  };
  const text = sponsorText[locale] || sponsorText.en;
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
    const message = text.limitMessage(maxIndividualAmount);

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
        channelHelp.textContent = qr ? text.qrHelp : text.tierHelp(maxIndividualAmount);
      }
      if (!qr) return;
      qrTitle.textContent = qr.name;
      qrImage.src = qr.image;
      qrImage.alt = qr.alt;
      qrOpenButtons.forEach((button) => button.setAttribute("aria-label", text.enlarge(qr.name)));
      if (qrInstruction) qrInstruction.textContent = text.qrHelp;
      if (qrNote) qrNote.textContent = text.note;
      if (qrModalTitle) qrModalTitle.textContent = text.qrTitle(qr.name);
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
