const express = require('express');
const app = express();
const PORT = 3000;

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
require('dotenv').config();

// Verifica si las variables de entorno requeridas están definidas
const requiredEnvVars = ['MONGODB_URI', 'ADMIN_USERNAME', 'ADMIN_PASSWORD'];
requiredEnvVars.forEach(env => {
  if (!process.env[env]) throw new Error(`Falta la variable ${env} en .env`);
});

// Middlewares
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true })); // Para parsear form-data

app.use(session({
  secret: process.env.SESSION_SECRET || '12345678', // Cambia esto por una clave segura
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60, // 1 hora
    httpOnly: true, // Protege contra ataques XSS
  },
}));

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
  if (req.session && req.session.isAuthenticated) {
    return next();
  }
  res.redirect('/admin/login'); // Redirige al login si no está autenticado
};

// Limita el número de intentos de autenticación
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 3, // 3 intentos por IP
  message: 'Demasiados intentos, espera 15 minutos'
});
app.use('/admin/login', authLimiter);

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

const adminRoutes = require('./routes/admin.routes');
app.use('/admin', adminRoutes);

const gamesRoutes = require('./routes/games.routes');
app.use('/games', gamesRoutes);

// Evita ejecución de scripts PHP y JS en la carpeta de uploads
app.use('/uploads', express.static('public/uploads', {
  setHeaders: (res, path) => {
    if (path.endsWith('.js') || path.endsWith('.php')) {
      res.set('Content-Type', 'text/plain');
    }
  }
}));

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});