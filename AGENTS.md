# axmol.dev Project Guidelines

## Pages and content

- The public site provides English, Simplified Chinese, Japanese, Spanish, and Russian versions under separate static paths. Do not introduce an SPA, CMS, or new front-end framework for localization.
- Localization applies to exactly three public page types: the homepage, the `/v3/` release page, and the `/sponsor/` page. Keep each language's navigation, page metadata, canonical URL, and internal links aligned with its counterpart.
- English remains at the root paths (`/`, `/v3/`, and `/sponsor/`). Every non-English language uses its ISO 639-1 two-letter lowercase code as the directory name: `/zh/`, `/ja/`, `/es/`, and `/ru/`, with matching `/v3/` and `/sponsor/` subpaths. Do not introduce long-form, locale, or inconsistent language directory names.
- The homepage is a concise decision page. Do not restore encyclopedia-style copy, FAQ sections, full supporter lists, or duplicate version cards.
- The homepage and `/v3/` must each contain exactly one `<h1>`, plus `<main>`, a skip link, canonical metadata, Open Graph, Twitter Card, and JSON-LD metadata.
- Do not add `Home` or temporary version labels such as `V3 beta` to the primary navigation. The logo returns home; keep Docs, Wiki, Sponsor, GitHub, and theme controls.
- Maintain exactly three shared, readable HTML templates at `templates/home.html`, `templates/v3.html`, and `templates/sponsor.html`. Every language must render from the same template for a given page type; do not create locale-specific HTML templates or structural markup variants.
- Keep human-facing text and localized attributes in one JSON file per ISO 639-1 language code under `i18n/` (`en.json`, `zh.json`, `ja.json`, `es.json`, and `ru.json`). Use semantic, context-appropriate keys rather than source-order identifiers. Every locale must have the exact same key set for each page and runtime translation group.
- When changing page structure, update the shared template once and keep the DOM element sequence and hierarchy identical for every rendered locale. Locale-specific link destinations, canonical URLs, language selection state, and HTML language attributes may be rendered dynamically, but must not alter page structure.
- Template placeholders are allowed only in `templates/` and must use the renderer's `{{i18n:...}}` or `{{route:...}}` syntax. Generated HTML under `dist/` must contain no unresolved placeholders. Keep two-space HTML indentation and readable block formatting in every template.
- Whenever i18n text or any related localized page/template is changed, run `./build.ps1` with no arguments and inspect the generated pages in `dist/`. Do not pass CI's Axmol documentation or WASM build arguments for this local check.
- Beta copy must remain conservative. Do not present beta1 as the default production-stable release; keep Axmol 2.11.x LTS as the clear production baseline.

## Sponsor presentation

- The homepage may show selected corporate support, but it must use a reusable `supporter-card` structure so additional companies can be added without a special-case layout.
- Show only selected supporters on the homepage and provide a link to `/sponsor/` for the complete supporter page.
- Use factual wording for Scorewarrior, such as “long-term financial support” or “Corporate Diamond supporter”. Avoid implying a partner, partnership, or corporate-sponsorship relationship.
- Use company logos with accurate `alt` text. For third-party brand assets, prefer the brand owner's official CDN when requested or when licensing is unclear; do not store an unauthorized copy in this repository.
- Do not modify Sponsor payment, transaction, amount-statistics, or API logic. Only change its navigation or presentation copy when explicitly requested.

## Build and assets

- Continue using the existing Bootstrap, PowerShell, Netlify, and static URL structure. Do not introduce a new build framework.
- `build.ps1` copies shared assets and site metadata, then renders the homepage, `v3/`, and Sponsor pages from `templates/` plus `i18n/<language>.json` into `dist/`. Documentation and WASM are included only when their CI arguments are supplied; a no-argument local build must not delete existing `dist/wasm` content.
- WASM artifacts are optional. CI must not deploy stale `dist/wasm` when no new artifact is supplied; a no-argument local page build preserves any existing `dist/wasm`. Homepage demo links must point to valid source or existing pages. When artifacts exist, copy `cpp-tests`, `fairygui-tests`, and `lua-tests`.
- When changing shared CSS, JavaScript, or images, check shared references and cache-busting versions across the homepage, `/v3/`, `/sponsor/`, and `/wasm/`.
- Demo screenshots and promotional images must be real, local, optimized assets. Do not use generated fake screenshots or unconditional percentage performance claims.

## Changes and verification

- Modify only files and behavior explicitly in scope. Protect Sponsor transaction logic, Manual documentation generation, WASM builds, and Netlify publishing from unrelated changes.
- Keep HTML readable with block formatting and exactly two spaces per indentation level; do not re-compress it into single lines.
- At minimum, check one H1 per page, placeholder scans, internal links, key external links, keyboard focus, light/dark/automatic themes, and mobile layout.
- When the user explicitly says build verification is unnecessary, do not run a build; otherwise run proportionate static checks or `build.ps1`.
- Do not describe online publishing, release tags, download packages, or third-party link status as confirmed unless they have been verified.
