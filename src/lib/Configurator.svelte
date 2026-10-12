<script lang="ts">
	import { config, MAX_STAR_COLORS, MIN_STAR_COLORS, resetConfig } from './config.svelte';

	const OPEN_KEY = 'rocket:configurator-open';

	const shipPresets = [
		{ name: 'Cobalt', color: '#2f6fd6' },
		{ name: 'Emerald', color: '#1f9d63' },
		{ name: 'Crimson', color: '#c8233a' },
		{ name: 'Violet', color: '#7a4fd6' },
		{ name: 'Gold', color: '#d4a52a' },
		{ name: 'Gunmetal', color: '#5b6470' }
	];

	function readOpen() {
		try {
			return globalThis.localStorage?.getItem(OPEN_KEY) === 'true';
		} catch {
			return false;
		}
	}

	let open = $state(readOpen());

	function toggle() {
		open = !open;
		try {
			globalThis.localStorage?.setItem(OPEN_KEY, String(open));
		} catch {
			// The panel just won't remember being open.
		}
	}

	function setShipColor(color: string) {
		config.shipColor = color;
		// Picking a color while showing the original paint should visibly do something.
		if (config.shipTint === 0) config.shipTint = 1;
	}

	function addStarColor() {
		if (config.starColors.length >= MAX_STAR_COLORS) return;
		config.starColors.push('#ffffff');
	}

	function removeStarColor(index: number) {
		if (config.starColors.length <= MIN_STAR_COLORS) return;
		config.starColors.splice(index, 1);
	}
</script>

<div class="pointer-events-none fixed top-4 right-4 left-4 z-10 flex flex-col items-end gap-2">
	<button
		type="button"
		class="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/85 shadow-lg backdrop-blur-md transition hover:bg-black/70 hover:text-white focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:outline-none"
		aria-expanded={open}
		aria-controls="configurator-panel"
		aria-label={open ? 'Close color settings' : 'Open color settings'}
		onclick={toggle}
	>
		<svg
			viewBox="0 0 24 24"
			class="size-5"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			{#if open}
				<path d="M6 6l12 12M18 6L6 18" />
			{:else}
				<circle cx="13.5" cy="6.5" r="1.5" />
				<circle cx="17.5" cy="10.5" r="1.5" />
				<circle cx="8.5" cy="7.5" r="1.5" />
				<circle cx="6.5" cy="12.5" r="1.5" />
				<path
					d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.56-2.5 5.56-5.55C21.96 6.01 17.46 2 12 2z"
				/>
			{/if}
		</svg>
	</button>

	{#if open}
		<section
			id="configurator-panel"
			aria-label="Color settings"
			class="pointer-events-auto max-h-[calc(100vh-6rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-white/15 bg-black/60 p-4 text-sm text-white/90 shadow-2xl backdrop-blur-md"
		>
			<h2 class="mb-2 text-xs font-semibold tracking-widest text-white/60 uppercase">Ship</h2>

			<div class="flex flex-wrap items-center gap-2">
				<button
					type="button"
					class="h-8 rounded-full border px-3 text-xs transition {config.shipTint === 0
						? 'border-white bg-white/15'
						: 'border-white/20 hover:border-white/50'}"
					aria-pressed={config.shipTint === 0}
					onclick={() => (config.shipTint = 0)}
				>
					Original
				</button>
				{#each shipPresets as preset (preset.color)}
					{@const active = config.shipTint > 0 && config.shipColor === preset.color}
					<button
						type="button"
						class="size-8 rounded-full border-2 transition {active
							? 'border-white'
							: 'border-transparent hover:border-white/50'}"
						style="background-color: {preset.color}"
						title={preset.name}
						aria-label={preset.name}
						aria-pressed={active}
						onclick={() => setShipColor(preset.color)}
					></button>
				{/each}
			</div>

			<div class="mt-3 flex items-center gap-3">
				<label class="flex items-center gap-2">
					<input
						type="color"
						class="color-input"
						value={config.shipColor}
						oninput={(event) => setShipColor(event.currentTarget.value)}
					/>
					<span class="text-white/70">Custom</span>
				</label>
				<label class="flex flex-1 items-center gap-2">
					<span class="text-white/70">Strength</span>
					<input
						type="range"
						class="flex-1 accent-orange-500"
						min="0"
						max="1"
						step="0.05"
						bind:value={config.shipTint}
					/>
				</label>
			</div>

			<h2 class="mt-5 mb-2 text-xs font-semibold tracking-widest text-white/60 uppercase">Stars</h2>

			<ul class="flex flex-wrap gap-2">
				{#each config.starColors, index (index)}
					<li class="relative">
						<input
							type="color"
							class="color-input"
							aria-label="Star color {index + 1}"
							bind:value={config.starColors[index]}
						/>
						{#if config.starColors.length > MIN_STAR_COLORS}
							<button
								type="button"
								class="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-black/80 text-[10px] leading-none text-white/80 ring-1 ring-white/30 hover:text-white"
								aria-label="Remove star color {index + 1}"
								onclick={() => removeStarColor(index)}
							>
								×
							</button>
						{/if}
					</li>
				{/each}
				{#if config.starColors.length < MAX_STAR_COLORS}
					<li>
						<button
							type="button"
							class="flex size-8 items-center justify-center rounded-lg border border-dashed border-white/30 text-lg leading-none text-white/70 hover:border-white/60 hover:text-white"
							aria-label="Add star color"
							onclick={addStarColor}
						>
							+
						</button>
					</li>
				{/if}
			</ul>

			<button
				type="button"
				class="mt-5 w-full rounded-lg border border-white/20 py-2 text-xs text-white/70 transition hover:border-white/50 hover:text-white"
				onclick={resetConfig}
			>
				Reset to defaults
			</button>
		</section>
	{/if}
</div>

<style>
	.color-input {
		width: 2rem;
		height: 2rem;
		padding: 0;
		border: 1px solid rgb(255 255 255 / 0.2);
		border-radius: 0.5rem;
		background: none;
		cursor: pointer;
	}
	.color-input::-webkit-color-swatch-wrapper {
		padding: 0;
	}
	.color-input::-webkit-color-swatch {
		border: none;
		border-radius: 0.45rem;
	}
	.color-input::-moz-color-swatch {
		border: none;
		border-radius: 0.45rem;
	}
</style>
