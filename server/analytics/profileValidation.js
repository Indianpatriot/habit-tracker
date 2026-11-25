/**
 * Pure validators for user profile fields
 */

/**
 * Validates user display name
 * Must be a string with trimmed length between 2 and 50 characters
 * @param {*} name
 * @returns {{ valid: boolean, error?: string, value?: string }}
 */
const validateName = (name) => {
  if (typeof name !== 'string') {
    return { valid: false, error: 'Name must be a string' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) {
    return { valid: false, error: 'Name must be between 2 and 50 characters' };
  }
  return { valid: true, value: trimmed };
};

/**
 * Validates user age
 * Accepts null, undefined, or empty string to clear.
 * If provided as a number or numeric string, must be an integer between 10 and 100.
 * @param {*} age
 * @returns {{ valid: boolean, error?: string, value?: number|null }}
 */
const validateAge = (age) => {
  if (age === null || age === undefined || age === '') {
    return { valid: true, value: null };
  }
  const num = typeof age === 'number' ? age : Number(age);
  if (!Number.isInteger(num)) {
    return { valid: false, error: 'Age must be an integer' };
  }
  if (num < 10 || num > 100) {
    return { valid: false, error: 'Age must be between 10 and 100' };
  }
  return { valid: true, value: num };
};

/**
 * Validates email format
 * @param {*} email
 * @returns {{ valid: boolean, error?: string, value?: string }}
 */
const validateEmail = (email) => {
  if (typeof email !== 'string') {
    return { valid: false, error: 'Email must be a string' };
  }
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }
  return { valid: true, value: trimmed };
};

/**
 * Validates profile picture data URL
 * Allows empty string "" to remove picture.
 * If non-empty, must start with:
 * data:image/png;base64, data:image/jpeg;base64, or data:image/webp;base64,
 * and length <= 200,000 characters.
 * @param {*} picture
 * @returns {{ valid: boolean, error?: string, value?: string }}
 */
const validatePicture = (picture) => {
  if (picture === null || picture === undefined || picture === '') {
    return { valid: true, value: '' };
  }
  if (typeof picture !== 'string') {
    return { valid: false, error: 'Picture must be a base64 data URL string' };
  }
  if (picture.length > 200000) {
    return { valid: false, error: 'Picture exceeds maximum allowed size (200,000 characters)' };
  }
  const prefixRegex = /^data:image\/(png|jpeg|webp);base64,/;
  if (!prefixRegex.test(picture)) {
    return { valid: false, error: 'Picture must be a valid PNG, JPEG, or WebP base64 data URL' };
  }
  return { valid: true, value: picture };
};

module.exports = {
  validateName,
  validateAge,
  validateEmail,
  validatePicture
};

