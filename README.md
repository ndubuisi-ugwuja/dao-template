# DAO Governance System

A production-ready decentralized autonomous organization (DAO) built with OpenZeppelin's governance framework, featuring on-chain voting, proposal execution through a timelock, and comprehensive testing.

[![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow.svg)](https://hardhat.org/)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-5.5.0-blue.svg)](https://www.openzeppelin.com/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-orange.svg)](https://soliditylang.org/)
[![License](https://img.shields.io/badge/License-UNLICENSED-red.svg)](https://soliditylang.org/)

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Contracts](#-contracts)
- [Getting Started](#-getting-started)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Usage](#-usage)
- [Security](#-security)
- [Contributing](#-contributing)
- [License](#-license)

## 🎯 Overview

This DAO governance system enables token holders to collectively make decisions through on-chain proposals and voting. The system uses a timelock mechanism to ensure a delay between proposal approval and execution, providing time for stakeholders to react to governance decisions.

**Key Components:**

- **GovernanceToken**: ERC20 token with voting capabilities (ERC20Votes)
- **Governor**: Main governance contract for proposals and voting
- **TimeLock**: Enforces execution delays on approved proposals
- **Box**: Example governance-controlled contract

## ✨ Features

- ✅ **On-chain Governance**: Fully decentralized decision-making
- ✅ **Token-based Voting**: 1 token = 1 vote with delegation support
- ✅ **Timelock Protection**: Mandatory delay before proposal execution
- ✅ **Flexible Parameters**: Configurable voting periods, delays, and quorum
- ✅ **OpenZeppelin Standard**: Battle-tested governance contracts
- ✅ **Comprehensive Testing**: Unit tests and staging tests included
- ✅ **Hardhat Ignition**: Declarative deployment system
- ✅ **Multi-network Support**: Deploy to localhost, testnets, or mainnet

## 🏗️ Architecture

```architecture
┌─────────────────┐
│ GovernanceToken │ (ERC20Votes)
└────────┬────────┘
         │
         │ voting power
         ▼
┌─────────────────┐      proposes       ┌──────────┐
│    Governor     │ ──────────────────► │ TimeLock │
│   (Proposals)   │                     │ (Delays) │
└─────────────────┘                     └─────┬────┘
                                              │
                                              │ executes
                                              ▼
                                        ┌──────────┐
                                        │   Box    │
                                        │ (Target) │
                                        └──────────┘
```

### Governance Flow

1. **Delegate**: Token holders delegate voting power to themselves or others
2. **Propose**: Users with sufficient voting power create proposals
3. **Vote**: Token holders vote For/Against/Abstain during voting period
4. **Queue**: Successful proposals are queued in the TimeLock
5. **Execute**: After delay, anyone can execute queued proposals

## 📜 Contracts

### GovernanceToken.sol

ERC20 token with voting capabilities using OpenZeppelin's ERC20Votes extension.

- **Total Supply**: 1,000,000 tokens
- **Voting**: Checkpoint-based voting power
- **Delegation**: Required before voting

### GovernorContract.sol

Main governance contract inheriting from multiple OpenZeppelin Governor extensions.

- **Extensions**: Settings, CountingSimple, Votes, VotesQuorumFraction, TimelockControl
- **Voting Delay**: Configurable delay before voting starts
- **Voting Period**: Duration of voting
- **Quorum**: Minimum percentage of votes required

### TimeLock.sol

Timelock controller that enforces delays on proposal execution.

- **Min Delay**: Minimum time between queue and execution
- **Roles**: Proposer (Governor), Executor (anyone), Admin (self)

### Box.sol

Example governance-controlled contract demonstrating DAO control.

- **Owner**: TimeLock contract (controlled by DAO)
- **Function**: Stores a single value that only governance can change

## 🚀 Getting Started

### Prerequisites

- Node.js v18+ and npm/yarn
- Basic understanding of Ethereum and Solidity
- Testnet ETH for deployment (Sepolia recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/ndubuisi-ugwuja/dao-template.git
cd dao-template

# Install dependencies
yarn install

# Copy environment variables
cp .env.example .env
```

### Environment Setup

Create a `.env` file with the following:

```env
# Network Configuration
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key   // For etherscan Verification

# Deployed Contract Addresses (after deployment)
GOVERNANCE_TOKEN_ADDRESS=
GOVERNOR_ADDRESS=
TIMELOCK_ADDRESS=
BOX_ADDRESS=

# For proposals
PROPOSAL_ID=
NEW_VALUE=

```

### Compile Contracts

```bash
yarn hardhat compile
```

## 🌐 Deployment

### Local Deployment (Testing)

```bash
# Start local Hardhat node
yarn hardhat node

# Deploy to localhost (in another terminal)
yarn hardhat ignition deploy ignition/modules/FullDaoModule.ts --network localhost
```

### Testnet Deployment (Sepolia)

```bash
# Deploy to Sepolia
yarn hardhat ignition deploy ignition/modules/FullDaoModule.ts --network sepolia

# Verify contracts on Etherscan
yarn hardhat ignition verify deployments/chain-11155111
```

## 🧪 Testing

### Unit Tests

Run comprehensive unit tests on local Hardhat network:

```bash
# Run all unit tests
yarn hardhat test

# Run with coverage
yarn hardhat coverage

# Run with gas reporting
REPORT_GAS=true yarn hardhat test

# Run specific test file
yarn hardhat test test/dao-unit-test.ts
```

### Staging Tests

Test deployed contracts on testnets:

```bash
# Run staging tests on Sepolia
yarn hardhat test --network sepolia
```

## 💡 Usage

### Complete Governance Workflow

#### 1. Delegate Voting Power

```bash
# Delegate votes to yourself
yarn hardhat run scripts/delegate.ts --network sepolia

# Wait 1-2 blocks for voting power to activate
```

#### 2. Create a Proposal

```bash
# Create proposal with unique value set in your .env
yarn hardhat run scripts/create-proposal.ts --network sepolia

# Save the PROPOSAL_ID from output to .env
```

#### 3. Vote on Proposal

```bash
# Wait for voting delay to pass
# Check current block: await ethers.provider.getBlockNumber()

# Cast your vote
yarn hardhat run scripts/vote.ts --network sepolia
```

#### 4. Queue Proposal

```bash
# Wait for voting period to end
# Proposal must have succeeded (reached quorum)

# Queue in TimeLock
yarn hardhat run scripts/queue.ts --network sepolia
```

#### 5. Execute Proposal

```bash
# Wait for TimeLock delay (e.g., 300 seconds on Sepolia)

# Execute the proposal
yarn hardhat run scripts/execute.ts --network sepolia
```

## ⚙️ Configuration

### Hardhat Config

Key configurations in `hardhat.config.ts`:

```typescript
const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.28",
        settings: {
            evmVersion: "cancun", // Required for OpenZeppelin 5.5.0
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        sepolia: {
            url: process.env.SEPOLIA_RPC_URL,
            accounts: [process.env.PRIVATE_KEY],
            chainId: 11155111,
        },
    },
};
```

### Governance Parameters

#### Voting Delay

Blocks to wait before voting starts after proposal creation.

- **Localhost**: 1 block (~12 seconds)
- **Testnet**: 1 block (~12 seconds)
- **Mainnet**: 7200 blocks (~1 day)

#### Voting Period

Duration of voting in blocks.

- **Localhost**: 5 blocks (~1 minute)
- **Testnet**: 5 blocks (~1 minute)
- **Mainnet**: 50400 blocks (~7 days)

#### Quorum Percentage

Minimum percentage of total supply that must vote for proposal to pass.

- **Default**: 4% of total supply

#### TimeLock Delay

Seconds to wait between queue and execution.

- **Localhost**: 10 seconds
- **Testnet**: 10 seconds
- **Mainnet**: 172800 seconds (2 days)

## 🔒 Security

### Access Control

- **PROPOSER_ROLE**: Only Governor contract can propose to TimeLock
- **EXECUTOR_ROLE**: Anyone can execute (address(0))
- **DEFAULT_ADMIN_ROLE**: TimeLock is self-administered

### Best Practices

✅ **DO:**

- Always test on testnet first
- Verify contracts on Etherscan
- Use multi-sig for critical operations
- Document all governance parameters
- Monitor proposal events
- Keep private keys secure

❌ **DON'T:**

- Deploy to mainnet without testing
- Share private keys
- Use low gas limits
- Skip timelock delays
- Ignore failed transactions
- Deploy with admin backdoors

### Audit Recommendations

Before mainnet deployment:

1. Complete security audit by reputable firm
2. Bug bounty program
3. Formal verification of critical functions
4. Emergency pause mechanism (if needed)
5. Multi-sig control for admin functions

## 📊 Gas Optimization

Estimated gas costs on Ethereum mainnet:

| Operation        | Gas Cost (est.) | USD Cost @ 30 gwei |
| ---------------- | --------------- | ------------------ |
| Deploy Full DAO  | ~5,000,000      | ~$150              |
| Delegate         | ~150,000        | ~$4.50             |
| Create Proposal  | ~200,000        | ~$6.00             |
| Cast Vote        | ~100,000        | ~$3.00             |
| Queue Proposal   | ~150,000        | ~$4.50             |
| Execute Proposal | ~100,000        | ~$3.00             |

Costs are estimates and vary with gas prices

## 🛠️ Troubleshooting

### Common Issues

**Issue**: "Cannot find module typechain-types"

```bash
# Solution: Compile contracts to generate TypeChain types
yarn hardhat compile
```

**Issue**: "execution reverted" when creating proposal

```bash
# Solution: Delegate votes and wait 1 block
yarn hardhat run scripts/delegate.ts --network sepolia
# Wait 12-24 seconds, then create proposal
```

## 📚 Resources

### Documentation

- [OpenZeppelin Governor](https://docs.openzeppelin.com/contracts/4.x/governance)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Hardhat Ignition](https://hardhat.org/ignition/docs/getting-started)
- [ERC20Votes](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20Votes)

### Learning Resources

- [OpenZeppelin Governance Guide](https://docs.openzeppelin.com/contracts/4.x/governance)
- [Compound Governance](https://compound.finance/governance)
- [DAO Patterns](https://ethereum.org/en/dao/)

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Install dependencies
yarn install

# Run tests
yarn test
```

## 📄 License

This project is UNLICENSED. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenZeppelin](https://openzeppelin.com/) for secure smart contract libraries
- [Hardhat](https://hardhat.org/) for development environment
- [Ethereum](https://ethereum.org/) community for governance standards

## 📞 Support

For questions and support:

- Open an issue on GitHub
- Review existing documentation
- Check troubleshooting guide

## 🗺️ Roadmap

- [ ] Add proposal cancellation functionality
- [ ] Implement voting power snapshots
- [ ] Create governance UI
- [ ] Add proposal templates
- [ ] Integrate with multisig wallets
- [ ] Add proposal simulation tools
- [ ] Create governance analytics dashboard

## 📈 Version History

### v1.0.0 (Current)

- Initial release
- Complete DAO implementation
- Comprehensive testing suite
- Deployment scripts
- Documentation

---

### Built with ❤️ for decentralized governance by Ndubuisi Ugwuja
