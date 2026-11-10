const mongoose = require('mongoose');

// Custom setter: normalises any input date to UTC midnight (00:00:00.000Z)
// Handles "YYYY-MM-DD" strings, full ISO strings, and Date objects safely
const normalizeToUTCMidnight = (val) => {
  if (!val) return val;

  // If already in YYYY-MM-DD format, construct UTC date directly to avoid local timezone offset
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [year, month, day] = val.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }

  const date = new Date(val);
  // If invalid date, return as-is so Mongoose schema validation can trigger the error
  if (isNaN(date.getTime())) return val;

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
};

// Custom getter: returns the stored Date formatted as a "YYYY-MM-DD" string
const formatDateToYYYYMMDD = (val) => {
  if (!val || !(val instanceof Date) || isNaN(val.getTime())) {
    return val;
  }
  return val.toISOString().slice(0, 10);
};

const logSchema = new mongoose.Schema(
  {
    habitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habit',
      required: [true, 'Habit reference is required']
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    date: {
      type: Date,
      required: [true, 'Log date is required'],
      set: normalizeToUTCMidnight,
      get: formatDateToYYYYMMDD
    }
  },
  {
    // Enable custom getters when serializing to JSON or plain JS objects
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

// Unique compound index: prevents duplicate logs for the same habit on the same day
logSchema.index({ habitId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Log', logSchema);

