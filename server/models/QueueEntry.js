const mongoose = require('mongoose');

const queueEntrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider', required: true },
  status: { type: String, enum: ['waiting', 'served', 'skipped'], default: 'waiting' },
  joinedAt: { type: Date, default: Date.now },
  servedAt: { type: Date },
  skippedAt: { type: Date },
  position: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('QueueEntry', queueEntrySchema); 