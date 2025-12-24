import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import GovernanceTokenModule from "./GovernanceTokenModule";
import TimeLockModule from "./TimeLockModule";

const GovernorModule = buildModule("GovernorModule", (m) => {
    // Get deployed GovernanceToken and TimeLock
    const { governanceToken } = m.useModule(GovernanceTokenModule);
    const { timeLock } = m.useModule(TimeLockModule);

    // Governor parameters
    const votingDelay = m.getParameter("votingDelay", 1); // 1 block
    const votingPeriod = m.getParameter("votingPeriod", 5); // 1 minutes for testing purpose (normally this should be set to 7 days)
    const quorumPercentage = m.getParameter("quorumPercentage", 4); // 4%

    // Deploy Governor
    const governor = m.contract("GovernorContract", [
        governanceToken,
        timeLock,
        votingDelay,
        votingPeriod,
        quorumPercentage,
    ]);

    return { governor, governanceToken, timeLock };
});

export default GovernorModule;
