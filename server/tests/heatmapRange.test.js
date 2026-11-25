const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validateHeatmapDays, fillZeroDays } = require('../analytics/heatmap');

describe('Heatmap Range Validation and Zero Fill Pure Helpers', () => {
  describe('validateHeatmapDays', () => {
    it('accepts 30, 90, and 365 as numbers and strings', () => {
      assert.strictEqual(validateHeatmapDays(30), 30);
      assert.strictEqual(validateHeatmapDays('30'), 30);
      assert.strictEqual(validateHeatmapDays(90), 90);
      assert.strictEqual(validateHeatmapDays('90'), 90);
      assert.strictEqual(validateHeatmapDays(365), 365);
      assert.strictEqual(validateHeatmapDays('365'), 365);
    });

    it('defaults to 90 when omitted, undefined, null, or empty string', () => {
      assert.strictEqual(validateHeatmapDays(), 90);
      assert.strictEqual(validateHeatmapDays(undefined), 90);
      assert.strictEqual(validateHeatmapDays(null), 90);
      assert.strictEqual(validateHeatmapDays(''), 90);
    });

    it('rejects unsupported day values', () => {
      assert.strictEqual(validateHeatmapDays(7), null);
      assert.strictEqual(validateHeatmapDays(14), null);
      assert.strictEqual(validateHeatmapDays(60), null);
      assert.strictEqual(validateHeatmapDays(100), null);
      assert.strictEqual(validateHeatmapDays('invalid'), null);
      assert.strictEqual(validateHeatmapDays(-90), null);
    });
  });

  describe('fillZeroDays length for each supported range', () => {
    const today = new Date(Date.UTC(2026, 10, 15)); // 2026-11-15

    it('returns exactly 30 items for days=30 ending today', () => {
      const items = [{ date: '2026-11-15', count: 4 }];
      const result = fillZeroDays(items, today, 30);
      assert.strictEqual(result.length, 30);
      assert.strictEqual(result[29].date, '2026-11-15');
      assert.strictEqual(result[29].count, 4);
      assert.strictEqual(result[0].date, '2026-10-17'); // 29 days before 2026-11-15
    });

    it('returns exactly 90 items for days=90 ending today', () => {
      const items = [{ date: '2026-11-15', count: 2 }];
      const result = fillZeroDays(items, today, 90);
      assert.strictEqual(result.length, 90);
      assert.strictEqual(result[89].date, '2026-11-15');
      assert.strictEqual(result[89].count, 2);
    });

    it('returns exactly 365 items for days=365 ending today', () => {
      const items = [{ date: '2026-11-15', count: 1 }];
      const result = fillZeroDays(items, today, 365);
      assert.strictEqual(result.length, 365);
      assert.strictEqual(result[364].date, '2026-11-15');
      assert.strictEqual(result[364].count, 1);
      assert.strictEqual(result[0].date, '2025-11-16'); // 364 days before 2026-11-15
    });
  });
});

