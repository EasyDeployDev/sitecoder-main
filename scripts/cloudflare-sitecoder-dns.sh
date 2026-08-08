#!/usr/bin/env bash
# Create Cloudflare DNS for sitecoder on useprivy.app → Zerops appdev.
# Requires: CLOUDFLARE_API_TOKEN (Zone.DNS Edit on useprivy.app)
#
# Zerops project CNAME zone: o89reg1isfftj904u8i2ndfcb80.prg1-zerops.zone
# Zerops project IPv6:       2a00:1ed0:1100::160:0:28a4
#
# Per https://docs.zerops.io/references/networking/cloudflare
# Prefer proxied AAAA (IPv6-only) when using Cloudflare orange-cloud.
set -euo pipefail

ZONE_NAME="${CLOUDFLARE_ZONE_NAME:-useprivy.app}"
TOKEN="${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN}"
# DNS-only CNAME target (Zerops project public zone)
CNAME_TARGET="${ZEROPS_CNAME_TARGET:-o89reg1isfftj904u8i2ndfcb80.prg1-zerops.zone}"
IPV6="${ZEROPS_IPV6:-2a00:1ed0:1100::160:0:28a4}"
# Mode: cname (DNS only) | aaaa (proxied IPv6 — recommended with CF proxy)
MODE="${DNS_MODE:-aaaa}"

api() {
  local method="$1" path="$2" data="${3:-}"
  if [[ -n "$data" ]]; then
    curl -sS -X "$method" "https://api.cloudflare.com/client/v4$path" \
      -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      --data "$data"
  else
    curl -sS -X "$method" "https://api.cloudflare.com/client/v4$path" \
      -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json"
  fi
}

ZONE_ID=$(api GET "/zones?name=${ZONE_NAME}" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["result"][0]["id"] if d.get("success") and d.get("result") else "")')
if [[ -z "$ZONE_ID" ]]; then
  echo "Could not resolve zone id for $ZONE_NAME" >&2
  exit 1
fi
echo "Zone $ZONE_NAME → $ZONE_ID"

upsert() {
  local type="$1" name="$2" content="$3" proxied="$4"
  local fqdn="$name"
  [[ "$name" == "@" ]] && fqdn="$ZONE_NAME" || true
  [[ "$name" != "@" && "$name" != *.* ]] && fqdn="${name}.${ZONE_NAME}"

  local existing
  existing=$(api GET "/zones/${ZONE_ID}/dns_records?type=${type}&name=${fqdn}")
  local id
  id=$(printf '%s' "$existing" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["result"][0]["id"] if d.get("result") else "")')

  local body
  body=$(python3 - <<PY
import json
print(json.dumps({
  "type": "$type",
  "name": "$name",
  "content": "$content",
  "ttl": 1,
  "proxied": json.loads("$proxied"),
}))
PY
)

  if [[ -n "$id" ]]; then
    echo "Update $type $fqdn → $content (proxied=$proxied)"
    api PUT "/zones/${ZONE_ID}/dns_records/${id}" "$body" | python3 -c 'import sys,json; d=json.load(sys.stdin); print("ok" if d.get("success") else d)'
  else
    echo "Create $type $fqdn → $content (proxied=$proxied)"
    api POST "/zones/${ZONE_ID}/dns_records" "$body" | python3 -c 'import sys,json; d=json.load(sys.stdin); print("ok" if d.get("success") else d)'
  fi
}

# sitecoder + preview hostnames on useprivy.app
for name in sitecoder preview; do
  if [[ "$MODE" == "cname" ]]; then
    upsert CNAME "$name" "$CNAME_TARGET" false
  else
    upsert AAAA "$name" "$IPV6" true
  fi
done

echo "Done. Verify:"
echo "  dig AAAA sitecoder.useprivy.app +short"
echo "  dig AAAA preview.useprivy.app +short"
echo "  curl -I https://sitecoder.useprivy.app/login"
