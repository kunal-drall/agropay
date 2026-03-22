# agropay_v1.aleo

Leo smart contract for AGROPAY — privacy-preserving savings circles on Aleo.

## Build

```bash
cd contracts/agropay
leo build
```

Build output is in `build/`. Requires [Leo CLI](https://developer.aleo.org/leo/installation).

## Test transitions locally

```bash
# Create a circle (3 members, 10 credits/round, weekly)
leo run create_circle 1234567890field 10000000u64 3u8 0u8

# Join a circle at position 1 (must match current member count)
leo run join_circle 1234567890field 1u8 10000000u64 3u8

# Contribute (membership record consumed + recreated, receipt issued)
# Pass the Membership record output from create_circle or join_circle
leo run contribute <membership_record>

# Claim pot for round 0 (caller's position must == 0)
leo run claim_pot <membership_record> 0u8

# Claim credential after circle completes (status == 2)
leo run claim_credential <membership_record>
```

## Deploy to Aleo Testnet

```bash
# From repo root
source .env          # Requires PRIVATE_KEY=APrivateKey1...
bash scripts/deploy.sh
```

Requires a funded testnet account from [faucet.aleo.org](https://faucet.aleo.org/).

After deployment, verify:
```bash
curl "https://api.explorer.provable.com/v1/testnet/program/agropay_v1.aleo"
```

## Privacy model

| Data | On-chain visibility |
|------|-------------------|
| Circle exists | **Public** (mapping) |
| Contribution amount | **Public** (same for all members) |
| Total members | **Public** |
| Contribution count | **Public** ("6 of 8 contributed") |
| WHO contributed | **Private** (record owner only) |
| WHO received the pot | **Private** (Payout record) |
| Savings history | **Private** (Credential record) |

## Known limitations

- `ContributionReceipt.round` is hardcoded to `0u8` — transitions cannot read mappings. The actual round is enforced in finalize. A future upgrade will pass round as an explicit input.
- No nullifier-based double-contribution prevention — the counter bound (`<= total_members`) limits damage but does not prevent a single member contributing multiple times. Nullifier system is a planned upgrade.
- No USDCx/USAD token movement — contributions are tracked without actual credit transfer. Production integration documented in `docs/ARCHITECTURE.md`.
