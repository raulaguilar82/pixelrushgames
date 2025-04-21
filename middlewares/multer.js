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
      const folder = req.body.folder || 'uploads';
      const filename = `${Date.now()}-${file.originalname}`;
      cb(null, `${folder}/${filename}`);
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
