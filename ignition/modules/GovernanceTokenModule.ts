import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const GovernanceTokenModule = buildModule("GovernanceTokenModule", (m) => {
    const governanceToken = m.contract("GovernanceToken");

    return { governanceToken };
});

export default GovernanceTokenModule;
