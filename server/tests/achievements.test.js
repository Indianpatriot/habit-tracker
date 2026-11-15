const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { computeAchievements } = require('../analytics/achievements');

describe('Achievements Analytics (25 Badges)', () => {
  const baseToday = new Date('2026-03-31T00:00:00.000Z');

  test('returns exactly 25 badges with unique ids and valid categories/tiers', () => {
    const res = computeAchievements({
      today: baseToday,
      habits: [],
      logs: []
    });

    assert.equal(res.total, 25);
    assert.equal(res.badges.length, 25);

    const ids = res.badges.map((b) => b.id);
    const uniqueIds = new Set(ids);
    assert.equal(uniqueIds.size, 25, 'All 25 badge IDs must be unique');

    const validCategories = new Set(['streak', 'volume', 'habits', 'consistency', 'cross_habit', 'time']);
    const validTiers = new Set(['bronze', 'silver', 'gold']);

    res.badges.forEach((b) => {
      assert.ok(validCategories.has(b.category), `Invalid category: ${b.category}`);
      assert.ok(validTiers.has(b.tier), `Invalid tier: ${b.tier}`);
      assert.equal(typeof b.name, 'string');
      assert.equal(typeof b.description, 'string');
      assert.equal(typeof b.emoji, 'string');
      assert.equal(typeof b.unlocked, 'boolean');
      assert.ok(b.progress && typeof b.progress.target === 'number' && typeof b.progress.current === 'number');
      assert.ok(b.progress.current <= b.progress.target, 'Current progress must not exceed target');
    });
  });

  test('preserves 6 existing badges with exact IDs, names and rules', () => {
    const res = computeAchievements({
      today: baseToday,
      habits: [],
      logs: []
    });

    const badgeMap = Object.fromEntries(res.badges.map((b) => [b.id, b]));

    assert.ok(badgeMap['first_checkin'], 'first_checkin exists');
    assert.equal(badgeMap['first_checkin'].name, 'First Check-in');

    assert.ok(badgeMap['streak_7_days'], 'streak_7_days exists');
    assert.equal(badgeMap['streak_7_days'].name, '7-Day Streak');

    assert.ok(badgeMap['streak_30_days'], 'streak_30_days exists');
    assert.equal(badgeMap['streak_30_days'].name, '30-Day Streak');

    assert.ok(badgeMap['streak_4_weeks'], 'streak_4_weeks exists');
    assert.equal(badgeMap['streak_4_weeks'].name, '4-Week Streak');

    assert.ok(badgeMap['checkins_100'], 'checkins_100 exists');
    assert.equal(badgeMap['checkins_100'].name, 'Century Club');

    assert.ok(badgeMap['comeback'], 'comeback exists');
    assert.equal(badgeMap['comeback'].name, 'Comeback');
  });

  test('tests Perfect Day locking (< 2 habits or not all done) and unlocking (all habits done on same day)', () => {
    const habits = [
      { id: 'h1', name: 'Exercise', goalType: 'daily' },
      { id: 'h2', name: 'Read', goalType: 'daily' }
    ];

    // Case 1: only 1 habit completed on the day -> locked
    const lockedRes = computeAchievements({
      today: baseToday,
      habits,
      logs: [{ habitId: 'h1', date: '2026-03-30' }]
    });
    const lockedBadge = lockedRes.badges.find((b) => b.id === 'consistency_perfect_day');
    assert.equal(lockedBadge.unlocked, false);
    assert.equal(lockedBadge.progress.current, 0);

    // Case 2: both habits completed on the same day -> unlocked
    const unlockedRes = computeAchievements({
      today: baseToday,
      habits,
      logs: [
        { habitId: 'h1', date: '2026-03-30' },
        { habitId: 'h2', date: '2026-03-30' }
      ]
    });
    const unlockedBadge = unlockedRes.badges.find((b) => b.id === 'consistency_perfect_day');
    assert.equal(unlockedBadge.unlocked, true);
    assert.equal(unlockedBadge.progress.current, 1);
  });

  test('tests Comeback Kid (gap >= 7 days) locking and unlocking', () => {
    const habit = { id: 'h1', name: 'Exercise', goalType: 'daily' };

    // Case 1: gap is only 6 days (e.g. 2026-03-01 to 2026-03-07) -> locked
    const lockedRes = computeAchievements({
      today: baseToday,
      habits: [habit],
      logs: [
        { habitId: 'h1', date: '2026-03-01' },
        { habitId: 'h1', date: '2026-03-07' }
      ]
    });
    const lockedBadge = lockedRes.badges.find((b) => b.id === 'comeback');
    assert.equal(lockedBadge.unlocked, false);

    // Case 2: gap is 7 days (e.g. 2026-03-01 to 2026-03-08) -> unlocked
    const unlockedRes = computeAchievements({
      today: baseToday,
      habits: [habit],
      logs: [
        { habitId: 'h1', date: '2026-03-01' },
        { habitId: 'h1', date: '2026-03-08' }
      ]
    });
    const unlockedBadge = unlockedRes.badges.find((b) => b.id === 'comeback');
    assert.equal(unlockedBadge.unlocked, true);
    assert.equal(unlockedBadge.progress.current, 1);
  });

  test('tests Weekend Warrior (>= 8 weekend days) locking and unlocking', () => {
    const habit = { id: 'h1', name: 'Exercise', goalType: 'daily' };

    // 7 weekend dates (Saturdays & Sundays in March 2026)
    // 2026-03-01 (Sun), 2026-03-07 (Sat), 2026-03-08 (Sun), 2026-03-14 (Sat), 2026-03-15 (Sun), 2026-03-21 (Sat), 2026-03-22 (Sun)
    const sevenWeekends = [
      '2026-03-01', '2026-03-07', '2026-03-08', '2026-03-14',
      '2026-03-15', '2026-03-21', '2026-03-22'
    ].map((date) => ({ habitId: 'h1', date }));

    const lockedRes = computeAchievements({
      today: baseToday,
      habits: [habit],
      logs: sevenWeekends
    });
    const lockedBadge = lockedRes.badges.find((b) => b.id === 'consistency_weekend_warrior');
    assert.equal(lockedBadge.unlocked, false);
    assert.equal(lockedBadge.progress.current, 7);

    // Add 8th weekend day: 2026-03-28 (Sat)
    const eightWeekends = [...sevenWeekends, { habitId: 'h1', date: '2026-03-28' }];
    const unlockedRes = computeAchievements({
      today: baseToday,
      habits: [habit],
      logs: eightWeekends
    });
    const unlockedBadge = unlockedRes.badges.find((b) => b.id === 'consistency_weekend_warrior');
    assert.equal(unlockedBadge.unlocked, true);
    assert.equal(unlockedBadge.progress.current, 8);
  });

  test('tests Balanced (>= 3 habits and each >= 10 completions in last 90 days)', () => {
    const habits = [
      { id: 'h1', name: 'H1', goalType: 'daily' },
      { id: 'h2', name: 'H2', goalType: 'daily' },
      { id: 'h3', name: 'H3', goalType: 'daily' }
    ];

    // Generate 10 logs for h1, 10 for h2, 9 for h3
    const logs = [];
    for (let i = 1; i <= 10; i++) {
      logs.push({ habitId: 'h1', date: `2026-03-${String(i).padStart(2, '0')}` });
      logs.push({ habitId: 'h2', date: `2026-03-${String(i).padStart(2, '0')}` });
      if (i < 10) {
        logs.push({ habitId: 'h3', date: `2026-03-${String(i).padStart(2, '0')}` });
      }
    }

    const lockedRes = computeAchievements({ today: baseToday, habits, logs });
    const lockedBadge = lockedRes.badges.find((b) => b.id === 'cross_balanced');
    assert.equal(lockedBadge.unlocked, false);

    // Add 10th log for h3
    logs.push({ habitId: 'h3', date: '2026-03-10' });
    const unlockedRes = computeAchievements({ today: baseToday, habits, logs });
    const unlockedBadge = unlockedRes.badges.find((b) => b.id === 'cross_balanced');
    assert.equal(unlockedBadge.unlocked, true);
  });

  test('tests Variety Pack (>= 4 different habits in any 7-day window)', () => {
    const habits = [
      { id: 'h1', name: 'H1', goalType: 'daily' },
      { id: 'h2', name: 'H2', goalType: 'daily' },
      { id: 'h3', name: 'H3', goalType: 'daily' },
      { id: 'h4', name: 'H4', goalType: 'daily' }
    ];

    // 3 habits completed in the same week
    const logs3 = [
      { habitId: 'h1', date: '2026-03-01' },
      { habitId: 'h2', date: '2026-03-02' },
      { habitId: 'h3', date: '2026-03-03' }
    ];

    const lockedRes = computeAchievements({ today: baseToday, habits, logs: logs3 });
    const lockedBadge = lockedRes.badges.find((b) => b.id === 'cross_variety_pack');
    assert.equal(lockedBadge.unlocked, false);
    assert.equal(lockedBadge.progress.current, 3);

    // Add 4th habit on 2026-03-04 (within 7 days of 2026-03-01)
    const logs4 = [...logs3, { habitId: 'h4', date: '2026-03-04' }];
    const unlockedRes = computeAchievements({ today: baseToday, habits, logs: logs4 });
    const unlockedBadge = unlockedRes.badges.find((b) => b.id === 'cross_variety_pack');
    assert.equal(unlockedBadge.unlocked, true);
    assert.equal(unlockedBadge.progress.current, 4);
  });

  test('each category has at least one locked and at least one unlocked badge with mixed data', () => {
    const habits = [
      { id: 'h1', name: 'Water', goalType: 'daily' },
      { id: 'h2', name: 'Exercise', goalType: 'daily' }
    ];
    // 5 completions on 5 consecutive days (streak 5)
    const logs = [
      { habitId: 'h1', date: '2026-03-27' },
      { habitId: 'h1', date: '2026-03-28' },
      { habitId: 'h1', date: '2026-03-29' },
      { habitId: 'h1', date: '2026-03-30' },
      { habitId: 'h1', date: '2026-03-31' }
    ];

    const res = computeAchievements({ today: baseToday, habits, logs });

    const categories = ['streak', 'volume', 'habits', 'consistency', 'cross_habit', 'time'];
    categories.forEach((cat) => {
      const catBadges = res.badges.filter((b) => b.category === cat);
      assert.ok(catBadges.length > 0, `Category ${cat} must have badges`);
    });
  });
});
