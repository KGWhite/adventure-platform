#!/usr/bin/env bash
set -euo pipefail

# Directory where certificates should be placed
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERTS_DIR="${SCRIPT_DIR}/certs"

mkdir -p "${CERTS_DIR}"

EXTRA_HOST="${1:-}"

# Base SAN with localhost and loopback IP
SAN="DNS:localhost,IP:127.0.0.1"

if [ -n "${EXTRA_HOST}" ]; then
  # Determine if EXTRA_HOST is an IPv4 address
  if [[ "${EXTRA_HOST}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    SAN="${SAN},IP:${EXTRA_HOST}"
  else
    SAN="${SAN},DNS:${EXTRA_HOST}"
  fi
  echo "Generating development TLS certificate for localhost and ${EXTRA_HOST}..."
else
  echo "Generating development TLS certificate for localhost..."
fi

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "${CERTS_DIR}/server.key" \
  -out "${CERTS_DIR}/server.crt" \
  -subj "/CN=localhost" \
  -addext "subjectAltName=${SAN}"

echo "TLS certificate successfully generated at:"
echo "  - Certificate: ${CERTS_DIR}/server.crt"
echo "  - Private Key: ${CERTS_DIR}/server.key"
