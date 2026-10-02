import { createAuthClient } from 'better-auth/client';
import { PUBLIC_AUTH_URL, PUBLIC_API_URL, PUBLIC_APP_ID } from '$env/static/public';

const authBaseURL = typeof window !== 'undefined' ? window.location.origin : PUBLIC_AUTH_URL;

export const authClient = createAuthClient({
	baseURL: authBaseURL,
	fetchOptions: {
		credentials: 'include'
	}
});

const originalSocial = authClient.signIn.social;
authClient.signIn.social = async (options: any, ...rest: any[]) => {
	let callbackURL = options?.callbackURL || '/dashboard';
	if (typeof window !== 'undefined' && callbackURL.startsWith('/')) {
		callbackURL = `${window.location.origin}${callbackURL}`;
	}
	return (originalSocial as any)({ ...options, callbackURL }, ...rest);
};

export const { signIn, signUp, signOut, useSession, getSession } = authClient;

export interface CheckEmailResult {
	exists: boolean;
	name?: string;
	hasPassword: boolean;
	providers: string[];
}

export async function checkEmail(email: string): Promise<CheckEmailResult> {
	const url =
		typeof window !== 'undefined'
			? '/api/auth/check-email'
			: `${PUBLIC_AUTH_URL}/api/auth/check-email`;

	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ email })
	});

	if (!res.ok) {
		const err = (await res.json().catch(() => ({}))) as Record<string, any>;
		throw new Error(err?.error?.message || err?.message || 'Failed to check email status');
	}

	return (await res.json()) as CheckEmailResult;
}

export async function requestForgotPassword(
	email: string,
	redirectTo = '/auth/login'
): Promise<any> {
	const resolvedRedirectTo =
		typeof window !== 'undefined' && redirectTo.startsWith('/')
			? `${window.location.origin}${redirectTo}`
			: redirectTo;
	const url =
		typeof window !== 'undefined'
			? '/api/auth/request-password-reset'
			: `${PUBLIC_AUTH_URL}/api/auth/request-password-reset`;

	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ email, redirectTo: resolvedRedirectTo })
	});

	if (!res.ok) {
		const err = (await res.json().catch(() => ({}))) as Record<string, any>;
		throw new Error(err?.error?.message || err?.message || 'Failed to send password reset link');
	}

	return res.json();
}

export async function resetPassword(password: string, token: string): Promise<any> {
	const url =
		typeof window !== 'undefined'
			? '/api/auth/reset-password'
			: `${PUBLIC_AUTH_URL}/api/auth/reset-password`;

	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ newPassword: password, token })
	});

	if (!res.ok) {
		const err = (await res.json().catch(() => ({}))) as Record<string, any>;
		throw new Error(err?.message || err?.error?.message || 'Failed to reset password');
	}

	return res.json();
}

export async function requestVerificationEmail(
	email: string,
	callbackURL = '/dashboard'
): Promise<any> {
	const resolvedCallbackURL =
		typeof window !== 'undefined' && callbackURL.startsWith('/')
			? `${window.location.origin}${callbackURL}`
			: callbackURL;
	const url =
		typeof window !== 'undefined'
			? '/api/auth/send-verification-email'
			: `${PUBLIC_AUTH_URL}/api/auth/send-verification-email`;

	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ email, callbackURL: resolvedCallbackURL })
	});

	if (!res.ok) {
		const err = (await res.json().catch(() => ({}))) as Record<string, any>;
		throw new Error(err?.error?.message || err?.message || 'Failed to send verification email');
	}

	return res.json();
}

let inMemoryToken: string | null = null;
let inFlightTokenPromise: Promise<string | null> | null = null;
let inFlightValidateUserPromise: Promise<{ valid: boolean; user?: any }> | null = null;
let cachedValidatedUser: { user: any; timestamp: number } | null = null;
const USER_VALIDATION_CACHE_TTL_MS = 10 * 1000;

export function handleSessionTokenFromUrl(): void {
	if (typeof window === 'undefined') return;
	try {
		const url = new URL(window.location.href);
		const token = url.searchParams.get('session_token');
		if (token) {
			if (window.location.protocol === 'https:') {
				document.cookie = `__Secure-better-auth.session_token=${token}; path=/; max-age=604800; SameSite=Lax; Secure`;
			}
			document.cookie = `better-auth.session_token=${token}; path=/; max-age=604800; SameSite=Lax`;
			url.searchParams.delete('session_token');
			const cleanQuery = url.search ? url.search : '';
			window.history.replaceState({}, '', url.pathname + cleanQuery + url.hash);
		}
	} catch {}
}

if (typeof window !== 'undefined') {
	handleSessionTokenFromUrl();
}

