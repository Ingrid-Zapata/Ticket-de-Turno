// Cargar catálogos dinámicamente
async function cargarCatalogos(preseleccion = {}) {
  try {
    // Cargar niveles
    const nivelesRes = await fetch('/api/public/catalogs/nivel');
    const nivelesData = await nivelesRes.json();
    if (nivelesData.success) {
      const selectsNivel = document.querySelectorAll('select[name="nivel"]');
      selectsNivel.forEach(select => {
        const currentValue = preseleccion.nivel || select.value;
        select.innerHTML = '<option value="">Seleccione...</option>';
        nivelesData.items.forEach(item => {
          const option = document.createElement('option');
          option.value = item.name.toLowerCase();
          option.textContent = item.name;
          select.appendChild(option);
        });
        // Intentar pre-seleccionar el valor
        if (currentValue) {
          const normalizedValue = currentValue.toLowerCase().trim();
          // Buscar coincidencia exacta o parcial
          const matchingOption = Array.from(select.options).find(opt => 
            opt.value.toLowerCase() === normalizedValue || 
            opt.textContent.toLowerCase() === normalizedValue
          );
          if (matchingOption) {
            select.value = matchingOption.value;
          }
        }
      });
    }

    // Cargar municipios
    const municipiosRes = await fetch('/api/public/catalogs/municipio');
    const municipiosData = await municipiosRes.json();
    if (municipiosData.success) {
      const selectsMunicipio = document.querySelectorAll('select[name="municipio"]');
      selectsMunicipio.forEach(select => {
        const currentValue = preseleccion.municipio || select.value;
        select.innerHTML = '<option value="">Seleccione...</option>';
        municipiosData.items.forEach(item => {
          const option = document.createElement('option');
          option.value = item.name.toLowerCase();
          option.textContent = item.name;
          select.appendChild(option);
        });
        // Intentar pre-seleccionar el valor
        if (currentValue) {
          const normalizedValue = currentValue.toLowerCase().trim();
          const matchingOption = Array.from(select.options).find(opt => 
            opt.value.toLowerCase() === normalizedValue || 
            opt.textContent.toLowerCase() === normalizedValue
          );
          if (matchingOption) {
            select.value = matchingOption.value;
          }
        }
      });
    }

    // Cargar asuntos
    const asuntosRes = await fetch('/api/public/catalogs/asunto');
    const asuntosData = await asuntosRes.json();
    if (asuntosData.success) {
      const selectsAsunto = document.querySelectorAll('select[name="asunto"]');
      selectsAsunto.forEach(select => {
        const currentValue = preseleccion.asunto || select.value;
        select.innerHTML = '<option value="">Seleccione...</option>';
        asuntosData.items.forEach(item => {
          const option = document.createElement('option');
          option.value = item.name.toLowerCase();
          option.textContent = item.name;
          select.appendChild(option);
        });
        // Intentar pre-seleccionar el valor
        if (currentValue) {
          const normalizedValue = currentValue.toLowerCase().trim();
          const matchingOption = Array.from(select.options).find(opt => 
            opt.value.toLowerCase() === normalizedValue || 
            opt.textContent.toLowerCase() === normalizedValue
          );
          if (matchingOption) {
            select.value = matchingOption.value;
          }
        }
      });
    }
  } catch (error) {
    console.error('Error cargando catálogos:', error);
  }
}

// Función para validar formulario
function validarFormulario(form) {
  const inputs = form.querySelectorAll('input:not([type="hidden"]), select');
  let valido = true;

  const regexCURP = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/i;
  const regexTelefono = /^[0-9]{10}$/;
  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Limpiar errores previos
  form.querySelectorAll('.error').forEach(e => e.textContent = "");

  inputs.forEach(input => {
    const error = input.parentElement.querySelector('.error');
    const valor = input.value.trim();

    if (valor === "" && input.hasAttribute('required')) {
      valido = false;
      error && (error.textContent = "Campo obligatorio");
      input.style.border = "2px solid red";
    } else {
      input.style.border = "1px solid #ccc";
    }

    if (input.name === "curp" && valor !== "" && !regexCURP.test(valor)) {
      valido = false;
      error && (error.textContent = "CURP no válida");
    }

    if ((input.name === "telefono" || input.name === "celular") && valor !== "" && !regexTelefono.test(valor)) {
      valido = false;
      error && (error.textContent = "Debe tener 10 dígitos");
    }

    if (input.name === "correo" && valor !== "" && !regexEmail.test(valor)) {
      valido = false;
      error && (error.textContent = "Correo no válido");
    }
  });

  return valido;
}

// Helper para setear campos de formulario de forma segura por name
function setFormField(formEl, name, value) {
  const el = formEl.querySelector(`[name="${name}"]`);
  if (!el) return;
  el.value = value == null ? '' : value;
}

// Cargar catálogos al iniciar la página
document.addEventListener('DOMContentLoaded', function() {
  cargarCatalogos();
});


