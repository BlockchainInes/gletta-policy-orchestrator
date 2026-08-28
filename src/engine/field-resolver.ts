export type EvaluationData = Readonly<Record<string, unknown>>;

export function resolveField(
  data: EvaluationData,
  path: string
): unknown {
  if (path.length === 0) {
    return undefined;
  }

  const segments = path.split(".");
  let current: unknown = data;

  for (const segment of segments) {
    if (
      typeof current !== "object" ||
      current === null ||
      Array.isArray(current)
    ) {
      return undefined;
    }

    const record = current as Record<string, unknown>;

    if (!Object.prototype.hasOwnProperty.call(record, segment)) {
      return undefined;
    }

    current = record[segment];
  }

  return current;
}