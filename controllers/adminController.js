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
    success: req.query.success,
    pageTitle: 'LOG IN',
    csrfToken: req.csrfToken(),
  });
};

// Método para procesar el login (POST)
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.render('admin/login', {
        error: 'Por favor, ingresa un nombre de usuario y contraseña',
        csrfToken: req.csrfToken ? req.csrfToken() : '',
      });
    }

    // 1. Verifica credenciales (usa variables de entorno)
    if (
      username !== process.env.ADMIN_USERNAME ||
      !(await bcrypt.compare(password, process.env.ADMIN_PASSWORD))
    ) {
      return res.render('admin/login', {
        error: 'Credenciales incorrectas',
        csrfToken: req.csrfToken ? req.csrfToken() : '',
      });
    }

    const secret = Buffer.from(process.env.JWT_SECRET, 'base64');
    const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

    // 2. Crea sesión/token
    const token = jwt.sign({ user: username }, secret, { expiresIn: '24h' });

    // 3. Envía token como cookie
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: ONE_DAY_IN_MS,
    });

    // 4. Redirige al panel
    res.redirect('/admin/panel');
  } catch (error) {
    console.error('Error en login:', error);
    res.render('admin/login', {
      error: 'Error en el servidor',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
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
    res.render('admin/panel', {
      games,
      pageTitle: 'Admin Panel',
    });
  } catch (error) {
    console.error('Error al cargar el panel de administración:', error.message);
    res.status(500).send('Error interno del servidor');
  }
};

exports.getUploadForm = (req, res) => {
  res.render('admin/upload', {
    pageTitle: 'Subir Juego',
    csrfToken: req.csrfToken(),
    error: null,
  });
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

    // Validación de campos obligatorios
    if (!title || !description || !platform) {
      return res.status(400).render('admin/upload', {
        error: 'Completa todos los campos obligatorios.',
        csrfToken: req.csrfToken(),
        pageTitle: 'Subir Juego',
      });
    }

    // Obtener URLs directas desde Cloudflare R2
    const imageUrl = `https://assets.pixelrushgames.xyz/${req.files.image[0].key}`;
    const captures = req.files.captures.map(
      (file) => `https://assets.pixelrushgames.xyz/${file.key}`
    );

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

    await newGame.save();

    // Redirigir con éxito
    res.redirect('/admin/panel?success=Juego subido correctamente');
  } catch (error) {
    console.error(
      `❌ Error al subir el juego (${req.body.title}):`,
      error.message
    );
    res.status(500).render('admin/upload', {
      error: 'Hubo un problema al subir el juego. Inténtalo de nuevo.',
      csrfToken: req.csrfToken(),
      pageTitle: 'Subir Juego',
    });
  }
};

exports.getEditForm = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.redirect('/admin/panel?error=Juego no encontrado');
    }

    res.render('admin/edit', {
      game,
      error: null,
      success: req.query.success,
      pageTitle: `Editar ${game.title}`,
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error('Error al cargar el formulario de edición:', error.message);
    res.redirect('/admin/panel?error=Error al cargar el formulario de edición');
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
      return res.redirect('/admin/panel?error=Juego no encontrado');
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
    game.updatedAt = new Date();

    await game.save();
    res.redirect('/admin/panel?success=Juego editado correctamente');
  } catch (error) {
    console.error('Error al editar el juego:', error.message);
    res.redirect(`/admin/edit/${req.params.id}?error=Error al editar el juego`);
  }
};

exports.getConfirmDelete = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.redirect('/admin/panel?error=Juego no encontrado');
    }

    res.render('admin/confirm-delete', {
      game,
      error: null,
      success: req.query.success,
      pageTitle: 'Confirmar Eliminacion',
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error(
      'Error al cargar la confirmación de eliminación:',
      error.message
    );
    res.redirect(
      '/admin/panel?error=Error al cargar la confirmación de eliminación'
    );
  }
};

exports.deleteGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      console.log(`⚠️ Intento de eliminar juego inexistente: ${req.params.id}`);
      return res.redirect('/admin/panel?error=Juego no encontrado');
    }

    console.log(`🗑️ Eliminando juego: ${game.title} (ID: ${game._id})`);

    // Verificar que tenemos la configuración del bucket
    const bucketName =
      process.env.CLOUDFLARE_R2_BUCKET || process.env.R2_BUCKET;
    if (!bucketName) {
      console.error('❌ Variable de entorno del bucket R2 no encontrada');
      return res.redirect(
        '/admin/panel?error=Error de configuración del servidor'
      );
    }

    console.log(`🪣 Usando bucket: ${bucketName}`);

    // 1) Extraer keys desde las URLs de forma más robusta
    let imageKey,
      capturesKeys = [];

    try {
      if (game.imageUrl) {
        imageKey = new URL(game.imageUrl).pathname.slice(1);
        console.log(`📸 Imagen a eliminar: ${imageKey}`);
      }

      if (game.captures && game.captures.length > 0) {
        capturesKeys = game.captures
          .map((url) => {
            try {
              return new URL(url).pathname.slice(1);
            } catch (urlError) {
              console.warn(`⚠️ URL de captura inválida: ${url}`);
              return null;
            }
          })
          .filter((key) => key !== null);

        console.log(`📷 Capturas a eliminar: ${capturesKeys.length}`);
        capturesKeys.forEach((key) => console.log(`   - ${key}`));
      }
    } catch (urlError) {
      console.warn('⚠️ Error procesando URLs de archivos:', urlError.message);
    }

    // 2) Eliminar archivos en R2
    try {
      if (imageKey) {
        console.log(
          `🗑️ Eliminando imagen de bucket ${bucketName}: ${imageKey}`
        );
        await s3.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: imageKey,
          })
        );
        console.log(`✅ Imagen eliminada: ${imageKey}`);
      }

      if (capturesKeys.length > 0) {
        console.log(
          `🗑️ Eliminando ${capturesKeys.length} capturas del bucket ${bucketName}`
        );
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: {
              Objects: capturesKeys.map((Key) => ({ Key })),
              Quiet: false,
            },
          })
        );
        console.log(`✅ ${capturesKeys.length} capturas eliminadas`);
      }
    } catch (s3Error) {
      console.error('❌ Error eliminando archivos de R2:', s3Error.message);
      console.error('Detalles del error:', s3Error);
      // Continuar con la eliminación de la base de datos aunque falle R2
    }

    // 3) Eliminar en MongoDB
    const deleteResult = await Game.deleteOne({ _id: req.params.id });

    if (deleteResult.deletedCount === 0) {
      console.log(
        `⚠️ No se pudo eliminar el juego de la base de datos: ${req.params.id}`
      );
      return res.redirect(
        '/admin/panel?error=Error al eliminar el juego de la base de datos'
      );
    }

    console.log(`✅ Juego eliminado completamente: ${game.title}`);
    res.redirect('/admin/panel?success=Juego eliminado correctamente');
  } catch (error) {
    console.error('❌ Error al eliminar el juego:', error.message);
    console.error('Stack trace:', error.stack);
    res.redirect('/admin/panel?error=Error inesperado al eliminar el juego');
  }
};
