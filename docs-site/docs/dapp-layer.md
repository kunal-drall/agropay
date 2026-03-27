---
sidebar_position: 5
title: DApp Layer
---

# DApp Layer

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS 3 + custom dark theme |
| State | Zustand |
| Wallet | `@demox-labs/aleo-wallet-adapter-react` |
| Toasts | `react-hot-toast` |
| Chain reads | Direct `fetch()` to Aleo RPC |
| Deployment | Vercel |

---

## Wallet Integration

Two wallets are supported:

- **Leo Wallet** (`@demox-labs/aleo-wallet-adapter-leo`)
- **Soter Wallet** (`@aleo123/aleo-wallet-adapter-soter`)

### Setup

```tsx
// WalletProvider.tsx
import { WalletProvider } from "@demox-labs/aleo-wallet-adapter-react";
import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";
import { SoterWalletAdapter } from "@aleo123/aleo-wallet-adapter-soter";
import { DecryptPermission, WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";

const wallets = [
  new SoterWalletAdapter({ appName: "AGROPAY" }),
  new LeoWalletAdapter({ appName: "AGROPAY" }),
];

<WalletProvider
  wallets={wallets}
  decryptPermission={DecryptPermission.UponRequest}
  network={WalletAdapterNetwork.Testnet}
  autoConnect
  onError={(err) => toast.error(err.message)}
>
  {children}
</WalletProvider>
```

### Connecting

```tsx
// ConnectButton.tsx
const { wallets, select } = useWallet();

// Just call select() — autoConnect handles the rest
function handleSelectWallet(walletName: string) {
  select(walletName);
}
```

The `autoConnect` prop in `WalletProvider` fires an effect whenever the selected adapter changes. When `select(walletName)` is called, the adapter is set, the autoConnect effect runs, and the wallet extension popup appears.

### Reading Records

```tsx
const { requestRecords, connected } = useWallet();

const records = await requestRecords("agropay_v1.aleo");
const memberships = records.filter(r => r.recordName === "Membership");
```

---

## Executing Transactions

```typescript
// lib/aleo.ts
import { Transaction, WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";

export function buildTransaction(
  programId: string,
  functionName: string,
  inputs: string[],
  feeCredits: number,
): AleoTransaction {
  return Transaction.createTransaction(
    publicKey,           // from useWallet()
    WalletAdapterNetwork.Testnet,
    programId,
    functionName,
    inputs,
    Math.floor(feeCredits * 1_000_000),
    false,               // privateFee
  );
}
```

Then execute via `requestTransaction`:

```typescript
const { requestTransaction, transactionStatus } = useWallet();

const txId = await requestTransaction(tx);

// Poll for confirmation
let status = "pending";
while (status === "pending") {
  await sleep(3000);
  status = await transactionStatus(txId);
}
```

---

## Pages

### `/` — Dashboard

- Requires wallet connection
- Calls `requestRecords(PROGRAM_ID)` to get all `Membership` records
- For each membership: reads `circles`, `rounds`, `members` mappings in parallel
- Shows circle cards with status, round progress, contribution amount
- Empty state with "Create your first circle" CTA

### `/create` — Create Circle

- Form: name (off-chain), amount, members, frequency
- On submit: calls `create_circle` transition
- On success: shows TX ID toast, share link

### `/circle/[id]` — Circle Detail

State machine based on `circleInfo.status`:

```
PENDING (0)
  ├─ User is member  →  "Waiting for N more members"
  └─ User not member →  Join button

ACTIVE (1)
  ├─ position == current_round AND all contributed  →  Claim Pot button
  └─ otherwise  →  Contribute button

COMPLETED (2)
  └─ Claim Credential button
```

---

## No Mock Data Policy

Every value shown in the UI comes from:
1. The Aleo blockchain (via RPC or wallet)
2. The Go backend (circle names only)

If a chain read fails → error state + retry button.
If wallet not connected → "Connect Wallet" prompt, not a spinner.
If backend unavailable → circle ID shown instead of name (graceful degradation).

---

## Repository Structure

```
frontend/
├── app/
│   ├── layout.tsx          # WalletProvider, Toaster, fonts
│   ├── page.tsx            # Dashboard
│   ├── create/page.tsx     # Create circle
│   └── circle/[id]/page.tsx # Circle detail
├── components/
│   ├── WalletProvider.tsx
│   ├── ConnectButton.tsx
│   ├── CircleCard.tsx
│   ├── CreateCircleForm.tsx
│   ├── ContributeButton.tsx
│   ├── ClaimPotButton.tsx
│   ├── CircleProgress.tsx
│   └── TxStatus.tsx
└── lib/
    ├── aleo.ts             # executeTransition(), API_URL, NETWORK
    ├── program.ts          # Transition names, generateCircleId()
    ├── records.ts          # getCircleInfo(), getRoundState(), getMemberCount()
    └── store.ts            # Zustand: membershipRecords, circleCache
```
