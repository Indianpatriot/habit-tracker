const { computeBadges } = require('../src/services/badges');

describe('Achievement Badges - computeBadges', () => {
  const dummyHabit1 = { _id: 'habit1', name: 'Workout', goalType: 'daily' };
  const dummyHabit2 = { _id: 'habit2', name: 'Swimming', goalType: 'weekly_target', targetPerWeek: 3 };

  describe('Badge: first_checkin', () => {
    test('no check-ins -> first_checkin not earned', () => {
      const badges = computeBadges({
        habits: [dummyHabit1],
        logs: []
      });

      const firstBadge = badges.find((b) => b.key === 'first_checkin');
      expect(firstBadge).toEqual({
        key: 'first_checkin',
        name: 'First Check-in',
        description: 'First check-in ever',
        earned: false,
        earnedOn: null,
        progress: 0,
        target: 1
      });
    });

    test('1 check-in -> first_checkin earned with exact date', () => {
      const badges = computeBadges({
        habits: [dummyHabit1],
        logs: [{ habitId: 'habit1', date: '2026-03-15' }]
      });

      const firstBadge = badges.find((b) => b.key === 'first_checkin');
      expect(firstBadge).toEqual({
        key: 'first_checkin',
        name: 'First Check-in',
        description: 'First check-in ever',
        earned: true,
        earnedOn: '2026-03-15',
        progress: 1,
        target: 1
      });
    });
  });

  describe('Badge: checkins_100 boundary (99 vs 100)', () => {
    test('boundary at 99 check-ins -> locked with progress 99 / 100', () => {
      // Generate exactly 99 logs
      const logs99 = [];
      for (let i = 1; i <= 99; i++) {
        const dayStr = String(i).padStart(3, '0');
        logs99.push({
          habitId: 'habit1',
          date: `2026-01-01T00:00:00.000Z`
        });
      }

      const badges = computeBadges({
        habits: [dummyHabit1],
        logs: logs99
      });

      const badge100 = badges.find((b) => b.key === 'checkins_100');
      expect(badge100.earned).toBe(false);
      expect(badge100.earnedOn).toBeNull();
      expect(badge100.progress).toBe(99);
      expect(badge100.target).toBe(100);
    });

    test('boundary at 100 check-ins -> earned with earnedOn set to 100th check-in', () => {
      // Generate exactly 100 logs with distinct dates
      const logs100 = [];
      const startDate = new Date(Date.UTC(2026, 0, 1));
      for (let i = 0; i < 100; i++) {
        const d = new Date(startDate);
        d.setUTCDate(d.getUTCDate() + i);
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        logs100.push({
          habitId: 'habit1',
          date: `${y}-${m}-${day}`
        });
      }

      const badges = computeBadges({
        habits: [dummyHabit1],
        logs: logs100
      });

      const badge100 = badges.find((b) => b.key === 'checkins_100');
      expect(badge100.earned).toBe(true);
      expect(badge100.progress).toBe(100);
      expect(badge100.target).toBe(100);
      // 100th checkin is index 99
      expect(badge100.earnedOn).toBe(logs100[99].date);
    });
  });

  describe('Badge: comeback (gap >= 7 days on the same habit)', () => {
    test('gap of 7 days on the same habit -> comeback earned on second check-in date', () => {
      const logs = [
        { habitId: 'habit1', date: '2026-05-01' },
        { habitId: 'habit1', date: '2026-05-08' } // 7-day difference
      ];

      const badges = computeBadges({
        habits: [dummyHabit1],
        logs
      });

      const comebackBadge = badges.find((b) => b.key === 'comeback');
      expect(comebackBadge).toEqual({
        key: 'comeback',
        name: 'Comeback',
        description: 'A check-in made after a gap of >= 7 days on the same habit',
        earned: true,
        earnedOn: '2026-05-08',
        progress: 1,
        target: 1
      });
    });

    test('gap of 6 days (< 7) on the same habit -> comeback not earned', () => {
      const logs = [
        { habitId: 'habit1', date: '2026-05-01' },
        { habitId: 'habit1', date: '2026-05-07' } // 6-day difference
      ];

      const badges = computeBadges({
        habits: [dummyHabit1],
        logs
      });

      const comebackBadge = badges.find((b) => b.key === 'comeback');
      expect(comebackBadge.earned).toBe(false);
      expect(comebackBadge.earnedOn).toBeNull();
      expect(comebackBadge.progress).toBe(0);
    });

    test('gap of >= 7 days across DIFFERENT habits -> does not count as comeback on the same habit', () => {
      const logs = [
        { habitId: 'habit1', date: '2026-05-01' },
        { habitId: 'habit2', date: '2026-05-15' } // 14-day gap, but different habit
      ];

      const badges = computeBadges({
        habits: [dummyHabit1, dummyHabit2],
        logs
      });

      const comebackBadge = badges.find((b) => b.key === 'comeback');
      expect(comebackBadge.earned).toBe(false);
    });
  });

  describe('Streak badges: 7-day, 30-day, and 4-week', () => {
    test('7-day streak on daily habit earned with progress 7/7', () => {
      const logs = [
        { habitId: 'habit1', date: '2026-06-01' },
        { habitId: 'habit1', date: '2026-06-02' },
        { habitId: 'habit1', date: '2026-06-03' },
        { habitId: 'habit1', date: '2026-06-04' },
        { habitId: 'habit1', date: '2026-06-05' },
        { habitId: 'habit1', date: '2026-06-06' },
        { habitId: 'habit1', date: '2026-06-07' }
      ];

      const badges = computeBadges({
        habits: [dummyHabit1],
        logs
      });

      const badge7 = badges.find((b) => b.key === 'streak_7_days');
      expect(badge7.earned).toBe(true);
      expect(badge7.earnedOn).toBe('2026-06-07');
      expect(badge7.progress).toBe(7);

      const badge30 = badges.find((b) => b.key === 'streak_30_days');
      expect(badge30.earned).toBe(false);
      expect(badge30.progress).toBe(7);
      expect(badge30.target).toBe(30);
    });

    test('4-week streak on weekly habit earned with progress 4/4', () => {
      const logs = [
        // Week 1: Mon Oct 5, 7, 9
        { habitId: 'habit2', date: '2026-10-05' },
        { habitId: 'habit2', date: '2026-10-07' },
        { habitId: 'habit2', date: '2026-10-09' },
        // Week 2: Mon Oct 12, 14, 16
        { habitId: 'habit2', date: '2026-10-12' },
        { habitId: 'habit2', date: '2026-10-14' },
        { habitId: 'habit2', date: '2026-10-16' },
        // Week 3: Mon Oct 19, 21, 23
        { habitId: 'habit2', date: '2026-10-19' },
        { habitId: 'habit2', date: '2026-10-21' },
        { habitId: 'habit2', date: '2026-10-23' },
        // Week 4: Mon Oct 26, 28, 30
        { habitId: 'habit2', date: '2026-10-26' },
        { habitId: 'habit2', date: '2026-10-28' },
        { habitId: 'habit2', date: '2026-10-30' }
      ];

      const badges = computeBadges({
        habits: [dummyHabit2],
        logs
      });

      const badge4w = badges.find((b) => b.key === 'streak_4_weeks');
      expect(badge4w.earned).toBe(true);
      expect(badge4w.progress).toBe(4);
      expect(badge4w.target).toBe(4);
      expect(badge4w.earnedOn).toBe('2026-10-30');
    });
  });
});
