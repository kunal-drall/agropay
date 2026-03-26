"use client";

import { FC, ReactNode, useCallback, useMemo } from "react";
import { WalletProvider as AleoWalletProvider } from "@demox-labs/aleo-wallet-adapter-react";
import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";
import {
  Adapter,
  DecryptPermission,
  WalletAdapterNetwork,
  WalletError,
} from "@demox-labs/aleo-wallet-adapter-base";
import { SoterWalletAdapter } from "@aleo123/aleo-wallet-adapter-soter";
import toast from "react-hot-toast";

interface Props {
  children: ReactNode;
}

export const WalletProvider: FC<Props> = ({ children }) => {
  const wallets = useMemo(
    () =>
      [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new SoterWalletAdapter({ appName: "AGROPAY" }) as any as Adapter,
        new LeoWalletAdapter({ appName: "AGROPAY" }),
      ] as Adapter[],
    []
  );

  const onError = useCallback((error: WalletError) => {
    const msg = error.message || error.name || "Wallet error";
    // Suppress "no wallet selected" noise — happens on page load with autoConnect
    if (msg.toLowerCase().includes("no wallet selected")) return;
    toast.error(msg);
  }, []);

  return (
    <AleoWalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.UponRequest}
      network={WalletAdapterNetwork.Testnet}
      autoConnect
      onError={onError}
    >
      {children}
    </AleoWalletProvider>
  );
};
