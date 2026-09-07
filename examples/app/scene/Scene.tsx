'use client';

/**
 * Scene.tsx — a production-grade Three.js r160 scene as a React 18 client island.
 *
 * What "production-grade" means here:
 *  - **Capability detection first.** WebGL2 → WebGL → give up (call `onUnsupported`
 *    and render nothing so the server-rendered poster shows through).
 *  - **Adaptive quality.** A rolling FPS window drives the pixel-ratio cap up and
 *    down with hysteresis (see ../../lib/adaptiveQuality). A weak GPU quietly
 *    settles at a lower resolution instead of dropping frames.
 *  - **Never renders when it can't be seen.** An IntersectionObserver pauses the
 *    loop when the canvas scrolls off-screen and `visibilitychange` pauses it when
 *    the tab is hidden — no wasted battery, no background GPU churn.
 *  - **Respects `prefers-reduced-motion`.** Renders exactly one frame, no loop.
 *  - **Exhaustive, StrictMode-safe teardown.** The async import is guarded by a
 *    `disposed` flag so React 18's double-invoked dev effect can't double-init or
 *    leak a WebGL context; geometries, materials, environment, PMREM and the
 *    renderer are all disposed and the canvas removed.
 *
 * Mount it via `next/dynamic(() => import('./scene/Scene'), { ssr: false })` from a
 * Server Component so Three.js never touches the server bundle. See ../page.tsx.
 */

import { useEffect, useRef, type CSSProperties } from 'react';
import type * as THREE from 'three';
import {
  DEFAULT_ADAPTIVE_OPTIONS,
  createFrameWindow,
  recommendTier,
  tierSettings,
  type AdaptiveQualityOptions,
  type QualityTier,
} from '../../lib/adaptiveQuality';

export interface SceneProps {
  /** Class applied to the container element. */
  className?: string;
  /** Inline styles merged onto the container (defaults to fill-parent block). */
  style?: CSSProperties;
  /** Quality tier to start at before the first FPS window settles. */
  initialTier?: QualityTier;
  /** Override any of the adaptive-quality thresholds. */
  qualityOptions?: Partial<AdaptiveQualityOptions>;
  /**
   * Called once if WebGL is unavailable (blocked, headless, ancient GPU) or the
   * context is lost. Use it to keep a poster/fallback visible in the parent.
   */
  onUnsupported?: () => void;
}

/** Detect the best available WebGL context without leaking the probe canvas. */
function detectRenderMode(): 'webgl2' | 'webgl' | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  try {
    if (canvas.getContext('webgl2')) return 'webgl2';
    if (
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl' as 'webgl')
    ) {
      return 'webgl';
    }
    return null;
  } catch {
    return null;
  }
}

