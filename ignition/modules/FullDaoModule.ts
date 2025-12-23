import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import GovernorModule from "./GovernorModule";
import BoxModule from "./BoxModule";

/**
 * Complete DAO Deployment Module
 * This deploys all contracts and sets up roles properly
 */
const FullDaoModule = buildModule("FullDaoModule", (m) => {
    // Get deployer account
    const deployer = m.getAccount(0);

    // Deploy Governor (which also deploys Token and TimeLock)
    const { governor, governanceToken, timeLock } = m.useModule(GovernorModule);

    // Deploy Box
    const { box } = m.useModule(BoxModule);

    // Setup TimeLock roles
    const PROPOSER_ROLE = m.staticCall(timeLock, "PROPOSER_ROLE");
    const EXECUTOR_ROLE = m.staticCall(timeLock, "EXECUTOR_ROLE");
    const ADMIN_ROLE = m.staticCall(timeLock, "DEFAULT_ADMIN_ROLE");

    // Grant PROPOSER_ROLE to Governor
    m.call(timeLock, "grantRole", [PROPOSER_ROLE, governor], {
        id: "GrantProposerRole",
    });

    // Grant EXECUTOR_ROLE to zero address (allows anyone to execute)
    m.call(timeLock, "grantRole", [EXECUTOR_ROLE, "0x0000000000000000000000000000000000000000"], {
        id: "GrantExecutorRole",
    });

    // Revoke ADMIN_ROLE from deployer for full decentralization
    m.call(timeLock, "revokeRole", [ADMIN_ROLE, deployer], {
        id: "RevokeAdminRole",
        after: [m.call(timeLock, "grantRole", [PROPOSER_ROLE, governor], { id: "GrantProposerRole" })],
    });

    return {
        governanceToken,
        timeLock,
        governor,
        box,
    };
});

export default FullDaoModule;
