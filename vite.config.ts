import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { paraglide } from '@inlang/paraglide-sveltekit/vite';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadWranglerVars(targetEnv: string): Record<string, string> {
	try {
		const filePath = resolve(process.cwd(), 'wrangler.jsonc');
		if (!existsSync(filePath)) return {};
		const raw = readFileSync(filePath, 'utf-8');
		const clean = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
		const config = JSON.parse(clean);
		return {
			...(config.vars || {}),
			...(config.env?.[targetEnv]?.vars || {})
		};
	} catch {
		return {};
	}
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const targetEnv = process.env.APP_ENV || (mode === 'production' ? 'production' : 'preview');
	const wranglerVars = loadWranglerVars(targetEnv);

	for (const [key, val] of Object.entries(env)) {
		if (!process.env[key]) {
			process.env[key] = val;
		}
	}

	for (const [key, val] of Object.entries(wranglerVars)) {
		if (process.env.VITEST || mode === 'test') {
			if (key.startsWith('PUBLIC_') && !process.env[key]) {
				process.env[key] = val;
			}
		} else if (!process.env[key]) {
			process.env[key] = val;
		}
	}

	const authTarget =
		process.env.PUBLIC_AUTH_URL ||
		env.PUBLIC_AUTH_URL ||
		wranglerVars.PUBLIC_AUTH_URL ||
		'http://localhost:8787';

	return {
		plugins: [
			paraglide({
				project: './project.inlang',
				outdir: './src/lib/paraglide',
				disablePreprocessor: true
			}),
			tailwindcss(),
			sveltekit({
				compilerOptions: {
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},
				adapter: adapter()
			})
		],
		server: {
			proxy: {
				'/api/auth': {
					target: authTarget,
					changeOrigin: true,
					secure: false,
					configure: (proxy) => {
						proxy.on('proxyReq', (proxyReq, req) => {
							const cookie = req.headers['cookie'];
							if (cookie) {
								proxyReq.setHeader(
									'cookie',
									cookie.replace(/(^|;\s*)better-auth\./g, '$1__Secure-better-auth.')
								);
							}
						});
						proxy.on('proxyRes', (proxyRes) => {
							const setCookie = proxyRes.headers['set-cookie'];
							if (setCookie) {
								proxyRes.headers['set-cookie'] = setCookie.map((cookie) =>
									cookie.replace(/;\s*Secure/gi, '').replace(/__Secure-/g, '')
								);
							}
						});
					}
				}
			}
		},
		test: {
			environment: 'node',
			include: ['src/**/*.{test,spec}.{js,ts}']
		}
	};
});
