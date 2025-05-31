const csrfToken = document.querySelector('input[name="_csrf"]').value;

document.getElementById('reportForm').addEventListener('submit', async (e) => {
  e.preventDefault();

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
    timestamp: new Date().toLocaleString(),
  };

  if (!reportData.gameName || !reportData.brokenLink) {
    document.getElementById('responseMessage').innerHTML =
      `<p style="color: red;">Por favor, completa todos los campos obligatorios.</p>`;
    return;
  }

  registerReport();

  // Enviar al backend
  try {
    const res = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CSRF-Token': csrfToken },
      body: JSON.stringify(reportData),
    });

    const result = await res.json();

    if (result.success) {
      document.getElementById('responseMessage').innerHTML = `
        <p style="color: green;">✅ Reporte enviado. ¡Gracias por ayudar!</p>
        <p>Revisaré el problema lo antes posible.</p>
      `;
      document.getElementById('reportForm').reset();
    } else {
      throw new Error(result.error || 'Error desconocido');
    }
  } catch {
    document.getElementById('responseMessage').innerHTML =
      `<p style="color: red;">Error al enviar el reporte. Intenta más tarde.</p>`;
  }
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
