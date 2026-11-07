(() => {
  document.querySelectorAll(".honors-supporters-section").forEach((section) => {
    const hasSupporters = section.querySelector(".honors-supporters-grid > .supporter-card");
    section.hidden = !hasSupporters;
  });
})();
