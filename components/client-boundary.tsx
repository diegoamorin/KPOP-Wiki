"use client";
import { useSyncExternalStore, type ReactNode } from "react";
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
// Private browser caches must never replace the server's loading markup during hydration.
export function ClientBoundary({ children }: { children: ReactNode }) {
  const hydrated = useSyncExternalStore(
    subscribe,
    clientSnapshot,
    serverSnapshot,
  );
  return hydrated ? (
    children
  ) : (
    <p className="notice" role="status">
      Preparando tu espacio…
    </p>
  );
}
