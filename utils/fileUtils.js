const fs = require('fs');
const path = require('path');

exports.deleteFile = (filePath) => {
  const fullPath = path.join(__dirname, '../', filePath);
  fs.unlink(fullPath, err => {
    if (err) console.error('Error al eliminar archivo:', err);
  });
};