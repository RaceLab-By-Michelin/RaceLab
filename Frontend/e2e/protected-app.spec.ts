import { expect, test } from '@playwright/test';

import { mockApi, seedAuth } from './support/api-mocks';

test.describe('protected app shell', () => {
	test.beforeEach(async ({ page }) => {
		await mockApi(page);
		await seedAuth(page);
	});

	test('renders telemetry data from the API', async ({ page }) => {
		await page.goto('/telemetry');

		await expect(page.getByRole('heading', { name: /usure pr.dictive/i })).toBeVisible();
		await expect(page.getByText('Power Cup').filter({ visible: true }).first()).toBeVisible();
		await expect(page.getByText('Roue Avant').filter({ visible: true }).first()).toBeVisible();
		await expect(
			page
				.getByText(/Roue Arri.re/)
				.filter({ visible: true })
				.first(),
		).toBeVisible();
	});

	test('navigates across critical protected screens', async ({ page }) => {
		const screens = [
			{ nav: 'D.fis', url: /\/challenges$/, heading: /endurance challenges/i },
			{ nav: 'Coach', url: /\/coach$/, heading: /coach personnel/i },
			{ nav: 'Pneus', url: /\/tires$/, heading: /mes pneus/i },
			{ nav: 'Profil', url: /\/profile$/, heading: /mon profil/i },
			{ nav: 'R.glages', url: /\/settings$/, heading: /param.tres/i },
		];

		for (const screen of screens) {
			await page.goto('/telemetry');
			const appNav = page.getByRole('navigation', { name: /navigation principale/i });
			await expect(page.getByRole('heading', { name: /usure pr.dictive/i })).toBeVisible();
			await expect(
				appNav
					.getByRole('button', { name: /Donn.es/i })
					.filter({ visible: true })
					.first(),
			).toHaveAttribute('aria-current', 'page');

			const navButton = appNav
				.getByRole('button', { name: new RegExp(screen.nav, 'i') })
				.filter({ visible: true })
				.first();
			await navButton.evaluate((button: HTMLElement) => button.click());
			await expect(page).toHaveURL(screen.url);
			await expect(page.getByRole('heading', { name: screen.heading })).toBeVisible();
			await expect(navButton).toHaveAttribute('aria-current', 'page');
		}
	});
});
