# axmol.dev

The source of axmol home page, based on bootstrap 5.3.8

## Localized pages

The homepage, V3 page, and Sponsor page use three shared readable HTML templates: `templates/home.html`, `templates/v3.html`, and `templates/sponsor.html`. Every locale renders from the same template for its page type. Human-facing text is stored in one JSON dictionary per language under `i18n/`, using ISO 639-1 file codes (`en`, `zh`, `ja`, `es`, `ru`) and matching semantic keys.

To render or preview changes to localized copy or page templates, run `./build.ps1` with no arguments. This generates the static localized pages under `dist/`; documentation and WebAssembly artifacts are built only in CI when their explicit arguments are supplied.

## https://axmol.dev Deployment Flow

1. The workflow `build.yml` is triggered by any of the following:
   - A push to this repository.  
   - Completion of the WebAssembly build in `axmolengine/axmol`.  
   - Manual execution by a user.

2. The CI pipeline:
   - Merges the pages in this repository.  
   - Downloads WebAssembly artifacts from `axmolengine/axmol` into the `dist` directory.

3. The CI pipeline pushes the `dist` contents to the `axmol-pages` branch of the repository `axmolengine/axmol.dev.dist`.

4. Netlify automatically builds and deploys the `axmol-pages` branch of `axmolengine/axmol.dev.dist` to [https://axmol.dev](https://axmol.dev) whenever a push event occurs on that branch.
