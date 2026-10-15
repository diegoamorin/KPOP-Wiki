import fs from "node:fs";
const spec = JSON.parse(fs.readFileSync("openapi.json", "utf8"));
function resolve(s, depth = 0) {
  if (!s || depth > 22) return {};
  if (s.$ref)
    return resolve(
      spec.components.schemas[s.$ref.split("/").at(-1)],
      depth + 1,
    );
  const out = { ...s };
  if (s.properties)
    out.properties = Object.fromEntries(
      Object.entries(s.properties).map(([k, v]) => [k, resolve(v, depth + 1)]),
    );
  if (s.items) out.items = resolve(s.items, depth + 1);
  if (s.oneOf) out.oneOf = s.oneOf.map((v) => resolve(v, depth + 1));
  if (typeof s.additionalProperties === "object")
    out.additionalProperties = resolve(s.additionalProperties, depth + 1);
  return out;
}
function group(path) {
  if (/auth|\/users|user-identities/.test(path)) return "cuenta";
  if (/auth-sessions/.test(path)) return "cuenta";
  if (/artist-team/.test(path)) return "equipo-editorial";
  if (/watchlists|recording-likes|\/me\/wiki-notifications/.test(path))
    return "mi-espacio";
  if (/threads|comments/.test(path)) return "comunidad";
  if (
    /reports|policies|restrictions|moderator|audit|visibility|outbox|admin\/import/.test(
      path,
    )
  )
    return "administracion";
  if (/\/wiki\//.test(path)) return "wiki";
  return "catalogo";
}
const operations = Object.entries(spec.paths).flatMap(([path, methods]) =>
  Object.entries(methods)
    .filter(([method]) =>
      ["get", "post", "patch", "delete", "put"].includes(method),
    )
    .map(([method, op]) => {
      const entry = Object.entries(op.requestBody?.content || {})[0];
      return {
        id: op.operationId,
        path,
        method: method.toUpperCase(),
        summary: op.summary || "",
        protected: Boolean(op.security?.length),
        parameters: op.parameters || [],
        ...(entry
          ? { contentType: entry[0], body: resolve(entry[1].schema) }
          : {}),
        group: group(path),
      };
    }),
);
fs.mkdirSync("lib/api", { recursive: true });
fs.writeFileSync("lib/api/operations.json", JSON.stringify(operations));
fs.writeFileSync(
  "lib/api/field-schemas.json",
  JSON.stringify(
    Object.fromEntries(
      Object.entries(spec.components.schemas)
        .filter(([k]) =>
          /FieldsDto|^Identity_|^Recording_|^Release_|^Work_|^Event_|^Tour_/.test(
            k,
          ),
        )
        .map(([k, v]) => [k, resolve(v)]),
    ),
  ),
);
fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync(
  "docs/api-coverage.md",
  "# Cobertura de API\n\nGenerado desde openapi.json. Cada operación está disponible en el área indicada mediante formularios de contrato. Las pruebas de contrato comprueban registro, validación y encaminamiento; no equivalen a pruebas en vivo de todos los permisos.\n\n| Operación | Área | Verificación |\n|---|---|---|\n" +
    operations
      .map(
        (o) =>
          `| ${o.method} \`${o.path}\` | /${o.group === "catalogo" ? "explorar" : o.group === "administracion" ? "admin" : o.group} | tests/contract.test.ts; tests/gateway.test.ts |`,
      )
      .join("\n") +
    "\n",
);
console.log(`${operations.length} operaciones registradas`);
