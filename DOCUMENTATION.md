# rocket — Project Documentation

A single-page, full-screen 3D animation: a rusty orange spaceship with a glowing
engine beam, flying through a field of colored, streaking stars while the camera
slowly orbits it. It is built with SvelteKit and Threlte (Three.js for Svelte),
rendered with a bloom post-processing pass, and deployed as a static site to
GitHub Pages at `https://<user>.github.io/rocket/`.

---

## 1. Quick start

```sh
npm ci            # install (Node 22; .npmrc sets engine-strict=true)
npm run dev       # dev server, exposed on the network (--host)
npm run build     # static site → build/
npm run preview   # serve the production build
```

| Script | Command | Purpose |
|---|---|---|
| `dev` | `vite dev --host` | Development server |
| `build` | `vite build` | Production static build into `build/` |
| `preview` | `vite preview` | Preview the production build |
| `prepare` | `svelte-kit sync \|\| echo ''` | Generates `.svelte-kit/` types after install |
| `check` | `svelte-kit sync && svelte-check` | Type-check Svelte/TS |
| `check:watch` | same, `--watch` | Type-check in watch mode |
| `format` | `prettier --write .` | Format |
| `lint` | `prettier --check . && eslint .` | Lint |

---

## 2. Tech stack

| Area | Library | Locked version |
|---|---|---|
| Framework | `@sveltejs/kit` | 2.26.1 |
| UI | `svelte` (v5; components mostly use legacy, non-runes syntax) | 5.36.17 |
| Bundler | `vite` | 7.0.6 |
| Static output | `@sveltejs/adapter-static` | ^3.0.8 |
| 3D | `three` | 0.178.0 |
| 3D for Svelte | `@threlte/core` / `@threlte/extras` | 8.1.3 / 9.4.2 |
| CSS | `tailwindcss` + `@tailwindcss/vite` | 4.1.11 |
| Tooling | TypeScript 5, ESLint 9 (flat config), Prettier 3 | — |

**Installed but not imported anywhere:** `@theatre/core`, `@threlte/theatre`,
`postprocessing`, `gl-noise`, `three-custom-shader-material`, `@types/animejs`,
`@types/three-nebula`. (Bloom uses Three's own `three/addons/postprocessing`,
not the `postprocessing` package.)

---

## 3. Repository map

```
rocket/
├── .github/workflows/build.yml   CI: build and deploy to GitHub Pages
├── src/
│   ├── app.html                  HTML shell
│   ├── app.css                   @import 'tailwindcss'
│   ├── app.d.ts                  SvelteKit ambient types (template)
│   ├── routes/
│   │   ├── +layout.svelte        Loads app.css, renders the page
│   │   └── +page.svelte          Full-screen <Canvas> containing <Scene/>
│   └── lib/
│       ├── Scene.svelte          Camera, controls, render pipeline, env map
│       ├── spaceship.svelte      Spaceship model + engine beam
│       ├── Stars.svelte          Instanced, streaking stars
│       └── index.ts              Empty $lib barrel
├── static/                       Copied as-is into build/
│   ├── spaceship-1k.glb          4.3 MB — shown first (PNG textures, 1024²)
│   ├── spaceship-4k.glb          13 MB  — swapped in once loaded (WebP textures, 4096²)
│   ├── energy-beam-opacity.png   Alpha map for the engine beam
│   ├── star.png                  Alpha map for star streaks
│   └── favicon.svg
├── svelte.config.js              adapter-static, base path /rocket
├── vite.config.ts                tailwind + sveltekit + devtools-json plugins
├── eslint.config.js              JS + TS + Svelte recommended, prettier
├── .prettierrc                   tabs, single quotes, width 100
└── tsconfig.json                 strict, checkJs, bundler resolution
```

---

## 4. Component architecture

```
+layout.svelte
└── +page.svelte            div 100vw × 100vh, overflow hidden
    └── <Canvas>            (@threlte/core)
        └── Scene.svelte
            ├── PerspectiveCamera + OrbitControls
            ├── spaceship.svelte   (bind:ref → spaceShipRef)
            └── Stars.svelte
```

### 4.1 `src/routes/+page.svelte`
Mounts a Threlte `<Canvas>` inside a full-viewport `div` and renders `<Scene />`.
This is the app's only route.

### 4.2 `src/lib/Scene.svelte` — scene and render loop
**Camera and controls**
- `T.PerspectiveCamera makeDefault` with `OrbitControls`: damping (factor 0.1),
  `autoRotate`, target `[0,0,0]`.
- Responsive via `new MediaQuery('(max-width: 768px)')`:

