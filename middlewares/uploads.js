const express = require('express');
const path = require('path');

const isDangerousFile = (path) => {
  const dangerousExtensions = [
    '.js', '.php', '.html', '.sh', '.exe', '.bat', '.cmd', '.pl', '.py', '.rb', '.cgi'
  ];
  return dangerousExtensions.some(ext => path.endsWith(ext));
};

const uploadsMiddleware = express.static('public/uploads', {
  setHeaders: (res, path) => {
    if (isDangerousFile(path)) {
      console.warn(`Archivo peligroso solicitado: ${path}`);
      res.set('Content-Type', 'text/plain');
    }
  }
});

module.exports = uploadsMiddleware;