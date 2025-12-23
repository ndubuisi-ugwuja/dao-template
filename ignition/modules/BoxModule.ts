import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import GovernorModule from "./GovernorModule";

const BoxModule = buildModule("BoxModule", (m) => {
    // Get the deployed contracts
    const { timeLock } = m.useModule(GovernorModule);

    // Deploy Box with TimeLock as the owner
    const box = m.contract("Box", [], {
        after: [timeLock],
    });

    // Transfer ownership to TimeLock
    m.call(box, "transferOwnership", [timeLock]);

    return { box };
});

export default BoxModule;
