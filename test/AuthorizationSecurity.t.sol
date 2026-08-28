// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PolicyRegistry} from "../contracts/PolicyRegistry.sol";
import {AuthorizationRegistry} from "../contracts/AuthorizationRegistry.sol";

contract AuthorizationSecurityTest is Test {
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

    function testCannotTransferPolicyRegistryOwnershipToZeroAddress() public {
        vm.prank(owner);

        vm.expectRevert(
            PolicyRegistry.Unauthorized.selector
        );

        policyRegistry.transferOwnership(
            address(0)
        );
    }

    function testCannotTransferAuthorizationRegistryOwnershipToZeroAddress() public {
        vm.prank(owner);

        vm.expectRevert(
            AuthorizationRegistry.ZeroAddress.selector
        );

        authorizationRegistry.transferOwnership(
            address(0)
        );
    }

    function testCannotConfigureZeroAddressAsAuthorizer() public {
        vm.prank(owner);

        vm.expectRevert(
            AuthorizationRegistry.ZeroAddress.selector
        );

        authorizationRegistry.setAuthorizer(
            address(0),
            true
        );
    }

    function testRevokedAuthorizerCannotRecordAuthorization() public {
        vm.prank(owner);

        authorizationRegistry.setAuthorizer(
            authorizer,
            false
        );

        vm.prank(authorizer);

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

    function testWrongPolicyHashCannotBeUsedForAuthorization() public {
        vm.prank(authorizer);

        vm.expectRevert(
            AuthorizationRegistry.PolicyInactive.selector
        );

        authorizationRegistry.recordAuthorization(
            authorizationId,
            transactionHash,
            evidenceHash,
            policyId,
            keccak256("tampered-policy"),
            1,
            AuthorizationRegistry.Decision.APPROVE,
            uint64(block.timestamp + 1 hours)
        );
    }

    function testWrongPolicyVersionCannotBeUsedForAuthorization() public {
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
            2,
            AuthorizationRegistry.Decision.APPROVE,
            uint64(block.timestamp + 1 hours)
        );
    }

    function testUnknownAuthorizationIsInvalid() public view {
        bool valid =
            authorizationRegistry.isAuthorizationValid(
                keccak256("unknown-authorization"),
                transactionHash
            );

        assertFalse(valid);
    }

    function testUnknownAuthorizationCannotBeRead() public {
        vm.expectRevert(
            AuthorizationRegistry.AuthorizationNotFound.selector
        );

        authorizationRegistry.getAuthorization(
            keccak256("unknown-authorization")
        );
    }

    function testAuthorizationCannotBeReusedForDifferentTransaction() public {
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
                keccak256("different-transaction")
            );

        assertFalse(valid);
    }

    function testExpiredAuthorizationRemainsInvalid() public {
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

        assertFalse(
            authorizationRegistry.isAuthorizationValid(
                authorizationId,
                transactionHash
            )
        );

        vm.warp(
            block.timestamp + 30 days
        );

        assertFalse(
            authorizationRegistry.isAuthorizationValid(
                authorizationId,
                transactionHash
            )
        );
    }

    function testExistingAuthorizationInvalidatedByPolicyDeactivation() public {
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

        assertTrue(
            authorizationRegistry.isAuthorizationValid(
                authorizationId,
                transactionHash
            )
        );

        vm.prank(owner);

        policyRegistry.setPolicyStatus(
            policyId,
            false
        );

        assertFalse(
            authorizationRegistry.isAuthorizationValid(
                authorizationId,
                transactionHash
            )
        );
    }

    function testOutsiderCannotChangeAuthorizerStatus() public {
        vm.prank(outsider);

        vm.expectRevert(
            AuthorizationRegistry.Unauthorized.selector
        );

        authorizationRegistry.setAuthorizer(
            outsider,
            true
        );
    }
}