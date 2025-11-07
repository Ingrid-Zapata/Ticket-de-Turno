// admin_users.js - Gestión de usuarios

async function cargarUsuarios() {
  try {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Error al cargar usuarios');
    }

    const tbody = document.querySelector('#tableUsuarios tbody');
    tbody.innerHTML = '';

    data.users.forEach(user => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${user.id}</td>
        <td>${user.username}</td>
        <td>${user.email || 'N/A'}</td>
        <td><span class="badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}">${user.role === 'admin' ? 'Administrador' : 'Usuario'}</span></td>
        <td>
          <button class="btn-toggle-role" data-id="${user.id}" data-role="${user.role}">
            Cambiar a ${user.role === 'admin' ? 'Usuario' : 'Admin'}
          </button>
          <button class="btn-delete" data-id="${user.id}">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (error) {
    alert('Error: ' + error.message);
    console.error(error);
  }
}

async function crearUsuario(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const datos = {
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role')
  };

  // Validaciones
  if (datos.username.length < 4) {
    alert('El nombre de usuario debe tener al menos 4 caracteres');
    return;
  }

  if (!datos.email || !datos.email.includes('@')) {
    alert('Por favor ingresa un correo electrónico válido');
    return;
  }

  if (datos.password.length < 6) {
    alert('La contraseña debe tener al menos 6 caracteres');
    return;
  }

  try {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'Error al crear usuario');
    }

    alert('Usuario creado exitosamente');
    e.target.reset();
    cargarUsuarios();

  } catch (error) {
    alert('Error: ' + error.message);
    console.error(error);
  }
}

async function cambiarRol(userId, currentRole) {
  const newRole = currentRole === 'admin' ? 'user' : 'admin';
  
  if (!confirm(`¿Cambiar rol a ${newRole === 'admin' ? 'Administrador' : 'Usuario'}?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'Error al cambiar rol');
    }

    alert('Rol actualizado correctamente');
    cargarUsuarios();

  } catch (error) {
    alert('Error: ' + error.message);
    console.error(error);
  }
}

async function eliminarUsuario(userId) {
  if (!confirm('¿Está seguro de eliminar este usuario?')) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE'
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'Error al eliminar usuario');
    }

    alert('Usuario eliminado correctamente');
    cargarUsuarios();

  } catch (error) {
    alert('Error: ' + error.message);
    console.error(error);
  }
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
  cargarUsuarios();

  // Formulario crear usuario
  document.getElementById('formCrearUsuario').addEventListener('submit', crearUsuario);

  // Delegación de eventos para botones
  document.querySelector('#tableUsuarios tbody').addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-delete')) {
      const userId = e.target.dataset.id;
      eliminarUsuario(userId);
    } else if (e.target.classList.contains('btn-toggle-role')) {
      const userId = e.target.dataset.id;
      const currentRole = e.target.dataset.role;
      cambiarRol(userId, currentRole);
    }
  });
});
