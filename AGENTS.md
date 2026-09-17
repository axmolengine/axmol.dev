# axmol.dev Project Guidelines

## Pages and content

- During the beta1 phase, the public site is English-first. Do not expand the Chinese pages or introduce an SPA, CMS, or new front-end framework in this phase.
- The homepage is a concise decision page. Do not restore encyclopedia-style copy, FAQ sections, full supporter lists, or duplicate version cards.
- The homepage and `/v3/` must each contain exactly one `<h1>`, plus `<main>`, a skip link, canonical metadata, Open Graph, Twitter Card, and JSON-LD metadata.
- Do not add `Home` or temporary version labels such as `V3 beta` to the primary navigation. The logo returns home; keep Docs, Wiki, Sponsor, GitHub, and theme controls.
- Source HTML must be directly usable and readable for human maintenance. Never leave `{{...}}`, TODO, TBD, or other template placeholders in source files. Local development must not depend on running `build.ps1` first.
- Beta copy must remain conservative. Do not present beta1 as the default production-stable release; keep Axmol 2.11.x LTS as the clear production baseline.

## Sponsor presentation

- The homepage may show selected corporate support, but it must use a reusable `supporter-card` structure so additional companies can be added without a special-case layout.
- Show only selected supporters on the homepage and provide a link to `/sponsor/` for the complete supporter page.
- Use factual wording for Scorewarrior, such as “long-term financial support” or “Corporate Diamond supporter”. Avoid implying a partner, partnership, or corporate-sponsorship relationship.
- Use company logos with accurate `alt` text. For third-party brand assets, prefer the brand owner's official CDN when requested or when licensing is unclear; do not store an unauthorized copy in this repository.
- Do not modify Sponsor payment, transaction, amount-statistics, or API logic. Only change its navigation or presentation copy when explicitly requested.

## Build and assets

- Continue using the existing Bootstrap, PowerShell, Netlify, and static URL structure. Do not introduce a new build framework.
- `build.ps1` copies the homepage, `v3/`, assets, Sponsor, sitemap, robots, documentation, and optional WASM artifacts. Do not restore webpage placeholder rendering.
- WASM artifacts are optional. Without artifacts, do not publish stale `dist/wasm`; homepage demo links must point to valid source or existing pages. When artifacts exist, copy `cpp-tests`, `fairygui-tests`, and `lua-tests`.
- When changing shared CSS, JavaScript, or images, check shared references and cache-busting versions across the homepage, `/v3/`, `/sponsor/`, and `/wasm/`.
- Demo screenshots and promotional images must be real, local, optimized assets. Do not use generated fake screenshots or unconditional percentage performance claims.

## Changes and verification

- Modify only files and behavior explicitly in scope. Protect Sponsor transaction logic, Manual documentation generation, WASM builds, and Netlify publishing from unrelated changes.
- Keep HTML readable with block formatting and exactly two spaces per indentation level; do not re-compress it into single lines.
- At minimum, check one H1 per page, placeholder scans, internal links, key external links, keyboard focus, light/dark/automatic themes, and mobile layout.
- When the user explicitly says build verification is unnecessary, do not run a build; otherwise run proportionate static checks or `build.ps1`.
- Do not describe online publishing, release tags, download packages, or third-party link status as confirmed unless they have been verified.
