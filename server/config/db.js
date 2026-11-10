const mongoose = require('mongoose');

// Connect to MongoDB Atlas using connection string from environment variables
const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn('Warning: MONGO_URI is not set in .env. Waiting for MongoDB Atlas URI.');
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1); // Exit process with failure code on connection failure
  }
};

module.exports = connectDB;

