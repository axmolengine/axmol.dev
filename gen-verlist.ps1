param(
  [Parameter(Mandatory = $true)]
  [string]$OutputPath,
  [string]$Repository = 'axmolengine/axmol',
  [string]$Channel = 'lts',
  [string]$Label = 'LTS',
  [string]$Line = '2.11',
  [string]$SchemaVersion = '1.0',
  [string]$SchemaUrl = 'https://axmol.dev/versions/schema/v1.json',
  [string]$ApiBase = 'https://api.github.com',
  [int]$MaxPages = 10,
  [string]$Token = $env:GITHUB_TOKEN
)

$ErrorActionPreference = 'Stop'

# Keep every document byte-identical for the same input: fixed key order (see below),
# LF line endings, UTF-8 without BOM, and a single trailing newline.
$stableTagPattern = '^v' + [regex]::Escape($Line) + '\.(\d+)$'
$stableTag = [regex]::new($stableTagPattern)

$headers = @{
  'Accept' = 'application/vnd.github+json'
  'X-GitHub-Api-Version' = '2022-11-28'
  'User-Agent' = 'axmol.dev-version-registry'
}
if ($Token) {
  $headers['Authorization'] = "Bearer $Token"
}

$releases = @()
for ($page = 1; $page -le $MaxPages; ++$page) {
  $uri = '{0}/repos/{1}/releases?per_page=100&page={2}' -f $ApiBase, $Repository, $page
  # Invoke-RestMethod writes a JSON array as a single pipeline object, so wrap the
  # assigned value (not the command) to keep one element per release.
  $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
  $batch = @($response)
  if ($batch.Count -eq 0) {
    break
  }
  $releases += $batch
  if ($batch.Count -lt 100) {
    break
  }
}

$picked = @(
  foreach ($release in $releases) {
    if ($release.draft -or $release.prerelease) {
      continue
    }

    $tag = [string]$release.tag_name
    $match = $stableTag.Match($tag)
    if (!$match.Success) {
      continue
    }

    $version = $tag.Substring(1)

    # Every release ships a single zip bundle such as axmol-2.11.5.zip. The API
    # exposes its content digest as "sha256:<hex>", so consumers never have to
    # download 240 MB just to verify it. Prefer the asset whose name carries this
    # exact version, then tie-break on name, so the pick stays deterministic even
    # if a release one day carries several zip files.
    $zipAssets = @($release.assets | Where-Object {
      $_.state -eq 'uploaded' -and [string]$_.name -like '*.zip'
    })
    $zipAsset = $null
    if ($zipAssets.Count -gt 0) {
      $versionedZipAssets = @($zipAssets | Where-Object { [string]$_.name -like "*$version*.zip" })
      $candidates = if ($versionedZipAssets.Count -gt 0) { $versionedZipAssets } else { $zipAssets }
      $zipAsset = $candidates | Sort-Object -Property Name | Select-Object -First 1
    } else {
      Write-Warning "Release $tag has no uploaded zip asset; its artifacts[] will be empty."
    }

    $zipSha256 = $null
    if ($zipAsset) {
      $digest = [string]$zipAsset.digest
      if ($digest -match '^sha256:([a-f0-9]{64})$') {
        $zipSha256 = $Matches[1]
      } else {
        # Older assets uploaded before GitHub started publishing digests have no
        # digest at all; anything else is unexpected and worth surfacing.
        Write-Warning "Release $tag zip asset '$($zipAsset.name)' exposes no usable sha256 digest (digest: '$digest')."
      }
    }

    $published = $release.published_at
    if (!$published) {
      $published = $release.created_at
    }

    # API exposes both zipball_url/tarball_url, but those are redirecting api.github.com
    # endpoints; keep stable codeload archives so consumers need no redirect handling.
    [pscustomobject]@{
      Patch = [int]$match.Groups[1].Value
      Version = $version
      Tag = $tag
      ReleaseDate = ([datetime]$published).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
      ReleaseUrl = [string]$release.html_url
      ZipArchive = 'https://github.com/{0}/archive/refs/tags/{1}.zip' -f $Repository, $tag
      TarballArchive = 'https://github.com/{0}/archive/refs/tags/{1}.tar.gz' -f $Repository, $tag
      ZipAssetUrl = if ($zipAsset) { [string]$zipAsset.browser_download_url } else { $null }
      ZipAssetSize = if ($zipAsset) { [int64]$zipAsset.size } else { 0 }
      ZipSha256 = $zipSha256
    }
  }
)

if ($picked.Count -eq 0) {
  throw "No stable '$Line' releases matching $stableTagPattern found in $Repository. Aborting so an empty registry can never be published."
}

