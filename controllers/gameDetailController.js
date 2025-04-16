const Game = require('../models/Game');
const slugify = require('slugify');

exports.getGameBySlug = async (req, res) => {
  try {
    const game = await Game.findOne({ slug: req.params.slug });
    
    if (!game) {
      return res.status(404).render('notFound', { 
        message: `El juego "${req.params.slug}" no existe` 
      });
    }

    res.render('gameDetail', { 
      game,
      title: game.title // Para el <title> de la página
    });
  } catch (err) {
    console.error('Error en getGameBySlug:', err);
    res.status(500).render('error', { 
      message: 'Error al cargar el juego' 
    });
  }
};