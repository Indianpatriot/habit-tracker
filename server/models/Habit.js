const mongoose = require('mongoose');

// Habit schema: tracks habit names, goal types, and targets linked to specific users
const habitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  name: {
    type: String,
    required: [true, 'Habit name is required'],
    trim: true,
    minlength: [2, 'Habit name must be at least 2 characters']
  },
  goalType: {
    type: String,
    enum: {
      values: ['daily', 'weekly_target', 'weekdays'],
      message: 'goalType must be daily, weekly_target, or weekdays'
    },
    default: 'daily'
  },
  targetPerWeek: {
    type: Number,
    min: [1, 'targetPerWeek must be between 1 and 7'],
    max: [7, 'targetPerWeek must be between 1 and 7'],
    validate: {
      validator: function (v) {
        if (this.goalType === 'weekly_target') {
          return typeof v === 'number' && v >= 1 && v <= 7;
        }
        return true;
      },
      message: 'targetPerWeek (1-7) is required when goalType is weekly_target'
    }
  },
  weekdays: {
    type: [Number],
    validate: {
      validator: function (v) {
        if (this.goalType === 'weekdays') {
          return Array.isArray(v) && v.length > 0 && v.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);
        }
        return true;
      },
      message: 'weekdays array (0=Sunday to 6=Saturday) is required when goalType is weekdays'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Habit', habitSchema);
