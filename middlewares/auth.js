const jwt = require('jsonwebtoken');

exports.verifyJWT = (req, res, next) => {
    const token = req.cookies.jwt;
    
    if (!token) {
        return res.status(401).redirect('/admin/login');
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.clearCookie('jwt').status(403).redirect('/admin/login');
        }
        req.user = decoded.user;
        next();
    });
};