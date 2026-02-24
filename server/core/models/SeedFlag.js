/**
 * SeedFlag Model
 * Simple flag to track if database has been seeded
 */

const mongoose = require('mongoose');

const seedFlagSchema = new mongoose.Schema({
  hasSeeded: { type: Boolean, default: false },
  seedVersion: { type: String, default: '1.0' },
  seededAt: { type: Date, default: Date.now },
  environment: String
}, { 
  timestamps: true 
});

module.exports = mongoose.model('SeedFlag', seedFlagSchema);
