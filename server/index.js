const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env in /server or project root
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas
connectDB();

// Global middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Central error handling middleware (must be registered after routes)
app.use(errorHandler);

// Start HTTP server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

