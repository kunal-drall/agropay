---
sidebar_position: 2
title: Quick Start
---

# Quick Start

This guide walks you through running the frontend locally and completing a full circle flow on Aleo Testnet.

---

## 1. Run the Frontend

```bash
cd frontend
npm run dev
# Open http://localhost:3000
```

---

## 2. Connect Your Wallet

1. Open [localhost:3000](http://localhost:3000)
2. Click **Connect Wallet** in the top-right
3. Select **Leo Wallet** or **Soter Wallet**
4. Approve the connection in the extension popup
5. Make sure the wallet is set to **Aleo Testnet**

:::tip Get Testnet Credits
Fund your testnet address at [faucet.aleo.org](https://faucet.aleo.org). You need at least **5 ALEO** to cover fees for create + contribute + claim.
:::

---

## 3. Create a Circle

1. Click **+ New Circle** from the dashboard
2. Fill in the form:
   - **Name** — shown in the UI only (stored off-chain, Leo has no string type)
   - **Contribution Amount** — in ALEO credits (e.g. `1.0`)
   - **Members** — 3–12 members
   - **Frequency** — Weekly / Bi-weekly / Monthly
3. Click **Create Circle** → confirm in wallet popup
4. Wait for the transaction to confirm (~15 seconds on testnet)
5. Copy the **share link** and send it to your circle members

---

## 4. Join a Circle

Open the share link in a second browser (with a different wallet):

1. Click **Join Circle**
2. Confirm in wallet popup
3. The circle activates automatically when all seats fill

---

## 5. Contribute

Once the circle is Active (status shows "Active"):

1. Each member clicks **Contribute**
2. Confirm in wallet popup
3. The on-chain counter increments: "1 of 3 contributed", "2 of 3", "3 of 3"

---

## 6. Claim the Pot

When all members have contributed:

1. The member whose **position matches the current round** sees **Claim Pot**
2. Click it → confirm in wallet popup
3. The round advances (or circle completes on the final round)

---

## 7. Claim Your Credential

After the circle completes all rounds:

1. Click **Claim Credential**
2. A private `Credential` record is issued to your wallet
3. You can share this via view key to prove your savings history

---

## Test the Contract Locally (no wallet needed)

```bash
cd contracts/agropay

# Create a circle
leo run create_circle 9876543210field 10000000u64 3u8 0u8

# Join (position 1)
leo run join_circle 9876543210field 1u8 10000000u64 3u8

# Contribute
# (requires a Membership record from create/join output)
```
