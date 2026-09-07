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