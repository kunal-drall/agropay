import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { WalletProvider } from "@/components/WalletProvider";
import { ConnectButton } from "@/components/ConnectButton";
import "@/styles/globals.css";

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-dm-serif",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AGROPAY — Private Savings Circles on Aleo",
  description:
    "Privacy-preserving ROSCAs. Save together. Stay private. Build reputation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${dmSerif.variable} ${dmSans.variable} ${jetbrains.variable}`}
    >
      <body className="font-sans bg-earth-bg text-earth-text min-h-screen">
        <WalletProvider>
          {/* ── Sticky header ─────────────────────────────────────────────── */}
          <header
            className="sticky top-0 z-50 border-b"
            style={{
              borderColor: "rgba(255,255,255,0.07)",
              background: "rgba(13,13,20,0.82)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            <div className="max-w-content mx-auto px-6 h-16 flex items-center justify-between gap-4">
              {/* Logo */}
              <a href="/" className="flex items-center gap-3 shrink-0">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{
                    background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                    boxShadow: "0 0 12px rgba(139,92,246,0.5)",
                  }}
                >
                  A
                </div>
                <span className="font-serif text-lg tracking-tight gradient-text font-medium">
                  AGROPAY
                </span>
                <span className="protocol-badge hidden sm:inline-flex">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"
                    style={{ boxShadow: "0 0 6px #10b981" }}
                  />
                  testnet
                </span>
              </a>

              <ConnectButton />
            </div>
          </header>

          {/* ── Page content ──────────────────────────────────────────────── */}
          <main>{children}</main>

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <footer
            className="mt-24 py-8 border-t"
            style={{ borderColor: "rgba(255,255,255,0.07)" }}
          >
            <div className="max-w-content mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-xs text-earth-muted">
              <span>
                AGROPAY &mdash; Private savings circles on Aleo
              </span>
              <div className="flex items-center gap-4">
                <a
                  href="https://aleo.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-earth-text transition-colors"
                >
                  Aleo
                </a>
                <a
                  href="https://testnet.aleoscan.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-earth-text transition-colors"
                >
                  Explorer
                </a>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-earth-text transition-colors"
                >
                  GitHub
                </a>
              </div>
            </div>
          </footer>

          {/* ── Toast notifications ───────────────────────────────────────── */}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#1a1a2e",
                color: "#f1f5f9",
                borderRadius: "12px",
                fontSize: "13px",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              },
              success: {
                iconTheme: { primary: "#10b981", secondary: "#1a1a2e" },
              },
              error: {
                iconTheme: { primary: "#f87171", secondary: "#1a1a2e" },
              },
            }}
          />
        </WalletProvider>
      </body>
    </html>
  );
}
