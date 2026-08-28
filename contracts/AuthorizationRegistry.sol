// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPolicyRegistry} from "./interfaces/IPolicyRegistry.sol";

contract AuthorizationRegistry {
    error Unauthorized();
    error ZeroAddress();
    error InvalidAuthorizationId();
    error InvalidHash();
    error InvalidExpiry();
    error AuthorizationAlreadyExists();
    error AuthorizationNotFound();
    error PolicyInactive();

    enum Decision {
        DENY,
        APPROVE
    }

    struct Authorization {
        bytes32 transactionHash;
        bytes32 evidenceHash;
        bytes32 policyId;
        bytes32 policyHash;
        uint64 policyVersion;
        uint64 issuedAt;
        uint64 expiresAt;
        Decision decision;
        address authorizer;
    }

    IPolicyRegistry public immutable policyRegistry;

    address public owner;

    mapping(address => bool) public authorizers;
    mapping(bytes32 => Authorization) private authorizations;

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    event AuthorizerStatusChanged(
        address indexed authorizer,
        bool authorized
    );

    event AuthorizationRecorded(
        bytes32 indexed authorizationId,
        bytes32 indexed transactionHash,
        bytes32 indexed policyId,
        bytes32 evidenceHash,
        bytes32 policyHash,
        uint64 policyVersion,
        Decision decision,
        uint64 expiresAt,
        address authorizer
    );

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyAuthorizer() {
        if (!authorizers[msg.sender]) revert Unauthorized();
        _;
    }

    constructor(address policyRegistryAddress) {
        if (policyRegistryAddress == address(0)) revert ZeroAddress();

        policyRegistry = IPolicyRegistry(policyRegistryAddress);
        owner = msg.sender;
        authorizers[msg.sender] = true;

        emit OwnershipTransferred(address(0), msg.sender);
        emit AuthorizerStatusChanged(msg.sender, true);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();

        address previousOwner = owner;
        owner = newOwner;

        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function setAuthorizer(
        address authorizer,
        bool authorized
    ) external onlyOwner {
        if (authorizer == address(0)) revert ZeroAddress();

        authorizers[authorizer] = authorized;

        emit AuthorizerStatusChanged(authorizer, authorized);
    }

    function recordAuthorization(
        bytes32 authorizationId,
        bytes32 transactionHash,
        bytes32 evidenceHash,
        bytes32 policyId,
        bytes32 policyHash,
        uint64 policyVersion,
        Decision decision,
        uint64 expiresAt
    ) external onlyAuthorizer {
        if (authorizationId == bytes32(0)) {
            revert InvalidAuthorizationId();
        }

        if (
            transactionHash == bytes32(0) ||
            evidenceHash == bytes32(0) ||
            policyId == bytes32(0) ||
            policyHash == bytes32(0)
        ) {
            revert InvalidHash();
        }

        if (expiresAt <= block.timestamp) revert InvalidExpiry();

        if (authorizations[authorizationId].issuedAt != 0) {
            revert AuthorizationAlreadyExists();
        }

        if (
            !policyRegistry.isPolicyActive(
                policyId,
                policyHash,
                policyVersion
            )
        ) {
            revert PolicyInactive();
        }

        authorizations[authorizationId] = Authorization({
            transactionHash: transactionHash,
            evidenceHash: evidenceHash,
            policyId: policyId,
            policyHash: policyHash,
            policyVersion: policyVersion,
            issuedAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            decision: decision,
            authorizer: msg.sender
        });

        emit AuthorizationRecorded(
            authorizationId,
            transactionHash,
            policyId,
            evidenceHash,
            policyHash,
            policyVersion,
            decision,
            expiresAt,
            msg.sender
        );
    }

    function getAuthorization(
        bytes32 authorizationId
    ) external view returns (Authorization memory) {
        Authorization memory authorization = authorizations[
            authorizationId
        ];

        if (authorization.issuedAt == 0) {
            revert AuthorizationNotFound();
        }

        return authorization;
    }

    function isAuthorizationValid(
        bytes32 authorizationId,
        bytes32 transactionHash
    ) external view returns (bool) {
        Authorization memory authorization = authorizations[
            authorizationId
        ];

        if (authorization.issuedAt == 0) return false;
        if (authorization.decision != Decision.APPROVE) return false;
        if (authorization.transactionHash != transactionHash) return false;
        if (authorization.expiresAt <= block.timestamp) return false;

        return
            policyRegistry.isPolicyActive(
                authorization.policyId,
                authorization.policyHash,
                authorization.policyVersion
            );
    }
}