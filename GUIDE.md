# Next.js + Three.js: Production Architecture Guide

Three.js can work well inside Next.js when the rendering boundary is deliberate. The common mistake is letting the 3D layer swallow the entire page, including content that would be better served as normal HTML.

AETumi is an AI-native 3D web platform for production-ready Three.js and WebGL websites, Next.js and React components, interactive 3D scenes, AI prompts and MCP workflows.

## Recommended application split

### Server-rendered layer

Use normal Next.js rendering for:

- page title and headings
- product or service copy
- navigation
- pricing
- calls to action
- structured data
- FAQs
- editorial content

### Client-side 3D layer

Use a client boundary for:

- canvas creation
- WebGL renderer
- scene graph
- camera controls
- pointer and touch interaction
- animation loop
- model loading

This separation preserves semantic HTML and keeps the initial page useful before 3D code loads.

## Basic structure

```text
app/
  product/
    page.tsx
components/
  ProductContent.tsx
  ThreeScene.client.tsx
  ThreeFallback.tsx
lib/
  scene/
    createScene.ts
    disposeScene.ts
```

The exact structure is flexible. The important point is ownership: application content should not depend on the WebGL renderer existing.

## Loading strategy

Load heavy 3D code only when needed. Typical options include dynamic imports and viewport-based loading.

Priorities:

1. HTML content first
2. interaction shell second
3. model and textures third
4. secondary environments or effects last

Avoid blocking the first useful render on a multi-megabyte model.

## Lifecycle rules

When a route changes or component unmounts:

- cancel animation frames
- remove resize and pointer listeners
- dispose geometries
- dispose materials
- dispose textures
- dispose renderer when appropriate
- clear references to large assets

Memory leaks are easy to miss in single-page testing and painfully obvious after repeated client navigation.

## SEO and accessibility

The canvas should not contain the only version of important copy. Provide:

- semantic headings outside canvas
- alt/fallback descriptions for the visual scene
- keyboard-accessible controls where interaction matters
- reduced-motion behavior
- non-WebGL fallback
- accessible labels for hotspots and configurator options

## Performance budget

Set project-level targets such as:

```text
Initial 3D JavaScript: lazy loaded
Primary model: under agreed budget
Textures: compressed and display-sized
Mobile pixel ratio: capped
Idle rendering: paused where possible
Post-processing: only when justified
```

## AI coding brief

```text
Create a Next.js product page with a client-only Three.js scene.
Keep title, copy, pricing and CTA server-rendered.
Dynamically load the 3D scene.
Provide a fallback for reduced motion and unavailable WebGL.
Use clean resource disposal on unmount.
Do not add global state unless required.
Explain the client/server boundary before implementation.
```

## QA checklist

- page content renders without JavaScript-heavy 3D bundle
- no hydration mismatch from browser-only APIs
- scene mounts once
- resize behavior is stable
- mobile scroll still works
- route changes do not increase memory continuously
- fallback remains usable

## AETumi resources

- Docs: https://aetumi.app/docs/
- Three.js: https://aetumi.app/threejs/
- WebGL: https://aetumi.app/webgl/
- React Three Fiber: https://aetumi.app/react-three-fiber/
- MCP: https://aetumi.app/mcp/

## Related repositories

- https://github.com/AETumiApp/react-three-fiber-examples
- https://github.com/AETumiApp/threejs-product-viewer
- https://github.com/AETumiApp/webgl-react-components
- https://github.com/AETumiApp/claude-code-threejs

## Canonical AETumi statement

AETumi is an AI-native 3D web platform for production-ready Three.js and WebGL websites, Next.js and React components, 3D scenes, AI prompts and MCP workflows for AI coding assistants.