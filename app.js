const express = require('express');
const app = express();
const PORT = 3000;

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Middlewares
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true })); // Para parsear form-data

// Configuración de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Conectado a MongoDB'))
  .catch((err) => console.error('Error de conexión:', err));

// Configuración de Multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public', 'uploads', req.body.title.replace(/\s+/g, '_')); // Carpeta basada en el título del juego
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB por archivo
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'), false);
    }
  },
});

// Middleware de autenticación
const isAuthenticated = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Acceso denegado');
  }

  const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
  const [username, password] = credentials.split(':');

  if (username === process.env.ADMIN_USERNAME && bcrypt.compareSync(password, process.env.ADMIN_PASSWORD)) {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Credenciales inválidas');
  }
};

// Modelo de datos
const Game = require('./models/Game');

// Rutas
app.get('/', async (req, res) => {
  try {
    const games = await Game.find().sort({ createdAt: -1 }).limit(10);
    res.render('index', { games, isAuthenticated: !!req.headers.authorization });
  } catch (error) {
    console.error('Error al obtener juegos:', error);
    res.status(500).send('Error interno del servidor');
  }
});

// Muestra el formulario de subida de juegos
app.get('/admin/upload', isAuthenticated, (req, res) => {
  res.render('admin/upload');
});

// Sube el juego y sus imágenes
app.post('/admin/upload', isAuthenticated, upload.fields([
  { name: 'image', maxCount: 1 }, // Portada del juego
  { name: 'captures', maxCount: 10 }, // Máximo 10 imágenes adicionales
]), async (req, res) => {
  try {
    if (!req.files?.image?.length || !req.files?.captures?.length) {
      throw new Error('No se subieron todas las imágenes requeridas');
    }

    const { title, description, platform, genre, langText, langVoices, fileSize, downloadLink, requirements } = req.body;

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
      imageUrl,
      captures, // Guardar las rutas de las imágenes adicionales
    });

    await newGame.save();

    res.redirect('/?success=Juego subido correctamente');
  } catch (error) {
    console.error(`Error al subir el juego (${req.body.title}):`, error.message);
    res.status(500).render('admin/upload', { error: 'Hubo un problema al subir el juego. Inténtalo de nuevo.' });
  }
});

// Muestra el mensaje de confirmacion de eliminación
app.get('/admin/confirm-delete/:id', isAuthenticated, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.redirect('/?error=Juego no encontrado');

    res.render('admin/confirm-delete', { game });
  } catch (error) {
    console.error('Error al buscar el juego:', error.message);
    res.redirect('/?error=Error inesperado al buscar el juego');
  }
});

//Elimina el juego y su carpeta
app.post('/admin/games/delete/:id', isAuthenticated, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.redirect('/?error=Juego no encontrado');

    // Ruta de la carpeta del juego
    const gameFolder = path.join(__dirname, 'public', 'uploads', game.title.replace(/\s+/g, '_'));

    // Intentar eliminar la carpeta del juego
    try {
      if (fs.existsSync(gameFolder)) {
        fs.rmSync(gameFolder, { recursive: true, force: true });
      }
    } catch (folderError) {
      console.error('Error al eliminar la carpeta del juego:', folderError.message);
    }

    // Eliminar el documento del juego en la base de datos
    await Game.deleteOne({ _id: req.params.id });

    res.redirect('/?success=Juego eliminado correctamente');
  } catch (error) {
    console.error('Error al eliminar el juego:', error.message);
    res.redirect('/?error=Error inesperado al eliminar el juego');
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});