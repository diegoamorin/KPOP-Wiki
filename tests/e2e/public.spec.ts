import { test, expect } from "./fixtures";
import { graph } from "../fixtures/catalog.mjs";

test("discografía, pistas, colaboración y búsqueda global", async ({
  page,
}) => {
  await page.goto("/discografia");
  await page.getByRole("link", { name: /Glow.*Álbum/i }).click();
  await expect(
    page.getByRole("heading", { name: "Pistas", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Proponer una mejora/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Historial", exact: true }),
  ).toBeVisible();
  await page.goto("/buscar?q=Glow");
  await expect(
    page.getByRole("heading", { name: "Glow", exact: true }),
  ).toBeVisible();
});
test("registro, editor protegido y página inexistente", async ({ page }) => {
  await page.goto("/registro");
  await expect(
    page.getByRole("heading", { name: "Siempre hay lugar para ti." }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Correo electrónico", { exact: true }),
  ).toBeVisible();
  await page.goto("/wiki/nueva");
  await expect(
    page.getByRole("heading", { name: "Cada dato cuenta." }),
  ).toBeVisible();
  await page.goto("/ruta-que-no-existe");
  await expect(
    page.getByRole("heading", { name: "Esta historia aún no está aquí." }),
  ).toBeVisible();
});

test("portada KPOPWIKI y catálogo paginado de varios artistas", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/KPOPWIKI/);
  await expect(
    page.getByRole("heading", { name: "Tu universo K-pop." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: `${graph.filter((r) => r.type === "releases").length} Lanzamientos`,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "ORBIT", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Luna", exact: true }),
  ).toBeVisible();
  await page.getByText("Ver tabla de lanzamientos").click();
  await expect(
    page.getByRole("table", {
      name: "Lanzamientos registrados por año y tipo",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("día con varias entradas, detalles y regreso con filtros", async ({
  page,
}) => {
  await page.goto("/calendario?month=2026-10");
  await expect(
    page.getByRole("heading", { name: "Calendario", exact: true }),
  ).toBeVisible();
  const day = page.getByRole("link", {
    name: "15: 5 entradas, ver resumen del día",
  });
  await expect(day).toBeVisible();
  await day.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/calendario\/2026-10-15/);
  await expect(page.getByText("5 entradas para este día")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Tipo de entrada" })
    .selectOption("birthdays");
  await page
    .getByRole("combobox", { name: "Filtrar por artista" })
    .selectOption("aurora");
  await expect(page.getByText("1 entrada para este día")).toBeVisible();
  await page.getByRole("link", { name: "← Volver al calendario" }).click();
  await expect(page).toHaveURL(/\/calendario\?/);
  await expect(
    page.getByRole("heading", { name: "Calendario", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Tipo de entrada" }),
  ).toHaveValue("birthdays");
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Filtrar por artista" }),
  ).toHaveValue("aurora");
  await page.getByRole("link", { name: "15: Cumpleaños de Luna" }).click();
  await expect(page).toHaveURL("/artistas/luna");
  await expect(
    page.getByRole("heading", { name: "Canales oficiales de AURORA" }),
  ).toBeVisible();
});
test("evento único, agenda, cumpleaños bisiesto y fechas inválidas", async ({
  page,
}) => {
  await page.goto("/calendario?month=2026-10");
  await page.getByRole("link", { name: "20: Un solo concierto" }).click();
  await expect(page).toHaveURL("/eventos/solo");
  await page.goto("/calendario?month=2026-10");
  await page.getByRole("button", { name: "Ver agenda" }).click();
  await expect(page).toHaveURL(/view=agenda/);
  await page.getByRole("link", { name: /5 entradas/ }).click();
  await page.getByRole("link", { name: /Lanzamiento Glow/ }).click();
  await expect(page).toHaveURL("/discografia/glow");
  await page.goto("/calendario?month=2028-02&category=birthdays");
  await expect(
    page.getByRole("link", { name: "29: Cumpleaños de Leap" }),
  ).toBeVisible();
  await page.goto("/calendario/2025-02-29");
  await expect(
    page.getByRole("heading", { name: "Esta historia aún no está aquí." }),
  ).toBeVisible();
  await page.goto("/calendario/2026-01-01");
  await expect(page.getByText("0 entradas para este día")).toBeVisible();
});
test("rutas antiguas y fichas sin canales ajenos", async ({ page }) => {
  await page.goto("/integrantes/nova");
  await expect(page).toHaveURL("/artistas/nova");
  await expect(
    page.getByRole("heading", { name: "Nova", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Canales oficiales/ }),
  ).toHaveCount(0);
  await page.goto("/integrantes");
  await expect(page).toHaveURL("/artistas");
  await page.getByLabel("Filtrar por categoría").selectOption("organization");
  await expect(
    page.getByRole("heading", { name: "AURORA", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Luna", exact: true }),
  ).toHaveCount(0);
});
test("tours responsivos, filtros y línea de tiempo", async ({
  page,
  isMobile,
}) => {
  await page.goto("/tours");
  if (isMobile) await expect(page.locator(".tour-cards")).toBeVisible();
  else
    await expect(
      page.getByRole("region", { name: "Línea de tiempo de tours" }),
    ).toBeVisible();
  await page.getByRole("button", { name: "Línea de tiempo" }).click();
  await expect(
    page.getByRole("heading", { name: "Fechas incompletas o por confirmar" }),
  ).toBeVisible();
  await page.getByLabel("Estado del tour").selectOption("in_progress");
  await expect(page.locator(".tour-bar")).toHaveCount(1);
  await page.locator(".tour-bar").click();
  await expect(page).toHaveURL("/tours/active");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("calendario móvil sin desbordamiento y cambio de mes", async ({
  page,
  isMobile,
}) => {
  await page.goto("/calendario?month=2026-10");
  if (isMobile) await expect(page.getByText("+4 más")).toBeVisible();
  else await expect(page.getByText("+3 más")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Mes siguiente" }).click();
  await expect(page.getByLabel("Ir a un mes")).toHaveValue("2026-11");
  await page.getByRole("button", { name: "Mes anterior" }).click();
  await expect(page.getByLabel("Ir a un mes")).toHaveValue("2026-10");
});
