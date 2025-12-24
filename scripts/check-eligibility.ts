import { ethers } from "hardhat";
import "dotenv/config";

/**
 * Check if you're eligible to propose
 * Run with: npx hardhat run scripts/check-eligibility.ts --network sepolia
 */
async function main() {
    const [deployer] = await ethers.getSigners();

    const GOVERNANCE_TOKEN_ADDRESS = process.env.GOVERNANCE_TOKEN_ADDRESS;
    const GOVERNOR_ADDRESS = process.env.GOVERNOR_ADDRESS;

    if (!GOVERNANCE_TOKEN_ADDRESS || !GOVERNOR_ADDRESS) {
        throw new Error("Missing environment variables");
    }

    const governanceToken = await ethers.getContractAt("GovernanceToken", GOVERNANCE_TOKEN_ADDRESS);
    const governor = await ethers.getContractAt("GovernorContract", GOVERNOR_ADDRESS);

    console.log("Checking proposal eligibility for:", deployer.address);
    console.log("");

    // Check token balance
    const balance = await governanceToken.balanceOf(deployer.address);
    console.log("Token balance:", ethers.formatEther(balance));

    // Check current voting power
    const currentVotingPower = await governanceToken.getVotes(deployer.address);
    console.log("Current voting power:", ethers.formatEther(currentVotingPower));

    // Check if delegated
    const delegate = await governanceToken.delegates(deployer.address);
    console.log("Delegated to:", delegate);
    console.log("Is self-delegated:", delegate.toLowerCase() === deployer.address.toLowerCase());
    console.log("");

    // Check proposal threshold
    const proposalThreshold = await governor.proposalThreshold();
    console.log("Proposal threshold required:", ethers.formatEther(proposalThreshold));
    console.log("");

    // Check if eligible
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log("Current block:", currentBlock);

    // Get voting power at previous block to see what would be used for proposal
    if (currentBlock > 0) {
        try {
            const pastVotingPower = await governanceToken.getPastVotes(deployer.address, currentBlock - 1);
            console.log("Voting power at block", currentBlock - 1, ":", ethers.formatEther(pastVotingPower));
        } catch (e) {
            console.log("Could not get past voting power (might be too recent)");
        }
    }
    console.log("");

    if (currentVotingPower >= proposalThreshold) {
        console.log("✅ You have enough voting power to propose!");
        console.log("⚠️  BUT: You need to wait at least 1 block AFTER delegating before you can propose");
    } else {
        console.log("❌ You don't have enough voting power to propose");
        console.log(`   Need: ${ethers.formatEther(proposalThreshold)}`);
        console.log(`   Have: ${ethers.formatEther(currentVotingPower)}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
