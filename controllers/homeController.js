const Game = require('../models/Game');

// Función auxiliar para obtener juegos paginados y filtrados
async function getPaginatedGames({ search, platform, page = 1, limit = 10 }) {
  const query = {};
  if (search) query.title = { $regex: search, $options: 'i' };
  if (platform) query.platform = platform;

  const skip = (page - 1) * limit;
  const [games, totalGames] = await Promise.all([
    Game.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Game.countDocuments(query),
  ]);
  const totalPages = Math.ceil(totalGames / limit);

  return { games, totalPages };
}

// Página principal
exports.getHome = async (req, res) => {
  try {
    const search = req.query.search || '';
    const platform = req.query.platform || '';
    const page = parseInt(req.query.page) || 1;
    const { games, totalPages } = await getPaginatedGames({
      search,
      platform,
      page,
    });

    res.render('index', {
      games,
      currentPage: page,
      totalPages,
      searchQuery: search,
      currentPlatform: platform,
    });
  } catch (error) {
    console.error('Error al obtener juegos:', error.message);
    res.status(500).render('error', { message: 'Error interno del servidor' });
  }
};

// Página de todos los juegos (con filtros)
exports.gamesController = {
  getAllGames: async (req, res) => {
    try {
      const search = req.query.search || '';
      const platform = req.query.platform || '';
      const page = parseInt(req.query.page) || 1;
      const { games, totalPages } = await getPaginatedGames({
        search,
        platform,
        page,
      });

      res.render('games', {
        games,
        currentPage: page,
        totalPages,
        searchQuery: search,
        currentPlatform: platform,
      });
    } catch (err) {
      console.error('Error al obtener juegos:', err);
      res
        .status(500)
        .render('error', { message: 'Error al cargar los juegos' });
    }
  },
};

// Búsqueda avanzada
exports.searchGames = async (req, res) => {
  try {
    const search = req.query.search || req.query.q || '';
    const platform = req.query.platform || '';
    const page = parseInt(req.query.page) || 1;
    const { games, totalPages } = await getPaginatedGames({
      search,
      platform,
      page,
    });

    res.render('searchResults', {
      games,
      searchQuery: search,
      currentPage: page,
      totalPages,
      currentPlatform: platform,
    });
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res
      .status(500)
      .render('error', { message: 'Error al procesar la búsqueda' });
  }
};

exports.getDMCA = (req, res) => {
  res.render('dmca');
};

exports.getContact = (req, res) => {
  res.render('contact');
};

exports.getBrokenURL = (req, res) => {
  res.render('brokenURL');
};
