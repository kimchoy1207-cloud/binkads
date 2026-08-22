#!/bin/sh
set -u

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
INSTALLER="$SCRIPT_DIR/install-bink-ads-ops-client.sh"
CONNECTOR="$SCRIPT_DIR/connect-bink-ads-os.sh"

printf '\nBink Ads Ops Claude 스킬을 설치합니다.\n\n'
printf '토큰 설치 안내: %s\n\n' "$SCRIPT_DIR/Bink-토큰-설치-가이드.txt"
if [ ! -f "$INSTALLER" ]; then
  printf '설치 파일을 찾을 수 없습니다: %s\n' "$INSTALLER" >&2
  STATUS=1
else
  sh "$INSTALLER"
  STATUS=$?
fi

if [ "$STATUS" -eq 0 ]; then
  printf '\nAWS 광고 OS 연결을 설정합니다.\n\n'
  if [ -f "$CONNECTOR" ]; then
    sh "$CONNECTOR"
    STATUS=$?
  else
    printf 'OS 연결 파일을 찾을 수 없습니다: %s\n' "$CONNECTOR" >&2
    STATUS=1
  fi
fi

if [ "$STATUS" -eq 0 ]; then
  printf '\n설치가 완료됐습니다. Claude Code를 다시 실행하세요.\n'
else
  printf '\n설치에 실패했습니다. 위 오류를 확인하세요.\n' >&2
fi

printf '\n이 창을 닫으려면 Enter를 누르세요.'
read _unused
exit "$STATUS"
