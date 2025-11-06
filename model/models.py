from sqlalchemy import Column, Integer, String, Enum, TIMESTAMP, ForeignKey, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum('user', 'admin'), nullable=False, default='user')
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    last_login = Column(TIMESTAMP, nullable=True)


class Nivel(Base):
    __tablename__ = 'nivel'
    id_nivel = Column(Integer, primary_key=True, autoincrement=True)
    nombre_nivel = Column(String(50), unique=True, nullable=False)


class Municipio(Base):
    __tablename__ = 'municipio'
    id_municipio = Column(Integer, primary_key=True, autoincrement=True)
    nombre_municipio = Column(String(60), unique=True, nullable=False)


class Asunto(Base):
    __tablename__ = 'asunto'
    id_asunto = Column(Integer, primary_key=True, autoincrement=True)
    nombre_asunto = Column(String(60), unique=True, nullable=False)


class Persona(Base):
    __tablename__ = 'persona'
    id_persona = Column(Integer, primary_key=True, autoincrement=True)
    nombre_completo = Column(String(120), nullable=False)
    curp = Column(String(18), unique=True, nullable=False)
    nombre = Column(String(60))
    paterno = Column(String(60))
    materno = Column(String(60))
    telefono = Column(String(20))
    celular = Column(String(20))
    correo = Column(String(120))
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())


class Turno(Base):
    __tablename__ = 'turnos'
    id = Column(Integer, primary_key=True, autoincrement=True)
    numero_turno = Column(Integer, nullable=False)
    id_persona = Column(Integer, ForeignKey('persona.id_persona'), nullable=False)
    id_nivel = Column(Integer, ForeignKey('nivel.id_nivel'))
    id_municipio = Column(Integer, ForeignKey('municipio.id_municipio'), nullable=False)
    id_asunto = Column(Integer, ForeignKey('asunto.id_asunto'))
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    estatus = Column(Enum('Pendiente', 'Resuelto'), default='Pendiente')
    fecha_registro = Column(TIMESTAMP, server_default=func.current_timestamp())

    persona = relationship('Persona')
    nivel = relationship('Nivel')
    municipio = relationship('Municipio')
    asunto = relationship('Asunto')
    user = relationship('User')
