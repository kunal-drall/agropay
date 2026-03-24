#!/usr/bin/env bash
# Deploy agropay_v1.aleo to the Aleo testnet.
#
# Prerequisites:
#   - Leo CLI installed: https://developer.aleo.org/leo/installation
#   - snarkOS installed: https://github.com/AleoHQ/snarkOS
#   - .env file at repo root with PRIVATE_KEY=APrivateKey1...
#   - Testnet account funded via https://faucet.aleo.org/

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROGRAM_DIR="$REPO_ROOT/contracts/agropay"
PROGRAM_NAME="agropay_v1"

# Load private key from .env
if [[ -f "$REPO_ROOT/.env" ]]; then
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
fi

if [[ -z "${PRIVATE_KEY:-}" ]]; then
  echo "ERROR: PRIVATE_KEY is not set. Add it to .env at the repo root."
  exit 1
fi

echo "==> Building Leo program..."
cd "$PROGRAM_DIR"
leo build

echo "==> Verifying build output..."
if [[ ! -d "$PROGRAM_DIR/build" ]]; then
  echo "ERROR: build/ directory not found after leo build."
  exit 1
fi

echo "==> Checking if ${PROGRAM_NAME}.aleo already exists on testnet..."
EXISTING=$(curl -sf "https://api.explorer.provable.com/v1/testnet/program/${PROGRAM_NAME}.aleo" || true)
if [[ -n "$EXISTING" ]]; then
  echo "WARNING: ${PROGRAM_NAME}.aleo appears to already be deployed."
  echo "         If this is your deployment, no action needed."
  echo "         To re-deploy, change the program name in program.json."
  read -rp "Continue anyway? [y/N] " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || exit 0
fi

echo "==> Deploying ${PROGRAM_NAME}.aleo to testnet..."
leo deploy \
  --network testnet \
  --endpoint "https://api.explorer.provable.com/v1" \
  --private-key "${PRIVATE_KEY}" \
  --broadcast --yes

echo ""
echo "==> Deployment submitted."
echo "    Check status: https://testnet.aleoscan.io/program?id=${PROGRAM_NAME}.aleo"
echo "    Verify via:   curl https://api.explorer.provable.com/v1/testnet/program/${PROGRAM_NAME}.aleo"
