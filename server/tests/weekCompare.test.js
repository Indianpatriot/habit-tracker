const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { computeWeekCompare, getWeekCompareRanges } = require('../analytics/weekCompare');

describe('Week Comparison Pure Helpers (node:test)', () => {
  const habits = [
    { _id: 'h1', name: 'Exercise' },
    { _id: 'h2', name: 'Code' },
    { _id: 'h3', name: 'Read' }
  ];

  it('handles empty logs: returns 0 completions, 0 active days, null bestHabit and null percent', () => {
    const today = new Date(Date.UTC(2026, 10, 15)); // Sunday 2026-11-15
    const result = computeWeekCompare({ today, habits, logs: [] });

    assert.strictEqual(result.thisWeek.total, 0);
    assert.strictEqual(result.thisWeek.activeDays, 0);
    assert.strictEqual(result.thisWeek.bestHabit, null);

    assert.strictEqual(result.lastWeek.total, 0);
    assert.strictEqual(result.lastWeek.activeDays, 0);
    assert.strictEqual(result.lastWeek.bestHabit, null);

    assert.strictEqual(result.delta.total, 0);
    assert.strictEqual(result.delta.percent, null);
  });

  it('handles only this week: delta percent is null when last week total is 0', () => {
    const today = new Date(Date.UTC(2026, 10, 15)); // Sunday 2026-11-15
    const logs = [
      { habitId: 'h1', date: '2026-11-10' },
      { habitId: 'h1', date: '2026-11-12' },
      { habitId: 'h2', date: '2026-11-12' }
    ];

    const result = computeWeekCompare({ today, habits, logs });

    assert.strictEqual(result.thisWeek.total, 3);
    assert.strictEqual(result.thisWeek.activeDays, 2);
    assert.deepStrictEqual(result.thisWeek.bestHabit, { habitId: 'h1', name: 'Exercise', count: 2 });

    assert.strictEqual(result.lastWeek.total, 0);
    assert.strictEqual(result.delta.total, 3);
    assert.strictEqual(result.delta.percent, null, 'Percent must be null when last week has 0 completions');
  });

  it('handles only last week: delta total is negative and percent is -100%', () => {
    const today = new Date(Date.UTC(2026, 10, 15)); // Sunday 2026-11-15
    // Last week range: 2026-11-02 to 2026-11-08
    const logs = [
      { habitId: 'h2', date: '2026-11-03' },
      { habitId: 'h2', date: '2026-11-04' },
      { habitId: 'h3', date: '2026-11-05' }
    ];

    const result = computeWeekCompare({ today, habits, logs });

    assert.strictEqual(result.thisWeek.total, 0);
    assert.strictEqual(result.lastWeek.total, 3);
    assert.strictEqual(result.delta.total, -3);
    assert.strictEqual(result.delta.percent, -100);
    assert.deepStrictEqual(result.lastWeek.bestHabit, { habitId: 'h2', name: 'Code', count: 2 });
  });

  it('breaks bestHabit ties alphabetically by habit name', () => {
    const today = new Date(Date.UTC(2026, 10, 15));
    // Both 'Read' and 'Code' have 2 completions; 'Code' comes alphabetically before 'Read'
    const logs = [
      { habitId: 'h2', date: '2026-11-10' },
      { habitId: 'h2', date: '2026-11-11' },
      { habitId: 'h3', date: '2026-11-10' },
      { habitId: 'h3', date: '2026-11-11' }
    ];

    const result = computeWeekCompare({ today, habits, logs });

    assert.strictEqual(result.thisWeek.total, 4);
    assert.strictEqual(result.thisWeek.bestHabit.name, 'Code', 'Must pick alphabetically earlier habit');
    assert.strictEqual(result.thisWeek.bestHabit.count, 2);
  });

  it('calculates positive delta percent when both weeks have data', () => {
    const today = new Date(Date.UTC(2026, 10, 15));
    // This week: 5 completions. Last week: 4 completions. Delta: +1 (+25%)
    const logs = [
      { habitId: 'h1', date: '2026-11-02' },
      { habitId: 'h1', date: '2026-11-03' },
      { habitId: 'h1', date: '2026-11-04' },
      { habitId: 'h1', date: '2026-11-05' },
      { habitId: 'h1', date: '2026-11-09' },
      { habitId: 'h1', date: '2026-11-10' },
      { habitId: 'h1', date: '2026-11-11' },
      { habitId: 'h1', date: '2026-11-12' },
      { habitId: 'h1', date: '2026-11-13' }
    ];

    const result = computeWeekCompare({ today, habits, logs });

    assert.strictEqual(result.thisWeek.total, 5);
    assert.strictEqual(result.lastWeek.total, 4);
    assert.strictEqual(result.delta.total, 1);
    assert.strictEqual(result.delta.percent, 25);
  });

  it('handles Monday edge case where today is Monday: window is 1 day in each period', () => {
    const monday = new Date(Date.UTC(2026, 10, 16)); // Monday 2026-11-16
    const ranges = getWeekCompareRanges(monday);

    assert.strictEqual(ranges.thisWeekStart, '2026-11-16');
    assert.strictEqual(ranges.thisWeekEnd, '2026-11-16');
    assert.strictEqual(ranges.lastWeekStart, '2026-11-09');
    assert.strictEqual(ranges.lastWeekEnd, '2026-11-09');

    const logs = [
      { habitId: 'h1', date: '2026-11-09' }, // exactly last week Monday
      { habitId: 'h2', date: '2026-11-16' }, // exactly this week Monday
      { habitId: 'h1', date: '2026-11-10' }  // last week Tuesday (outside fair 1-day window)
    ];

    const result = computeWeekCompare({ today: monday, habits, logs });

    assert.strictEqual(result.thisWeek.total, 1);
    assert.strictEqual(result.thisWeek.activeDays, 1);
    assert.strictEqual(result.lastWeek.total, 1);
    assert.strictEqual(result.lastWeek.activeDays, 1);
    assert.strictEqual(result.delta.total, 0);
    assert.strictEqual(result.delta.percent, 0);
  });
});
