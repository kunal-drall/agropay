"use client";

import { FC, ReactNode, useMemo } from "react";
import { WalletProvider as AleoWalletProvider } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletModalProvider } from "@demox-labs/aleo-wallet-adapter-reactui";
import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";
import {
  Adapter,
  DecryptPermission,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";

// Soter Wallet — privacy-focused Aleo browser wallet
// Package: @aleo123/aleo-wallet-adapter-soter
// If this import fails, check the published export name at:
// https://www.npmjs.com/package/@aleo123/aleo-wallet-adapter-soter
import { SoterWalletAdapter } from "@aleo123/aleo-wallet-adapter-soter";

// Required styles for the wallet selection modal
import "@demox-labs/aleo-wallet-adapter-reactui/styles.css";

interface Props {
  children: ReactNode;
}

export const WalletProvider: FC<Props> = ({ children }) => {
  const wallets = useMemo(
    () =>
      [
        // Soter listed first as the privacy-native Aleo wallet
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new SoterWalletAdapter({ appName: "AGROPAY" }) as any as Adapter,
        new LeoWalletAdapter({ appName: "AGROPAY" }),
      ] as Adapter[],
    []
  );

  return (
    <AleoWalletProvider
      wallets={wallets}
      // UponRequest: wallet prompts user before decrypting any records
      decryptPermission={DecryptPermission.UponRequest}
      network={WalletAdapterNetwork.Testnet}
      autoConnect
    >
      <WalletModalProvider>{children}</WalletModalProvider>
    </AleoWalletProvider>
  );
};
