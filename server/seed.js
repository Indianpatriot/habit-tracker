require('dotenv').config();
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables safely
dotenv.config();
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

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

    // 1. Create or reset demo user: demo@habit.com / demo1234
    const demoEmail = 'demo@habit.com';
    let user = await User.findOne({ email: demoEmail });
    if (!user) {
      user = await User.create({
        name: 'Demo User',
        email: demoEmail,
        password: 'demo1234'
      });
      console.log('Created demo user: demo@habit.com');
    } else {
      user.password = 'demo1234';
      await user.save();
      console.log('Reset password for demo user: demo@habit.com');
    }

    // 2. Idempotent cleanup: delete demo user old habits and logs
    const existingHabits = await Habit.find({ userId: user._id });
    const habitIds = existingHabits.map((h) => h._id);
    await Log.deleteMany({ habitId: { $in: habitIds } });
    await Habit.deleteMany({ userId: user._id });
    console.log(`Cleaned ${habitIds.length} previous habits and associated logs for demo user.`);

    // 3. Create the 5 required habits
    // Exercise, Read, Meditate, Drink Water, Code
    const habitsToCreate = [
      { name: 'Drink Water', goalType: 'daily' },
      { name: 'Exercise', goalType: 'daily' },
      { name: 'Code', goalType: 'daily' },
      { name: 'Read', goalType: 'daily' },
      { name: 'Meditate', goalType: 'daily' }
    ];

    const habits = await Habit.insertMany(
      habitsToCreate.map((h) => ({ ...h, userId: user._id }))
    );

    const habitMap = {};
    habits.forEach((h) => {
      habitMap[h.name] = h;
    });

    console.log('Created 5 habits:', habits.map((h) => h.name).join(', '));

    // 4. Generate ~90 days of logs per habit with varying densities and deliberate streaks
    // Days range from 89 days ago (i = 89) to 0 days ago (today, i = 0)
    const logs = [];

    // Drink Water: Most active (~85% completion, current streak: 12 days)
    for (let i = 89; i >= 0; i--) {
      // Deliberate current streak: past 12 days (0 to 11) completed
      if (i <= 11) {
        logs.push({ habitId: habitMap['Drink Water']._id, userId: user._id, date: getDayUTC(i) });
      } else if (i % 7 !== 0 && i % 13 !== 0) {
        // ~83% of other days
        logs.push({ habitId: habitMap['Drink Water']._id, userId: user._id, date: getDayUTC(i) });
      }
    }

    // Exercise: Active (~65% completion, current streak: 4 days)
    for (let i = 89; i >= 0; i--) {
      if (i <= 3) {
        logs.push({ habitId: habitMap['Exercise']._id, userId: user._id, date: getDayUTC(i) });
      } else if (i > 3 && (i % 3 !== 0)) {
        logs.push({ habitId: habitMap['Exercise']._id, userId: user._id, date: getDayUTC(i) });
      }
    }

    // Code: Moderate (~50% completion, completed yesterday, not today)
    for (let i = 89; i >= 0; i--) {
      if (i === 1 || i === 2 || i === 3) {
        logs.push({ habitId: habitMap['Code']._id, userId: user._id, date: getDayUTC(i) });
      } else if (i > 3 && i % 2 === 0) {
        logs.push({ habitId: habitMap['Code']._id, userId: user._id, date: getDayUTC(i) });
      }
    }

    // Read: Lower completion (~35%, deliberate gap of 5 days)
    for (let i = 89; i >= 0; i--) {
      if (i > 5 && i % 3 === 0) {
        logs.push({ habitId: habitMap['Read']._id, userId: user._id, date: getDayUTC(i) });
      }
    }

    // Meditate: Least active (~20%, scattered completions, no current streak)
    for (let i = 89; i >= 0; i--) {
      if (i > 7 && i % 5 === 0) {
        logs.push({ habitId: habitMap['Meditate']._id, userId: user._id, date: getDayUTC(i) });
      }
    }

    // 5. Insert logs using insertMany with ordered: false
    const insertResult = await Log.insertMany(logs, { ordered: false });

    // Print summary counts only (NEVER the URI)
    console.log('--- Seed Summary ---');
    console.log(`Demo User: demo@habit.com (password: demo1234)`);
    console.log(`Habits created: ${habits.length}`);
    console.log(`Total completion logs inserted: ${insertResult.length}`);
    for (const h of habits) {
      const habitLogCount = logs.filter((l) => l.habitId.toString() === h._id.toString()).length;
      console.log(`  - ${h.name}: ${habitLogCount} logs`);
    }
    console.log('Seeding finished successfully.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

seedData();
