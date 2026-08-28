// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PolicyRegistry} from "../contracts/PolicyRegistry.sol";
import {AuthorizationRegistry} from "../contracts/AuthorizationRegistry.sol";

contract AuthorizationRegistryTest is Test {
    PolicyRegistry internal policyRegistry;
    AuthorizationRegistry internal authorizationRegistry;

    address internal owner = address(0xA11CE);
    address internal authorizer = address(0xBEEF);
    address internal outsider = address(0xCAFE);

    bytes32 internal policyId = keccak256("EU_PROFESSIONAL_INVESTOR");
    bytes32 internal policyHash = keccak256("policy-v1");

    bytes32 internal authorizationId = keccak256("authorization-001");
    bytes32 internal transactionHash = keccak256("transaction-001");
    bytes32 internal evidenceHash = keccak256("evidence-001");

    function setUp() public {
        vm.startPrank(owner);

        policyRegistry = new PolicyRegistry();

        policyRegistry.registerPolicy(
            policyId,
            policyHash,
            1
        );

        authorizationRegistry = new AuthorizationRegistry(
            address(policyRegistry)
        );

        authorizationRegistry.setAuthorizer(
            authorizer,
            true
        );

        vm.stopPrank();
    }

    function testOwnerIsSetOnDeployment() public view {
        assertEq(
            authorizationRegistry.owner(),
            owner
        );
    }

    function testConfiguredAuthorizerCanRecordApproval() public {
        vm.prank(authorizer);

        authorizationRegistry.recordAuthorization(
            authorizationId,
            transactionHash,
            evidenceHash,
            policyId,
            policyHash,
            1,
            AuthorizationRegistry.Decision.APPROVE,
            uint64(block.timestamp + 1 hours)
        );

        AuthorizationRegistry.Authorization memory authorization =
            authorizationRegistry.getAuthorization(
                authorizationId
            );

        assertEq(
            authorization.transactionHash,
            transactionHash
        );

        assertEq(
            authorization.evidenceHash,
            evidenceHash
        );

        assertEq(
            authorization.policyId,
            policyId
        );

        assertEq(
            authorization.policyHash,
            policyHash
        );

        assertEq(
            authorization.policyVersion,
            1
        );

        assertEq(
            uint8(authorization.decision),
            uint8(AuthorizationRegistry.Decision.APPROVE)
        );

        assertEq(
            authorization.authorizer,
            authorizer
        );
    }

    function testUnauthorizedAddressCannotRecordAuthorization() public {
        vm.prank(outsider);

        vm.expectRevert(
            AuthorizationRegistry.Unauthorized.selector
        );

        authorizationRegistry.recordAuthorization(
            authorizationId,
            transactionHash,
            evidenceHash,
            policyId,
            policyHash,
            1,
            AuthorizationRegistry.Decision.APPROVE,
            uint64(block.timestamp + 1 hours)
        );
    }

    function testDuplicateAuthorizationIdIsRejected() public {
        vm.startPrank(authorizer);

        authorizationRegistry.recordAuthorization(
            authorizationId,
            transactionHash,
            evidenceHash,
            policyId,
            policyHash,
            1,
            AuthorizationRegistry.Decision.APPROVE,
            uint64(block.timestamp + 1 hours)
        );

        vm.expectRevert(
            AuthorizationRegistry.AuthorizationAlreadyExists.selector
        );

        authorizationRegistry.recordAuthorization(
            authorizationId,
            keccak256("transaction-002"),
            evidenceHash,
            policyId,
            policyHash,
            1,
            AuthorizationRegistry.Decision.APPROVE,
            uint64(block.timestamp + 1 hours)
        );

        vm.stopPrank();
    }

    function testInactivePolicyBlocksAuthorization() public {
        vm.prank(owner);

        policyRegistry.setPolicyStatus(
            policyId,
            false
        );

        vm.prank(authorizer);

        vm.expectRevert(
            AuthorizationRegistry.PolicyInactive.selector
        );

        authorizationRegistry.recordAuthorization(
            authorizationId,
            transactionHash,
            evidenceHash,
            policyId,
            policyHash,
            1,
            AuthorizationRegistry.Decision.APPROVE,
            uint64(block.timestamp + 1 hours)
        );
    }

    function testExpiredAuthorizationCannotBeRecorded() public {
        vm.prank(authorizer);

        vm.expectRevert(
            AuthorizationRegistry.InvalidExpiry.selector
        );

        authorizationRegistry.recordAuthorization(
            authorizationId,
            transactionHash,
            evidenceHash,
            policyId,
            policyHash,
            1,
            AuthorizationRegistry.Decision.APPROVE,
            uint64(block.timestamp)
        );
    }

    function testApprovalIsValidWhilePolicyActiveAndNotExpired() public {
        vm.prank(authorizer);

        authorizationRegistry.recordAuthorization(
            authorizationId,
            transactionHash,
            evidenceHash,
            policyId,
            policyHash,
            1,
            AuthorizationRegistry.Decision.APPROVE,
            uint64(block.timestamp + 1 hours)
        );

        bool valid =
            authorizationRegistry.isAuthorizationValid(
                authorizationId,
                transactionHash
            );

        assertTrue(valid);
    }

    function testDenialIsNeverValidForSettlement() public {
        vm.prank(authorizer);

        authorizationRegistry.recordAuthorization(
            authorizationId,
            transactionHash,
            evidenceHash,
            policyId,
            policyHash,
            1,
            AuthorizationRegistry.Decision.DENY,
            uint64(block.timestamp + 1 hours)
        );

        bool valid =
            authorizationRegistry.isAuthorizationValid(
                authorizationId,
                transactionHash
            );

        assertFalse(valid);
    }

    function testApprovalBecomesInvalidAfterExpiry() public {
        vm.prank(authorizer);

        authorizationRegistry.recordAuthorization(
            authorizationId,
            transactionHash,
            evidenceHash,
            policyId,
            policyHash,
            1,
            AuthorizationRegistry.Decision.APPROVE,
            uint64(block.timestamp + 1 hours)
        );

        vm.warp(
            block.timestamp + 2 hours
        );

        bool valid =
            authorizationRegistry.isAuthorizationValid(
                authorizationId,
                transactionHash
            );

        assertFalse(valid);
    }

    function testApprovalBecomesInvalidIfPolicyIsDeactivated() public {
        vm.prank(authorizer);

        authorizationRegistry.recordAuthorization(
            authorizationId,
            transactionHash,
            evidenceHash,
            policyId,
            policyHash,
            1,
            AuthorizationRegistry.Decision.APPROVE,
            uint64(block.timestamp + 1 hours)
        );

        vm.prank(owner);

        policyRegistry.setPolicyStatus(
            policyId,
            false
        );

        bool valid =
            authorizationRegistry.isAuthorizationValid(
                authorizationId,
                transactionHash
            );

        assertFalse(valid);
    }

    function testWrongTransactionHashInvalidatesAuthorization() public {
        vm.prank(authorizer);

        authorizationRegistry.recordAuthorization(
            authorizationId,
            transactionHash,
            evidenceHash,
            policyId,
            policyHash,
            1,
            AuthorizationRegistry.Decision.APPROVE,
            uint64(block.timestamp + 1 hours)
        );

        bool valid =
            authorizationRegistry.isAuthorizationValid(
                authorizationId,
                keccak256("wrong-transaction")
            );

        assertFalse(valid);
    }
}