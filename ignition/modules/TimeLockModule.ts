import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TimeLockModule = buildModule("TimeLockModule", (m) => {
    // Parameters for TimeLock
    const minDelay = m.getParameter("minDelay", 3600); // 1 hour default
    const proposers = m.getParameter("proposers", []); // Will be set to Governor address later
    const executors = m.getParameter("executors", []); // Empty array means anyone can execute
    const admin = m.getParameter("admin", "0x0000000000000000000000000000000000000000"); // Zero address (no admin)

    // Deploy TimeLock
    const timeLock = m.contract("TimeLock", [minDelay, proposers, executors, admin]);

    return { timeLock };
});

export default TimeLockModule;
