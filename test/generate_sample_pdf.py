import sys
import os
from datetime import datetime

# Asegurar que el directorio raíz del proyecto esté en sys.path para poder importar el paquete services
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from services.pdf_service import PDFGenerator

pdf = PDFGenerator()
output = os.path.join('static','pdfs')
if not os.path.exists(output):
    os.makedirs(output)
path = os.path.join(output, 'test_layout.pdf')

data = {
    'numero_turno': 123,
    'municipio': 'Municipio de Prueba con nombre muy largo que puede necesitar wrap',
    'nivel': 'Bachillerato',
    'asunto': 'Inscripción de alumno en programa con descripción larga para probar ajuste',
    'curp': 'ABCD123456HDFGRT09',
    'nombre_completo': 'María del Rosario Gómez Pérez con título y demás',
    'nombre': 'María del Rosario',
    'paterno': 'Gómez',
    'materno': 'Pérez con apellido compuesto Largo',
    'fecha_registro': datetime.now()
}

pdf.generate_ticket_pdf(data, path)
print('PDF generado en:', path)