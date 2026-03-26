"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletReadyState } from "@demox-labs/aleo-wallet-adapter-base";
import toast from "react-hot-toast";

export function ConnectButton() {
  const { wallets, wallet, publicKey, connected, connecting, select, disconnect } = useWallet();

  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelectWallet = useCallback(
    (walletName: string) => {
      setModalOpen(false);

      const chosen = wallets.find((w) => w.adapter.name === walletName);
      if (!chosen) return;

      if (chosen.readyState === WalletReadyState.NotDetected) {
        const url = chosen.adapter.url;
        if (url) window.open(url, "_blank");
        toast.error(`${walletName} extension not found — install it first`);
        return;
      }

      // select() stores name → WalletProvider's autoConnect effect fires once adapter is set
      // WalletName is a branded string — cast required
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select(walletName as any);
    },
    [wallets, select]
  );

  const copyAddress = useCallback(async () => {
    if (!publicKey) return;
    await navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [publicKey]);

  // ─── Connected ────────────────────────────────────────────────────────────
  if (connected && publicKey) {
    const short = `${publicKey.slice(0, 6)}…${publicKey.slice(-4)}`;
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 14px",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: 500,
            background: "rgba(139,92,246,0.12)",
            border: "1px solid rgba(139,92,246,0.35)",
            color: "#c4b5fd",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 6px #10b981",
              flexShrink: 0,
            }}
          />
          {short}
          <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
        </button>

        {menuOpen && (
          <ul
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 8px)",
              background: "#1a1a2e",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              minWidth: 160,
              zIndex: 100,
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            {[
              { label: copied ? "Copied!" : "Copy address", fn: copyAddress },
              {
                label: "Disconnect",
                fn: () => { disconnect(); setMenuOpen(false); },
                red: true,
              },
            ].map(({ label, fn, red }) => (
              <li key={label}>
                <button
                  onClick={() => fn()}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 16px",
                    fontSize: 13,
                    color: red ? "#f87171" : "#e2e8f0",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget.style.background = "rgba(255,255,255,0.06)"))
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget.style.background = "transparent"))
                  }
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // ─── Connecting ───────────────────────────────────────────────────────────
  if (connecting) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          borderRadius: 12,
          fontSize: 13,
          color: "#94a3b8",
          background: "rgba(139,92,246,0.08)",
          border: "1px solid rgba(139,92,246,0.2)",
        }}
      >
        <span
          style={{
            width: 12,
            height: 12,
            border: "2px solid #8b5cf6",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            flexShrink: 0,
          }}
        />
        Connecting…
      </div>
    );
  }

  // ─── Disconnected ─────────────────────────────────────────────────────────
  return (
    <>
      <button onClick={() => setModalOpen(true)} className="btn-leaf">
        Connect Wallet
      </button>

      {modalOpen && (
        <div
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 360,
              background: "#13131f",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20,
              padding: 24,
              boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9" }}>
                Connect Wallet
              </span>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.07)",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Wallet list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {wallets.map((w) => {
                const installed = w.readyState === WalletReadyState.Installed;
                return (
                  <button
                    key={w.adapter.name}
                    onClick={() => handleSelectWallet(w.adapter.name)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgba(139,92,246,0.12)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "rgba(255,255,255,0.04)")
                    }
                  >
                    {w.adapter.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={w.adapter.icon}
                        alt={w.adapter.name}
                        width={32}
                        height={32}
                        style={{ borderRadius: 8, flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "rgba(139,92,246,0.2)",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#e2e8f0" }}>
                      {w.adapter.name}
                    </span>
                    {installed ? (
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 20,
                          background: "rgba(16,185,129,0.12)",
                          color: "#10b981",
                        }}
                      >
                        Detected
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "#475569" }}>Get →</span>
                    )}
                  </button>
                );
              })}
            </div>

            <p style={{ fontSize: 11, color: "#475569", textAlign: "center", marginTop: 16 }}>
              Aleo Testnet
            </p>
          </div>
        </div>
      )}
    </>
  );
}
