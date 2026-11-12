const { computeStreaks } = require('../src/services/streaks');

describe('Streak Engine - computeStreaks', () => {
  // Fixture a: Daily habit
  test('Fixture a) daily: check-ins Oct 1,2,3,5,6 (2026), today Oct 6 -> current 2, longest 3', () => {
    const habit = { goalType: 'daily' };
    const checkins = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-06'];
    const today = '2026-10-06';

    const result = computeStreaks(habit, checkins, today);
    expect(result).toEqual({
      current: 2,
      longest: 3,
      unit: 'days'
    });
  });

  // Fixture b: Weekly target habit
  test('Fixture b) weekly_target=3 (weeks start Mon): W1 Oct 5,7,9 (3); W2 Oct 13,15 (2); W3 Oct 19,21,24,25 (4); W4 Oct 27,29,31 (3); today Mon Nov 2 -> longest 2, current 2', () => {
    const habit = {
      goalType: 'weekly_target',
      targetPerWeek: 3
    };
    const checkins = [
      // W1: Oct 5 - Oct 11 (3 check-ins) -> met
      '2026-10-05', '2026-10-07', '2026-10-09',
      // W2: Oct 12 - Oct 18 (2 check-ins) -> missed
      '2026-10-13', '2026-10-15',
      // W3: Oct 19 - Oct 25 (4 check-ins) -> met
      '2026-10-19', '2026-10-21', '2026-10-24', '2026-10-25',
      // W4: Oct 26 - Nov 1 (3 check-ins) -> met
      '2026-10-27', '2026-10-29', '2026-10-31'
    ];
    // Today: Mon Nov 2 (new week in progress does not break current streak)
    const today = '2026-11-02';

    const result = computeStreaks(habit, checkins, today);
    expect(result).toEqual({
      current: 2,
      longest: 2,
      unit: 'weeks'
    });
  });

  // Fixture c: Weekdays habit (Mon/Wed/Fri -> 1, 3, 5)
  test('Fixture c) weekdays Mon/Wed/Fri: check-ins Oct 5,7,9,12,14,19 (2026; Oct 16 missed), today Oct 19 -> longest 5, current 1', () => {
    const habit = {
      goalType: 'weekdays',
      weekdays: [1, 3, 5] // Monday, Wednesday, Friday
    };
    const checkins = [
      '2026-10-05', // Mon - 1
      '2026-10-07', // Wed - 2
      '2026-10-09', // Fri - 3
      '2026-10-12', // Mon - 4
      '2026-10-14', // Wed - 5
      // Oct 16 (Fri) missed
      '2026-10-19'  // Mon - 1
    ];
    const today = '2026-10-19';

    const result = computeStreaks(habit, checkins, today);
    expect(result).toEqual({
      current: 1,
      longest: 5,
      unit: 'days'
    });
  });

  // Fixture d: Edge cases
  describe('Fixture d) edge cases', () => {
    test('no check-ins -> {0, 0, unit}', () => {
      const dailyHabit = { goalType: 'daily' };
      expect(computeStreaks(dailyHabit, [], '2026-10-10')).toEqual({
        current: 0,
        longest: 0,
        unit: 'days'
      });

      const weeklyHabit = { goalType: 'weekly_target', targetPerWeek: 3 };
      expect(computeStreaks(weeklyHabit, [], '2026-10-10')).toEqual({
        current: 0,
        longest: 0,
        unit: 'weeks'
      });
    });

    test('single check-in today -> current 1, longest 1', () => {
      const habit = { goalType: 'daily' };
      const today = '2026-10-10';
      const checkins = ['2026-10-10'];

      expect(computeStreaks(habit, checkins, today)).toEqual({
        current: 1,
        longest: 1,
        unit: 'days'
      });
    });

    test('single check-in in distant past -> current 0, longest 1', () => {
      const habit = { goalType: 'daily' };
      const today = '2026-10-10';
      const checkins = ['2026-10-01'];

      expect(computeStreaks(habit, checkins, today)).toEqual({
        current: 0,
        longest: 1,
        unit: 'days'
      });
    });

    test('streak crossing a month boundary -> preserved seamlessly', () => {
      const habit = { goalType: 'daily' };
      const checkins = ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'];
      const today = '2026-11-02';

      expect(computeStreaks(habit, checkins, today)).toEqual({
        current: 4,
        longest: 4,
        unit: 'days'
      });
    });
  });
});

