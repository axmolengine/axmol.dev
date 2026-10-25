(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("preview") !== "lifetime") return;

  document.documentElement.classList.add("lifetime-preview-active");
  document.querySelectorAll("[data-lifetime-preview]").forEach((card) => {
    card.hidden = false;
  });
  document.getElementById("lifetime-supporters")?.scrollIntoView({
    behavior: "instant",
    block: "start",
  });
})();
