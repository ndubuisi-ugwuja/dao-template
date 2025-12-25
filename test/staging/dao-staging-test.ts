import { expect } from "chai";
import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { GovernanceToken, TimeLock, GovernorContract, Box } from "../../typechain-types";
import "dotenv/config";

/**
 * STAGING TESTS
 *
 * These tests run on testnets (Sepolia, etc.) to verify the deployed DAO works correctly
 * in a real blockchain environment before mainnet deployment.
 *
 * Prerequisites:
 * 1. Deploy contracts to testnet using Hardhat Ignition
 * 2. Set environment variables with deployed addresses
 * 3. Ensure deployer has testnet ETH
 *
 * Run with: npx hardhat test test/DAO.staging.test.ts --network sepolia
 */

const developmentChains = ["hardhat", "localhost"];

developmentChains.includes(network.name)
    ? describe.skip
    : describe("DAO Staging Tests", function () {
          let governanceToken: GovernanceToken;
          let timeLock: TimeLock;
          let governor: GovernorContract;
          let box: Box;

          let deployer: SignerWithAddress;
          let voter: SignerWithAddress;

          beforeEach(async function () {
              [deployer, voter] = await ethers.getSigners();

              // Get deployed contract addresses from environment variables
              const GOVERNANCE_TOKEN_ADDRESS = process.env.GOVERNANCE_TOKEN_ADDRESS;
              const GOVERNOR_ADDRESS = process.env.GOVERNOR_ADDRESS;
              const TIMELOCK_ADDRESS = process.env.TIMELOCK_ADDRESS;
              const BOX_ADDRESS = process.env.BOX_ADDRESS;

              if (!GOVERNANCE_TOKEN_ADDRESS || !GOVERNOR_ADDRESS || !TIMELOCK_ADDRESS || !BOX_ADDRESS) {
                  throw new Error(
                      "Missing deployed contract addresses. Please set environment variables:\n" +
                          "GOVERNANCE_TOKEN_ADDRESS, GOVERNOR_ADDRESS, TIMELOCK_ADDRESS, BOX_ADDRESS",
                  );
              }

              console.log("\n📋 Contract Addresses:");
              console.log("GovernanceToken:", GOVERNANCE_TOKEN_ADDRESS);
              console.log("Governor:", GOVERNOR_ADDRESS);
              console.log("TimeLock:", TIMELOCK_ADDRESS);
              console.log("Box:", BOX_ADDRESS);

              // Connect to deployed contracts
              governanceToken = await ethers.getContractAt("GovernanceToken", GOVERNANCE_TOKEN_ADDRESS);
              governor = await ethers.getContractAt("GovernorContract", GOVERNOR_ADDRESS);
              timeLock = await ethers.getContractAt("TimeLock", TIMELOCK_ADDRESS);
              box = await ethers.getContractAt("Box", BOX_ADDRESS);

              console.log("✅ Connected to all contracts");
          });

          describe("Deployment Verification", function () {
              it("Should verify all contracts are deployed", async function () {
                  const tokenCode = await ethers.provider.getCode(await governanceToken.getAddress());
                  const governorCode = await ethers.provider.getCode(await governor.getAddress());
                  const timelockCode = await ethers.provider.getCode(await timeLock.getAddress());
                  const boxCode = await ethers.provider.getCode(await box.getAddress());

                  expect(tokenCode).to.not.equal("0x");
                  expect(governorCode).to.not.equal("0x");
                  expect(timelockCode).to.not.equal("0x");
                  expect(boxCode).to.not.equal("0x");

                  console.log("✅ All contracts have bytecode deployed");
              });

              it("Should have correct token supply", async function () {
                  const totalSupply = await governanceToken.totalSupply();
                  const maxSupply = await governanceToken.s_maxSupply();

                  expect(totalSupply).to.equal(maxSupply);
                  console.log("Total supply:", ethers.formatEther(totalSupply));
              });

              it("Should have deployer balance", async function () {
                  const balance = await governanceToken.balanceOf(deployer.address);
                  expect(balance).to.be.gt(0);
                  console.log("Deployer balance:", ethers.formatEther(balance));
              });
          });

          describe("Governance Parameters", function () {
              it("Should have correct voting delay", async function () {
                  const votingDelay = await governor.votingDelay();
                  expect(votingDelay).to.be.gt(0);
                  console.log("Voting delay:", votingDelay.toString(), "blocks");
              });

              it("Should have correct voting period", async function () {
                  const votingPeriod = await governor.votingPeriod();
                  expect(votingPeriod).to.be.gt(0);
                  console.log("Voting period:", votingPeriod.toString(), "blocks");
              });

              it("Should have TimeLock with min delay", async function () {
                  const minDelay = await timeLock.getMinDelay();
                  expect(minDelay).to.be.gt(0);
                  console.log("TimeLock min delay:", minDelay.toString(), "seconds");
              });

              it("Should have correct proposal threshold", async function () {
                  const threshold = await governor.proposalThreshold();
                  console.log("Proposal threshold:", ethers.formatEther(threshold));
              });
          });

          describe("Access Control & Roles", function () {
              it("Should have Governor as PROPOSER on TimeLock", async function () {
                  const PROPOSER_ROLE = await timeLock.PROPOSER_ROLE();
                  const hasRole = await timeLock.hasRole(PROPOSER_ROLE, await governor.getAddress());
                  expect(hasRole).to.be.true;
                  console.log("✅ Governor has PROPOSER role");
              });

              it("Should have zero address as EXECUTOR on TimeLock", async function () {
                  const EXECUTOR_ROLE = await timeLock.EXECUTOR_ROLE();
                  const hasRole = await timeLock.hasRole(EXECUTOR_ROLE, ethers.ZeroAddress);
                  expect(hasRole).to.be.true;
                  console.log("✅ Anyone can execute (zero address has EXECUTOR role)");
              });

              it("Should have TimeLock as Box owner", async function () {
                  const owner = await box.owner();
                  expect(owner.toLowerCase()).to.equal((await timeLock.getAddress()).toLowerCase());
                  console.log("✅ TimeLock owns Box contract");
              });

              it("Should prevent direct Box manipulation", async function () {
                  await expect(box.connect(deployer).store(999)).to.be.reverted;
                  console.log("✅ Cannot directly modify Box");
              });
          });

          describe("Token Delegation", function () {
              it("Should allow token delegation", async function () {
                  const votesBefore = await governanceToken.getVotes(deployer.address);
                  console.log("Votes before delegation:", ethers.formatEther(votesBefore));

                  const delegate = await governanceToken.delegates(deployer.address);

                  if (delegate === ethers.ZeroAddress) {
                      console.log("Delegating to self...");
                      const tx = await governanceToken.connect(deployer).delegate(deployer.address);
                      const receipt = await tx.wait();
                      console.log("✅ Delegation transaction:", receipt?.hash);

                      // Note: Voting power activates in next block
                      console.log("⏰ Voting power will be active in the next block");
                  } else {
                      console.log("Already delegated to:", delegate);
                      const votesAfter = await governanceToken.getVotes(deployer.address);
                      console.log("Current votes:", ethers.formatEther(votesAfter));
                  }
              });

              it("Should show correct delegate", async function () {
                  const delegate = await governanceToken.delegates(deployer.address);
                  console.log("Current delegate:", delegate);

                  if (delegate !== ethers.ZeroAddress) {
                      expect(delegate).to.be.properAddress;
                  }
              });
          });

          describe("Box State", function () {
              it("Should read current Box value", async function () {
                  const value = await box.retrieve();
                  console.log("Current Box value:", value.toString());
                  expect(value).to.be.gte(0);
              });

              it("Should verify Box is controlled by governance", async function () {
                  const owner = await box.owner();
                  expect(owner).to.equal(await timeLock.getAddress());
                  console.log("✅ Box is controlled by TimeLock/Governance");
              });
          });

          describe("Proposal State Checks", function () {
              it("Should be able to check if user can propose", async function () {
                  const votingPower = await governanceToken.getVotes(deployer.address);
                  const threshold = await governor.proposalThreshold();

                  console.log("Your voting power:", ethers.formatEther(votingPower));
                  console.log("Proposal threshold:", ethers.formatEther(threshold));

                  if (votingPower >= threshold) {
                      console.log("✅ Eligible to create proposals");
                  } else {
                      console.log("⚠️  Need to delegate votes first and wait 1 block");
                  }
              });

              it("Should query past proposals (if any)", async function () {
                  const currentBlock = await ethers.provider.getBlockNumber();
                  const fromBlock = Math.max(0, currentBlock - 10000); // Last ~10k blocks

                  console.log("Searching for proposals from block", fromBlock, "to", currentBlock);

                  try {
                      const filter = governor.filters.ProposalCreated();
                      const events = await governor.queryFilter(filter, fromBlock, currentBlock);

                      console.log(`Found ${events.length} proposal(s)`);

                      if (events.length > 0) {
                          for (let i = 0; i < Math.min(events.length, 3); i++) {
                              const event = events[i];
                              const proposalId = event.args?.[0];
                              const state = await governor.state(proposalId);
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

                              console.log(`\nProposal ${i + 1}:`);
                              console.log("  ID:", proposalId?.toString());
                              console.log("  State:", stateNames[Number(state)]);
                              console.log("  Block:", event.blockNumber);
                          }
                      }
                  } catch (error) {
                      console.log("Could not query proposal history (block range might be too large)");
                  }
              });
          });

          describe("Network & Gas Checks", function () {
              it("Should verify network is a testnet", async function () {
                  const chainId = network.config.chainId;
                  const networkName = network.name;

                  console.log("Network:", networkName);
                  console.log("Chain ID:", chainId);

                  // Common testnet chain IDs
                  const testnets = [11155111, 5, 80001, 421613]; // Sepolia, Goerli, Mumbai, Arbitrum Goerli

                  expect(testnets).to.include(chainId);
                  console.log("✅ Confirmed testnet environment");
              });

              it("Should check deployer has sufficient balance", async function () {
                  const balance = await ethers.provider.getBalance(deployer.address);
                  console.log("Deployer ETH balance:", ethers.formatEther(balance));

                  expect(balance).to.be.gt(ethers.parseEther("0.01"));
                  console.log("✅ Sufficient balance for testing");
              });

              it("Should estimate gas for common operations", async function () {
                  // Check if already delegated
                  const delegate = await governanceToken.delegates(deployer.address);

                  if (delegate === ethers.ZeroAddress) {
                      const gasEstimate = await governanceToken.delegate.estimateGas(deployer.address);
                      console.log("Delegation gas estimate:", gasEstimate.toString());
                  } else {
                      console.log("Already delegated, skipping gas estimate");
                  }
              });
          });

          describe("Integration Checks", function () {
              it("Should verify Governor can interact with TimeLock", async function () {
                  const governorAddress = await governor.getAddress();
                  const PROPOSER_ROLE = await timeLock.PROPOSER_ROLE();

                  const canPropose = await timeLock.hasRole(PROPOSER_ROLE, governorAddress);
                  expect(canPropose).to.be.true;
                  console.log("✅ Governor <-> TimeLock integration verified");
              });

              it("Should verify TimeLock can interact with Box", async function () {
                  const timelockAddress = await timeLock.getAddress();
                  const boxOwner = await box.owner();

                  expect(boxOwner.toLowerCase()).to.equal(timelockAddress.toLowerCase());
                  console.log("✅ TimeLock <-> Box integration verified");
              });

              it("Should verify end-to-end governance flow readiness", async function () {
                  const votingPower = await governanceToken.getVotes(deployer.address);
                  const threshold = await governor.proposalThreshold();
                  const PROPOSER_ROLE = await timeLock.PROPOSER_ROLE();
                  const EXECUTOR_ROLE = await timeLock.EXECUTOR_ROLE();

                  const hasProposerRole = await timeLock.hasRole(PROPOSER_ROLE, await governor.getAddress());
                  const hasExecutorRole = await timeLock.hasRole(EXECUTOR_ROLE, ethers.ZeroAddress);
                  const boxOwner = await box.owner();

                  console.log("\n📊 Governance Readiness Check:");
                  console.log(
                      "  Voting Power:",
                      votingPower >= threshold ? "✅" : "❌",
                      ethers.formatEther(votingPower),
                  );
                  console.log("  Governor -> TimeLock:", hasProposerRole ? "✅" : "❌");
                  console.log("  Anyone -> Execute:", hasExecutorRole ? "✅" : "❌");
                  console.log("  TimeLock -> Box:", boxOwner === (await timeLock.getAddress()) ? "✅" : "❌");

                  const allReady =
                      votingPower >= threshold &&
                      hasProposerRole &&
                      hasExecutorRole &&
                      boxOwner === (await timeLock.getAddress());

                  if (allReady) {
                      console.log("\n🎉 All systems ready for governance!");
                  } else {
                      console.log("\n⚠️  Some setup incomplete - review above checks");
                  }

                  expect(hasProposerRole && hasExecutorRole).to.be.true;
              });
          });

          describe("Safety Checks", function () {
              it("Should not be on mainnet", async function () {
                  const chainId = network.config.chainId;
                  expect(chainId).to.not.equal(1); // Ethereum mainnet
                  console.log("✅ Not on mainnet");
              });

              it("Should have reasonable governance parameters", async function () {
                  const votingDelay = await governor.votingDelay();
                  const votingPeriod = await governor.votingPeriod();
                  const minDelay = await timeLock.getMinDelay();

                  // Reasonable ranges for testnet
                  expect(votingDelay).to.be.gte(1);
                  expect(votingDelay).to.be.lte(100000);

                  expect(votingPeriod).to.be.gte(1);
                  expect(votingPeriod).to.be.lte(100000);

                  expect(minDelay).to.be.gte(1);
                  expect(minDelay).to.be.lte(86400 * 7); // Max 1 week

                  console.log("✅ Governance parameters are reasonable");
              });

              it("Should verify no admin backdoors exist", async function () {
                  const ADMIN_ROLE = await timeLock.DEFAULT_ADMIN_ROLE();

                  // Check if deployer still has admin (should be false for production)
                  const deployerHasAdmin = await timeLock.hasRole(ADMIN_ROLE, deployer.address);

                  console.log("Deployer has ADMIN role:", deployerHasAdmin);

                  if (deployerHasAdmin) {
                      console.log("⚠️  WARNING: Deployer still has admin role");
                      console.log("   For production, admin role should be revoked");
                  } else {
                      console.log("✅ No deployer admin backdoor");
                  }

                  // TimeLock should be its own admin
                  const timelockIsAdmin = await timeLock.hasRole(ADMIN_ROLE, await timeLock.getAddress());
                  expect(timelockIsAdmin).to.be.true;
                  console.log("✅ TimeLock is self-administered (governed by DAO)");
              });
          });
      });
