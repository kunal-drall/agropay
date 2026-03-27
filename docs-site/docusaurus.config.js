// @ts-check
const { themes } = require("prism-react-renderer");

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "AGROPAY",
  tagline: "Privacy-preserving savings circles on Aleo",
  favicon: "img/favicon.ico",

  url: "https://docs.agropay.xyz",
  baseUrl: "/",

  organizationName: "xxix-labs",
  projectName: "agropay-docs",

  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          editUrl: "https://github.com/kunal-drall/agropay/tree/main/docs-site/",
        },
        blog: false,
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: "dark",
        disableSwitch: false,
        respectPrefersColorScheme: false,
      },

      image: "img/agropay-social.png",

      navbar: {
        title: "AGROPAY",
        logo: {
          alt: "AGROPAY",
          src: "img/logo.svg",
          srcDark: "img/logo.svg",
        },
        items: [
          {
            type: "docSidebar",
            sidebarId: "mainSidebar",
            position: "left",
            label: "Docs",
            docsPluginId: "default",
          },
          {
            href: "https://agropay-frontend.vercel.app",
            label: "Launch App",
            position: "right",
          },
          {
            href: "https://testnet.aleoscan.io/program?id=agropay_v1.aleo",
            label: "Explorer",
            position: "right",
          },
          {
            href: "https://github.com/kunal-drall/agropay",
            label: "GitHub",
            position: "right",
          },
        ],
      },

      footer: {
        style: "dark",
        links: [
          {
            title: "Protocol",
            items: [
              { label: "Introduction", to: "/docs/intro" },
              { label: "Getting Started", to: "/docs/getting-started/installation" },
              { label: "Contract Reference", to: "/docs/contract-reference/overview" },
            ],
          },
          {
            title: "Live",
            items: [
              { label: "App", href: "https://agropay-frontend.vercel.app" },
              {
                label: "agropay_v1.aleo on Testnet",
                href: "https://testnet.aleoscan.io/program?id=agropay_v1.aleo",
              },
              { label: "GitHub", href: "https://github.com/kunal-drall/agropay" },
            ],
          },
          {
            title: "XXIX Labs",
            items: [
              { label: "kd@kosh.finance", href: "mailto:kd@kosh.finance" },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} XXIX Labs — Save together. Stay private. Build reputation.`,
      },

      prism: {
        theme: themes.dracula,
        darkTheme: themes.dracula,
        additionalLanguages: ["bash", "json", "typescript"],
      },

      algolia: undefined,
    }),
};

module.exports = config;
