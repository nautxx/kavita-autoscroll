#!/usr/bin/env bash

set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
manifest_version="$(sed -n 's/^[[:space:]]*"version": "\([^"]*\)",/\1/p' "$repo_dir/manifest.json")"
script_version="$(sed -n "s/^\/\/ @version[[:space:]]*//p" "$repo_dir/kavita-autoscroll.user.js")"
requested_version="${1:-$manifest_version}"
release_dir="$repo_dir/build/release/v$requested_version"
archive_name="kavita-autoscroll-v$requested_version.zip"

if [[ -z "$manifest_version" || "$manifest_version" != "$script_version" ]]; then
  echo "manifest and userscript versions do not match" >&2
  exit 1
fi

if [[ "$requested_version" != "$manifest_version" ]]; then
  echo "requested version $requested_version does not match source version $manifest_version" >&2
  exit 1
fi

rm -rf "$release_dir"
mkdir -p "$release_dir"
cp "$repo_dir/kavita-autoscroll.user.js" "$release_dir/"

(
  cd "$repo_dir"
  zip -q "$release_dir/$archive_name" manifest.json kavita-autoscroll.user.js README.md LICENSE
)

(
  cd "$release_dir"
  shasum -a 256 kavita-autoscroll.user.js "$archive_name" > SHA256SUMS.txt
)

echo "Created release assets in $release_dir"
