const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parsePagination, computeTotalPages } = require('../analytics/pagination');

describe('Pagination Pure Helpers', () => {
  describe('parsePagination', () => {
    it('uses defaults when parameters are omitted', () => {
      const result = parsePagination({});
      assert.deepStrictEqual(result, { page: 1, limit: 10 });
    });

    it('parses valid numeric strings and numbers', () => {
      assert.deepStrictEqual(parsePagination({ page: '2', limit: '20' }), { page: 2, limit: 20 });
      assert.deepStrictEqual(parsePagination({ page: 3, limit: 50 }), { page: 3, limit: 50 });
    });

    it('enforces limit cap of 50', () => {
      assert.strictEqual(parsePagination({ limit: 50 }).limit, 50);
      assert.throws(() => parsePagination({ limit: 51 }), (err) => err.statusCode === 400);
      assert.throws(() => parsePagination({ limit: 100 }), (err) => err.statusCode === 400);
    });

    it('rejects invalid page values (0, negative, float, non-numeric)', () => {
      assert.throws(() => parsePagination({ page: 0 }), (err) => err.statusCode === 400);
      assert.throws(() => parsePagination({ page: -1 }), (err) => err.statusCode === 400);
      assert.throws(() => parsePagination({ page: 1.5 }), (err) => err.statusCode === 400);
      assert.throws(() => parsePagination({ page: 'abc' }), (err) => err.statusCode === 400);
    });

    it('rejects invalid limit values (0, negative, float, non-numeric)', () => {
      assert.throws(() => parsePagination({ limit: 0 }), (err) => err.statusCode === 400);
      assert.throws(() => parsePagination({ limit: -5 }), (err) => err.statusCode === 400);
      assert.throws(() => parsePagination({ limit: 10.2 }), (err) => err.statusCode === 400);
      assert.throws(() => parsePagination({ limit: 'xyz' }), (err) => err.statusCode === 400);
    });
  });

  describe('computeTotalPages', () => {
    it('returns 0 when total items is 0', () => {
      assert.strictEqual(computeTotalPages(0, 10), 0);
    });

    it('computes exact pages correctly', () => {
      assert.strictEqual(computeTotalPages(20, 10), 2);
      assert.strictEqual(computeTotalPages(50, 25), 2);
    });

    it('rounds up for partial pages', () => {
      assert.strictEqual(computeTotalPages(25, 10), 3);
      assert.strictEqual(computeTotalPages(1, 10), 1);
      assert.strictEqual(computeTotalPages(11, 10), 2);
    });

    it('handles negative or invalid inputs gracefully', () => {
      assert.strictEqual(computeTotalPages(-5, 10), 0);
      assert.strictEqual(computeTotalPages(10, 0), 10);
    });
  });
});
