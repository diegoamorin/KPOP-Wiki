import { describe, expect, it, vi } from "vitest";
import { refreshCoordinator } from "@/lib/api/refresh";
const pair = {
  accessToken: "next",
  refreshToken: "rotated",
  expiresIn: 900,
  tokenType: "Bearer",
};
describe("rotación de sesión", () => {
  it("renueva una sola vez ante peticiones concurrentes y cookies anteriores", async () => {
    const refresh = vi.fn(async () => pair),
      renew = refreshCoordinator(refresh);
    const results = await Promise.all([
      renew("old"),
      renew("old"),
      renew("old"),
    ]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(results).toEqual([pair, pair, pair]);
    await renew("old");
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it("no comparte sesiones de usuarios diferentes", async () => {
    const refresh = vi.fn(async () => pair),
      renew = refreshCoordinator(refresh);
    await Promise.all([renew("army-a"), renew("army-b")]);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
  it("no memoriza fallos ni tokens expirados", async () => {
    const refresh = vi
        .fn()
        .mockRejectedValueOnce(new Error("Revocado"))
        .mockResolvedValue(pair),
      renew = refreshCoordinator(refresh);
    await expect(renew("old")).rejects.toThrow("Revocado");
    expect(await renew("old")).toEqual(pair);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
