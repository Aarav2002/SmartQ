const express = require('express');
const QueueEntry = require('../models/QueueEntry');
const ServiceProvider = require('../models/ServiceProvider');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Auth middleware (reuse from auth.js)
const auth = (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ message: 'No token provided' });
  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Role check middleware
const requireStaffOrAdmin = (req, res, next) => {
  if (req.user.role === 'staff' || req.user.role === 'admin') return next();
  return res.status(403).json({ message: 'Forbidden' });
};

// Join a queue (customer)
router.post('/join', auth, async (req, res) => {
  try {
    const { providerId } = req.body;
    const provider = await ServiceProvider.findById(providerId);
    if (!provider) return res.status(404).json({ message: 'Provider not found' });
    
    // Check if user is currently being served (check if any entry exists with serving status)
    // Note: serving status might be tracked differently, let's check both ways
    const currentlyServing = await QueueEntry.findOne({ 
      user: req.user.id, 
      $or: [
        { status: 'serving' },
        { status: 'waiting' } // temporary check
      ]
    });
    
    // For now, let's just check if user is already in any waiting queue
    const userInAnyQueue = await QueueEntry.findOne({ 
      user: req.user.id, 
      status: 'waiting' 
    });
    
    if (userInAnyQueue && userInAnyQueue.provider.toString() !== providerId) {
      return res.status(409).json({ message: 'You are already in another queue' });
    }
    
    // Check if already in this specific queue
    const existing = await QueueEntry.findOne({ 
      user: req.user.id, 
      provider: providerId, 
      status: 'waiting' 
    });
    if (existing) return res.status(409).json({ message: 'Already in queue' });
    
    // Get all waiting customers for this provider and find the highest position
    const waitingEntries = await QueueEntry.find({ 
      provider: providerId, 
      status: 'waiting' 
    }).sort({ position: -1 }).limit(1);
    
    // New position is the highest existing position + 1, or 1 if no one is waiting
    const newPosition = waitingEntries.length > 0 ? waitingEntries[0].position + 1 : 1;
    
    const entry = await QueueEntry.create({
      user: req.user.id,
      provider: providerId,
      position: newPosition,
    });
    
    const populatedEntry = await QueueEntry.findById(entry._id)
      .populate('user', 'name email')
      .populate('provider', 'name');
    
    // Emit real-time update
    req.app.get('io').emit('queueUpdated', { providerId });
    
    res.json(populatedEntry);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Leave a queue (customer)
router.post('/leave', auth, async (req, res) => {
  try {
    const { providerId } = req.body;
    const entry = await QueueEntry.findOneAndDelete({ 
      user: req.user.id, 
      provider: providerId, 
      status: 'waiting' 
    });
    
    if (!entry) return res.status(404).json({ message: 'Not in queue' });
    
    // Update positions for remaining customers
    await QueueEntry.updateMany(
      { provider: providerId, status: 'waiting', position: { $gt: entry.position } },
      { $inc: { position: -1 } }
    );
    
    // Emit real-time update
    req.app.get('io').emit('queueUpdated', { providerId });
    
    res.json({ message: 'Left queue successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get queue for a provider (public)
router.get('/provider/:providerId', async (req, res) => {
  try {
    const queue = await QueueEntry.find({ provider: req.params.providerId, status: 'waiting' })
      .sort('position')
      .populate('user', 'name email');
    res.json(queue);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get user's queue entries (customer)
router.get('/my', auth, async (req, res) => {
  try {
    const entries = await QueueEntry.find({ user: req.user.id })
      .populate('provider', 'name category location');
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Mark as served/skipped (staff/admin)
router.post('/status', auth, requireStaffOrAdmin, async (req, res) => {
  try {
    const { entryId, status } = req.body; // status: 'served' or 'skipped'
    const entry = await QueueEntry.findById(entryId);
    if (!entry) return res.status(404).json({ message: 'Queue entry not found' });
    if (status === 'served') {
      entry.status = 'served';
      entry.servedAt = new Date();
    } else if (status === 'skipped') {
      entry.status = 'skipped';
      entry.skippedAt = new Date();
    } else {
      return res.status(400).json({ message: 'Invalid status' });
    }
    await entry.save();
    // Emit real-time update
    req.app.get('io').to(entry.provider.toString()).emit('queueUpdated', { providerId: entry.provider });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router; 
