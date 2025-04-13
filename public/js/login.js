document.querySelector('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault(); // Evita que el formulario recargue la página

  const username = document.querySelector('#username').value.trim();
  const password = document.querySelector('#password').value.trim();

  // Validación en el cliente
  if (!username || !password) {
    alert('Por favor, ingresa un nombre de usuario y contraseña.');
    return;
  }

  try {
    // Muestra un estado de carga
    const submitButton = document.querySelector('#login-button');
    submitButton.disabled = true;
    submitButton.textContent = 'Iniciando sesión...';

    const response = await fetch('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      alert('Se ha iniciado sesión correctamente');
      console.log('Redirigiendo al panel...');
      window.location.href = '/admin/panel'; // Redirige al panel de administración
    } else {
      alert(data.error || 'Error al iniciar sesión');
    }
  } catch (error) {
    alert('Error al conectar con el servidor');
  } finally {
    // Restablece el estado del botón
    const submitButton = document.querySelector('#login-button');
    submitButton.disabled = false;
    submitButton.textContent = 'Iniciar sesión';
  }
});