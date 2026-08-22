#!/bin/sh
set -eu

PACKAGE_VERSION="1.5.0"
EXPECTED_ZIP_SHA256="831114f044101a0784a15589e1acec02d974898bedee76e374f5effc7af736a5"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ZIP_PATH="$SCRIPT_DIR/bink-ads-ops-client-v${PACKAGE_VERSION}.zip"
CLAUDE_HOME=${CLAUDE_HOME:-"$HOME/.claude"}
SKILLS_ROOT="$CLAUDE_HOME/skills"
TARGET="$SKILLS_ROOT/bink-ads-ops-client"
STAGED="$SKILLS_ROOT/.bink-ads-ops-client.installing.$$"
BACKUP="$SKILLS_ROOT/.bink-ads-ops-client.backup.$$"
TEMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/bink-skill.XXXXXX")

cleanup() {
  rm -rf -- "$TEMP_DIR" "$STAGED"
}
trap cleanup EXIT HUP INT TERM

[ -f "$ZIP_PATH" ] || { echo "Missing package: $ZIP_PATH" >&2; exit 1; }
command -v unzip >/dev/null 2>&1 || { echo "unzip is required." >&2; exit 1; }

if command -v shasum >/dev/null 2>&1; then
  ACTUAL_SHA256=$(shasum -a 256 "$ZIP_PATH" | awk '{print $1}')
elif command -v sha256sum >/dev/null 2>&1; then
  ACTUAL_SHA256=$(sha256sum "$ZIP_PATH" | awk '{print $1}')
else
  echo "shasum or sha256sum is required." >&2
  exit 1
fi
[ "$ACTUAL_SHA256" = "$EXPECTED_ZIP_SHA256" ] || { echo "Package digest mismatch." >&2; exit 1; }

unzip -q "$ZIP_PATH" -d "$TEMP_DIR"
SOURCE="$TEMP_DIR/bink-ads-ops-client"
[ -f "$SOURCE/SKILL.md" ] || { echo "SKILL.md is missing." >&2; exit 1; }
[ -f "$SOURCE/package-manifest.json" ] || { echo "package-manifest.json is missing." >&2; exit 1; }
[ ! -L "$SOURCE" ] || { echo "Symlinked skill root is not allowed." >&2; exit 1; }

mkdir -p "$SKILLS_ROOT"
cp -R "$SOURCE" "$STAGED"
if [ -e "$TARGET" ]; then
  mv "$TARGET" "$BACKUP"
fi
if mv "$STAGED" "$TARGET"; then
  rm -rf -- "$BACKUP"
else
  [ ! -e "$BACKUP" ] || mv "$BACKUP" "$TARGET"
  exit 1
fi

printf 'Installed Claude skill: %s\n' "$TARGET"
printf 'Configure the authenticated AWS OS MCP/API connection separately.\n'
