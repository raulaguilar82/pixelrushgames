document.querySelector('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault(); // Evita que el formulario recargue la página

  const username = document.querySelector('#username').value;
  const password = document.querySelector('#password').value;

  try {
    const response = await fetch('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // Almacena el token en localStorage
      localStorage.setItem('token', data.token);
      alert('Se ha iniciado sesión correctamente');
      console.log('Redirigiendo al panel...');
      window.location.href = '/admin/panel'; // Redirige al panel de administración
    } else {
      alert(data.error || 'Error al iniciar sesión');
    }
  } catch (error) {
    alert('Error al conectar con el servidor');
  }
});