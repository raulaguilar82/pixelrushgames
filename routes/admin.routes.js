const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const verifyJWT = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiter');
const upload = require('../middlewares/multer');

// Rutas públicas
router.get('/login', adminController.showLogin);
router.post('/login', authLimiter, adminController.login);

// Middleware de autenticación JWT (protege todas las rutas siguientes)
router.use(verifyJWT);

// Panel de administración
router.get('/panel', adminController.getPanel);

// Subir Juego
router.get('/upload', adminController.getUploadForm);
router.post('/upload', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'captures', maxCount: 10 },
]), adminController.uploadGame);

// Eliminar Juego
router.post('/games/delete/:id', adminController.deleteGame);

// Logout
router.get('/logout', adminController.logout);

module.exports = router;