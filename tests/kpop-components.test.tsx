import "./calendar-navigation";
import { it, expect } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Calendar } from "@/components/calendar";
import { Tours } from "@/components/tours";
import { CatalogCharts } from "@/components/catalog-charts";
import { graph } from "./fixtures/catalog.mjs";

it("muestra desbordamiento, navega al resumen y conserva filtros en URL", async () => {
  render(<Calendar graph={graph} today="2026-10-15" />);
  const day = screen.getByRole("link", {
    name: "15: 5 entradas, ver resumen del día",
  });
  expect(day).toHaveAttribute(
    "href",
    expect.stringContaining("/calendario/2026-10-15?"),
  );
  expect(within(day).getByText("+3 más")).toBeInTheDocument();
  expect(day.querySelectorAll("a")).toHaveLength(0);
  await userEvent.selectOptions(
    screen.getByLabelText("Tipo de entrada"),
    "birthdays",
  );
  expect(window.location.search).toContain("category=birthdays");
  await userEvent.selectOptions(
    screen.getByLabelText("Filtrar por artista"),
    "aurora",
  );
  expect(
    screen.getByRole("link", { name: "15: Cumpleaños de Luna" }),
  ).toHaveAttribute("href", "/artistas/luna");
  await userEvent.click(screen.getByRole("button", { name: "Ver agenda" }));
  expect(window.location.search).toContain("view=agenda");
  expect(screen.getByRole("button", { name: "Ver mes" })).toBeInTheDocument();
});
it("restaura consultas y ofrece ver todo el día con enlaces individuales", () => {
  act(() =>
    window.history.replaceState(
      null,
      "",
      "/calendario/2026-10-15?category=birthdays&artist=aurora&view=agenda&month=2026-10",
    ),
  );
  render(<Calendar graph={graph} today="2026-10-15" day="2026-10-15" />);
  expect(screen.getByText("1 entrada para este día")).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /Cumpleaños de Luna/ }),
  ).toHaveAttribute("href", "/artistas/luna");
  expect(
    screen.getByRole("link", { name: "← Volver al calendario" }),
  ).toHaveAttribute("href", expect.stringContaining("view=agenda"));
  expect(screen.getByRole("link", { name: "Ver todo el día" })).toHaveAttribute(
    "href",
    expect.stringContaining("category=all&artist=all"),
  );
});
it("muestra vacío y fechas incompletas sin crear enlaces de día", () => {
  render(<Calendar graph={graph} today="2026-01-01" />);
  expect(screen.getByText(/No hay entradas este mes/)).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Fecha por confirmar" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Soon/ })).toHaveAttribute(
    "href",
    "/discografia/soon",
  );
});
it("alterna tours y filtra estados sin activar tours históricos", async () => {
  render(<Tours graph={graph} today="2026-10-15" />);
  await userEvent.click(
    screen.getByRole("button", { name: "Línea de tiempo" }),
  );
  expect(
    screen.getByRole("region", { name: "Línea de tiempo de tours" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Fechas incompletas o por confirmar" }),
  ).toBeInTheDocument();
  await userEvent.selectOptions(
    screen.getByLabelText("Estado del tour"),
    "in_progress",
  );
  expect(screen.queryByText("First Era Tour")).not.toBeInTheDocument();
  expect(screen.getByText(/1 tours/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Tarjetas" }));
  expect(screen.getByRole("button", { name: "Tarjetas" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
it("muestra tablas accesibles y estadísticas vacías según artista", async () => {
  render(<CatalogCharts graph={graph} />);
  await userEvent.click(screen.getByText("Ver tabla de lanzamientos"));
  expect(
    screen.getByRole("table", {
      name: "Lanzamientos registrados por año y tipo",
    }),
  ).toBeVisible();
  await userEvent.selectOptions(
    screen.getByLabelText("Artista de las estadísticas"),
    "orbit",
  );
  expect(
    screen.getByText("No hay lanzamientos con año registrado."),
  ).toBeInTheDocument();
});
