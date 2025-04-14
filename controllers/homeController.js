const Game = require('../models/Game');

exports.getHome = async (req, res) => {
  try {
    const search = req.query.search || ''; // Obtén el término de búsqueda de la query string
    const query = search
      ? { title: { $regex: search, $options: 'i' } } // Filtra por título (insensible a mayúsculas/minúsculas)
      : {};

    const games = await Game.find(query).sort({ createdAt: -1 }).limit(10);
    res.render('index', { games, search });
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