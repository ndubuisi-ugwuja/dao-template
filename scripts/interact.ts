import { ethers } from "hardhat";

/**
 * Example script to interact with deployed DAO
 * Run with: npx hardhat run scripts/interact-with-dao.ts --network localhost
 */
async function main() {
    const [deployer] = await ethers.getSigners();

    const { GOVERNANCE_TOKEN_ADDRESS } = process.env;
    const { GOVERNOR_ADDRESS } = process.env;
    const { TIMELOCK_ADDRESS } = process.env;
    const { BOX_ADDRESS } = process.env;

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
    const proposalId = proposeReceipt?.logs[0].topics[1];

    console.log(`✅ Proposal created with ID: ${proposalId}`);
    console.log("");

    // Step 3: Wait for voting delay (mine blocks if on local network)
    console.log("Step 3: Waiting for voting period to start...");
    const votingDelay = await governor.votingDelay();
    console.log(`Mining ${votingDelay} blocks...`);

    for (let i = 0; i < Number(votingDelay); i++) {
        await ethers.provider.send("evm_mine", []);
    }
    console.log("✅ Voting period started");
    console.log("");

    // Step 4: Vote on the proposal
    console.log("Step 4: Voting on proposal...");
    const voteTx = await governor.castVote(proposalId, 1); // 1 = For, 0 = Against, 2 = Abstain
    await voteTx.wait();
    console.log("✅ Vote cast: FOR");
    console.log("");

    // Step 5: Wait for voting period to end
    console.log("Step 5: Waiting for voting period to end...");
    const votingPeriod = await governor.votingPeriod();
    console.log(`Mining ${votingPeriod} blocks...`);

    for (let i = 0; i < Number(votingPeriod); i++) {
        await ethers.provider.send("evm_mine", []);
    }
    console.log("✅ Voting period ended");
    console.log("");

    // Step 6: Queue the proposal
    console.log("Step 6: Queueing proposal...");
    const descriptionHash = ethers.id(`Proposal: Store ${newValue} in the Box`);

    const queueTx = await governor.queue([await box.getAddress()], [0], [encodedFunctionCall], descriptionHash);
    await queueTx.wait();
    console.log("✅ Proposal queued in TimeLock");
    console.log("");

    // Step 7: Wait for TimeLock delay
    console.log("Step 7: Waiting for TimeLock delay...");
    const minDelay = await timeLock.getMinDelay();
    console.log(`Advancing time by ${minDelay} seconds...`);

    await ethers.provider.send("evm_increaseTime", [Number(minDelay)]);
    await ethers.provider.send("evm_mine", []);
    console.log("✅ TimeLock delay passed");
    console.log("");

    // Step 8: Execute the proposal
    console.log("Step 8: Executing proposal...");
    const executeTx = await governor.execute([await box.getAddress()], [0], [encodedFunctionCall], descriptionHash);
    await executeTx.wait();
    console.log("✅ Proposal executed!");
    console.log("");

    // Step 9: Verify the change
    console.log("Step 9: Verifying result...");
    const storedValue = await box.retrieve();
    console.log(`Box value is now: ${storedValue}`);
    console.log("");

    if (storedValue === BigInt(newValue)) {
        console.log("🎉 SUCCESS! The DAO successfully changed the Box value!");
    } else {
        console.log("❌ Something went wrong...");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
