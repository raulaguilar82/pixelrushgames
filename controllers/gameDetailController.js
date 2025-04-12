const Game = require('../models/Game');

exports.getGameDetails = async (req, res) => {
  try {
    console.log('ID del juego:', req.params.id); // Depuración
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).render('error', { 
        message: 'Juego no encontrado' 
      });
    }
    
    res.render('gameDetail', { 
      title: `${game.title} | PixelRushGames`,
      game,
      // Formateamos la fecha para mostrarla mejor
      formattedDate: game.createdAt.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    });
  } catch (error) {
    console.error('Error al obtener detalles del juego:', error);
    res.status(500).render('error', { 
      message: 'Error al cargar el juego' 
    });
  }
};