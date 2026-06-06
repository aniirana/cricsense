const express  = require('express');
const multer   = require('multer');
const axios    = require('axios');
const FormData = require('form-data');
const fs       = require('fs');
const auth     = require('../middleware/auth');
const Analysis = require('../models/Analysis');
const { isCloudStorageEnabled, uploadArtifact } = require('../lib/storage');
const router   = express.Router();

const upload = multer({ dest: 'uploads/' });
const aiBaseUrl = () => process.env.AI_API_URL || 'http://localhost:8000';

function safeUnlink(filePath) {
  if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function aiDownloadUrl(kind, filePath) {
  if (!filePath) return '';
  return `${aiBaseUrl()}/download/${kind}?path=${encodeURIComponent(filePath)}`;
}

function sampleMetrics(metrics, maxRows = 600) {
  if (!Array.isArray(metrics) || metrics.length <= maxRows) return metrics || [];
  const step = Math.ceil(metrics.length / maxRows);
  return metrics.filter((_, index) => index % step === 0);
}

// POST /api/analysis/upload
router.post('/upload', auth, upload.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No video uploaded' });
  const { mode, title } = req.body;
  if (!mode) return res.status(400).json({ message: 'mode is required (bat or bowl)' });

  try {
    // Forward video to Python AI API
    const form = new FormData();
    form.append('video', fs.createReadStream(req.file.path), req.file.originalname);
    form.append('mode', mode);

    const aiRes = await axios.post(
      `${aiBaseUrl()}/analyze`,
      form,
      { headers: form.getHeaders(), timeout: 300000 }
    );

    const { summary, alerts, suggestions, metrics, frames, video_path, csv_path } = aiRes.data;

    let originalVideoUrl = '';
    let analyzedVideoUrl = aiDownloadUrl('video', video_path);
    let csvUrl = aiDownloadUrl('csv', csv_path);
    let storageProvider = 'local';

    if (isCloudStorageEnabled()) {
      const [originalUpload, analyzedUpload, csvUpload] = await Promise.all([
        uploadArtifact(req.file.path, 'cricsense/originals', 'video'),
        video_path && fs.existsSync(video_path) ? uploadArtifact(video_path, 'cricsense/analyzed', 'video') : null,
        csv_path && fs.existsSync(csv_path) ? uploadArtifact(csv_path, 'cricsense/csv', 'raw') : null,
      ]);

      originalVideoUrl = originalUpload?.url || '';
      analyzedVideoUrl = analyzedUpload?.url || analyzedVideoUrl;
      csvUrl = csvUpload?.url || csvUrl;
      storageProvider = 'cloudinary';
      safeUnlink(video_path);
      safeUnlink(csv_path);
    }

    // Save result to MongoDB
    const analysis = await Analysis.create({
      user:      req.user._id,
      mode,
      title:     title || `${mode === 'bat' ? 'Batting' : 'Bowling'} Analysis`,
      summary,
      alerts,
      suggestions,
      metrics: sampleMetrics(metrics),
      frames,
      originalVideoUrl,
      analyzedVideoUrl,
      csvUrl,
      storageProvider,
      videoPath: video_path,
      csvPath:   csv_path,
    });

    safeUnlink(req.file.path);
    res.status(201).json({ analysis, video_path, csv_path, analyzedVideoUrl, csvUrl });
  } catch (err) {
    safeUnlink(req.file?.path);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/analysis/history
router.get('/history', auth, async (req, res) => {
  try {
    const analyses = await Analysis.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(analyses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/analysis/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const analysis = await Analysis.findOne({ _id: req.params.id, user: req.user._id });
    if (!analysis) return res.status(404).json({ message: 'Not found' });
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/analysis/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await Analysis.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
