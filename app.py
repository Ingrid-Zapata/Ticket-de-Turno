import requests
from flask import Flask, render_template, request, redirect, session, flash, url_for, jsonify, send_file
import functools
import hashlib
from model.BD import DB  # Importamos tu clase DB
from model.db_orm import get_session, engine
from sqlalchemy import func
from model.models import Persona, Turno, Nivel, Municipio, Asunto, User, Base
from services.pdf_service import PDFGenerator
import os
from contextlib import contextmanager
from flask import abort

# Inicializar generador de PDF
pdf_generator = PDFGenerator()

@contextmanager
def orm_session():
    """Context manager sencillo para sesiones ORM (usa get_session generator)
    Uso: with orm_session() as session: ..."""
    gen = get_session()
    session = next(gen)
    try:
        yield session
        try:
            next(gen)
        except StopIteration:
            pass
    finally:
        pass

# Asegurar que los modelos estén mapeados (no crea tablas si ya existen con la misma estructura)
try:
    Base.metadata.create_all(bind=engine)
except Exception:
    # si no puede crear (por ejemplo falta driver) lo ignoramos; la BD ya puede existir
    pass

app = Flask(__name__)
app.secret_key = "clave_secreta_para_sesiones"  # Es necesario para sesiones

SECRET_KEY_RECAPTCHA = "6Ldm5wIsAAAAAO9Vx_wxdEvZymkTPJ3OYX-hiQW9"  # Tu secret key

@app.route('/')
def home():
    """Ruta principal que redirige a inicio"""
    return redirect(url_for('inicio'))

@app.route('/inicio')
def inicio():
    return render_template('inicio.html')


def require_admin(f):
    """Decorator sencillo para rutas API que requieren rol 'admin'.
    Devuelve JSON con 401/403 según corresponda."""
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        if 'usuario' not in session:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        if session.get('role') != 'admin':
            return jsonify({'success': False, 'error': 'Forbidden'}), 403
        return f(*args, **kwargs)
    return wrapper

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        usuario = request.form['usuario']
        password = request.form['password']

        # VALIDACIÓN IGUAL QUE YA TENÍAS
        recaptcha_response = request.form.get('g-recaptcha-response')
        r = requests.post(
            'https://www.google.com/recaptcha/api/siteverify',
            data={'secret': SECRET_KEY_RECAPTCHA, 'response': recaptcha_response}
        )
        resultado = r.json()

        if not resultado.get('success'):
            flash("⚠️ Debes confirmar que NO eres un robot")
            return redirect(url_for('login'))

        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        # Usar ORM para verificar credenciales
        with orm_session() as db:
            user = db.query(User).filter(
                User.username == usuario,
                User.password_hash == password_hash
            ).first()
            
            if user:
                session['usuario'] = usuario
                session['role'] = user.role
                session['user_id'] = user.id
                
                # Actualizar last_login
                user.last_login = func.now()
                db.commit()
                
                return redirect(url_for('inicio'))

        flash("❌ Usuario o contraseña incorrectos")
        return redirect(url_for('login'))

    return render_template('login.html')  # ✅ Aquí sí se muestra el login


@app.route('/index')
def index():
    return render_template('index.html')


@app.route('/admin/turnos')
def admin_turnos():
    if 'usuario' not in session:
        return redirect(url_for('login'))
    if session.get('role') != 'admin':
        abort(403)
    return render_template('admin_turnos.html')


@app.route('/admin/catalogs')
def admin_catalogs():
    if 'usuario' not in session:
        return redirect(url_for('login'))
    if session.get('role') != 'admin':
        abort(403)
    return render_template('admin_catalogs.html')


@app.route('/admin/users')
def admin_users():
    if 'usuario' not in session:
        return redirect(url_for('login'))
    if session.get('role') != 'admin':
        abort(403)
    return render_template('admin_users.html')


@app.route('/registro')
def registro():
    return render_template('registro.html')


