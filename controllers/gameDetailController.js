const Game = require('../models/Game');

exports.getGameDetails = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).render('error', { 
        message: 'Juego no encontrado' 
      });
    }
    
    res.render('gameDetail', { title: `${game.title} | PixelRushGames`, game });
    
  } catch (error) {
    console.error('Error al obtener detalles del juego:', error);
    res.status(500).render('error', { 
      message: 'Error al cargar el juego' 
    });
  }
};