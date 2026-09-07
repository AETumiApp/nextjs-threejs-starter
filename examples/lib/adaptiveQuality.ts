/**
 * adaptiveQuality.ts — pure, framework-free logic for scaling render quality to
 * the device it is actually running on.
 *
 * The renderer measures how long recent frames took; this module turns that
 * measurement into a **quality tier** and the concrete settings (pixel-ratio
 * cap, antialiasing) that tier implies. It contains no Three.js, no DOM and no
 * timers, so every branch is deterministic and unit-testable — see
 * `adaptiveQuality.test.ts`.
 *
 * Two properties matter for a smooth experience:
 *
 *  1. **Hysteresis.** The frame rate that triggers a *downgrade* (`downgradeFps`)
 *     is strictly lower than the one that triggers an *upgrade* (`upgradeFps`).
 *     The band between them is a dead zone where nothing changes, so a device
 *     hovering near a threshold does not flip tiers every window.
 *  2. **Cooldown.** After any change the controller ignores further changes for
 *     `cooldownMs` of real time, giving the GPU time to settle before we judge it
 *     again. The cooldown is time-based (milliseconds), not frame- or
 *     window-based, so it lasts the same wall-clock duration however often the
 *     caller samples — the caller threads the remaining cooldown back in together
 *     with the elapsed time since the previous decision.
 */

/** Render-quality tiers, ordered from cheapest to richest. */
export type QualityTier = 'low' | 'medium' | 'high';

/** Tiers in ascending cost order; the single source of truth for ordering. */
export const TIER_ORDER: readonly QualityTier[] = ['low', 'medium', 'high'];

/** Thresholds that drive tier changes. All values are in frames-per-second. */
export interface AdaptiveQualityOptions {
  /** Average FPS at or below which we step down a tier. */
  readonly downgradeFps: number;
  /** Average FPS at or above which we step up a tier. */
  readonly upgradeFps: number;
  /** Milliseconds of real time to wait after a change before another is allowed. */
  readonly cooldownMs: number;
}

/**
 * Sensible defaults for a 60 Hz target. The 45–57 dead zone keeps a device that
 * settles in the low-50s from oscillating, and ~1.5 s of cooldown absorbs
 * transient spikes such as a texture upload or a GC pause. Because the cooldown
 * is wall-clock time (not a frame count), it lasts ~1.5 s whether the caller
 * decides every frame or once per multi-frame window.
 */
export const DEFAULT_ADAPTIVE_OPTIONS: AdaptiveQualityOptions = {
  downgradeFps: 45,
  upgradeFps: 57,
  cooldownMs: 1500,
};

/** Concrete renderer settings a tier maps to. */
export interface TierSettings {
  /**
   * Upper bound applied on top of `window.devicePixelRatio`. The renderer should
   * use `Math.min(devicePixelRatio, maxPixelRatio)` so a 3× phone never paints
   * 9× the pixels of a logical one.
   */
  readonly maxPixelRatio: number;
  /**
   * Whether MSAA should be requested. Note this can only be honoured at renderer
   * construction — a live tier change adjusts pixel ratio only (see Scene.tsx).
   */
  readonly antialias: boolean;
}

const TIER_SETTINGS: Readonly<Record<QualityTier, TierSettings>> = {
  low: { maxPixelRatio: 1, antialias: false },
  medium: { maxPixelRatio: 1.5, antialias: true },
  high: { maxPixelRatio: 2, antialias: true },
};

/** Concrete renderer settings for a tier. Total and pure. */
export function tierSettings(tier: QualityTier): TierSettings {
  return TIER_SETTINGS[tier];
}

/** Position of a tier in {@link TIER_ORDER} (0 = low … 2 = high). */
export function tierIndex(tier: QualityTier): number {
  return TIER_ORDER.indexOf(tier);
}

/** Map an integer index to a tier, clamping out-of-range values into bounds. */
export function clampTier(index: number): QualityTier {
  const clamped = Math.max(0, Math.min(TIER_ORDER.length - 1, Math.trunc(index)));
  return TIER_ORDER[clamped];
}

/**
 * Mean frames-per-second implied by a set of frame durations (milliseconds).
 * Returns 0 for an empty sample. Non-finite or non-positive durations are
 * ignored so a paused tab (huge `dt`) or a bogus 0 ms frame cannot skew the
 * average or divide by zero.
 */
