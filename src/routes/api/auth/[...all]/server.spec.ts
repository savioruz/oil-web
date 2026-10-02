import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fallback } from './+server';

describe('oil-web src/routes/api/auth/[...all]/+server.ts proxy', () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it('rewrites /api/auth/forget-password to /api/auth/request-password-reset', async () => {
		let forwardedUrl = '';
		globalThis.fetch = vi.fn().mockImplementation(async (targetUrl: string) => {
			forwardedUrl = targetUrl;
			return new Response(JSON.stringify({ status: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		});

		const request = new Request('http://localhost:5173/api/auth/forget-password', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: 'test@example.com' })
		});
		const url = new URL('http://localhost:5173/api/auth/forget-password');

		const response = await fallback({
			request,
			url,
			params: { all: 'forget-password' }
		} as any);

		expect(response.status).toBe(200);
		expect(forwardedUrl).toContain('/api/auth/request-password-reset');
	});

	it('preserves other auth paths like /api/auth/get-session', async () => {
		let forwardedUrl = '';
		globalThis.fetch = vi.fn().mockImplementation(async (targetUrl: string) => {
			forwardedUrl = targetUrl;
			return new Response(JSON.stringify({ session: null }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		});

		const request = new Request('http://localhost:5173/api/auth/get-session', {
			method: 'GET'
		});
		const url = new URL('http://localhost:5173/api/auth/get-session');

		const response = await fallback({
			request,
			url,
			params: { all: 'get-session' }
		} as any);

		expect(response.status).toBe(200);
		expect(forwardedUrl).toContain('/api/auth/get-session');
	});
});