@app.route('/api/buscar-turno', methods=['POST'])
def buscar_turno():
    """Busca un turno por número de turno y CURP"""
    try:
        data = request.get_json()
        numero_turno = data.get('numero_turno')
        curp = data.get('curp', '').upper()

        if not numero_turno or not curp:
            return jsonify({'success': False, 'error': 'Se requiere número de turno y CURP'}), 400

        with orm_session() as db:
            # Buscar persona por CURP
            persona = db.query(Persona).filter(Persona.curp == curp).first()
            if not persona:
                return jsonify({'success': False, 'error': 'CURP no encontrada'}), 404

            # Buscar turno asociado a la persona
            turno = db.query(Turno).filter(
                Turno.id_persona == persona.id_persona,
                Turno.numero_turno == numero_turno
            ).first()

            if not turno:
                return jsonify({'success': False, 'error': 'Turno no encontrado'}), 404

            # Obtener datos relacionados
            nivel = db.query(Nivel).filter(Nivel.id_nivel == turno.id_nivel).first()
            municipio = db.query(Municipio).filter(Municipio.id_municipio == turno.id_municipio).first()
            asunto = db.query(Asunto).filter(Asunto.id_asunto == turno.id_asunto).first()

            # Preparar respuesta
            turno_data = {
                'id': turno.id,
                'numero_turno': turno.numero_turno,
                'nombre_completo': persona.nombre_completo,
                'curp': persona.curp,
                'nombre': persona.nombre,
                'paterno': persona.paterno,
                'materno': persona.materno,
                'telefono': persona.telefono,
                'celular': persona.celular,
                'correo': persona.correo,
                'nivel': nivel.nombre_nivel,
                'municipio': municipio.nombre_municipio,
                'asunto': asunto.nombre_asunto,
                'fecha_registro': turno.fecha_registro.isoformat() if turno.fecha_registro else None
            }

            return jsonify({'success': True, 'turno': turno_data})

    except Exception as e:
        print('Error en buscar_turno:', e)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/actualizar-turno', methods=['PUT'])