// Generar nuevo turno
document.getElementById('ticketForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  if (!validarFormulario(this)) return;

  try {
    const formData = new FormData(this);
    const datos = Object.fromEntries(formData.entries());

    // Enviar datos al servidor
    const response = await fetch('/api/turno', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datos)
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error al generar el turno');
    }

    const turno = result.turno;

    // Mostrar resumen
    const resumenDiv = document.getElementById('resumen');
    resumenDiv.innerHTML = `
      <p><strong>Número de turno:</strong> ${turno.numero_turno}</p>
      <p><strong>Nombre completo:</strong> ${turno.nombre_completo}</p>
      <p><strong>CURP:</strong> ${turno.curp}</p>
      <p><strong>Teléfono:</strong> ${turno.telefono}</p>
      <p><strong>Correo:</strong> ${turno.correo}</p>
      <p><strong>Nivel:</strong> ${turno.nombre_nivel || turno.nivel || ''}</p>
      <p><strong>Municipio:</strong> ${turno.nombre_municipio || turno.municipio || ''}</p>
      <p><strong>Asunto:</strong> ${turno.nombre_asunto || turno.asunto || ''}</p>
      <p><a href="${result.pdf_url}" target="_blank" class="btn btn-primary">Descargar PDF</a></p>
    `;

    // Generar QR en la UI (mismo contenido que va en el PDF)
    try {
      const textoQR = `CURP: ${turno.curp}\nTurno: ${turno.numero_turno}\nNombre: ${turno.nombre_completo}`;
      if (typeof QRCode !== 'undefined' && document.getElementById('qrCode')) {
        QRCode.toDataURL(textoQR, { width: 160 }, function (err, url) {
          if (!err) document.getElementById('qrCode').src = url;
        });
      }

      // Generar código de barras (si JsBarcode está disponible)
      if (typeof JsBarcode !== 'undefined' && document.getElementById('barcode')) {
        JsBarcode("#barcode", (turno.numero_turno || '').toString(), {
          format: "CODE128",
          displayValue: true,
          fontSize: 14
        });
      }
    } catch (e) {
      console.warn('No se pudo generar QR/barcode en UI:', e);
    }

    // Mostrar sección de resultado
    document.getElementById('resultado').classList.remove('hidden');
    this.classList.add('hidden');

  } catch (error) {
    alert('Error: ' + error.message);
    console.error('Error:', error);
  }
});

// Función para convertir datos del formulario a JSON
function formDataToJson(formData) {
  const data = {};
  formData.forEach((value, key) => {
    if (value.trim() !== '') {  // Solo incluir campos con valor
      data[key] = value;
    }
  });
  return data;
}

// Buscar turno
document.getElementById('buscarBtn').addEventListener('click', async function() {
  const numeroTurno = document.getElementById('numeroBusqueda').value;
  const curp = document.getElementById('curpBusqueda').value;
  
  if (!numeroTurno || !curp) {
    alert('Por favor ingrese el número de turno y CURP');
    return;
  }

  try {
    const response = await fetch('/api/buscar-turno', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ numero_turno: parseInt(numeroTurno), curp: curp })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'No se encontró el turno');
    }

    const turno = result.turno;
    const form = document.getElementById('formModificar');
    
    // Llenar formulario con datos encontrados (safe set)
    setFormField(form, 'numero_turno', turno.numero_turno);
    setFormField(form, 'curp', turno.curp);
    setFormField(form, 'nombreCompleto', turno.nombre_completo || turno.nombre_completo);
    setFormField(form, 'nombre', turno.nombre);
    setFormField(form, 'paterno', turno.paterno);
    setFormField(form, 'materno', turno.materno);
    setFormField(form, 'telefono', turno.telefono);
    setFormField(form, 'celular', turno.celular);
    setFormField(form, 'correo', turno.correo);
    
    // Recargar catálogos con preselección
    await cargarCatalogos({
      nivel: turno.nivel || turno.nombre_nivel || '',
      municipio: turno.municipio || turno.nombre_municipio || '',
      asunto: turno.asunto || turno.nombre_asunto || ''
    });

    // Mostrar formulario de modificación
    document.getElementById('resultadoBusqueda').classList.remove('hidden');
    document.getElementById('pdfActualizado').classList.add('hidden');

  } catch (error) {
    alert('Error: ' + error.message);
    console.error('Error:', error);
  }
});

// Actualizar turno
document.getElementById('formModificar').addEventListener('submit', async function(e) {
  e.preventDefault();
  console.log('Formulario de modificación enviado');

  if (!validarFormulario(this)) {
    console.log('Validación falló');
    return;
  }

  try {
    const formData = new FormData(this);
    const datos = formDataToJson(formData);
    console.log('Datos a enviar:', datos);

    const response = await fetch('/api/actualizar-turno', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datos)
    });

    const result = await response.json();
    console.log('Respuesta del servidor:', result);

    if (!result.success) {
      throw new Error(result.error || 'Error al actualizar el turno');
    }

    // Mostrar mensaje de éxito y enlace al nuevo PDF
    document.getElementById('pdfActualizado').classList.remove('hidden');
    document.getElementById('pdfLink').href = result.turno.pdf_url;

    alert('Turno actualizado correctamente');

  } catch (error) {
    alert('Error al actualizar: ' + error.message);
    console.error('Error en actualización:', error);
  }
});

// Acción del botón continuar
document.getElementById('continuarBtn').addEventListener('click', () => {
  alert("Gracias, su turno ha sido registrado correctamente ✅");
  location.reload();
});