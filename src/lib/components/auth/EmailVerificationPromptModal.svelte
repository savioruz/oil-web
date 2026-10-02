<script lang="ts">
	import { validateUserSession, requestVerificationEmail, isEmailVerified } from '$lib/auth';
	import * as m from '$lib/paraglide/messages.js';
	import { MailWarning, Send, RefreshCw, Loader2, X } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { parseApiError, showErrorToast } from '$lib/api/error';
	import { onDestroy } from 'svelte';

	interface Props {
		open?: boolean;
		email?: string;
		callbackUrl?: string;
		onverified?: () => void;
		onclose?: () => void;
	}

	let {
		open = false,
		email = '',
		callbackUrl = '/dashboard',
		onverified,
		onclose
	}: Props = $props();

	let resending = $state(false);
	let checking = $state(false);
	let cooldown = $state(0);
	let timer: ReturnType<typeof setInterval> | null = null;

	onDestroy(() => {
		if (timer) clearInterval(timer);
	});

	function startCooldown(seconds = 30) {
		cooldown = seconds;
		if (timer) clearInterval(timer);
		timer = setInterval(() => {
			if (cooldown > 1) {
				cooldown -= 1;
			} else {
				cooldown = 0;
				if (timer) clearInterval(timer);
				timer = null;
			}
		}, 1000);
	}

	function handleClose() {
		if (!resending && !checking && onclose) {
			onclose();
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleClose();
		}
	}

	async function handleResend() {
		if (!email || resending || cooldown > 0) return;
		resending = true;
		try {
			await requestVerificationEmail(email, callbackUrl);
			toast.success(m.email_verification_sent());
			startCooldown(30);
		} catch (err: any) {
			showErrorToast(err, parseApiError(err, m.email_verification_sent()));
		} finally {
			resending = false;
		}
	}

	async function handleCheckStatus() {
		if (checking) return;
		checking = true;
		try {
			const session = await validateUserSession(true);
			if (session.valid && isEmailVerified(session.user)) {
				toast.success(m.email_verification_verified_toast());
				onverified?.();
				handleClose();
			} else {
				toast.error(m.email_verification_not_yet());
			}
		} catch (err: any) {
			toast.error(m.email_verification_not_yet());
		} finally {
			checking = false;
		}
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
		aria-labelledby="email-verification-modal-title"
		tabindex="-1"
	>
		<div
			class="border-border/80 bg-card/95 relative w-full max-w-md overflow-hidden rounded-3xl border p-6 shadow-2xl backdrop-blur-xl transition-all sm:p-7"
		>
			{#if onclose}
				<button
					type="button"
					onclick={handleClose}
					disabled={resending || checking}
					class="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-4 right-4 flex size-8 items-center justify-center rounded-full transition-colors disabled:opacity-50"
					aria-label={m.common_close()}
				>
					<X class="size-4" />
				</button>
			{/if}

			<div class="flex items-center gap-3">
				<div
					class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500"
				>
					<MailWarning class="size-5" />
				</div>
				<div>
					<h3
						id="email-verification-modal-title"
						class="text-foreground text-lg font-semibold tracking-tight"
					>
						{m.email_verification_title()}
					</h3>
					<p class="text-muted-foreground text-xs">{email}</p>
				</div>
			</div>

			<p class="text-muted-foreground mt-4 text-xs leading-relaxed">
				{m.email_verification_desc()}
			</p>

			<div class="mt-6 space-y-3">
				<button
					type="button"
					onclick={handleResend}
					disabled={resending || cooldown > 0}
					class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if resending}
						<Loader2 class="size-4 animate-spin" />
					{:else}
						<Send class="size-4" />
					{/if}
					<span>
						{#if cooldown > 0}
							{cooldown}s
						{:else}
							{m.email_verification_resend_btn()}
						{/if}
					</span>
				</button>

				<button
					type="button"
					onclick={handleCheckStatus}
					disabled={checking}
					class="border-border bg-background text-foreground hover:bg-muted/80 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium shadow-xs transition-all disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if checking}
						<Loader2 class="text-primary size-4 animate-spin" />
					{:else}
						<RefreshCw class="size-4" />
					{/if}
					<span>{m.email_verification_check_btn()}</span>
				</button>
			</div>
		</div>
	</div>
{/if}
