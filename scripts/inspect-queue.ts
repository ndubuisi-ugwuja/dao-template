import { ethers } from "hardhat";
import "dotenv/config";

/**
 * Inspect the actual queue transaction to see what happened
 * Run with: npx hardhat run scripts/inspect-queue-transaction.ts --network sepolia
 */
async function main() {
    const GOVERNOR_ADDRESS = process.env.GOVERNOR_ADDRESS;
    const PROPOSAL_ID = process.env.PROPOSAL_ID;
    const TIMELOCK_ADDRESS = process.env.TIMELOCK_ADDRESS;

    if (!GOVERNOR_ADDRESS || !PROPOSAL_ID || !TIMELOCK_ADDRESS) {
        throw new Error("Missing environment variables");
    }

    const governor = await ethers.getContractAt("GovernorContract", GOVERNOR_ADDRESS);
    const timeLock = await ethers.getContractAt("TimeLock", TIMELOCK_ADDRESS);

    console.log("Finding queue transaction for proposal:", PROPOSAL_ID);
    console.log("");

    // Get proposal details
    const snapshot = await governor.proposalSnapshot(PROPOSAL_ID);
    const fromBlock = Number(snapshot);
    const currentBlock = await ethers.provider.getBlockNumber();

    console.log("Searching from block", fromBlock, "to", currentBlock);
    console.log("");

    // Find ProposalQueued event
    const queuedFilter = governor.filters.ProposalQueued();
    const allQueuedEvents = await governor.queryFilter(queuedFilter, fromBlock, currentBlock);
    const queuedEvents = allQueuedEvents.filter((e) => e.args?.[0]?.toString() === PROPOSAL_ID);

    if (queuedEvents.length === 0) {
        console.log("❌ No ProposalQueued event found - proposal was never queued!");
        return;
    }

    const queueEvent = queuedEvents[0];
    console.log("✅ Found ProposalQueued event:");
    console.log("- Block:", queueEvent.blockNumber);
    console.log("- Transaction:", queueEvent.transactionHash);
    console.log("");

    // Get the full transaction
    const tx = await ethers.provider.getTransaction(queueEvent.transactionHash);
    if (!tx) {
        console.log("❌ Could not fetch transaction");
        return;
    }

    console.log("Transaction Details:");
    console.log("- From:", tx.from);
    console.log("- To:", tx.to);
    console.log("- Gas Limit:", tx.gasLimit.toString());
    console.log("");

    // Get the receipt
    const receipt = await ethers.provider.getTransactionReceipt(queueEvent.transactionHash);
    if (!receipt) {
        console.log("❌ Could not fetch receipt");
        return;
    }

    console.log("Transaction Receipt:");
    console.log("- Status:", receipt.status === 1 ? "✅ Success" : "❌ Failed");
    console.log("- Gas Used:", receipt.gasUsed.toString());
    console.log(
        "- Effective Gas Price:",
        receipt.gasPrice ? ethers.formatUnits(receipt.gasPrice, "gwei") + " gwei" : "N/A",
    );
    console.log("");

    // Parse all events
    console.log("All Events in Transaction:");
    for (let i = 0; i < receipt.logs.length; i++) {
        const log = receipt.logs[i];
        console.log(`\nEvent ${i + 1}:`);
        console.log("- Address:", log.address);

        try {
            // Try to parse with Governor interface
            const parsed = governor.interface.parseLog({
                topics: [...log.topics],
                data: log.data,
            });
            if (parsed) {
                console.log("- Name (Governor):", parsed.name);
                console.log("- Args:", parsed.args.toString());
            }
        } catch {
            try {
                // Try to parse with TimeLock interface
                const parsed = timeLock.interface.parseLog({
                    topics: [...log.topics],
                    data: log.data,
                });
                if (parsed) {
                    console.log("- Name (TimeLock):", parsed.name);
                    console.log("- Args:", parsed.args.toString());
                }
            } catch {
                console.log("- Could not parse event");
            }
        }
    }

    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("ANALYSIS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Check if CallScheduled event exists
    const hasCallScheduled = receipt.logs.some((log) => {
        try {
            const parsed = timeLock.interface.parseLog({
                topics: [...log.topics],
                data: log.data,
            });
            return parsed?.name === "CallScheduled";
        } catch {
            return false;
        }
    });

    if (hasCallScheduled) {
        console.log("✅ CallScheduled event found - TimeLock operation was scheduled");
        console.log("Something else is wrong with execution");
    } else {
        console.log("❌ NO CallScheduled event found!");
        console.log("");
        console.log("The queue() call succeeded on the Governor but failed to");
        console.log("schedule the operation in TimeLock. This is likely a:");
        console.log("1. Contract configuration issue");
        console.log("2. Gas limit problem");
        console.log("3. Access control issue");
        console.log("");
        console.log("Check if the Governor has PROPOSER_ROLE on TimeLock");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
