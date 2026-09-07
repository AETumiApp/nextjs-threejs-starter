'use client';

/**
 * Scene.tsx — a self-contained Three.js r160 scene as a React 18 client component.
 *
 * Design notes:
 *  - This file is a *client* component ('use client'). It touches the DOM, the
 *    WebGL context and requestAnimationFrame, none of which exist while the page
 *    is server-rendered. Keep all of that here, never in a server component.
 *  - It is meant to be loaded with `next/dynamic(..., { ssr: false })` from a
 *    server component (see ../page.tsx) so the HTML shell ships first and the
 *    3D bundle is fetched only in the browser.
 *  - Cleanup is exhaustive: we cancel the animation frame, remove listeners,
 *    dispose geometries/materials and the renderer, and drop the canvas. This is
 *    what keeps hot-reload, route changes and StrictMode double-mounts leak-free.
 */

import { useEffect, useRef } from 'react';

export default function Scene() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Respect users who asked the OS to reduce motion.
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // Local, mutable handles so the async import and the cleanup function can
    // both see the same objects.
    let renderer: import('three').WebGLRenderer | undefined;
    let animationId = 0;
    let disposed = false;
    let onResize: (() => void) | undefined;
    let cleanupInner: (() => void) | undefined;

    // Dynamic import keeps `three` out of the server bundle and lets Next split
    // it into its own chunk that only downloads in the browser.
    import('three')
      .then((THREE) => {
        if (disposed || !container) return;

        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#0b0d12');

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 0, 5);

        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.appendChild(renderer.domElement);

        // A single lit mesh — the "hello world" of a real scene.
        const geometry = new THREE.IcosahedronGeometry(1.3, 0);
        const material = new THREE.MeshStandardMaterial({
          color: '#6ea8ff',
          roughness: 0.25,
          metalness: 0.1,
          flatShading: true,
        });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        const keyLight = new THREE.DirectionalLight('#ffffff', 2.2);
        keyLight.position.set(3, 4, 5);
        scene.add(keyLight);
        scene.add(new THREE.AmbientLight('#2a3a55', 1.4));

        const clock = new THREE.Clock();

        const renderFrame = () => {
          const t = clock.getElapsedTime();
          mesh.rotation.x = t * 0.25;
          mesh.rotation.y = t * 0.35;
          renderer!.render(scene, camera);
        };

        const animate = () => {
          animationId = requestAnimationFrame(animate);
          renderFrame();
        };

        onResize = () => {
          if (!container || !renderer) return;
          const w = container.clientWidth || window.innerWidth;
          const h = container.clientHeight || window.innerHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
          renderFrame();
        };
        window.addEventListener('resize', onResize);

        if (prefersReducedMotion) {
          // Draw one static frame instead of animating.
          renderFrame();
        } else {
          animate();
        }

        cleanupInner = () => {
          if (animationId) cancelAnimationFrame(animationId);
          if (onResize) window.removeEventListener('resize', onResize);
          geometry.dispose();
          material.dispose();
        };
      })
      .catch((err) => {
        // WebGL can be unavailable (blocked, headless, old GPU). Fail quietly —
        // the poster fallback from page.tsx stays visible underneath.
        console.error('Failed to initialise Three.js scene:', err);
      });

    return () => {
      disposed = true;
      cleanupInner?.();
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
