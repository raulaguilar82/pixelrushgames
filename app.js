const express = require('express');
const app = express();
const path = require('path');

require('dotenv').config();

const PORT = process.env.PORT;

const mongoose = require('mongoose');

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const helmet = require('helmet');
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    connectSrc: ["'self'", "https://discord.com"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"]
  }
})
);

// Verifica si las variables de entorno requeridas están definidas
const requiredEnvVars = ['MONGODB_URI', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'JWT_SECRET', 'NODE_ENV', 'PORT'];
requiredEnvVars.forEach(env => {
  if (!process.env[env]) {
    console.error(`Falta la variable de entorno: ${env}`);
    process.exit(1); // Detiene el servidor si falta una variable
  }
});

// Middlewares
app.use(express.static('public')); // Carpeta para archivos estáticos
app.use(express.json()); // Analiza cuerpos JSON
app.use(express.urlencoded({ extended: true })); // Analiza cuerpos URL-encoded

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
  res.locals.currentPlatform = req.query.platform || null; // Captura ?platform=PC o APK
  next();
});

app.use((req, res, next) => {
  // Inicializa searchQuery como cadena vacía si no está definida
  res.locals.searchQuery = '';
  res.locals.currentPlatform = null;
  next();
});

// Rutas
app.use('/', require('./routes/home.routes'));
app.use('/admin', require('./routes/admin.routes'));
app.use('/games', require('./routes/games.routes'));

// Evita ejecución de scripts en la carpeta de uploads
const uploadsMiddleware = require('./middlewares/uploads');
const { report } = require('process');
app.use('/uploads', uploadsMiddleware);

// Middleware para manejar errores
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err.message);
  res.status(500).send('Error interno del servidor');
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT} en modo ${process.env.NODE_ENV || 'development'}`);
});