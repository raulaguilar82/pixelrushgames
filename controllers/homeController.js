const Game = require('../models/Game');

exports.getHome = async (req, res) => {
  try {
    const search = req.query.search || ''; // Obtén el término de búsqueda de la query string
    const query = search
      ? { title: { $regex: search, $options: 'i' } } // Filtra por título (insensible a mayúsculas/minúsculas)
      : {};

    const games = await Game.find(query).sort({ createdAt: -1 }).limit(10);
    res.render('index', { games, search, searchQuery: req.query.q || '', currentPlatform: null });
  } catch (error) {
    console.error('Error al obtener juegos:', error.message);
    res.status(500).send('Error interno del servidor');
  }
};

exports.getDMCA = (req, res) => {
  res.render('dmca');
}

exports.getContact = (req, res) => {
  res.render('contact');
}

exports.getBrokenURL = (req, res) => {
  res.render('brokenURL');
}

exports.gamesController = {
  getAllGames: async (req, res) => {
    try {
      const platformFilter = req.query.platform; // "PC" o "APK"
      let games = await Game.find();

      // Filtrado por plataforma (si existe el query)
      if (platformFilter) {
        games = games.filter(game => game.platform === platformFilter);
      }

      res.render('games', {
        games,
        search: req.query.search || '',
        currentPlatform: platformFilter // Para el navbar
      });
    } catch (err) {
      console.error('Error al obtener juegos:', err);
      res.status(500).render('error', { message: 'Error al cargar los juegos' });
    }
  }
};

exports.searchGames = async (req, res) => {
  try {
    const query = req.query.q; // Término de búsqueda
    const platformFilter = req.query.platform; // Filtro opcional por plataforma

    // Construye el objeto de búsqueda
    const searchQuery = {
      title: { $regex: query, $options: 'i' } // Búsqueda insensible a mayúsculas
    };

    // Añade filtro por plataforma si existe
    if (platformFilter) {
      searchQuery.platform = platformFilter;
    }

    // Ejecuta la búsqueda
    const games = await Game.find(searchQuery);

    // Renderiza la vista de resultados
    res.render('searchResults', {
      games,
      searchQuery: query,
      currentPlatform: platformFilter || null
    });

  } catch (err) {
    console.error('Error en searchController:', err);
    res.status(500).render('error', { 
      message: 'Error al procesar la búsqueda' 
    });
  }
};