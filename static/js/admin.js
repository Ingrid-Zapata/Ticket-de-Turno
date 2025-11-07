// admin.js - manejo de la UI administrativa para turnos con dashboard

function qs(sel, ctx=document) { return ctx.querySelector(sel); }
function qsa(sel, ctx=document) { return Array.from(ctx.querySelectorAll(sel)); }

let chartTotal = null;
let chartMunicipio = null;
let catalogosCache = { nivel: [], municipio: [], asunto: [] };

// Cargar catálogos para el formulario de edición
async function cargarCatalogosAdmin() {
  try {
    // Cargar niveles
    const nivelesRes = await fetch('/api/catalogs/nivel');
    const nivelesData = await nivelesRes.json();
    if (nivelesData.success) {
      catalogosCache.nivel = nivelesData.items;
    }

    // Cargar municipios
    const municipiosRes = await fetch('/api/catalogs/municipio');
    const municipiosData = await municipiosRes.json();
    if (municipiosData.success) {
      catalogosCache.municipio = municipiosData.items;
    }

    // Cargar asuntos
    const asuntosRes = await fetch('/api/catalogs/asunto');
    const asuntosData = await asuntosRes.json();
    if (asuntosData.success) {
      catalogosCache.asunto = asuntosData.items;
    }
  } catch (error) {
    console.error('Error cargando catálogos:', error);
  }
}

// Dashboard functions
async function loadDashboardStats(municipio = 'todos') {
  try {
    const url = `/api/admin/dashboard-stats${municipio !== 'todos' ? `?municipio=${encodeURIComponent(municipio)}` : ''}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Error');
    
    renderCharts(data.stats);
  } catch (e) {
    console.error('Error loading dashboard:', e);
    alert('Error al cargar estadísticas: ' + e.message);
  }
}

function renderCharts(stats) {
  // Actualizar resumen de totales
  const totalDiv = qs('#totalStats');
  totalDiv.innerHTML = `
    <div style="display: flex; justify-content: space-around; font-size: 16px;">
      <div style="color: #28a745;"><strong>Resueltos:</strong> ${stats.total.Resuelto}</div>
      <div style="color: #dc3545;"><strong>Pendientes:</strong> ${stats.total.Pendiente}</div>
      <div><strong>Total:</strong> ${stats.total.Resuelto + stats.total.Pendiente}</div>
    </div>
  `;

  // Gráfica de totales (pie chart)
  const ctxTotal = qs('#chartTotal').getContext('2d');
  if (chartTotal) chartTotal.destroy();
  chartTotal = new Chart(ctxTotal, {
    type: 'pie',
    data: {
      labels: ['Resuelto', 'Pendiente'],
      datasets: [{
        data: [stats.total.Resuelto, stats.total.Pendiente],
        backgroundColor: ['#28a745', '#dc3545'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });

  // Gráfica por municipio (bar chart)
  const municipios = Object.keys(stats.by_municipio);
  const resueltos = municipios.map(m => stats.by_municipio[m].Resuelto || 0);
  const pendientes = municipios.map(m => stats.by_municipio[m].Pendiente || 0);

  const ctxMunicipio = qs('#chartMunicipio').getContext('2d');
  if (chartMunicipio) chartMunicipio.destroy();
  chartMunicipio = new Chart(ctxMunicipio, {
    type: 'bar',
    data: {
      labels: municipios,
      datasets: [
        {
          label: 'Resuelto',
          data: resueltos,
          backgroundColor: '#28a745'
        },
        {
          label: 'Pendiente',
          data: pendientes,
          backgroundColor: '#dc3545'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      },
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });

  // Actualizar selector de municipios
  const select = qs('#dashboardMunicipioFilter');
  const currentValue = select.value;
  select.innerHTML = '<option value="todos">Todos los Municipios</option>';
  stats.municipios.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    select.appendChild(opt);
  });
  select.value = currentValue;
}

// Búsqueda de turnos
async function buscarTurnosAdmin() {
  const curp = qs('#adminCurp').value.trim();
  const nombre = qs('#adminNombre').value.trim();
  try {
    const res = await fetch('/api/admin/search-turnos', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ curp, nombre })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Error');
    renderTablaAdmin(data.turnos || []);
  } catch (e) {
    alert('Error al buscar: ' + e.message);
    console.error(e);
  }
}

function renderTablaAdmin(turnos) {
  const tbody = qs('#adminTable tbody');
  tbody.innerHTML = '';
  turnos.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.id}</td>
      <td>${t.numero_turno}</td>
      <td>${t.curp || ''}</td>
      <td>${t.nombre_completo || ''}</td>
      <td>${t.telefono || ''}</td>
      <td>${t.correo || ''}</td>
      <td>${t.municipio || ''}</td>
      <td>${t.nivel || ''}</td>
      <td>${t.asunto || ''}</td>
      <td>${t.estatus || ''}</td>
      <td>
        <button class="btn-edit" data-turno='${JSON.stringify(t)}'>Editar</button>
        <button class="btn-delete" data-id="${t.id}">Eliminar</button>
        <button class="btn-status" data-id="${t.id}" data-status="Resuelto">Marcar Resuelto</button>
        <button class="btn-status" data-id="${t.id}" data-status="Pendiente">Marcar Pendiente</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function eliminarTurno(id) {
  if (!confirm('¿Eliminar este turno?')) return;
  try {
    const res = await fetch(`/api/turno/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Error');
    alert('Turno eliminado');
    buscarTurnosAdmin();
    loadDashboardStats(qs('#dashboardMunicipioFilter').value);
  } catch (e) { alert('Error al eliminar: '+e.message); }
}

