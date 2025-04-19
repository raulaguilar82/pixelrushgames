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

// Todas las rutas de admin requieren IP autorizada
const ipRestriction = require('../middlewares/ipRestriction');
router.use(ipRestriction);

// Rutas públicas
router.get('/login', adminController.showLogin);
router.post('/login', authLimiter, adminController.login);

// Middleware de autenticación JWT (protege todas las rutas siguientes)
router.use(verifyJWT);

// Panel de administración
router.get('/panel', adminController.getPanel);

// Mostrar formulario de subida de juego
router.get('/upload', adminController.getUploadForm);

// // Procesar subida de juego
router.post(
  '/upload',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'captures', maxCount: 5 },
  ]),
  uploadLimiter,
  adminController.uploadGame
);

// Mostrar formulario de edición
router.get('/edit/:id', adminController.getEditForm);
// Procesar edición del juego
router.post('/edit/:id', authLimiter, adminController.editGame);

// Mostrar formulario de confirmación de eliminación
router.get('/confirm-delete/:id', adminController.getConfirmDelete);
// Procesar eliminación del juego
router.post('/games/delete/:id', deleteLimiter, adminController.deleteGame);

// Logout
router.get('/logout', adminController.logout);

module.exports = router;
