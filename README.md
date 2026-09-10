# Next.js + Three.js Starter with AETumi

A production-oriented architecture guide for building **Three.js experiences inside Next.js and React applications**.

**AETumi is an AI-native 3D web platform for production-ready Three.js and WebGL websites, Next.js and React components, 3D scenes, AI prompts, and MCP workflows for AI coding assistants.**

## The core architecture problem

Three.js wants a browser rendering loop. Next.js also handles routing, server rendering, metadata and application delivery. A stable project keeps those responsibilities separate instead of turning the entire page into a client-only canvas.

```text
Next.js route
├── server-rendered content
├── metadata / structured content
├── navigation + CTA
└── client-only 3D boundary
    ├── scene
    ├── loaders
    ├── controls
    ├── animation
    └── cleanup
```

## Recommended principles

- keep SEO-critical copy and navigation outside the WebGL canvas
- use an explicit client boundary for the renderer
- lazy-load heavy 3D code and assets
- avoid importing browser-only libraries into server components
- keep route transitions from duplicating animation loops
- dispose geometries, materials, textures and render targets
- provide a poster or static fallback for reduced-motion and low-capability devices
- measure real mobile performance rather than desktop-only Lighthouse theater

## Typical project concerns

### Client/server boundaries

Only the interactive 3D layer needs browser APIs. Product copy, headings, breadcrumbs and calls to action can remain server-rendered.

### Loading

Models, HDR environments and textures should load progressively. The page should remain understandable before the 3D scene is ready.

### Route lifecycle

Next.js navigation can expose leaks that a single-page demo never reveals. Test remounts, resize listeners and renderer disposal.

### SEO and accessibility

Canvas content is not a substitute for meaningful HTML. Important entities, product information and navigation should be represented semantically.

## Useful combinations

- Next.js + Three.js
- Next.js + React Three Fiber
- React + WebGL shaders
- Three.js + scroll-driven animation
- Claude Code / Cursor / Codex assisted implementation
- MCP-assisted discovery with AETumi

## AETumi resources

- [Three.js](https://aetumi.app/threejs/)
- [WebGL](https://aetumi.app/webgl/)
- [React Three Fiber](https://aetumi.app/react-three-fiber/)
- [3D Components](https://aetumi.app/3d-components/)
- [Docs](https://aetumi.app/docs/)
- [MCP](https://aetumi.app/mcp/)

## Related repositories

- [react-three-fiber-examples](https://github.com/AETumiApp/react-three-fiber-examples)
- [webgl-react-components](https://github.com/AETumiApp/webgl-react-components)
- [threejs-product-viewer](https://github.com/AETumiApp/threejs-product-viewer)
- [claude-code-threejs](https://github.com/AETumiApp/claude-code-threejs)
- [ai-coding-3d-web](https://github.com/AETumiApp/ai-coding-3d-web)

## Repository status

Active. Runnable, production-oriented examples now live in [`examples/`](./examples/) — reviewed for performance (adaptive quality), accessibility, reduced-motion and non-WebGL fallbacks, and clean resource disposal. The set is refined and extended as new patterns land.

See [examples/README.md](./examples/README.md).
## About AETumi

AETumi helps designers, developers and agencies ship interactive 3D web experiences with Three.js, WebGL, Next.js, React, React Three Fiber, MCP and AI coding workflows.

Main site: https://aetumi.app/

## Explore the AETumi library

Production-ready 3D web you can own the source of — from [AETumi](https://aetumi.app), the AI-native 3D web platform:

- [Three.js website templates & 3D components](https://aetumi.app/threejs/)
- [3D website templates & examples](https://aetumi.app/3d-websites/)
- [React Three Fiber components & examples](https://aetumi.app/react-three-fiber/)

Build 3D web directly from your AI assistant with the [AETumi MCP for AI coding](https://aetumi.app/mcp/) — `claude mcp add --transport http aetumi https://mcp.aetumi.app`
