const express = require('express');
const User = require('../models/User');
const ServiceProvider = require('../models/ServiceProvider');
const QueueEntry = require('../models/QueueEntry');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Auth middleware
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

// Store owner only middleware
const requireStoreOwner = (req, res, next) => {
  if (req.user.role !== 'store_owner') {
    return res.status(403).json({ message: 'Store owner access required' });
  }
  next();
};

// Get store details
router.get('/my-store', auth, requireStoreOwner, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('store');
    if (!user.store) {
      return res.status(404).json({ message: 'Store not found' });
    }
    res.json(user.store);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update store details
router.put('/my-store', auth, requireStoreOwner, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const store = await ServiceProvider.findByIdAndUpdate(
      user.store,
      req.body,
      { new: true }
    );
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }
    res.json(store);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get store staff
router.get('/staff', auth, requireStoreOwner, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const staff = await User.find({ 
      store: user.store, 
      role: 'staff' 
    }).select('-password');
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create staff for store
router.post('/staff', auth, requireStoreOwner, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const user = await User.findById(req.user.id);
    const staffUser = await User.create({
      name,
      email,
      password,
      role: 'staff',
      store: user.store
    });

    res.status(201).json({
      message: 'Staff member created successfully',
      staff: {
        id: staffUser._id,
        name: staffUser.name,
        email: staffUser.email,
        role: staffUser.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Remove staff member
router.delete('/staff/:staffId', auth, requireStoreOwner, async (req, res) => {
  try {
    const { staffId } = req.params;
    const user = await User.findById(req.user.id);
    
    // Find staff member and verify they belong to this store
    const staffMember = await User.findOne({
      _id: staffId,
      store: user.store,
      role: 'staff'
    });
    
    if (!staffMember) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    // Remove staff member
    await User.findByIdAndDelete(staffId);
    
    res.json({ message: 'Staff member removed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get store queue
router.get('/queue', auth, async (req, res) => {
  try {
    if (req.user.role !== 'store_owner' && req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(req.user.id);
    const queue = await QueueEntry.find({ 
      provider: user.store, 
      status: 'waiting' 
    })
    .sort('position')
    .populate('user', 'name email');
    
    res.json(queue);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update queue status (staff)
router.post('/queue/status', auth, async (req, res) => {
  try {
    const { entryId, status, staffId } = req.body;
    
    const entry = await QueueEntry.findByIdAndUpdate(
      entryId,
      { status, staffId, updatedAt: new Date() },
      { new: true }
    ).populate('user', 'name email').populate('provider', 'name');

    if (!entry) return res.status(404).json({ message: 'Queue entry not found' });

    // Emit real-time updates
    const io = req.app.get('io');
    
    if (status === 'serving') {
      // Broadcast to all clients that this customer is being served
      io.emit('customerBeingServed', {
        customer: entry,
        startTime: Date.now(),
        estimatedTime: 10 // default service time in minutes
      });
    } else if (status === 'served') {
      // Broadcast service completion
      io.emit('serviceCompleted', { entryId });
    }

    // Emit queue update to refresh provider queue lengths
    io.emit('queueUpdated', { providerId: entry.provider._id });
    
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get current serving status for store
router.get('/serving-status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'store_owner' && req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(req.user.id);
    const currentlyServing = await QueueEntry.findOne({ 
      provider: user.store, 
      status: 'serving' 
    }).populate('user', 'name email').populate('provider', 'name');
    
    res.json(currentlyServing);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;






