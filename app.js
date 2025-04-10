const express = require('express');
const app = express();
const PORT = 3000;

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Middleware para servir archivos estáticos
app.use(express.static('public'));

// Configurar el motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Asegúrate de que las vistas estén en la carpeta "views"

// Conectar a MongoDB local
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error de conexión:', err));

// Contraseña de administrador encriptada
const adminPassword = process.env.ADMIN_PASSWORD;

// Middleware para verificar autenticación
const isAuthenticated = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Acceso denegado');
  }

  const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
  const [username, password] = credentials.split(':');

  if (username === 'admin' && bcrypt.compareSync(password, adminPassword)) {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Credenciales inválidas');
  }
};

// Modelo de datos
const Game = require('./models/Game'); // Asegúrate de que esta ruta sea correcta

// Ruta para renderizar la página principal
app.get('/', async (req, res) => {
  try {
    const games = await Game.find().sort({ createdAt: -1 }).limit(10); // Obtiene los últimos 10 juegos
    res.render('index', { games }); // Renderiza la vista "index.ejs" con los datos de los juegos
  } catch (error) {
    console.error('Error al obtener juegos:', error);
    res.status(500).send('Error interno del servidor');
  }
});

// Ruta privada para subir juegos
app.get('/admin/upload', isAuthenticated, (req, res) => {
  res.render('admin/upload'); // Asegúrate de que "upload.ejs" exista en "views/admin/"
});

app.post('/admin/upload', isAuthenticated, multer().single('image'), async (req, res) => {
  try {
    const { title, description, platform, downloadLink } = req.body;
    const imageUrl = '/uploads/' + req.file.filename;

    const newGame = new Game({ title, description, platform, downloadLink, imageUrl });
    await newGame.save();

    res.redirect('/');
  } catch (error) {
    console.error('Error al subir el juego:', error);
    res.status(500).send('Error interno del servidor');
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});