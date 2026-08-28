// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PolicyRegistry {
    error Unauthorized();
    error InvalidPolicyId();
    error InvalidPolicyVersion();
    error PolicyAlreadyExists();
    error PolicyNotFound();

    struct Policy {
        bytes32 policyHash;
        uint64 version;
        uint64 updatedAt;
        bool active;
    }

    address public owner;

    mapping(bytes32 => Policy) private policies;

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    event PolicyRegistered(
        bytes32 indexed policyId,
        bytes32 indexed policyHash,
        uint64 version
    );

    event PolicyStatusChanged(
        bytes32 indexed policyId,
        bool active
    );

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert Unauthorized();

        address previousOwner = owner;
        owner = newOwner;

        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function registerPolicy(
        bytes32 policyId,
        bytes32 policyHash,
        uint64 version
    ) external onlyOwner {
        if (policyId == bytes32(0) || policyHash == bytes32(0)) {
            revert InvalidPolicyId();
        }

        if (version == 0) revert InvalidPolicyVersion();
        if (policies[policyId].version != 0) revert PolicyAlreadyExists();

        policies[policyId] = Policy({
            policyHash: policyHash,
            version: version,
            updatedAt: uint64(block.timestamp),
            active: true
        });

        emit PolicyRegistered(policyId, policyHash, version);
    }

    function setPolicyStatus(
        bytes32 policyId,
        bool active
    ) external onlyOwner {
        Policy storage policy = policies[policyId];

        if (policy.version == 0) revert PolicyNotFound();

        policy.active = active;
        policy.updatedAt = uint64(block.timestamp);

        emit PolicyStatusChanged(policyId, active);
    }

    function getPolicy(
        bytes32 policyId
    ) external view returns (Policy memory) {
        Policy memory policy = policies[policyId];

        if (policy.version == 0) revert PolicyNotFound();

        return policy;
    }

    function isPolicyActive(
        bytes32 policyId,
        bytes32 policyHash,
        uint64 version
    ) external view returns (bool) {
        Policy memory policy = policies[policyId];

        return
            policy.active &&
            policy.policyHash == policyHash &&
            policy.version == version;
    }
}