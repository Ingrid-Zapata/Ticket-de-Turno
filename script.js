document.getElementById('ticketForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const form = this;
  const inputs = form.querySelectorAll('input, select');
  let valido = true;

  const regexCURP = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/i;
  const regexTelefono = /^[0-9]{10}$/;
  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Limpiar errores previos
  form.querySelectorAll('.error').forEach(e => e.textContent = "");

  inputs.forEach(input => {
    const error = input.parentElement.querySelector('.error');
    const valor = input.value.trim();

    if (valor === "") {
      valido = false;
      error.textContent = "Campo obligatorio";
      input.style.border = "2px solid red";
    } else {
      input.style.border = "1px solid #ccc";
    }

    if (input.name === "curp" && valor !== "" && !regexCURP.test(valor)) {
      valido = false;
      error.textContent = "CURP no válida";
    }

    if ((input.name === "telefono" || input.name === "celular") && valor !== "" && !regexTelefono.test(valor)) {
      valido = false;
      error.textContent = "Debe tener 10 dígitos";
    }

    if (input.name === "correo" && valor !== "" && !regexEmail.test(valor)) {
      valido = false;
      error.textContent = "Correo no válido";
    }
  });

  if (!valido) return;

  // Generar número de turno
  const numeroTurno = Math.floor(1000 + Math.random() * 9000);
  const formData = new FormData(form);
  const datos = Object.fromEntries(formData.entries());

  // Mostrar resumen
  const resumenDiv = document.getElementById('resumen');
  resumenDiv.innerHTML = `
    <p><strong>Número de turno:</strong> ${numeroTurno}</p>
    <p><strong>Nombre completo:</strong> ${datos.nombreCompleto}</p>
    <p><strong>CURP:</strong> ${datos.curp}</p>
    <p><strong>Teléfono:</strong> ${datos.telefono}</p>
    <p><strong>Correo:</strong> ${datos.correo}</p>
    <p><strong>Nivel:</strong> ${datos.nivel}</p>
    <p><strong>Municipio:</strong> ${datos.municipio}</p>
    <p><strong>Asunto:</strong> ${datos.asunto}</p>
  `;

  // Generar QR
  const textoQR = `Turno: ${numeroTurno}\nNombre: ${datos.nombreCompleto}\nAsunto: ${datos.asunto}`;
  QRCode.toDataURL(textoQR, { width: 160 }, function (err, url) {
    document.getElementById('qrCode').src = url;
  });

  // Generar código de barras
  JsBarcode("#barcode", numeroTurno.toString(), {
    format: "CODE128",
    displayValue: true,
    fontSize: 14
  });

  // Mostrar sección de resultado
  document.getElementById('resultado').classList.remove('hidden');
  form.classList.add('hidden');
});

// Acción del botón continuar
document.getElementById('continuarBtn').addEventListener('click', () => {
  alert("Gracias, su turno ha sido registrado correctamente ✅");
  location.reload();
});
