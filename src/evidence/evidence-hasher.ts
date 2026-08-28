import {
  AbiCoder,
  keccak256,
} from "ethers";

import type {
  EvidenceBundle,
  EvidenceRecord,
} from "../types/evidence";

export type EvidenceHash = `0x${string}`;

const abiCoder = AbiCoder.defaultAbiCoder();

function normalizeAttributes(
  attributes: EvidenceRecord["attributes"]
): string {
  const entries = Object.entries(attributes).sort(
    ([left], [right]) => left.localeCompare(right)
  );

  return JSON.stringify(
    Object.fromEntries(entries)
  );
}

function hashEvidenceRecord(
  record: EvidenceRecord
): EvidenceHash {
  const encoded = abiCoder.encode(
    [
      "string",
      "string",
      "string",
      "uint256",
      "uint256",
      "string",
      "bytes32",
    ],
    [
      record.id,
      record.source,
      record.subject,
      record.collectedAt,
      record.expiresAt ?? 0,
      normalizeAttributes(record.attributes),
      record.hash,
    ]
  );

  return keccak256(encoded) as EvidenceHash;
}

export function hashEvidenceBundle(
  bundle: EvidenceBundle
): EvidenceHash {
  const recordHashes = bundle.records
    .map(hashEvidenceRecord)
    .sort();

  const encoded = abiCoder.encode(
    [
      "bytes32",
      "uint256",
      "bytes32[]",
    ],
    [
      bundle.transactionHash,
      bundle.assembledAt,
      recordHashes,
    ]
  );

  return keccak256(encoded) as EvidenceHash;
}