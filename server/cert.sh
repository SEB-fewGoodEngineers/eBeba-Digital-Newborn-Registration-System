#!/usr/bin/env bash
# Generate a self-signed PKCS#12 certificate for demo PDF signing.
# Run once. The output (server/certs/signer.pfx) is gitignored.
set -euo pipefail

CERT_DIR="server/certs"
mkdir -p "$CERT_DIR"

# 1. Private key + self-signed certificate (4096-bit RSA, 365 days).
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout "$CERT_DIR/key.pem" \
  -out "$CERT_DIR/cert.pem" \
  -days 365 \
  -subj "/CN=eBeba Demo Signer/O=eBeba Demo/C=ME"

# 2. Bundle into PKCS#12 with a password. The password goes to .env.
PFX_PASSWORD="$(openssl rand -base64 24)"
openssl pkcs12 -export \
  -out "$CERT_DIR/signer.pfx" \
  -inkey "$CERT_DIR/key.pem" \
  -in "$CERT_DIR/cert.pem" \
  -passout "pass:$PFX_PASSWORD"

echo "Wrote $CERT_DIR/signer.pfx"
echo "Put this in .env:"
echo "PDF_SIGNER_PFX_PASSWORD=$PFX_PASSWORD"
echo "PDF_SIGNER_PFX_PATH=$CERT_DIR/signer.pfx"
