// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

abstract contract GovernanceToken is ERC20Votes {
    uint256 public s_maxSupply = 1000000000000000000000000;

    constructor() ERC20("GovernanceToken", "GT") {
        _mint(msg.sender, s_maxSupply);
    }
}
