const express = require('express');
const router = express.Router();

router.post('/report', async (req, res) => {
  const { gameName, brokenLink, userNote, timestamp } = req.body;

  if (!gameName || !brokenLink) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }

  const embed = {
    title: `Nuevo reporte: ${gameName}`,
    fields: [
      { name: 'Enlace roto', value: brokenLink },
      { name: 'Notas', value: userNote || 'Ninguna' },
      { name: 'Fecha', value: timestamp },
    ],
    color: 0xe74c3c,
  };

  try {
    await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error en /api/report:', error);
    res.status(500).json({ error: 'Error al enviar el reporte.' });
  }
});

module.exports = router;
