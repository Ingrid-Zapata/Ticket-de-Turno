// catalogs.js - CRUD UI para catálogos: nivel, municipio, asunto

async function fetchCatalog(cat) {
  const res = await fetch(`/api/catalogs/${cat}`);
  return await res.json();
}

function renderTable(cat, items) {
  const table = document.getElementById(cat + 'Table');
  table.innerHTML = '';
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>ID</th><th>Nombre</th><th>Acciones</th></tr>';
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  items.forEach(it => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${it.id}</td><td>${it.name}</td><td>
      <button class="cat-edit" data-cat="${cat}" data-id="${it.id}" data-name="${it.name}">Editar</button>
      <button class="cat-del" data-cat="${cat}" data-id="${it.id}">Eliminar</button>
    </td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

async function loadAllCatalogs() {
  for (const cat of ['nivel','municipio','asunto']) {
    try {
      const data = await fetchCatalog(cat);
      if (data.success) renderTable(cat, data.items || []);
      else console.warn('Error cargando', cat, data.error);
    } catch (e) { console.error(e); }
  }
}

async function addCatalog(cat, name) {
  const res = await fetch(`/api/catalogs/${cat}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name}) });
  return await res.json();
}

async function updateCatalog(cat, id, name) {
  const res = await fetch(`/api/catalogs/${cat}/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name}) });
  return await res.json();
}

async function deleteCatalog(cat, id) {
  const res = await fetch(`/api/catalogs/${cat}/${id}`, { method:'DELETE' });
  return await res.json();
}

function initCatalogs() {
  // add handlers
  document.getElementById('nivelAdd').addEventListener('click', async ()=>{
    const name = document.getElementById('nivelName').value.trim(); if (!name) return alert('Nombre requerido');
    const r = await addCatalog('nivel', name); if (!r.success) return alert(r.error || 'Error'); document.getElementById('nivelName').value=''; loadAllCatalogs();
  });
  document.getElementById('municipioAdd').addEventListener('click', async ()=>{
    const name = document.getElementById('municipioName').value.trim(); if (!name) return alert('Nombre requerido');
    const r = await addCatalog('municipio', name); if (!r.success) return alert(r.error || 'Error'); document.getElementById('municipioName').value=''; loadAllCatalogs();
  });
  document.getElementById('asuntoAdd').addEventListener('click', async ()=>{
    const name = document.getElementById('asuntoName').value.trim(); if (!name) return alert('Nombre requerido');
    const r = await addCatalog('asunto', name); if (!r.success) return alert(r.error || 'Error'); document.getElementById('asuntoName').value=''; loadAllCatalogs();
  });

  // delegate edit/delete
  document.body.addEventListener('click', async (ev)=>{
    const tgt = ev.target;
    if (tgt.classList.contains('cat-del')){
      const cat = tgt.dataset.cat; const id = tgt.dataset.id; if (!confirm('Eliminar?')) return; const r = await deleteCatalog(cat,id); if (!r.success) return alert(r.error||'Error'); loadAllCatalogs();
    }
    if (tgt.classList.contains('cat-edit')){
      const cat = tgt.dataset.cat; const id = tgt.dataset.id; const name = tgt.dataset.name;
      const newName = prompt('Nuevo nombre:', name); if (!newName) return; const r = await updateCatalog(cat,id,newName); if (!r.success) return alert(r.error||'Error'); loadAllCatalogs();
    }
  });

  loadAllCatalogs();
}

document.addEventListener('DOMContentLoaded', initCatalogs);
