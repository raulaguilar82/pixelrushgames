const express = require('express');
const path = require('path');
const fs = require('fs');
const fileType = require('file-type');

const dangerousExtensions = [
  '.js', '.php', '.html', '.sh', '.exe', '.bat', '.cmd', 
  '.pl', '.py', '.rb', '.cgi', '.jsp', '.asp', '.aspx',
  '.jar', '.war', '.ps1', '.msi', '.dll'
];

const isDangerousFile = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return dangerousExtensions.includes(ext);
};

const uploadsMiddleware = (req, res, next) => {
  const filePath = path.join('public/uploads', req.path);
  
  // 1. Verificar existencia del archivo
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      return res.status(404).send('Archivo no encontrado');
    }

    // 2. Bloquear por extensión
    if (isDangerousFile(filePath)) {
      Sentry.captureMessage(`Intento de subida peligrosa: ${filePath}`, {
        level: 'warning',
        extra: { ip: req.ip, userAgent: req.headers['user-agent'] }
      });
      return res.status(403).send('Acceso prohibido: tipo de archivo no permitido');
    }

    // 3. (Opcional) Verificación MIME type real
    fs.readFile(filePath, (err, data) => {
      if (err) return res.status(500).send('Error al leer archivo');

      const type = fileType.fromBuffer(data);
      if (type && dangerousExtensions.includes(`.${type.ext}`)) {
        console.warn(`⚠️ Archivo disfrazado detectado: ${filePath}`, {
          reportedType: type.mime,
          actualExt: path.extname(filePath)
        });
        return res.status(403).send('Archivo no permitido');
      }

      // 4. Servir archivo seguro
      express.static('public/uploads')(req, res, next);
    });
  });
};

module.exports = uploadsMiddleware;