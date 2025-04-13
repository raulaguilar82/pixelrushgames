const express = require('express');
const router = express.Router();
const Game = require('../models/Game'); // Importa el modelo Game

// Ruta raíz
router.get('/', async (req, res) => {
  try {
    const games = await Game.find().sort({ createdAt: -1 }).limit(10);
    res.render('index', { games });
  } catch (error) {
    console.error('Error al obtener juegos:', error.message);
    res.status(500).send('Error interno del servidor');
  }
});

module.exports = router;