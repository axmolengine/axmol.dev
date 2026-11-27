param(
  $axmol_src = $null,
  $wasm_artifact_dir = $null,
  $min_doc_ver = '2.5'
)
if ($wasm_artifact_dir) {
  $wasm_artifact_dir = (Resolve-Path $wasm_artifact_dir).Path
}

function mkdirs([string]$path) {
  if (!(Test-Path $path)) {
    New-Item $path -ItemType Directory 1>$null
  }
}

$site_dist = Join-Path $PSScriptRoot 'dist/'
mkdirs $site_dist

# step.1 build main site
Copy-Item (Join-Path $PSScriptRoot 'favicon.ico') $site_dist
Copy-Item (Join-Path $PSScriptRoot 'sitemap.xml') $site_dist
Copy-Item (Join-Path $PSScriptRoot 'robots.txt') $site_dist
Copy-Item (Join-Path $PSScriptRoot 'assets') $site_dist -Recurse -Force
Copy-Item (Join-Path $PSScriptRoot 'versions') $site_dist -Recurse -Force

# Netlify only reads _headers, and it must always be published: the /versions/*
# rules below apply even when no wasm artifact is supplied.
Copy-Item (Join-Path $PSScriptRoot '_headers') $site_dist

# Resolve the newest public Hub release from GitHub's Atom feed. The release
# feed includes pre-releases and does not consume the REST API's anonymous quota.
try {
  $hub_feed_response = Invoke-WebRequest `
    -Uri 'https://github.com/axmolengine/axmol-hub/releases.atom' `
    -Headers @{ 'User-Agent' = 'axmol.dev-build' } `
    -TimeoutSec 30 `
    -UseBasicParsing
  [xml]$hub_feed = $hub_feed_response.Content
  $hub_feed_namespaces = [System.Xml.XmlNamespaceManager]::new($hub_feed.NameTable)
  $hub_feed_namespaces.AddNamespace('atom', 'http://www.w3.org/2005/Atom')
  $latest_hub_entry = $hub_feed.SelectSingleNode('/atom:feed/atom:entry[1]', $hub_feed_namespaces)
  if ($null -eq $latest_hub_entry) {
    throw 'The Axmol Hub release feed has no entries.'
  }

  $latest_hub_link = $latest_hub_entry.SelectSingleNode('atom:link[@rel="alternate"]', $hub_feed_namespaces)
  if ($null -eq $latest_hub_link) {
    throw 'The latest Axmol Hub feed entry has no release link.'
  }

  $latest_hub_release_uri = [System.Uri]$latest_hub_link.GetAttribute('href')
  if ($latest_hub_release_uri.Host -ne 'github.com' -or $latest_hub_release_uri.AbsolutePath -notmatch '^/axmolengine/axmol-hub/releases/tag/') {
    throw "Unexpected Axmol Hub release link: $($latest_hub_release_uri.AbsoluteUri)"
  }

  $hub_tag_match = [regex]::Match(
    $latest_hub_release_uri.AbsolutePath,
    '^/axmolengine/axmol-hub/releases/tag/v?(?<version>[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)$'
  )
  if (!$hub_tag_match.Success) {
    throw "Latest Axmol Hub release tag is not a supported version: $($latest_hub_release_uri.AbsolutePath)"
  }
  $hub_version = $hub_tag_match.Groups['version'].Value
} catch {
  throw "Failed to fetch the latest Axmol Hub release from GitHub's Atom feed: $($_.Exception.Message)"
}

Write-Host "Latest Axmol Hub version: v$hub_version"

# Read the displayed sizes from the same tag's asset list in a single request.
# Match complete installer names, not update packages or .sha256 sidecars.
$hub_sizes = @{}
$hub_tag = $latest_hub_release_uri.Segments[-1]
$hub_installers = @{
  "axmol-hub-$hub_version-win-x64.exe" = 'windows-x64'
  "axmol-hub-$hub_version-win-arm64.exe" = 'windows-arm64'
  "axmol-hub-$hub_version-osx-arm64.pkg" = 'macos-arm64'
  "axmol-hub-$hub_version-osx-x64.pkg" = 'macos-x64'
  'axmol-hub-linux-x64.AppImage' = 'linux-x64'
  'axmol-hub-linux-arm64.AppImage' = 'linux-arm64'
}
try {
  $hub_assets = Invoke-WebRequest `
    -Uri "https://github.com/axmolengine/axmol-hub/releases/expanded_assets/$hub_tag" `
    -Headers @{ 'User-Agent' = 'axmol.dev-build' } `
    -TimeoutSec 30 `
    -UseBasicParsing
  $download_path = [regex]::Escape("/axmolengine/axmol-hub/releases/download/$hub_tag/")
  foreach ($row in [regex]::Matches($hub_assets.Content, '(?s)<li\b[^>]*>.*?</li>')) {
    $link = [regex]::Match($row.Value, '<a\b[^>]*\shref="' + $download_path + '(?<name>[^"/]+)"')
    $target = $hub_installers[$link.Groups['name'].Value]
    if (!$target) { continue }

    $size = [regex]::Match($row.Value, '>\s*(?<number>[0-9]+(?:\.[0-9]+)?)\s+(?<unit>Bytes?|[KMGT]B)\s*<')
    if ($size.Success) {
      $hub_sizes[$target] = @{
        Number = [decimal]$size.Groups['number'].Value
        Unit = $size.Groups['unit'].Value
      }
    }
  }
  foreach ($name in $hub_installers.Keys) {
    if (!$hub_sizes.ContainsKey($hub_installers[$name])) {
      Write-Warning "No download size found for '$name' in the $hub_tag asset list."
    }
  }
} catch {
  Write-Warning "Could not read Axmol Hub download sizes for ${hub_tag}: $($_.Exception.Message)"
}

# Generate the Axmol release registry before rendering because the pages bake
# the latest LTS link and version into the markup.
$release_index = Join-Path $site_dist 'versions/index.json'
& (Join-Path $PSScriptRoot 'gen-verlist.ps1') -OutputPath $release_index

& (Join-Path $PSScriptRoot 'render-i18n.ps1') -OutputPath $site_dist -ReleaseIndex $release_index -HubVersion $hub_version -HubSizes $hub_sizes

# step.2 build docs to main site manual
if ($axmol_src) {
  $build_docs_script = Join-Path $axmol_src 'tools/cmdline/plugins/build-docs.ps1'
  &$build_docs_script $site_dist -min_ver $min_doc_ver
}

# step.3 build wasm preview site
if ($wasm_artifact_dir) {
  Copy-Item $(Join-Path $PSScriptRoot 'wasm') $site_dist -Recurse -Force

  $site_wasm_dir = Join-Path $site_dist 'wasm/'
  function copy_tree_if($source, $dest) {
    if (Test-Path $source) {
      Copy-Item $source $dest -Container -Recurse
    }
  }

  $cpp_tests_dir = $(Join-Path $wasm_artifact_dir 'cpp-tests')
  if (!(Test-Path $cpp_tests_dir -PathType Container)) {
    throw "Missing wasm cpp-tests, caused by last wasm ci build fail."
  }
  copy_tree_if $cpp_tests_dir $site_wasm_dir
  copy_tree_if $(Join-Path $wasm_artifact_dir 'fairygui-tests') $site_wasm_dir
  copy_tree_if $(Join-Path $wasm_artifact_dir 'lua-tests') $site_wasm_dir
}
