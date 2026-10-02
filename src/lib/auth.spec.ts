import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	requestForgotPassword,
	resetPassword,
	isTokenExpired,
	fetchWithAuth,
	setCachedToken,
	clearCachedToken
} from './auth';

describe('auth.ts password reset functions', () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.restoreAllMocks();
		clearCachedToken();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it('requestForgotPassword calls /api/auth/request-password-reset with email and resolved redirectTo', async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ status: true, message: 'Reset email sent' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		globalThis.fetch = mockFetch;

		const result = await requestForgotPassword('user@example.com', '/auth/login');

		expect(mockFetch).toHaveBeenCalledTimes(1);
		const [url, options] = mockFetch.mock.calls[0];
		expect(url).toContain('/api/auth/request-password-reset');
		expect(options.method).toBe('POST');
		expect(options.headers).toEqual({ 'Content-Type': 'application/json' });

		const body = JSON.parse(options.body);
		expect(body.email).toBe('user@example.com');
		expect(body.redirectTo).toContain('/auth/login');
		expect(result).toEqual({ status: true, message: 'Reset email sent' });
	});

	it('requestForgotPassword throws readable error when server returns error status', async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ error: { message: 'Too many requests' } }), {
				status: 429,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		globalThis.fetch = mockFetch;

		await expect(requestForgotPassword('user@example.com')).rejects.toThrow('Too many requests');
	});

	it('resetPassword calls /api/auth/reset-password with newPassword and token', async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ status: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		globalThis.fetch = mockFetch;

		const result = await resetPassword('NewPassword123!', 'valid-token-123');

		expect(mockFetch).toHaveBeenCalledTimes(1);
		const [url, options] = mockFetch.mock.calls[0];
		expect(url).toContain('/api/auth/reset-password');
		expect(options.method).toBe('POST');
		expect(options.headers).toEqual({ 'Content-Type': 'application/json' });

		const body = JSON.parse(options.body);
		expect(body.newPassword).toBe('NewPassword123!');
		expect(body.token).toBe('valid-token-123');
		expect(result).toEqual({ status: true });
	});

	it('resetPassword throws readable error when server returns invalid token', async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ message: 'Invalid token', code: 'INVALID_TOKEN' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		globalThis.fetch = mockFetch;

		await expect(resetPassword('NewPassword123!', 'bad-token')).rejects.toThrow('Invalid token');
	});

	it('isTokenExpired correctly detects expired and valid JWT expiration', () => {
		const futureExp = Math.floor(Date.now() / 1000) + 3600;
		const pastExp = Math.floor(Date.now() / 1000) - 3600;

		const createFakeJwt = (exp: number) => {
			const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
			const payload = btoa(JSON.stringify({ exp, sub: 'user-1' }));
			return `${header}.${payload}.signature`;
		};

		expect(isTokenExpired(createFakeJwt(futureExp))).toBe(false);
		expect(isTokenExpired(createFakeJwt(pastExp))).toBe(true);
		expect(isTokenExpired('malformed-token')).toBe(true);
	});

	it('fetchWithAuth injects bearer token and returns response', async () => {
		const validExp = Math.floor(Date.now() / 1000) + 3600;
		const fakeJwt = `header.${btoa(JSON.stringify({ exp: validExp, sub: 'user-1' }))}.sig`;
		setCachedToken(fakeJwt);

		const mockCustomFetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			})
		);

		const res = await fetchWithAuth('/api/test', {}, mockCustomFetch);
		expect(res.status).toBe(200);
		expect(mockCustomFetch).toHaveBeenCalledTimes(1);

		const [, callInit] = mockCustomFetch.mock.calls[0];
		const headers = new Headers(callInit.headers);
		expect(headers.get('Authorization')).toBe(`Bearer ${fakeJwt}`);
	});
});
