// catalogs.js - CRUD UI para catálogos: nivel, municipio, asunto

let currentEdit = { cat: null, id: null };
let allCatalogsData = { nivel: [], municipio: [], asunto: [] };

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
  
  if (items.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="3" class="no-results">No hay resultados</td>';
    tbody.appendChild(tr);
  } else {
    items.forEach(it => {
      const tr = document.createElement('tr');
      tr.dataset.name = it.name.toLowerCase();
      tr.innerHTML = `<td>${it.id}</td><td>${it.name}</td><td>
        <button class="cat-edit" data-cat="${cat}" data-id="${it.id}" data-name="${it.name}">✏️ Editar</button>
        <button class="cat-del" data-cat="${cat}" data-id="${it.id}">🗑️ Eliminar</button>
      </td>`;
      tbody.appendChild(tr);
    });
  }
  table.appendChild(tbody);
}

function filterTable(tableId, searchTerm) {
  const table = document.getElementById(tableId);
  const tbody = table.querySelector('tbody');
  const rows = tbody.querySelectorAll('tr');
  const term = searchTerm.toLowerCase().trim();
  
  let visibleCount = 0;
  rows.forEach(row => {
    if (row.querySelector('.no-results')) {
      row.classList.add('hidden');
      return;
    }
    
    const name = row.dataset.name || '';
    if (name.includes(term)) {
      row.classList.remove('hidden');
      visibleCount++;
    } else {
      row.classList.add('hidden');
    }
  });
  
  // Mostrar mensaje si no hay resultados
  if (visibleCount === 0 && term !== '') {
    const noResultsRow = tbody.querySelector('tr.no-results-filter');
    if (!noResultsRow) {
      const tr = document.createElement('tr');
      tr.className = 'no-results-filter';
      tr.innerHTML = '<td colspan="3" class="no-results">No se encontraron resultados</td>';
      tbody.appendChild(tr);
    }
  } else {
    const noResultsRow = tbody.querySelector('tr.no-results-filter');
    if (noResultsRow) noResultsRow.remove();
  }
}

async function loadAllCatalogs() {
  for (const cat of ['nivel','municipio','asunto']) {
    try {
      const data = await fetchCatalog(cat);
      if (data.success) {
        allCatalogsData[cat] = data.items || [];
        renderTable(cat, allCatalogsData[cat]);
      }
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

function openEditModal(cat, id, currentName) {
  currentEdit = { cat, id };
  document.getElementById('editName').value = currentName;
  document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
  currentEdit = { cat: null, id: null };
}

async function saveEdit() {
  const newName = document.getElementById('editName').value.trim();
  if (!newName) {
    alert('El nombre no puede estar vacío');
    return;
  }
  
  const r = await updateCatalog(currentEdit.cat, currentEdit.id, newName);
  if (!r.success) {
    alert(r.error || 'Error al actualizar');
    return;
  }
  
  closeEditModal();
  loadAllCatalogs();
}

function initCatalogs() {
  // add handlers
  document.getElementById('nivelAdd').addEventListener('click', async ()=>{
    const name = document.getElementById('nivelName').value.trim(); 
    if (!name) return alert('Nombre requerido');
    const r = await addCatalog('nivel', name); 
    if (!r.success) return alert(r.error || 'Error'); 
    document.getElementById('nivelName').value=''; 
    loadAllCatalogs();
  });
  
  document.getElementById('municipioAdd').addEventListener('click', async ()=>{
    const name = document.getElementById('municipioName').value.trim(); 
    if (!name) return alert('Nombre requerido');
    const r = await addCatalog('municipio', name); 
    if (!r.success) return alert(r.error || 'Error'); 
    document.getElementById('municipioName').value=''; 
    loadAllCatalogs();
  });
  
  document.getElementById('asuntoAdd').addEventListener('click', async ()=>{
    const name = document.getElementById('asuntoName').value.trim(); 
    if (!name) return alert('Nombre requerido');
    const r = await addCatalog('asunto', name); 
    if (!r.success) return alert(r.error || 'Error'); 
    document.getElementById('asuntoName').value=''; 
    loadAllCatalogs();
  });

  // Búsqueda individual por catálogo
  document.querySelectorAll('.catalog-search').forEach(input => {
    input.addEventListener('input', function() {
      const targetTable = this.dataset.target;
      filterTable(targetTable, this.value);
    });
  });

  // Búsqueda global
  document.getElementById('globalSearch').addEventListener('input', function() {
    const term = this.value;
    // Aplicar filtro a todas las tablas
    filterTable('nivelTable', term);
    filterTable('municipioTable', term);
    filterTable('asuntoTable', term);
    
    // Actualizar campos de búsqueda individuales
    document.querySelectorAll('.catalog-search').forEach(input => {
      input.value = term;
    });
  });

  // Modal controls
  document.getElementById('saveEdit').addEventListener('click', saveEdit);
  document.getElementById('cancelEdit').addEventListener('click', closeEditModal);
  document.querySelector('.close').addEventListener('click', closeEditModal);
  
  // Close modal when clicking outside
  window.addEventListener('click', (event) => {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
      closeEditModal();
    }
  });

  // delegate edit/delete
  document.body.addEventListener('click', async (ev)=>{
    const tgt = ev.target;
    
    if (tgt.classList.contains('cat-del')){
      const cat = tgt.dataset.cat; 
      const id = tgt.dataset.id; 
      if (!confirm('¿Está seguro de eliminar este elemento?')) return; 
      const r = await deleteCatalog(cat,id); 
      if (!r.success) return alert(r.error||'Error'); 
      loadAllCatalogs();
    }
    
    if (tgt.classList.contains('cat-edit')){
      const cat = tgt.dataset.cat; 
      const id = tgt.dataset.id; 
      const name = tgt.dataset.name;
      openEditModal(cat, id, name);
    }
  });

  loadAllCatalogs();
}

document.addEventListener('DOMContentLoaded', initCatalogs);
