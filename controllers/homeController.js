const Game = require('../models/Game');

exports.getHome = async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1; // Página actual (default: 1)
    const limit = 10; // Límite de juegos por página
    const skip = (page - 1) * limit;

    // Construye el query de búsqueda
    const query = search ? { title: { $regex: search, $options: 'i' } } : {};

    // Obtén el total de juegos (para calcular páginas)
    const totalGames = await Game.countDocuments(query);
    const totalPages = Math.ceil(totalGames / limit);

    // Obtén los juegos paginados
    const games = await Game.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render('index', {
      games,
      currentPage: page, // ✅ Ahora está definido
      totalPages, // ✅ Ahora está definido
      searchQuery: search, // Usamos el mismo término de búsqueda
      currentPlatform: null,
    });
  } catch (error) {
    console.error('Error al obtener juegos:', error.message);
    res.status(500).send('Error interno del servidor');
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

exports.gamesController = {
  getAllGames: async (req, res) => {
    try {
      const platformFilter = req.query.platform; // "PC" o "ANDROID"
      const page = parseInt(req.query.page) || 1; // Página actual (default: 1)
      const limit = 10; // Juegos por página
      const skip = (page - 1) * limit;

      // Construye el query de filtrado
      const query = platformFilter ? { platform: platformFilter } : {};

      // Consulta a la base de datos con filtro, paginación y conteo
      const [games, totalGames] = await Promise.all([
        Game.find(query)
          .sort({ createdAt: -1 }) // Ordena por fecha descendente
          .skip(skip)
          .limit(limit),
        Game.countDocuments(query), // Total de juegos (para calcular páginas)
      ]);

      const totalPages = Math.ceil(totalGames / limit);

      res.render('games', {
        games,
        currentPage: page,
        totalPages,
        search: req.query.search || '',
        currentPlatform: platformFilter, // Para el navbar
      });
    } catch (err) {
      console.error('Error al obtener juegos:', err);
      res
        .status(500)
        .render('error', { message: 'Error al cargar los juegos' });
    }
  },
};

exports.searchGames = async (req, res) => {
  try {
    const searchQuery = req.query.q || ''; // Término de búsqueda (ej: "?q=among")
    const page = parseInt(req.query.page) || 1; // Página actual (default: 1)
    const limit = 10; // Juegos por página
    const skip = (page - 1) * limit;

    // Query de búsqueda
    const query = {
      title: { $regex: searchQuery, $options: 'i' }, // Búsqueda insensible a mayúsculas
    };

    // Total de juegos y páginas
    const totalGames = await Game.countDocuments(query);
    const totalPages = Math.ceil(totalGames / limit);

    // Juegos paginados
    const games = await Game.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render('searchResults', {
      games,
      searchQuery, // Para mantener el término en la vista
      currentPage: page,
      totalPages,
      currentPlatform: null,
    });
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res
      .status(500)
      .render('error', { message: 'Error al procesar la búsqueda' });
  }
};

exports.getPaginatedGames = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Página actual (default: 1)
    const limit = 10; // Juegos por página
    const skip = (page - 1) * limit;

    const totalGames = await Game.countDocuments();
    const totalPages = Math.ceil(totalGames / limit);

    const games = await Game.find().skip(skip).limit(limit);

    res.render('games', {
      games,
      currentPage: page,
      totalPages,
    });
  } catch {
    res.status(500).render('error', { message: 'Error al cargar juegos' });
  }
};
