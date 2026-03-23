import {
  Transaction,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";

export const PROGRAM_ID = "agropay_v1.aleo";
export const NETWORK = WalletAdapterNetwork.Testnet;
export const API_URL = "https://api.explorer.provable.com/v1";

// Execute a transition via the connected wallet.
// Returns the transaction ID if the wallet accepts it (not yet confirmed on-chain).
export async function executeTransition(
  publicKey: string,
  requestTransaction: (transaction: Transaction) => Promise<string | undefined>,
  functionName: string,
  inputs: string[],
  fee: number
): Promise<string | undefined> {
  const tx = Transaction.createTransaction(
    publicKey,
    NETWORK,
    PROGRAM_ID,
    functionName,
    inputs,
    fee,
    false // fee_private: false — use public credits for the fee
  );

  return requestTransaction(tx);
}

// Read a public mapping value from the Aleo testnet.
// Returns null if the key doesn't exist or on any network error.
export async function getMappingValue(
  mappingName: string,
  key: string
): Promise<string | null> {
  const url = `${API_URL}/testnet/program/${PROGRAM_ID}/mapping/${mappingName}/${key}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const data = await res.json();
    // Aleo RPC returns null (JSON) when the key doesn't exist
    if (data === null) return null;
    // Value is returned as a JSON-encoded Aleo value string
    return typeof data === "string" ? data : JSON.stringify(data);
  } catch {
    return null;
  }
}

// Check if a transaction has been confirmed.
// The Aleo explorer API returns 200 for confirmed transactions, 404 for pending/unknown.
export async function getTransactionStatus(
  txId: string
): Promise<"confirmed" | "pending" | "not_found"> {
  try {
    const res = await fetch(`${API_URL}/testnet/transaction/${txId}`, {
      cache: "no-store",
    });
    if (res.ok) return "confirmed";
    if (res.status === 404) return "not_found";
    return "pending";
  } catch {
    return "pending";
  }
}
