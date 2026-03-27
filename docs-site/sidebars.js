/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  mainSidebar: [
    {
      type: "doc",
      id: "intro",
      label: "Introduction",
    },
    {
      type: "category",
      label: "Getting Started",
      collapsible: true,
      collapsed: false,
      items: [
        "getting-started/installation",
        "getting-started/quick-start",
        "getting-started/deploy",
      ],
    },
    {
      type: "doc",
      id: "architecture",
      label: "Architecture",
    },
    {
      type: "category",
      label: "Contract Reference",
      collapsible: true,
      collapsed: false,
      items: [
        "contract-reference/overview",
        "contract-reference/transitions",
        "contract-reference/records",
        "contract-reference/mappings",
      ],
    },
    {
      type: "doc",
      id: "dapp-layer",
      label: "DApp Layer",
    },
    {
      type: "doc",
      id: "security",
      label: "Security",
    },
    {
      type: "doc",
      id: "roadmap",
      label: "Roadmap",
    },
  ],
};

module.exports = sidebars;
