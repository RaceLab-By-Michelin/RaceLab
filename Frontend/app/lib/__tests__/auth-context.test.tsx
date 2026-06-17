import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/auth', () => ({
	authApi: {
		hasToken: vi.fn(),
		me: vi.fn(),
	},
}));

import { authApi } from '../api/auth';
import { AuthProvider, useAuth } from '../auth-context';

function Probe() {
	const { user, loading } = useAuth();
	return (
		<div>
			<span data-testid="loading">{String(loading)}</span>
			<span data-testid="user">{user ? user.email : 'none'}</span>
		</div>
	);
}

describe('AuthProvider / useAuth connection wiring', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('skips the network call entirely when no token is stored', async () => {
		(authApi.hasToken as ReturnType<typeof vi.fn>).mockReturnValue(false);

		render(
			<AuthProvider>
				<Probe />
			</AuthProvider>,
		);

		await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
		expect(screen.getByTestId('user').textContent).toBe('none');
		expect(authApi.me).not.toHaveBeenCalled();
	});

	it('fetches /auth/me and sets the user when a token is present', async () => {
		(authApi.hasToken as ReturnType<typeof vi.fn>).mockReturnValue(true);
		(authApi.me as ReturnType<typeof vi.fn>).mockResolvedValue({ email: 'alex@example.com' });

		render(
			<AuthProvider>
				<Probe />
			</AuthProvider>,
		);

		await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
		expect(authApi.me).toHaveBeenCalledTimes(1);
		expect(screen.getByTestId('user').textContent).toBe('alex@example.com');
	});

	it('sets user to null when /auth/me rejects (invalid/expired token)', async () => {
		(authApi.hasToken as ReturnType<typeof vi.fn>).mockReturnValue(true);
		(authApi.me as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('401'));

		render(
			<AuthProvider>
				<Probe />
			</AuthProvider>,
		);

		await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
		expect(screen.getByTestId('user').textContent).toBe('none');
	});

	it('useAuth throws when used outside an AuthProvider', () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(() => render(<Probe />)).toThrow();
		consoleError.mockRestore();
	});
});
