const Game = require('../models/Game');

// Función auxiliar para obtener juegos paginados y filtrados
async function getPaginatedGames({ search, platform, page = 1, limit = 10 }) {
  const query = {};
  if (search) query.title = { $regex: search, $options: 'i' };
  if (platform) query.platform = platform;

  const skip = (page - 1) * limit;
  const [games, totalGames] = await Promise.all([
    Game.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Game.countDocuments(query),
  ]);
  const totalPages = Math.ceil(totalGames / limit);

  return { games, totalPages };
}

// Página principal
exports.getHome = async (req, res) => {
  try {
    const search = req.query.search || '';
    const platform = req.query.platform || '';
    const page = parseInt(req.query.page) || 1;
    const { games, totalPages } = await getPaginatedGames({
      search,
      platform,
      page,
    });

    res.render('index', {
      games,
      currentPage: page,
      totalPages,
      searchQuery: search,
      currentPlatform: platform,
      pageTitle:
        'Descarga Juegos Full Español Gratis para PC y Android. MEGA, MediaFire, Google Drive',
      metaDescription:
        'Descarga los mejores juegos gratis para PC y Android. Juegos Full en Español desde servidores como MEGA, Google Drive y MediaFire. Descripciones detalladas, requisitos del sistema y capturas.',
      metaKeywords: [
        'descargar juegos gratis',
        'juegos para PC',
        'juegos para Android',
        'juegos full español',
        'juegos gratis',
        'últimos lanzamientos',
        'descargar juegos',
        'PC games',
        'Android games',
        'PixelRushGames',
      ],
    });
  } catch (error) {
    console.error('Error al obtener juegos:', error.message);
    res.status(500).render('error', { message: 'Error interno del servidor' });
  }
};

// Página de todos los juegos (con filtros)
exports.gamesController = {
  getAllGames: async (req, res) => {
    try {
      const search = req.query.search || '';
      const platform = req.query.platform || '';
      const page = parseInt(req.query.page) || 1;
      const { games, totalPages } = await getPaginatedGames({
        search,
        platform,
        page,
      });

      res.render('games', {
        games,
        currentPage: page,
        totalPages,
        searchQuery: search,
        currentPlatform: platform,
        pageTitle:
          'Descarga Juegos Full Español Gratis para PC y Android. MEGA, MediaFire, Google Drive',
        metaDescription:
          'Descarga los mejores juegos gratis para PC y Android. Juegos Full en Español desde servidores como MEGA, Google Drive y MediaFire. Descripciones detalladas, requisitos del sistema y capturas.',
        metaKeywords: [
          'descargar juegos gratis',
          'juegos para PC',
          'juegos para Android',
          'juegos full español',
          'juegos gratis',
          'últimos lanzamientos',
          'descargar juegos',
          'PC games',
          'Android games',
          'PixelRushGames',
        ],
      });
    } catch (err) {
      console.error('Error al obtener juegos:', err);
      res
        .status(500)
        .render('error', { message: 'Error al cargar los juegos' });
    }
  },
};

// Búsqueda avanzada
exports.searchGames = async (req, res) => {
  try {
    const search = req.query.search || req.query.q || '';
    const platform = req.query.platform || '';
    const page = parseInt(req.query.page) || 1;
    const { games, totalPages } = await getPaginatedGames({
      search,
      platform,
      page,
    });

    res.render('searchResults', {
      games,
      searchQuery: search,
      currentPage: page,
      totalPages,
      currentPlatform: platform,
      pageTitle: `Resultados de busqueda para: ${search} - Juegos Full Español Gratis para PC y Android.`,
      metaDescription:
        'Descarga los mejores juegos gratis para PC y Android. Juegos Full en Español desde servidores como MEGA, Google Drive y MediaFire. Descripciones detalladas, requisitos del sistema y capturas.',
      metaKeywords: [
        'descargar juegos gratis',
        'juegos para PC',
        'juegos para Android',
        'juegos full español',
        'juegos gratis',
        'últimos lanzamientos',
        'descargar juegos',
        'PC games',
        'Android games',
        'PixelRushGames',
      ],
    });
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res
      .status(500)
      .render('error', { message: 'Error al procesar la búsqueda' });
  }
};

exports.getDMCA = (req, res) => {
  res.render('dmca', {
    pageTitle: 'Política DMCA - Derechos de Autor y Reporte de Infracciones',
    metaDescription:
      'Cumplimiento de la Digital Millennium Copyright Act (DMCA). Reporte de contenido protegido y proceso de eliminación. Respetamos los derechos de propiedad intelectual.',
    metaKeywords: [
      'DMCA',
      'derechos autor',
      'reportar infracción',
      'copyright',
      'propiedad intelectual',
      'proceso legal',
    ],
  });
};

exports.getContact = (req, res) => {
  res.render('contact', {
    pageTitle: 'Contacto - Soporte Técnico y Comunicación',
    metaDescription:
      'Formas de contactar al equipo de PixelRushGames. Soporte técnico, colaboraciones y consultas generales. Respuesta en menos de 24 horas.',
    metaKeywords: [
      'contacto',
      'soporte técnico',
      'ayuda',
      'colaboraciones',
      'consultas',
      'atención al usuario',
    ],
  });
};

exports.getBrokenURL = (req, res) => {
  res.render('brokenURL', {
    pageTitle: 'Reportar Enlace Roto - Contribuye a Mejorar el Sitio',
    metaDescription:
      '¿Encontraste un enlace roto o que no funciona? Repórtalo aquí y ayudanos a mantener actualizado nuestro catálogo de juegos.',
    metaKeywords: [
      'reportar enlace',
      'enlace roto',
      'error descarga',
      'solución problemas',
      'mejorar sitio',
      'feedback usuarios',
    ],
    csrfToken: req.csrfToken(),
  });
};
