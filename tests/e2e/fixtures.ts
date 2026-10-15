import { test as base, expect } from "@playwright/test";
export { expect };
export const test = base.extend<{ runtimeErrors: string[] }>({
  runtimeErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await use(errors);
      expect(
        errors,
        "La navegación no debe producir errores de ejecución ni hidratación",
      ).toEqual([]);
    },
    { auto: true },
  ],
});
