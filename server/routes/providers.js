const express = require('express');
const ServiceProvider = require('../models/ServiceProvider');
const QueueEntry = require('../models/QueueEntry');
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

// Create a service provider (staff/admin only)
router.post('/', auth, requireStaffOrAdmin, async (req, res) => {
  try {
    const { name, category, location, status } = req.body;
    const provider = await ServiceProvider.create({ name, category, location, status });
    res.status(201).json(provider);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all service providers with queue info
router.get('/', async (req, res) => {
  try {
    const providers = await ServiceProvider.find({ status: 'open' });
    
    // Add queue length to each provider
    const providersWithQueue = await Promise.all(
      providers.map(async (provider) => {
        const queueLength = await QueueEntry.countDocuments({ 
          provider: provider._id, 
          status: 'waiting' 
        });
        
        return {
          ...provider.toObject(),
          queueLength
        };
      })
    );
    
    res.json(providersWithQueue);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get a single provider by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const provider = await ServiceProvider.findById(req.params.id);
    if (!provider) return res.status(404).json({ message: 'Not found' });
    res.json(provider);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update a provider (staff/admin only)
router.put('/:id', auth, requireStaffOrAdmin, async (req, res) => {
  try {
    const provider = await ServiceProvider.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!provider) return res.status(404).json({ message: 'Not found' });
    res.json(provider);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete a provider (staff/admin only)
router.delete('/:id', auth, requireStaffOrAdmin, async (req, res) => {
  try {
    const provider = await ServiceProvider.findByIdAndDelete(req.params.id);
    if (!provider) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router; 
