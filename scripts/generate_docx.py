import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    tcPr.append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>'))

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for margin_name, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{margin_name}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_document():
    doc = docx.Document()

    # Configuración de márgenes
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Colores institucionales
    COLOR_PRIMARY = RGBColor(14, 116, 144)      # Cyan / Teal oscuro (NEAR brand feel)
    COLOR_SECONDARY = RGBColor(30, 41, 59)     # Slate oscuro
    COLOR_HEADER_BG = "0E7490"                 # Hex Teal
    COLOR_ZEBRA_BG = "F8FAFC"                  # Hex Slate 50
    COLOR_ACCENT = RGBColor(3, 105, 161)

    # Título Principal
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(4)
    run_title = p_title.add_run("KIPULUX: MIGRACIÓN A NEAR PROTOCOL")
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(22)
    run_title.font.bold = True
    run_title.font.color.rgb = COLOR_PRIMARY

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(16)
    run_sub = p_sub.add_run("Especificación de Requerimientos Funcionales y Plan de Implementación de 2 Personas\nNEAR Hackathon 2026 — Tracks: Real-World & NFTs")
    run_sub.font.name = "Calibri"
    run_sub.font.size = Pt(12)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(100, 116, 139)

    # Sección 1: Asignación de Roles
    h1 = doc.add_paragraph()
    h1.paragraph_format.space_before = Pt(12)
    h1.paragraph_format.space_after = Pt(6)
    r_h1 = h1.add_run("1. Estructura de Equipo: Daniel y Fredy")
    r_h1.font.name = "Calibri"
    r_h1.font.size = Pt(14)
    r_h1.font.bold = True
    r_h1.font.color.rgb = COLOR_PRIMARY

    p_team = doc.add_paragraph()
    p_team.paragraph_format.space_after = Pt(12)
    r_team = p_team.add_run(
        "• Daniel — Web3 & Smart Contracts Lead:\n"
        "  Responsable de la lógica descentralizada en NEAR Protocol. Diseña, compila y despliega el contrato inteligente "
        "en Wasm bajo los estándares NEP-171 (NFT) y NEP-177 (Metadata), la máquina de estados del ciclo de vida de la prenda, "
        "la gestión de almacenamiento (Storage Staking) y las suites de pruebas unitarias/CLI en NEAR Testnet.\n\n"
        "• Fredy — Backend API, Integración & Frontend Lead:\n"
        "  Responsable de la integración de sistemas, backend y experiencia visual. Desarrolla el servicio Relayer con near-api-js "
        "para firmas gasless, adapta los controladores de Express, sincroniza las transacciones con el grafo de Neo4j, "
        "actualiza el pasaporte digital interactivo en la web y automatiza el script de demostración E2E."
    )
    r_team.font.name = "Calibri"
    r_team.font.size = Pt(10.5)
    r_team.font.color.rgb = COLOR_SECONDARY

    # Sección 2: Tabla de Requerimientos Funcionales (3 Columnas)
    h2 = doc.add_paragraph()
    h2.paragraph_format.space_before = Pt(14)
    h2.paragraph_format.space_after = Pt(6)
    r_h2 = h2.add_run("2. Matriz de Requerimientos Funcionales (RF)")
    r_h2.font.name = "Calibri"
    r_h2.font.size = Pt(14)
    r_h2.font.bold = True
    r_h2.font.color.rgb = COLOR_PRIMARY

    table_data = [
        (
            "RF-01\nContrato NEP-171 & NEP-177",
            "Desarrollar y compilar el contrato base de tokens no fungibles (NFT) con metadatos estructurados (nombre, símbolo, versión, URI IPFS de colección) en WebAssembly para NEAR Testnet.",
            "Daniel\n(Web3 Lead)"
        ),
        (
            "RF-02\nMinteo Autorizado de Pasaporte",
            "Implementar el método 'mint_authorized' restringido al Relayer corporativo para acuñar el pasaporte digital de cada prenda sin cobrar gas al artesano, adjuntando metadatos de manufactura y lote de cuero.",
            "Daniel\n(Web3 Lead)"
        ),
        (
            "RF-03\nMáquina de Estados de la Prenda",
            "Definir el ciclo de vida inmutable en el estado del contrato: ORIGINADO (en taller artesano), CUSTODIA (en tienda/despacho) y VENDIDO (en manos del cliente final), con métodos view públicos.",
            "Daniel\n(Web3 Lead)"
        ),
        (
            "RF-04\nTransferencia de Custodia Digital",
            "Implementar 'transferir_custodia(token_id, nueva_tienda)' para que el Relayer refleje en blockchain el traslado físico de la prenda del taller a la tienda asociada.",
            "Daniel\n(Web3 Lead)"
        ),
        (
            "RF-05\nCertificación Fiscal (Hash SUNAT)",
            "Incorporar en 'registrar_venta' el almacenamiento del hash SHA-256 de la boleta de venta electrónica de la SUNAT, vinculando la validez tributaria peruana al NFT antes de entregarlo al comprador.",
            "Daniel\n(Web3 Lead)"
        ),
        (
            "RF-06\nGestión de Storage Staking",
            "Administrar el cálculo de almacenamiento on-chain en NEAR Protocol (~1 NEAR por 100 KB) con depósitos adjuntos garantizados por la cuenta Relayer para evitar fallos de memoria.",
            "Daniel\n(Web3 Lead)"
        ),
        (
            "RF-07\nServicio Relayer (near-api-js)",
            "Construir el módulo 'services/nearService.js' que gestione la conexión RPC con NEAR Testnet, inicialice KeyStores en memoria y ejecute las transacciones firmadas con la clave del Relayer.",
            "Fredy\n(Backend Lead)"
        ),
        (
            "RF-08\nAdaptador de Endpoints REST",
            "Reemplazar las llamadas Viem/Arbitrum en los controladores de Express ('productos.controller.js', 'tiendas.controller.js') por métodos de 'nearService' respondiendo con 'nearTxHash'.",
            "Fredy\n(Backend Lead)"
        ),
        (
            "RF-09\nSincronización con Neo4j",
            "Actualizar el grafo de relaciones en Neo4j vinculando a los nodos 'Producto' sus identificadores on-chain ('nearTokenId', 'nearTxHash', 'receiptId', 'blockchainStatus').",
            "Fredy\n(Backend Lead)"
        ),
        (
            "RF-10\nExplorador Pasaporte Web",
            "Actualizar 'pasaporte.html' e 'index.html' para mostrar la línea de tiempo de la prenda con insignias oficiales de NEAR y enlaces verificables directos a 'testnet.nearblocks.io'.",
            "Fredy\n(Backend Lead)"
        ),
        (
            "RF-11\nCuentas Nombradas de Actores",
            "Diseñar el mapeo de identidades de artesanos y tiendas a subcuentas legibles de NEAR (ej. 'artesano1.kipulux.testnet') para aprovechar la abstracción de cuentas nativa.",
            "Daniel & Fredy\n(Colaborativo)"
        ),
        (
            "RF-12\nScript Demo E2E & Validación",
            "Elaborar un script de automatización en un solo comando ('run-demo-near.js') que ejecute todo el flujo de trazabilidad para evaluación de los jueces y agentes Claude/Codex.",
            "Daniel & Fredy\n(Colaborativo)"
        )
    ]

    table = doc.add_table(rows=len(table_data) + 1, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    col_widths = [Inches(1.8), Inches(3.6), Inches(1.5)]
    for row in table.rows:
        for idx, width in enumerate(col_widths):
            row.cells[idx].width = width

    # Cabecera de la tabla
    hdr_titles = ["Requerimiento Funcional (RF)", "Descripción", "Responsable"]
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(hdr_titles):
        set_cell_background(hdr_cells[i], COLOR_HEADER_BG)
        set_cell_margins(hdr_cells[i], top=140, bottom=140, left=150, right=150)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(title)
        run.font.name = "Calibri"
        run.font.size = Pt(10.5)
        run.font.bold = True
        run.font.color.rgb = RGBColor(255, 255, 255)

    # Filas de datos
    for r_idx, (rf_id, desc, resp) in enumerate(table_data):
        row_cells = table.rows[r_idx + 1].cells
        bg_color = COLOR_ZEBRA_BG if r_idx % 2 == 1 else "FFFFFF"

        for c_idx, text in enumerate([rf_id, desc, resp]):
            cell = row_cells[c_idx]
            set_cell_background(cell, bg_color)
            set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(2)
            run = p.add_run(text)
            run.font.name = "Calibri"
            run.font.size = Pt(9.5)
            run.font.color.rgb = COLOR_SECONDARY

            if c_idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run.font.bold = True
            elif c_idx == 1:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            elif c_idx == 2:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run.font.bold = True
                if "Daniel & Fredy" in text:
                    run.font.color.rgb = COLOR_ACCENT

    # Sección 3: Plan de Implementación
    doc.add_page_break()
    h3 = doc.add_paragraph()
    h3.paragraph_format.space_before = Pt(14)
    h3.paragraph_format.space_after = Pt(6)
    r_h3 = h3.add_run("3. Plan de Implementación Dividido entre Daniel y Fredy")
    r_h3.font.name = "Calibri"
    r_h3.font.size = Pt(14)
    r_h3.font.bold = True
    r_h3.font.color.rgb = COLOR_PRIMARY

    p_intro = doc.add_paragraph()
    p_intro.paragraph_format.space_after = Pt(10)
    r_intro = p_intro.add_run(
        "El cronograma se estructura en 4 fases secuenciales con hitos compartidos para garantizar que la solución "
        "esté completamente integrada, testeada y publicada antes del cierre de postulaciones (14 de Noviembre de 2026, 23:59 UTC)."
    )
    r_intro.font.name = "Calibri"
    r_intro.font.size = Pt(10.5)

    phases = [
        {
            "num": "Fase 1: Setup de Red, Cuentas & Smart Contract Core (Días 1 - 4)",
            "daniel": [
                "Crear el proyecto de contrato inteligente NEAR en Rust o TypeScript SDK.",
                "Implementar la estructura estándar NEP-171 (Core NFT) y NEP-177 (Metadata).",
                "Programar la máquina de estados ('ORIGINADO', 'CUSTODIA', 'VENDIDO') y métodos de control.",
                "Escribir pruebas unitarias y verificar la compilación a WebAssembly (Wasm)."
            ],
            "fredy": [
                "Crear la rama de trabajo 'feature/near-integration' en el repositorio Git.",
                "Generar las cuentas maestras en NEAR Testnet ('kipulux.testnet' y 'relayer.kipulux.testnet') usando NEAR Faucet.",
                "Instalar librerías en Node.js ('near-api-js', 'bn.js') y crear la plantilla '.env.near'.",
                "Auditar los endpoints existentes de Express para listar las dependencias de Viem a migrar."
            ],
            "entregable": "Contrato compilado en Wasm y cuentas de testnet activas con fondos de faucet."
        },
        {
            "num": "Fase 2: Despliegue en Testnet, Servicio Relayer & API (Días 5 - 8)",
            "daniel": [
                "Desplegar el contrato Wasm en NEAR Testnet mediante 'near-cli-rs'.",
                "Inicializar el contrato vinculando la cuenta del Relayer como 'owner_id'.",
                "Ejecutar transacciones de prueba por CLI (minteo y cambio de estado) y verificar en NEARBlocks.",
                "Calcular el storage deposit exacto por token para instruir al backend."
            ],
            "fredy": [
                "Desarrollar 'services/nearService.js' implementando 'mintAuthorized', 'actualizarCustodia', 'transferirCustodia' y 'registrarVenta'.",
                "Configurar 'InMemoryKeyStore' en el backend para firmar transacciones con la clave del Relayer corporativo.",
                "Adaptar los controladores 'productos.controller.js' y 'tiendas.controller.js' para delegar en 'nearService'.",
                "Asegurar manejo de errores y reintentos ante timeouts de nodos RPC de NEAR."
            ],
            "entregable": "Endpoints de Express ejecutando mutaciones reales en NEAR Testnet con gas subsidiado."
        },
        {
            "num": "Fase 3: Sincronización Neo4j, Frontend Pasaporte & E2E (Días 9 - 11)",
            "daniel": [
                "Auditar la concordancia entre los hashes de boleta SUNAT emitidos y los registros on-chain.",
                "Verificar los eventos NEP-297 emitidos por el contrato para facilitar la indexación externa.",
                "Colaborar con Fredy en la definición de subcuentas para artesanos y tiendas."
            ],
            "fredy": [
                "Actualizar las consultas Cypher en Neo4j para almacenar 'nearTxHash', 'receiptId' y 'tokenId'.",
                "Modificar 'pasaporte.html' e 'index.html' para mostrar la insignia de certificación NEAR y el enlace directo a 'testnet.nearblocks.io/txns/<hash>'.",
                "Construir el script de prueba end-to-end 'scripts/demo/test_near_flow.js'."
            ],
            "entregable": "Flujo completo funcional: Confección -> Mint en NEAR -> Custodia en Tienda -> Venta SUNAT -> Visualización en Pasaporte Web."
        },
        {
            "num": "Fase 4: Showcase, Video Demo, README & Postulación (Días 12 - 14)",
            "daniel": [
                "Redactar la sección técnica del 'README.md' orientada a los bots de evaluación (Claude Code / Codex): 'Haz X -> Observa Y'.",
                "Documentar el diff entre el código base preexistente y la nueva integración de NEAR cumpliendo con la Regla Q-002.",
                "Verificar la inclusión de la licencia MIT ('LICENSE')."
            ],
            "fredy": [
                "Empaquetar el comando unificado de arranque para los jueces: 'node scripts/demo/run-demo-near.js'.",
                "Grabar y editar el video demostrativo (2-3 minutos) mostrando la emisión física y la verificación en NEARBlocks.",
                "Publicar el post en X (Twitter) anunciando la participación en la NEAR Hackathon.",
                "Revisar el payload final y enviar la postulación a 'https://nearhackathon.com/api/applications'."
            ],
            "entregable": "Repositorio público, video demo en X y confirmación HTTP 201 de la postulación oficial."
        }
    ]

    for p_info in phases:
        h_phase = doc.add_paragraph()
        h_phase.paragraph_format.space_before = Pt(10)
        h_phase.paragraph_format.space_after = Pt(4)
        r_ph = h_phase.add_run(p_info["num"])
        r_ph.font.name = "Calibri"
        r_ph.font.size = Pt(11.5)
        r_ph.font.bold = True
        r_ph.font.color.rgb = COLOR_PRIMARY

        # Tareas Daniel
        p_d = doc.add_paragraph()
        p_d.paragraph_format.left_indent = Inches(0.2)
        p_d.paragraph_format.space_after = Pt(2)
        r_dt = p_d.add_run("Tareas de Daniel (Web3 Lead):\n")
        r_dt.font.bold = True
        r_dt.font.size = Pt(10)
        r_dt.font.color.rgb = COLOR_SECONDARY
        for t in p_info["daniel"]:
            p_item = doc.add_paragraph()
            p_item.paragraph_format.left_indent = Inches(0.4)
            p_item.paragraph_format.space_after = Pt(1)
            r_item = p_item.add_run(f"• {t}")
            r_item.font.size = Pt(9.5)

        # Tareas Fredy
        p_f = doc.add_paragraph()
        p_f.paragraph_format.left_indent = Inches(0.2)
        p_f.paragraph_format.space_before = Pt(4)
        p_f.paragraph_format.space_after = Pt(2)
        r_ft = p_f.add_run("Tareas de Fredy (Backend & Frontend Lead):\n")
        r_ft.font.bold = True
        r_ft.font.size = Pt(10)
        r_ft.font.color.rgb = COLOR_SECONDARY
        for t in p_info["fredy"]:
            p_item = doc.add_paragraph()
            p_item.paragraph_format.left_indent = Inches(0.4)
            p_item.paragraph_format.space_after = Pt(1)
            r_item = p_item.add_run(f"• {t}")
            r_item.font.size = Pt(9.5)

        # Hito / Entregable
        p_ent = doc.add_paragraph()
        p_ent.paragraph_format.left_indent = Inches(0.2)
        p_ent.paragraph_format.space_before = Pt(4)
        p_ent.paragraph_format.space_after = Pt(8)
        r_ent_label = p_ent.add_run("Entregable de la Fase: ")
        r_ent_label.font.bold = True
        r_ent_label.font.size = Pt(10)
        r_ent_label.font.color.rgb = COLOR_ACCENT
        r_ent_val = p_ent.add_run(p_info["entregable"])
        r_ent_val.font.size = Pt(9.5)
        r_ent_val.font.italic = True

    output_path = r"docs/01-requirements/Kipulux_NEAR_Requerimientos_y_Plan_Daniel_Fredy.docx"
    doc.save(output_path)
    print(f"Documento generado exitosamente en: {output_path}")

if __name__ == "__main__":
    create_document()
