import { ethers } from "hardhat";
import "dotenv/config";

/**
 * Interact with DAO on testnet/mainnet (no time manipulation)
 * This script will perform actions but you'll need to wait for real blocks/time to pass
 *
 * Run with:
 * npx hardhat run scripts/interact-testnet.ts --network sepolia
 */
async function main() {
    const [deployer] = await ethers.getSigners();

    // Get addresses from environment variables
    const GOVERNANCE_TOKEN_ADDRESS = process.env.GOVERNANCE_TOKEN_ADDRESS;
    const GOVERNOR_ADDRESS = process.env.GOVERNOR_ADDRESS;
    const TIMELOCK_ADDRESS = process.env.TIMELOCK_ADDRESS;
    const BOX_ADDRESS = process.env.BOX_ADDRESS;

    // Validate addresses exist
    if (!GOVERNANCE_TOKEN_ADDRESS || !GOVERNOR_ADDRESS || !TIMELOCK_ADDRESS || !BOX_ADDRESS) {
        throw new Error("Missing contract addresses in environment variables");
    }

    // Get contract instances
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

    // Get governance parameters
    const votingDelay = await governor.votingDelay();
    const votingPeriod = await governor.votingPeriod();
    const minDelay = await timeLock.getMinDelay();

    console.log("Governance Parameters:");
    console.log(`- Voting Delay: ${votingDelay} blocks (~${Number(votingDelay) * 12} seconds)`);
    console.log(`- Voting Period: ${votingPeriod} blocks (~${Number(votingPeriod) * 12} seconds)`);
    console.log(`- TimeLock Delay: ${minDelay} seconds`);
    console.log("");

    // Step 1: Delegate votes to yourself
    console.log("Step 1: Delegating votes...");
    const delegateTx = await governanceToken.delegate(deployer.address);
    await delegateTx.wait();

    const votingPower = await governanceToken.getVotes(deployer.address);
    console.log(`✅ Voting power: ${ethers.formatEther(votingPower)} votes`);
    console.log("");

    // Step 2: Create a proposal to change Box value
    console.log("Step 2: Creating proposal...");
    const newValue = 77;
    const encodedFunctionCall = box.interface.encodeFunctionData("store", [newValue]);

    const proposeTx = await governor.propose(
        [await box.getAddress()],
        [0],
        [encodedFunctionCall],
        `Proposal: Store ${newValue} in the Box`,
    );

    const proposeReceipt = await proposeTx.wait();

    // Get proposal ID from the event
    if (!proposeReceipt) {
        throw new Error("Proposal transaction failed");
    }

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

    // Check proposal state
    const currentBlock = await ethers.provider.getBlockNumber();
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
    console.log(`2. Run the vote script: npx hardhat run scripts/vote.ts --network sepolia`);
    console.log(`3. Wait for block ${proposalDeadline} (voting period ends)`);
    console.log(`4. Run the queue script: npx hardhat run scripts/queue.ts --network sepolia`);
    console.log(`5. Wait ${minDelay} seconds after queuing`);
    console.log(`6. Run the execute script: npx hardhat run scripts/execute.ts --network sepolia`);
    console.log("");

    console.log("💡 TIP: Save this proposal ID for later steps:");
    console.log(`PROPOSAL_ID=${proposalId}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
