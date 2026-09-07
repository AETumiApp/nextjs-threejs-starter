import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ADAPTIVE_OPTIONS,
  TIER_ORDER,
  averageFps,
  clampTier,
  createFrameWindow,
  recommendTier,
  tierIndex,
  tierSettings,
  type AdaptiveQualityOptions,
} from './adaptiveQuality';

describe('tierSettings', () => {
  it('maps each tier to a distinct, ascending pixel-ratio cap', () => {
    expect(tierSettings('low').maxPixelRatio).toBe(1);
    expect(tierSettings('medium').maxPixelRatio).toBe(1.5);
    expect(tierSettings('high').maxPixelRatio).toBe(2);
    expect(tierSettings('low').antialias).toBe(false);
    expect(tierSettings('high').antialias).toBe(true);
  });

  it('increases the pixel-ratio cap monotonically across TIER_ORDER', () => {
    const caps = TIER_ORDER.map((t) => tierSettings(t).maxPixelRatio);
    for (let i = 1; i < caps.length; i++) {
      expect(caps[i]).toBeGreaterThan(caps[i - 1]);
    }
  });
});

describe('tierIndex / clampTier', () => {
  it('are inverse for in-range indices', () => {
    expect(tierIndex('low')).toBe(0);
    expect(tierIndex('medium')).toBe(1);
    expect(tierIndex('high')).toBe(2);
    expect(clampTier(0)).toBe('low');
    expect(clampTier(2)).toBe('high');
  });

  it('clamps out-of-range and fractional indices into bounds', () => {
    expect(clampTier(-5)).toBe('low');
    expect(clampTier(99)).toBe('high');
    expect(clampTier(1.9)).toBe('medium'); // truncates toward zero, then clamps
  });
});

describe('averageFps', () => {
  it('returns 0 for an empty sample', () => {
    expect(averageFps([])).toBe(0);
  });

  it('computes FPS from the mean frame duration', () => {
    // 16.666… ms per frame → 60 fps
    expect(averageFps([1000 / 60, 1000 / 60, 1000 / 60])).toBeCloseTo(60, 5);
    // 20 ms per frame → 50 fps
    expect(averageFps([20, 20])).toBeCloseTo(50, 5);
  });

  it('averages a mixed window, not the FPS of individual frames', () => {
    // mean of 10ms and 30ms = 20ms → 50 fps (NOT (100+33.3)/2)
    expect(averageFps([10, 30])).toBeCloseTo(50, 5);
  });

  it('ignores non-finite and non-positive durations', () => {
    expect(averageFps([20, 0, -5, Number.NaN, Number.POSITIVE_INFINITY, 20])).toBeCloseTo(50, 5);
  });

  it('returns 0 when every sample is invalid (no divide-by-zero)', () => {
    expect(averageFps([0, -1, Number.NaN])).toBe(0);
  });
});

describe('recommendTier', () => {
  const opts = DEFAULT_ADAPTIVE_OPTIONS;

  it('ticks the cooldown down and holds the tier while cooling', () => {
    const r = recommendTier('high', 10 /* very low fps */, 5, opts);
    expect(r.tier).toBe('high');
    expect(r.cooldown).toBe(4);
    expect(r.changed).toBe(false);
  });

  it('downgrades one step below the downgrade threshold', () => {
    const r = recommendTier('high', 30, 0, opts);
    expect(r.tier).toBe('medium');
    expect(r.changed).toBe(true);
    expect(r.cooldown).toBe(opts.cooldownFrames);
  });

  it('upgrades one step above the upgrade threshold', () => {
    const r = recommendTier('low', 60, 0, opts);
    expect(r.tier).toBe('medium');
    expect(r.changed).toBe(true);
    expect(r.cooldown).toBe(opts.cooldownFrames);
  });

  it('moves only one tier per decision', () => {
    // Even at a crawl, high does not jump straight to low.
    expect(recommendTier('high', 5, 0, opts).tier).toBe('medium');
    // Even blazing fast, low does not jump straight to high.
    expect(recommendTier('low', 240, 0, opts).tier).toBe('medium');
  });

  it('does nothing inside the hysteresis dead zone', () => {
    // 50 fps sits between downgradeFps (45) and upgradeFps (57).
    const r = recommendTier('medium', 50, 0, opts);
    expect(r.tier).toBe('medium');
    expect(r.changed).toBe(false);
    expect(r.cooldown).toBe(0);
  });

  it('will not downgrade below low or upgrade above high', () => {
    const down = recommendTier('low', 1, 0, opts);
    expect(down.tier).toBe('low');
    expect(down.changed).toBe(false);

    const up = recommendTier('high', 120, 0, opts);
    expect(up.tier).toBe('high');
    expect(up.changed).toBe(false);
  });

  it('ignores a not-yet-measured (zero / NaN) average', () => {
    expect(recommendTier('medium', 0, 0, opts).changed).toBe(false);
    expect(recommendTier('medium', Number.NaN, 0, opts).changed).toBe(false);
  });

  it('does not oscillate: a downgrade lands inside the new tier’s stable band', () => {
    // A device pinned at ~40 fps: downgrade high→medium, then (once cooled) the
    // same 40 fps would push medium→low, but never back up, because 40 < 57.
    let tier: typeof TIER_ORDER[number] = 'high';
    let cooldown = 0;
    const measured = 40;
    const seen: string[] = [];
    for (let frame = 0; frame < 400; frame++) {
      const r = recommendTier(tier, measured, cooldown, opts);
      tier = r.tier;
      cooldown = r.cooldown;
      if (r.changed) seen.push(r.tier);
    }
    // It settles at 'low' and stays there — only downgrades, no flip-flop.
    expect(seen).toEqual(['medium', 'low']);
    expect(tier).toBe('low');
  });

  it('honours custom thresholds', () => {
    const strict: AdaptiveQualityOptions = { downgradeFps: 58, upgradeFps: 59, cooldownFrames: 10 };
    expect(recommendTier('high', 57, 0, strict).tier).toBe('medium');
    expect(recommendTier('medium', 59, 0, strict).tier).toBe('high');
  });
});

describe('createFrameWindow', () => {
  it('reports full only once capacity is reached', () => {
    const w = createFrameWindow(3);
    expect(w.push(16)).toBe(false);
    expect(w.push(16)).toBe(false);
    expect(w.push(16)).toBe(true);
    expect(w.size).toBe(3);
  });

  it('evicts the oldest sample beyond capacity (ring behaviour)', () => {
    const w = createFrameWindow(2);
    w.push(1000); // 1 fps, will be evicted
    w.push(20);
    w.push(20); // window now holds [20, 20] → 50 fps
    expect(w.fps()).toBeCloseTo(50, 5);
    expect(w.size).toBe(2);
  });

  it('reset() clears samples', () => {
    const w = createFrameWindow(2);
    w.push(16);
    w.reset();
    expect(w.size).toBe(0);
    expect(w.fps()).toBe(0);
  });

  it('rejects a non-positive or non-integer capacity', () => {
    expect(() => createFrameWindow(0)).toThrow(RangeError);
    expect(() => createFrameWindow(-1)).toThrow(RangeError);
    expect(() => createFrameWindow(2.5)).toThrow(RangeError);
  });
});
