# Next.js + Three.js Starter — examples

Idiomatic **Next.js 14 (App Router) + React 18 + three 0.160.0** source for the
one pattern that trips people up most: *server-rendered, crawlable HTML with a
client-only 3D island*.

Hub: <https://aetumi.app/nextjs-threejs-starter>

## What's in here

| File | Role |
| --- | --- |
| [`app/page.tsx`](./app/page.tsx) | **Server Component**. Owns SEO metadata and semantic HTML. Loads the scene with `next/dynamic({ ssr: false })` and renders a poster fallback. |
| [`app/scene/Scene.tsx`](./app/scene/Scene.tsx) | **Client Component** (`'use client'`). Mounts a Three.js r160 scene via a dynamic `import('three')`, animates it, respects `prefers-reduced-motion`, and disposes everything on unmount. |

These are copy-pasteable source files, not a full app — drop them into a fresh
Next.js project (below) under the same paths.

## The core idea: HTML on the server, 3D in the browser

WebGL, `window`, `requestAnimationFrame` and the DOM do not exist during server
rendering. If you import `three` at the top of a server component your build
breaks. The fix is a clean split:

- **Server side** renders your headings, copy and `<Metadata>` so Google, Bing
  and social scrapers get real content and your LCP element is text, not a
  canvas.
- **Client side** loads the scene *after* hydration. `next/dynamic` with
  `ssr: false` guarantees the Three.js chunk is never evaluated on the server,
  and its `loading` option shows a poster until the scene is ready.

This keeps three wins at once: **SEO** (indexable text), **performance** (the 3D
bundle is code-split and deferred), and **resilience** (the poster is the
fallback when WebGL is blocked or the GPU is too weak).

## Create a fresh project

```bash
npx create-next-app@14 my-3d-site --ts --app --eslint
cd my-3d-site
npm install three@0.160.0
npm install -D @types/three@0.160.0
```

Then copy `app/page.tsx` and `app/scene/Scene.tsx` from this folder into your
project's `app/` directory and run:

```bash
npm run dev
```

## Notes for correctness

- **Pin three and its types together.** `three@0.160.0` with
  `@types/three@0.160.0` avoids API/type drift.
- **`import('three')` inside `useEffect`** (as in `Scene.tsx`) is what code-splits
  the library and keeps it out of the server bundle.
- **Dispose on unmount.** `Scene.tsx` cancels the RAF loop, removes the resize
  listener, and disposes geometry, material and the renderer. This is what makes
  it survive React StrictMode double-mounts and route changes without leaking
  WebGL contexts.
- **Cap the pixel ratio** at `Math.min(window.devicePixelRatio, 2)` so retina
  phones don't render 3–4× more pixels than they need.
- **Replace the poster** in `page.tsx` with a real static screenshot of your
  scene (`/public/poster.jpg`) for the best first paint.

---

## Example backlog / roadmap

# Next.js + Three.js Example Backlog

## Planned examples

### Server page + client 3D hero

Demonstrate a server-rendered page with semantic heading, supporting copy and CTA while the Three.js scene loads behind an explicit client boundary.

### Dynamic scene loading

Show how to defer a heavy scene until the browser is ready without blocking useful page content.

### Route cleanup

Demonstrate predictable teardown for render loops, event listeners, geometries, materials and textures during navigation.

### React Three Fiber variant

Provide the same page architecture using React Three Fiber so developers can compare imperative Three.js and component-driven scene approaches.

### Reduced-motion fallback

Render a static poster or simplified state when motion is reduced or WebGL capability is limited.

## Acceptance criteria

Each example should include:

- clear client/server boundaries
- semantic HTML outside canvas
- loading and error states
- mobile behavior
- cleanup strategy
- performance notes

## AETumi links

- https://aetumi.app/threejs/
- https://aetumi.app/react-three-fiber/
- https://aetumi.app/docs/
