const jwt = require('jsonwebtoken');

// Genera un token JWT
exports.generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1h', // El token expira en 1 hora
  });
};

// Middleware para verificar el token JWT
exports.verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Obtiene el token del encabezado Authorization
  if (!token) {
    // Si no hay token, redirige al login si es una solicitud HTML
    if (req.accepts('html')) {
      return res.redirect('/admin/login');
    }
    // Si no es una solicitud HTML, devuelve un error JSON
    return res.status(401).json({ error: 'Acceso no autorizado. Token no proporcionado.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verifica el token
    req.user = decoded; // Agrega los datos del usuario al objeto `req`
    next();
  } catch (error) {
    // Si el token es inválido o expiró, redirige al login si es una solicitud HTML
    if (req.accepts('html')) {
      return res.redirect('/admin/login');
    }
    // Si no es una solicitud HTML, devuelve un error JSON
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }
};