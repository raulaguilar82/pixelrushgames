require('dotenv').config();
const express = require('express');
const app = express();

const { PostHog } = require('posthog-node');

const client = new PostHog(process.env.POSTHOG_TOKEN, {
  host: 'https://us.i.posthog.com',
  enableExceptionAutocapture: true,
});

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
        imgSrc: ["'self'", 'data:', 'https://assets.pixelrushgames.xyz'],
        connectSrc: ["'self'", 'https://discord.com'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [], // Fuerza solicitudes HTTPS
        blockAllMixedContent: [], // Bloquea contenido mixto
      },
    },
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
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

// Middlewares
app.use(express.static('public'));
app.use(express.json()); // Analiza cuerpos JSON
app.use(express.urlencoded({ extended: true })); // Analiza cuerpos URL-encoded
// Valores por defecto para todas las páginas
app.use((req, res, next) => {
  res.locals = {
    pageTitle:
      'Descarga Juegos Full Español Gratis para PC y Android. MEGA, MediaFire, Google Drive | PixelRushGames',
    metaDescription:
      'Descarga los mejores juegos gratis para PC y Android. Juegos Full en Español desde servidores como MEGA, Google Drive y MediaFire. Descripciones detalladas, requisitos del sistema y capturas.',
    metaKeywords: [
      'juegos gratis',
      'descargar juegos',
      'PC games',
      'Android games',
      'PixelRushGames',
    ],
    ogImage: '/assets/favicon/favicon.ico',
    originalUrl: req.originalUrl,
    currentPlatform: req.query.platform || null,
    searchQuery: '',
    currentPage: 1,
    totalPages: 1,
  };
  next();
});
// Middleware para detectar Cloudflare
app.use((req, res, next) => {
  if (req.headers['cf-visitor']) {
    res.locals.isCloudflare = true;
    req.realIp = req.headers['cf-connecting-ip'];
  }
  next();
});
// Configuración específica para CF
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
}
// Middleware para cache del sitemap
const apicache = require('apicache');
const cache = apicache.middleware;

// Rutas
const Game = require('./models/Game');
app.get('/sitemap.xml', cache('6 hours'), async (req, res) => {
  try {
    const [games, staticPages] = await Promise.all([
      Game.find().select('slug updatedAt imageUrl title').lean(),
    ]);

    const url = process.env.SITE_URL || 'https://pixelrushgames.xyz';

    res.header('Content-Type', 'application/xml');
    res.render('sitemap', {
      games,
      url,
      lastMod: new Date().toISOString(),
    });
  } catch (error) {
    console.error('🚨 Error generando sitemap:', error);
    res.status(500).send('Error interno del servidor');
  }
});

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
