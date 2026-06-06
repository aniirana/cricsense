const express  = require('express');
const auth     = require('../middleware/auth');
const User     = require('../models/User');
const Analysis = require('../models/Analysis');
const router   = express.Router();

// GET /api/user/me
router.get('/me', auth, (req, res) => res.json(req.user));

// GET /api/user/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const total   = await Analysis.countDocuments({ user: req.user._id });
    const batting = await Analysis.countDocuments({ user: req.user._id, mode: 'bat' });
    const bowling = await Analysis.countDocuments({ user: req.user._id, mode: 'bowl' });
    const recent  = await Analysis.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(5);
    res.json({ total, batting, bowling, recent });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/user/me
router.patch('/me', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name }, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
