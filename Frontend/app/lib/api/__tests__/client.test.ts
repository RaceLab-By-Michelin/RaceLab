import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { describe, it, expect, beforeEach, vi } from 'vitest';

function createLocalStorage(): Storage {
	const store = new Map<string, string>();

	return {
		get length() {
			return store.size;
		},
		clear: vi.fn(() => store.clear()),
		getItem: vi.fn((key: string) => store.get(key) ?? null),
		key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
		removeItem: vi.fn((key: string) => {
			store.delete(key);
		}),
		setItem: vi.fn((key: string, value: string) => {
			store.set(key, value);
		}),
	} as Storage;
}

describe('api client wiring', () => {
	beforeEach(() => {
		vi.resetModules();
		Object.defineProperty(window, 'localStorage', {
			configurable: true,
			value: createLocalStorage(),
		});
	});

	it('configures axios with the expected baseURL, headers and timeout', async () => {
		const { default: api } = await import('../client');
		expect(api.defaults.baseURL).toBe('http://localhost:8000');
		expect(api.defaults.headers['Content-Type']).toBe('application/json');
		expect(api.defaults.timeout).toBe(10000);
	});

	it('getAuthToken returns null when nothing stored', async () => {
		const { getAuthToken } = await import('../client');
		expect(getAuthToken()).toBeNull();
	});

	it('setAuthToken persists the token and getAuthToken reads it back', async () => {
		const { setAuthToken, getAuthToken } = await import('../client');
		setAuthToken('tok-123');
		expect(getAuthToken()).toBe('tok-123');
		expect(window.localStorage.getItem('mbt_auth_token')).toBe('tok-123');
	});

	it('clearAuthToken removes the stored token', async () => {
		const { setAuthToken, clearAuthToken, getAuthToken } = await import('../client');
		setAuthToken('tok-456');
		clearAuthToken();
		expect(getAuthToken()).toBeNull();
	});

	it('request interceptor injects Authorization header when a token is present', async () => {
		const { default: api, setAuthToken } = await import('../client');
		setAuthToken('my-secret-token');

		const requestHandler = api.interceptors.request.handlers?.[0]?.fulfilled;
		expect(requestHandler).toBeDefined();

		const config = await requestHandler!({
			headers: new AxiosHeaders(),
		} as InternalAxiosRequestConfig);
		expect(config.headers.Authorization).toBe('Bearer my-secret-token');
	});

	it('request interceptor does not set Authorization header when no token is present', async () => {
		const { default: api } = await import('../client');

		const requestHandler = api.interceptors.request.handlers?.[0]?.fulfilled;
		expect(requestHandler).toBeDefined();

		const config = await requestHandler!({
			headers: new AxiosHeaders(),
		} as InternalAxiosRequestConfig);
		expect(config.headers.Authorization).toBeUndefined();
	});

	it('response interceptor re-rejects errors instead of swallowing them', async () => {
		const { default: api } = await import('../client');
		const error = { response: { status: 500, data: { detail: 'boom' } } };
		const responseErrorHandler = api.interceptors.response.handlers?.[0]?.rejected;
		expect(responseErrorHandler).toBeDefined();

		await expect(responseErrorHandler!(error)).rejects.toBe(error);
	});
});
