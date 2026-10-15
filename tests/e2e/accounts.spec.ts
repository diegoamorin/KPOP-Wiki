import { test, expect } from "./fixtures";
// Live checks only authenticate, read and log out. They do not edit catalog content.
test.use({ trace: "off" });
test("sesiones y permisos de admin y editor permanecen aislados", async ({
  page,
}) => {
  test.skip(
    !process.env.BTS_TEST_ADMIN_PASSWORD ||
      !process.env.BTS_TEST_EDITOR_PASSWORD,
    "Credenciales proporcionadas solo por entorno.",
  );
  async function login(username: string, password: string) {
    await page.goto("/login");
    await page.getByLabel("Usuario o correo", { exact: true }).fill(username);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await expect(page).toHaveURL(/mi-espacio/);
  }
  await login(
    process.env.BTS_TEST_ADMIN_USERNAME || "bts_admin",
    process.env.BTS_TEST_ADMIN_PASSWORD!,
  );
  const admin = await page.request.get("/api/gateway/auth/me");
  expect(admin.status()).toBe(200);
  expect((await admin.json()).role).toBe("admin");
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Cuidar también es construir." }),
  ).toBeVisible();
  await page.goto("/cuenta");
  await page
    .getByRole("button", { name: "Acceso y sesiones", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/login/);
  await login(
    process.env.BTS_TEST_EDITOR_USERNAME || "bts_editor",
    process.env.BTS_TEST_EDITOR_PASSWORD!,
  );
  const editor = await page.request.get("/api/gateway/auth/me");
  expect(editor.status()).toBe(200);
  const user = await editor.json();
  expect(user.username).toBe("bts_editor");
  expect(user.role).toBe("user");
  const privateAdmin = await page.request.get("/api/gateway/wiki/admin/outbox");
  expect(privateAdmin.status()).toBe(403);
  await page.goto("/wiki/nueva");
  await expect(
    page.getByRole("button", { name: "Guardar propuesta", exact: true }),
  ).toBeVisible();
  await page.goto("/cuenta");
  await page
    .getByRole("button", { name: "Acceso y sesiones", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/login/);
});
