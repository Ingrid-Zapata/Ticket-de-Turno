from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import os
from datetime import datetime
import io
import qrcode

class PDFGenerator:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=1  # Centered
        )
        self.label_style = ParagraphStyle(
            'LabelStyle',
            parent=self.styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=12,
            spaceAfter=6,
            leftIndent=0,
        )
        self.value_style = ParagraphStyle(
            'ValueStyle',
            parent=self.styles['Normal'],
            fontName='Helvetica',
            fontSize=11,
            leading=14,
            spaceAfter=6,
            leftIndent=0,
        )

    def generate_ticket_pdf(self, turno_data, output_path):
        """Genera un PDF con los datos del turno"""
        doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )

        # Lista de elementos a agregar al PDF
        elements = []

        # Título
        title = Paragraph("Comprobante de Turno", self.title_style)
        elements.append(title)
        elements.append(Spacer(1, 12))

        # Preparar nombres: solicitante y persona a quien va dirigido el trámite
        solicitante = turno_data.get('nombre_completo', '')
        tramite_para = ""
        # intentar construir nombre detallado a partir de partes si están disponibles
        if turno_data.get('nombre') or turno_data.get('paterno') or turno_data.get('materno'):
            partes = [turno_data.get('nombre', ''), turno_data.get('paterno', ''), turno_data.get('materno', '')]
            tramite_para = " ".join([p for p in partes if p]).strip()
        else:
            tramite_para = turno_data.get('tramite_para', '') or solicitante

        fecha_txt = ""
        if turno_data.get('fecha_registro'):
            try:
                fecha_txt = turno_data['fecha_registro'].strftime("%d/%m/%Y %H:%M:%S")
            except Exception:
                fecha_txt = str(turno_data['fecha_registro'])

        # Datos del turno (etiquetas más claras)
        data = [
            ["Número de Turno:", str(turno_data.get('numero_turno', ''))],
            ["Municipio:", turno_data.get('municipio', '')],
            ["Nivel:", turno_data.get('nivel', '')],
            ["Asunto:", turno_data.get('asunto', '')],
            ["CURP:", turno_data.get('curp', '')],
            ["Solicitante (quien realiza el trámite):", solicitante],
            ["Trámite para (persona beneficiaria):", tramite_para],
            ["Fecha:", fecha_txt]
        ]

        # Convertir textos a Paragraphs para que se ajusten y no se empalmen
        data_par = []
        for label, val in data:
            lab = Paragraph(str(label), self.label_style)
            val_text = '' if val is None else str(val)
            valp = Paragraph(val_text, self.value_style)
            data_par.append([lab, valp])

        # Crear tabla con los datos (dos columnas, la segunda permite wrapping)
        table = Table(data_par, colWidths=[2*inch, 4.5*inch], hAlign='LEFT')
        table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
        ]))

        elements.append(table)
        elements.append(Spacer(1, 30))

        # Añadir código QR con la misma información que muestra la UI: CURP, Turno y Nombre
        curp = turno_data.get('curp', '')
        numero_turno = turno_data.get('numero_turno', '')
        nombre_completo = turno_data.get('nombre_completo', '')
        if curp or numero_turno or nombre_completo:
            try:
                qr_text = f"CURP: {curp}\nTurno: {numero_turno}\nNombre: {nombre_completo}"
                qr_img = qrcode.make(qr_text)
                buf = io.BytesIO()
                qr_img.save(buf, format='PNG')
                buf.seek(0)
                # Insertar imagen del QR (tamaño aproximado 1.5 inch)
                qr_width = 1.5 * inch
                qr = Image(buf, width=qr_width, height=qr_width)
                qr.hAlign = 'CENTER'
                elements.append(Paragraph('Código QR (identifica CURP del solicitante):', self.styles['Normal']))
                elements.append(Spacer(1, 6))
                elements.append(qr)
                elements.append(Spacer(1, 12))
            except Exception:
                # si falla la generación del QR, no interrumpir la creación del PDF
                pass

        # Nota al pie
        footer_text = """Este documento es un comprobante de su turno. 
        Por favor, consérvelo para futuras referencias."""
        footer = Paragraph(footer_text, self.styles["Normal"])
        elements.append(footer)

        # Generar el PDF
        doc.build(elements)
        return output_path