# Gletta Policy Orchestrator

**Policy orchestration and transaction authorization infrastructure for regulated digital-asset workflows.**

Gletta evaluates structured policy rules against transaction context and compliance evidence off-chain, produces deterministic evidence commitments, and anchors policy state and transaction-bound authorization decisions on-chain.

The architecture separates high-frequency policy evaluation from the minimal state that benefits from public, tamper-evident verification.

**Ethereum Sepolia deployment:** live and source-verified  
**Test suite:** 85 passing tests across TypeScript and Solidity  
**Integration:** ethers v6 → EVM → Solidity tested end-to-end

---

## Verified Sepolia Deployment

| Contract | Address | Verification |
| --- | --- | --- |
| `PolicyRegistry` | [`0xB6B2e04805f942Fd30554b3dbc600d02dc7668eA`](https://sepolia.etherscan.io/address/0xb6b2e04805f942fd30554b3dbc600d02dc7668ea) | Verified |
| `AuthorizationRegistry` | [`0xbE18e464B9b655B73bCa30aE8F87933199Af0242`](https://sepolia.etherscan.io/address/0xbe18e464b9b655b73bca30ae8f87933199af0242) | Verified |

A transaction-bound `APPROVE` authorization has been recorded through the deployed authorization registry:

[View the authorization transaction on Sepolia Etherscan](https://sepolia.etherscan.io/tx/0x9a35894fbe4b7ff598c5d77574e9e5fe9a3b9b9f1ec97c3593cc54113d3df92f)

The authorization was subsequently queried through `isAuthorizationValid(...)` and returned `true`.

Full deployment details are available in [`docs/DEPLOYMENTS.md`](docs/DEPLOYMENTS.md).

---

## Why Gletta

Digital-asset transaction controls frequently depend on information that does not belong on-chain:

- KYC and counterparty status
- AML controls
- sanctions screening
- wallet-risk signals
- jurisdictional restrictions
- transaction-specific risk thresholds
- policy versions and operational controls

Putting this data directly on-chain creates privacy, cost and maintainability problems. Keeping the entire authorization process off-chain, however, weakens independent verification and makes policy provenance harder to establish.

Gletta uses a hybrid model.

Rich evidence and policy evaluation remain off-chain. Deterministic cryptographic commitments, policy references and transaction-specific authorization state cross the trust boundary into an EVM registry.

This provides a verifiable link between:

`transaction → evidence → policy → decision → authorization`

without publishing the underlying compliance dataset.

---

## Architecture

```text
                    External Compliance Evidence
                              │
                              ▼
                    ┌───────────────────┐
                    │ Evidence Validator│
                    └─────────┬─────────┘
                              │
                   invalid ───┴────────────► REVIEW
                              │
                              ▼
                    ┌───────────────────┐
                    │ Evidence Hasher   │
                    │ keccak256 / ABI   │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   Policy Engine   │
                    │ deterministic     │
                    │ rule evaluation   │
                    └─────────┬─────────┘
                              │
                       ┌──────┴──────┐
                       │             │
                       ▼             ▼
                     DENY         APPROVE
                       │             │
                       └──────┬──────┘
                              ▼
                  ┌───────────────────────┐
                  │ Authorization Mapper  │
                  └───────────┬───────────┘
                              ▼
                  ┌───────────────────────┐
                  │ ethers v6 Registry    │
                  │ Client                │
                  └───────────┬───────────┘
                              │
                     Off-chain / On-chain
                              │
                              ▼
                ┌───────────────────────────┐
                │   AuthorizationRegistry   │
                │         Solidity          │
                └─────────────┬─────────────┘
                              │
                              ▼
                ┌───────────────────────────┐
                │      PolicyRegistry       │
                │         Solidity          │
                └───────────────────────────┘
```

The design deliberately keeps policy execution and evidence processing outside the EVM while using Solidity registries for policy anchoring and authorization verification.

See [`docs/architecture.md`](docs/architecture.md) for the architectural rationale.

---

## Decision Model

Gletta exposes three decision states:

| Decision | Meaning | On-chain |
| --- | --- | --- |
| `APPROVE` | Evidence is valid and all required policy controls pass | Yes |
| `DENY` | Evidence is valid but one or more policy controls fail | Yes |
| `REVIEW` | Required evidence is missing or expired | No |

`REVIEW` is intentionally excluded from `AuthorizationRegistry`.

An incomplete evidence state is not equivalent to an affirmative authorization or a deterministic policy denial. It remains an off-chain operational state until the required evidence becomes available.

---

## Evidence Integrity

Gletta does not bind an authorization to a single evidence record.

Each evidence record is normalized and hashed. Record hashes are canonically ordered and incorporated into a bundle-level commitment using Ethereum-compatible ABI encoding and `keccak256`.

Conceptually:

```text
Evidence records
      │
      ├── KYC
      ├── AML
      ├── sanctions
      └── wallet screening
              │
              ▼
      normalized record data
              │
              ▼
       individual hashes
              │
              ▼
        canonical ordering
              │
              ▼
           ABI encode
              │
              ▼
          keccak256
              │
              ▼
      Evidence Bundle Hash
```

The resulting `bytes32` commitment is propagated into the policy decision and ultimately into the on-chain authorization.

Tests verify that:

- identical evidence produces the same commitment
- evidence record ordering does not affect the commitment
- evidence modification changes the commitment
- transaction binding changes the commitment
- bundle metadata changes the commitment
- the resulting hash is `bytes32` compatible

---

## Policy Evaluation

The off-chain policy engine evaluates typed rules against structured transaction and compliance context.

The engine separates:

- field resolution
- operator evaluation
- policy evaluation
- evidence validation
- evidence commitment
- orchestration

This keeps policy semantics independent from blockchain transport and contract persistence.

A valid evidence bundle proceeds to policy evaluation. Invalid or incomplete evidence is routed to `REVIEW` before policy authorization is attempted.

---

## On-Chain Policy Registry

`PolicyRegistry.sol` anchors the active policy reference used by authorization decisions.

A policy is identified by:

```solidity
bytes32 policyId;
bytes32 policyHash;
uint64 version;
bool active;
```

The registry supports:

- owner-controlled policy registration
- immutable policy identity after registration
- explicit activation/deactivation
- policy hash and version matching
- policy-state lookup

An authorization cannot be recorded unless its `(policyId, policyHash, version)` tuple is currently active.

The deployed Sepolia policy used for the end-to-end proof is:

```text
Policy ID:
0x8c58c8e4f125b33e8f7d4db88c9a61dc385dbfa519134e62d84f973c8538e2c1

Policy Hash:
0x22bb427620f67f9d707c9e5739b0a2ac4f8fb49e97d7110aac7dbead2d5c9b76

Version:
1
```

`isPolicyActive(...)` returns `true` for this policy on the deployed Sepolia registry.

---

## Transaction-Bound Authorization

`AuthorizationRegistry.sol` records an authorization against a specific transaction and evidence commitment.

Each authorization contains:

```solidity
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
```

An authorization is considered valid only when:

1. the authorization exists
2. the decision is `APPROVE`
3. the supplied transaction hash matches
4. the authorization has not expired
5. the referenced policy remains active

This means an approval is not a detached boolean. It remains bound to its transaction, evidence commitment, policy state, policy version and validity window.

---

## Revocation Semantics

Authorization validity is evaluated against current policy state.

If a referenced policy is deactivated, previously recorded approvals referencing that policy no longer satisfy `isAuthorizationValid(...)`.

This provides an explicit control point for invalidating authorization validity without rewriting historical authorization records.

The historical record remains on-chain while its current validity changes according to policy state.

---

## Authorization Boundary

Only authorized accounts can call `recordAuthorization(...)`.

The registry owner manages the authorizer set through:

```solidity
setAuthorizer(address authorizer, bool authorized)
```

The deploying account is initialized as the first authorizer.

The TypeScript authorization mapper also prevents `REVIEW` decisions from crossing the on-chain boundary and maps the domain decision model explicitly to the Solidity enum:

```text
DENY     → 0
APPROVE  → 1
REVIEW   → rejected before submission
```

---

## Cross-Layer Integration

Gletta includes an integration path against a real local EVM rather than relying exclusively on mocked contract calls.

The integration suite deploys the compiled Solidity contracts to Anvil and exercises them through the TypeScript ethers v6 client.

It verifies that:

- the deployer is recognized as an authorizer
- an active policy can support an authorization
- an `APPROVE` authorization is persisted on-chain
- the resulting authorization is recognized as valid
- the authorization cannot be reused for a different transaction hash

```text
TypeScript
    │
    ▼
AuthorizationRegistryClient
    │
    ▼
ethers v6
    │
    ▼
Anvil EVM
    │
    ├── PolicyRegistry.sol
    │
    └── AuthorizationRegistry.sol
```

This exercises the actual ABI and compiled contracts across the application boundary.

---

## Test Coverage

The repository contains **85 passing tests** across the off-chain and on-chain layers.

### TypeScript / Vitest — 54 tests

Coverage includes:

- field resolution
- rule operators
- policy evaluation
- evidence validation
- evidence expiry
- required evidence sources
- deterministic evidence hashing
- order-independent evidence commitments
- policy orchestration
- `APPROVE`, `DENY` and `REVIEW` routing
- Solidity decision mapping
- authorization payload construction
- ethers v6 contract integration
- transaction-bound authorization validation

### Solidity / Foundry — 31 tests

Coverage includes:

- policy registration
- policy activation state
- authorization recording
- authorization expiry
- duplicate authorization prevention
- inactive-policy rejection
- transaction binding
- authorizer access control
- ownership controls
- invalid inputs
- security invariants and negative paths

Current baseline:

```text
TypeScript / Vitest     54 passed
Solidity / Foundry      31 passed
---------------------------------
Total                   85 passed
Failures                 0
```

---

## Security Properties

The architecture enforces explicit authorization and policy invariants:

- only authorized accounts can record authorizations
- only the registry owner can manage authorizers
- only the policy owner can register or change policy status
- zero-value policy and authorization identifiers are rejected
- authorization identifiers cannot be reused
- expired authorizations are invalid
- `DENY` authorizations never validate as approvals
- transaction hashes are bound to individual authorizations
- inactive policies invalidate dependent authorization validity
- policy hash and version must match the active registry state
- `REVIEW` decisions cannot be persisted as final on-chain authorizations

Additional security considerations are documented in [`docs/threat-model.md`](docs/threat-model.md).

---

## Repository Structure

```text
gletta-policy-orchestrator/
├── contracts/
│   ├── AuthorizationRegistry.sol
│   ├── PolicyRegistry.sol
│   └── interfaces/
│       └── IPolicyRegistry.sol
├── docs/
│   ├── decisions/
│   ├── architecture.md
│   ├── DEPLOYMENTS.md
│   └── threat-model.md
├── script/
│   └── Deploy.s.sol
├── src/
│   ├── authorization/
│   ├── engine/
│   ├── evidence/
│   └── types/
├── test/
├── test-ts/
├── .env.example
├── foundry.toml
├── package.json
├── tsconfig.json
└── README.md
```

---

## Technology

### Smart Contracts

- Solidity `0.8.24`
- Foundry
- Anvil
- Ethereum Sepolia
- Etherscan source verification

### Off-Chain Engine

- TypeScript
- ethers v6
- Vitest
- deterministic `keccak256` evidence commitments
- ABI-compatible cross-layer data model

### Architecture

- hybrid off-chain/on-chain policy enforcement
- transaction-bound authorization
- policy version anchoring
- evidence commitments
- explicit review state
- revocable authorization validity through policy state

---

## Local Development

### Prerequisites

- Node.js
- npm
- Foundry

Install TypeScript dependencies:

```bash
npm install
```

Build the Solidity contracts:

```bash
forge build
```

Run Solidity tests:

```bash
forge test
```

Run TypeScript tests:

```bash
npx vitest run
```

Run the TypeScript compiler check:

```bash
npx tsc --noEmit
```

---

## Local EVM Integration

Start Anvil in a separate terminal:

```bash
anvil
```

Then run the contract-client integration test:

```bash
npx vitest run test-ts/authorization-registry-client.test.ts
```

The integration test deploys the real compiled registries to the local EVM and exercises them through ethers v6.

No Docker environment is required.

---

## Sepolia Deployment

Deployment configuration is provided through environment variables.

Create a local `.env` based on `.env.example`:

```text
SEPOLIA_RPC_URL=<your-sepolia-rpc-url>
PRIVATE_KEY=<your-deployer-private-key>
ETHERSCAN_API_KEY=<your-etherscan-api-key>
```

`.env` and deployment artifacts containing sensitive values are excluded from version control.

Never commit private keys or provider credentials.

The deployment script is located at:

```text
script/Deploy.s.sol
```

Deployment details and verified contract addresses are documented in [`docs/DEPLOYMENTS.md`](docs/DEPLOYMENTS.md).

---

## Design Scope

Gletta focuses on the policy-decision and authorization boundary.

The current implementation intentionally does not attempt to become:

- a KYC provider
- a sanctions data provider
- a wallet-screening provider
- an identity store
- a custody system
- a transaction execution engine

Those systems are modeled as upstream evidence sources or downstream consumers.

This keeps the orchestration layer focused on a narrower responsibility:

**determine whether sufficient evidence exists, evaluate the applicable policy, and produce a verifiable transaction-bound authorization decision.**

---

## Engineering Principles

**Minimize on-chain state.**  
Sensitive and high-volume evidence remains off-chain.

**Make authorization reproducible.**  
Evidence is committed deterministically and policy references are explicit.

**Separate uncertainty from denial.**  
Missing evidence routes to `REVIEW`; it is not silently treated as a deterministic policy failure.

**Bind approvals to context.**  
An authorization is tied to a transaction, evidence commitment, policy version and expiry.

**Preserve historical state while allowing operational revocation.**  
Policy deactivation affects current authorization validity without erasing historical authorization records.

**Keep the trust boundary explicit.**  
Only final `APPROVE` or `DENY` decisions cross into the authorization registry.

---

## Status

Core implementation is complete.

- Policy engine: operational
- Evidence validation: operational
- Deterministic evidence commitments: operational
- Policy orchestration: operational
- Solidity registries: operational
- ethers v6 contract client: operational
- Local EVM integration: passing
- Solidity test suite: passing
- TypeScript test suite: passing
- Ethereum Sepolia deployment: live
- Etherscan source verification: complete
- End-to-end authorization proof: confirmed

---

## License

MIT
