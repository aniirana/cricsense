require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const mongoose   = require('mongoose');
const authRoutes = require('./routes/auth');
const analysisRoutes = require('./routes/analysis');
const userRoutes = require('./routes/user');

const app  = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth',     authRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/user',     userRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'CricSense Backend' }));

// MongoDB + Start
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cricsense')
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));
  })
  .catch(err => { console.error('❌ MongoDB error:', err); process.exit(1); });