async function setStatusTurno(id, status) {
  try {
    const res = await fetch(`/api/turno/${id}/status`, {
      method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ estatus: status })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Error');
    alert('Estatus actualizado');
    buscarTurnosAdmin();
    loadDashboardStats(qs('#dashboardMunicipioFilter').value);
  } catch (e) { alert('Error al actualizar estatus: '+e.message); }
}

function abrirEdicion(turno) {
  const panel = qs('#adminEditar');
  const form = qs('#adminEditForm');
  panel.classList.remove('hidden');
  
  // Llenar campos de texto
  form.id.value = turno.id;
  form.curp.value = turno.curp || '';
  form.numero_turno.value = turno.numero_turno || '';
  form.nombreCompleto.value = turno.nombre_completo || '';
  form.nombre.value = turno.nombre || '';
  form.paterno.value = turno.paterno || '';
  form.materno.value = turno.materno || '';
  form.telefono.value = turno.telefono || '';
  form.celular.value = turno.celular || '';
  form.correo.value = turno.correo || '';
  
  // Crear/actualizar datalists para los catálogos
  const nivelInput = form.nivel;
  const municipioInput = form.municipio;
  const asuntoInput = form.asunto;
  
  // Configurar nivel
  let nivelDatalist = document.getElementById('nivelList');
  if (!nivelDatalist) {
    nivelDatalist = document.createElement('datalist');
    nivelDatalist.id = 'nivelList';
    form.appendChild(nivelDatalist);
  }
  nivelDatalist.innerHTML = '';
  catalogosCache.nivel.forEach(item => {
    const option = document.createElement('option');
    option.value = item.name;
    nivelDatalist.appendChild(option);
  });
  nivelInput.setAttribute('list', 'nivelList');
  nivelInput.value = turno.nivel || '';
  
  // Configurar municipio
  let municipioDatalist = document.getElementById('municipioList');
  if (!municipioDatalist) {
    municipioDatalist = document.createElement('datalist');
    municipioDatalist.id = 'municipioList';
    form.appendChild(municipioDatalist);
  }
  municipioDatalist.innerHTML = '';
  catalogosCache.municipio.forEach(item => {
    const option = document.createElement('option');
    option.value = item.name;
    municipioDatalist.appendChild(option);
  });
  municipioInput.setAttribute('list', 'municipioList');
  municipioInput.value = turno.municipio || '';
  
  // Configurar asunto
  let asuntoDatalist = document.getElementById('asuntoList');
  if (!asuntoDatalist) {
    asuntoDatalist = document.createElement('datalist');
    asuntoDatalist.id = 'asuntoList';
    form.appendChild(asuntoDatalist);
  }
  asuntoDatalist.innerHTML = '';
  catalogosCache.asunto.forEach(item => {
    const option = document.createElement('option');
    option.value = item.name;
    asuntoDatalist.appendChild(option);
  });
  asuntoInput.setAttribute('list', 'asuntoList');
  asuntoInput.value = turno.asunto || '';
  
  // Scroll al formulario
  panel.scrollIntoView({ behavior: 'smooth' });
}

async function enviarEdicion(e) {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  const obj = {};
  fd.forEach((v,k)=>{ if (v!=null) obj[k]=v; });
  
  // Asegurar que se envíen CURP y número de turno
  obj.curp = form.curp.value;
  obj.numero_turno = form.numero_turno.value;
  
  try {
    const res = await fetch('/api/actualizar-turno', { 
      method: 'PUT', 
      headers:{'Content-Type':'application/json'}, 
      body: JSON.stringify(obj) 
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Error');
    alert('Turno actualizado exitosamente');
    qs('#adminEditar').classList.add('hidden');
    buscarTurnosAdmin();
    loadDashboardStats(qs('#dashboardMunicipioFilter').value);
  } catch (e) { alert('Error al guardar: '+e.message); }
}

function initAdmin() {
  // Inicializar dashboard
  loadDashboardStats();
  
  // Cargar catálogos para el formulario de edición
  cargarCatalogosAdmin();
  
  // Event listener para filtro de municipio
  qs('#dashboardMunicipioFilter').addEventListener('change', function() {
    loadDashboardStats(this.value);
  });
  
  // Búsqueda
  qs('#adminBuscarBtn').addEventListener('click', buscarTurnosAdmin);
  
  // Tabla de resultados
  qs('#adminTable').addEventListener('click', function(ev){
    const btn = ev.target;
    if (btn.classList.contains('btn-delete')) eliminarTurno(btn.dataset.id);
    if (btn.classList.contains('btn-status')) setStatusTurno(btn.dataset.id, btn.dataset.status);
    if (btn.classList.contains('btn-edit')) {
      try {
        const turno = JSON.parse(btn.dataset.turno);
        abrirEdicion(turno);
      } catch (e) {
        console.error('Error parsing turno data:', e);
        alert('Error al cargar datos del turno');
      }
    }
  });

  // Formulario de edición
  qs('#adminCancelar').addEventListener('click', ()=> qs('#adminEditar').classList.add('hidden'));
  qs('#adminEditForm').addEventListener('submit', enviarEdicion);
}

document.addEventListener('DOMContentLoaded', initAdmin);
