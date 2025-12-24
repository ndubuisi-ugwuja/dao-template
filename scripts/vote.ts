import { ethers } from "hardhat";
import "dotenv/config";

/**
 * Vote on a proposal
 * Run with: npx hardhat run scripts/vote.ts --network sepolia
 */
async function main() {
    const GOVERNOR_ADDRESS = process.env.GOVERNOR_ADDRESS;
    const PROPOSAL_ID = process.env.PROPOSAL_ID;

    if (!GOVERNOR_ADDRESS || !PROPOSAL_ID) {
        throw new Error("Missing GOVERNOR_ADDRESS or PROPOSAL_ID in environment variables");
    }

    const governor = await ethers.getContractAt("GovernorContract", GOVERNOR_ADDRESS);

    console.log("Voting on proposal:", PROPOSAL_ID);
    console.log("");

    // Check if voting is active
    const state = await governor.state(PROPOSAL_ID);
    const stateNames = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
    console.log(`Current proposal state: ${stateNames[state]}`);

    if (state !== 1n) {
        // 1 = Active
        throw new Error(`Proposal is not active. Current state: ${stateNames[state]}`);
    }

    // Cast vote: 0 = Against, 1 = For, 2 = Abstain
    console.log("Casting vote: FOR");
    const voteTx = await governor.castVote(PROPOSAL_ID, 1);
    await voteTx.wait();

    console.log("✅ Vote cast successfully!");
    console.log("");

    // Show vote receipt
    const hasVoted = await governor.hasVoted(PROPOSAL_ID, (await ethers.getSigners())[0].address);
    console.log("Has voted:", hasVoted);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
