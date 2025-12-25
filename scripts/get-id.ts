import { ethers } from "hardhat";
import "dotenv/config";

/**
 * Get the correct operation ID from TimeLock events
 * Run with: npx hardhat run scripts/get-operation-id.ts --network sepolia
 */
async function main() {
    const GOVERNOR_ADDRESS = process.env.GOVERNOR_ADDRESS;
    const PROPOSAL_ID = process.env.PROPOSAL_ID;
    const TIMELOCK_ADDRESS = process.env.TIMELOCK_ADDRESS;
    const BOX_ADDRESS = process.env.BOX_ADDRESS;

    if (!GOVERNOR_ADDRESS || !PROPOSAL_ID || !TIMELOCK_ADDRESS || !BOX_ADDRESS) {
        throw new Error("Missing environment variables");
    }

    const governor = await ethers.getContractAt("GovernorContract", GOVERNOR_ADDRESS);
    const timeLock = await ethers.getContractAt("TimeLock", TIMELOCK_ADDRESS);

    console.log("Finding operation ID for proposal:", PROPOSAL_ID);
    console.log("");

    // Get proposal details
    const snapshot = await governor.proposalSnapshot(PROPOSAL_ID);
    const fromBlock = Number(snapshot);
    const currentBlock = await ethers.provider.getBlockNumber();

    // Find ProposalQueued event
    const queuedFilter = governor.filters.ProposalQueued();
    const allQueuedEvents = await governor.queryFilter(queuedFilter, fromBlock, currentBlock);
    const queuedEvents = allQueuedEvents.filter((e) => e.args?.[0]?.toString() === PROPOSAL_ID);

    if (queuedEvents.length === 0) {
        console.log("❌ No ProposalQueued event found");
        return;
    }

    const queueEvent = queuedEvents[0];
    console.log("Queue transaction:", queueEvent.transactionHash);
    console.log("");

    // Get the receipt
    const receipt = await ethers.provider.getTransactionReceipt(queueEvent.transactionHash);
    if (!receipt) {
        console.log("❌ Could not fetch receipt");
        return;
    }

    // Find CallScheduled events from TimeLock
    console.log("CallScheduled events from TimeLock:");
    let operationId: string | null = null;
    let operationTimestamp: bigint | null = null;

    for (const log of receipt.logs) {
        if (log.address.toLowerCase() === TIMELOCK_ADDRESS.toLowerCase()) {
            try {
                const parsed = timeLock.interface.parseLog({
                    topics: [...log.topics],
                    data: log.data,
                });

                if (parsed && parsed.name === "CallScheduled") {
                    console.log("");
                    console.log("✅ Found CallScheduled event:");
                    console.log("- Operation ID:", parsed.args[0]);
                    console.log("- Index:", parsed.args[1]?.toString());
                    console.log("- Target:", parsed.args[2]);
                    console.log("- Value:", parsed.args[3]?.toString());
                    console.log("- Data:", parsed.args[4]);
                    console.log("- Predecessor:", parsed.args[5]);
                    console.log("- Delay:", parsed.args[6]?.toString());

                    // Check if this is for our Box contract
                    if (parsed.args[2]?.toLowerCase() === BOX_ADDRESS.toLowerCase()) {
                        operationId = parsed.args[0];
                        console.log("");
                        console.log("🎯 This is the operation for the Box contract!");
                    }
                }
            } catch (e) {
                // Not a parseable event, skip
            }
        }
    }

    if (!operationId) {
        console.log("");
        console.log("❌ Could not find CallScheduled event for Box contract");
        return;
    }

    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("CORRECT OPERATION ID:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(operationId);
    console.log("");

    // Check the operation status
    const timestamp = await timeLock.getTimestamp(operationId);
    const isReady = await timeLock.isOperationReady(operationId);
    const isDone = await timeLock.isOperationDone(operationId);

    console.log("Operation Status:");
    console.log("- Timestamp:", timestamp.toString());
    console.log("- Ready:", isReady ? "✅" : "❌");
    console.log("- Done:", isDone ? "✅" : "❌");
    console.log("");

    const blockTimestamp = (await ethers.provider.getBlock("latest"))?.timestamp || 0;
    const timeLeft = Number(timestamp) - blockTimestamp;

    if (timeLeft > 0) {
        console.log(`⏰ Wait ${timeLeft} seconds before executing`);
    } else {
        console.log(`✅ Ready to execute! (${Math.abs(timeLeft)} seconds ago)`);
    }

    console.log("");
    console.log("💡 The issue: We're calculating the operation ID incorrectly.");
    console.log("The Governor uses a different hashing method than we expected.");
    console.log("");
    console.log("You can now execute using governor.execute() - it will handle");
    console.log("the operation ID calculation correctly.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
