require("./middlewares/instrument.js");

const express = require('express');
const app = express();
const path = require('path');

require('dotenv').config();

const PORT = process.env.PORT;

const mongoose = require('mongoose');

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const Sentry = require("@sentry/node");

const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https://discord.com"],
      frameSrc: ["'none'"], // Bloquea iframes
      objectSrc: ["'none'"] // Bloquea Flash/Java
    }
  },
  hsts: { maxAge: 63072000, includeSubDomains: true } // HSTS forzado
}));

// Verifica si las variables de entorno requeridas están definidas
const requiredEnvVars = ['MONGODB_URI', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'JWT_SECRET', 'NODE_ENV', 'PORT'];
requiredEnvVars.forEach(env => {
  if (!process.env[env]) {
    console.error(`Falta la variable de entorno: ${env}`);
    process.exit(1); // Detiene el servidor si falta una variable
  }
});

// Configuración de vistas
app.set('view engine', 'ejs'); // Motor de plantillas
app.set('views', path.join(__dirname, 'views')); // Carpeta de vistas

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Conectado a MongoDB'))
  .catch((err) => console.error('Error de conexión:', err));

app.use((req, res, next) => {
  // Inicializa searchQuery como cadena vacía si no está definida
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

// Evita ejecución de scripts en la carpeta de uploads
const uploadsMiddleware = require('./middlewares/uploads');
const { report } = require('process');
app.use('/uploads', uploadsMiddleware);

Sentry.setupExpressErrorHandler(app);

// Middleware para manejar errores
app.use(function onError(err, req, res, next) {
  res.statusCode = 500;
  res.end(res.sentry + "\n");
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT} en modo ${process.env.NODE_ENV || 'development'}`);
});