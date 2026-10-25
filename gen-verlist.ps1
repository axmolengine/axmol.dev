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
  [int]$MaxPages = 100
)

$ErrorActionPreference = 'Stop'

# Keep every document byte-identical for the same input: fixed key order (see below),
# LF line endings, UTF-8 without BOM, and a single trailing newline.
$stableTagPattern = '^v' + [regex]::Escape($Line) + '\.(\d+)$'
$stableTag = [regex]::new($stableTagPattern)

$headers = @{
  'Accept' = 'text/html'
  'User-Agent' = 'axmol.dev-version-registry'
}

function Invoke-GitHubRequest {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Uri,
    [ValidateSet('Get', 'Head')]
    [string]$Method = 'Get'
  )

  for ($attempt = 1; $attempt -le 3; ++$attempt) {
    try {
      return Invoke-WebRequest -Uri $Uri -Method $Method -Headers $headers -TimeoutSec 45 -MaximumRedirection 10 -UseBasicParsing
    } catch {
      if ($attempt -eq 3) {
        throw
      }
      Write-Warning "GitHub request failed (attempt $attempt of 3); retrying: $Uri ($($_.Exception.Message))"
      Start-Sleep -Seconds $attempt
    }
  }
}

$releasePageBase = 'https://github.com/{0}/releases' -f $Repository
$releaseEntries = @()

# GitHub's public release pages are paginated and do not consume the anonymous
# Releases REST API quota. Continue until the requested stable line is complete.
for ($page = 1; $page -le $MaxPages; ++$page) {
  $uri = if ($page -eq 1) { $releasePageBase } else { '{0}?page={1}' -f $releasePageBase, $page }
  $response = Invoke-GitHubRequest -Uri $uri
  $sections = [regex]::Matches(
    $response.Content,
    '(?is)<section\s+id="release-(?<tag>[^"\s]+)"[^>]*>(?<body>.*?)</section>'
  )
  if ($sections.Count -eq 0) {
    if ($page -eq 1) {
      throw "No release entries found on GitHub Releases page: $uri"
    }
    break
  }

  $pageHasOlderLine = $false
  foreach ($section in $sections) {
    $tag = [System.Net.WebUtility]::HtmlDecode([string]$section.Groups['tag'].Value)
    $match = $stableTag.Match($tag)
    if ($match.Success) {
      $version = $tag.Substring(1)
      $dateMatch = [regex]::Match(
        $section.Groups['body'].Value,
        '(?i)<relative-time[^>]*\sdatetime="(?<date>[^\"]+)"'
      )
      if (!$dateMatch.Success) {
        throw "Release $tag has no published date on its GitHub Releases page."
      }

      $releaseEntries += [pscustomobject]@{
        Patch = [int]$match.Groups[1].Value
        Version = $version
        Tag = $tag
        ReleaseDate = ([datetime]$dateMatch.Groups['date'].Value).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
        ReleaseUrl = 'https://github.com/{0}/releases/tag/{1}' -f $Repository, $tag
        ZipArchive = 'https://github.com/{0}/archive/refs/tags/{1}.zip' -f $Repository, $tag
        TarballArchive = 'https://github.com/{0}/archive/refs/tags/{1}.tar.gz' -f $Repository, $tag
      }
      continue
    }

    $otherStableTag = [regex]::Match($tag, '^v(?<major>\d+)\.(?<minor>\d+)\.\d+$')
    if ($otherStableTag.Success) {
      $releaseLine = '{0}.{1}' -f $otherStableTag.Groups['major'].Value, $otherStableTag.Groups['minor'].Value
      if ([version]$releaseLine -lt [version]$Line) {
        $pageHasOlderLine = $true
      }
    }
  }

  # Releases are listed newest to oldest. Once an older stable line appears,
  # subsequent pages cannot contain more releases for the requested line.
  if ($pageHasOlderLine) {
    break
  }

  $nextPage = [regex]::Match(
    $response.Content,
    '(?is)<a\b[^>]*class="next_page"[^>]*href="(?<href>[^"]+)"'
  )
  if (!$nextPage.Success) {
    break
  }
  if ($page -eq $MaxPages) {
    throw "Reached MaxPages ($MaxPages) before finding the end of stable line '$Line'. Increase MaxPages to avoid an incomplete registry."
  }
}

