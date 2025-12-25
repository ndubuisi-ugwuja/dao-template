import { ethers } from "hardhat";
import "dotenv/config";

/**
 * Check if proposal is ready for execution
 * Run with: npx hardhat run scripts/check-execution-readiness.ts --network sepolia
 */
async function main() {
    const GOVERNOR_ADDRESS = process.env.GOVERNOR_ADDRESS;
    const BOX_ADDRESS = process.env.BOX_ADDRESS;
    const PROPOSAL_ID = process.env.PROPOSAL_ID;
    const NEW_VALUE = process.env.NEW_VALUE || "99";
    const TIMELOCK_ADDRESS = process.env.TIMELOCK_ADDRESS;

    if (!GOVERNOR_ADDRESS || !BOX_ADDRESS || !PROPOSAL_ID || !TIMELOCK_ADDRESS) {
        throw new Error("Missing required environment variables");
    }

    const governor = await ethers.getContractAt("GovernorContract", GOVERNOR_ADDRESS);
    const box = await ethers.getContractAt("Box", BOX_ADDRESS);
    const timeLock = await ethers.getContractAt("TimeLock", TIMELOCK_ADDRESS);

    console.log("Checking execution readiness for proposal:", PROPOSAL_ID);
    console.log("");

    // Check proposal state
    const state = await governor.state(PROPOSAL_ID);
    const stateNames = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
    console.log("Proposal state:", stateNames[Number(state)]);

    if (state !== 5n) {
        console.log("❌ Proposal is not queued. Current state:", stateNames[Number(state)]);
        return;
    }

    // Get the operation details
    const newValue = parseInt(NEW_VALUE);
    const encodedFunctionCall = box.interface.encodeFunctionData("store", [newValue]);
    const descriptionHash = ethers.id(`Proposal: Store ${newValue} in the Box`);

    // Get the operation ID in TimeLock
    const target = await box.getAddress();
    const operationId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "uint256", "bytes", "bytes32", "bytes32"],
            [target, 0, encodedFunctionCall, ethers.ZeroHash, descriptionHash],
        ),
    );

    console.log("Operation ID in TimeLock:", operationId);
    console.log("");

    // Check if operation is ready in TimeLock
    try {
        const isOperationReady = await timeLock.isOperationReady(operationId);
        const isOperationDone = await timeLock.isOperationDone(operationId);
        const timestamp = await timeLock.getTimestamp(operationId);

        console.log("TimeLock Status:");
        console.log("- Operation ready:", isOperationReady ? "✅" : "❌");
        console.log("- Operation done:", isOperationDone ? "✅" : "❌");
        console.log("- Execution timestamp:", timestamp.toString());

        const currentTime = Math.floor(Date.now() / 1000);
        const blockTimestamp = (await ethers.provider.getBlock("latest"))?.timestamp || 0;

        console.log("");
        console.log("Time Check:");
        console.log("- Current time (your machine):", new Date(currentTime * 1000).toISOString());
        console.log("- Current block timestamp:", new Date(blockTimestamp * 1000).toISOString());
        console.log("- Can execute at:", new Date(Number(timestamp) * 1000).toISOString());

        const timeLeft = Number(timestamp) - blockTimestamp;
        if (timeLeft > 0) {
            console.log("- Time remaining:", timeLeft, "seconds");
            console.log("");
            console.log(`⏰ Wait ${timeLeft} seconds before executing`);
        } else {
            console.log("- Time passed:", Math.abs(timeLeft), "seconds ago");
            console.log("");
            console.log("✅ Ready to execute!");
        }
    } catch (error: any) {
        console.log("❌ Error checking TimeLock:");
        console.log(error.message);
        console.log("");
        console.log("The operation might not be queued in TimeLock yet.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
