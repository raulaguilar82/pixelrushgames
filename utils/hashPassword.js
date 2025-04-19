const bcrypt = require('bcryptjs');
const fs = require('fs');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('Introduce la contraseña a hashear: ', async (password) => {
  try {
    // Genera el hash (con un "salt" de 10 rondas)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Guarda en .env
    fs.appendFileSync('.env', `\nADMIN_PASSWORD_HASH=${hashedPassword}`);
    console.log('✅ Contraseña hasheada y guardada en .env');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    readline.close();
  }
});