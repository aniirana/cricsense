require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const analysisRoutes = require('./routes/analysis');
const userRoutes = require('./routes/user');

const app = express();
const PORT = process.env.PORT || 4000;

// -------------------------
// CORS FIX (PRODUCTION SAFE)
// -------------------------
const allowedOrigins = [
  "http://localhost:3000",
  "https://cricsense.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

// -------------------------
// MIDDLEWARE
// -------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -------------------------
// ROUTES
// -------------------------
app.use('/api/auth', authRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/user', userRoutes);

app.get('/health', (_, res) =>
  res.json({ status: 'ok', service: 'CricSense Backend' })
);

// -------------------------
// DATABASE + SERVER START
// -------------------------
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cricsense')
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () =>
      console.log(`🚀 Backend running on http://localhost:${PORT}`)
    );
  })
  .catch(err => {
    console.error('❌ MongoDB error:', err);
    process.exit(1);
  });