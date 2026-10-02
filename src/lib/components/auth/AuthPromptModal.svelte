<script lang="ts">
	import { signIn } from '$lib/auth';
	import { goto } from '$app/navigation';
	import * as m from '$lib/paraglide/messages.js';
	import { X, Sparkles, Mail, Loader2 } from '@lucide/svelte';
	import { parseApiError, showErrorToast } from '$lib/api/error';

	interface Props {
		open?: boolean;
		redirectUrl?: string;
		title?: string;
		description?: string;
		onclose?: () => void;
	}

	let { open = false, redirectUrl = '/dashboard', title, description, onclose }: Props = $props();

	let loading = $state(false);

	function handleClose() {
		if (!loading && onclose) {
			onclose();
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleClose();
		}
	}

	async function handleGoogleSignIn() {
		loading = true;
		try {
			const callbackURL =
				typeof window !== 'undefined'
					? redirectUrl.startsWith('/')
						? `${window.location.origin}${redirectUrl}`
						: redirectUrl
					: redirectUrl;

			await signIn.social({
				provider: 'google',
				callbackURL
			});
		} catch (err: any) {
			const msg = parseApiError(err, m.auth_google_connect_failed());
			showErrorToast(err, msg);
			loading = false;
		}
	}

	function handleEmailSignIn() {
		handleClose();
		const target = `/auth/login?redirect=${encodeURIComponent(redirectUrl)}`;
		goto(target);
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity"
		onclick={(e) => {
			if (e.target === e.currentTarget) {
				handleClose();
			}
		}}
		onkeydown={handleKeyDown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="auth-modal-title"
		tabindex="-1"
	>
		<div
			class="border-border/80 bg-card/95 relative w-full max-w-md overflow-hidden rounded-3xl border p-6 shadow-2xl backdrop-blur-xl transition-all sm:p-7"
		>
			{#if onclose}
				<button
					type="button"
					onclick={handleClose}
					disabled={loading}
					class="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-4 right-4 flex size-8 items-center justify-center rounded-full transition-colors disabled:opacity-50"
					aria-label={m.common_close()}
				>
					<X class="size-4" />
				</button>
			{/if}

			<div class="flex items-center gap-3">
				<div
					class="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-2xl"
				>
					<Sparkles class="size-5" />
				</div>
				<div>
					<h3 id="auth-modal-title" class="text-foreground text-lg font-semibold tracking-tight">
						{title || m.auth_prompt_modal_title()}
					</h3>
					<p class="text-muted-foreground text-xs">{m.app_name()}</p>
				</div>
			</div>

			<p class="text-muted-foreground mt-4 text-xs leading-relaxed">
				{description || m.auth_prompt_modal_desc()}
			</p>

			<div class="mt-6 space-y-3">
				<button
					type="button"
					onclick={handleGoogleSignIn}
					disabled={loading}
					class="border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/80 inline-flex h-11 w-full items-center justify-center gap-3 rounded-xl border px-4 text-sm font-medium shadow-xs transition-all disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if loading}
						<Loader2 class="text-primary size-4 animate-spin" />
					{:else}
						<svg class="size-4.5" viewBox="0 0 24 24">
							<path
								fill="#4285F4"
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							/>
							<path
								fill="#34A853"
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							/>
							<path
								fill="#FBBC05"
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
							/>
							<path
								fill="#EA4335"
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
							/>
						</svg>
					{/if}
					<span>{m.auth_prompt_modal_btn_google()}</span>
				</button>

				<button
					type="button"
					onclick={handleEmailSignIn}
					disabled={loading}
					class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-xl px-4 text-sm font-medium shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60"
				>
					<Mail class="size-4" />
					<span>{m.auth_prompt_modal_btn_email()}</span>
				</button>

				{#if onclose}
					<button
						type="button"
						onclick={handleClose}
						disabled={loading}
						class="text-muted-foreground hover:text-foreground inline-flex h-9 w-full items-center justify-center rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
					>
						{m.auth_prompt_modal_btn_cancel()}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