def actualizar_turno():
    """Actualiza un turno existente y genera nuevo PDF"""
    try:
        data = request.get_json()
        numero_turno = data.get('numero_turno')
        curp = data.get('curp', '').upper()

        if not numero_turno or not curp:
            return jsonify({'success': False, 'error': 'Se requiere número de turno y CURP'}), 400

        with orm_session() as db:
            # Buscar persona por CURP
            persona = db.query(Persona).filter(Persona.curp == curp).first()
            if not persona:
                return jsonify({'success': False, 'error': 'CURP no encontrada'}), 404

            # Actualizar datos de la persona
            persona.nombre_completo = data.get('nombreCompleto', persona.nombre_completo)
            persona.nombre = data.get('nombre', persona.nombre)
            persona.paterno = data.get('paterno', persona.paterno)
            persona.materno = data.get('materno', persona.materno)
            persona.telefono = data.get('telefono', persona.telefono)
            persona.celular = data.get('celular', persona.celular)
            persona.correo = data.get('correo', persona.correo)

            # Buscar turno
            turno = db.query(Turno).filter(
                Turno.id_persona == persona.id_persona,
                Turno.numero_turno == numero_turno
            ).first()

            if not turno:
                return jsonify({'success': False, 'error': 'Turno no encontrado'}), 404

            # Actualizar referencias del turno
            if 'nivel' in data:
                nivel = db.query(Nivel).filter(Nivel.nombre_nivel.ilike(data['nivel'])).first()
                if nivel:
                    turno.id_nivel = nivel.id_nivel

            if 'municipio' in data:
                municipio = db.query(Municipio).filter(Municipio.nombre_municipio.ilike(data['municipio'])).first()
                if municipio:
                    turno.id_municipio = municipio.id_municipio

            if 'asunto' in data:
                asunto = db.query(Asunto).filter(Asunto.nombre_asunto.ilike(data['asunto'])).first()
                if asunto:
                    turno.id_asunto = asunto.id_asunto

            # Obtener datos actualizados para el PDF
            nivel = db.query(Nivel).filter(Nivel.id_nivel == turno.id_nivel).first()
            municipio = db.query(Municipio).filter(Municipio.id_municipio == turno.id_municipio).first()
            asunto = db.query(Asunto).filter(Asunto.id_asunto == turno.id_asunto).first()

            # Generar nuevo PDF
            pdf_dir = os.path.join(app.static_folder, 'pdfs')
            os.makedirs(pdf_dir, exist_ok=True)
            pdf_filename = f'turno_{turno.id}_actualizado.pdf'
            pdf_path = os.path.join(pdf_dir, pdf_filename)
            
            pdf_generator.generate_ticket_pdf({
                'numero_turno': turno.numero_turno,
                'municipio': municipio.nombre_municipio,
                'curp': persona.curp,
                'nombre_completo': persona.nombre_completo,
                'nombre': persona.nombre,
                'paterno': persona.paterno,
                'materno': persona.materno,
                'nivel': nivel.nombre_nivel,
                'asunto': asunto.nombre_asunto,
                'fecha_registro': turno.fecha_registro
            }, pdf_path)

            # Preparar respuesta
            turno_data = {
                'id': turno.id,
                'numero_turno': turno.numero_turno,
                'nombre_completo': persona.nombre_completo,
                'curp': persona.curp,
                'telefono': persona.telefono,
                'correo': persona.correo,
                'nivel': nivel.nombre_nivel,
                'municipio': municipio.nombre_municipio,
                'asunto': asunto.nombre_asunto,
                'fecha_registro': turno.fecha_registro,
                'pdf_url': f'/static/pdfs/{pdf_filename}'
            }

            return jsonify({'success': True, 'turno': turno_data})

    except Exception as e:
        print('Error en actualizar_turno:', e)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/search-turnos', methods=['POST'])
@require_admin
def admin_search_turnos():
    """Buscar turnos por CURP o por nombre (administradores). Devuelve lista de turnos."""
    try:
        data = request.get_json() or {}
        curp = data.get('curp', '').strip().upper()
        nombre = data.get('nombre', '').strip()

        with orm_session() as db:
            query = db.query(Turno).join(Persona)
            if curp:
                query = query.filter(Persona.curp == curp)
            elif nombre:
                # buscar por nombre completo o por partes (ilike)
                like = f"%{nombre}%"
                query = query.filter(Persona.nombre_completo.ilike(like))

            resultados = []
            for turno in query.order_by(Turno.fecha_registro.desc()).all():
                persona = db.query(Persona).filter(Persona.id_persona == turno.id_persona).first()
                nivel = db.query(Nivel).filter(Nivel.id_nivel == turno.id_nivel).first()
                municipio = db.query(Municipio).filter(Municipio.id_municipio == turno.id_municipio).first()
                asunto = db.query(Asunto).filter(Asunto.id_asunto == turno.id_asunto).first()

                resultados.append({
                    'id': turno.id,
                    'numero_turno': turno.numero_turno,
                    'curp': persona.curp if persona else None,
                    'nombre_completo': persona.nombre_completo if persona else None,
                    'nombre': persona.nombre if persona else None,
                    'paterno': persona.paterno if persona else None,
                    'materno': persona.materno if persona else None,
                    'telefono': persona.telefono if persona else None,
                    'celular': persona.celular if persona else None,
                    'correo': persona.correo if persona else None,
                    'nivel': nivel.nombre_nivel if nivel else None,
                    'municipio': municipio.nombre_municipio if municipio else None,
                    'asunto': asunto.nombre_asunto if asunto else None,
                    'estatus': turno.estatus,
                    'fecha_registro': turno.fecha_registro.isoformat() if turno.fecha_registro else None
                })

            return jsonify({'success': True, 'turnos': resultados})

    except Exception as e:
        print('Error en admin_search_turnos:', e)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/turno/<int:turno_id>', methods=['DELETE'])
