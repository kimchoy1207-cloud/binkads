#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SOURCE_MCP="$SCRIPT_DIR/mcp"
CLAUDE_HOME=${CLAUDE_HOME:-"$HOME/.claude"}
MCP_TARGET="$CLAUDE_HOME/mcp/bink-ads-os"

command -v node >/dev/null 2>&1 || { echo "Node.js 20 이상이 필요합니다." >&2; exit 1; }
NODE_MAJOR=$(node -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || printf '0')
case "$NODE_MAJOR" in
  ''|*[!0-9]*) NODE_MAJOR=0 ;;
esac
[ "$NODE_MAJOR" -ge 20 ] || { echo "Node.js 20 이상이 필요합니다. 현재 버전: $(node --version 2>/dev/null || printf '확인 불가')" >&2; exit 1; }
command -v claude >/dev/null 2>&1 || { echo "Claude Code CLI가 필요합니다." >&2; exit 1; }
command -v security >/dev/null 2>&1 || { echo "macOS Keychain 명령을 사용할 수 없습니다." >&2; exit 1; }
[ -f "$SOURCE_MCP/index.js" ] || { echo "MCP 실행 파일이 없습니다." >&2; exit 1; }

API_URL='https://ivk2myu4s8.execute-api.ap-northeast-2.amazonaws.com'
KEYCHAIN_SERVICE='bink-ads-os-public-api'
KEYCHAIN_ACCOUNT=$(id -un)
if ! security find-generic-password -a "$KEYCHAIN_ACCOUNT" -s "$KEYCHAIN_SERVICE" -w >/dev/null 2>&1; then
  printf '전달받은 Bink 설치 토큰을 입력하세요: '
  trap 'stty echo 2>/dev/null || true' HUP INT TERM
  stty -echo
  IFS= read -r API_TOKEN
  stty echo
  trap - HUP INT TERM
  printf '\n'
  case "$API_TOKEN" in
    ''|*[!A-Za-z0-9_-]*) echo "설치 토큰 형식이 올바르지 않습니다." >&2; exit 1 ;;
  esac
  [ "${#API_TOKEN}" -ge 32 ] || { echo "설치 토큰이 너무 짧습니다." >&2; exit 1; }
  security add-generic-password -U -a "$KEYCHAIN_ACCOUNT" -s "$KEYCHAIN_SERVICE" -w "$API_TOKEN" >/dev/null
  unset API_TOKEN
fi

mkdir -p "$(dirname -- "$MCP_TARGET")"
rm -rf -- "$MCP_TARGET"
cp -R "$SOURCE_MCP" "$MCP_TARGET"
cat >"$MCP_TARGET/run-mcp.sh" <<'EOF'
#!/bin/sh
set -eu
export META_AUTOMATION_MCP_PROFILE="CEO_READ_ONLY"
export META_WRITE_ENABLED="false"
export META_AUTOMATION_AUTH_MODE="bearer"
export META_AUTOMATION_MCP_TOKEN=$(security find-generic-password -a "$(id -un)" -s "bink-ads-os-public-api" -w)
exec node "$(dirname -- "$0")/index.js"
EOF
chmod 700 "$MCP_TARGET/run-mcp.sh"

CONFIG_JSON=$(BINK_MCP_ENTRY="$MCP_TARGET/run-mcp.sh" BINK_API_URL="$API_URL" node -e '
const config = {
  type: "stdio",
  command: "/bin/sh",
  args: [process.env.BINK_MCP_ENTRY],
  env: {
    META_AUTOMATION_API_URL: process.env.BINK_API_URL,
  }
};
process.stdout.write(JSON.stringify(config));
')

claude mcp remove --scope user bink-ads-os >/dev/null 2>&1 || true
claude mcp add-json --scope user bink-ads-os "$CONFIG_JSON"
unset CONFIG_JSON

printf 'AWS 광고 OS MCP 연결이 등록됐습니다. Tailscale은 필요하지 않습니다.\n'
printf 'Claude Code를 다시 실행한 뒤 health_check를 요청하세요.\n'
