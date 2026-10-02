<script lang="ts">
	import {
		checkEmail,
		signIn,
		signUp,
		requestForgotPassword,
		validateUserSession
	} from '$lib/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import * as Alert from '$lib/components/ui/alert';
	import {
		Mail,
		Lock,
		User,
		ArrowRight,
		Eye,
		EyeOff,
		CheckCircle2,
		AlertCircle,
		Loader2
	} from '@lucide/svelte';
	import { parseApiError, showErrorToast } from '$lib/api/error';
	import * as m from '$lib/paraglide/messages';

	type Mode = 'signin' | 'signup' | 'forgot';

	let mode = $state<Mode>('signin');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let name = $state('');
	let showPassword = $state(false);
	let loading = $state(false);
	let errorMsg = $state('');
	let successMsg = $state('');

	onMount(async () => {
		const session = await validateUserSession();
		if (session.valid) {
			goto('/dashboard');
		}
	});

	let passwordStrength = $derived.by(() => {
		const hasMinLength = password.length >= 8;
		const hasUpperLower = /[a-z]/.test(password) && /[A-Z]/.test(password);
		const hasNumberOrSymbol = /[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password);
		const score = (hasMinLength ? 1 : 0) + (hasUpperLower ? 1 : 0) + (hasNumberOrSymbol ? 1 : 0);

		let label = m.auth_strength_weak();
		let colorClass = 'bg-destructive';

		if (score === 2) {
			label = m.auth_strength_medium();
			colorClass = 'bg-amber-500';
		} else if (score === 3) {
			label = m.auth_strength_strong();
			colorClass = 'bg-emerald-500';
		}

		return {
			hasMinLength,
			hasUpperLower,
			hasNumberOrSymbol,
			score,
			label,
			colorClass
		};
	});

	async function handleSignIn(e: SubmitEvent) {
		e.preventDefault();
		errorMsg = '';
		successMsg = '';
		loading = true;

		try {
			const res = await signIn.email({
				email: email.trim().toLowerCase(),
				password
			});

			if (res.error) {
				throw new Error(res.error.message || m.auth_login_failed());
			}

			const explicitSessionToken =
				(res.data as any)?.session?.token || (res.data as any)?.token || '';

			if (explicitSessionToken && typeof document !== 'undefined') {
				if (window.location.protocol === 'https:') {
					document.cookie = `__Secure-better-auth.session_token=${explicitSessionToken}; path=/; max-age=604800; SameSite=Lax; Secure`;
				}
				document.cookie = `better-auth.session_token=${explicitSessionToken}; path=/; max-age=604800; SameSite=Lax`;
			}

			await validateUserSession(true);
			goto('/dashboard');
		} catch (err: any) {
			errorMsg = parseApiError(err, m.auth_login_failed());
			showErrorToast(err, m.auth_login_failed());
		} finally {
			loading = false;
		}
	}

	async function handleSignUp(e: SubmitEvent) {
		e.preventDefault();
		errorMsg = '';
		successMsg = '';

		if (password !== confirmPassword) {
			errorMsg = m.auth_password_mismatch();
			return;
		}

		if (password.length < 8) {
			errorMsg = m.auth_rule_min_length();
			return;
		}

		loading = true;

		try {
			const res = await signUp.email({
				email: email.trim().toLowerCase(),
				password,
				name: name.trim() || email.split('@')[0]
			});

			if (res.error) {
				throw new Error(res.error.message || m.auth_signup_failed());
			}

			const explicitSessionToken =
				(res.data as any)?.session?.token || (res.data as any)?.token || '';

			if (explicitSessionToken && typeof document !== 'undefined') {
				if (window.location.protocol === 'https:') {
					document.cookie = `__Secure-better-auth.session_token=${explicitSessionToken}; path=/; max-age=604800; SameSite=Lax; Secure`;
				}
				document.cookie = `better-auth.session_token=${explicitSessionToken}; path=/; max-age=604800; SameSite=Lax`;
			}

			await validateUserSession(true);
			goto('/dashboard');
		} catch (err: any) {
			errorMsg = parseApiError(err, m.auth_signup_failed());
			showErrorToast(err, m.auth_signup_failed());
		} finally {
			loading = false;
		}
	}

	async function handleForgotPassword(e: SubmitEvent) {
		e.preventDefault();
		errorMsg = '';
		successMsg = '';
		loading = true;

		try {
			await requestForgotPassword(email.trim().toLowerCase(), '/auth/reset-password');
			successMsg = m.auth_reset_email_sent();
		} catch (err: any) {
			errorMsg = parseApiError(err, m.auth_check_email_failed());
			showErrorToast(err, m.auth_check_email_failed());
		} finally {
			loading = false;
		}
	}

	async function handleGoogleSignIn() {
		loading = true;
		try {
			await signIn.social({
				provider: 'google',
				callbackURL: `${window.location.origin}/dashboard`
			});
		} catch (err: any) {
			errorMsg = parseApiError(err, m.auth_google_connect_failed());
			showErrorToast(err, m.auth_google_connect_failed());
			loading = false;
		}
	}
</script>

