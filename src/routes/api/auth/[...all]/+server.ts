import { PUBLIC_AUTH_URL } from '$env/static/public';
import type { RequestHandler } from './$types';

export const fallback: RequestHandler = async ({ request, url }) => {
	let targetPath = url.pathname + url.search;
	if (url.pathname === '/api/auth/forget-password') {
		targetPath = '/api/auth/request-password-reset' + url.search;
	}
	const targetUrl = new URL(targetPath, PUBLIC_AUTH_URL);

	const headers = new Headers();
	for (const [key, value] of request.headers.entries()) {
		if (key.toLowerCase() !== 'host') {
			headers.set(key, value);
		}
	}
	headers.set('host', new URL(PUBLIC_AUTH_URL).host);

	const cookieHeader = request.headers.get('cookie');
	if (cookieHeader) {
		let forwardCookie = cookieHeader;
		const secureMatch = cookieHeader.match(/(?:^|;\s*)__Secure-better-auth\.session_token=([^;]+)/);
		const regularMatch = cookieHeader.match(/(?:^|;\s*)better-auth\.session_token=([^;]+)/);
		if (regularMatch && !secureMatch) {
			forwardCookie = `${cookieHeader}; __Secure-better-auth.session_token=${regularMatch[1]}`;
		} else if (secureMatch && !regularMatch) {
			forwardCookie = `${cookieHeader}; better-auth.session_token=${secureMatch[1]}`;
		}
		headers.set('cookie', forwardCookie);
	}

	const requestInit: RequestInit = {
		method: request.method,
		headers
	};

	if (request.method !== 'GET' && request.method !== 'HEAD') {
		requestInit.body = await request.arrayBuffer();
	}

	const response = await globalThis.fetch(targetUrl.toString(), requestInit);

	const responseHeaders = new Headers();
	for (const [key, value] of response.headers.entries()) {
		if (key.toLowerCase() !== 'set-cookie') {
			responseHeaders.set(key, value);
		}
	}

	if (typeof (response.headers as any).getSetCookie === 'function') {
		const setCookies: string[] = (response.headers as any).getSetCookie();
		for (const cookie of setCookies) {
			responseHeaders.append('set-cookie', cookie);
		}
	} else {
		const rawSetCookie = response.headers.get('set-cookie');
		if (rawSetCookie) {
			responseHeaders.set('set-cookie', rawSetCookie);
		}
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: responseHeaders
	});
};
