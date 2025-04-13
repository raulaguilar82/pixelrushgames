const Game = require('../models/Game');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


// --------------- Sección de Autenticación --------------- //

// Método para mostrar el formulario de login (GET)
exports.showLogin = (req, res) => {
  res.render('admin/login', {
    error: null,
    success: req.query.success // Para mensajes de éxito
  });
};

// Método para procesar el login (POST)
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.render('admin/login', {
        error: 'Por favor, ingresa un nombre de usuario y contraseña'
      });
    }

    // 1. Verifica credenciales (usa variables de entorno)
    if (username !== process.env.ADMIN_USERNAME || !(await bcrypt.compare(password, process.env.ADMIN_PASSWORD))) {
      return res.render('admin/login', {
        error: 'Credenciales incorrectas'
      });
    }

    // 2. Crea sesión/token
    const token = jwt.sign(
      { user: username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 3. Envía token como cookie
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Solo en producción
      maxAge: 3600000 // 1 hora
    });

    // 4. Redirige al panel
    res.redirect('/admin/panel');

  } catch (error) {
    res.render('admin/login', {
      error: 'Error en el servidor'
    });
  }
};

// Metodo para cerrar sesión (logout)
exports.logout = (req, res) => {
  res.clearCookie('jwt').redirect('/admin/login');
};


// --------------- Sección de Gestión de Juegos --------------- //

exports.getPanel = async (req, res) => {
  try {
    const games = await Game.find().sort({ createdAt: -1 });
    res.render('admin/panel', { games });
  } catch (error) {
    console.error('Error al cargar el panel de administración:', error.message);
    res.status(500).send('Error interno del servidor');
  }
};

exports.getUploadForm = (req, res) => {
  res.render('admin/upload');
};

exports.uploadGame = async (req, res) => {
  try {
    if (!req.files?.image?.length || !req.files?.captures?.length) {
      throw new Error('No se subieron todas las imágenes requeridas');
    }

    const { title, description, platform, genre, langText, langVoices, fileSize, downloadLink, requirements, releaseDate, lastUpdate, details } = req.body;

    const buildFilePath = (folder, filename) => `/uploads/${folder}/${filename}`;
    const folderName = title.replace(/\s+/g, '_');
    const imageUrl = buildFilePath(folderName, req.files.image[0].filename);
    const captures = req.files.captures.map(file => buildFilePath(folderName, file.filename));

    const newGame = new Game({
      title,
      description,
      platform,
      genre,
      langText,
      langVoices,
      fileSize,
      downloadLink,
      requirements,
      releaseDate,
      lastUpdate,
      details,
      imageUrl,
      captures,
    });

    await newGame.save();
    res.redirect('/?success=Juego subido correctamente');
  } catch (error) {
    console.error(`Error al subir el juego (${req.body.title}):`, error.message);
    res.status(500).render('admin/upload', { error: 'Hubo un problema al subir el juego. Inténtalo de nuevo.' });
  }
};

exports.deleteGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.redirect('/?error=Juego no encontrado');

    const gameFolder = path.join(__dirname, '../public/uploads', game.title.replace(/\s+/g, '_'));
    if (fs.existsSync(gameFolder)) {
      fs.rmSync(gameFolder, { recursive: true, force: true });
    }

    await Game.deleteOne({ _id: req.params.id });
    res.redirect('/?success=Juego eliminado correctamente');
  } catch (error) {
    console.error('Error al eliminar el juego:', error.message);
    res.redirect('/?error=Error inesperado al eliminar el juego');
  }
};