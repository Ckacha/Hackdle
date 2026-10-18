#!/bin/bash
set -e
export PATH=/home/ck/.npm-global/bin:/usr/local/bin:/usr/bin:/bin
exec 9>/tmp/hackdle-deploy.lock
flock -n 9 || exit 0
cd /home/ck/hackdle
git fetch origin main --quiet
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [ "$LOCAL" != "$REMOTE" ] || [ "${1:-}" = "--force" ]; then
  echo "$(date -Is): deploying $LOCAL -> $REMOTE"
  git checkout -- package-lock.json 2>/dev/null || true
  git merge --ff-only --quiet origin/main
  npm ci --no-fund --no-audit --silent
  npm run build --silent
  PID=$(systemctl show -p MainPID --value hackdle 2>/dev/null || echo 0)
  if [ -n "$PID" ] && [ "$PID" != "0" ]; then
    kill "$PID"
    echo "$(date -Is): restarted (was pid $PID)"
  fi
  echo "$(date -Is): deploy complete"
fi
