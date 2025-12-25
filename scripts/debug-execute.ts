import { ethers } from "hardhat";
import "dotenv/config";

/**
 * Debug execute with detailed error info
 * Run with: npx hardhat run scripts/debug-execute.ts --network sepolia
 */
async function main() {
    const GOVERNOR_ADDRESS = process.env.GOVERNOR_ADDRESS;
    const BOX_ADDRESS = process.env.BOX_ADDRESS;
    const PROPOSAL_ID = process.env.PROPOSAL_ID;
    const NEW_VALUE = process.env.NEW_VALUE;

    if (!GOVERNOR_ADDRESS || !BOX_ADDRESS || !PROPOSAL_ID || !NEW_VALUE) {
        throw new Error("Missing required environment variables");
    }

    const governor = await ethers.getContractAt("GovernorContract", GOVERNOR_ADDRESS);
    const box = await ethers.getContractAt("Box", BOX_ADDRESS);

    console.log("Attempting to execute proposal:", PROPOSAL_ID);
    console.log("Using value:", NEW_VALUE);
    console.log("");

    // Check proposal state
    const state = await governor.state(PROPOSAL_ID);
    const stateNames = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
    console.log("Proposal state:", stateNames[Number(state)]);

    if (state !== 5n) {
        throw new Error(`Proposal is not queued. State: ${stateNames[Number(state)]}`);
    }

    // Prepare execution parameters
    const newValue = parseInt(NEW_VALUE);
    const encodedFunctionCall = box.interface.encodeFunctionData("store", [newValue]);
    const descriptionHash = ethers.id(`Proposal: Store ${newValue} in the Box`);

    console.log("");
    console.log("Execution parameters:");
    console.log("- Target:", await box.getAddress());
    console.log("- Value:", 0);
    console.log("- Calldata:", encodedFunctionCall);
    console.log("- Description hash:", descriptionHash);
    console.log("");

    // Try to estimate gas first
    console.log("Estimating gas...");
    try {
        const gasEstimate = await governor.execute.estimateGas(
            [await box.getAddress()],
            [0],
            [encodedFunctionCall],
            descriptionHash,
        );
        console.log("✅ Gas estimate:", gasEstimate.toString());
    } catch (error: any) {
        console.log("❌ Gas estimation failed:");
        console.log("");

        if (error.data) {
            console.log("Error data:", error.data);
            try {
                const decodedError = governor.interface.parseError(error.data);
                console.log("Decoded error:", decodedError?.name);
                console.log("Error args:", decodedError?.args);
            } catch {
                console.log("Could not decode error");
            }
        }

        console.log("Error message:", error.message);

        // Try to understand the error better
        console.log("");
        console.log("Checking common issues...");

        // Check if operation exists in TimeLock
        const TIMELOCK_ADDRESS = process.env.TIMELOCK_ADDRESS;
        if (TIMELOCK_ADDRESS) {
            const timeLock = await ethers.getContractAt("TimeLock", TIMELOCK_ADDRESS);

            // We know the correct operation ID from the previous script
            // Let's check with the Governor's calculation
            const proposalEta = await governor.proposalEta(PROPOSAL_ID);
            console.log("Proposal ETA from Governor:", proposalEta.toString());

            const currentTime = (await ethers.provider.getBlock("latest"))?.timestamp || 0;
            console.log("Current block time:", currentTime);
            console.log("Time difference:", currentTime - Number(proposalEta), "seconds");

            if (Number(proposalEta) > currentTime) {
                console.log("⚠️  ETA has not been reached yet!");
            }
        }

        return;
    }

    // If gas estimation succeeded, try the actual execution
    console.log("");
    console.log("Executing proposal...");
    try {
        const tx = await governor.execute([await box.getAddress()], [0], [encodedFunctionCall], descriptionHash);

        console.log("Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("✅ Execution successful!");
        console.log("Block:", receipt?.blockNumber);

        // Verify the change
        const storedValue = await box.retrieve();
        console.log("");
        console.log("Box value is now:", storedValue.toString());

        if (storedValue === BigInt(newValue)) {
            console.log("🎉 SUCCESS! Value updated correctly!");
        }
    } catch (error: any) {
        console.log("❌ Execution failed:");
        console.log(error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
