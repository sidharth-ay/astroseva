"""Kundli PDF generation service."""

import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.colors import HexColor, black, white
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT


def generate_kundli_pdf(kundli_data: dict) -> bytes:
    """Generate a Kundli PDF report."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1*cm, bottomMargin=1*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=20, textColor=HexColor('#6B21A8'), alignment=TA_CENTER)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Heading2'], fontSize=14, textColor=HexColor('#1E1B4B'), alignment=TA_CENTER)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=12, textColor=HexColor('#6B21A8'))
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, textColor=HexColor('#374151'))
    center_style = ParagraphStyle('Center', parent=styles['Normal'], fontSize=10, textColor=HexColor('#374151'), alignment=TA_CENTER)
    
    elements = []
    
    # Title
    elements.append(Paragraph("ASTROSEVA", title_style))
    elements.append(Paragraph("Vedic Birth Chart (Kundli)", subtitle_style))
    elements.append(Spacer(1, 0.3*inch))
    
    # Birth Details
    elements.append(Paragraph("Birth Details", heading_style))
    elements.append(Spacer(1, 0.1*inch))
    
    birth_data = [
        ["Name:", kundli_data.get("name", "N/A")],
        ["Date of Birth:", kundli_data.get("birth_date", "N/A")],
        ["Time of Birth:", kundli_data.get("birth_time", "N/A")],
        ["Place:", kundli_data.get("birth_place", "N/A")],
        ["Coordinates:", f"{kundli_data.get('latitude', 0):.4f}N, {kundli_data.get('longitude', 0):.4f}E"],
        ["Ayanamsa:", f"Lahiri {kundli_data.get('ayanamsa', 0):.4f}"],
    ]
    
    birth_table = Table(birth_data, colWidths=[2*inch, 4*inch])
    birth_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), HexColor('#6B21A8')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(birth_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Ascendant
    elements.append(Paragraph("Ascendant (Lagna)", heading_style))
    asc_sign = kundli_data.get("asc_sign_name", "N/A")
    asc_degree = kundli_data.get("ascendant", 0)
    elements.append(Paragraph(f"Sign: {asc_sign} ({asc_degree:.2f} degrees)", body_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Planetary Positions
    elements.append(Paragraph("Planetary Positions", heading_style))
    elements.append(Spacer(1, 0.1*inch))
    
    planet_header = ["Planet", "Sign", "Degree", "Retrograde", "Dignity"]
    planet_data = [planet_header]
    
    for planet in kundli_data.get("planets", []):
        planet_data.append([
            planet.get("planet", ""),
            planet.get("sign_name", ""),
            f"{planet.get('sign_degree', 0):.2f}",
            "Yes (R)" if planet.get("retrograde") else "No",
            planet.get("dignity", "Neutral"),
        ])
    
    planet_table = Table(planet_data, colWidths=[1.2*inch, 1.2*inch, 1*inch, 1.2*inch, 1.2*inch])
    planet_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#6B21A8')),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#D1D5DB')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#F3F4F6')]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(planet_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # House Placements
    elements.append(Paragraph("House Placements (Bhava)", heading_style))
    elements.append(Spacer(1, 0.1*inch))
    
    houses = kundli_data.get("houses", {})
    house_data = []
    for house_num in range(1, 13):
        planets_in_house = houses.get(str(house_num), [])
        house_data.append([f"House {house_num}", ", ".join(planets_in_house) if planets_in_house else "Empty"])
    
    house_table = Table(house_data, colWidths=[1.5*inch, 4.5*inch])
    house_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), HexColor('#EDE9FE')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#D1D5DB')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(house_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Retrograde Planets
    retro = kundli_data.get("retrograde_planets", [])
    if retro:
        elements.append(Paragraph("Retrograde Planets", heading_style))
        elements.append(Paragraph(", ".join(retro), body_style))
        elements.append(Spacer(1, 0.2*inch))
    
    # Footer
    elements.append(Spacer(1, 0.5*inch))
    elements.append(Paragraph("Generated by AstroSeva - Vedic Astrology Platform", center_style))
    elements.append(Paragraph(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", center_style))
    
    doc.build(elements)
    return buffer.getvalue()