@require_admin
def delete_turno(turno_id):
    try:
        with orm_session() as db:
            turno = db.query(Turno).filter(Turno.id == turno_id).first()
            if not turno:
                return jsonify({'success': False, 'error': 'Turno no encontrado'}), 404
            db.delete(turno)
            return jsonify({'success': True})
    except Exception as e:
        print('Error al eliminar turno:', e)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/turno/<int:turno_id>/status', methods=['PUT'])
@require_admin
def set_turno_status(turno_id):
    try:
        data = request.get_json() or {}
        estatus = data.get('estatus')
        if estatus not in ('Pendiente', 'Resuelto'):
            return jsonify({'success': False, 'error': 'Estatus inválido'}), 400

        with orm_session() as db:
            turno = db.query(Turno).filter(Turno.id == turno_id).first()
            if not turno:
                return jsonify({'success': False, 'error': 'Turno no encontrado'}), 404
            turno.estatus = estatus
            return jsonify({'success': True, 'turno': {'id': turno.id, 'estatus': turno.estatus}})
    except Exception as e:
        print('Error al setear estatus:', e)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/dashboard-stats', methods=['GET'])
@require_admin
def dashboard_stats():
    """Obtiene estadísticas de turnos por estatus y municipio para el dashboard"""
    try:
        municipio_filter = request.args.get('municipio', None)
        
        with orm_session() as db:
            # Query base
            query = db.query(
                Municipio.nombre_municipio,
                Turno.estatus,
                func.count(Turno.id).label('count')
            ).join(Municipio, Turno.id_municipio == Municipio.id_municipio)
            
            # Aplicar filtro de municipio si existe
            if municipio_filter and municipio_filter != 'todos':
                query = query.filter(Municipio.nombre_municipio == municipio_filter)
            
            # Agrupar por municipio y estatus
            results = query.group_by(Municipio.nombre_municipio, Turno.estatus).all()
            
            # Obtener lista de todos los municipios para el filtro
            municipios = db.query(Municipio.nombre_municipio).distinct().all()
            municipios_list = [m.nombre_municipio for m in municipios]
            
            # Organizar datos para las gráficas
            stats_by_municipio = {}
            total_pendiente = 0
            total_resuelto = 0
            
            for municipio, estatus, count in results:
                if municipio not in stats_by_municipio:
                    stats_by_municipio[municipio] = {'Pendiente': 0, 'Resuelto': 0}
                stats_by_municipio[municipio][estatus] = count
                
                if estatus == 'Pendiente':
                    total_pendiente += count
                elif estatus == 'Resuelto':
                    total_resuelto += count
            
            return jsonify({
                'success': True,
                'stats': {
                    'by_municipio': stats_by_municipio,
                    'total': {
                        'Pendiente': total_pendiente,
                        'Resuelto': total_resuelto
                    },
                    'municipios': municipios_list
                }
            })
    except Exception as e:
        print('Error en dashboard_stats:', e)
        return jsonify({'success': False, 'error': str(e)}), 500


_CATALOG_MAP = {
    'nivel': {
        'model': Nivel,
        'pk': 'id_nivel',
        'name_field': 'nombre_nivel'
    },
    'municipio': {
        'model': Municipio,
        'pk': 'id_municipio',
        'name_field': 'nombre_municipio'
    },
    'asunto': {
        'model': Asunto,
        'pk': 'id_asunto',
        'name_field': 'nombre_asunto'
    }
}


