# ๐ Scaffold-ETH Gitcoin Passport

> [Deployed to surge](https://best-father.surge.sh/)

> everything you need to build on Ethereum! ๐

๐งช Quickly experiment with Solidity using a frontend that adapts to your smart contract:

![image](https://user-images.githubusercontent.com/2653167/124158108-c14ca380-da56-11eb-967e-69cde37ca8eb.png)


# ๐โโ๏ธ Quick Start

Prerequisites: [Node](https://nodejs.org/en/download/) plus [Yarn](https://classic.yarnpkg.com/en/docs/install/) and [Git](https://git-scm.com/downloads)

> clone/fork ๐ scaffold-eth:

```bash
git clone https://github.com/scaffold-eth/scaffold-eth.git
```

> install and start your ๐ทโ Hardhat chain:

```bash
cd scaffold-eth
yarn install
yarn chain
```

> in a second terminal window, start your ๐ฑ frontend:

```bash
cd scaffold-eth
yarn start
```

> in a third terminal window, ๐ฐ deploy your contract:

```bash
cd scaffold-eth
yarn deploy
```

๐ Edit your smart contract `YourContract.sol` in `packages/hardhat/contracts`

๐ Edit your frontend `App.jsx` in `packages/react-app/src`

๐ผ Edit your deployment scripts in `packages/hardhat/deploy`

๐ฑ Open http://localhost:3000 to see the app

# ๐ P.S.

๐ You need an RPC key for testnets and production deployments, create an [Alchemy](https://www.alchemy.com/) account and replace the value of `ALCHEMY_KEY = xxx` in `packages/react-app/src/constants.js` with your new key.

# ๐๐จ Speedrun Ethereum
Register as a builder [here](https://speedrunethereum.com) and start on some of the challenges and build a portfolio.


# ๐ฌ Support Chat

Join the telegram [support chat ๐ฌ](https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA) to ask questions and find others building with ๐ scaffold-eth!

---

๐ Please check out our [Gitcoin grant](https://gitcoin.co/grants/2851/scaffold-eth) too!

