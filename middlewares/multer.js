// const multer = require('multer');
// const multerS3 = require('multer-s3');
// const { s3 } = require('../config/s3Client.js');
// const path = require('path');
// const fs = require('fs');

// const dotenv = require('dotenv');
// dotenv.config();

// // Configuración de almacenamiento AWS S3
// const upload = multer({
//   storage: multerS3({
//     s3: s3,
//     bucket: process.env.R2_BUCKET,
//     metadata: (req, file, cb) => {
//       cb(null, { fieldName: file.fieldname });
//     },
//     key: (req, file, cb) => {
//       const filename = `${Date.now()}-${file.originalname}`;
//       cb(null, filename);
//     },
//   }),
// });

// // Configuración de almacenamiento MULTER
// // const storage = multer.diskStorage({
// //   destination: (req, file, cb) => {
// //     const uploadDir = path.join(__dirname, '../public/uploads', req.body.title.replace(/\s+/g, '_'));
// //     if (!fs.existsSync(uploadDir)) {
// //       fs.mkdirSync(uploadDir, { recursive: true });
// //     }
// //     cb(null, uploadDir);
// //   },
// //   filename: (req, file, cb) => {
// //     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
// //     cb(null, uniqueSuffix + path.extname(file.originalname));
// //   },
// // });

// // Lista de extensiones permitidas
// const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];

// // Configuración de multer
// const uploadConfig = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // Límite de tamaño de archivo: 5 MB
//   fileFilter: (req, file, cb) => {
//     // Verifica el tipo MIME
//     if (!file.mimetype.startsWith('image/')) {
//       return cb(new Error('Solo se permiten imágenes'), false);
//     }

//     // Verifica la extensión del archivo
//     const fileExtension = path.extname(file.originalname).toLowerCase();
//     if (!allowedExtensions.includes(fileExtension)) {
//       return cb(new Error(`Extensión no permitida: ${fileExtension}`), false);
//     }

//     cb(null, true);
//   },
// });

// module.exports = upload;

const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const { s3 } = require('../config/s3Client.js');

const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.R2_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const filename = `${Date.now()}-${file.originalname}`;
      cb(null, filename);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten imágenes'), false);
    }

    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return cb(new Error(`Extensión no permitida: ${fileExtension}`), false);
    }

    cb(null, true);
  },
});

module.exports = upload;