<div class="flex flex-1 items-center justify-center p-4 sm:p-8">
	<div class="w-full max-w-md">
		<Card.Root class="border-border/80 shadow-lg">
			<Card.Header class="space-y-1 text-center">
				<Card.Title class="text-2xl font-bold tracking-tight">
					{#if mode === 'signin'}
						{m.auth_login_title()}
					{:else if mode === 'signup'}
						{m.auth_signup_title()}
					{:else}
						{m.auth_reset_password_title()}
					{/if}
				</Card.Title>
				<Card.Description>
					{#if mode === 'signin'}
						{m.auth_login_desc()}
					{:else if mode === 'signup'}
						{m.auth_signup_desc()}
					{:else}
						{m.auth_reset_password_desc()}
					{/if}
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

				{#if mode === 'signin'}
					<form onsubmit={handleSignIn} class="space-y-4">
						<div class="space-y-2">
							<Label for="email">{m.auth_email_label()}</Label>
							<div class="relative">
								<Mail class="text-muted-foreground absolute top-3 left-3 size-4" />
								<Input
									id="email"
									type="email"
									bind:value={email}
									placeholder="user@example.com"
									required
									class="pl-9"
									disabled={loading}
								/>
							</div>
						</div>

						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<Label for="password">{m.auth_password_label()}</Label>
								<button
									type="button"
									onclick={() => {
										mode = 'forgot';
										errorMsg = '';
										successMsg = '';
									}}
									class="text-primary text-xs hover:underline"
								>
									{m.auth_forgot_password()}
								</button>
							</div>
							<div class="relative">
								<Lock class="text-muted-foreground absolute top-3 left-3 size-4" />
								<Input
									id="password"
									type={showPassword ? 'text' : 'password'}
									bind:value={password}
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

						<Button type="submit" class="w-full gap-2" disabled={loading}>
							{#if loading}
								<Loader2 class="size-4 animate-spin" />
							{/if}
							<span>{m.auth_signin_btn()}</span>
						</Button>
					</form>

					<div class="relative my-4">
						<div class="absolute inset-0 flex items-center">
							<Separator class="w-full" />
						</div>
						<div class="relative flex justify-center text-xs uppercase">
							<span class="bg-card text-muted-foreground px-2">{m.auth_or_continue_with()}</span>
						</div>
					</div>

					<Button
						type="button"
						variant="outline"
						class="w-full gap-2"
						onclick={handleGoogleSignIn}
						disabled={loading}
					>
						<svg class="size-4" viewBox="0 0 24 24">
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
						<span>{m.auth_google_signin()}</span>
					</Button>
				{:else if mode === 'signup'}
					<form onsubmit={handleSignUp} class="space-y-4">
						<div class="space-y-2">
							<Label for="signup-name">{m.auth_name_label()}</Label>
							<div class="relative">
								<User class="text-muted-foreground absolute top-3 left-3 size-4" />
								<Input
									id="signup-name"
									type="text"
									bind:value={name}
									placeholder="John Doe"
									required
									class="pl-9"
									disabled={loading}
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="signup-email">{m.auth_email_label()}</Label>
							<div class="relative">
								<Mail class="text-muted-foreground absolute top-3 left-3 size-4" />
								<Input
									id="signup-email"
									type="email"
									bind:value={email}
									placeholder="user@example.com"
									required
									class="pl-9"
									disabled={loading}
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="signup-password">{m.auth_password_label()}</Label>
							<div class="relative">
								<Lock class="text-muted-foreground absolute top-3 left-3 size-4" />
								<Input
									id="signup-password"
									type={showPassword ? 'text' : 'password'}
									bind:value={password}
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

							{#if password.length > 0}
								<div class="space-y-1 pt-1">
									<div class="bg-muted flex h-1.5 w-full overflow-hidden rounded-full">
										<div
											class={`h-full transition-all duration-300 ${passwordStrength.colorClass}`}
											style={`width: ${(passwordStrength.score / 3) * 100}%`}
										></div>
									</div>
									<p class="text-muted-foreground text-xs">
										{passwordStrength.label}
									</p>
								</div>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="signup-confirm-password">{m.auth_confirm_password_label()}</Label>
							<div class="relative">
								<Lock class="text-muted-foreground absolute top-3 left-3 size-4" />
								<Input
									id="signup-confirm-password"
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
							<span>{m.auth_signup_btn()}</span>
						</Button>
					</form>
				{:else}
					<form onsubmit={handleForgotPassword} class="space-y-4">
						<div class="space-y-2">
							<Label for="forgot-email">{m.auth_email_label()}</Label>
							<div class="relative">
								<Mail class="text-muted-foreground absolute top-3 left-3 size-4" />
								<Input
									id="forgot-email"
									type="email"
									bind:value={email}
									placeholder="user@example.com"
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
							<span>{m.auth_continue()}</span>
						</Button>
					</form>
				{/if}
			</Card.Content>

			<Card.Footer class="border-border flex justify-center border-t pt-4">
				{#if mode === 'signin'}
					<p class="text-muted-foreground text-xs">
						Belum punya akun?
						<button
							type="button"
							onclick={() => {
								mode = 'signup';
								errorMsg = '';
								successMsg = '';
							}}
							class="text-primary ml-1 font-medium hover:underline"
						>
							{m.auth_signup_btn()}
						</button>
					</p>
				{:else if mode === 'signup'}
					<p class="text-muted-foreground text-xs">
						Sudah punya akun?
						<button
							type="button"
							onclick={() => {
								mode = 'signin';
								errorMsg = '';
								successMsg = '';
							}}
							class="text-primary ml-1 font-medium hover:underline"
						>
							{m.auth_signin_btn()}
						</button>
					</p>
				{:else}
					<button
						type="button"
						onclick={() => {
							mode = 'signin';
							errorMsg = '';
							successMsg = '';
						}}
						class="text-primary text-xs hover:underline"
					>
						{m.auth_back_to_login()}
					</button>
				{/if}
			</Card.Footer>
		</Card.Root>
	</div>
</div>
