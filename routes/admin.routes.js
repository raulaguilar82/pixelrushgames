const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const adminController = require('../controllers/adminController');
const { verifyJWT } = require('../middlewares/auth');
const multer = require('multer');

// Configuración de Multer
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../public/uploads', req.body.title.replace(/\s+/g, '_'));
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'), false);
    }
  },
});

// Rutas públicas
router.get('/login', adminController.showLogin);
router.post('/login', adminController.login);

// Middleware de autenticación JWT (protege todas las rutas siguientes)
router.use(verifyJWT);

// Rutas protegidas
router.get('/panel', adminController.getPanel);
router.get('/upload', adminController.getUploadForm);
router.post('/upload', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'captures', maxCount: 10 },
]), adminController.uploadGame);
router.post('/games/delete/:id', adminController.deleteGame);

// Logout (adaptado para JWT)
router.get('/logout', (req, res) => {
  res.clearCookie('jwt') // Elimina la cookie JWT
     .redirect('/admin/login');
});

module.exports = router;