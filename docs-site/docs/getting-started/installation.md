---
sidebar_position: 1
title: Installation
---

# Installation

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |
| Go | ≥ 1.22 | [go.dev](https://go.dev) |
| Leo CLI | ≥ 3.5 | See below |
| Git | Any | — |

### Install Leo CLI

```bash
# Install via cargo (Rust required)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install leo-lang
```

Verify:

```bash
leo --version
# Leo 3.5.x
```

### Browser Wallets

You need at least one Aleo wallet extension installed and connected to **Aleo Testnet**:

- **[Leo Wallet](https://leo.app/)** — desktop Chrome/Firefox extension
- **[Soter Wallet](https://soter.one/)** — privacy-focused Aleo wallet

---

## Clone the Repository

```bash
git clone https://github.com/kunal-drall/agropay.git
cd agropay
```

---

## Build the Leo Contract

```bash
cd contracts/agropay
leo build
```

Expected output:

```
✓ Compiled 'agropay_v1.aleo' into Aleo instructions.
✓ Generated ABI at 'build/abi.json'
```

---

## Install Frontend Dependencies

```bash
cd frontend
npm install
```

---

## Install Backend Dependencies

```bash
cd backend
go mod download
```
