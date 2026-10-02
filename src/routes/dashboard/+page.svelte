<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { validateUserSession, logoutUser, fetchWithAuth, isEmailVerified } from '$lib/auth';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Alert from '$lib/components/ui/alert';
	import EmailVerificationPromptModal from '$lib/components/auth/EmailVerificationPromptModal.svelte';
	import {
		User,
		Mail,
		ShieldCheck,
		ShieldAlert,
		LogOut,
		Code,
		RefreshCw,
		Loader2
	} from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';

	let user = $state<any>(null);
	let loading = $state(true);
	let showVerificationModal = $state(false);
	let apiTestLoading = $state(false);
	let apiTestResult = $state<string | null>(null);

	onMount(async () => {
		try {
			const session = await validateUserSession();
			if (!session.valid) {
				goto('/auth/login?redirect=' + encodeURIComponent('/dashboard'));
				return;
			}
			user = session.user;
		} finally {
			loading = false;
		}
	});

	async function handleTestApi() {
		apiTestLoading = true;
		apiTestResult = null;
		try {
			const res = await fetchWithAuth('/api/users');
			const text = await res.text();
			let parsed: any;
			try {
				parsed = JSON.parse(text);
			} catch {
				parsed = text;
			}
			apiTestResult = JSON.stringify({ status: res.status, data: parsed }, null, 2);
		} catch (err: any) {
			apiTestResult = JSON.stringify({ error: err?.message || String(err) }, null, 2);
		} finally {
			apiTestLoading = false;
		}
	}

	async function handleLogout() {
		await logoutUser('/auth/login');
	}
</script>

<div class="flex-1 p-4 sm:p-8">
	<div class="mx-auto max-w-4xl space-y-6">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h1 class="text-foreground text-3xl font-bold tracking-tight">
					{m.dashboard_title()}
				</h1>
				{#if user}
					<p class="text-muted-foreground text-sm">
						{m.dashboard_welcome({ name: user.name || user.email })}
					</p>
				{/if}
			</div>

			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={handleLogout}
					class="text-muted-foreground hover:text-destructive gap-1.5"
				>
					<LogOut class="size-4" />
					<span>{m.nav_logout()}</span>
				</Button>
			</div>
		</div>

		{#if loading}
			<div class="flex h-64 items-center justify-center">
				<Loader2 class="text-primary size-8 animate-spin" />
			</div>
		{:else if user}
			<div class="grid gap-6 md:grid-cols-2">
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-lg">
							<User class="text-primary size-5" />
							<span>{m.dashboard_user_details()}</span>
						</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="border-border flex items-center justify-between border-b pb-3">
							<span class="text-muted-foreground text-xs">{m.dashboard_name()}</span>
							<span class="text-sm font-medium">{user.name || '-'}</span>
						</div>

						<div class="border-border flex items-center justify-between border-b pb-3">
							<span class="text-muted-foreground text-xs">{m.dashboard_email()}</span>
							<span class="text-sm font-medium">{user.email}</span>
						</div>

						<div class="flex items-center justify-between">
							<span class="text-muted-foreground text-xs">{m.dashboard_status()}</span>
							{#if isEmailVerified(user)}
								<Badge
									variant="outline"
									class="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
								>
									<ShieldCheck class="size-3.5" />
									<span>{m.dashboard_verified()}</span>
								</Badge>
							{:else}
								<div class="flex items-center gap-2">
									<Badge
										variant="outline"
										class="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-600"
									>
										<ShieldAlert class="size-3.5" />
										<span>{m.dashboard_unverified()}</span>
									</Badge>
									<Button
										variant="ghost"
										size="sm"
										class="text-primary h-7 px-2 text-xs"
										onclick={() => (showVerificationModal = true)}
									>
										Verifikasi
									</Button>
								</div>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-lg">
							<Code class="text-primary size-5" />
							<span>fetchWithAuth Sandbox</span>
						</Card.Title>
						<Card.Description>
							Uji pemanggilan endpoint terproteksi dengan injeksi token JWT otomatis.
						</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						<Button
							type="button"
							class="w-full gap-2"
							onclick={handleTestApi}
							disabled={apiTestLoading}
						>
							{#if apiTestLoading}
								<Loader2 class="size-4 animate-spin" />
							{:else}
								<RefreshCw class="size-4" />
							{/if}
							<span>{m.dashboard_test_api_btn()}</span>
						</Button>

						{#if apiTestResult}
							<div class="space-y-1.5">
								<span class="text-muted-foreground text-xs">{m.dashboard_api_result()}:</span>
								<pre
									class="bg-muted max-h-48 overflow-auto rounded-lg p-3 font-mono text-xs">{apiTestResult}</pre>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>

			<EmailVerificationPromptModal
				open={showVerificationModal}
				email={user.email}
				callbackUrl="/dashboard"
				onclose={() => (showVerificationModal = false)}
				onverified={async () => {
					showVerificationModal = false;
					const updated = await validateUserSession(true);
					if (updated.valid) {
						user = updated.user;
					}
				}}
			/>
		{/if}
	</div>
</div>
