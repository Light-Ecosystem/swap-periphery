# Overview

Swap Periphery (https://github.com/Light-Ecosystem/swap-periphery) is a decentralized transaction route for interacting with Swap Core.

On the basis of UniswapV2, it has added:

- Adjusted the proportion of transaction fees attributable to the community to 50%
- Support Whitelist to manage tradable assets, obtain access qualifications through voting by the community, and avoid non-performing assets from entering the trading market;- - Support fee dynamic adjustment, the community to control the transaction fee;
- Support trading pairs containing stHOPE to claim LT rewards;
- Support community fee extraction and collection;

At the same time, the Development Environment, deployment scripts and on-chain contract verification scripts were upgraded and improved.

# Testing and Development

## Dependencies

Before you start using this repository, make sure you are familiar with the following:

1. [Node.js](****https://github.com/nodejs/release#release-schedule****)
2. [Yarn](****https://github.com/yarnpkg/yarn****)
3. Git

## Setup

```Bash
git clone https://github.com/Light-Ecosystem/swap-core.git
git clone https://github.com/Light-Ecosystem/swap-periphery.git
cd swap-periphery

yarn --cwd ../swap-core
yarn --cwd ../swap-core clean
yarn --cwd ../swap-core compile
yarn --cwd ../swap-core flatten
yarn --cwd ../swap-core link
yarn install
yarn link @uniswap/v2-core

# copy and update .env.ts file
cp .env.ts.example .env.ts

yarn clean
yarn compile
yarn flatten
```

### Running the Tests

```Bash
yarn test
```

### Deployment

```Bash
yarn deploy
```

### Verify

```Plain
yarn verify
```

# Audits and Security

Light DAO contracts have been audited by  SlowMist and Certic. These audit reports are made available on the [Audit](https://github.com/Light-Ecosystem/light-dao/tree/main/audit).

There is also an active [bug bounty](https://static.hope.money/bug-bounty.html) for issues which can lead to substantial loss of money, critical bugs such as a broken live-ness condition, or irreversible loss of funds.

## Community

If you have any questions about this project, or wish to engage with us:

- [Websites](https://hope.money/)
- [Medium](https://hope-ecosystem.medium.com/)
- [Twitter](https://twitter.com/hope_ecosystem)
- [Discord](https://discord.com/invite/hope-ecosystem)

## License

This project is licensed under the [GNU License](LICENSE) license.