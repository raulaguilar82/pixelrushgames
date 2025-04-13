const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {

    // Obtiene el token de las cookies
    const token = req.cookies.jwt;
    
    // Si no hay token, maneja el error según el tipo de solicitud
    if (!token) {
        if (req.accepts('html')) {
            return res.redirect('/admin/login');
        }
        return res.status(401).json({ error: 'Acceso no autorizado. Token no proporcionado.' });
    }

    // Decodifica el secreto desde el entorno
    const secret = Buffer.from(process.env.JWT_SECRET, 'base64');

    // Verifica el token JWT
    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            console.error('Error al verificar el token:', err.message);
            res.clearCookie('jwt');
            if (req.accepts('html')) {
                return res.redirect('/admin/login');
            }
            return res.status(403).json({ error: 'Token inválido o expirado.' });
        }
        // Si el token es válido, agrega los datos decodificados al objeto `req`
        req.user = decoded;
        next();
    });
};