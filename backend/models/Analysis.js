const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mode:      { type: String, enum: ['bat','bowl'], required: true },
  title:     { type: String, default: '' },
  summary:   { type: Map, of: String },
  alerts:    [String],
  suggestions: [String],
  metrics:   [{ type: mongoose.Schema.Types.Mixed }],
  frames:    { type: Number, default: 0 },
  originalVideoUrl: { type: String, default: '' },
  analyzedVideoUrl: { type: String, default: '' },
  csvUrl:     { type: String, default: '' },
  storageProvider: { type: String, enum: ['local','cloudinary'], default: 'local' },
  videoPath: { type: String, default: '' },
  csvPath:   { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Analysis', analysisSchema);
