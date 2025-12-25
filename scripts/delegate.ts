import { ethers } from "hardhat";
import "dotenv/config";

/**
 * Delegate voting power to yourself
 * Run with: yarn hardhat run scripts/delegate.ts --network sepolia
 *
 * IMPORTANT: Wait 1-2 blocks after this before creating a proposal!
 */
async function main() {
    const [deployer] = await ethers.getSigners();
    const GOVERNANCE_TOKEN_ADDRESS = process.env.GOVERNANCE_TOKEN_ADDRESS;

    if (!GOVERNANCE_TOKEN_ADDRESS) {
        throw new Error("Missing GOVERNANCE_TOKEN_ADDRESS");
    }

    const governanceToken = await ethers.getContractAt("GovernanceToken", GOVERNANCE_TOKEN_ADDRESS);

    console.log("Delegating votes for:", deployer.address);

    // Check current delegate
    const currentDelegate = await governanceToken.delegates(deployer.address);
    console.log("Current delegate:", currentDelegate);

    if (currentDelegate.toLowerCase() === deployer.address.toLowerCase()) {
        console.log("✅ Already delegated to yourself!");
        const votingPower = await governanceToken.getVotes(deployer.address);
        console.log("Current voting power:", ethers.formatEther(votingPower));
        return;
    }

    console.log("Delegating to yourself...");
    const tx = await governanceToken.delegate(deployer.address);
    console.log("Transaction hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("✅ Delegation successful at block:", receipt?.blockNumber);

    const votingPower = await governanceToken.getVotes(deployer.address);
    console.log("New voting power:", ethers.formatEther(votingPower));
    console.log("");
    console.log("⏰ IMPORTANT: Wait 1-2 blocks (~12-24 seconds) before creating a proposal!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
