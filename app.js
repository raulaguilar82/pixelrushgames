require('./config/instrument');
require('dotenv').config();
const express = require('express');
const app = express();

const path = require('path');
const PORT = process.env.PORT;
const mongoose = require('mongoose');

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const helmet = require('helmet');
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
        styleSrc: ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://*.r2.cloudflarestorage.com'],
        connectSrc: ["'self'", 'https://discord.com'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [], // Fuerza solicitudes HTTPS
        blockAllMixedContent: [], // Bloquea contenido mixto
      },
    },
    hsts: { maxAge: 63072000, includeSubDomains: true },
  })
);

// Verifica si las variables de entorno requeridas están definidas
const requiredEnvVars = [
  'MONGODB_URI',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
  'JWT_SECRET',
  'NODE_ENV',
  'PORT',
];
requiredEnvVars.forEach((env) => {
  if (!process.env[env]) {
    console.error(`Falta la variable de entorno: ${env}`);
    process.exit(1);
  }
});

// Configuración de vistas
app.set('view engine', 'ejs'); // Motor de plantillas
app.set('views', path.join(__dirname, 'views')); // Carpeta de vistas

// Conexión a MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado a la base de datos'))
  .catch((err) => console.error('Error de conexión a la base de datos:', err));

// Estado predeterminado para la paginación
app.use((req, res, next) => {
  res.locals.searchQuery = '';
  res.locals.currentPlatform = req.query.platform || null;
  res.locals.currentPage = 1;
  res.locals.totalPages = 1;
  next();
});

// Middlewares
app.use(express.static('public')); // Carpeta para archivos estáticos
app.use(express.json()); // Analiza cuerpos JSON
app.use(express.urlencoded({ extended: true })); // Analiza cuerpos URL-encoded

// Rutas
app.use('/', require('./routes/home.routes'));
app.use('/admin', require('./routes/admin.routes'));
app.use('/games', require('./routes/games.routes'));
app.use('/api', require('./routes/report.routes'));

// Middleware para manejar errores 404 (Página no encontrada)
app.use((req, res) => {
  res.status(404).render('404', { message: 'Página no encontrada' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(
    `Servidor corriendo en localhost:${process.env.PORT} en modo ${process.env.NODE_ENV || 'development'}`
  );
});
