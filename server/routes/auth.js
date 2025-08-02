const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Only allow customer registration through public signup
    if (role && role !== 'customer') {
      return res.status(403).json({ message: 'Only customer accounts can be created through registration' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    // Force role to be customer for public registration
    const user = await User.create({ 
      name, 
      email, 
      password, 
      role: 'customer' 
    });
    
    res.status(201).json({ 
      message: 'Customer account created successfully',
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      } 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Middleware to verify JWT
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

// Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Store Registration
router.post('/register-store', async (req, res) => {
  try {
    const { ownerName, email, password, storeName, category, location, description, phone } = req.body;
    
    if (!ownerName || !email || !password || !storeName || !category || !location) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    // Create store owner user
    const storeOwner = await User.create({
      name: ownerName,
      email,
      password,
      role: 'store_owner'
    });

    // Create service provider (store)
    const ServiceProvider = require('../models/ServiceProvider');
    const store = await ServiceProvider.create({
      name: storeName,
      category,
      location,
      description,
      phone,
      owner: storeOwner._id
    });

    // Update store owner with store reference
    storeOwner.store = store._id;
    await storeOwner.save();

    res.status(201).json({
      message: 'Store registered successfully',
      user: {
        id: storeOwner._id,
        name: storeOwner.name,
        email: storeOwner.email,
        role: storeOwner.role,
        store: store._id
      },
      store: {
        id: store._id,
        name: store.name,
        category: store.category,
        location: store.location
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router; 