export function isTokenExpired(token: string): boolean {
	try {
		const parts = token.split('.');
		if (parts.length < 2) return true;
		const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
		const json = decodeURIComponent(
			atob(base64)
				.split('')
				.map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
				.join('')
		);
		const payload = JSON.parse(json);
		if (!payload.exp) return false;
		return Date.now() + 10000 >= payload.exp * 1000;
	} catch {
		return true;
	}
}

export function setCachedToken(token: string | null): void {
	inMemoryToken = token;
	if (!token) {
		cachedValidatedUser = null;
	}
}

export function hasStoredToken(): boolean {
	if (typeof window === 'undefined') return false;
	if (inMemoryToken && !isTokenExpired(inMemoryToken)) return true;
	return cachedValidatedUser !== null;
}

export function isAuthenticated(): boolean {
	return hasStoredToken();
}

export function clearCachedToken(): void {
	inMemoryToken = null;
	cachedValidatedUser = null;
}

export async function logoutUser(redirectTo = '/auth/login'): Promise<void> {
	clearCachedToken();
	if (typeof document !== 'undefined') {
		document.cookie = 'better-auth.session_token=; path=/; max-age=0; SameSite=Lax';
		document.cookie =
			'__Secure-better-auth.session_token=; path=/; max-age=0; SameSite=Lax; Secure';
	}
	try {
		await signOut();
	} catch (e) {
		console.warn('Signout request failed, clearing local state anyway:', e);
	}

	if (typeof window !== 'undefined') {
		window.location.href = redirectTo;
	}
}

export async function getAppToken(forceRefresh = false): Promise<string | null> {
	handleSessionTokenFromUrl();
	if (!forceRefresh && inMemoryToken && !isTokenExpired(inMemoryToken)) {
		return inMemoryToken;
	}

	if (inFlightTokenPromise) {
		return inFlightTokenPromise;
	}

	inFlightTokenPromise = (async () => {
		try {
			const url =
				typeof window !== 'undefined'
					? '/api/auth/token/issue'
					: `${PUBLIC_AUTH_URL}/api/auth/token/issue`;

			const appId = PUBLIC_APP_ID || 'oil-web';
			const res = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({ app_id: appId })
			});

			if (!res.ok) {
				inMemoryToken = null;
				return null;
			}

			const data = (await res.json()) as { token?: string };
			const token = data.token || null;
			if (token && !isTokenExpired(token)) {
				inMemoryToken = token;
				return token;
			}
			inMemoryToken = null;
			return null;
		} catch (e) {
			console.error('Failed to issue app token:', e);
			inMemoryToken = null;
			return null;
		} finally {
			inFlightTokenPromise = null;
		}
	})();

	return inFlightTokenPromise;
}

export function isEmailVerified(user: any): boolean {
	if (!user) return false;
	return Boolean(
		user.email_verified_at ||
		user.emailVerified === true ||
		(user.email_verified && user.email_verified !== 'false')
	);
}

export async function validateUserSession(force = false): Promise<{ valid: boolean; user?: any }> {
	const now = Date.now();
	if (
		!force &&
		cachedValidatedUser &&
		now - cachedValidatedUser.timestamp < USER_VALIDATION_CACHE_TTL_MS
	) {
		return { valid: true, user: cachedValidatedUser.user };
	}

	if (inFlightValidateUserPromise) {
		return inFlightValidateUserPromise;
	}

	inFlightValidateUserPromise = (async () => {
		try {
			const sessionRes = await authClient.getSession();
			if (!sessionRes || sessionRes.error || !sessionRes.data?.user) {
				cachedValidatedUser = null;
				setCachedToken(null);
				return { valid: false };
			}

			const user = sessionRes.data.user;
			cachedValidatedUser = { user, timestamp: Date.now() };
			return { valid: true, user };
		} catch {
			cachedValidatedUser = null;
			return { valid: false };
		} finally {
			inFlightValidateUserPromise = null;
		}
	})();

	return inFlightValidateUserPromise;
}

export async function fetchWithAuth(
	endpoint: string,
	init: RequestInit = {},
	customFetch: typeof fetch = fetch
): Promise<Response> {
	const headers = new Headers(init.headers || {});
	let token = await getAppToken();

	if (token) {
		headers.set('Authorization', `Bearer ${token}`);
	}

	const url = endpoint.startsWith('http')
		? endpoint
		: `${PUBLIC_API_URL.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;

	let res = await customFetch(url, {
		...init,
		headers
	});

	if (res.status === 401) {
		const newToken = await getAppToken(true);
		if (newToken) {
			headers.set('Authorization', `Bearer ${newToken}`);
			res = await customFetch(url, {
				...init,
				headers
			});
		} else {
			setCachedToken(null);
		}
	}

	return res;
}
