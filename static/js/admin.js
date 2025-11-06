// admin.js - manejo de la UI administrativa para turnos

function qs(sel, ctx=document) { return ctx.querySelector(sel); }
function qsa(sel, ctx=document) { return Array.from(ctx.querySelectorAll(sel)); }

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
      <td>${t.municipio || ''}</td>
      <td>${t.nivel || ''}</td>
      <td>${t.asunto || ''}</td>
      <td>${t.estatus || ''}</td>
      <td>
        <button class="btn-edit" data-id="${t.id}">Editar</button>
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
  } catch (e) { alert('Error al actualizar estatus: '+e.message); }
}

function abrirEdicion(turno) {
  const panel = qs('#adminEditar');
  const form = qs('#adminEditForm');
  panel.classList.remove('hidden');
  form.id.value = turno.id;
  form.curp.value = turno.curp || '';
  form.numero_turno.value = turno.numero_turno || '';
  form.nombreCompleto.value = turno.nombre_completo || '';
  form.nombre.value = turno.nombre || '';
  form.paterno.value = turno.paterno || '';
  form.materno.value = turno.materno || '';
  form.telefono.value = turno.telefono || '';
  form.correo.value = turno.correo || '';
  form.nivel.value = turno.nivel || '';
  form.municipio.value = turno.municipio || '';
  form.asunto.value = turno.asunto || '';
}

async function enviarEdicion(e) {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  const obj = {};
  fd.forEach((v,k)=>{ if (v!=null) obj[k]=v; });
  try {
    const res = await fetch('/api/actualizar-turno', { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(obj) });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Error');
    alert('Turno actualizado');
    qs('#adminEditar').classList.add('hidden');
    buscarTurnosAdmin();
  } catch (e) { alert('Error al guardar: '+e.message); }
}

function initAdmin() {
  qs('#adminBuscarBtn').addEventListener('click', buscarTurnosAdmin);
  qs('#adminTable').addEventListener('click', function(ev){
    const btn = ev.target;
    if (btn.classList.contains('btn-delete')) eliminarTurno(btn.dataset.id);
    if (btn.classList.contains('btn-status')) setStatusTurno(btn.dataset.id, btn.dataset.status);
    if (btn.classList.contains('btn-edit')) {
      // obtener datos de la fila para editar
      const tr = btn.closest('tr');
      const turno = {
        id: tr.children[0].textContent,
        numero_turno: tr.children[1].textContent,
        curp: tr.children[2].textContent,
        nombre_completo: tr.children[3].textContent,
        municipio: tr.children[4].textContent,
        nivel: tr.children[5].textContent,
        asunto: tr.children[6].textContent
      };
      abrirEdicion(turno);
    }
  });

  qs('#adminCancelar').addEventListener('click', ()=> qs('#adminEditar').classList.add('hidden'));
  qs('#adminEditForm').addEventListener('submit', enviarEdicion);
}

document.addEventListener('DOMContentLoaded', initAdmin);
