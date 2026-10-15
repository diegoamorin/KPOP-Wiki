import type { Snapshot, Value } from "./api/types";
export function editCandidate(
  pageId: string,
  baseRevisionId: string | null,
  original: Snapshot,
  fields: Record<string, Value>,
) {
  const snapshot = structuredClone(original);
  snapshot.fields = { ...snapshot.fields, ...fields };
  return { pageId, operation: "update", baseRevisionId, snapshot };
}
