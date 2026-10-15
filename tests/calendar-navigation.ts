import { beforeEach, vi } from "vitest";
vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  const subscribe = (listener: () => void) => {
    window.addEventListener("test-url", listener);
    return () => window.removeEventListener("test-url", listener);
  };
  return {
    usePathname: () => window.location.pathname,
    useSearchParams: () =>
      new URLSearchParams(
        useSyncExternalStore(subscribe, () => window.location.search),
      ),
  };
});
const replace = window.history.replaceState.bind(window.history);
beforeEach(() => {
  replace(null, "", "/calendario");
  vi.spyOn(window.history, "replaceState").mockImplementation(
    (data, unused, url) => {
      replace(data, unused, url);
      window.dispatchEvent(new Event("test-url"));
    },
  );
});
