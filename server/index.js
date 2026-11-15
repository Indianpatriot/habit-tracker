const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables safely
dotenv.config();
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

// Startup check: JWT_SECRET must exist and be at least 32 characters long
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is missing or less than 32 characters.');
  process.exit(1);
}

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { sanitizeInput } = require('./middleware/sanitize');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy in production (e.g. behind Render / Heroku / Nginx)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Connect to MongoDB Atlas
connectDB();

// 1. Basic security headers
app.use(helmet());
app.disable('x-powered-by');

// 2. CORS configuration (comma-separated list allowed, defaults to http://localhost:5173)
const rawOrigins = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const allowedOrigins = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g. curl, server-to-server) or listed origins
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

// 3. Body parsing: 300kb for profile update, 100kb globally for all other routes
app.use((req, res, next) => {
  if (req.method === 'PUT' && req.path === '/api/auth/me') {
    return express.json({ limit: '300kb' })(req, res, next);
  }
  return express.json({ limit: '100kb' })(req, res, next);
});

// 4. Input sanitization: block keys starting with "$" or containing "."
app.use(sanitizeInput);

// 5. Logging
app.use(morgan('dev'));

// 6. Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
  statusCode: 429
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
  statusCode: 429
});

// Health check endpoint (exempt from rate limit)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Auth endpoints get authLimiter
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// General API rate limiter for all other /api routes
app.use('/api', apiLimiter);

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/habits', require('./routes/habitRoutes'));
app.use('/api/logs', require('./routes/logRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));
app.use('/api/badges', require('./routes/badgeRoutes'));
app.use('/api/insights', require('./routes/insightRoutes'));

// Central error handling middleware (must be registered after routes)
app.use(errorHandler);

// Listen on PORT
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
