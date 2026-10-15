import type { TokenPair } from "./types";
// Single-instance coordinator. Keep the result briefly for requests carrying the previous cookie.
export function refreshCoordinator(
  refresh: (token: string) => Promise<TokenPair>,
  retentionMs = 30000,
) {
  const pending = new Map<
    string,
    { promise: Promise<TokenPair>; until: number }
  >();
  return (token: string): Promise<TokenPair> => {
    const now = Date.now();
    for (const [key, entry] of pending)
      if (entry.until < now) pending.delete(key);
    const existing = pending.get(token);
    if (existing) return existing.promise;
    const promise = refresh(token).catch((error) => {
      pending.delete(token);
      throw error;
    });
    pending.set(token, { promise, until: now + retentionMs });
    return promise;
  };
}
