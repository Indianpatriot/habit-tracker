const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateName,
  validateAge,
  validateEmail,
  validatePicture
} = require('../analytics/profileValidation');

describe('Profile Validation Pure Helpers', () => {
  describe('validateName', () => {
    it('accepts valid names between 2 and 50 characters', () => {
      assert.deepStrictEqual(validateName('Alex'), { valid: true, value: 'Alex' });
      assert.deepStrictEqual(validateName('  Taylor Swift  '), { valid: true, value: 'Taylor Swift' });
      assert.strictEqual(validateName('A'.repeat(50)).valid, true);
    });

    it('rejects non-strings or names outside 2-50 character bounds', () => {
      assert.strictEqual(validateName(123).valid, false);
      assert.strictEqual(validateName('A').valid, false);
      assert.strictEqual(validateName('   ').valid, false);
      assert.strictEqual(validateName('A'.repeat(51)).valid, false);
    });
  });

  describe('validateAge', () => {
    it('accepts null, undefined, or empty string to clear age', () => {
      assert.deepStrictEqual(validateAge(null), { valid: true, value: null });
      assert.deepStrictEqual(validateAge(undefined), { valid: true, value: null });
      assert.deepStrictEqual(validateAge(''), { valid: true, value: null });
    });

    it('accepts integers between 10 and 100', () => {
      assert.deepStrictEqual(validateAge(10), { valid: true, value: 10 });
      assert.deepStrictEqual(validateAge(25), { valid: true, value: 25 });
      assert.deepStrictEqual(validateAge('30'), { valid: true, value: 30 });
      assert.deepStrictEqual(validateAge(100), { valid: true, value: 100 });
    });

    it('rejects age outside 10 to 100 or non-integer', () => {
      assert.strictEqual(validateAge(9).valid, false);
      assert.strictEqual(validateAge(101).valid, false);
      assert.strictEqual(validateAge(25.5).valid, false);
      assert.strictEqual(validateAge('notanumber').valid, false);
    });
  });

  describe('validateEmail', () => {
    it('accepts valid email addresses and normalizes to lowercase', () => {
      assert.deepStrictEqual(validateEmail('user@example.com'), { valid: true, value: 'user@example.com' });
      assert.deepStrictEqual(validateEmail('USER@EXAMPLE.COM'), { valid: true, value: 'user@example.com' });
      assert.deepStrictEqual(validateEmail('john.doe+tag@rvce.edu.in'), { valid: true, value: 'john.doe+tag@rvce.edu.in' });
    });

    it('rejects invalid email formats or non-strings', () => {
      assert.strictEqual(validateEmail(null).valid, false);
      assert.strictEqual(validateEmail('notanemail').valid, false);
      assert.strictEqual(validateEmail('missing@domain').valid, false);
      assert.strictEqual(validateEmail('@missinguser.com').valid, false);
    });
  });

  describe('validatePicture', () => {
    it('accepts empty string, null, or undefined to clear picture', () => {
      assert.deepStrictEqual(validatePicture(''), { valid: true, value: '' });
      assert.deepStrictEqual(validatePicture(null), { valid: true, value: '' });
      assert.deepStrictEqual(validatePicture(undefined), { valid: true, value: '' });
    });

    it('accepts valid PNG, JPEG, and WebP base64 data URLs within 200,000 characters', () => {
      const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const jpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
      const webp = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';

      assert.deepStrictEqual(validatePicture(png), { valid: true, value: png });
      assert.deepStrictEqual(validatePicture(jpeg), { valid: true, value: jpeg });
      assert.deepStrictEqual(validatePicture(webp), { valid: true, value: webp });
    });

    it('rejects pictures with invalid prefixes', () => {
      assert.strictEqual(validatePicture('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7').valid, false);
      assert.strictEqual(validatePicture('https://example.com/avatar.png').valid, false);
      assert.strictEqual(validatePicture('data:text/plain;base64,SGVsbG8=').valid, false);
    });

    it('rejects pictures exceeding 200,000 characters', () => {
      const largePicture = 'data:image/jpeg;base64,' + 'A'.repeat(200001);
      const res = validatePicture(largePicture);
      assert.strictEqual(res.valid, false);
      assert.match(res.error, /maximum allowed size/i);
    });
  });
});

