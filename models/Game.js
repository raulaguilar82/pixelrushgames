const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  platform: { type: String, required: true },
  genre: { type: String, required: true },
  langText: { type: String, required: true },
  langVoices: { type: String, required: true },
  fileSize: { type: String, required: true },
  requirements: { type: String, required: true },
  downloadLink: { type: String, required: true },
  imageUrl: { type: String, required: true }, // Portada del juego
  captures: [{ type: String }], // Rutas de las imágenes adicionales
  releaseDate: { type: String, required: true },
  lastUpdate: { type: String, required: true },
  details: { type: String, required: true },
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