export function averageFps(frameDurationsMs: readonly number[]): number {
  let sum = 0;
  let count = 0;
  for (const dt of frameDurationsMs) {
    if (Number.isFinite(dt) && dt > 0) {
      sum += dt;
      count += 1;
    }
  }
  if (count === 0) return 0;
  const meanMs = sum / count;
  return 1000 / meanMs;
}

/** Result of {@link recommendTier}: the next tier plus bookkeeping. */
export interface TierRecommendation {
  /** The tier to use for upcoming frames. */
  readonly tier: QualityTier;
  /** Remaining cooldown, in milliseconds, before another change is permitted. */
  readonly cooldown: number;
  /** True when this call moved to a different tier. */
  readonly changed: boolean;
}

/**
 * Decide the next quality tier from a measured average FPS.
 *
 * Pure and total: given the same inputs it always returns the same result and
 * never throws. The caller owns the FPS sampling (a ring buffer in the render
 * loop) and threads `cooldown` back in on the next call.
 *
 * @param currentTier the tier currently in effect
 * @param averageFps  mean FPS over the most recent window (see {@link averageFps})
 * @param cooldown    milliseconds of cooldown remaining before a change is allowed
 * @param elapsedMs   real time elapsed since the previous decision, in ms; the
 *                    cooldown is drained by this, so passing the true frame/window
 *                    duration makes the cooldown last a fixed wall-clock time
 * @param opts        thresholds; defaults to {@link DEFAULT_ADAPTIVE_OPTIONS}
 */
export function recommendTier(
  currentTier: QualityTier,
  averageFps: number,
  cooldown: number,
  elapsedMs: number,
  opts: AdaptiveQualityOptions = DEFAULT_ADAPTIVE_OPTIONS,
): TierRecommendation {
  // Still cooling down from a previous change: hold, and drain the timer by the
  // real time elapsed since the last decision (never below zero).
  if (cooldown > 0) {
    const drain = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0;
    return { tier: currentTier, cooldown: Math.max(0, cooldown - drain), changed: false };
  }

  // Guard against a not-yet-measured or degenerate sample.
  if (!Number.isFinite(averageFps) || averageFps <= 0) {
    return { tier: currentTier, cooldown: 0, changed: false };
  }

  const index = tierIndex(currentTier);

  // Struggling and we have somewhere lower to go → step down one tier.
  if (averageFps <= opts.downgradeFps && index > 0) {
    return {
      tier: clampTier(index - 1),
      cooldown: opts.cooldownMs,
      changed: true,
    };
  }

  // Comfortable headroom and room to grow → step up one tier.
  if (averageFps >= opts.upgradeFps && index < TIER_ORDER.length - 1) {
    return {
      tier: clampTier(index + 1),
      cooldown: opts.cooldownMs,
      changed: true,
    };
  }

  // Inside the hysteresis band, or already pinned at an extreme: no change.
  return { tier: currentTier, cooldown: 0, changed: false };
}

/** A fixed-capacity ring of frame durations for feeding {@link averageFps}. */
export interface FrameWindow {
  /** Push a frame duration (ms); returns whether the window is now full. */
  push(dtMs: number): boolean;
  /** Mean FPS across the samples collected so far (0 when empty). */
  fps(): number;
  /** Discard all samples (call after acting on a full window). */
  reset(): void;
  /** Number of samples currently held. */
  readonly size: number;
  /** Maximum number of samples retained. */
  readonly capacity: number;
}

/**
 * Create a small mutable ring buffer of frame durations. This is the one stateful
 * helper in the module, kept trivial and side-effect-free beyond its own array so
 * it is still easy to reason about and test. The pure decision logic above does
 * the interesting work.
 *
 * @param capacity number of frames to average over (default 40, ~0.6 s at 60fps)
 */
export function createFrameWindow(capacity = 40): FrameWindow {
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new RangeError(`FrameWindow capacity must be a positive integer, got ${capacity}`);
  }
  const samples: number[] = [];
  return {
    capacity,
    get size() {
      return samples.length;
    },
    push(dtMs: number): boolean {
      samples.push(dtMs);
      if (samples.length > capacity) samples.shift();
      return samples.length >= capacity;
    },
    fps(): number {
      return averageFps(samples);
    },
    reset(): void {
      samples.length = 0;
    },
  };
}
