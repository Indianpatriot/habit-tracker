const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  computeTodayProgress,
  computeWeeklyTrend,
  computeWeekdayCounts,
  computeStreakRace,
  computeLast30,
  computeRolling7,
  computeInsightsOverview
} = require('../analytics/insights');

describe('Insights Overview Analytics (SVG Visuals Pure Helpers)', () => {
  const baseToday = new Date('2026-03-31T00:00:00.000Z'); // Tuesday

  test('computeTodayProgress: handles empty, partial, and 100% completions', () => {
    const habits = [
      { id: 'h1', name: 'Exercise', goalType: 'daily' },
      { id: 'h2', name: 'Read', goalType: 'daily' }
    ];

    // Empty case
    const emptyRes = computeTodayProgress({ today: baseToday, habits: [], logs: [] });
    assert.equal(emptyRes.todayDone, 0);
    assert.equal(emptyRes.totalHabits, 0);
    assert.equal(emptyRes.percent, 0);
    assert.ok(emptyRes.takeaway.includes('No habits created'));

    // Partial case (1 of 2 done today)
    const partialRes = computeTodayProgress({
      today: baseToday,
      habits,
      logs: [{ habitId: 'h1', date: '2026-03-31' }]
    });
    assert.equal(partialRes.todayDone, 1);
    assert.equal(partialRes.totalHabits, 2);
    assert.equal(partialRes.percent, 50);
    assert.ok(partialRes.takeaway.includes('1 of 2 habits today'));

    // All done case (2 of 2 done today)
    const allRes = computeTodayProgress({
      today: baseToday,
      habits,
      logs: [
        { habitId: 'h1', date: '2026-03-31' },
        { habitId: 'h2', date: '2026-03-31' }
      ]
    });
    assert.equal(allRes.todayDone, 2);
    assert.equal(allRes.percent, 100);
    assert.ok(allRes.takeaway.includes('All 2 habits completed today'));
  });

  test('computeWeeklyTrend: returns exactly 12 weeks ending in current week', () => {
    const res = computeWeeklyTrend({
      today: baseToday,
      logs: [
        { habitId: 'h1', date: '2026-03-30' }, // Current week Monday
        { habitId: 'h1', date: '2026-03-31' }  // Current week Tuesday
      ]
    });

    assert.equal(res.weekly.length, 12);
    assert.equal(res.weekly[11].isCurrent, true);
    assert.equal(res.weekly[10].isCurrent, false);
    assert.equal(res.weekly[11].count, 2);
    assert.ok(typeof res.takeaway === 'string' && res.takeaway.length > 0);
  });

  test('computeWeekdayCounts: correctly distributes completions across Mon-Sun', () => {
    // 2026-03-30 is Monday, 2026-03-31 is Tuesday
    const logs = [
      { habitId: 'h1', date: '2026-03-30' },
      { habitId: 'h1', date: '2026-03-30' }, // duplicates filtered
      { habitId: 'h2', date: '2026-03-30' }, // 2 on Monday
      { habitId: 'h1', date: '2026-03-31' }  // 1 on Tuesday
    ];

    const res = computeWeekdayCounts({ today: baseToday, logs });

    assert.equal(res.weekdayCounts.length, 7);
    assert.equal(res.weekdayCounts[0].day, 'Mon');
    assert.equal(res.weekdayCounts[0].count, 2);
    assert.equal(res.weekdayCounts[0].isBest, true);

    assert.equal(res.weekdayCounts[1].day, 'Tue');
    assert.equal(res.weekdayCounts[1].count, 1);

    assert.equal(res.weekdayCounts[6].day, 'Sun');
    assert.equal(res.weekdayCounts[6].count, 0);

    assert.ok(res.takeaway.includes('Most active on Mon (2 check-ins)'));
    assert.ok(res.takeaway.includes('quietest on'));
  });

  test('computeWeekdayCounts: handles 0 logs without crashing', () => {
    const res = computeWeekdayCounts({ today: baseToday, logs: [] });
    assert.equal(res.weekdayCounts.length, 7);
    res.weekdayCounts.forEach((d) => assert.equal(d.count, 0));
    assert.equal(res.takeaway, 'No activity recorded over the last 90 days.');
  });

  test('computeStreakRace: computes current and longest streak per habit', () => {
    const habits = [
      { id: 'h1', name: 'Workout', goalType: 'daily' },
      { id: 'h2', name: 'Meditation', goalType: 'daily' }
    ];

    const logs = [
      { habitId: 'h1', date: '2026-03-29' },
      { habitId: 'h1', date: '2026-03-30' },
      { habitId: 'h1', date: '2026-03-31' }
    ];

    const res = computeStreakRace({ today: baseToday, habits, logs });

    assert.equal(res.streaks.length, 2);
    const workout = res.streaks.find((s) => s.habitId === 'h1');
    assert.equal(workout.currentStreak, 3);
    assert.equal(workout.longestStreak, 3);

    const meditation = res.streaks.find((s) => s.habitId === 'h2');
    assert.equal(meditation.currentStreak, 0);
    assert.equal(meditation.longestStreak, 0);

    assert.ok(res.takeaway.includes('Workout'));
  });

  test('computeLast30: calculates 30-day percentage per habit', () => {
    const habits = [{ id: 'h1', name: 'Reading', goalType: 'daily' }];

    // 15 days of completions in March
    const logs = [];
    for (let i = 17; i <= 31; i++) {
      logs.push({ habitId: 'h1', date: `2026-03-${i}` });
    }

    const res = computeLast30({ today: baseToday, habits, logs });

    assert.equal(res.last30.length, 1);
    assert.equal(res.last30[0].doneCount, 15);
    assert.equal(res.last30[0].percent, 50);
    assert.ok(res.takeaway.includes('50%'));
  });

  test('computeRolling7: returns exactly 90 values and correctly averages 7 days', () => {
    // 7 check-ins on 7 consecutive days ending today: 2026-03-25 to 2026-03-31
    const logs = [
      { habitId: 'h1', date: '2026-03-25' },
      { habitId: 'h1', date: '2026-03-26' },
      { habitId: 'h1', date: '2026-03-27' },
      { habitId: 'h1', date: '2026-03-28' },
      { habitId: 'h1', date: '2026-03-29' },
      { habitId: 'h1', date: '2026-03-30' },
      { habitId: 'h1', date: '2026-03-31' }
    ];

    const res = computeRolling7({ today: baseToday, logs });

    assert.equal(res.rolling7.length, 90);
    assert.equal(res.rolling7[89].isToday, true);
    assert.equal(res.rolling7[89].value, 1.0); // 7 check-ins / 7 days = 1.0
    assert.ok(res.takeaway.includes('Current 7-day momentum is 1 check-ins/day'));
  });

  test('computeInsightsOverview: produces full bundle with all takeaways', () => {
    const res = computeInsightsOverview({ today: baseToday, habits: [], logs: [] });

    assert.equal(res.todayDone, 0);
    assert.equal(res.totalHabits, 0);
    assert.equal(res.weekly.length, 12);
    assert.equal(res.weekdayCounts.length, 7);
    assert.equal(res.streaks.length, 0);
    assert.equal(res.last30.length, 0);
    assert.equal(res.rolling7.length, 90);
    assert.ok(res.takeaways.today);
    assert.ok(res.takeaways.weekly);
    assert.ok(res.takeaways.weekday);
    assert.ok(res.takeaways.streaks);
    assert.ok(res.takeaways.last30);
    assert.ok(res.takeaways.momentum);
  });
});

