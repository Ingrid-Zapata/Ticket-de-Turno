import sys
import os
from datetime import datetime

# Asegurar que el directorio raíz del proyecto esté en sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from model.db_orm import get_session
from model.models import Turno, Persona, Nivel, Municipio, Asunto
from services.pdf_service import PDFGenerator

pdf_gen = PDFGenerator()

def get_session_from_generator():
    gen = get_session()
    session = next(gen)
    return gen, session

def close_session_generator(gen):
    try:
        next(gen)
    except StopIteration:
        pass

def regen_for_ids(ids):
    gen, session = get_session_from_generator()
    try:
        for id_ in ids:
            turno = session.get(Turno, id_)
            if not turno:
                print(f"Turno id={id_} no encontrado")
                continue

            persona = session.get(Persona, turno.id_persona)
            nivel = session.get(Nivel, turno.id_nivel)
            municipio = session.get(Municipio, turno.id_municipio)
            asunto = session.get(Asunto, turno.id_asunto)

            turno_data = {
                'numero_turno': turno.numero_turno,
                'municipio': municipio.nombre_municipio if municipio else '',
                'nivel': nivel.nombre_nivel if nivel else '',
                'asunto': asunto.nombre_asunto if asunto else '',
                'curp': persona.curp if persona else '',
                'nombre_completo': persona.nombre_completo if persona else '',
                'nombre': persona.nombre if persona else '',
                'paterno': persona.paterno if persona else '',
                'materno': persona.materno if persona else '',
                'fecha_registro': turno.fecha_registro or datetime.now()
            }

            pdf_dir = os.path.join('static','pdfs')
            os.makedirs(pdf_dir, exist_ok=True)
            pdf_filename = f'turno_{turno.id}_regenerated.pdf'
            pdf_path = os.path.join(pdf_dir, pdf_filename)

            pdf_gen.generate_ticket_pdf(turno_data, pdf_path)
            print(f"PDF regenerado para turno id={turno.id} -> {pdf_path}")
    finally:
        close_session_generator(gen)

if __name__ == '__main__':
    ids_to_regen = [1,2]
    regen_for_ids(ids_to_regen)