@app.route('/api/public/catalogs/<string:cat>', methods=['GET'])
def public_catalogs(cat):
    """Endpoint público para obtener catálogos (nivel, municipio, asunto) - sin autenticación"""
    cat = cat.lower()
    if cat not in _CATALOG_MAP:
        return jsonify({'success': False, 'error': 'Catálogo inválido'}), 400

    cfg = _CATALOG_MAP[cat]
    Model = cfg['model']
    name_field = cfg['name_field']

    try:
        with orm_session() as db:
            items = db.query(Model).order_by(getattr(Model, name_field)).all()
            out = [{'id': getattr(i, cfg['pk']), 'name': getattr(i, name_field)} for i in items]
            return jsonify({'success': True, 'items': out})
    except Exception as e:
        print('Error en public_catalogs:', e)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/catalogs/<string:cat>', methods=['GET', 'POST'])
@require_admin
def catalogs_collection(cat):
    """Listar o crear elementos de catálogo: nivel, municipio, asunto"""
    cat = cat.lower()
    if cat not in _CATALOG_MAP:
        return jsonify({'success': False, 'error': 'Catálogo inválido'}), 400

    cfg = _CATALOG_MAP[cat]
    Model = cfg['model']
    name_field = cfg['name_field']

    try:
        with orm_session() as db:
            if request.method == 'GET':
                items = db.query(Model).order_by(getattr(Model, name_field)).all()
                out = [{'id': getattr(i, cfg['pk']), 'name': getattr(i, name_field)} for i in items]
                return jsonify({'success': True, 'items': out})

            # POST -> crear
            data = request.get_json() or {}
            name = data.get('name')
            if not name:
                return jsonify({'success': False, 'error': 'Falta nombre'}), 400
            # verificar existencia
            exists = db.query(Model).filter(getattr(Model, name_field).ilike(name)).first()
            if exists:
                return jsonify({'success': False, 'error': 'Ya existe'}), 400
            obj = Model(**{name_field: name})
            db.add(obj)
            db.flush()
            return jsonify({'success': True, 'item': {'id': getattr(obj, cfg['pk']), 'name': getattr(obj, name_field)}})

    except Exception as e:
        print('Error en catalogs_collection:', e)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/catalogs/<string:cat>/<int:obj_id>', methods=['PUT', 'DELETE'])
@require_admin
def catalogs_item(cat, obj_id):
    cat = cat.lower()
    if cat not in _CATALOG_MAP:
        return jsonify({'success': False, 'error': 'Catálogo inválido'}), 400

    cfg = _CATALOG_MAP[cat]
    Model = cfg['model']
    name_field = cfg['name_field']
    pk = cfg['pk']

    try:
        with orm_session() as db:
            obj = db.query(Model).filter(getattr(Model, pk) == obj_id).first()
            if not obj:
                return jsonify({'success': False, 'error': 'No encontrado'}), 404

            if request.method == 'DELETE':
                db.delete(obj)
                return jsonify({'success': True})

            # PUT -> update
            data = request.get_json() or {}
            name = data.get('name')
            if not name:
                return jsonify({'success': False, 'error': 'Falta nombre'}), 400
            setattr(obj, name_field, name)
            return jsonify({'success': True, 'item': {'id': getattr(obj, pk), 'name': getattr(obj, name_field)}})

    except Exception as e:
        print('Error en catalogs_item:', e)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/turno', methods=['POST'])
