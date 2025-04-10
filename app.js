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
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/PRG', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Conectado a MongoDB'))
.catch(err => console.error('Error de conexión:', err));

// Configuración de Multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'), false);
    }
  }
});

// Autenticación
const isAuthenticated = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Acceso denegado');
  }

  const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
  const [username, password] = credentials.split(':');

  if (username === 'admin' && bcrypt.compareSync(password, process.env.ADMIN_PASSWORD)) {
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
    
    // Pasar explícitamente el estado de autenticación
    res.render('index', { 
      games,
      isAuthenticated: req.headers.authorization ? true : false
    });
    
  } catch (error) {
    console.error('Error al obtener juegos:', error);
    res.status(500).send('Error interno del servidor');
  }
});

app.get('/admin/upload', isAuthenticated, (req, res) => {
  res.render('admin/upload');
});

app.post('/admin/upload', isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      throw new Error('No se subió ninguna imagen');
    }

    const { title, description, platform, downloadLink } = req.body;
    const imageUrl = '/uploads/' + req.file.filename;

    const newGame = new Game({ 
      title, 
      description, 
      platform, 
      downloadLink, 
      imageUrl 
    });

    await newGame.save();
    res.redirect('/');
  } catch (error) {
    console.error('Error al subir el juego:', error);
    res.status(500).render('admin/upload', { 
      error: error.message 
    });
  }
});

// Ruta para eliminar un juego (POST)
app.post('/admin/games/delete/:id', isAuthenticated, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).send('Juego no encontrado');
    }

    // Eliminar la imagen asociada
    const imagePath = path.join(__dirname, 'public', game.imageUrl);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    await game.deleteGame();
    res.redirect('/');
  } catch (error) {
    console.error('Error al eliminar el juego:', error);
    res.status(500).send('Error interno del servidor');
  }
});

// Ruta para mostrar confirmación de eliminación (GET)
// Ruta de confirmación (GET)
app.get('/admin/confirm-delete/:id', isAuthenticated, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.redirect('/?error=Juego no encontrado');
    }
    res.render('confirm-delete', { game });
  } catch (error) {
    console.error(error);
    res.redirect('/?error=Error al buscar el juego');
  }
});

// Ruta GET para mostrar confirmación (debe existir si usas <a href>)
app.get('/admin/games/delete/:id', isAuthenticated, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    res.render('admin/confirm-delete', { game }); // Crea esta vista
  } catch (error) {
    console.error(error);
    res.redirect('/?error=Juego no encontrado');
  }
});

// Ruta POST para procesar la eliminación (ESTO ES LO QUE FALTA)
// Ruta para procesar la eliminación (POST)
app.post('/admin/games/delete/:id', isAuthenticated, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.redirect('/?error=Juego no encontrado');
    }

    // Eliminar la imagen asociada
    const imagePath = path.join(__dirname, 'public', game.imageUrl);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    await Game.deleteOne({ _id: req.params.id });
    res.redirect('/?success=Juego eliminado correctamente');
  } catch (error) {
    console.error(error);
    res.redirect('/?error=Error al eliminar el juego');
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});