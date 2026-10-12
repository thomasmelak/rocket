// User-configurable colors for the ship and the stars, persisted in localStorage.
// `config` is shared module state: the HTML configurator writes to it and the 3D
// components read it every frame, so changes show up immediately.

const STORAGE_KEY = 'rocket:config:v1';
const SAVE_DELAY_MS = 200;

export const DEFAULT_SHIP_COLOR = '#2f6fd6';
export const DEFAULT_STAR_COLORS = ['#F46036', '#EFCA08', '#593C8F', '#E71D36', '#BBDEF0'];
export const MIN_STAR_COLORS = 1;
export const MAX_STAR_COLORS = 8;

export type Config = {
	/** Paint color the hull is recolored towards. */
	shipColor: string;
	/** 0 shows the original rusty orange, 1 fully applies `shipColor`. */
	shipTint: number;
	starColors: string[];
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function defaults(): Config {
	return {
		shipColor: DEFAULT_SHIP_COLOR,
		shipTint: 0,
		starColors: [...DEFAULT_STAR_COLORS]
	};
}

function isHexColor(value: unknown): value is string {
	return typeof value === 'string' && HEX_COLOR.test(value);
}

// Storage can be missing (SSR) or throw (private mode, blocked site data),
// and saved data can be stale or hand-edited, so every field is validated.
function load(): Config {
	const config = defaults();
	try {
		const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
		if (!raw) return config;
		const saved = JSON.parse(raw);
		if (isHexColor(saved?.shipColor)) config.shipColor = saved.shipColor;
		if (typeof saved?.shipTint === 'number' && saved.shipTint >= 0 && saved.shipTint <= 1) {
			config.shipTint = saved.shipTint;
		}
		if (Array.isArray(saved?.starColors)) {
			const colors = saved.starColors.filter(isHexColor).slice(0, MAX_STAR_COLORS);
			if (colors.length >= MIN_STAR_COLORS) config.starColors = colors;
		}
	} catch (error) {
		console.warn('Could not read the saved configuration', error);
	}
	return config;
}

function save(serialized: string) {
	try {
		globalThis.localStorage?.setItem(STORAGE_KEY, serialized);
	} catch (error) {
		console.warn('Could not save the configuration', error);
	}
}

export const config = $state<Config>(load());

export function resetConfig() {
	Object.assign(config, defaults());
}

// Debounced so dragging a color picker doesn't write on every input event.
$effect.root(() => {
	let lastSaved = JSON.stringify(config);
	let timer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		const serialized = JSON.stringify(config);
		clearTimeout(timer);
		if (serialized === lastSaved) return;
		timer = setTimeout(() => {
			save(serialized);
			lastSaved = serialized;
		}, SAVE_DELAY_MS);
	});
});
