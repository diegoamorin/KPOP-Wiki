import { describe, expect, it } from "vitest";
import spec from "@/openapi.json";
import { operations, operationFor, validate } from "@/lib/api/contract";
import { defaults } from "@/components/schema-form";
describe("registro exhaustivo de operaciones OpenAPI", () => {
  const expected = Object.entries(spec.paths).flatMap(([path, ops]) =>
    Object.entries(ops)
      .filter(([m]) => ["get", "post", "patch", "delete", "put"].includes(m))
      .map(([method]) => ({ path, method: method.toUpperCase() })),
  );
  it("cubre cada operación documentada sin duplicados", () => {
    expect(operations).toHaveLength(expected.length);
    expect(new Set(operations.map((o) => o.id)).size).toBe(expected.length);
  });
  it.each(expected)(
    "$method $path está permitida y tiene área de interfaz",
    ({ path, method }) => {
      const actual = path
        .replaceAll("{id}", "public-id")
        .replaceAll("{relationship}", "artists");
      const op = operationFor(method, actual);
      expect(op).toBeDefined();
      expect(op?.group).toMatch(
        /cuenta|wiki|catalogo|administracion|comunidad|mi-espacio|equipo-editorial/,
      );
    },
  );
  it("rechaza rutas arbitrarias y métodos no anunciados", () => {
    expect(operationFor("POST", "/api/artists")).toBeUndefined();
    expect(operationFor("GET", "/api/../secret")).toBeUndefined();
    expect(operationFor("GET", "/api/users/%2e%2e")).toBeUndefined();
  });
  it("valida contraseña y estructura antes de contactar al backend", () => {
    const op = operationFor("POST", "/api/auth/register")!;
    expect(
      validate(op.body!, {
        username: "army",
        displayName: "ARMY",
        email: "a@b.com",
        password: "short",
      }).join(),
    ).toContain("12");
  });
  it("preserva campos requeridos constantes al construir formularios", () => {
    const op = operationFor("POST", "/api/me/recording-likes")!;
    const body = defaults(op.body!);
    expect((body as { data: { type: string } }).data.type).toBe(
      "recording-likes",
    );
  });
});
