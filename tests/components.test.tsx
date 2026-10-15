import "./calendar-navigation";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Calendar } from "@/components/calendar";
import { SchemaField } from "@/components/schema-form";
import { CatalogList } from "@/components/catalog-list";
import type { Resource } from "@/lib/api/types";
const historical: Resource = {
  type: "events",
  id: "opaque",
  attributes: {
    title: "Concierto histórico",
    status: "scheduled",
    startYear: 2017,
    startMonth: 2,
    startDay: 18,
  },
};
describe("interacciones visibles", () => {
  it("el calendario no coloca eventos históricos en el mes actual", async () => {
    render(<Calendar graph={[historical]} today="2026-10-13" />);
    expect(
      screen.queryByRole("link", { name: "Concierto histórico" }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /último mes/ }));
    expect(
      screen.getByRole("link", { name: /Concierto histórico/ }),
    ).toHaveAttribute("href", "/eventos/opaque");
  });
  it("permite filtrar próximos sin tratar lo histórico como vigente", async () => {
    render(
      <CatalogList
        resources={[historical]}
        graph={[historical]}
        today="2026-10-13"
      />,
    );
    await userEvent.selectOptions(
      screen.getByLabelText("Filtrar por categoría"),
      "upcoming",
    );
    expect(
      screen.getByText("No hay resultados para estos filtros."),
    ).toBeInTheDocument();
  });
  it("una fecha nula sigue sin dato hasta que la persona decida completarla", async () => {
    const change = vi.fn();
    render(
      <SchemaField
        name="releaseMonth"
        schema={{ type: "integer", nullable: true }}
        value={null}
        onChange={change}
      />,
    );
    expect(screen.getByText("Sin información confirmada")).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Completar" }));
    expect(change).toHaveBeenCalledWith(0);
  });
});
