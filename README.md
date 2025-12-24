# DAO Template

A comprehensive smart contract template for building decentralized autonomous organizations (DAOs) with on-chain governance capabilities.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Governance Models](#governance-models)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Testing](#testing)
- [Deployment](#deployment)
- [Tools & Resources](#tools--resources)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

## Overview

This repository provides a production-ready foundation for creating DAOs with governance mechanisms. It includes smart contracts, deployment scripts, and examples demonstrating both on-chain and hybrid governance patterns.

### Key Components

- **Governance Token (ERC20)**: Token-based voting rights for DAO members
- **Governor Contract**: Handles proposal creation, voting, and execution
- **Timelock Controller**: Enforces a delay between proposal approval and execution
- **Example Contracts**: Sample contracts (Box) to demonstrate governance in action

## Features

- ✅ OpenZeppelin-based governance contracts
- ✅ Timelock mechanism for proposal execution
- ✅ Comprehensive test suite
- ✅ Ready-to-use deployment scripts
- ✅ Examples of proposal lifecycle (propose, vote, queue, execute)
- ✅ Support for both on-chain and hybrid governance models

## Governance Models

### On-Chain Governance

Fully decentralized governance where all voting and execution happens on the blockchain.

**Advantages:**

- Trustless execution
- Complete transparency
- No intermediaries required

**Tradeoffs:**

- Higher gas costs
- Slower execution due to on-chain processing

**Example Flow:**

1. Proposal created on-chain
2. Token holders vote directly on the blockchain
3. Approved proposals execute automatically via Timelock
4. Used by projects like Compound and Uniswap

### Hybrid Governance

Combines off-chain voting with on-chain execution for cost efficiency.

**Advantages:**

- Significantly lower gas costs
- Faster voting process
- Scalable for larger communities

**Tradeoffs:**

- Requires oracle or trusted multisig for execution
- Additional infrastructure needed

**Implementation Options:**

| Method         | Tool                   | Security Model                  |
| -------------- | ---------------------- | ------------------------------- |
| Oracle-based   | Chainlink              | Decentralized oracle network    |
| Multisig-based | Gnosis Safe + Snapshot | Trusted signers execute results |

## Getting Started

### Prerequisites

- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Node.js](https://nodejs.org/) (v14+ recommended)
- [Yarn](https://classic.yarnpkg.com/lang/en/docs/install/)

Verify installations:

```bash
git --version
node --version
yarn --version
```

### Installation

**Clone the repository:**

```bash
git clone https://github.com/ndubuisi-ugwuja/dao-template.git
cd dao-template
```

**Install dependencies:**

```bash
yarn install
```

**Create environment file:**

```bash
cp .env.example .env
```

**Configure your `.env` file with required variables:**

```env
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=your_rpc_url_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
GOVERNANCE_TOKEN_ADDRESS=your_deployed_address
GOVERNOR_ADDRESS=your_deployed_address
TIMELOCK_ADDRESS=your_deployed_address
BOX_ADDRESS=your_deployed_address
```

> ⚠️ **Security Warning**: Never commit your `.env` file or expose your private keys publicly.

## Testing

Run the complete test suite:

```bash
yarn hardhat test
```

For detailed gas reporting:

```bash
REPORT_GAS=true yarn hardhat test
```

## Usage

### Local Development Workflow

#### Step 1: Start Local Blockchain

```bash
yarn hardhat node
```

#### Step 2: Deploy Contracts

In a new terminal:

```bash
yarn hardhat run scripts/deploy.ts --network localhost
```

#### Step 3: Create a Proposal

```bash
yarn hardhat run scripts/propose.ts --network localhost
```

This script proposes a new value for the Box contract.

#### Step 4: Vote on Proposal

```bash
yarn hardhat run scripts/vote.ts --network localhost
```

#### Step 5: Queue and Execute

After the voting period ends and the proposal passes:

```bash
yarn hardhat run scripts/queue-and-execute.ts --network localhost
```

### Understanding the Process

1. **Deploy Phase**:
    - ERC20 governance token is deployed
    - Timelock contract is deployed (holds all permissions)
    - Governor contract is deployed (manages proposals)
    - Box contract is deployed (owned by Timelock)

2. **Propose Phase**:
    - Create a proposal to change Box value
    - Proposal enters pending state

3. **Vote Phase**:
    - Token holders vote (for, against, abstain)
    - Voting period is defined in Governor contract

4. **Queue Phase**:
    - Successful proposals are queued in Timelock
    - Delay period begins

5. **Execute Phase**:
    - After delay, anyone can execute the proposal
    - Changes take effect on-chain

## Deployment

### Testnet Deployment

Deploy to Sepolia testnet & verify source code:

```bash
yarn hardhat ignition deploy ignition/modules/FullDaoModule.ts --network sepolia --verify
```

### Mainnet Deployment

1. Ensure sufficient ETH for gas fees
2. Verify all contract parameters
3. Deploy:

```bash
yarn hardhat ignition deploy ignition/modules/FullDaoModule.ts --network mainnet --verify
```

## Tools & Resources

### Development Tools

- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/4.x/api/governance) - Secure governance primitives
- [OpenZeppelin Wizard](https://wizard.openzeppelin.com/#governor) - Contract generation tool
- [Hardhat](https://hardhat.org/) - Development environment

### Governance Platforms

- [Tally](https://www.withtally.com/) - On-chain governance interface
- [Snapshot](https://snapshot.org/) - Off-chain voting platform
- [Gnosis Safe](https://safe.global/) - Multisig wallet for hybrid governance

### No-Code DAO Solutions

- [Aragon](https://aragon.org/)
- [DAOhaus](https://daohaus.club/)
- [Colony](https://colony.io/)
- [Syndicate](https://syndicate.io/)

### Learning Resources

- [OpenZeppelin Governance Guide](https://docs.openzeppelin.com/contracts/4.x/governance)
- [Vitalik on DAOs](https://blog.ethereum.org/2014/05/06/daos-dacs-das-and-more-an-incomplete-terminology-guide/)
- [On-Chain Governance Analysis](https://vitalik.ca/general/2021/08/16/voting3.html)

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code:

- Passes all tests
- Follows the existing code style
- Includes appropriate documentation

## License

This project is unlicensed and free to use.

## Author

**Ndubuisi Ugwuja**  
X: [@joovhie\_](https://x.com/joovhie_)

## Acknowledgments

- OpenZeppelin team for governance contracts and documentation
- Compound Finance for pioneering on-chain governance
- Patrick Collins for the original DAO template inspiration

---

**Need Help?** Open an issue or reach out on X.
