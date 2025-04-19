const allowedIPs = [process.env.ALLOWED_IP_1, process.env.ALLOWED_IP_2];

const ipRestriction = (req, res, next) => {
  const clientIP =
    req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  // Limpia la IP si está en formato ::ffff:192.168.1.1 (IPv6)
  const cleanIP = clientIP.replace('::ffff:', '');

  if (allowedIPs.includes(cleanIP)) {
    next(); // Permite el acceso
  } else {
    console.warn(`⚠️ Intento de acceso no autorizado desde IP: ${cleanIP}`);
    res.status(403).send('Acceso prohibido: IP no autorizada');
  }
};

module.exports = ipRestriction;
