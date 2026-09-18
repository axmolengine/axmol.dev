(() => {
  const maxIndividualAmount = 500;
  const paypalProducts = { 5: "s101", 25: "s102", 50: "s103", 100: "s104", 250: "s105" };
  const githubUrl = (amount, monthly = true) => `https://github.com/sponsors/axmolengine/sponsorships?preview=false&frequency=${monthly ? "recurring" : "one-time"}&amount=${amount}`;

  const oscUrl = (amount, monthly = true) => `https://opencollective.com/axmol/contribute/backers-69887/checkout?interval=${monthly ? "month" : "oneTime"}&amount=${amount}&contributeAs=me&opensourcePlatformTipAb=true`;

  document.querySelectorAll("[data-sponsor-tiers]").forEach((tierGrid) => {
    const channelSelect = tierGrid.parentElement?.querySelector("[data-sponsor-channel]");
    const channel = () => channelSelect?.value || "paypal";

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
        let amount = tier.dataset.tierAmount;
        let monthly = true;
        if (amount === "custom") {
          const input = tierGrid.querySelector("[data-custom-amount]");
          const monthlyInput = tierGrid.querySelector("[data-custom-monthly]");
          amount = input?.value.trim();
          if (!amount || Number(amount) < 1 || Number(amount) > maxIndividualAmount) {
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