$picked = @($releaseEntries | Sort-Object -Property Patch -Descending)
if ($picked.Count -eq 0) {
  throw "No stable '$Line' releases matching $stableTagPattern found in $Repository. Aborting so an empty registry can never be published."
}

# GitHub's expanded-assets pages contain the same release asset names and
# published SHA-256 digests as the web UI. A HEAD request supplies exact sizes
# without downloading the large source archive.
foreach ($entry in $picked) {
  $assetsUri = 'https://github.com/{0}/releases/expanded_assets/{1}' -f $Repository, $entry.Tag
  $assetsResponse = Invoke-GitHubRequest -Uri $assetsUri
  $assets = @(
    foreach ($row in [regex]::Matches($assetsResponse.Content, '(?is)<li\b[^>]*>(?<body>.*?)</li>')) {
      $body = $row.Groups['body'].Value
      $assetLink = [regex]::Match(
        $body,
        '(?is)<a\b[^>]*href="(?<href>[^"]*/releases/download/[^"]+)"[^>]*>(?<label>.*?)</a>'
      )
      if (!$assetLink.Success) {
        continue
      }

      $name = [regex]::Replace($assetLink.Groups['label'].Value, '<[^>]+>', '').Trim()
      $name = [System.Net.WebUtility]::HtmlDecode($name)
      $digestMatch = [regex]::Match($body, '(?i)sha256:([a-f0-9]{64})')
      [pscustomobject]@{
        Name = $name
        Url = [uri]::new([uri]'https://github.com', $assetLink.Groups['href'].Value).AbsoluteUri
        Sha256 = if ($digestMatch.Success) { $digestMatch.Groups[1].Value } else { $null }
      }
    }
  )

  $zipAssets = @($assets | Where-Object { $_.Name -like '*.zip' })
  $zipAsset = $null
  if ($zipAssets.Count -gt 0) {
    $versionedZipAssets = @($zipAssets | Where-Object { $_.Name -like "*$($entry.Version)*.zip" })
    $candidates = if ($versionedZipAssets.Count -gt 0) { $versionedZipAssets } else { $zipAssets }
    $zipAsset = $candidates | Sort-Object -Property Name | Select-Object -First 1
  } else {
    Write-Warning "Release $($entry.Tag) has no uploaded zip asset; its artifacts[] will be empty."
  }

  $entry | Add-Member -NotePropertyName ZipAssetUrl -NotePropertyValue $null
  $entry | Add-Member -NotePropertyName ZipAssetSize -NotePropertyValue $null
  $entry | Add-Member -NotePropertyName ZipSha256 -NotePropertyValue $null
  if ($zipAsset) {
    $entry.ZipAssetUrl = $zipAsset.Url
    $entry.ZipSha256 = $zipAsset.Sha256
    if (!$entry.ZipSha256) {
      Write-Warning "Release $($entry.Tag) zip asset '$($zipAsset.Name)' exposes no usable sha256 digest."
    }

    try {
      $assetHead = Invoke-GitHubRequest -Uri $zipAsset.Url -Method Head
      $contentLength = [string]$assetHead.Headers['Content-Length']
      if ($contentLength -match '^\d+$') {
        $entry.ZipAssetSize = [int64]$contentLength
      }
    } catch {
      Write-Warning "Could not read the size of release asset '$($zipAsset.Name)': $($_.Exception.Message)"
    }
  }
}

if ($picked.Count -eq 0) {
  throw "No stable '$Line' releases matching $stableTagPattern found in $Repository. Aborting so an empty registry can never be published."
}

# Newest patch first; consumers read channels.<channel>.latest rather than assuming order.
$ordered = @($picked | Sort-Object -Property Patch -Descending)
$latest = $ordered[0].Version

$versions = @(
  foreach ($entry in $ordered) {
    # The release zip bundle is the artifact tooling actually downloads. Its
    # sha256 comes from the public asset page when GitHub provides one.
    $artifacts = @(
      if ($entry.ZipAssetUrl) {
        $zipArtifact = [ordered]@{
          platform = 'source'
          arch = 'any'
          kind = 'zip'
          url = $entry.ZipAssetUrl
        }
        if ($null -ne $entry.ZipAssetSize) {
          $zipArtifact['size'] = $entry.ZipAssetSize
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
      # Release zip bundle with its GitHub asset digest, when the page exposes one.
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
    attribution = 'Release metadata generated from the public GitHub Releases pages for ' + $Repository + '.'
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
