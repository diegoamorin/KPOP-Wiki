import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
const nav = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => nav }));
import { WikiEditor } from "@/components/wiki-editor";
import { OperationForm } from "@/components/workbench";
import { operations } from "@/lib/api/contract";
const server = setupServer();
beforeAll(() => server.listen());
afterAll(() => server.close());
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
const pageId = "8293178f-19af-4c15-95ad-9664239455aa";
const original = {
  kind: "identity",
  fields: { displayName: "RM", type: "person", bio: "Biografía original" },
  components: {
    aliases: { stable: { alias: "Namjoon", sortOrder: 0 } },
    futureComponent: { stable: { unrecognized: "keep" } },
  },
};
function renderEditor() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <WikiEditor pageId={pageId} graph={[]} />
    </QueryClientProvider>,
  );
}
function handlers(verified = true) {
  return [
    http.get("*/api/gateway/auth/me", () =>
      HttpResponse.json({
        id: "user",
        username: "army",
        emailVerified: verified,
      }),
    ),
    http.get("*/api/gateway/wiki/pages/" + pageId, () =>
      HttpResponse.json({
        data: {
          type: "wiki-pages",
          id: pageId,
          attributes: { currentRevisionId: "rev-2", snapshot: original },
        },
      }),
    ),
    http.get("*/api/gateway/wiki/revisions/rev-2", () =>
      HttpResponse.json({
        data: {
          type: "wiki-revisions",
          id: "rev-2",
          attributes: {
            sources: [
              { sourceId: "existing-source", targetPath: "fields/bio" },
            ],
          },
        },
      }),
    ),
  ];
}
describe("contribuciones y privacidad", () => {
  it("requiere correo verificado sin ofrecer publicación directa", async () => {
    server.use(...handlers(false));
    renderEditor();
    expect(
      await screen.findByText(/Verifica tu correo antes de contribuir/),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Guardar propuesta" }),
    ).not.toBeInTheDocument();
  });
  it("un guardado rechazado conserva texto, créditos y claves estables", async () => {
    let sent: unknown;
    server.use(
      ...handlers(),
      http.post("*/api/gateway/wiki/changesets", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(
          { errors: [{ detail: "Conflicto de revisión" }] },
          { status: 409 },
        );
      }),
    );
    renderEditor();
    const bio = await screen.findByLabelText("Biografía");
    await userEvent.clear(bio);
    await userEvent.type(bio, "Mi corrección con fuente");
    await userEvent.type(
      screen.getByLabelText("Resumen de los cambios"),
      "Corregir biografía",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar propuesta" }),
    );
    // Unknown snapshot components must be preserved even when not editable by the current schema.
    expect(bio).toHaveValue("Mi corrección con fuente");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Conflicto de revisión",
    );
    expect(sent).toBeDefined();
    const body = sent as {
      data: {
        attributes: {
          items: {
            snapshot: typeof original;
            baseRevisionId: string;
            sources: { sourceId: string; targetPath: string }[];
          }[];
        };
      };
    };
    expect(body.data.attributes.items[0].snapshot.components).toEqual(
      original.components,
    );
    expect(body.data.attributes.items[0].baseRevisionId).toBe("rev-2");
    expect(body.data.attributes.items[0].sources).toContainEqual({
      sourceId: "existing-source",
      targetPath: "fields/bio",
    });
    expect(nav.push).not.toHaveBeenCalled();
  });
  it("crear una grabación guarda un borrador completo y abre la propuesta", async () => {
    let sent: unknown;
    server.use(
      ...handlers(),
      http.post("*/api/gateway/wiki/changesets", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({
          data: {
            type: "wiki-changesets",
            id: "new-proposal",
            attributes: { status: "draft", draftVersion: 1 },
          },
        });
      }),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <WikiEditor graph={[]} />
      </QueryClientProvider>,
    );
    await userEvent.type(
      await screen.findByRole("textbox", { name: "Título *" }),
      "Nueva grabación",
    );
    await userEvent.type(
      screen.getByLabelText("Resumen de los cambios"),
      "Documentar una grabación con créditos verificables",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar propuesta" }),
    );
    await screen.findByRole("button", { name: "Guardar propuesta" });
    expect(sent).toMatchObject({
      data: {
        type: "wiki-changesets",
        attributes: {
          items: [
            {
              operation: "create",
              snapshot: {
                kind: "recording",
                fields: { title: "Nueva grabación", isExplicit: false },
                components: {},
              },
            },
          ],
        },
      },
    });
    expect(nav.push).toHaveBeenCalledWith("/wiki/propuestas/new-proposal");
  });
  it("reintentar un envío conserva la clave de idempotencia y no anuncia publicación", async () => {
    const keys: (string | null)[] = [];
    const bodies: unknown[] = [];
    server.use(
      http.post(
        "*/api/gateway/wiki/changesets/proposal/submit",
        async ({ request }) => {
          keys.push(request.headers.get("idempotency-key"));
          bodies.push(await request.json());
          return keys.length === 1
            ? HttpResponse.json(
                {
                  errors: [{ detail: "Servicio temporalmente no disponible" }],
                },
                { status: 503 },
              )
            : HttpResponse.json({
                changesetId: "proposal",
                status: "submitted",
                versionId: "version-2",
              });
        },
      ),
    );
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
      op = operations.find(
        (o) => o.path === "/api/wiki/changesets/{id}/submit",
      )!;
    render(
      <QueryClientProvider client={client}>
        <OperationForm
          operation={op}
          initialParams={{ id: "proposal" }}
          initialBody={{ expectedDraftVersion: 2 }}
        />
      </QueryClientProvider>,
    );
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(
      screen.getByRole("button", { name: "Enviar propuesta" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Servicio temporalmente no disponible",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Enviar propuesta" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "La API ha confirmado la operación.",
    );
    expect(keys[0]).toBeTruthy();
    expect(keys[0]).toBe(keys[1]);
    expect(bodies).toEqual([
      { expectedDraftVersion: 2 },
      { expectedDraftVersion: 2 },
    ]);
    expect(screen.queryByText("Publicado")).not.toBeInTheDocument();
  });
});
