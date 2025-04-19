const Game = require('../models/Game');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const {
  DeleteObjectCommand,
  DeleteObjectsCommand,
} = require('@aws-sdk/client-s3');
const { s3 } = require('../config/s3Client.js');

// --------------- Sección de Autenticación --------------- //

// Método para mostrar el formulario de login (GET)
exports.showLogin = (req, res) => {
  res.render('admin/login', {
    error: null,
    success: req.query.success, // Para mensajes de éxito
  });
};

// Método para procesar el login (POST)
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.render('admin/login', {
        error: 'Por favor, ingresa un nombre de usuario y contraseña',
      });
    }

    // 1. Verifica credenciales (usa variables de entorno)
    if (
      username !== process.env.ADMIN_USERNAME ||
      !(await bcrypt.compare(password, process.env.ADMIN_PASSWORD))
    ) {
      return res.render('admin/login', {
        error: 'Credenciales incorrectas',
      });
    }

    const secret = Buffer.from(process.env.JWT_SECRET, 'base64');
    const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

    // 2. Crea sesión/token
    const token = jwt.sign({ user: username }, secret, { expiresIn: '24h' });

    // 3. Envía token como cookie
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Solo en producción
      maxAge: ONE_DAY_IN_MS,
    });

    // 4. Redirige al panel
    res.redirect('/admin/panel');
  } catch {
    res.render('admin/login', {
      error: 'Error en el servidor',
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
    // Validación básica de archivos
    if (!req.files || !req.files.image || !req.files.image[0]) {
      throw new Error('La imagen principal no fue subida.');
    }

    if (!req.files.captures || req.files.captures.length === 0) {
      throw new Error('Se requieren al menos una captura.');
    }

    const {
      title,
      description,
      platform,
      genre,
      langText,
      langVoices,
      fileSize,
      downloadLink,
      minRequirements,
      recRequirements,
      releaseDate,
      lastUpdate,
      details,
    } = req.body;

    // Obtener URLs directas desde Cloudflare R2
    const imageUrl = req.files.image[0].location;
    const captures = req.files.captures.map((file) => file.location);

    const newGame = new Game({
      title,
      description,
      platform,
      genre,
      langText,
      langVoices,
      fileSize,
      downloadLink,
      minRequirements,
      recRequirements,
      releaseDate,
      lastUpdate,
      details,
      imageUrl,
      captures,
    });

    if (!title || !description || !platform) {
      return res.status(400).render('admin/upload', {
        error: 'Completa todos los campos obligatorios.',
      });
    }

    await newGame.save();

    // Redirigir con éxito
    res.redirect('/?success=Juego subido correctamente');
  } catch (error) {
    console.error(
      `❌ Error al subir el juego (${req.body.title}):`,
      error.message
    );
    res.status(500).render('admin/upload', {
      error: 'Hubo un problema al subir el juego. Inténtalo de nuevo.',
    });
  }
};

exports.getEditForm = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.redirect('/?error=Juego no encontrado');
    }

    res.render('admin/edit', {
      game,
      error: null,
      success: req.query.success, // Para mensajes de éxito
    });
  } catch (error) {
    console.error('Error al cargar el formulario de edición:', error.message);
    res.redirect('/?error=Error al cargar el formulario de edición');
  }
};

exports.editGame = async (req, res) => {
  try {
    const {
      title,
      description,
      platform,
      genre,
      langText,
      langVoices,
      fileSize,
      downloadLink,
      minRequirements,
      recRequirements,
      releaseDate,
      lastUpdate,
      details,
    } = req.body;

    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.redirect('/?error=Juego no encontrado');
    }

    game.title = title;
    game.description = description;
    game.platform = platform;
    game.genre = genre;
    game.langText = langText;
    game.langVoices = langVoices;
    game.fileSize = fileSize;
    game.downloadLink = downloadLink;
    game.minRequirements = minRequirements;
    game.recRequirements = recRequirements;
    game.releaseDate = releaseDate;
    game.lastUpdate = lastUpdate;
    game.details = details;

    await game.save();
    res.redirect('/?success=Juego editado correctamente');
  } catch (error) {
    console.error('Error al editar el juego:', error.message);
    res.redirect(`/admin/edit/${req.params.id}?error=Error al editar el juego`);
  }
};

exports.getConfirmDelete = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.redirect('/?error=Juego no encontrado');
    }

    res.render('admin/confirm-delete', {
      game,
      error: null,
      success: req.query.success, // Para mensajes de éxito
    });
  } catch (error) {
    console.error(
      'Error al cargar la confirmación de eliminación:',
      error.message
    );
    res.redirect('/?error=Error al cargar la confirmación de eliminación');
  }
};

exports.deleteGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.redirect('/?error=Juego no encontrado');

    // 1) Extraer keys desde las URLs
    const imageKey = new URL(game.imageUrl).pathname.slice(1);
    const capturesKeys = game.captures.map((url) =>
      new URL(url).pathname.slice(1)
    );

    // 2) Eliminar en R2
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: imageKey,
      })
    );
    if (capturesKeys.length) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: process.env.R2_BUCKET,
          Delete: {
            Objects: capturesKeys.map((Key) => ({ Key })),
            Quiet: false,
          },
        })
      );
    }

    // 3) Eliminar en MongoDB
    await Game.deleteOne({ _id: req.params.id });

    res.redirect('/?success=Juego eliminado correctamente');
  } catch (error) {
    console.error('Error al eliminar el juego:', error.message);
    res.redirect('/?error=Error inesperado al eliminar el juego');
  }
};
