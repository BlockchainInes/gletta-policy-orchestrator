// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";

import {PolicyRegistry} from "../contracts/PolicyRegistry.sol";
import {AuthorizationRegistry} from "../contracts/AuthorizationRegistry.sol";

contract Deploy is Script {
    function run()
        external
        returns (
            PolicyRegistry policyRegistry,
            AuthorizationRegistry authorizationRegistry
        )
    {
        uint256 deployerPrivateKey = vm.envUint(
            "PRIVATE_KEY"
        );

        vm.startBroadcast(deployerPrivateKey);

        policyRegistry = new PolicyRegistry();

        authorizationRegistry = new AuthorizationRegistry(
            address(policyRegistry)
        );

        vm.stopBroadcast();
    }
}