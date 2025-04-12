const Game = require('../models/Game');
const { deleteFile } = require('../utils/fileUtils.js'); // Utilidad para borrar archivos (opcional)

// Obtener listado de juegos con paginación
exports.getGames = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [games, total] = await Promise.all([
      Game.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Game.countDocuments()
    ]);

    res.render('games/list', {
      title: 'Catálogo de Juegos',
      games,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      limit
    });
  } catch (error) {
    console.error('Error al obtener juegos:', error);
    res.status(500).render('error', { 
      message: 'Error al cargar el catálogo de juegos' 
    });
  }
};

// Mostrar formulario para crear nuevo juego (vista)
exports.createGameForm = (req, res) => {
  res.render('games/create', {
    title: 'Agregar Nuevo Juego',
    platforms: ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile'],
    genres: ['Aventura', 'Acción', 'RPG', 'Estrategia', 'Deportes', 'Indie']
  });
};

// Procesar creación de nuevo juego
exports.createGame = async (req, res) => {
  try {
    const { title, description, platform, genre, langText, langVoices, fileSize, downloadLink } = req.body;
    
    const newGame = new Game({
      title,
      description,
      platform,
      genre,
      langText,
      langVoices,
      fileSize,
      downloadLink,
      imageUrl: req.files['imageUrl'][0].path.replace('public', ''),
      captures: req.files['captures']?.map(file => file.path.replace('public', '')) || []
    });

    await newGame.save();
    req.flash('success', 'Juego agregado correctamente');
    res.redirect('/games');
  } catch (error) {
    console.error('Error al crear juego:', error);
    
    // Limpiar archivos subidos si hay error
    if (req.files) {
      if (req.files['imageUrl']) deleteFile(req.files['imageUrl'][0].path);
      if (req.files['captures']) {
        req.files['captures'].forEach(file => deleteFile(file.path));
      }
    }
    
    req.flash('error', 'Error al crear el juego');
    res.redirect('/games/new');
  }
};

// Mostrar formulario para editar juego
exports.editGameForm = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      req.flash('error', 'Juego no encontrado');
      return res.redirect('/games');
    }

    res.render('games/edit', {
      title: `Editar ${game.title}`,
      game,
      platforms: ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile'],
      genres: ['Aventura', 'Acción', 'RPG', 'Estrategia', 'Deportes', 'Indie']
    });
  } catch (error) {
    console.error('Error al cargar formulario de edición:', error);
    req.flash('error', 'Error al cargar el juego');
    res.redirect('/games');
  }
};

// Procesar actualización de juego
exports.updateGame = async (req, res) => {
  try {
    const { id } = req.params;
    const game = await Game.findById(id);
    
    if (!game) {
      req.flash('error', 'Juego no encontrado');
      return res.redirect('/games');
    }

    // Actualizar campos básicos
    game.title = req.body.title;
    game.description = req.body.description;
    game.platform = req.body.platform;
    game.genre = req.body.genre;
    game.langText = req.body.langText;
    game.langVoices = req.body.langVoices;
    game.fileSize = req.body.fileSize;
    game.downloadLink = req.body.downloadLink;

    // Actualizar imagen principal si se subió nueva
    if (req.files['imageUrl']) {
      deleteFile(`public${game.imageUrl}`); // Eliminar imagen anterior
      game.imageUrl = req.files['imageUrl'][0].path.replace('public', '');
    }

    // Actualizar capturas si se subieron nuevas
    if (req.files['captures']) {
      // Eliminar capturas anteriores
      game.captures.forEach(capture => deleteFile(`public${capture}`));
      game.captures = req.files['captures'].map(file => file.path.replace('public', ''));
    }

    await game.save();
    req.flash('success', 'Juego actualizado correctamente');
    res.redirect(`/games/${game._id}`);
  } catch (error) {
    console.error('Error al actualizar juego:', error);
    req.flash('error', 'Error al actualizar el juego');
    res.redirect(`/games/${req.params.id}/edit`);
  }
};

// Eliminar juego
exports.deleteGame = async (req, res) => {
  try {
    const game = await Game.findByIdAndDelete(req.params.id);
    
    if (!game) {
      req.flash('error', 'Juego no encontrado');
      return res.redirect('/games');
    }

    // Eliminar archivos asociados
    deleteFile(`public${game.imageUrl}`);
    game.captures.forEach(capture => deleteFile(`public${capture}`));

    req.flash('success', 'Juego eliminado correctamente');
    res.redirect('/games');
  } catch (error) {
    console.error('Error al eliminar juego:', error);
    req.flash('error', 'Error al eliminar el juego');
    res.redirect('/games');
  }
};

// Buscar juegos
exports.searchGames = async (req, res) => {
  try {
    const { q } = req.query;
    const games = await Game.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { genre: { $regex: q, $options: 'i' } }
      ]
    }).limit(10);

    res.render('games/search', {
      title: `Resultados para "${q}"`,
      games,
      searchQuery: q
    });
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(500).render('error', { 
      message: 'Error al realizar la búsqueda' 
    });
  }
};