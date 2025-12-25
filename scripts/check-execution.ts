import { ethers } from "hardhat";
import "dotenv/config";

/**
 * Check the queue transaction events
 * Run with: npx hardhat run scripts/check-queue-events.ts --network sepolia
 */
async function main() {
    const GOVERNOR_ADDRESS = process.env.GOVERNOR_ADDRESS;
    const TIMELOCK_ADDRESS = process.env.TIMELOCK_ADDRESS;
    const PROPOSAL_ID = process.env.PROPOSAL_ID;

    if (!GOVERNOR_ADDRESS || !TIMELOCK_ADDRESS || !PROPOSAL_ID) {
        throw new Error("Missing required environment variables");
    }

    const governor = await ethers.getContractAt("GovernorContract", GOVERNOR_ADDRESS);
    const timeLock = await ethers.getContractAt("TimeLock", TIMELOCK_ADDRESS);

    console.log("Searching for queue events for proposal:", PROPOSAL_ID);
    console.log("");

    // Get proposal snapshot to know when it was created
    const snapshot = await governor.proposalSnapshot(PROPOSAL_ID);
    console.log("Proposal snapshot block:", snapshot.toString());

    // Search for ProposalQueued event from Governor
    console.log("");
    console.log("Searching for ProposalQueued events...");

    const currentBlock = await ethers.provider.getBlockNumber();
    const fromBlock = Math.max(0, Number(snapshot) - 100); // Search from a bit before proposal

    // Don't filter by proposalId since it's not indexed - get all and filter manually
    const queuedFilter = governor.filters.ProposalQueued();
    const allQueuedEvents = await governor.queryFilter(queuedFilter, fromBlock, currentBlock);

    // Filter for our specific proposal
    const queuedEvents = allQueuedEvents.filter((e) => e.args?.[0]?.toString() === PROPOSAL_ID);

    if (queuedEvents.length === 0) {
        console.log("❌ No ProposalQueued event found");
        console.log("This means queue was never called or failed completely");
    } else {
        console.log(`✅ Found ${queuedEvents.length} ProposalQueued event(s)`);
        for (const event of queuedEvents) {
            console.log("");
            console.log("Event details:");
            console.log("- Block:", event.blockNumber);
            console.log("- Transaction:", event.transactionHash);
            console.log("- ETA:", event.args?.[1]?.toString());
        }
    }

    // Search for CallScheduled events from TimeLock
    console.log("");
    console.log("Searching for CallScheduled events in TimeLock...");

    const scheduledFilter = timeLock.filters.CallScheduled();
    const scheduledEvents = await timeLock.queryFilter(scheduledFilter, fromBlock, currentBlock);

    console.log(`Found ${scheduledEvents.length} CallScheduled event(s) in total`);

    // Try to find our specific operation
    const BOX_ADDRESS = process.env.BOX_ADDRESS;
    if (BOX_ADDRESS) {
        const ourEvents = scheduledEvents.filter((e) => {
            const target = e.args?.[1];
            if (target) {
                return String(target).toLowerCase() === BOX_ADDRESS.toLowerCase();
            }
            return false;
        });

        if (ourEvents.length > 0) {
            console.log("");
            console.log(`✅ Found ${ourEvents.length} CallScheduled event(s) for Box contract:`);
            for (const event of ourEvents) {
                console.log("");
                console.log("Event details:");
                console.log("- Block:", event.blockNumber);
                console.log("- Transaction:", event.transactionHash);
                console.log("- Operation ID:", event.args?.[0]);
                console.log("- Target:", event.args?.[1]);
                console.log("- Value:", event.args?.[2]?.toString());
                console.log("- Delay:", event.args?.[4]?.toString());
            }
        } else {
            console.log("❌ No CallScheduled events found for Box contract");
            console.log("The TimeLock operation was never scheduled");
        }
    }

    // Recommendations
    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("DIAGNOSIS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (
        queuedEvents.length > 0 &&
        scheduledEvents.filter((e) => {
            const target = e.args?.[1];
            return target && String(target).toLowerCase() === process.env.BOX_ADDRESS?.toLowerCase();
        }).length === 0
    ) {
        console.log("The proposal was marked as Queued by the Governor,");
        console.log("but the TimeLock never received the schedule call.");
        console.log("");
        console.log("This is likely a bug or the queue transaction failed silently.");
        console.log("");
        console.log("SOLUTION: You'll need to create a new proposal with different");
        console.log("parameters since this one is stuck in 'Queued' state.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
