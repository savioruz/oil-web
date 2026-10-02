import { browser } from '$app/environment';
import {
	setLanguageTag,
	availableLanguageTags,
	type AvailableLanguageTag
} from '$lib/paraglide/runtime.js';

export const COOKIE_NAME = 'oil_lang';

function getInitialLanguage(): AvailableLanguageTag {
	if (browser) {
		const match = document.cookie.match(new RegExp(`(^| )${COOKIE_NAME}=([^;]+)`));
		if (match && availableLanguageTags.includes(match[2] as AvailableLanguageTag)) {
			return match[2] as AvailableLanguageTag;
		}
		const saved = localStorage.getItem(COOKIE_NAME);
		if (saved && availableLanguageTags.includes(saved as AvailableLanguageTag)) {
			return saved as AvailableLanguageTag;
		}
		const navLang = navigator.language.slice(0, 2).toLowerCase();
		if (navLang === 'en') {
			return 'en';
		}
	}
	return 'id';
}

class LocaleState {
	current = $state<AvailableLanguageTag>(getInitialLanguage());

	setLanguage(lang: AvailableLanguageTag) {
		if (availableLanguageTags.includes(lang)) {
			this.current = lang;
			setLanguageTag(lang);
			if (browser) {
				localStorage.setItem(COOKIE_NAME, lang);
				document.cookie = `${COOKIE_NAME}=${lang};path=/;max-age=31536000;SameSite=Lax`;
				document.documentElement.lang = lang;
			}
		}
	}

	toggleLanguage() {
		this.setLanguage(this.current === 'id' ? 'en' : 'id');
	}
}

export const localeState = new LocaleState();
