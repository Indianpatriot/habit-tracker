const mongoose = require('mongoose');

// Habit schema: tracks habit names linked to specific users
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Habit', habitSchema);

