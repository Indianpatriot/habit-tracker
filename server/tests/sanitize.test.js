const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { hasDangerousKeys } = require('../middleware/sanitize');

describe('Input Sanitization Pure Helper (hasDangerousKeys)', () => {
  it('returns false for primitives, null, and undefined', () => {
    assert.strictEqual(hasDangerousKeys(null), false);
    assert.strictEqual(hasDangerousKeys(undefined), false);
    assert.strictEqual(hasDangerousKeys('hello'), false);
    assert.strictEqual(hasDangerousKeys(123), false);
    assert.strictEqual(hasDangerousKeys(true), false);
  });

  it('returns false for safe plain objects and arrays', () => {
    assert.strictEqual(hasDangerousKeys({ name: 'Alex', email: 'alex@example.com' }), false);
    assert.strictEqual(hasDangerousKeys({ habit: { name: 'Coding', count: 10 } }), false);
    assert.strictEqual(hasDangerousKeys(['apple', 'banana', { count: 3 }]), false);
  });

  it('detects keys starting with "$" at top level', () => {
    assert.strictEqual(hasDangerousKeys({ $gt: '' }), true);
    assert.strictEqual(hasDangerousKeys({ $where: '1 == 1' }), true);
    assert.strictEqual(hasDangerousKeys({ $ne: null }), true);
  });

  it('detects keys containing "." at top level', () => {
    assert.strictEqual(hasDangerousKeys({ 'user.password': 'admin' }), true);
    assert.strictEqual(hasDangerousKeys({ 'profile.picture': 'test' }), true);
  });

  it('detects dangerous keys nested deeply inside objects', () => {
    const nested = {
      level1: {
        level2: {
          level3: {
            $regex: '.*'
          }
        }
      }
    };
    assert.strictEqual(hasDangerousKeys(nested), true);

    const dottedNested = {
      user: {
        settings: {
          'theme.mode': 'dark'
        }
      }
    };
    assert.strictEqual(hasDangerousKeys(dottedNested), true);
  });

  it('detects dangerous keys inside arrays at any depth', () => {
    assert.strictEqual(hasDangerousKeys([{ safe: 1 }, { $in: [1, 2] }]), true);
    assert.strictEqual(hasDangerousKeys([[[{ 'nested.key': 'val' }]]]), true);
  });
});

