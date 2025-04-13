const express = require('express');
const app = express();
const path = require('path');

const cors = require('cors');

require('dotenv').config();

const PORT = process.env.PORT;

const mongoose = require('mongoose');

const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Verifica si las variables de entorno requeridas están definidas
const requiredEnvVars = ['MONGODB_URI', 'ADMIN_USERNAME', 'ADMIN_PASSWORD'];
requiredEnvVars.forEach(env => {
  if (!process.env[env]) {
    console.error(`Falta la variable de entorno: ${env}`);
    process.exit(1); // Detiene el servidor si falta una variable
  }
});

// Middlewares
app.use(express.static('public')); // Carpeta para archivos estáticos
app.use(express.json()); // Analiza cuerpos JSON
app.use(express.urlencoded({ extended: true })); // Analiza cuerpos URL-encoded

// Configuración de vistas
app.set('view engine', 'ejs'); // Motor de plantillas
app.set('views', path.join(__dirname, 'views')); // Carpeta de vistas

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Conectado a MongoDB'))
  .catch((err) => console.error('Error de conexión:', err));

app.use(cors());

// Rutas
app.use('/', require('./routes/home.routes'));
app.use('/admin', require('./routes/admin.routes'));
app.use('/games', require('./routes/games.routes'));

// Evita ejecución de scripts PHP y JS en la carpeta de uploads /////////////////////////
app.use('/uploads', express.static('public/uploads', { //////////////reposicionar
  setHeaders: (res, path) => {
    const dangerousExtensions = ['.js', '.php', '.html', '.sh'];
    if (dangerousExtensions.some(ext => path.endsWith(ext))) {
      res.set('Content-Type', 'text/plain');
    }
  }
}));

// Middleware para manejar errores
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err.message);
  res.status(500).send('Error interno del servidor');
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT} en modo ${process.env.NODE_ENV || 'development'}`);
});