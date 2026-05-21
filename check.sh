#!/usr/bin/env bash
set -euo pipefail

# Repo root (script lives in repo root)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

printf '\n[1/5] Installing server dependencies...\n'
(cd "$ROOT_DIR/server" && npm ci)

printf '\n[2/5] Installing client dependencies...\n'
(cd "$ROOT_DIR/client" && npm ci)

printf '\n[3/5] Server syntax check...\n'
while IFS= read -r f; do
  node --check "$f" > /dev/null
done < <(find "$ROOT_DIR/server" -path "$ROOT_DIR/server/node_modules" -prune -o -type f -name '*.js' -print)
echo 'Server syntax check: OK'

printf '\n[4/5] Client production build...\n'
(cd "$ROOT_DIR/client" && npm run build)

printf '\n[5/5] Audit endpoints (best effort)...\n'
set +e
(cd "$ROOT_DIR/server" && npm audit --json > "$ROOT_DIR/server/.audit-server.json")
SERVER_AUDIT_EXIT=$?
(cd "$ROOT_DIR/client" && npm audit --json > "$ROOT_DIR/client/.audit-client.json")
CLIENT_AUDIT_EXIT=$?
set -e

echo "Server audit exit code: $SERVER_AUDIT_EXIT"
echo "Client audit exit code: $CLIENT_AUDIT_EXIT"
echo 'Done.'