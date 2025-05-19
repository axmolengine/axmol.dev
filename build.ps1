param(
    $axmol_src = $null,
    $wasm_artifact_dir = $null,
    $min_doc_ver = '2.3'
)
if ($wasm_artifact_dir) {
    $wasm_artifact_dir = (Resolve-Path $wasm_artifact_dir).Path
}

$my_root = $PSScriptRoot

function mkdirs([string]$path) {
    if (!(Test-Path $path)) {
        New-Item $path -ItemType Directory 1>$null
    }
}

$site1_dist = Join-Path $my_root 'dist/site1'
mkdirs $site1_dist

# step.1 build main site
Copy-Item (Join-Path $my_root 'index.html') $site1_dist
Copy-Item (Join-Path $my_root 'assets') $site1_dist -Recurse -Force
Copy-Item (Join-Path $my_root 'donate') $site1_dist -Recurse -Force

# step.2 build docs to main site manual
if ($axmol_src) {
    $build_docs_script = Join-Path $axmol_src 'tools/ci/build-docs.ps1'
    &$build_docs_script $site1_dist -min_ver $min_doc_ver
}

# step.3 build wasm preview site

if($wasm_artifact_dir) {
    $site2_dist = Join-Path $my_root 'dist/site2'

    # build site_dist2 aka isolated site wasm demos preview with pthread support
        $site2_wasm_dir = Join-Path $site2_dist 'wasm/'
        mkdirs $site2_wasm_dir
        Copy-Item $(Join-Path $my_root 'wasm/index.html') $(Join-Path $site2_dist 'index.html')
        Copy-Item $(Join-Path $my_root 'wasm/_headers') $site2_dist
        function copy_tree_if($source, $dest) {
            if (Test-Path $source) {
                Copy-Item $source $dest -Container -Recurse
            }
        }

        $cpp_tests_dir = $(Join-Path $wasm_artifact_dir 'cpp-tests')
        if (!(Test-Path $cpp_tests_dir -PathType Container)) {
            throw "Missing wasm cpp-tests, caused by last wasm ci build fail."
        }
        copy_tree_if $cpp_tests_dir $site2_wasm_dir
        copy_tree_if $(Join-Path $wasm_artifact_dir 'fairygui-tests') $site2_wasm_dir
        copy_tree_if $(Join-Path $wasm_artifact_dir 'HelloLua') $site2_wasm_dir
}
