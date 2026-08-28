import { readFileSync } from "node:fs";

import {
  ContractFactory,
  JsonRpcProvider,
  type InterfaceAbi,
} from "ethers";

import {
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import {
  AuthorizationRegistryClient,
} from "../src/authorization/authorization-registry-client";

import type {
  AuthorizationRequest,
} from "../src/types/decision";

interface FoundryArtifact {
  abi: InterfaceAbi;
  bytecode: {
    object: string;
  };
}

function loadArtifact(
  path: string
): FoundryArtifact {
  return JSON.parse(
    readFileSync(path, "utf8")
  ) as FoundryArtifact;
}

const policyId =
  "0x8c58c8e4f125b33e8f7d4db88c9a61dc385dbfa519134e62d84f973c8538e2c1" as const;

const policyHash =
  "0x22bb427620f67f9d707c9e5739b0a2ac4f8fb49e97d7110aac7dbead2d5c9b76" as const;

const authorizationId =
  "0x1111111111111111111111111111111111111111111111111111111111111111" as const;

const transactionHash =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

const evidenceHash =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;

describe("AuthorizationRegistryClient integration", () => {
  const provider =
    new JsonRpcProvider("http://127.0.0.1:8545");

  let registryClient: AuthorizationRegistryClient;

  beforeAll(async () => {
    const signer = await provider.getSigner(0);

    const policyArtifact = loadArtifact(
      "out/PolicyRegistry.sol/PolicyRegistry.json"
    );

    const authorizationArtifact = loadArtifact(
      "out/AuthorizationRegistry.sol/AuthorizationRegistry.json"
    );

    const policyFactory = new ContractFactory(
      policyArtifact.abi,
      policyArtifact.bytecode.object,
      signer
    );

    const policyRegistry =
      await policyFactory.deploy();

    await policyRegistry.waitForDeployment();

    const policyRegistryAddress =
      await policyRegistry.getAddress();

    const registerPolicy =
      policyRegistry.getFunction(
        "registerPolicy"
      );

    const registrationTx =
      await registerPolicy(
        policyId,
        policyHash,
        1
      );

    await registrationTx.wait();

    const authorizationFactory =
      new ContractFactory(
        authorizationArtifact.abi,
        authorizationArtifact.bytecode.object,
        signer
      );

    const authorizationRegistry =
      await authorizationFactory.deploy(
        policyRegistryAddress
      );

    await authorizationRegistry.waitForDeployment();

    const authorizationRegistryAddress =
      await authorizationRegistry.getAddress();

    registryClient =
      new AuthorizationRegistryClient(
        authorizationRegistryAddress,
        signer
      );
  });

  it("recognizes the deployer as an authorized authorizer", async () => {
    const signer =
      await provider.getSigner(0);

    const address =
      await signer.getAddress();

    await expect(
      registryClient.isAuthorizer(address)
    ).resolves.toBe(true);
  });

  it("records an approved authorization on-chain", async () => {
    const latestBlock =
      await provider.getBlock("latest");

    if (latestBlock === null) {
      throw new Error(
        "Unable to read latest block"
      );
    }

    const request: AuthorizationRequest = {
      authorizationId,
      transactionHash,
      evidenceHash,
      policy: {
        id: policyId,
        hash: policyHash,
        version: 1,
      },
      decision: "approve",
      expiresAt:
        latestBlock.timestamp + 3600,
    };

    const submission =
      await registryClient.recordAuthorization(
        request
      );

    expect(submission.authorizationId).toBe(
      authorizationId
    );

    expect(submission.transactionHash).toBe(
      transactionHash
    );

    expect(submission.txHash).toMatch(
      /^0x[0-9a-f]{64}$/
    );
  });

  it("recognizes the recorded approval as valid", async () => {
    await expect(
      registryClient.isAuthorizationValid(
        authorizationId,
        transactionHash
      )
    ).resolves.toBe(true);
  });

  it("rejects reuse of the authorization for another transaction", async () => {
    const differentTransaction =
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" as const;

    await expect(
      registryClient.isAuthorizationValid(
        authorizationId,
        differentTransaction
      )
    ).resolves.toBe(false);
  });
});