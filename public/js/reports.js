document.getElementById('reportForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const reportData = {
        gameName: document.getElementById('gameName').value,
        brokenLink: document.getElementById('brokenLink').value,
        problemType: document.getElementById('problemType').value,
        userNote: document.getElementById('userNote').value,
        timestamp: new Date().toLocaleString()
    };

    // Opción 1: Enviar a Discord (recomendado)
    sendToDiscord(reportData);

    document.getElementById('responseMessage').innerHTML = `
                <p style="color: green;">✅ Reporte enviado. ¡Gracias por ayudar!</p>
                <p>Revisaré el problema lo antes posible.</p>
            `;
    document.getElementById('reportForm').reset();
});

// Función para enviar a Discord via Webhook
function sendToDiscord(data) {
    const webhookURL = 'https://discord.com/api/webhooks/1361477985965703370/K3vTLQiWNn-jZZhp-2TESp9Yd6G0MTJq-WS36TvVz8NjxjBjgnS5sTRSWfFDtVKSrMY6'; // Reemplaza esto

    const embed = {
        title: `Nuevo reporte: ${data.gameName}`,
        fields: [
            { name: "Enlace roto", value: data.brokenLink },
            { name: "Tipo de problema", value: data.problemType },
            { name: "Notas", value: data.userNote || "Ninguna" },
            { name: "Fecha", value: data.timestamp }
        ],
        color: 0xe74c3c
    };

    fetch(webhookURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] })
    });
}