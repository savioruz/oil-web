<script lang="ts">
	import { resetPassword } from '$lib/auth';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';
	import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from '@lucide/svelte';
	import { parseApiError, showErrorToast } from '$lib/api/error';
	import { toast } from 'svelte-sonner';
	import * as m from '$lib/paraglide/messages';

	let token = $derived(page.url.searchParams.get('token') || '');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let loading = $state(false);
	let errorMsg = $state('');
	let successMsg = $state('');

	async function handleReset(e: SubmitEvent) {
		e.preventDefault();
		errorMsg = '';
		successMsg = '';

		if (!token) {
			errorMsg = 'Token reset password tidak ditemukan atau tidak valid.';
			return;
		}

		if (newPassword !== confirmPassword) {
			errorMsg = m.auth_password_mismatch();
			return;
		}

		if (newPassword.length < 8) {
			errorMsg = m.auth_rule_min_length();
			return;
		}

		loading = true;

		try {
			await resetPassword(newPassword, token);
			successMsg = m.auth_reset_success();
			toast.success(m.auth_reset_success());
			setTimeout(() => {
				goto('/auth/login');
			}, 2000);
		} catch (err: any) {
			errorMsg = parseApiError(err, 'Gagal mereset kata sandi. Tautan mungkin sudah kedaluwarsa.');
			showErrorToast(err, errorMsg);
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex flex-1 items-center justify-center p-4 sm:p-8">
	<div class="w-full max-w-md">
		<Card.Root class="border-border/80 shadow-lg">
			<Card.Header class="space-y-1 text-center">
				<Card.Title class="text-2xl font-bold tracking-tight">
					{m.auth_reset_password_title()}
				</Card.Title>
				<Card.Description>
					{m.auth_reset_password_desc()}
				</Card.Description>
			</Card.Header>

			<Card.Content class="space-y-4">
				{#if errorMsg}
					<Alert.Root variant="destructive">
						<AlertCircle class="size-4" />
						<Alert.Description>{errorMsg}</Alert.Description>
					</Alert.Root>
				{/if}

				{#if successMsg}
					<Alert.Root
						class="border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
					>
						<CheckCircle2 class="size-4 text-emerald-500" />
						<Alert.Description>{successMsg}</Alert.Description>
					</Alert.Root>
				{/if}

				<form onsubmit={handleReset} class="space-y-4">
					<div class="space-y-2">
						<Label for="new-password">{m.auth_new_password_label()}</Label>
						<div class="relative">
							<Lock class="text-muted-foreground absolute top-3 left-3 size-4" />
							<Input
								id="new-password"
								type={showPassword ? 'text' : 'password'}
								bind:value={newPassword}
								required
								class="pr-10 pl-9"
								disabled={loading}
							/>
							<button
								type="button"
								onclick={() => (showPassword = !showPassword)}
								class="text-muted-foreground hover:text-foreground absolute top-3 right-3"
							>
								{#if showPassword}
									<EyeOff class="size-4" />
								{:else}
									<Eye class="size-4" />
								{/if}
							</button>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="confirm-password">{m.auth_confirm_password_label()}</Label>
						<div class="relative">
							<Lock class="text-muted-foreground absolute top-3 left-3 size-4" />
							<Input
								id="confirm-password"
								type="password"
								bind:value={confirmPassword}
								required
								class="pl-9"
								disabled={loading}
							/>
						</div>
					</div>

					<Button type="submit" class="w-full gap-2" disabled={loading}>
						{#if loading}
							<Loader2 class="size-4 animate-spin" />
						{/if}
						<span>{m.auth_reset_submit()}</span>
					</Button>
				</form>
			</Card.Content>

			<Card.Footer class="border-border flex justify-center border-t pt-4">
				<a href="/auth/login" class="text-primary text-xs hover:underline">
					{m.auth_back_to_login()}
				</a>
			</Card.Footer>
		</Card.Root>
	</div>
</div>
