const mongoose = require('mongoose');

const serviceProviderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true }, // e.g., Clinic, Salon, Repair
  location: { type: String, required: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Store owner
  description: { type: String },
  phone: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('ServiceProvider', serviceProviderSchema); 
