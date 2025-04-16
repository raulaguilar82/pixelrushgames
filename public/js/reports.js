document.getElementById('reportForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Verificar límite de reportes
    if (!canSubmitReport()) {
        document.getElementById('responseMessage').innerHTML = `
            <p style="color: red;">⚠️ Has alcanzado el límite de 3 reportes por día.</p>
            <p>Por favor, vuelve mañana.</p>
        `;
        return;
    }

    const reportData = {
        gameName: document.getElementById('gameName').value,
        brokenLink: document.getElementById('brokenLink').value,
        userNote: document.getElementById('userNote').value,
        timestamp: new Date().toLocaleString()
    };

    // Registrar el reporte
    registerReport();

    // Opción 1: Enviar a Discord (recomendado)
    sendToDiscord(reportData);

    document.getElementById('responseMessage').innerHTML = `
                <p style="color: green;">✅ Reporte enviado. ¡Gracias por ayudar!</p>
                <p>Revisaré el problema lo antes posible.</p>
            `;
    document.getElementById('reportForm').reset();
});

// Función para verificar si el usuario puede enviar más reportes
function canSubmitReport() {
    const today = new Date().toLocaleDateString();
    const reportsData = JSON.parse(localStorage.getItem('userReports') || '{}');
    
    // Si es un día diferente, reiniciar el contador
    if (reportsData.date !== today) {
        return true;
    }
    
    // Verificar si ha alcanzado el límite
    return reportsData.count < 3;
}

// Función para registrar un nuevo reporte
function registerReport() {
    const today = new Date().toLocaleDateString();
    let reportsData = JSON.parse(localStorage.getItem('userReports') || '{}');
    
    // Si es un día diferente o no hay datos, reiniciar el contador
    if (reportsData.date !== today) {
        reportsData = { date: today, count: 0 };
    }
    
    // Incrementar el contador
    reportsData.count++;
    localStorage.setItem('userReports', JSON.stringify(reportsData));
}

// Función para enviar a Discord via Webhook (sin cambios)
function sendToDiscord(data) {
    
    const webhookURL = "https://discord.com/api/webhooks/1361477985965703370/K3vTLQiWNn-jZZhp-2TESp9Yd6G0MTJq-WS36TvVz8NjxjBjgnS5sTRSWfFDtVKSrMY6"; // Asegúrate de que esta variable de entorno esté configurada

    const embed = {
        title: `Nuevo reporte: ${data.gameName}`,
        fields: [
            { name: "Enlace roto", value: data.brokenLink },
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