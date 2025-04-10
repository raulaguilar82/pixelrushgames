const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  platform: { type: String, required: true },
  downloadLink: { type: String, required: true },
  imageUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Game', gameSchema);