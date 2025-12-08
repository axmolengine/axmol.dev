# axmol.dev

The source of axmol home page, based on bootstrap 5.3.8

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
