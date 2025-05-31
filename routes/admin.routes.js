const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const verifyJWT = require('../middlewares/auth');
const {
  authLimiter,
  uploadLimiter,
  deleteLimiter,
} = require('../middlewares/rateLimiter');
const upload = require('../middlewares/multer');
const csrf = require('csurf');

// Configuración CSRF que funciona con multipart
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000,
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  // Función personalizada para extraer el token de multipart
  value: function (req) {
    return (
      (req.body && req.body._csrf) ||
      (req.query && req.query._csrf) ||
      req.headers['csrf-token'] ||
      req.headers['xsrf-token'] ||
      req.headers['x-csrf-token'] ||
      req.headers['x-xsrf-token']
    );
  },
});

// Todas las rutas de admin requieren IP autorizada
const ipRestriction = require('../middlewares/ipRestriction');
router.use(ipRestriction);

// Rutas públicas
router.get('/login', csrfProtection, adminController.showLogin);
router.post('/login', authLimiter, adminController.login);

// Middleware de autenticación JWT (protege todas las rutas siguientes)
router.use(verifyJWT);

// Panel de administración
router.get('/panel', adminController.getPanel);

// Mostrar formulario de subida de juego
router.get('/upload', csrfProtection, adminController.getUploadForm);

// Procesar subida de juego - CAMBIO IMPORTANTE: multer ANTES de CSRF
router.post(
  '/upload',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'captures', maxCount: 5 },
  ]),
  uploadLimiter,
  csrfProtection,
  adminController.uploadGame
);

// Mostrar formulario de edición
router.get('/edit/:id', csrfProtection, adminController.getEditForm);
// Procesar edición del juego
router.post('/edit/:id', authLimiter, csrfProtection, adminController.editGame);

// Mostrar formulario de confirmación de eliminación
router.get(
  '/confirm-delete/:id',
  csrfProtection,
  adminController.getConfirmDelete
);
// Procesar eliminación del juego
router.post(
  '/games/delete/:id',
  deleteLimiter,
  csrfProtection,
  adminController.deleteGame
);

// Logout
router.get('/logout', adminController.logout);

module.exports = router;
