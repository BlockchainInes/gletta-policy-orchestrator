// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPolicyRegistry {
    function isPolicyActive(
        bytes32 policyId,
        bytes32 policyHash,
        uint64 version
    ) external view returns (bool);
}