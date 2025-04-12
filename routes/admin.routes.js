const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { authLimiter } = require('../middlewares/rateLimiter');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwtAuth = require('../middlewares/jwtAuth');
const { verifyToken } = require('../middlewares/jwtAuth');

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

// Rutas protegidas
router.get('/panel', verifyToken, adminController.getPanel);
router.get('/upload', verifyToken, adminController.getUploadForm);
router.post('/upload', verifyToken, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'captures', maxCount: 10 },
]), adminController.uploadGame);
router.post('/games/delete/:id', verifyToken, adminController.deleteGame);

// Ruta de inicio de sesión
router.get('/login', (req, res) => res.render('admin/login'));
router.post('/login', authLimiter, (req, res) => {
  const { username, password } = req.body;

  if (username === process.env.ADMIN_USERNAME && bcrypt.compareSync(password, process.env.ADMIN_PASSWORD)) {
    // Genera un token JWT
    const token = jwtAuth.generateToken({ username });
    res.json({ message: 'Inicio de sesión exitoso', token }); // Devuelve el token al cliente
  } else {
    res.status(401).json({ error: 'Credenciales inválidas' });
  }
});
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
      return res.redirect('/admin/panel');
    }
    res.redirect('/admin/login');
  });
});

module.exports = router;