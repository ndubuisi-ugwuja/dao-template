import { ethers } from "hardhat";
import "dotenv/config";

/**
 * Execute a queued proposal
 * Run with: npx hardhat run scripts/execute.ts --network sepolia
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

    console.log("Executing proposal:", PROPOSAL_ID);
    console.log("");

    // Check proposal state
    const state = await governor.state(PROPOSAL_ID);
    const stateNames = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
    console.log(`Current proposal state: ${stateNames[state]}`);

    if (state !== 5n) {
        // 5 = Queued
        throw new Error(`Proposal is not queued. Current state: ${stateNames[state]}`);
    }

    // Execute the proposal
    const newValue = 77;
    const encodedFunctionCall = box.interface.encodeFunctionData("store", [newValue]);
    const descriptionHash = ethers.id(`Proposal: Store ${newValue} in the Box`);

    console.log("Executing proposal...");
    const executeTx = await governor.execute([await box.getAddress()], [0], [encodedFunctionCall], descriptionHash);
    await executeTx.wait();

    console.log("✅ Proposal executed successfully!");
    console.log("");

    // Verify the change
    console.log("Verifying Box value...");
    const storedValue = await box.retrieve();
    console.log(`Box value is now: ${storedValue}`);

    if (storedValue === BigInt(newValue)) {
        console.log("🎉 SUCCESS! The DAO successfully changed the Box value!");
    } else {
        console.log("❌ Unexpected value in Box");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
