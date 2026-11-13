const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { fillZeroDays, formatUTCDate } = require('../analytics/heatmap');
const { computeStreaksFromRuns } = require('../analytics/streaks');
const { pickMostLeast } = require('../analytics/activity');

describe('Analytics Pure Helpers (Offline Unit Tests)', () => {
  // ==========================================
  // 1. fillZeroDays tests
  // ==========================================
  describe('fillZeroDays', () => {
    it('returns exactly 90 items ending today UTC with 0 for missing days', () => {
      const today = new Date(Date.UTC(2026, 9, 15)); // 2026-10-15
      const items = [
        { date: '2026-10-15', count: 3 },
        { date: '2026-10-14', count: 1 }
      ];

      const result = fillZeroDays(items, today);

      assert.strictEqual(result.length, 90, 'Must contain exactly 90 days');
      assert.strictEqual(result[89].date, '2026-10-15', 'Last item must be reference today');
      assert.strictEqual(result[89].count, 3, 'Today count must match input');
      assert.strictEqual(result[88].date, '2026-10-14', 'Yesterday date must match');
      assert.strictEqual(result[88].count, 1, 'Yesterday count must match input');
      assert.strictEqual(result[0].count, 0, 'Uncompleted days must default to 0');
    });

    it('handles empty input array cleanly returning 90 days with 0 counts', () => {
      const today = new Date(Date.UTC(2026, 9, 15));
      const result = fillZeroDays([], today);

      assert.strictEqual(result.length, 90);
      assert.strictEqual(result[89].date, '2026-10-15');
      const allZeros = result.every((day) => day.count === 0);
      assert.strictEqual(allZeros, true, 'All counts must be zero');
    });

    it('accepts items with _id key from Mongo $group aggregation', () => {
      const today = new Date(Date.UTC(2026, 9, 15));
      const items = [{ _id: '2026-10-15', count: 5 }];
      const result = fillZeroDays(items, today);

      assert.strictEqual(result[89].count, 5);
    });
  });

  // ==========================================
  // 2. pickMostLeast tests
  // ==========================================
  describe('pickMostLeast', () => {
    it('handles 0 habits: returns both null with "No habits yet" message', () => {
      const result = pickMostLeast([], []);
      assert.deepStrictEqual(result, {
        most: null,
        least: null,
        message: 'No habits yet'
      });
    });

    it('handles 1 habit: returns only most with "Add more habits to compare" message', () => {
      const habits = [{ _id: 'h1', name: 'Exercise' }];
      const counts = [{ _id: 'h1', count: 10 }];

      const result = pickMostLeast(counts, habits);
      assert.strictEqual(result.least, null);
      assert.strictEqual(result.message, 'Add more habits to compare');
      assert.strictEqual(result.most.name, 'Exercise');
      assert.strictEqual(result.most.count, 10);
      assert.strictEqual(result.most.percent, 11); // Math.round(10 / 90 * 100) = 11
    });

    it('handles all habits having identical counts: returns most (alphabetical) and "All habits are equally active"', () => {
      const habits = [
        { _id: 'h1', name: 'Read' },
        { _id: 'h2', name: 'Code' },
        { _id: 'h3', name: 'Exercise' }
      ];
      const counts = [
        { _id: 'h1', count: 5 },
        { _id: 'h2', count: 5 },
        { _id: 'h3', count: 5 }
      ];

      const result = pickMostLeast(counts, habits);
      assert.strictEqual(result.least, null);
      assert.strictEqual(result.message, 'All habits are equally active');
      assert.strictEqual(result.most.name, 'Code', 'Alphabetical first among equals');
      assert.strictEqual(result.most.count, 5);
    });

    it('handles 2+ habits with distinct counts: returns distinct most and least with message null', () => {
      const habits = [
        { _id: 'h1', name: 'Read' },
        { _id: 'h2', name: 'Drink Water' },
        { _id: 'h3', name: 'Meditate' }
      ];
      const counts = [
        { _id: 'h1', count: 30 },
        { _id: 'h2', count: 70 },
        { _id: 'h3', count: 10 }
      ];

      const result = pickMostLeast(counts, habits);
      assert.strictEqual(result.message, null);
      assert.strictEqual(result.most.name, 'Drink Water');
      assert.strictEqual(result.most.count, 70);
      assert.strictEqual(result.least.name, 'Meditate');
      assert.strictEqual(result.least.count, 10);
    });

    it('breaks ties alphabetically for both most and least active', () => {
      const habits = [
        { _id: 'h1', name: 'Yoga' },
        { _id: 'h2', name: 'Aerobics' },
        { _id: 'h3', name: 'Zumba' },
        { _id: 'h4', name: 'Boxing' }
      ];
      // Yoga & Aerobics tie for highest (50)
      // Zumba & Boxing tie for lowest (5)
      const counts = [
        { _id: 'h1', count: 50 },
        { _id: 'h2', count: 50 },
        { _id: 'h3', count: 5 },
        { _id: 'h4', count: 5 }
      ];

      const result = pickMostLeast(counts, habits);
      assert.strictEqual(result.message, null);
      assert.strictEqual(result.most.name, 'Aerobics', 'Tie-break highest: Aerobics before Yoga');
      assert.strictEqual(result.least.name, 'Boxing', 'Tie-break lowest: Boxing before Zumba');
    });
  });

  // ==========================================
  // 3. computeStreaksFromRuns tests
  // ==========================================
  describe('computeStreaksFromRuns', () => {
    const today = '2026-10-15';
    const yesterday = '2026-10-14';

    it('covers no logs: returns { currentStreak: 0, longestStreak: 0 }', () => {
      const result = computeStreaksFromRuns([], today, yesterday);
      assert.deepStrictEqual(result, { currentStreak: 0, longestStreak: 0 });
    });

    it('covers one log ending today: currentStreak = 1, longestStreak = 1', () => {
      const runs = [{ _id: 0, length: 1, start: '2026-10-15', end: '2026-10-15' }];
      const result = computeStreaksFromRuns(runs, today, yesterday);
      assert.strictEqual(result.currentStreak, 1);
      assert.strictEqual(result.longestStreak, 1);
    });

    it('covers one log ending yesterday: currentStreak = 1, longestStreak = 1', () => {
      const runs = [{ _id: 0, length: 1, start: '2026-10-14', end: '2026-10-14' }];
      const result = computeStreaksFromRuns(runs, today, yesterday);
      assert.strictEqual(result.currentStreak, 1);
      assert.strictEqual(result.longestStreak, 1);
    });

    it('covers one log ended 2+ days ago: currentStreak = 0, longestStreak = 1', () => {
      const runs = [{ _id: 0, length: 1, start: '2026-10-12', end: '2026-10-12' }];
      const result = computeStreaksFromRuns(runs, today, yesterday);
      assert.strictEqual(result.currentStreak, 0);
      assert.strictEqual(result.longestStreak, 1);
    });

    it('covers a gap in the middle with current streak ending today', () => {
      const runs = [
        { _id: 0, length: 7, start: '2026-10-01', end: '2026-10-07' }, // Gap from Oct 8 to Oct 12
        { _id: 1, length: 3, start: '2026-10-13', end: '2026-10-15' }  // Current ending today
      ];
      const result = computeStreaksFromRuns(runs, today, yesterday);
      assert.strictEqual(result.longestStreak, 7);
      assert.strictEqual(result.currentStreak, 3);
    });

    it('covers a gap in the middle with current streak ending yesterday', () => {
      const runs = [
        { _id: 0, length: 4, start: '2026-10-01', end: '2026-10-04' },
        { _id: 1, length: 6, start: '2026-10-09', end: '2026-10-14' } // Ending yesterday
      ];
      const result = computeStreaksFromRuns(runs, today, yesterday);
      assert.strictEqual(result.longestStreak, 6);
      assert.strictEqual(result.currentStreak, 6);
    });

    it('covers a gap in the middle where the latest streak ended 2+ days ago', () => {
      const runs = [
        { _id: 0, length: 5, start: '2026-10-01', end: '2026-10-05' },
        { _id: 1, length: 3, start: '2026-10-09', end: '2026-10-11' } // Ended 4 days ago
      ];
      const result = computeStreaksFromRuns(runs, today, yesterday);
      assert.strictEqual(result.longestStreak, 5);
      assert.strictEqual(result.currentStreak, 0);
    });
  });
});

