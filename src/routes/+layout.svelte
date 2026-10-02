<script lang="ts">
	import './layout.css';
	import { i18n } from '$lib/i18n';
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { localeState } from '$lib/i18n/state.svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import { validateUserSession, logoutUser } from '$lib/auth';
	import * as m from '$lib/paraglide/messages';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Globe, LogOut, LayoutDashboard, User } from '@lucide/svelte';

	let { children } = $props();

	let currentUser = $state<any>(null);
	let loading = $state(true);

	onMount(async () => {
		try {
			const session = await validateUserSession();
			if (session.valid) {
				currentUser = session.user;
			}
		} finally {
			loading = false;
		}
	});

	function handleToggleLanguage() {
		localeState.toggleLanguage();
	}

	async function handleLogout() {
		await logoutUser('/');
		currentUser = null;
	}
</script>

<Toaster richColors position="top-right" />

<ParaglideJS {i18n} languageTag={localeState.current}>
	<div class="bg-background text-foreground flex min-h-screen flex-col">
		<header class="border-border bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
			<div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
				<a
					href="/"
					class="text-foreground flex items-center gap-2 text-lg font-bold tracking-tight"
				>
					<div
						class="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg font-bold"
					>
						O
					</div>
					<span>{m.app_name()}</span>
				</a>

				<div class="flex items-center gap-3">
					<button
						type="button"
						onclick={handleToggleLanguage}
						class="border-border text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors"
						aria-label="Toggle Language"
					>
						<Globe class="size-3.5" />
						<span class="uppercase">{localeState.current}</span>
					</button>

					{#if !loading}
						{#if currentUser}
							<div class="flex items-center gap-2">
								<a href="/dashboard">
									<Button variant="outline" size="sm" class="gap-1.5">
										<LayoutDashboard class="size-4" />
										<span class="hidden sm:inline">{m.nav_dashboard()}</span>
									</Button>
								</a>
								<Button
									variant="ghost"
									size="sm"
									onclick={handleLogout}
									class="text-muted-foreground hover:text-destructive gap-1.5"
								>
									<LogOut class="size-4" />
									<span class="hidden sm:inline">{m.nav_logout()}</span>
								</Button>
							</div>
						{:else}
							<a href="/auth/login">
								<Button size="sm">
									{m.nav_login()}
								</Button>
							</a>
						{/if}
					{/if}
				</div>
			</div>
		</header>

		<main class="flex flex-1 flex-col">
			{@render children()}
		</main>

		<footer class="border-border text-muted-foreground border-t py-6 text-center text-xs">
			<div class="mx-auto max-w-6xl px-4">
				<p>&copy; {new Date().getFullYear()} {m.app_name()}. All rights reserved.</p>
			</div>
		</footer>
	</div>
</ParaglideJS>