def api_create_turno():
    """Crea un turno usando ORM y genera PDF; devuelve JSON con datos y url del pdf."""
    try:
        data = request.get_json() or {}
        # validaciones básicas
        required = ['nombreCompleto', 'curp', 'nombre', 'paterno', 'materno', 'telefono', 'celular', 'correo', 'nivel', 'municipio', 'asunto']
        for f in required:
            if not data.get(f):
                return jsonify({'success': False, 'error': f'Falta campo {f}'}), 400

        with orm_session() as db:
            # buscar o crear persona
            persona = db.query(Persona).filter(Persona.curp == data['curp'].upper()).first()
            if not persona:
                persona = Persona(
                    nombre_completo=data['nombreCompleto'],
                    curp=data['curp'].upper(),
                    nombre=data['nombre'],
                    paterno=data['paterno'],
                    materno=data['materno'],
                    telefono=data['telefono'],
                    celular=data['celular'],
                    correo=data['correo']
                )
                db.add(persona)
                db.flush()  # para tener id_persona

            # obtener ids de catálogos
            nivel = db.query(Nivel).filter(Nivel.nombre_nivel.ilike(data['nivel'])).first()
            municipio = db.query(Municipio).filter(Municipio.nombre_municipio.ilike(data['municipio'])).first()
            asunto = db.query(Asunto).filter(Asunto.nombre_asunto.ilike(data['asunto'])).first()

            if not nivel or not municipio or not asunto:
                return jsonify({'success': False, 'error': 'Nivel/Municipio/Asunto no válidos'}), 400

            # Calcular numero_turno: obtén max por municipio
            max_num = db.query(func.coalesce(func.max(Turno.numero_turno), 0)).filter(Turno.id_municipio == municipio.id_municipio).scalar()
            numero_turno = int(max_num) + 1

            # crear turno
            turno = Turno(
                numero_turno=numero_turno,
                id_persona=persona.id_persona,
                id_nivel=nivel.id_nivel,
                id_municipio=municipio.id_municipio,
                id_asunto=asunto.id_asunto,
                user_id=1  # temporal: administra
            )
            db.add(turno)
            db.flush()

            # preparar datos de salida
            turno_data = {
                'id': turno.id,
                'numero_turno': turno.numero_turno,
                'nombre_completo': persona.nombre_completo,
                'curp': persona.curp,
                'telefono': persona.telefono,
                'correo': persona.correo,
                'nombre_nivel': nivel.nombre_nivel,
                'nombre_municipio': municipio.nombre_municipio,
                'nombre_asunto': asunto.nombre_asunto,
                'fecha_registro': turno.fecha_registro
            }

            # Generar PDF
            pdf_dir = os.path.join(app.static_folder, 'pdfs')
            os.makedirs(pdf_dir, exist_ok=True)
            pdf_filename = f'turno_{turno.id}.pdf'
            pdf_path = os.path.join(pdf_dir, pdf_filename)
            pdf_generator.generate_ticket_pdf({
                'numero_turno': turno.numero_turno,
                'municipio': municipio.nombre_municipio,
                'curp': persona.curp,
                'nombre_completo': persona.nombre_completo,
                'nombre': persona.nombre,
                'paterno': persona.paterno,
                'materno': persona.materno,
                'nivel': nivel.nombre_nivel,
                'asunto': asunto.nombre_asunto,
                'fecha_registro': turno.fecha_registro
            }, pdf_path)

            return jsonify({'success': True, 'turno': turno_data, 'pdf_url': f'/static/pdfs/{pdf_filename}'})

    except Exception as e:
        print('Error en api_create_turno:', e)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('inicio'))


# ===== API de Gestión de Usuarios =====

@app.route('/api/registro', methods=['POST'])
def api_registro():
    """Registro público de usuarios (solo rol 'user')"""
    try:
        data = request.get_json() or {}
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()

        if not username or not password or not email:
            return jsonify({'success': False, 'error': 'Usuario, email y contraseña son requeridos'}), 400

        if len(username) < 4:
            return jsonify({'success': False, 'error': 'El usuario debe tener al menos 4 caracteres'}), 400

        if len(password) < 6:
            return jsonify({'success': False, 'error': 'La contraseña debe tener al menos 6 caracteres'}), 400

        if '@' not in email:
            return jsonify({'success': False, 'error': 'El correo electrónico no es válido'}), 400

        with orm_session() as db:
            # Verificar si el usuario ya existe
            existing_user = db.query(User).filter(User.username == username).first()
            if existing_user:
                return jsonify({'success': False, 'error': 'El usuario ya existe'}), 400

            # Verificar si el email ya existe
            existing_email = db.query(User).filter(User.email == email).first()
            if existing_email:
                return jsonify({'success': False, 'error': 'El correo electrónico ya está registrado'}), 400

            # Crear nuevo usuario (siempre como 'user' en registro público)
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            new_user = User(
                username=username,
                email=email,
                password_hash=password_hash,
                role='user'  # Registro público siempre crea usuarios normales
            )
            db.add(new_user)
            db.flush()

            return jsonify({
                'success': True,
                'user': {
                    'id': new_user.id,
                    'username': new_user.username,
                    'role': new_user.role
                }
            })

    except Exception as e:
        print('Error en api_registro:', e)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/users', methods=['GET', 'POST'])
