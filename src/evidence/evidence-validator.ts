import type {
  EvidenceBundle,
  EvidenceRecord,
  EvidenceSource,
  EvidenceValidationResult,
} from "../types/evidence";

function isExpired(
  record: EvidenceRecord,
  evaluatedAt: number
): boolean {
  return (
    record.expiresAt !== undefined &&
    record.expiresAt <= evaluatedAt
  );
}

function collectExpiredEvidenceIds(
  records: readonly EvidenceRecord[],
  evaluatedAt: number
): string[] {
  return records
    .filter((record) => isExpired(record, evaluatedAt))
    .map((record) => record.id);
}

function collectMissingSources(
  records: readonly EvidenceRecord[],
  requiredSources: readonly EvidenceSource[],
  evaluatedAt: number
): EvidenceSource[] {
  const activeSources = new Set(
    records
      .filter((record) => !isExpired(record, evaluatedAt))
      .map((record) => record.source)
  );

  return requiredSources.filter(
    (source) => !activeSources.has(source)
  );
}

export function validateEvidence(
  bundle: EvidenceBundle,
  requiredSources: readonly EvidenceSource[],
  evaluatedAt: number
): EvidenceValidationResult {
  const expiredEvidenceIds = collectExpiredEvidenceIds(
    bundle.records,
    evaluatedAt
  );

  const missingEvidenceSources = collectMissingSources(
    bundle.records,
    requiredSources,
    evaluatedAt
  );

  return {
    valid:
      expiredEvidenceIds.length === 0 &&
      missingEvidenceSources.length === 0,
    expiredEvidenceIds,
    missingEvidenceSources,
  };
}