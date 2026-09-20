import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-prod';
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ----------------------------------------------------
// MongoDB Connection & Schemas
// ----------------------------------------------------
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
} else {
  console.warn('WARNING: MONGODB_URI environment variable is not set. API requests will fail.');
}

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const trackerDataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  curriculum: { type: String, enum: ['dsa', 'hld', 'lld'], required: true },
  problems: { type: mongoose.Schema.Types.Mixed },
  contests: { type: mongoose.Schema.Types.Mixed },
  settings: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

// Compound index to ensure one record per curriculum per user
trackerDataSchema.index({ userId: 1, curriculum: 1 }, { unique: true });

const TrackerData = mongoose.model('TrackerData', trackerDataSchema);


// ----------------------------------------------------
// Authentication Routes
// ----------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Username already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Middleware to protect routes
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};


// ----------------------------------------------------
// Data Routes (Protected)
// ----------------------------------------------------

const getSafeCurriculum = (c) => {
  const allowed = ['dsa', 'hld', 'lld'];
  return allowed.includes(c) ? c : 'dsa';
};

app.get('/api/data/:curriculum', authMiddleware, async (req, res) => {
  try {
    const curriculum = getSafeCurriculum(req.params.curriculum);
    const data = await TrackerData.findOne({ userId: req.user.userId, curriculum });
    
    if (!data) {
      // Return empty default state if not found
      return res.json({ problems: null, contests: null, settings: null });
    }
    
    res.json({
      problems: data.problems,
      contests: data.contests,
      settings: data.settings,
      lastUpdated: data.updatedAt
    });
  } catch (error) {
    console.error('Error reading data:', error);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Fallback GET
app.get('/api/data', authMiddleware, async (req, res) => {
  try {
    const data = await TrackerData.findOne({ userId: req.user.userId, curriculum: 'dsa' });
    if (!data) return res.json({ problems: null, contests: null, settings: null });
    res.json({
      problems: data.problems,
      contests: data.contests,
      settings: data.settings,
      lastUpdated: data.updatedAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

app.post('/api/data/:curriculum', authMiddleware, async (req, res) => {
  try {
    const curriculum = getSafeCurriculum(req.params.curriculum);
    const { problems, contests, settings, lastUpdated } = req.body;
    
    // Check for conflicts
    const existing = await TrackerData.findOne({ userId: req.user.userId, curriculum });
    if (existing && existing.updatedAt && lastUpdated && new Date(lastUpdated) < existing.updatedAt) {
      return res.status(409).json({ error: 'Conflict: Data modified on another device' });
    }
    
    const update = {};
    if (problems !== undefined) update.problems = problems;
    if (contests !== undefined) update.contests = contests;
    if (settings !== undefined) update.settings = settings;

    const updated = await TrackerData.findOneAndUpdate(
      { userId: req.user.userId, curriculum },
      { $set: update },
      { upsert: true, new: true }
    );
    
    res.json({ success: true, lastUpdated: updated.updatedAt });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Fallback POST
app.post('/api/data', authMiddleware, async (req, res) => {
  try {
    const { problems, contests, settings, lastUpdated } = req.body;
    
    // Check for conflicts
    const existing = await TrackerData.findOne({ userId: req.user.userId, curriculum: 'dsa' });
    if (existing && existing.updatedAt && lastUpdated && new Date(lastUpdated) < existing.updatedAt) {
      return res.status(409).json({ error: 'Conflict: Data modified on another device' });
    }

    const update = {};
    if (problems !== undefined) update.problems = problems;
    if (contests !== undefined) update.contests = contests;
    if (settings !== undefined) update.settings = settings;

    const updated = await TrackerData.findOneAndUpdate(
      { userId: req.user.userId, curriculum: 'dsa' },
      { $set: update },
      { upsert: true, new: true }
    );
    res.json({ success: true, lastUpdated: updated.updatedAt });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// ----------------------------------------------------
// Static Files
// ----------------------------------------------------
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
