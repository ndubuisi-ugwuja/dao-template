import { ethers } from "hardhat";
import "dotenv/config";

/**
 * Queue a successful proposal
 * Run with: npx hardhat run scripts/queue.ts --network sepolia
 */
async function main() {
    const GOVERNOR_ADDRESS = process.env.GOVERNOR_ADDRESS;
    const BOX_ADDRESS = process.env.BOX_ADDRESS;
    const PROPOSAL_ID = process.env.PROPOSAL_ID;

    if (!GOVERNOR_ADDRESS || !BOX_ADDRESS || !PROPOSAL_ID) {
        throw new Error("Missing required environment variables");
    }

    const governor = await ethers.getContractAt("GovernorContract", GOVERNOR_ADDRESS);
    const box = await ethers.getContractAt("Box", BOX_ADDRESS);

    console.log("Queueing proposal:", PROPOSAL_ID);
    console.log("");

    // Check proposal state
    const state = await governor.state(PROPOSAL_ID);
    const stateNames = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
    console.log(`Current proposal state: ${stateNames[state]}`);

    if (state !== 4n) {
        // 4 = Succeeded
        throw new Error(`Proposal has not succeeded yet. Current state: ${stateNames[state]}`);
    }

    // Queue the proposal
    const newValue = 77;
    const encodedFunctionCall = box.interface.encodeFunctionData("store", [newValue]);
    const descriptionHash = ethers.id(`Proposal: Store ${newValue} in the Box`);

    console.log("Queueing proposal in TimeLock...");
    const queueTx = await governor.queue([await box.getAddress()], [0], [encodedFunctionCall], descriptionHash);
    await queueTx.wait();

    console.log("✅ Proposal queued successfully!");
    console.log("");
    console.log("⏰ Wait for the TimeLock delay to pass before executing.");
    console.log("Then run: npx hardhat run scripts/execute.ts --network sepolia");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
