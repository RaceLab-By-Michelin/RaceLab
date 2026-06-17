import { expect, test } from "@playwright/test";
import { mockApi, seedAuth } from "./support/api-mocks";

test.describe("account workflows", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await seedAuth(page);
  });

  test("updates profile details", async ({ page }) => {
    await page.goto("/profile");

    await expect(page.getByRole("heading", { name: /mon profil/i })).toBeVisible();
    await expect(page.getByText("Alex Martin").filter({ visible: true }).first()).toBeVisible();

    await page.getByTitle("Modifier mes infos").filter({ visible: true }).first().click();
    await page.getByPlaceholder("Nom complet").fill("Alex Updated");
    await page.getByPlaceholder("Nom d'utilisateur").fill("alex-updated");
    await page.getByPlaceholder("Ville").fill("Paris");
    await page.getByRole("button", { name: /enregistrer/i }).first().click();

    await expect(page.getByText("Alex Updated").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("@alex-updated").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("Paris").filter({ visible: true }).first()).toBeVisible();
  });

  test("logs out from settings", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.getByRole("heading", { name: /param.tres/i })).toBeVisible();
    await expect(page.getByText(/Non connect./).filter({ visible: true }).first()).toBeVisible();

    await page.getByRole("button", { name: /se d.connecter/i }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: /connexion/i })).toBeVisible();
    await expect(page.evaluate(() => window.localStorage.getItem("mbt_auth_token"))).resolves.toBeNull();
  });
});
