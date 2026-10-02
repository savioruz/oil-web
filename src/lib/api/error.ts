import { toast } from 'svelte-sonner';
import * as m from '$lib/paraglide/messages';

export interface FieldError {
	field: string;
	message: string;
}

export interface ApiErrorData {
	error?: string;
	description?: string;
	message?: string;
	errors?: FieldError[];
}

export interface ParsedApiError {
	code: string;
	description: string;
	fieldErrors: FieldError[];
}

export function extractApiError(data: unknown, fallback?: string): ParsedApiError {
	const defaultFallback = fallback ?? m.error_default_desc();
	if (!data || typeof data !== 'object') {
		const text = typeof data === 'string' && data.trim() ? data.trim() : defaultFallback;
		return { code: 'error', description: text, fieldErrors: [] };
	}

	if (data instanceof Error && !('description' in data) && !('error' in data)) {
		return { code: 'error', description: data.message || defaultFallback, fieldErrors: [] };
	}

	const record = data as Record<string, unknown>;

	const code =
		typeof record.error === 'string' && record.error.trim() ? record.error.trim() : 'error';

	let description = '';

	if (typeof record.description === 'string' && record.description.trim()) {
		description = record.description.trim();
	} else if (typeof record.message === 'string' && record.message.trim()) {
		description = record.message.trim();
	} else if (
		record.error &&
		typeof record.error === 'object' &&
		'message' in record.error &&
		typeof (record.error as Record<string, unknown>).message === 'string'
	) {
		description = ((record.error as Record<string, unknown>).message as string).trim();
	} else if (typeof record.error === 'string' && record.error.trim()) {
		description = record.error.trim();
	}

	const fieldErrors: FieldError[] = [];
	if (Array.isArray(record.errors)) {
		for (const item of record.errors) {
			if (
				item &&
				typeof item === 'object' &&
				typeof item.field === 'string' &&
				typeof item.message === 'string'
			) {
				fieldErrors.push({ field: item.field, message: item.message });
			}
		}
	}

	if (!description) {
		description = defaultFallback;
	}

	return { code, description, fieldErrors };
}

export function parseApiError(data: unknown, fallback?: string): string {
	const { code, description } = extractApiError(data, fallback);

	if (code && code !== 'error') {
		const translationKey = `error_${code.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
		if (translationKey in m) {
			const fn = (m as unknown as Record<string, () => string>)[translationKey];
			if (typeof fn === 'function') {
				try {
					const localized = fn();
					if (localized && localized.trim()) {
						return localized;
					}
				} catch {}
			}
		}
	}

	return description;
}

export function showErrorToast(err: unknown, fallback?: string): void {
	const message = parseApiError(err, fallback);
	toast.error(message);
}
