// Ejemplo de solicitud protegida para cargar datos del panel
fetch('/admin/panel', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`, // Envía el token almacenado
  },
})
  .then((response) => {
    if (!response.ok) {
      throw new Error('No autorizado');
    }
    return response.json();
  })
  .then((data) => {
    console.log('Datos del panel:', data);
    // Aquí puedes manejar los datos del panel
  })
  .catch((error) => {
    console.error('Error al acceder al panel:', error);
    alert('No tienes permiso para acceder a esta página');
    window.location.href = '/admin/login'; // Redirige al login si no está autorizado
  });