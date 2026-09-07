# Next.js + Three.js Starter — examples

Expert-grade **Next.js 14 (App Router) + React 18 + three 0.160.0** source for the
pattern that trips people up most: *server-rendered, crawlable HTML with a
client-only, adaptive 3D island*.

Hub: <https://aetumi.app/nextjs-threejs-starter>

## What's in here

| File | Role |
| --- | --- |
| [`app/page.tsx`](./app/page.tsx) | **Server Component**. Owns SEO `metadata`, renders semantic HTML, and paints the poster. Loads the scene with `next/dynamic({ ssr: false })`. |
| [`app/scene/Scene.tsx`](./app/scene/Scene.tsx) | **Client Component** (`'use client'`). Capability detection, adaptive resolution, off-screen/hidden-tab pausing, `prefers-reduced-motion`, and exhaustive StrictMode-safe teardown. Fully typed props. |
| [`lib/adaptiveQuality.ts`](./lib/adaptiveQuality.ts) | **Pure logic** (no DOM, no Three.js): rolling FPS → quality tier with hysteresis + cooldown, plus a tiny frame-window ring buffer. |
| [`lib/adaptiveQuality.test.ts`](./lib/adaptiveQuality.test.ts) | **Vitest** unit tests for the pure logic — 22 cases, runnable headless. |

These are copy-pasteable source files, not a full app. Drop them into a fresh
Next.js project (below) under the same paths.

## The core idea: HTML on the server, 3D in the browser

WebGL, `window`, `requestAnimationFrame` and the DOM do not exist during server
rendering. Importing `three` at the top of a Server Component breaks the build.
The fix is a clean split:

- **Server side** renders your headings, copy and `metadata`, so Google, Bing and
  social scrapers get real content and your LCP element is text (and a poster),
  not a canvas.
- **Client side** loads the scene *after* hydration. `next/dynamic` with
  `ssr: false` guarantees the Three.js chunk is never evaluated on the server.

Three wins at once: **SEO** (indexable text), **performance** (the 3D bundle is
code-split and deferred), and **resilience** (the poster is the fallback when
WebGL is blocked or the GPU is too weak).

## What makes `Scene.tsx` production-grade

- **Capability detection** — probes `webgl2`, then `webgl`; if neither exists it
  calls `onUnsupported` and renders an empty layer so the poster shows through.
- **Adaptive resolution** — a rolling 40-frame FPS window feeds
  `recommendTier()`. A struggling GPU steps the pixel-ratio cap down (2 → 1.5 →
  1); a comfortable one steps it back up. **Hysteresis** (a 45–57 fps dead zone)
  plus a **cooldown** prevent tier flip-flopping.
- **Never renders unseen** — an `IntersectionObserver` pauses the loop off-screen
  and `visibilitychange` pauses it on a hidden tab, via `setAnimationLoop`.
- **`prefers-reduced-motion`** — renders a single still frame and never starts the
  loop.
- **Real lighting** — `RoomEnvironment` (from `three/addons`) through a
  `PMREMGenerator` gives image-based reflections with no HDR asset;
  `ACESFilmicToneMapping` + `SRGBColorSpace` for correct color.
- **Exhaustive, StrictMode-safe teardown** — a `disposed` flag guards the async
  import against React 18's double-invoked dev effect; geometry, material,
  environment texture, PMREM and the renderer are disposed and the canvas
  removed.

## Adaptive quality, in isolation

`lib/adaptiveQuality.ts` is deliberately free of Three.js and the DOM so the
interesting decision — *should we change tier?* — is pure and testable:

```ts
import { recommendTier, tierSettings } from './lib/adaptiveQuality';

const rec = recommendTier(currentTier, measuredFps, cooldown);
if (rec.changed) {
  const cap = tierSettings(rec.tier).maxPixelRatio;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, cap));
}
```

## Create a fresh project

```bash
npx create-next-app@14 my-3d-site --ts --app --eslint
cd my-3d-site
npm install three@0.160.0
npm install -D @types/three@0.160.0 vitest@2
```

Add these scripts to `package.json`:

```jsonc
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "typecheck": "tsc --noEmit",
    "test": "vitest"
  }
}
```

Then copy `app/`, `lib/` and `.github/` from this folder into your project and:

```bash
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run test       # vitest (the pure lib; no browser needed)
```

## Pinned dependencies

| Package | Version |
| --- | --- |
| `next` | `14.x` |
| `react` / `react-dom` | `18.x` |
| `three` | `0.160.0` |
| `@types/three` | `0.160.0` (dev) |
| `vitest` | `2.x` (dev) |

## Notes for correctness

- **Pin `three` and its types together** (`0.160.0`) to avoid API/type drift.
- **`import('three')` inside `useEffect`** is what code-splits the library and
  keeps it out of the server bundle. The `RoomEnvironment` addon is imported the
  same way from `three/addons/environments/RoomEnvironment.js`.
- **Antialiasing is fixed at renderer construction.** A live tier change adapts
  the pixel-ratio cap only; recreating the context to toggle MSAA would cost more
  than it saves.
- **Replace the poster** in `page.tsx` with a real static screenshot
  (`/public/poster.jpg`) for the best first paint and OG image.