# Newest patch first; consumers read channels.<channel>.latest rather than assuming order.
$ordered = @($picked | Sort-Object -Property Patch -Descending)
$latest = $ordered[0].Version

$versions = @(
  foreach ($entry in $ordered) {
    # The release zip bundle is the artifact tooling actually downloads. Its sha256
    # comes from the API asset digest; older assets without a digest omit the field
    # rather than advertising an empty or approximate value.
    $artifacts = @(
      if ($entry.ZipAssetUrl) {
        $zipArtifact = [ordered]@{
          platform = 'source'
          arch = 'any'
          kind = 'zip'
          url = $entry.ZipAssetUrl
          size = $entry.ZipAssetSize
        }
        if ($entry.ZipSha256) {
          $zipArtifact['sha256'] = $entry.ZipSha256
        }
        $zipArtifact
      }
    )

    [ordered]@{
      version = $entry.Version
      tag = $entry.Tag
      channel = $Channel
      line = $Line
      prerelease = $false
      releaseDate = $entry.ReleaseDate
      releaseUrl = $entry.ReleaseUrl
      archives = [ordered]@{
        zip = $entry.ZipArchive
        tarball = $entry.TarballArchive
      }
      # Release zip bundle with its GitHub asset digest, when the API exposes one.
      artifacts = $artifacts
    }
  }
)

$channels = [ordered]@{}
$channels[$Channel] = [ordered]@{
  label = $Label
  line = $Line
  latest = $latest
}

$document = [ordered]@{
  '$schema' = $SchemaUrl
  schemaVersion = $SchemaVersion
  generatedAt = [datetime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
  project = 'axmol'
  source = [ordered]@{
    repository = 'https://github.com/' + $Repository
    releasesApi = '{0}/repos/{1}/releases' -f $ApiBase, $Repository
    attribution = 'Release metadata generated from the GitHub Releases API for ' + $Repository + '.'
  }
  channels = $channels
  versions = $versions
}

$json = ($document | ConvertTo-Json -Depth 10) -replace "`r`n", "`n"
if (!$json.EndsWith("`n")) {
  $json += "`n"
}

# Validate before writing: a malformed registry is worse than no rebuild at all,
# because CI force-orphans the whole dist tree.
$check = $json | ConvertFrom-Json
if ($check.'$schema' -ne $SchemaUrl) {
  throw "Unexpected `$schema value: $($check.'$schema')"
}
if ($check.schemaVersion -ne $SchemaVersion) {
  throw "Unexpected schemaVersion: $($check.schemaVersion)"
}
if (@($check.versions).Count -eq 0) {
  throw 'Registry contains no versions'
}
foreach ($version in @($check.versions)) {
  if ($version.version -notmatch '^\d+\.\d+\.\d+$') {
    throw "Invalid version: $($version.version)"
  }
  if ($version.tag -ne ('v' + $version.version)) {
    throw "tag does not match version: $($version.tag)"
  }
  if ($version.line -ne $Line) {
    throw "Unexpected line: $($version.line)"
  }
  if ($version.channel -ne $Channel) {
    throw "Unexpected channel: $($version.channel)"
  }
  foreach ($artifact in @($version.artifacts)) {
    if ($artifact.url -notmatch '^https://') {
      throw "Artifact without https url in $($version.version): $($artifact.url)"
    }
    $artifactSha256 = [string]$artifact.sha256
    if ($artifactSha256 -and $artifactSha256 -notmatch '^[a-f0-9]{64}$') {
      throw "Malformed artifact sha256 in $($version.version): $artifactSha256"
    }
  }
}

$missingChecksum = @($check.versions | Where-Object { @($_.artifacts).Count -eq 0 })
if ($missingChecksum.Count -gt 0) {
  Write-Warning "$($missingChecksum.Count) version(s) ship no zip artifact: $($missingChecksum.version -join ', ')"
}
$latestHits = @($check.versions | Where-Object { $_.version -eq $check.channels.$Channel.latest })
if ($latestHits.Count -ne 1) {
  throw "channels.$Channel.latest must resolve to exactly one version, got $($latestHits.Count)"
}

$destination = [System.IO.Path]::GetFullPath($OutputPath)
$destinationDirectory = Split-Path -Parent $destination
if (!(Test-Path -LiteralPath $destinationDirectory -PathType Container)) {
  New-Item -Path $destinationDirectory -ItemType Directory -Force | Out-Null
}
[System.IO.File]::WriteAllText(
  $destination,
  $json,
  [System.Text.UTF8Encoding]::new($false)
)

Write-Host "Generated $Channel registry: $($check.versions.Count) version(s), latest $latest, -> $destination"
