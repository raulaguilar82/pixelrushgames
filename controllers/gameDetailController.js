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

    const seoData = {
      pageTitle: `Descargar ${game.title} MEGA, Mediafire, Google Drive`,
      metaDescription: `Descarga ${game.title} GRATIS a traves de MEGA, Mediafire, Google drive. ${game.details}... Plataforma: ${game.platform}. Géneros: ${game.genre}.`,
      metaKeywords: [
        game.title.toLowerCase(),
        `descargar ${game.title}`,
        game.platform,
        game.genre,
        game.langText,
        game.langVoices,
        'juego gratis',
        'full versión',
        'mega',
        'mediafire',
        'google drive',
      ],
      ogImage: game.imageUrl,
      canonicalUrl: `/games/${game.slug}`,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'VideoGame',
        name: game.title,
        description: game.description,
        image: game.imageUrl,
        operatingSystem: game.platform,
        applicationCategory: 'Game',
        storageRequirements: game.fileSize,
        datePublished: game.releaseDate,
        genre: game.genre,
      },
    };

    res.render('gameDetail', {
      game,
      recommendedGames,
      title: game.title,
      currentPlatform: null,
      ...seoData,
    });
  } catch {
    res.status(500).render('error', { message: 'Error al cargar el juego' });
  }
};
