"use client";

import { WalletMultiButton } from "@demox-labs/aleo-wallet-adapter-reactui";

// WalletMultiButton is the permitted wallet UI component from
// @demox-labs/aleo-wallet-adapter-reactui. It handles:
// - "Connect Wallet" state with modal opening
// - Connected state showing abbreviated address
// - Disconnect option
//
// Wrap in a div to override the default button styling with our earth-tone theme.
export function ConnectButton() {
  return (
    <div className="connect-btn-wrapper">
      <WalletMultiButton />
    </div>
  );
}
