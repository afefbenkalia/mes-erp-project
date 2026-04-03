import os
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet


def generate_pdf(lot, kpi):
    os.makedirs("reports", exist_ok=True)

    file_path = f"reports/{lot.numero_lot}.pdf"
    styles = getSampleStyleSheet()

    doc = SimpleDocTemplate(file_path)
    elements = []

    elements.append(Paragraph("RAPPORT DE TRAÇABILITÉ", styles['Title']))
    elements.append(Spacer(1, 10))

    elements.append(Paragraph(f"Lot: {lot.numero_lot}", styles['Normal']))
    elements.append(Paragraph(f"Produit: {lot.produit}", styles['Normal']))
    elements.append(Spacer(1, 10))

    elements.append(Paragraph("KPI", styles['Heading2']))
    elements.append(Paragraph(f"Rendement: {kpi['rendement']}%", styles['Normal']))
    elements.append(Paragraph(f"Durée: {kpi['duration']} min", styles['Normal']))

    elements.append(Spacer(1, 10))
    elements.append(Paragraph("Étapes", styles['Heading2']))

    # 🔥 IMPORTANT SAFE CHECK
    if lot.steps:
        for s in lot.steps:
            elements.append(
                Paragraph(
                    f"{s.operation} - {s.machine or 'N/A'} - {s.status}",
                    styles['Normal']
                )
            )
    else:
        elements.append(Paragraph("Aucune étape trouvée", styles['Normal']))

    doc.build(elements)

    return file_path