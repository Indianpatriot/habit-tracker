const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  computePairMatrix,
  computeBestPair,
  computeKeystoneHabit,
  computeShareOfEffort,
  computeDroppedTogether,
  computeCrossInsights
} = require('../analytics/crossInsights');

describe('Cross-Habit Insights Analytics (Pure Helpers)', () => {
  const baseToday = new Date('2026-03-31T00:00:00.000Z');

  test('not enough data: 0 habits returns enough: false with "Add at least 2 habits"', () => {
    const res = computeCrossInsights({ today: baseToday, habits: [], logs: [] });
    assert.equal(res.enough, false);
    assert.ok(res.message.includes('Add at least 2 habits'));
  });

  test('not enough data: 1 habit returns enough: false with "Add at least 2 habits"', () => {
    const res = computeCrossInsights({
      today: baseToday,
      habits: [{ id: 'h1', name: 'Exercise' }],
      logs: [{ habitId: 'h1', date: '2026-03-31' }]
    });
    assert.equal(res.enough, false);
    assert.ok(res.message.includes('Add at least 2 habits'));
  });

  test('not enough data: under 14 days of data returns enough: false with "Not enough data yet"', () => {
    const habits = [
      { id: 'h1', name: 'Exercise' },
      { id: 'h2', name: 'Meditation' }
    ];
    // Only 3 distinct days of data
    const logs = [
      { habitId: 'h1', date: '2026-03-29' },
      { habitId: 'h2', date: '2026-03-30' },
      { habitId: 'h1', date: '2026-03-31' }
    ];

    const res = computeCrossInsights({ today: baseToday, habits, logs });
    assert.equal(res.enough, false);
    assert.ok(res.message.includes('Not enough data yet'));
  });

  test('pair matrix: guarantees symmetry and diagonal = 1', () => {
    const habits = [
      { id: 'h1', name: 'Alpha' },
      { id: 'h2', name: 'Beta' },
      { id: 'h3', name: 'Gamma' }
    ];

    // Create 15 days of data so it qualifies
    const logs = [];
    for (let i = 1; i <= 15; i++) {
      const dStr = `2026-03-${String(i).padStart(2, '0')}`;
      logs.push({ habitId: 'h1', date: dStr });
      if (i % 2 === 0) logs.push({ habitId: 'h2', date: dStr });
      if (i % 3 === 0) logs.push({ habitId: 'h3', date: dStr });
    }

    const res = computeCrossInsights({ today: baseToday, habits, logs });
    assert.equal(res.enough, true);
    assert.equal(res.matrix.values.length, 3);

    const values = res.matrix.values;

    // Check diagonal = 1
    for (let i = 0; i < 3; i++) {
      assert.equal(values[i][i], 1, `Diagonal [${i}][${i}] must be 1`);
    }

    // Check symmetry: values[i][j] === values[j][i]
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        assert.equal(values[i][j], values[j][i], `Matrix must be symmetric at [${i}][${j}]`);
      }
    }
  });

  test('best pair: correctly identifies habit pair with highest co-occurrence', () => {
    const habits = [
      { id: 'h1', name: 'Drink Water' },
      { id: 'h2', name: 'Exercise' },
      { id: 'h3', name: 'Read' }
    ];

    // Water and Exercise done together on all 14 days; Read done on 2 days
    const logs = [];
    for (let i = 1; i <= 15; i++) {
      const dStr = `2026-03-${String(i).padStart(2, '0')}`;
      logs.push({ habitId: 'h1', date: dStr });
      logs.push({ habitId: 'h2', date: dStr });
      if (i === 1 || i === 2) logs.push({ habitId: 'h3', date: dStr });
    }

    const res = computeCrossInsights({ today: baseToday, habits, logs });
    assert.equal(res.enough, true);
    assert.ok(res.bestPair);
    assert.equal(res.bestPair.habitA.name, 'Drink Water');
    assert.equal(res.bestPair.habitB.name, 'Exercise');
    assert.equal(res.bestPair.percent, 100);
    assert.ok(res.bestPair.sentence.includes('100% of the time'));
  });

  test('keystone habit: finds habit whose completion days maximize other habits completed', () => {
    const habits = [
      { id: 'h1', name: 'Morning Routine' },
      { id: 'h2', name: 'Code' },
      { id: 'h3', name: 'Walk' }
    ];

    // Whenever "Morning Routine" is done (5 days), Code and Walk are also done (2 other habits)
    // Whenever "Code" is done alone (10 days), no other habit is done
    const logs = [];
    for (let i = 1; i <= 14; i++) {
      const dStr = `2026-03-${String(i).padStart(2, '0')}`;
      if (i <= 5) {
        logs.push({ habitId: 'h1', date: dStr });
        logs.push({ habitId: 'h2', date: dStr });
        logs.push({ habitId: 'h3', date: dStr });
      } else {
        logs.push({ habitId: 'h2', date: dStr });
      }
    }

    const res = computeCrossInsights({ today: baseToday, habits, logs });
    assert.equal(res.enough, true);
    assert.ok(res.keystone);
    assert.equal(res.keystone.habit.name, 'Morning Routine');
    assert.equal(res.keystone.avgOther, 2.0);
    assert.ok(res.keystone.sentence.includes('average 2 other habits'));
  });

  test('tie-breaking: alphabetical stability for best pair, keystone, and matrix', () => {
    const habits = [
      { id: 'h2', name: 'Beta' },
      { id: 'h1', name: 'Alpha' }
    ];

    // Alpha and Beta have exact identical completion logs on 15 days
    const logs = [];
    for (let i = 1; i <= 15; i++) {
      const dStr = `2026-03-${String(i).padStart(2, '0')}`;
      logs.push({ habitId: 'h1', date: dStr });
      logs.push({ habitId: 'h2', date: dStr });
    }

    const res = computeCrossInsights({ today: baseToday, habits, logs });
    assert.equal(res.enough, true);

    // Habits in matrix must be sorted alphabetically: Alpha (index 0), Beta (index 1)
    assert.equal(res.matrix.habits[0].name, 'Alpha');
    assert.equal(res.matrix.habits[1].name, 'Beta');

    // Keystone tied at 1.0 other habits: Alpha wins alphabetically
    assert.equal(res.keystone.habit.name, 'Alpha');

    // Best pair names ordered alphabetically
    assert.equal(res.bestPair.habitA.name, 'Alpha');
    assert.equal(res.bestPair.habitB.name, 'Beta');
  });

  test('dropped together: finds pair most often both missed when other habit was done', () => {
    const habits = [
      { id: 'h1', name: 'Code' },
      { id: 'h2', name: 'Drink Water' },
      { id: 'h3', name: 'Exercise' }
    ];

    // 15 days: Drink Water is done every day. Code and Exercise are both missed on 10 of those days.
    const logs = [];
    for (let i = 1; i <= 15; i++) {
      const dStr = `2026-03-${String(i).padStart(2, '0')}`;
      logs.push({ habitId: 'h2', date: dStr }); // Water always done
      if (i > 10) {
        logs.push({ habitId: 'h1', date: dStr });
        logs.push({ habitId: 'h3', date: dStr });
      }
    }

    const res = computeCrossInsights({ today: baseToday, habits, logs });
    assert.equal(res.enough, true);
    assert.ok(res.droppedTogether);
    assert.equal(res.droppedTogether.habitA.name, 'Code');
    assert.equal(res.droppedTogether.habitB.name, 'Exercise');
    assert.equal(res.droppedTogether.missedTogetherCount, 10);
    assert.ok(res.droppedTogether.sentence.includes('most often missed together (10 days)'));
  });
});
