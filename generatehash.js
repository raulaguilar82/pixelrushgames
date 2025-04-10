const bcrypt = require('bcryptjs');

// Cambia '12345678' por la contraseña que deseas encriptar
const password = '12345678';

const hashedPassword = bcrypt.hashSync(password, 10); // Genera el hash con un factor de costo de 10
console.log('Hash generado:', hashedPassword);