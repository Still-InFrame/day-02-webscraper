#!/usr/bin/env bash
#
# deploy.sh — deploy THIS app to Vercel and attach its subdomain.
# Run from this folder once the app works:   ./deploy.sh
#
# Subdomain auto-provisions DNS + SSL because Vercel runs 100dayaichallenge.com's DNS.
# Safe to re-run: link/domain steps no-op if they already exist.

set -euo pipefail

SLUG="webscraper"
DOMAIN="${SLUG}.100dayaichallenge.com"

# Run the Vercel CLI via npx (global installs fail on this machine; --cache dodges the
# corrupted npm cache). A function avoids zsh/bash word-splitting issues.
vercel_cli() { npx --yes --cache /tmp/npm-vercel-cache vercel@latest "$@"; }

echo "Linking + deploying to Vercel (production)..."
vercel_cli link --yes >/dev/null 2>&1 || true
vercel_cli --prod

echo "Attaching ${DOMAIN}..."
vercel_cli domains add "$DOMAIN" || true

cat <<EOF

  Deployed.
  Live at:  https://${DOMAIN}   (DNS + SSL settle in ~1 min)
  Also at:  the *.vercel.app URL printed above.

  Google-auth apps work automatically: the sandbox's *.100dayaichallenge.com
  wildcard already covers https://${DOMAIN}. Sign in via THIS subdomain
  (not the raw *.vercel.app URL).
  Log the app at https://100dayaichallenge.com

EOF
