import React from "react";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import styles from "./index.module.css";

const features = [
  {
    accent: "#8b5cf6",
    title: "ZK Private",
    description:
      "Individual contributions, payouts, and member identities are protected by zero-knowledge proofs. Only you know what you do.",
  },
  {
    accent: "#10b981",
    title: "On-Chain Rules",
    description:
      "Every rotation is enforced by a Leo smart contract on Aleo. No admin can override the rules or steal the pot.",
  },
  {
    accent: "#f59e0b",
    title: "Build Reputation",
    description:
      "Completing a circle issues a private Credential record. Share it selectively to prove your savings history without revealing your identity.",
  },
];

function Hero() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className="hero hero--primary">
      <div className="container" style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "80px 24px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 20, padding: "4px 14px", fontSize: 12, color: "#c4b5fd", marginBottom: 24 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981", display: "inline-block" }} />
          Live on Aleo Testnet
        </div>
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle" style={{ maxWidth: 520, margin: "0 auto 40px" }}>
          {siteConfig.tagline}. Zero-knowledge proofs keep contributions and payouts private while collective circle state stays publicly verifiable.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="button button--primary button--lg" to="/docs/getting-started/installation">
            Get Started →
          </Link>
          <Link
            className="button button--secondary button--lg"
            href="https://agropay-frontend.vercel.app"
          >
            Launch App
          </Link>
        </div>
      </div>
    </header>
  );
}

function Features() {
  return (
    <section style={{ padding: "64px 0", background: "var(--ifm-background-color)" }}>
      <div className="container">
        <div className="row">
          {features.map(({ accent, title, description }) => (
            <div key={title} className="col col--4" style={{ marginBottom: 24 }}>
              <div className="feature-card">
                <div className="feature-accent" style={{ background: accent }} />
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, marginBottom: 0 }}>{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PrivacyTable() {
  const rows = [
    { info: "Circle exists (params, amounts)", visibility: "Public", public: true },
    { info: "N of M members contributed", visibility: "Public", public: true },
    { info: "Pot was claimed in round R", visibility: "Public", public: true },
    { info: "WHO contributed", visibility: "Private", public: false },
    { info: "WHO received the pot", visibility: "Private", public: false },
    { info: "Member identities", visibility: "Private", public: false },
    { info: "Your savings history (Credential)", visibility: "Private", public: false },
  ];

  return (
    <section style={{ padding: "64px 0", background: "var(--ifm-background-surface-color, #13131f)" }}>
      <div className="container" style={{ maxWidth: 700 }}>
        <h2 style={{ textAlign: "center", marginBottom: 8 }}>Privacy Model</h2>
        <p style={{ textAlign: "center", color: "#64748b", marginBottom: 40 }}>
          What the world sees vs. what only you can see.
        </p>
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Information</th>
              <th>Visibility</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ info, visibility, public: isPublic }) => (
              <tr key={info}>
                <td style={{ fontSize: 14 }}>{info}</td>
                <td>
                  <span className={isPublic ? "badge--public" : "badge--private"}>
                    {visibility}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function QuickLinks() {
  const links = [
    { label: "Contract on Testnet", href: "https://testnet.aleoscan.io/program?id=agropay_v1.aleo", desc: "agropay_v1.aleo on Aleo Explorer" },
    { label: "Live App", href: "https://agropay-frontend.vercel.app", desc: "Connect wallet and try it" },
    { label: "GitHub", href: "https://github.com/kunal-drall/agropay", desc: "Source code and contracts" },
  ];
  return (
    <section style={{ padding: "64px 0" }}>
      <div className="container">
        <h2 style={{ textAlign: "center", marginBottom: 40 }}>Live Deployment</h2>
        <div className="row" style={{ justifyContent: "center" }}>
          {links.map(({ label, href, desc }) => (
            <div key={label} className="col col--4" style={{ marginBottom: 16 }}>
              <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                <div className="feature-card" style={{ cursor: "pointer" }}>
                  <p style={{ fontWeight: 600, marginBottom: 4, color: "#a78bfa" }}>{label} ↗</p>
                  <p style={{ fontSize: 13, color: "#64748b", marginBottom: 0 }}>{desc}</p>
                </div>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <Hero />
      <main>
        <Features />
        <PrivacyTable />
        <QuickLinks />
      </main>
    </Layout>
  );
}
