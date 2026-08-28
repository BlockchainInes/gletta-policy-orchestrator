// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PolicyRegistry} from "../contracts/PolicyRegistry.sol";

contract PolicyRegistryTest is Test {
    PolicyRegistry internal registry;

    address internal owner = address(0xA11CE);
    address internal attacker = address(0xB0B);

    bytes32 internal policyId = keccak256("EU_PROFESSIONAL_INVESTOR");
    bytes32 internal policyHash = keccak256("policy-v1");

    function setUp() public {
        vm.prank(owner);
        registry = new PolicyRegistry();
    }

    function testOwnerIsSetOnDeployment() public view {
        assertEq(registry.owner(), owner);
    }

    function testOwnerCanRegisterPolicy() public {
        vm.prank(owner);

        registry.registerPolicy(
            policyId,
            policyHash,
            1
        );

        PolicyRegistry.Policy memory policy = registry.getPolicy(policyId);

        assertEq(policy.policyHash, policyHash);
        assertEq(policy.version, 1);
        assertTrue(policy.active);
    }

    function testUnauthorizedAddressCannotRegisterPolicy() public {
        vm.prank(attacker);

        vm.expectRevert(PolicyRegistry.Unauthorized.selector);

        registry.registerPolicy(
            policyId,
            policyHash,
            1
        );
    }

    function testDuplicatePolicyCannotBeRegistered() public {
        vm.startPrank(owner);

        registry.registerPolicy(
            policyId,
            policyHash,
            1
        );

        vm.expectRevert(PolicyRegistry.PolicyAlreadyExists.selector);

        registry.registerPolicy(
            policyId,
            keccak256("policy-v2"),
            2
        );

        vm.stopPrank();
    }

    function testOwnerCanDeactivatePolicy() public {
        vm.startPrank(owner);

        registry.registerPolicy(
            policyId,
            policyHash,
            1
        );

        registry.setPolicyStatus(
            policyId,
            false
        );

        vm.stopPrank();

        PolicyRegistry.Policy memory policy = registry.getPolicy(policyId);

        assertFalse(policy.active);
    }

    function testIsPolicyActiveReturnsTrueForMatchingPolicy() public {
        vm.prank(owner);

        registry.registerPolicy(
            policyId,
            policyHash,
            1
        );

        bool active = registry.isPolicyActive(
            policyId,
            policyHash,
            1
        );

        assertTrue(active);
    }

    function testIsPolicyActiveReturnsFalseForWrongHash() public {
        vm.prank(owner);

        registry.registerPolicy(
            policyId,
            policyHash,
            1
        );

        bool active = registry.isPolicyActive(
            policyId,
            keccak256("wrong-hash"),
            1
        );

        assertFalse(active);
    }

    function testIsPolicyActiveReturnsFalseAfterDeactivation() public {
        vm.startPrank(owner);

        registry.registerPolicy(
            policyId,
            policyHash,
            1
        );

        registry.setPolicyStatus(
            policyId,
            false
        );

        vm.stopPrank();

        bool active = registry.isPolicyActive(
            policyId,
            policyHash,
            1
        );

        assertFalse(active);
    }
}