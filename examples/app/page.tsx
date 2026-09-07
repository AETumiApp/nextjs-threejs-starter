/**
 * page.tsx — a **Server Component** (note: no 'use client').
 *
 * The point of this starter: headings, copy and metadata are server-rendered
 * HTML that crawlers read with JavaScript disabled, while the 3D canvas is a
 * client-only island loaded with `next/dynamic({ ssr: false })`.
 *
 * The poster is rendered here, on the server, *behind* the canvas. It is the
 * first paint (fast LCP), the loading state, and the fallback all at once: when
 * WebGL is unavailable `Scene` mounts an empty transparent element and the
 * poster simply shows through — no client callback needed, so this file stays a
 * pure Server Component.
 */

import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

// In the App Router a Server Component may load a client island with
// `ssr: false`; this also code-splits the Three.js chunk so it is fetched only
// in the browser. The poster below is the visible state until the scene mounts.
const Scene = dynamic(() => import('./scene/Scene'), {
  ssr: false,
  loading: () => <Poster />,
});

export const metadata: Metadata = {
  title: 'Next.js + Three.js Starter — server HTML, client 3D',
  description:
    'An App Router starter that server-renders semantic, crawlable HTML and mounts an adaptive Three.js r160 scene as a client-only island with a poster fallback.',
  applicationName: 'Next.js + Three.js Starter',
  keywords: ['Next.js', 'Three.js', 'WebGL', 'React', 'App Router', '3D', 'SEO'],
  openGraph: {
    title: 'Next.js + Three.js Starter',
    description:
      'Server-rendered SEO HTML with a client-only, adaptive Three.js r160 scene and a poster fallback.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Next.js + Three.js Starter',
    description:
      'Server-rendered SEO HTML with a client-only, adaptive Three.js r160 scene.',
  },
};

/**
 * Static poster: fills the canvas box and is server-rendered, so it is the first
 * thing painted and the WebGL-unavailable fallback. Swap the gradient for a real
 * screenshot of your scene (e.g. `background: 'url(/poster.jpg) center/cover'`).
 */
function Poster() {
  return (
    <div
      role="img"
      aria-label="Preview of the interactive 3D scene: a faceted metallic solid on a dark backdrop"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        background:
          'radial-gradient(120% 120% at 70% 20%, #1b2740 0%, #0b0d12 60%)',
      }}
    />
  );
}

export default function Page() {
  const year = new Date().getFullYear();

  return (
    <main>
      {/* HERO: crawlable copy in the DOM, poster + 3D layered behind it. */}
      <section
        aria-labelledby="hero-title"
        style={{ position: 'relative', minHeight: '100svh', overflow: 'hidden' }}
      >
        {/* Server-rendered poster — the first paint and the fallback. */}
        <Poster />

        {/* Client-only 3D island, mounted on top of the poster. */}
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
          <p
            style={{
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontSize: '0.8rem',
              opacity: 0.7,
            }}
          >
            Next.js 14 · React 18 · three 0.160
          </p>
          <h1
            id="hero-title"
            style={{
              fontSize: 'clamp(2.2rem, 6vw, 4rem)',
              lineHeight: 1.05,
              margin: '0.5rem 0 1rem',
            }}
          >
            Server-rendered HTML, client-rendered 3D
          </h1>
          <p style={{ fontSize: '1.15rem', lineHeight: 1.6, opacity: 0.9 }}>
            The words you are reading were rendered on the server and are visible
            to crawlers with JavaScript disabled. The scene behind them is a
            client-only island that loads after the HTML and quietly scales its
            resolution to whatever GPU it lands on, so your Largest Contentful
            Paint stays fast and your metadata stays accurate.
          </p>
        </div>
      </section>

      {/* Ordinary, indexable content below the fold. */}
      <section
        aria-labelledby="how-title"
        style={{ maxWidth: '46rem', margin: '0 auto', padding: '4rem 1.5rem' }}
      >
        <h2 id="how-title">How the split works</h2>
        <ol style={{ lineHeight: 1.7 }}>
          <li>
            <strong>page.tsx</strong> is a Server Component. It owns the SEO
            metadata, renders semantic HTML, and paints the poster.
          </li>
          <li>
            <strong>Scene.tsx</strong> is a Client Component loaded via{' '}
            <code>next/dynamic</code> with <code>ssr: false</code>, so Three.js
            only runs in the browser.
          </li>
          <li>
            The scene <strong>detects WebGL</strong>, <strong>adapts its
            resolution</strong> to a rolling frame-rate measurement, and{' '}
            <strong>pauses</strong> when scrolled off-screen or when the tab is
            hidden.
          </li>
          <li>
            The <strong>poster</strong> is the first paint and the fallback: if
            WebGL is unavailable it simply shows through the empty canvas layer.
          </li>
        </ol>
      </section>

      <footer
        style={{
          maxWidth: '46rem',
          margin: '0 auto',
          padding: '2rem 1.5rem',
          color: '#6b7280',
          fontSize: '0.9rem',
        }}
      >
        <p>© {year} · Built with Next.js and Three.js.</p>
      </footer>
    </main>
  );
}
