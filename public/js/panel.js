// Ejemplo de solicitud protegida para cargar datos del panel
fetch('/admin/panel', {
  method: 'GET',
})
  .then((response) => {
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('No autorizado');
      }
      throw new Error('Error al cargar los datos del panel');
    }
    return response.json();
  })
  .then((data) => {
    console.log('Datos del panel:', data);
    // Aquí puedes manejar los datos del panel
  })
  .catch((error) => {
    console.error('Error al acceder al panel:', error);
    alert(error.message);
    window.location.href = '/admin/login'; // Redirige al login si no está autorizado
  });