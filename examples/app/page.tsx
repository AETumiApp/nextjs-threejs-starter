/**
 * page.tsx — a **server component** (no 'use client' here).
 *
 * The whole point of this starter: the page's text, headings and metadata are
 * server-rendered HTML that search engines and social crawlers read directly.
 * The 3D canvas is a separate client-only island loaded with `next/dynamic`
 * ({ ssr: false }) so WebGL never runs on the server, and a poster image is
 * shown until the scene's JS has downloaded and mounted.
 */

import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

// ssr:false is only allowed from a Client Component in the pages router, but in
// the App Router a Server Component may use it for a component that itself is a
// client island — which is exactly Scene. The dynamic import also code-splits
// the Three.js bundle into its own chunk.
const Scene = dynamic(() => import('./scene/Scene'), {
  ssr: false,
  loading: () => <Poster />,
});

export const metadata: Metadata = {
  title: 'Next.js + Three.js Starter — server HTML, client 3D',
  description:
    'An App Router starter that server-renders semantic, crawlable HTML and mounts a Three.js r160 scene as a client-only island with a poster fallback.',
  openGraph: {
    title: 'Next.js + Three.js Starter',
    description:
      'Server-rendered SEO HTML with a client-only Three.js r160 scene and poster fallback.',
    type: 'website',
  },
};

function Poster() {
  // A lightweight placeholder that fills the same box as the canvas. Swap the
  // gradient for a real static screenshot of your scene (e.g. /poster.jpg) so
  // the first paint already looks like the finished 3D.
  return (
    <div
      role="img"
      aria-label="Preview of the interactive 3D scene"
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'radial-gradient(120% 120% at 70% 20%, #1b2740 0%, #0b0d12 60%)',
      }}
    />
  );
}

export default function Page() {
  return (
    <main>
      {/* The hero: crawlable copy in the DOM, 3D layered behind it. */}
      <section
        aria-labelledby="hero-title"
        style={{ position: 'relative', minHeight: '100svh', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <Scene />
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: '46rem',
            margin: '0 auto',
            padding: '6rem 1.5rem',
            color: '#e8edf6',
          }}
        >
          <p style={{ letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: '0.8rem', opacity: 0.7 }}>
            Next.js 14 · React 18 · three 0.160
          </p>
          <h1 id="hero-title" style={{ fontSize: 'clamp(2.2rem, 6vw, 4rem)', lineHeight: 1.05, margin: '0.5rem 0 1rem' }}>
            Server-rendered HTML, client-rendered 3D
          </h1>
          <p style={{ fontSize: '1.15rem', lineHeight: 1.6, opacity: 0.9 }}>
            The words you are reading were rendered on the server and are visible
            to crawlers with JavaScript disabled. The moving scene behind them is
            a client-only island that loads after the HTML, so your Largest
            Contentful Paint stays fast and your metadata stays accurate.
          </p>
        </div>
      </section>

      {/* Ordinary, indexable content below the fold. */}
      <section aria-labelledby="how-title" style={{ maxWidth: '46rem', margin: '0 auto', padding: '4rem 1.5rem' }}>
        <h2 id="how-title">How the split works</h2>
        <ol>
          <li>
            <strong>page.tsx</strong> is a Server Component. It owns the SEO
            metadata and renders semantic HTML.
          </li>
          <li>
            <strong>Scene.tsx</strong> is a Client Component loaded via{' '}
            <code>next/dynamic</code> with <code>ssr: false</code>, so Three.js
            only runs in the browser.
          </li>
          <li>
            A <strong>poster</strong> fills the canvas box during load, giving a
            clean first paint and a graceful fallback when WebGL is unavailable.
          </li>
        </ol>
      </section>
    </main>
  );
}
