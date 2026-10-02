<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { ArrowRight } from '@lucide/svelte';
</script>

<div class="flex flex-1 items-center justify-center p-6 sm:p-12">
	<div class="mx-auto max-w-md text-center">
		<h1 class="text-foreground text-4xl font-extrabold tracking-tight sm:text-5xl">
			{m.landing_title()}
		</h1>
		<p class="text-muted-foreground mt-4 text-sm sm:text-base">
			{m.landing_desc()}
		</p>
		<div class="mt-8 flex justify-center gap-3">
			<a href="/dashboard">
				<Button class="gap-2">
					<span>{m.nav_dashboard()}</span>
					<ArrowRight class="size-4" />
				</Button>
			</a>
			<a href="/auth/login">
				<Button variant="outline">
					{m.nav_login()}
				</Button>
			</a>
		</div>
	</div>
</div>
