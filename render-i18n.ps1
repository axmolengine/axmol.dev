param(
  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
$siteRoot = $PSScriptRoot
$outputRoot = [System.IO.Path]::GetFullPath($OutputPath)
$locales = @('en', 'zh', 'ja', 'es', 'ru')
$pages = @(
  @{ Name = 'home'; Template = 'home.html'; Route = 'index.html'; UrlRoute = '' },
  @{ Name = 'v3'; Template = 'v3.html'; Route = 'v3/index.html'; UrlRoute = 'v3/' },
  @{ Name = 'sponsor'; Template = 'sponsor.html'; Route = 'sponsor/index.html'; UrlRoute = 'sponsor/' }
)

function Get-ResourceValue($resource, [string]$path) {
  $value = $resource
  foreach ($part in $path.Split('.')) {
    if ($null -eq $value) {
      throw "Missing i18n value: $path"
    }

    if ($value -is [System.Collections.IDictionary]) {
      if (!$value.Contains($part)) {
        throw "Missing i18n value: $path"
      }
      $value = $value[$part]
    } else {
      $property = $value.PSObject.Properties[$part]
      if ($null -eq $property) {
        throw "Missing i18n value: $path"
      }
      $value = $property.Value
    }
  }

  return $value
}

$dictionaries = @{}
foreach ($locale in $locales) {
  $dictionaryPath = Join-Path $siteRoot "i18n/$locale.json"
  if (!(Test-Path -LiteralPath $dictionaryPath -PathType Leaf)) {
    throw "Missing translation file: $dictionaryPath"
  }

  $dictionaries[$locale] = Get-Content -LiteralPath $dictionaryPath -Raw -Encoding UTF8 | ConvertFrom-Json -AsHashtable
}

foreach ($group in @('site', 'home', 'v3', 'sponsor', 'sponsorRuntime')) {
  $referenceKeys = @($dictionaries.en[$group].Keys | Sort-Object)
  foreach ($locale in $locales | Where-Object { $_ -ne 'en' }) {
    $localeKeys = @($dictionaries[$locale][$group].Keys | Sort-Object)
    if (($referenceKeys -join "`n") -ne ($localeKeys -join "`n")) {
      throw "Translation key mismatch in '$group' for locale '$locale'."
    }
  }
}

foreach ($locale in $locales) {
  $dictionary = $dictionaries[$locale]
  foreach ($page in $pages) {
    $templatePath = Join-Path $siteRoot "templates/$($page.Template)"
    if (!(Test-Path -LiteralPath $templatePath -PathType Leaf)) {
      throw "Missing page template: $templatePath"
    }

    $html = Get-Content -LiteralPath $templatePath -Raw -Encoding UTF8
    $tokens = [regex]::Matches($html, '\{\{(?<namespace>i18n|route):(?<key>[a-zA-Z0-9_.-]+)\}\}')
    foreach ($token in $tokens) {
      $namespace = $token.Groups['namespace'].Value
      $key = $token.Groups['key'].Value
      if ($namespace -eq 'i18n' -and $key -eq 'sponsorRuntime') {
        if ($page.Name -ne 'sponsor') {
          throw "sponsorRuntime token is only valid in the Sponsor template: $templatePath"
        }
        $runtimeConfig = $dictionary.sponsorRuntime | ConvertTo-Json -Depth 20 -Compress
        $runtimeConfig = $runtimeConfig.Replace('<', '\u003c').Replace('>', '\u003e').Replace('&', '\u0026')
        $replacement = "<script type=`"application/json`" id=`"axmol-i18n-config`">$runtimeConfig</script>"
      } elseif ($namespace -eq 'route' -and $key -eq 'current') {
        $localeRoute = if ($locale -eq 'en') { $page.UrlRoute } else { "$locale/$($page.UrlRoute)" }
        $replacement = "https://axmol.dev/$localeRoute"
      } elseif ($namespace -eq 'route' -and $key -eq 'english') {
        $replacement = "https://axmol.dev/$($page.UrlRoute)"
      } else {
        $entry = Get-ResourceValue $dictionary $key
        if ($entry -is [System.Collections.IDictionary]) {
          $text = [string]$entry.value
        } else {
          $text = [string]$entry
        }
        $replacement = [System.Net.WebUtility]::HtmlEncode($text)
      }

      $html = $html.Replace($token.Value, $replacement)
    }

    $html = [regex]::Replace($html, '<a(?=\s)(?<attributes>[^>]*)>', [System.Text.RegularExpressions.MatchEvaluator]{
      param($match)
      $attributes = $match.Groups['attributes'].Value
      $languageMatch = [regex]::Match($attributes, '\blang="([^"]+)"')
      if (!$languageMatch.Success) {
        if ($locale -ne 'en') {
          $hrefMatch = [regex]::Match($attributes, '\bhref="(/[^\"]*)"')
          if ($hrefMatch.Success) {
            $path = $hrefMatch.Groups[1].Value
            if ($path -eq '/' -or $path -match '^/(?:v3|sponsor)/(?:#.*)?$') {
              $localizedHref = 'href="/' + $locale + $path + '"'
              $attributes = $attributes.Substring(0, $hrefMatch.Index) + $localizedHref + $attributes.Substring($hrefMatch.Index + $hrefMatch.Length)
            }
          }
        }
        return '<a' + $attributes + '>'
      }
      $currentLanguage = $languageMatch.Groups[1].Value.ToLowerInvariant().Split('-')[0] -eq $locale
      $classMatch = [regex]::Match($attributes, '\bclass="([^"]*)"')
      if ($classMatch.Success) {
        $classes = @($classMatch.Groups[1].Value -split '\s+' | Where-Object { $_ -and $_ -ne 'active' })
        if ($currentLanguage) { $classes += 'active' }
        $newClass = 'class="' + ($classes -join ' ') + '"'
        $attributes = $attributes.Substring(0, $classMatch.Index) + $newClass + $attributes.Substring($classMatch.Index + $classMatch.Length)
      }
      if ($currentLanguage) {
        if ($attributes -match '\baria-current="[^"]*"') {
          $attributes = [regex]::Replace($attributes, '\baria-current="[^"]*"', 'aria-current="page"')
        } else {
          $attributes += ' aria-current="page"'
        }
      } else {
        $attributes = [regex]::Replace($attributes, '\s+aria-current="[^"]*"', '')
      }
      return '<a' + $attributes + '>'
    })

    $englishPageUrl = "https://axmol.dev/$($page.UrlRoute)"
    $localeRoute = if ($locale -eq 'en') { $page.UrlRoute } else { "$locale/$($page.UrlRoute)" }
    $localizedPageUrl = "https://axmol.dev/$localeRoute"
    $html = $html.Replace('"url":"' + $englishPageUrl + '"', '"url":"' + $localizedPageUrl + '"')

    if ($html -match '\{\{(?:i18n|route):[^}]+\}\}') {
      throw "Unresolved template token in $templatePath"
    }

    $relativePath = if ($locale -eq 'en') {
      $page.Route
    } else {
      Join-Path $locale $page.Route
    }
    $destination = Join-Path $outputRoot $relativePath
    $destinationDirectory = Split-Path -Parent $destination
    if (!(Test-Path -LiteralPath $destinationDirectory -PathType Container)) {
      New-Item -Path $destinationDirectory -ItemType Directory -Force | Out-Null
    }
    [System.IO.File]::WriteAllText(
      $destination,
      $html,
      [System.Text.UTF8Encoding]::new($false)
    )
  }
}

Write-Host "Rendered 15 localized pages to $outputRoot"
