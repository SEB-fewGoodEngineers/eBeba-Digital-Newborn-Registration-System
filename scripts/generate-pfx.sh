#!/usr/bin/env bash
# Generate a self-signed PKCS#12 certificate for demo PDF signing.
# Run once, from anywhere. The output (server/certs/) is gitignored.
set -euo pipefail

# Always work from the repo root, no matter where the script is invoked from.
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CERT_DIR="$REPO_ROOT/server/certs"
mkdir -p "$CERT_DIR"

# 1. Private key + self-signed certificate (4096-bit RSA, 365 days).
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout "$CERT_DIR/key.pem" \
  -out "$CERT_DIR/cert.pem" \
  -days 365 \
  -subj "/CN=eBeba Demo Signer/O=eBeba Demo/C=ME"

# 2. Bundle into PKCS#12 with a random password. The password goes to .env.
PFX_PASSWORD="$(openssl rand -base64 24)"
openssl pkcs12 -export \
  -out "$CERT_DIR/signer.pfx" \
  -inkey "$CERT_DIR/key.pem" \
  -in "$CERT_DIR/cert.pem" \
  -passout "pass:$PFX_PASSWORD"

echo
echo "Wrote $CERT_DIR/signer.pfx"
echo "Put these two lines in server/.env:"
echo "PDF_SIGNER_PFX_PATH=server/certs/signer.pfx"
echo "PDF_SIGNER_PFX_PASSWORD=$PFX_PASSWORD"