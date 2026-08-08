#!/usr/bin/env bash
# Pack the sitecoder-ui:zerops image into ./zerops-ui-deploy for zcli service deploy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="${SITECODER_UI_IMAGE:-sitecoder-ui:zerops}"
OUT="${ROOT}/zerops-ui-deploy"

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "Image not found: $IMAGE" >&2
  echo "Build first: docker build -t $IMAGE ." >&2
  exit 1
fi

rm -rf "$OUT"
mkdir -p "$OUT"

CID="$(docker create "$IMAGE")"
cleanup() { docker rm -f "$CID" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker cp "$CID:/app/." "$OUT/"

# Ensure Next standalone layout is complete
if [[ ! -f "$OUT/server.js" ]]; then
  echo "Missing server.js in packed output (standalone build required)." >&2
  exit 1
fi

if [[ ! -d "$OUT/.next/static" ]]; then
  echo "Missing .next/static in packed output." >&2
  exit 1
fi

if [[ ! -d "$OUT/prisma" ]]; then
  echo "Missing prisma/ in packed output." >&2
  exit 1
fi

# Drop cache/noise that is not needed at runtime
rm -rf "$OUT/.npm" "$OUT/.cache" 2>/dev/null || true

# zerops.yml must live beside server.js so --working-dir zerops-ui-deploy works.
# Inject Clerk/Polar secrets from .env.local into the *packed* yaml only (not committed).
cp "$ROOT/zerops.yml" "$OUT/zerops.yml"
if [[ -f "$ROOT/.env.local" ]]; then
  python3 - <<'PY' "$ROOT/.env.local" "$OUT/zerops.yml"
import sys, re
from pathlib import Path
env_path, yml_path = map(Path, sys.argv[1:3])
env = {}
for line in env_path.read_text().splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

keys = [
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "POLAR_ACCESS_TOKEN",
    "POLAR_WEBHOOK_SECRET",
    "NEXT_PUBLIC_SITE_URL",
]
yml = yml_path.read_text()
# Insert after POLAR_SERVER line if present, else after APP_ROLE
anchor = "POLAR_SERVER: production"
if anchor not in yml:
    anchor = 'APP_ROLE: main'
block = "\n".join(
    f"        {k}: {env[k]}" for k in keys if env.get(k)
)
if block and anchor in yml:
    yml = yml.replace(anchor, anchor + "\n" + block, 1)
    yml_path.write_text(yml)
    print("Injected runtime secrets into packed zerops.yml:", ", ".join(k for k in keys if env.get(k)))
else:
    print("No secrets injected (missing .env.local keys or anchor)")
PY
fi

echo "Packed → $OUT"
du -sh "$OUT"
echo "Deploy with:"
echo "  npx @zerops/zcli service deploy appdev -P A7gReOyiQkAbgLqR9rEfNg --setup appdev --working-dir zerops-ui-deploy --path-to-file-or-dir . -v"
