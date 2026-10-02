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

    $published = $release.published_at
    if (!$published) {
      $published = $release.created_at
    }

    # API exposes both zipball_url/tarball_url, but those are redirecting api.github.com
    # endpoints; keep stable codeload archives so consumers need no redirect handling.
    [pscustomobject]@{
      Patch = [int]$match.Groups[1].Value
      Version = $tag.Substring(1)
      Tag = $tag
      ReleaseDate = ([datetime]$published).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
      ReleaseUrl = [string]$release.html_url
      ZipArchive = 'https://github.com/{0}/archive/refs/tags/{1}.zip' -f $Repository, $tag
      TarballArchive = 'https://github.com/{0}/archive/refs/tags/{1}.tar.gz' -f $Repository, $tag
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
      # Reserved for per-platform artifacts; always empty in schema 1.0.
      artifacts = @()
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
