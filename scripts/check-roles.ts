import { ethers } from "hardhat";
import "dotenv/config";

/**
 * Debug why proposal creation is failing
 * Run with: npx hardhat run scripts/debug-proposal.ts --network sepolia
 */
async function main() {
    const [deployer] = await ethers.getSigners();

    const GOVERNOR_ADDRESS = process.env.GOVERNOR_ADDRESS;
    const BOX_ADDRESS = process.env.BOX_ADDRESS;

    if (!GOVERNOR_ADDRESS || !BOX_ADDRESS) {
        throw new Error("Missing environment variables");
    }

    const governor = await ethers.getContractAt("GovernorContract", GOVERNOR_ADDRESS);
    const box = await ethers.getContractAt("Box", BOX_ADDRESS);

    console.log("Testing proposal creation with detailed error...");
    console.log("");

    const newValue = 77;
    const encodedFunctionCall = box.interface.encodeFunctionData("store", [newValue]);
    const description = `Proposal: Store ${newValue} in the Box`;

    console.log("Proposal details:");
    console.log("- Target:", await box.getAddress());
    console.log("- Value:", 0);
    console.log("- Calldata:", encodedFunctionCall);
    console.log("- Description:", description);
    console.log("");

    try {
        // Try to estimate gas first to get a better error
        console.log("Attempting to estimate gas...");
        const gasEstimate = await governor.propose.estimateGas(
            [await box.getAddress()],
            [0],
            [encodedFunctionCall],
            description,
        );
        console.log("Gas estimate:", gasEstimate.toString());
        console.log("✅ Gas estimation succeeded - proposal should work!");

        // Now try the actual transaction
        console.log("");
        console.log("Creating proposal...");
        const tx = await governor.propose([await box.getAddress()], [0], [encodedFunctionCall], description);

        console.log("Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("✅ Proposal created successfully!");
    } catch (error: any) {
        console.log("❌ Error occurred:");
        console.log("");

        // Try to get more details about the error
        if (error.data) {
            console.log("Error data:", error.data);

            // Try to decode the error
            try {
                const decodedError = governor.interface.parseError(error.data);
                console.log("Decoded error:", decodedError);
            } catch {
                console.log("Could not decode error");
            }
        }

        if (error.reason) {
            console.log("Error reason:", error.reason);
        }

        if (error.message) {
            console.log("Error message:", error.message);
        }

        console.log("");
        console.log("Full error object:");
        console.log(JSON.stringify(error, null, 2));

        // Check if it might be a duplicate proposal
        console.log("");
        console.log("Checking for duplicate proposal...");
        const proposalId = await governor.hashProposal(
            [await box.getAddress()],
            [0],
            [encodedFunctionCall],
            ethers.id(description),
        );
        console.log("Proposal ID would be:", proposalId);

        try {
            const state = await governor.state(proposalId);
            console.log("⚠️  A proposal with this ID already exists!");
            console.log("Proposal state:", state);
            const stateNames = [
                "Pending",
                "Active",
                "Canceled",
                "Defeated",
                "Succeeded",
                "Queued",
                "Expired",
                "Executed",
            ];
            console.log("State name:", stateNames[Number(state)]);
        } catch {
            console.log("No existing proposal found with this ID");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
