require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Habit = require('./models/Habit');
const Log = require('./models/Log');

// Generate UTC midnight Date for day offset from today
const getDayUTC = (daysAgo) => {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
};

async function seedData() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not set in environment.');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB Atlas for seeding.');

    // 1. Create or retrieve demo user using generic dummy name Alice
    let user = await User.findOne({ email: 'alice@example.com' });
    if (!user) {
      user = await User.create({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'password123'
      });
      console.log('Created demo user: Alice (alice@example.com)');
    } else {
      console.log('Found existing demo user: Alice');
    }

    // 2. Clean existing habits & logs for demo user
    const existingHabits = await Habit.find({ userId: user._id });
    const habitIds = existingHabits.map((h) => h._id);
    await Log.deleteMany({ habitId: { $in: habitIds } });
    await Habit.deleteMany({ userId: user._id });
    console.log('Cleaned previous habits and logs for demo user.');

    // 3. Create habits: 1 daily, 1 weekly_target (target 3), 1 weekdays (Mon/Wed/Fri), plus correlated habit
    const dailyHabit = await Habit.create({
      userId: user._id,
      name: 'Morning Meditation',
      goalType: 'daily'
    });

    const weeklyHabit = await Habit.create({
      userId: user._id,
      name: 'Workout',
      goalType: 'weekly_target',
      targetPerWeek: 3
    });

    const weekdaysHabit = await Habit.create({
      userId: user._id,
      name: 'Study Algorithms',
      goalType: 'weekdays',
      weekdays: [1, 3, 5] // Monday, Wednesday, Friday
    });

    // Correlated habit (Read) for Task 4
    const readHabit = await Habit.create({
      userId: user._id,
      name: 'Read',
      goalType: 'daily'
    });

    console.log('Created habits:', {
      daily: dailyHabit.name,
      weekly: `${weeklyHabit.name} (target: ${weeklyHabit.targetPerWeek}/wk)`,
      weekdays: `${weekdaysHabit.name} (Mon/Wed/Fri)`,
      correlated: readHabit.name
    });

    // 4. Generate ~2 years (730 days) of realistic random check-in data
    const totalDays = 730;
    const logs = [];

    // Simple deterministic pseudo-random helper for consistent seed distribution
    let seed = 42;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = totalDays - 1; i >= 0; i--) {
      const date = getDayUTC(i);
      const dayOfWeek = date.getUTCDay();

      // Daily habit: ~75% completion rate with realistic clusters
      if (random() < 0.75) {
        logs.push({ habitId: dailyHabit._id, userId: user._id, date });
      }

      // Weekly habit (Workout): target 3/wk, ~50% day completion probability
      const workoutDone = random() < 0.45;
      if (workoutDone) {
        logs.push({ habitId: weeklyHabit._id, userId: user._id, date });
      }

      // Read habit: planted correlation with Workout
      // When Workout is done, Read is done ~80% of the time; otherwise ~25%
      const readThreshold = workoutDone ? 0.80 : 0.25;
      if (random() < readThreshold) {
        logs.push({ habitId: readHabit._id, userId: user._id, date });
      }

      // Weekdays habit: Mon, Wed, Fri only, ~85% consistency on scheduled days
      if ([1, 3, 5].includes(dayOfWeek)) {
        if (random() < 0.85) {
          logs.push({ habitId: weekdaysHabit._id, userId: user._id, date });
        }
      }
    }

    if (logs.length > 0) {
      await Log.insertMany(logs, { ordered: false });
      console.log(`Inserted ${logs.length} check-in logs over ~2 years.`);
    }

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  seedData();
}

module.exports = { seedData };
