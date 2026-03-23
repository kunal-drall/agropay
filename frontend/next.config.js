/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@demox-labs/aleo-wallet-adapter-base',
    '@demox-labs/aleo-wallet-adapter-react',
    '@demox-labs/aleo-wallet-adapter-reactui',
    '@demox-labs/aleo-wallet-adapter-leo',
    '@aleo123/aleo-wallet-adapter-soter',
  ],
};

module.exports = nextConfig;
