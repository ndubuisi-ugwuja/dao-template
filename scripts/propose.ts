import { ethers } from "hardhat";
import "dotenv/config";

/**
 * Create a proposal
 * Run with: yarn hardhat run scripts/propose.ts --network sepolia
 *
 * PREREQUISITE: Must have delegated votes at least 1 block ago!
 */
async function main() {
    const [deployer] = await ethers.getSigners();

    const { GOVERNOR_ADDRESS, BOX_ADDRESS, GOVERNANCE_TOKEN_ADDRESS, TIMELOCK_ADDRESS, NEW_VALUE } = process.env;

    if (!GOVERNOR_ADDRESS || !BOX_ADDRESS || !GOVERNANCE_TOKEN_ADDRESS || !TIMELOCK_ADDRESS || !NEW_VALUE) {
        throw new Error("Missing environment variables");
    }

    const governanceToken = await ethers.getContractAt("GovernanceToken", GOVERNANCE_TOKEN_ADDRESS);
    const governor = await ethers.getContractAt("GovernorContract", GOVERNOR_ADDRESS);
    const timeLock = await ethers.getContractAt("TimeLock", TIMELOCK_ADDRESS);
    const box = await ethers.getContractAt("Box", BOX_ADDRESS);

    console.log("DAO Contracts:");
    console.log("- GovernanceToken:", await governanceToken.getAddress());
    console.log("- Governor:", await governor.getAddress());
    console.log("- TimeLock:", await timeLock.getAddress());
    console.log("- Box:", await box.getAddress());
    console.log("");

    // Check eligibility
    const currentBlock = await ethers.provider.getBlockNumber();
    const votingPower = await governanceToken.getVotes(deployer.address);
    const proposalThreshold = await governor.proposalThreshold();

    console.log("Proposal Eligibility Check:");
    console.log("- Current block:", currentBlock);
    console.log("- Your voting power:", ethers.formatEther(votingPower));
    console.log("- Threshold required:", ethers.formatEther(proposalThreshold));

    if (votingPower < proposalThreshold) {
        throw new Error("Not enough voting power to create proposal!");
    }

    // Check past voting power (what will actually be used)
    if (currentBlock > 0) {
        try {
            const pastVotingPower = await governanceToken.getPastVotes(deployer.address, currentBlock - 1);
            console.log("- Voting power at previous block:", ethers.formatEther(pastVotingPower));

            if (pastVotingPower < proposalThreshold) {
                throw new Error(
                    "You delegated too recently! Your voting power at the previous block is insufficient. " +
                        "Wait 1-2 more blocks and try again.",
                );
            }
        } catch (e: any) {
            if (e.message.includes("delegated too recently")) {
                throw e;
            }
            console.log("- Could not check past voting power (might be okay if recently delegated)");
        }
    }
    console.log("✅ Eligible to propose!");
    console.log("");

    // Get governance parameters
    const votingDelay = await governor.votingDelay();
    const votingPeriod = await governor.votingPeriod();
    const minDelay = await timeLock.getMinDelay();

    console.log("Governance Parameters:");
    console.log(`- Voting Delay: ${votingDelay} blocks (~${Number(votingDelay) * 12} seconds)`);
    console.log(`- Voting Period: ${votingPeriod} blocks (~${Number(votingPeriod) * 12} seconds)`);
    console.log(`- TimeLock Delay: ${minDelay} seconds`);
    console.log("");

    // Create proposal
    console.log("Creating proposal...");
    const encodedFunctionCall = box.interface.encodeFunctionData("store", [NEW_VALUE]);

    const proposeTx = await governor.propose(
        [await box.getAddress()],
        [0],
        [encodedFunctionCall],
        `Proposal: Store ${NEW_VALUE} in the Box`,
    );

    const proposeReceipt = await proposeTx.wait();

    if (!proposeReceipt) {
        throw new Error("Proposal transaction failed");
    }

    // Get proposal ID from event
    const proposalCreatedEvent = proposeReceipt.logs.find((log: any) => {
        try {
            return governor.interface.parseLog(log)?.name === "ProposalCreated";
        } catch {
            return false;
        }
    });

    if (!proposalCreatedEvent) {
        throw new Error("ProposalCreated event not found");
    }

    const parsedEvent = governor.interface.parseLog(proposalCreatedEvent);
    const proposalId = parsedEvent?.args[0];

    console.log(`✅ Proposal created with ID: ${proposalId}`);
    console.log("");

    // Show timeline
    const proposalSnapshot = await governor.proposalSnapshot(proposalId);
    const proposalDeadline = await governor.proposalDeadline(proposalId);

    console.log("Proposal Timeline:");
    console.log(`- Current Block: ${currentBlock}`);
    console.log(`- Voting Starts at Block: ${proposalSnapshot}`);
    console.log(`- Voting Ends at Block: ${proposalDeadline}`);
    console.log(`- Blocks until voting starts: ${Number(proposalSnapshot) - currentBlock}`);
    console.log("");

    console.log("⏰ NEXT STEPS:");
    console.log(`1. Wait for block ${proposalSnapshot} (voting delay)`);
    console.log(`2. Run: yarn hardhat run scripts/vote.ts --network sepolia`);
    console.log(`3. Wait for block ${proposalDeadline} (voting period ends)`);
    console.log(`4. Run: yarn hardhat run scripts/queue.ts --network sepolia`);
    console.log(`5. Wait ${minDelay} seconds after queuing`);
    console.log(`6. Run: yarn hardhat run scripts/execute.ts --network sepolia`);
    console.log("");
    console.log("💡 Add this to your .env file:");
    console.log(`PROPOSAL_ID=${proposalId}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
