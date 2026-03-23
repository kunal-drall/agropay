import { create } from "zustand";

// Raw record as returned by the wallet adapter's requestRecords.
// The exact shape depends on the wallet (Leo Wallet vs Soter), so we keep it as unknown
// and use the helpers in lib/program.ts to extract typed values.
export interface RawRecord {
  id?: string;
  owner?: string;
  program_id?: string;
  spent?: boolean;
  data?: Record<string, unknown>;
  // Some wallets return the full plaintext as a top-level field
  [key: string]: unknown;
}

interface AppStore {
  // Membership records from the wallet's requestRecords call.
  // Populated once per wallet connection; cleared on disconnect.
  membershipRecords: RawRecord[];
  recordsLoading: boolean;
  recordsError: string | null;

  setMembershipRecords: (records: RawRecord[]) => void;
  setRecordsLoading: (loading: boolean) => void;
  setRecordsError: (error: string | null) => void;
  clearRecords: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  membershipRecords: [],
  recordsLoading: false,
  recordsError: null,

  setMembershipRecords: (records) => set({ membershipRecords: records }),
  setRecordsLoading: (loading) => set({ recordsLoading: loading }),
  setRecordsError: (error) => set({ recordsError: error }),
  clearRecords: () =>
    set({ membershipRecords: [], recordsError: null, recordsLoading: false }),
}));
