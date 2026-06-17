import { expect, test } from '@playwright/test';

import { completedUser, incompleteUser } from './fixtures/racelab-fixtures';
import { mockApi, seedAuth } from './support/api-mocks';

test.describe('authentication and onboarding', () => {
	test('redirects unauthenticated visitors from the app to login', async ({ page }) => {
		await mockApi(page, { user: null });

		await page.goto('/telemetry');

		await expect(page).toHaveURL(/\/login$/);
		await expect(page.getByRole('heading', { name: /connexion/i })).toBeVisible();
	});

	test('redirects completed authenticated users away from login', async ({ page }) => {
		await mockApi(page, { user: completedUser });
		await seedAuth(page);

		await page.goto('/login');

		await expect(page).toHaveURL(/\/telemetry$/);
		await expect(page.getByRole('heading', { name: /usure pr.dictive/i })).toBeVisible();
	});

	test('redirects incomplete authenticated users to onboarding', async ({ page }) => {
		await mockApi(page, { user: incompleteUser });
		await seedAuth(page);

		await page.goto('/telemetry');

		await expect(page).toHaveURL(/\/onboarding$/);
		await expect(page.getByRole('heading', { name: /configurez votre profil/i })).toBeVisible();
	});

	test('shows backend login errors', async ({ page }) => {
		await mockApi(page, { loginError: 'Email ou mot de passe incorrect.' });

		await page.goto('/login');
		await page.getByLabel('Email').fill('bad@example.com');
		await page.getByLabel('Mot de passe').fill('wrong-password');
		await page.getByRole('button', { name: /se connecter/i }).click();

		await expect(page.locator('form').getByText('Email ou mot de passe incorrect.')).toBeVisible();
		await expect(page).toHaveURL(/\/login$/);
	});

	test('logs in and lands on telemetry', async ({ page }) => {
		await mockApi(page);

		await page.goto('/login');
		await page.getByLabel('Email').fill('alex@example.com');
		await page.getByLabel('Mot de passe').fill('correct-password');
		await page.getByRole('button', { name: /se connecter/i }).click();

		await expect(page).toHaveURL(/\/telemetry$/);
		await expect(page.getByRole('heading', { name: /usure pr.dictive/i })).toBeVisible();
	});

	test('signs up, completes onboarding, and reaches telemetry', async ({ page }) => {
		await mockApi(page);

		await page.goto('/signup');
		await page.getByLabel('Nom').fill('New Rider');
		await page.getByLabel('Email').fill('new@example.com');
		await page.getByLabel('Mot de passe').fill('correct-password');
		await page.getByRole('button', { name: /cr.er mon compte/i }).click();

		await expect(page).toHaveURL(/\/onboarding$/);
		await page.getByPlaceholder('Lyon, France').fill('Lyon');
		await page.getByPlaceholder(/Trek/).fill('Canyon');
		await page.getByPlaceholder(/Domane/).fill('Endurace');
		await page.getByRole('button', { name: /terminer/i }).click();

		await expect(page).toHaveURL(/\/telemetry$/);
		await expect(page.getByRole('heading', { name: /usure pr.dictive/i })).toBeVisible();
	});
});
