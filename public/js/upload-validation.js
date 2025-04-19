document.querySelector('#upload-form').addEventListener('submit', (e) => {
  const errorMessage = document.querySelector('#error-message');
  const submitButton = document.querySelector('.btn-submit');
  errorMessage.style.display = 'none';
  errorMessage.textContent = '';

  // Obtener los archivos seleccionados
  const imageFile = document.querySelector('#image').files[0];
  const captureFiles = document.querySelector('#captures').files;

  // Validar tamaño de la imagen principal
  if (imageFile && imageFile.size > 5 * 1024 * 1024) {
    // 5 MB
    e.preventDefault();
    errorMessage.style.display = 'block';
    errorMessage.textContent = 'La imagen principal no puede superar los 5 MB.';
    submitButton.disabled = false; // Asegúrate de que el botón no quede deshabilitado
    return;
  }

  // Validar cantidad de capturas
  if (captureFiles.length > 5) {
    e.preventDefault();
    errorMessage.style.display = 'block';
    errorMessage.textContent = 'No puedes subir más de 5 capturas.';
    submitButton.disabled = false;
    return;
  }

  // Validar tamaño de cada captura
  for (const file of captureFiles) {
    if (file.size > 5 * 1024 * 1024) {
      // 5 MB
      e.preventDefault();
      errorMessage.style.display = 'block';
      errorMessage.textContent = `El archivo "${file.name}" supera los 5 MB.`;
      submitButton.disabled = false;
      return;
    }
  }

  // Deshabilitar el botón de envío mientras se procesa
  submitButton.disabled = true;
});
