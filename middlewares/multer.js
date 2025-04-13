const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de almacenamiento
const storage = multer.diskStorage({
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
});

// Lista de extensiones permitidas
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];

// Configuración de multer
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de tamaño de archivo: 5 MB
  fileFilter: (req, file, cb) => {
    // Verifica el tipo MIME
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten imágenes'), false);
    }

    // Verifica la extensión del archivo
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return cb(new Error(`Extensión no permitida: ${fileExtension}`), false);
    }

    cb(null, true);
  },
});

module.exports = upload;