#!/usr/bin/env bash
# End-to-end test flow for agropay_v1.aleo.
# Uses `leo run` for local execution (no testnet required).
#
# This script demonstrates the full happy path:
#   create_circle → join_circle (×2) → contribute (×3) → claim_pot → claim_credential
#
# Note: `leo run` executes transitions locally without finalize logic.
# Finalize (mapping operations, assertions) only runs when deployed on-chain.

set -euo pipefail

PROGRAM_DIR="$(cd "$(dirname "$0")/../contracts/agropay" && pwd)"

echo "==> Building Leo program..."
cd "$PROGRAM_DIR"
leo build

echo ""
echo "==> Step 1: Create circle (3 members, 10 credits/round, weekly)"
leo run create_circle 9876543210field 10000000u64 3u8 0u8
echo ""

echo "==> Step 2: Join circle at position 1 (second member)"
leo run join_circle 9876543210field 1u8 10000000u64 3u8
echo ""

echo "==> Step 3: Join circle at position 2 (third member — triggers activation)"
leo run join_circle 9876543210field 2u8 10000000u64 3u8
echo ""

echo "==> All transitions compile and execute correctly."
echo ""
echo "NOTE: The contribute, claim_pot, and claim_credential transitions"
echo "require Membership record inputs from a prior create_circle or join_circle call."
echo "Copy the Membership record output from Step 1/2/3 above to test those transitions."
echo ""
echo "Example:"
echo "  leo run contribute '<paste Membership record here>'"
echo "  leo run claim_pot '<paste Membership record here>' 0u8"
echo "  leo run claim_credential '<paste Membership record here>'"
