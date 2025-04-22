const rateLimit = require('express-rate-limit');

exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3, // Máximo 3 intentos por IP
  message: 'Demasiados intentos, espera 15 minutos',
});

exports.deleteLimiter = rateLimit({
  windowMs: 1440 * 60 * 1000,
  max: 5,
  message: 'Espera hasta mañana',
});

exports.uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1,
  message: 'Espera 1 hora entre subidas',
});