export default function Scene({
  className,
  style,
  initialTier = 'high',
  qualityOptions,
  onUnsupported,
}: SceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Keep the latest onUnsupported without re-running the heavy effect.
  const onUnsupportedRef = useRef(onUnsupported);
  onUnsupportedRef.current = onUnsupported;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const options: AdaptiveQualityOptions = { ...DEFAULT_ADAPTIVE_OPTIONS, ...qualityOptions };

    const mode = detectRenderMode();
    if (mode === null) {
      onUnsupportedRef.current?.();
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    // Mutable handles shared between the async import and the cleanup closure.
    let disposed = false;
    let renderer: THREE.WebGLRenderer | undefined;
    let cleanupInner: (() => void) | undefined;

    // Guard against a stray canvas left by a previous (StrictMode) mount.
    container.replaceChildren();

    // Load three (and the RoomEnvironment addon) only in the browser; this is
    // what code-splits them out of the server bundle.
    void Promise.all([
      import('three'),
      import('three/addons/environments/RoomEnvironment.js'),
    ])
      .then(([THREE_NS, { RoomEnvironment }]) => {
        if (disposed || !container) return;

        let tier: QualityTier = initialTier;

        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;

        const scene = new THREE_NS.Scene();
        scene.background = new THREE_NS.Color('#0b0d12');

        const camera = new THREE_NS.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 0, 5);

        renderer = new THREE_NS.WebGLRenderer({
          antialias: tierSettings(tier).antialias,
          alpha: false,
          powerPreference: 'high-performance',
        });
        renderer.outputColorSpace = THREE_NS.SRGBColorSpace;
        renderer.toneMapping = THREE_NS.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;

        const applyPixelRatio = () => {
          const cap = tierSettings(tier).maxPixelRatio;
          renderer!.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
        };
        applyPixelRatio();
        renderer.setSize(width, height);
        container.appendChild(renderer.domElement);

        // Image-based lighting from a procedural room — gives the metal its
        // reflections without shipping an HDR file.
        const pmrem = new THREE_NS.PMREMGenerator(renderer);
        const envScene = new RoomEnvironment();
        const envRT = pmrem.fromScene(envScene, 0.04);
        scene.environment = envRT.texture;

        const geometry = new THREE_NS.IcosahedronGeometry(1.3, 0);
        const material = new THREE_NS.MeshStandardMaterial({
          color: '#6ea8ff',
          roughness: 0.18,
          metalness: 0.9,
          flatShading: true,
          envMapIntensity: 1.0,
        });
        const mesh = new THREE_NS.Mesh(geometry, material);
        scene.add(mesh);

        const keyLight = new THREE_NS.DirectionalLight('#ffffff', 2.0);
        keyLight.position.set(3, 4, 5);
        scene.add(keyLight);
        scene.add(new THREE_NS.AmbientLight('#2a3a55', 0.6));

        const clock = new THREE_NS.Clock();
        const frames = createFrameWindow(40);
        // Cooldown is measured in milliseconds of real wall-clock time and is
        // drained by the actual time each window spanned (see the loop below), so
        // the ~1.5s in DEFAULT_ADAPTIVE_OPTIONS holds regardless of window size.
        let cooldownMs = 0;
        let windowElapsedMs = 0;
        let lastTs = (typeof performance !== 'undefined' ? performance : Date).now();

        const renderFrame = () => {
          const t = clock.getElapsedTime();
          mesh.rotation.x = t * 0.25;
          mesh.rotation.y = t * 0.35;
          renderer!.render(scene, camera);
        };

        // The per-frame callback for setAnimationLoop. It both draws and feeds
        // the adaptive-quality controller.
        const loop = () => {
          const now = (typeof performance !== 'undefined' ? performance : Date).now();
          const dt = now - lastTs;
          lastTs = now;
          windowElapsedMs += dt;

          if (frames.push(dt)) {
            // Drain the cooldown by the real time this window spanned, not by a
            // flat "1 per window" — otherwise a 90-unit cooldown would take ~90
            // windows (~60s) instead of the intended ~1.5s.
            const rec = recommendTier(tier, frames.fps(), cooldownMs, windowElapsedMs, options);
            cooldownMs = rec.cooldown;
            if (rec.changed) {
              tier = rec.tier;
              applyPixelRatio(); // AA is fixed at construction; DPR is what we adapt live.
            }
            frames.reset();
            windowElapsedMs = 0;
          }

          renderFrame();
        };

        // ----- run / pause plumbing -------------------------------------------
        let running = false;
        let onScreen = true;
        let pageVisible = typeof document === 'undefined' ? true : !document.hidden;

        const start = () => {
          // Reduced motion is a hard gate: the loop must never start, no matter
          // what scroll (IntersectionObserver) or tab visibility does. We render a
          // single still frame elsewhere; syncRunState() funnels through here, so
          // gating start() keeps reduced motion truly static.
          if (running || !renderer || prefersReducedMotion) return;
          running = true;
          lastTs = (typeof performance !== 'undefined' ? performance : Date).now();
          renderer.setAnimationLoop(loop);
        };
        const stop = () => {
          if (!running || !renderer) return;
          running = false;
          renderer.setAnimationLoop(null);
        };
        const syncRunState = () => {
          if (onScreen && pageVisible) start();
          else stop();
        };

        const onResize = () => {
          if (!renderer || !container) return;
          const w = container.clientWidth || window.innerWidth;
          const h = container.clientHeight || window.innerHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
          renderFrame(); // repaint immediately even while paused
        };
        window.addEventListener('resize', onResize);

        const onVisibility = () => {
          pageVisible = !document.hidden;
          syncRunState();
        };
        document.addEventListener('visibilitychange', onVisibility);

        const observer = new IntersectionObserver(
          (entries) => {
            onScreen = entries.some((e) => e.isIntersecting);
            syncRunState();
          },
          { threshold: 0 },
        );
        observer.observe(container);

        // Context loss: stop cleanly and let the parent restore its poster.
        const onContextLost = (event: Event) => {
          event.preventDefault();
          stop();
          onUnsupportedRef.current?.();
        };
        renderer.domElement.addEventListener('webglcontextlost', onContextLost);

        if (prefersReducedMotion) {
          applyPixelRatio();
          renderFrame(); // a single, still frame — never start the loop
        } else {
          syncRunState();
        }

        cleanupInner = () => {
          stop();
          observer.disconnect();
          window.removeEventListener('resize', onResize);
          document.removeEventListener('visibilitychange', onVisibility);
          renderer?.domElement.removeEventListener('webglcontextlost', onContextLost);

          geometry.dispose();
          material.dispose();
          envRT.texture.dispose();
          pmrem.dispose();
          // RoomEnvironment builds a throwaway scene of meshes; free them too.
          envScene.traverse((obj) => {
            const m = obj as THREE.Mesh;
            m.geometry?.dispose?.();
            const mat = m.material;
            if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
            else mat?.dispose?.();
          });
        };
      })
      .catch((err: unknown) => {
        // Import or init failed → keep the poster; surface to the parent.
        console.error('Failed to initialise Three.js scene:', err);
        onUnsupportedRef.current?.();
      });

    return () => {
      disposed = true;
      cleanupInner?.();
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
        renderer = undefined;
      }
    };
    // Effect intentionally runs once per mount; props are captured above and the
    // callback is read through a ref so changing it never forces a WebGL re-init.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={className}
      style={{ width: '100%', height: '100%', display: 'block', ...style }}
    />
  );
}
