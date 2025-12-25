import { expect } from "chai";
import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { GovernanceToken, TimeLock, GovernorContract, Box } from "../../typechain-types";
import { time, mine } from "@nomicfoundation/hardhat-network-helpers";

const developmentChains = ["hardhat", "localhost"];

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("DAO Governance System", function () {
          let governanceToken: GovernanceToken;
          let timeLock: TimeLock;
          let governor: GovernorContract;
          let box: Box;

          let owner: SignerWithAddress;
          let voter1: SignerWithAddress;
          let voter2: SignerWithAddress;
          let voter3: SignerWithAddress;

          const MIN_DELAY = 10; // 10 seconds
          const VOTING_DELAY = 1; // 1 block
          const VOTING_PERIOD = 5; // 5 blocks
          const QUORUM_PERCENTAGE = 4; // 4%

          beforeEach(async function () {
              [owner, voter1, voter2, voter3] = await ethers.getSigners();

              // Deploy GovernanceToken
              const GovernanceTokenFactory = await ethers.getContractFactory("GovernanceToken");
              governanceToken = await GovernanceTokenFactory.deploy();
              await governanceToken.waitForDeployment();

              // Deploy TimeLock
              const TimeLockFactory = await ethers.getContractFactory("TimeLock");
              timeLock = await TimeLockFactory.deploy(
                  MIN_DELAY,
                  [], // proposers (will add Governor later)
                  [], // executors (anyone can execute)
                  owner.address, // admin
              );
              await timeLock.waitForDeployment();

              // Deploy Governor
              const GovernorFactory = await ethers.getContractFactory("GovernorContract");
              governor = await GovernorFactory.deploy(
                  await governanceToken.getAddress(),
                  await timeLock.getAddress(),
                  VOTING_DELAY,
                  VOTING_PERIOD,
                  QUORUM_PERCENTAGE,
              );
              await governor.waitForDeployment();

              // Deploy Box
              const BoxFactory = await ethers.getContractFactory("Box");
              box = await BoxFactory.deploy();
              await box.waitForDeployment();

              // Setup roles
              const PROPOSER_ROLE = await timeLock.PROPOSER_ROLE();
              const EXECUTOR_ROLE = await timeLock.EXECUTOR_ROLE();
              const ADMIN_ROLE = await timeLock.DEFAULT_ADMIN_ROLE();

              await timeLock.grantRole(PROPOSER_ROLE, await governor.getAddress());
              await timeLock.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress);

              // Transfer Box ownership to TimeLock
              await box.transferOwnership(await timeLock.getAddress());

              // Distribute tokens
              const totalSupply = await governanceToken.s_maxSupply();
              const voterAmount = totalSupply / 4n;

              await governanceToken.transfer(voter1.address, voterAmount);
              await governanceToken.transfer(voter2.address, voterAmount);
              await governanceToken.transfer(voter3.address, voterAmount);
          });

          describe("Deployment", function () {
              it("Should deploy all contracts successfully", async function () {
                  expect(await governanceToken.getAddress()).to.be.properAddress;
                  expect(await timeLock.getAddress()).to.be.properAddress;
                  expect(await governor.getAddress()).to.be.properAddress;
                  expect(await box.getAddress()).to.be.properAddress;
              });

              it("Should have correct token supply", async function () {
                  const totalSupply = await governanceToken.totalSupply();
                  expect(totalSupply).to.equal(await governanceToken.s_maxSupply());
              });

              it("Should set correct governance parameters", async function () {
                  expect(await governor.votingDelay()).to.equal(VOTING_DELAY);
                  expect(await governor.votingPeriod()).to.equal(VOTING_PERIOD);
              });

              it("Should set TimeLock as Box owner", async function () {
                  expect(await box.owner()).to.equal(await timeLock.getAddress());
              });

              it("Should grant correct roles", async function () {
                  const PROPOSER_ROLE = await timeLock.PROPOSER_ROLE();
                  const EXECUTOR_ROLE = await timeLock.EXECUTOR_ROLE();

                  expect(await timeLock.hasRole(PROPOSER_ROLE, await governor.getAddress())).to.be.true;
                  expect(await timeLock.hasRole(EXECUTOR_ROLE, ethers.ZeroAddress)).to.be.true;
              });
          });

          describe("Token Delegation", function () {
              it("Should allow self-delegation", async function () {
                  await governanceToken.connect(voter1).delegate(voter1.address);
                  const votes = await governanceToken.getVotes(voter1.address);
                  expect(votes).to.be.gt(0);
              });

              it("Should allow delegation to another address", async function () {
                  await governanceToken.connect(voter1).delegate(voter2.address);
                  const votes = await governanceToken.getVotes(voter2.address);
                  expect(votes).to.equal(await governanceToken.balanceOf(voter1.address));
              });

              it("Should emit DelegateChanged event", async function () {
                  await expect(governanceToken.connect(voter1).delegate(voter1.address))
                      .to.emit(governanceToken, "DelegateChanged")
                      .withArgs(voter1.address, ethers.ZeroAddress, voter1.address);
              });

              it("Should require delegation before voting power is active", async function () {
                  const votesBefore = await governanceToken.getVotes(voter1.address);
                  expect(votesBefore).to.equal(0);

                  await governanceToken.connect(voter1).delegate(voter1.address);
                  const votesAfter = await governanceToken.getVotes(voter1.address);
                  expect(votesAfter).to.be.gt(0);
              });
          });

          describe("Proposal Creation", function () {
              beforeEach(async function () {
                  // Delegate votes
                  await governanceToken.connect(voter1).delegate(voter1.address);
                  await mine(1); // Mine 1 block for voting power to take effect
              });

              it("Should create a proposal", async function () {
                  const newValue = 42;
                  const encodedFunctionCall = box.interface.encodeFunctionData("store", [newValue]);

                  const tx = await governor
                      .connect(voter1)
                      .propose([await box.getAddress()], [0], [encodedFunctionCall], "Proposal: Store 42 in Box");

                  await expect(tx).to.emit(governor, "ProposalCreated");
              });

              it("Should revert if proposer has insufficient voting power", async function () {
                  const newValue = 42;
                  const encodedFunctionCall = box.interface.encodeFunctionData("store", [newValue]);

                  await expect(
                      governor
                          .connect(voter2)
                          .propose([await box.getAddress()], [0], [encodedFunctionCall], "Proposal: Store 42 in Box"),
                  ).to.be.reverted; // voter2 hasn't delegated
              });

              it("Should not allow duplicate proposals", async function () {
                  const newValue = 42;
                  const encodedFunctionCall = box.interface.encodeFunctionData("store", [newValue]);
                  const description = "Proposal: Store 42 in Box";

                  await governor
                      .connect(voter1)
                      .propose([await box.getAddress()], [0], [encodedFunctionCall], description);

                  await expect(
                      governor
                          .connect(voter1)
                          .propose([await box.getAddress()], [0], [encodedFunctionCall], description),
                  ).to.be.reverted;
              });
          });

          describe("Voting", function () {
              let proposalId: bigint;
              const newValue = 77;

              beforeEach(async function () {
                  // Delegate votes
                  await governanceToken.connect(voter1).delegate(voter1.address);
                  await governanceToken.connect(voter2).delegate(voter2.address);
                  await governanceToken.connect(voter3).delegate(voter3.address);
                  await mine(1);

                  // Create proposal
                  const encodedFunctionCall = box.interface.encodeFunctionData("store", [newValue]);
                  const tx = await governor
                      .connect(voter1)
                      .propose([await box.getAddress()], [0], [encodedFunctionCall], "Proposal: Store 77 in Box");

                  const receipt = await tx.wait();
                  const event = receipt?.logs.find((log: any) => {
                      try {
                          return governor.interface.parseLog(log)?.name === "ProposalCreated";
                      } catch {
                          return false;
                      }
                  });
                  const parsedEvent = governor.interface.parseLog(event!);
                  proposalId = parsedEvent!.args[0];

                  // Wait for voting delay
                  await mine(VOTING_DELAY);
              });

              it("Should allow voting for a proposal", async function () {
                  const voteTx = await governor.connect(voter1).castVote(proposalId, 1); // 1 = For
                  await expect(voteTx).to.emit(governor, "VoteCast");
              });

              it("Should allow voting against a proposal", async function () {
                  const voteTx = await governor.connect(voter1).castVote(proposalId, 0); // 0 = Against
                  await expect(voteTx).to.emit(governor, "VoteCast");
              });

              it("Should allow abstaining", async function () {
                  const voteTx = await governor.connect(voter1).castVote(proposalId, 2); // 2 = Abstain
                  await expect(voteTx).to.emit(governor, "VoteCast");
              });

              it("Should not allow voting twice", async function () {
                  await governor.connect(voter1).castVote(proposalId, 1);

                  await expect(governor.connect(voter1).castVote(proposalId, 1)).to.be.reverted;
              });

              it("Should not allow voting before voting delay", async function () {
                  // Create new proposal
                  const encodedFunctionCall = box.interface.encodeFunctionData("store", [99]);
                  const tx = await governor
                      .connect(voter1)
                      .propose([await box.getAddress()], [0], [encodedFunctionCall], "Proposal: Store 99 in Box");

                  const receipt = await tx.wait();
                  const event = receipt?.logs.find((log: any) => {
                      try {
                          return governor.interface.parseLog(log)?.name === "ProposalCreated";
                      } catch {
                          return false;
                      }
                  });
                  const parsedEvent = governor.interface.parseLog(event!);
                  const newProposalId = parsedEvent!.args[0];

                  // Try to vote immediately
                  await expect(governor.connect(voter1).castVote(newProposalId, 1)).to.be.reverted;
              });

              it("Should reach quorum with enough votes", async function () {
                  await governor.connect(voter1).castVote(proposalId, 1);
                  await governor.connect(voter2).castVote(proposalId, 1);
                  await governor.connect(voter3).castVote(proposalId, 1);

                  await mine(VOTING_PERIOD);

                  const state = await governor.state(proposalId);
                  expect(state).to.equal(4n); // 4 = Succeeded
              });

              it("Should fail without quorum", async function () {
                  // Only one small voter votes
                  await governor.connect(voter1).castVote(proposalId, 1);

                  await mine(VOTING_PERIOD);

                  const state = await governor.state(proposalId);
                  expect(state).to.equal(3n); // 3 = Defeated
              });
          });

          describe("Proposal Queueing", function () {
              let proposalId: bigint;
              const newValue = 88;
              let encodedFunctionCall: string;
              let descriptionHash: string;

              beforeEach(async function () {
                  // Setup and create proposal
                  await governanceToken.connect(voter1).delegate(voter1.address);
                  await governanceToken.connect(voter2).delegate(voter2.address);
                  await mine(1);

                  encodedFunctionCall = box.interface.encodeFunctionData("store", [newValue]);
                  const description = "Proposal: Store 88 in Box";
                  descriptionHash = ethers.id(description);

                  const tx = await governor
                      .connect(voter1)
                      .propose([await box.getAddress()], [0], [encodedFunctionCall], description);

                  const receipt = await tx.wait();
                  const event = receipt?.logs.find((log: any) => {
                      try {
                          return governor.interface.parseLog(log)?.name === "ProposalCreated";
                      } catch {
                          return false;
                      }
                  });
                  const parsedEvent = governor.interface.parseLog(event!);
                  proposalId = parsedEvent!.args[0];

                  // Vote
                  await mine(VOTING_DELAY);
                  await governor.connect(voter1).castVote(proposalId, 1);
                  await governor.connect(voter2).castVote(proposalId, 1);
                  await mine(VOTING_PERIOD);
              });

              it("Should queue a successful proposal", async function () {
                  const queueTx = await governor.queue(
                      [await box.getAddress()],
                      [0],
                      [encodedFunctionCall],
                      descriptionHash,
                  );

                  await expect(queueTx).to.emit(governor, "ProposalQueued");
              });

              it("Should not queue a defeated proposal", async function () {
                  // Create new proposal that will be defeated
                  const newEncodedCall = box.interface.encodeFunctionData("store", [999]);
                  const newDescription = "Proposal: Store 999 in Box";

                  const tx = await governor
                      .connect(voter1)
                      .propose([await box.getAddress()], [0], [newEncodedCall], newDescription);

                  const receipt = await tx.wait();
                  const event = receipt?.logs.find((log: any) => {
                      try {
                          return governor.interface.parseLog(log)?.name === "ProposalCreated";
                      } catch {
                          return false;
                      }
                  });
                  const parsedEvent = governor.interface.parseLog(event!);
                  const newProposalId = parsedEvent!.args[0];

                  await mine(VOTING_DELAY);
                  // No votes or not enough votes
                  await mine(VOTING_PERIOD);

                  const newDescHash = ethers.id(newDescription);
                  await expect(governor.queue([await box.getAddress()], [0], [newEncodedCall], newDescHash)).to.be
                      .reverted;
              });
          });

          describe("Proposal Execution", function () {
              let proposalId: bigint;
              const newValue = 123;
              let encodedFunctionCall: string;
              let descriptionHash: string;

              beforeEach(async function () {
                  // Full proposal flow
                  await governanceToken.connect(voter1).delegate(voter1.address);
                  await governanceToken.connect(voter2).delegate(voter2.address);
                  await mine(1);

                  encodedFunctionCall = box.interface.encodeFunctionData("store", [newValue]);
                  const description = "Proposal: Store 123 in Box";
                  descriptionHash = ethers.id(description);

                  const tx = await governor
                      .connect(voter1)
                      .propose([await box.getAddress()], [0], [encodedFunctionCall], description);

                  const receipt = await tx.wait();
                  const event = receipt?.logs.find((log: any) => {
                      try {
                          return governor.interface.parseLog(log)?.name === "ProposalCreated";
                      } catch {
                          return false;
                      }
                  });
                  const parsedEvent = governor.interface.parseLog(event!);
                  proposalId = parsedEvent!.args[0];

                  await mine(VOTING_DELAY);
                  await governor.connect(voter1).castVote(proposalId, 1);
                  await governor.connect(voter2).castVote(proposalId, 1);
                  await mine(VOTING_PERIOD);

                  await governor.queue([await box.getAddress()], [0], [encodedFunctionCall], descriptionHash);
              });

              it("Should execute a queued proposal after timelock delay", async function () {
                  await time.increase(MIN_DELAY);
                  await mine(1);

                  const executeTx = await governor.execute(
                      [await box.getAddress()],
                      [0],
                      [encodedFunctionCall],
                      descriptionHash,
                  );

                  await expect(executeTx).to.emit(governor, "ProposalExecuted");
              });

              it("Should update Box value after execution", async function () {
                  await time.increase(MIN_DELAY);
                  await mine(1);

                  await governor.execute([await box.getAddress()], [0], [encodedFunctionCall], descriptionHash);

                  const storedValue = await box.retrieve();
                  expect(storedValue).to.equal(newValue);
              });

              it("Should not execute before timelock delay", async function () {
                  await expect(governor.execute([await box.getAddress()], [0], [encodedFunctionCall], descriptionHash))
                      .to.be.reverted;
              });

              it("Should not execute a proposal twice", async function () {
                  await time.increase(MIN_DELAY);
                  await mine(1);

                  await governor.execute([await box.getAddress()], [0], [encodedFunctionCall], descriptionHash);

                  await expect(governor.execute([await box.getAddress()], [0], [encodedFunctionCall], descriptionHash))
                      .to.be.reverted;
              });
          });

          describe("End-to-End Governance Flow", function () {
              it("Should complete full governance cycle", async function () {
                  // 1. Delegate votes
                  await governanceToken.connect(voter1).delegate(voter1.address);
                  await governanceToken.connect(voter2).delegate(voter2.address);
                  await mine(1);

                  // 2. Create proposal
                  const newValue = 456;
                  const encodedFunctionCall = box.interface.encodeFunctionData("store", [newValue]);
                  const description = "Proposal: Store 456 in Box";
                  const descriptionHash = ethers.id(description);

                  const proposeTx = await governor
                      .connect(voter1)
                      .propose([await box.getAddress()], [0], [encodedFunctionCall], description);

                  const proposeReceipt = await proposeTx.wait();
                  const event = proposeReceipt?.logs.find((log: any) => {
                      try {
                          return governor.interface.parseLog(log)?.name === "ProposalCreated";
                      } catch {
                          return false;
                      }
                  });
                  const parsedEvent = governor.interface.parseLog(event!);
                  const proposalId = parsedEvent!.args[0];

                  // 3. Wait and vote
                  await mine(VOTING_DELAY);
                  await governor.connect(voter1).castVote(proposalId, 1);
                  await governor.connect(voter2).castVote(proposalId, 1);

                  // 4. Wait for voting to end
                  await mine(VOTING_PERIOD);

                  // 5. Queue proposal
                  await governor.queue([await box.getAddress()], [0], [encodedFunctionCall], descriptionHash);

                  // 6. Wait for timelock
                  await time.increase(MIN_DELAY);
                  await mine(1);

                  // 7. Execute
                  await governor.execute([await box.getAddress()], [0], [encodedFunctionCall], descriptionHash);

                  // 8. Verify
                  const storedValue = await box.retrieve();
                  expect(storedValue).to.equal(newValue);
              });
          });

          describe("Access Control", function () {
              it("Should prevent direct Box manipulation", async function () {
                  await expect(box.connect(voter1).store(999)).to.be.reverted;
              });

              it("Should allow TimeLock to update Box", async function () {
                  // Impersonate TimeLock
                  await ethers.provider.send("hardhat_impersonateAccount", [await timeLock.getAddress()]);
                  const timelockSigner = await ethers.getSigner(await timeLock.getAddress());

                  // Fund the TimeLock account
                  await owner.sendTransaction({
                      to: await timeLock.getAddress(),
                      value: ethers.parseEther("1"),
                  });

                  await box.connect(timelockSigner).store(999);
                  expect(await box.retrieve()).to.equal(999);

                  await ethers.provider.send("hardhat_stopImpersonatingAccount", [await timeLock.getAddress()]);
              });
          });
      });
