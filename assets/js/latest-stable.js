(() => {
  const links = document.querySelectorAll("[data-latest-211-release]");
  if (!links.length) return;

  const releaseEndpoint = "https://api.github.com/repos/axmolengine/axmol/releases?per_page=100";
  const stable211Tag = /^v2\.11\.(\d+)$/i;

  fetch(releaseEndpoint, {
    headers: { Accept: "application/vnd.github+json" }
  })
    .then((response) => {
      if (!response.ok) throw new Error(`GitHub releases request failed: ${response.status}`);
      return response.json();
    })
    .then((releases) => {
      const latest = releases
        .filter((release) => !release.draft && !release.prerelease && stable211Tag.test(release.tag_name))
        .reduce((current, release) => {
          const patch = Number(stable211Tag.exec(release.tag_name)[1]);
          return !current || patch > current.patch ? { release, patch } : current;
        }, null);

      if (!latest) return;

      const version = latest.release.tag_name.replace(/^v/i, "");
      links.forEach((link) => {
        if (link.textContent.includes("2.11.x")) {
          link.textContent = link.textContent.replace("2.11.x", version);
        }
        link.href = latest.release.html_url;
      });
    })
    .catch(() => {
      // Keep the current stable version and link as a working offline fallback.
    });
})();
