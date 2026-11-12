const { computeCorrelationFromDates } = require('../src/services/insights');

describe('Cross-Habit Correlation - computeCorrelationFromDates', () => {
  // Required fixture:
  // window 20 days; A done on days 1-10; B done on days 1-8, 12, 13
  // -> daysA 10, daysB 10, both 8, pBgivenA 0.8, pBgivenNotA 0.2, lift 4
  test('Required fixture: 20-day window, A on 1-10, B on 1-8, 12, 13 -> lift 4', () => {
    const datesA = [
      '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05',
      '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10'
    ];

    const datesB = [
      '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05',
      '2026-10-06', '2026-10-07', '2026-10-08',
      '2026-10-12', '2026-10-13'
    ];

    const totalDays = 20;

    const result = computeCorrelationFromDates(datesA, datesB, totalDays);

    expect(result.days).toBe(20);
    expect(result.daysA).toBe(10);
    expect(result.daysB).toBe(10);
    expect(result.both).toBe(8);
    expect(result.pBgivenA).toBeCloseTo(0.8, 5);
    expect(result.pBgivenNotA).toBeCloseTo(0.2, 5);
    expect(result.lift).toBeCloseTo(4, 5);
    expect(result.enough).toBe(true);
  });

  test('Statistical significance boundary: daysA < 10 marks enough as false', () => {
    const datesA = ['2026-10-01', '2026-10-02']; // only 2 days
    const datesB = ['2026-10-01', '2026-10-02'];
    const totalDays = 20;

    const result = computeCorrelationFromDates(datesA, datesB, totalDays);
    expect(result.enough).toBe(false);
  });

  test('Statistical significance boundary: (totalDays - daysA) < 10 marks enough as false', () => {
    // 15 days out of 20 -> notDaysA = 5 (< 10)
    const datesA = [];
    for (let i = 1; i <= 15; i++) {
      datesA.push(`2026-10-${String(i).padStart(2, '0')}`);
    }
    const datesB = datesA.slice(0, 10);
    const totalDays = 20;

    const result = computeCorrelationFromDates(datesA, datesB, totalDays);
    expect(result.enough).toBe(false);
  });
});
