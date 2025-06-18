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

// Importar CSRF
const csrf = require('csurf');
const helmet = require('helmet');

// Middleware para generar un nonce único por respuesta
const crypto = require('crypto');
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          'https://cdn.jsdelivr.net',
          'https://us.i.posthog.com',
          (req, res) => `'nonce-${res.locals.nonce}'`,
        ],
        styleSrc: ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
        imgSrc: [
          "'self'",
          'data:',
          'https://assets.pixelrushgames.xyz',
          'https://us.i.posthog.com',
        ],
        connectSrc: [
          "'self'",
          'https://discord.com',
          'https://us.i.posthog.com',
        ],
        fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'data:'],
        mediaSrc: ["'self'"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
        frameSrc: ["'none'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
        blockAllMixedContent: [],
      },
      reportOnly: false,
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: [],
      usb: [],
      magnetometer: [],
      gyroscope: [],
      accelerometer: [],
    },
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
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Conexión a MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado a la base de datos'))
  .catch((err) => console.error('Error de conexión a la base de datos:', err));

// Middlewares básicos
app.use(express.static('public'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CSRF solo para rutas específicas que NO usan multipart
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000,
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
});

// Aplicar CSRF solo a rutas que NO manejan archivos
app.use('/api', csrfProtection);

// Valores por defecto para todas las páginas
app.use((req, res, next) => {
  res.locals.pageTitle =
    'Descarga Juegos Full Español Gratis para PC y Android. MEGA, MediaFire, Torrent | PixelRushGames';
  res.locals.metaDescription =
    'Descarga los mejores juegos gratis para PC y Android. Juegos Full en Español desde servidores como MEGA, Torrent y MediaFire. Descripciones detalladas, requisitos del sistema y capturas.';
  res.locals.metaKeywords = [
    'juegos gratis',
    'descargar juegos',
    'PC games',
    'Android games',
    'PixelRushGames',
  ];
  res.locals.ogImage = '/assets/favicon/favicon.ico';
  res.locals.originalUrl = req.originalUrl;
  res.locals.currentPlatform = req.query.platform || null;
  res.locals.searchQuery = '';
  res.locals.currentPage = 1;
  res.locals.totalPages = 1;
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