| | Position | FOV | Auto-rotate speed |
|---|---|---|---|
| Mobile (≤768px) | `[-12, 2, -5]` | 48 | 2 |
| Desktop | `[-8, 6, 10]` | 24 | 0.5 |

**Post-processing**: an `EffectComposer` is created at window size and, in
`onMount`, gets three passes:
1. `RenderPass(scene, camera)`
2. `UnrealBloomPass` — strength 0.275, radius 1, threshold 0
3. `OutputPass` (tone mapping and color space)

**Per-frame task** (`useTask` in Threlte's `renderStage`):
1. Spring physics for the ship's height (`translY`) and tilt (`angleZ`) toward
   `intersectionPoint` (stiffness 0.002 / damping 0.95 for height, 0.01 / 0.85
   for angle). This only runs if `intersectionPoint` is set.
2. Builds a reflection map: disposes the previous render target, hides the
   ship, clears the background, renders the scene (the stars) into a PMREM
   environment map, then restores the background (`#598889` × 0.05) and the ship.
3. Traverses the ship and, on every material with `envMapIntensity`, sets
   `envMap` to the new texture, `envMapIntensity = 100` and `normalScale = 0.3`.
   The ship therefore reflects the colored stars streaking past it.
4. `composer.render()`.

**Mouse-follow is disabled**: the `pointermove` handler that raycasts against
an invisible 20×20 plane to set `intersectionPoint` is commented out. The
`Mesh`, `Raycaster` and `Vector2` objects are still created in `onMount` but
are never used, so the ship stays at the origin.

### 4.3 `src/lib/spaceship.svelte` — the model
- Generated by `@threlte/gltf` 2.0.0, then hand-edited.
- Loads `/rocket/energy-beam-opacity.png` (`useTexture`) and the model
  progressively (see 4.3.1).
- `alphaFix()` sets the `spaceship_racer` and `cockpit` materials to
  transparent, with alpha-to-coverage and `LessEqualDepth` depth testing and writing.
- Renders 13 meshes (hull, engines, panels, cockpit, canopy sphere) in a group
  scaled 0.003, rotated −90° on Y and offset to `[0.95, 0, -2.235]`.
- **Engine beam**: an open cone (`CylinderGeometry` radius 64→0, length
  `tail = 2000`) with an orange-red `MeshBasicMaterial`, using the beam PNG as its
  alpha map and additive blending (`CustomBlending`, `OneFactor`, `AddEquation`).
  Bloom makes it glow.
- API: `export const ref` (a `Group`, bound by `Scene`), `$$restProps` passed
  through (position/rotation), and slots `fallback` (while loading), `error`, and
  the default slot.
- **License**: "Rusty Spaceship - Orange" by Sousinho, CC-BY-4.0
  (https://sketchfab.com/3d-models/rusty-spaceship-orange-18541ebed6ce44a9923f9b8dc30d87f5).
  Attribution is required and lives in the file's header comment.

#### 4.3.1 Progressive loading (1K → 4K)
1. `useGltf('/rocket/spaceship-1k.glb')` loads the light model; the template
   `{#await}`s it, showing the `fallback` slot until it resolves.
2. Once the 1K model has loaded, and only if
   `renderer.capabilities.maxTextureSize >= 4096` and the browser isn't in
   Save-Data mode, `useGltf().load('/rocket/spaceship-4k.glb')` starts downloading
   the 4K model. It starts after the 1K finishes, so they don't compete for bandwidth.
3. When the 4K model resolves, `alphaFix` runs on its materials, it is assigned to
   `hiRes`, and the template's `{@const gltf = hiRes ?? lowResGltf}` swaps every
   mesh's geometry and material in place. The 1K model's geometries, textures and
   materials are then disposed to free GPU memory.
4. If the 4K load fails, a warning is logged and the 1K model stays.

Both files have identical meshes, node names and material names; only texture
resolution differs. That is what makes the in-place swap work. **If you
regenerate either model, keep the names identical.**

`Scene.svelte`'s per-frame env-map traverse applies to whichever materials are
current, so reflections work on both.

#### 4.3.2 How `spaceship-4k.glb` was optimized
The original was 33.1 MB, all of it from eight 4096² PNG textures. It was
re-encoded with glTF Transform (`textureCompress` + `sharp`):
- Base color, metallic-roughness and normal maps → **near-lossless WebP**
  (quality 20). Lossy WebP was rejected: its 4:2:0 chroma subsampling capped
  quality at ~31 dB (23 dB on the main normal map), barely above the 1K model
  upscaled. Near-lossless keeps 39–63 dB per texture.
- Emissive maps (almost empty) → resized to 1024², near-lossless WebP.
- Geometry untouched (quantization would move node transforms, which the
  component ignores).

Result: **13.1 MB (−60%)**, passes `gltf-transform validate` with no issues. The alpha
channel of the hull's base color differs on 0.05% of pixels by ≤ 8/255. The file
requires `EXT_texture_webp`, which Three's `GLTFLoader` supports natively (no
decoder needed) and all current browsers support.

GPU memory at 4K is still high: ~6 × 89 MB for the 4096² textures (with mipmaps)
versus ~45 MB total at 1K. Only the transfer size shrank.

### 4.4 `src/lib/Stars.svelte` — star field
- `STARS_COUNT = 150`, drawn as a single `InstancedMesh` of a 1 × 0.05 plane with
  `star.png` as a transparent alpha map (double-sided).
- `resetStar()` randomizes each star:
  - 20%: near band — x ∈ [-30, -10], y ∈ [-5, 5], z ∈ [-6, 6], length 1.5–15
  - 80%: far field — x ∈ [-45, -15], y ∈ [-10.5, 1.5], z ∈ [-45, 30], length 2.5–20
  - speed 19.5–42 units/s; color from `#F46036 #EFCA08 #593C8F #E71D36 #BBDEF0`
    (converted to linear, ×1.3 so the bloom catches it)
- Each frame, every star moves along +X by `speed × delta`; past `x > 50` it is
  re-randomized. `stars = stars` triggers Svelte reactivity to update the instances.

---

## 5. Build and deployment

**`svelte.config.js`**
- `adapter-static` with `pages`/`assets: 'build'`, `precompress: true` (also
  emits `.br` / `.gz` files), `strict: true`, and SPA `fallback: 'index.html'`.
- `paths.base = '/rocket'`, matching the GitHub Pages project URL.

**`.github/workflows/build.yml`** (“Build CI”)
- Triggers: push to `main`, and pull requests targeting `main`.
- Steps: checkout → Node 22.x → `npm i` → `npm run build` →
  `upload-pages-artifact` (path `build`) → `deploy-pages`.
- Permissions: `id-token: write`, `pages: write`.
- CI does **not** run `check` or `lint`.

---

## 6. Current health (verified 2026-10-12, Node 22)

| Check | Result |
|---|---|
| `npm ci` | ✅ |
| `npm run build` | ✅ — writes the site to `build/` |
| `npm run check` | ❌ 1 error — `Scene.svelte`: the JSDoc type on `spaceShipRef` isn't assignable to `Group` for `bind:ref` |
| `eslint .` | ❌ 11 errors (see below) |

ESLint errors:
- `Scene.svelte`: 2× `@ts-ignore` (should be `@ts-expect-error`); unused `mesh`,
  `raycaster` and `pointer` (left over from the disabled mouse-follow).
- `Stars.svelte`: 2× `no-explicit-any`; raw store access to `map`; `{#each}`
  without a key.
- `spaceship.svelte`: 2× raw store access to `lowRes` / `map` (the loaders return
  Promise-like stores that are used with `.then` / `{#await}`).

---

## 7. Known issues and gotchas

1. **Hardcoded base path in asset URLs**: `'/rocket/star.png'`,
   `'/rocket/spaceship-1k.glb'`, `'/rocket/spaceship-4k.glb'` and
   `'/rocket/energy-beam-opacity.png'` are literals.
   If `paths.base` changes, these break. Prefer `import { base } from '$app/paths'`.
2. **Possible double render**: `Scene.svelte` adds its own render task to
   `renderStage` and its comment assumes `autoRender=false`, but `+page.svelte`
   doesn't pass `autoRender={false}` to `<Canvas>`. Threlte's default render may
   also run each frame. Verify before changing render code.
3. **4K VRAM cost**: after the swap the model uses ~0.5 GB of GPU memory. Desktop
   GPUs handle this, but low-end phones may struggle. To skip 4K on small screens,
   extend `canUseHiRes()` in `spaceship.svelte`.
4. **Per-frame PMREM**: the environment map is rebuilt every frame, which is the
   main GPU cost. It is what gives the live star reflections on the hull.
5. **Mixed syntax and typing**: `Scene.svelte` is plain JS (`<script>` with JSDoc
   and `@ts-ignore`), `Stars.svelte` is `@ts-nocheck`, and `spaceship.svelte` uses
   Svelte 4 `$$restProps` and `<slot>`. Formatting is also mixed: `.prettierrc` uses
   tabs, while these three files use 2 spaces.
6. **CI deploys on pull requests**, not only on `main`, and the job has no
   `environment: github-pages` block.
7. **Template leftovers**: the `package.json` name is `rocket-ship`, and
   `README.md` is the stock `sv` template.
