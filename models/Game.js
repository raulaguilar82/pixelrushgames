const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  platform: { type: String, required: true },
  downloadLink: { type: String, required: true },
  imageUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

gameSchema.methods.deleteGame = async function() {
  try {
    await this.deleteOne();
    return true;
  } catch (error) {
    console.error('Error al eliminar el juego:', error);
    return false;
  }
};

module.exports = mongoose.model('Game', gameSchema);