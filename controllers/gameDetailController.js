const Game = require('../models/Game');

exports.getGameBySlug = async (req, res) => {
  try {
    const game = await Game.findOne({ slug: req.params.slug });
    if (!game) return res.status(404).render('404');

    // Obtener juegos recomendados (misma plataforma, excluyendo el actual)
    const recommendedGames = await Game.find({
      platform: game.platform,
      _id: { $ne: game._id }, // Excluye el juego actual
    })
      .limit(6) // 6 juegos recomendados
      .sort({ createdAt: -1 });

    res.render('gameDetail', {
      game,
      recommendedGames,
      title: game.title,
      currentPlatform: null,
    });
  } catch {
    res.status(500).render('error', { message: 'Error al cargar el juego' });
  }
};