@require_admin
def admin_users_api():
    """Gestión de usuarios (solo administradores)"""
    try:
        with orm_session() as db:
            if request.method == 'GET':
                # Listar usuarios
                users = db.query(User).all()
                return jsonify({
                    'success': True,
                    'users': [{
                        'id': u.id,
                        'username': u.username,
                        'email': u.email,
                        'role': u.role
                    } for u in users]
                })

            # POST - Crear usuario (admin puede crear admin o user)
            data = request.get_json() or {}
            username = data.get('username', '').strip()
            email = data.get('email', '').strip()
            password = data.get('password', '').strip()
            role = data.get('role', 'user').strip()

            if not username or not password or not email:
                return jsonify({'success': False, 'error': 'Usuario, email y contraseña son requeridos'}), 400

            if len(username) < 4:
                return jsonify({'success': False, 'error': 'El usuario debe tener al menos 4 caracteres'}), 400

            if len(password) < 6:
                return jsonify({'success': False, 'error': 'La contraseña debe tener al menos 6 caracteres'}), 400

            if '@' not in email:
                return jsonify({'success': False, 'error': 'El correo electrónico no es válido'}), 400

            if role not in ('user', 'admin'):
                return jsonify({'success': False, 'error': 'Rol inválido'}), 400

            # Verificar si el usuario ya existe
            existing_user = db.query(User).filter(User.username == username).first()
            if existing_user:
                return jsonify({'success': False, 'error': 'El usuario ya existe'}), 400

            # Verificar si el email ya existe
            existing_email = db.query(User).filter(User.email == email).first()
            if existing_email:
                return jsonify({'success': False, 'error': 'El correo electrónico ya está registrado'}), 400

            # Crear nuevo usuario
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            new_user = User(
                username=username,
                email=email,
                password_hash=password_hash,
                role=role
            )
            db.add(new_user)
            db.flush()

            return jsonify({
                'success': True,
                'user': {
                    'id': new_user.id,
                    'username': new_user.username,
                    'email': new_user.email,
                    'role': new_user.role
                }
            })

    except Exception as e:
        print('Error en admin_users_api:', e)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@require_admin
def delete_user(user_id):
    """Eliminar usuario"""
    try:
        with orm_session() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return jsonify({'success': False, 'error': 'Usuario no encontrado'}), 404

            # No permitir eliminar el usuario actual
            if user.username == session.get('usuario'):
                return jsonify({'success': False, 'error': 'No puedes eliminar tu propio usuario'}), 400

            db.delete(user)
            return jsonify({'success': True})

    except Exception as e:
        print('Error al eliminar usuario:', e)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/users/<int:user_id>/role', methods=['PUT'])
@require_admin
def update_user_role(user_id):
    """Cambiar rol de usuario"""
    try:
        data = request.get_json() or {}
        new_role = data.get('role')

        if new_role not in ('user', 'admin'):
            return jsonify({'success': False, 'error': 'Rol inválido'}), 400

        with orm_session() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return jsonify({'success': False, 'error': 'Usuario no encontrado'}), 404

            # No permitir cambiar el rol del usuario actual
            if user.username == session.get('usuario'):
                return jsonify({'success': False, 'error': 'No puedes cambiar tu propio rol'}), 400

            user.role = new_role
            return jsonify({
                'success': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'role': user.role
                }
            })

    except Exception as e:
        print('Error al cambiar rol:', e)
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
