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
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Paleta de Colores
    COLOR_PRIMARY = RGBColor(14, 116, 144)      # Teal / Cyan NEAR
    COLOR_SECONDARY = RGBColor(30, 41, 59)     # Slate oscuro
    COLOR_HEADER_BG = "0E7490"                 # Hex Teal cabecera
    COLOR_ZEBRA_BG = "F8FAFC"                  # Hex Slate 50
    COLOR_ACCENT = RGBColor(2, 132, 199)       # Sky Blue
    COLOR_MUTED = RGBColor(100, 116, 139)      # Muted Slate
    COLOR_BORDER = "CBD5E1"

    # =========================================================================
    # PORTADA / ENCABEZADO EJECUTIVO
    # =========================================================================
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(2)
    run_title = p_title.add_run("KIPULUX: MIGRACIÓN E2E A NEAR PROTOCOL")
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(22)
    run_title.font.bold = True
    run_title.font.color.rgb = COLOR_PRIMARY

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(14)
    run_sub = p_sub.add_run(
        "Especificación de Requerimientos Funcionales, Plan de Implementación de 3 Personas y Gobernanza en GitHub\n"
        "Smart Contracts Wasm · Backend Relayer Node.js · Grafo Neo4j · App Móvil Flutter (NFC) · Web SPA\n"
        "NEAR HACKATHON 2026 — Tracks de Competencia: Real-World & NFTs ($250,000 USD Prize Pool)"
    )
    run_sub.font.name = "Calibri"
    run_sub.font.size = Pt(11)
    run_sub.font.italic = True
    run_sub.font.color.rgb = COLOR_MUTED

    # =========================================================================
    # SECCIÓN 1: ESTRUCTURA DEL EQUIPO (DANIEL, FREDY, JOSEPH)
    # =========================================================================
    h1 = doc.add_paragraph()
    h1.paragraph_format.space_before = Pt(10)
    h1.paragraph_format.space_after = Pt(6)
    r_h1 = h1.add_run("1. Estructura de Equipo y Matriz de Roles (3 Personas)")
    r_h1.font.name = "Calibri"
    r_h1.font.size = Pt(14)
    r_h1.font.bold = True
    r_h1.font.color.rgb = COLOR_PRIMARY

    p_roles = doc.add_paragraph()
    p_roles.paragraph_format.space_after = Pt(12)
    r_roles = p_roles.add_run(
        "• Daniel — Web3 & Smart Contracts Lead (NEAR Protocol Core):\n"
        "  Lidera el diseño y compilación del contrato inteligente en WebAssembly (Wasm) bajo los estándares NEP-171 (NFT) "
        "y NEP-177 (Metadata). Modela la máquina de estados de trazabilidad ('ORIGINADO' -> 'CUSTODIA' -> 'VENDIDO'), "
        "la gestión de almacenamiento (Storage Staking), la integración de Function Call Keys y las pruebas en NEAR Testnet.\n\n"
        "• Fredy — Backend & Systems Integration Lead (Express API, Relayer & Web):\n"
        "  Lidera la capa de orquestación central. Implementa el servicio Relayer gasless con near-api-js en Node.js, "
        "adapta los controladores de Express, sincroniza las transacciones de NEAR con la base de datos de grafos Neo4j, "
        "actualiza el portal web (pasaporte.html) y automatiza el script de arranque en 1 comando (run-demo-near.js).\n\n"
        "• Joseph — Mobile App & Phygital Experience Lead (Flutter, NFC & UX):\n"
        "  Lidera la aplicación móvil Flutter ('KipuLux-Mobile'). Conecta los flujos de artesano (emisión de NFT e IPFS) "
        "y cliente final ('Mis Prendas' y timeline del pasaporte con insignias de NEAR). Implementa la vinculación "
        "y lectura física de chips NFC (NTAG213/215/216) y la navegación hacia el explorador testnet.nearblocks.io."
    )
    r_roles.font.name = "Calibri"
    r_roles.font.size = Pt(10)
    r_roles.font.color.rgb = COLOR_SECONDARY

    # =========================================================================
    # SECCIÓN 2: TABLA DE REQUERIMIENTOS FUNCIONALES (3 COLUMNAS)
    # =========================================================================
    h2 = doc.add_paragraph()
    h2.paragraph_format.space_before = Pt(12)
    h2.paragraph_format.space_after = Pt(6)
    r_h2 = h2.add_run("2. Matriz de Requerimientos Funcionales E2E (Tabla de 3 Columnas)")
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
            "RF-03\nMáquina de Estados en NEAR",
            "Definir el ciclo de vida inmutable en el estado del contrato: ORIGINADO (en taller artesano), CUSTODIA (en tienda/despacho) y VENDIDO (en manos del cliente final), con métodos view públicos.",
            "Daniel\n(Web3 Lead)"
        ),
        (
            "RF-04\nTransferencia de Custodia Digital",
            "Implementar 'transferir_custodia(token_id, nueva_tienda)' para que el Relayer refleje en blockchain el traslado físico de la prenda del taller artesano a la tienda autorizada.",
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
            "RF-10\nWeb SPA: Pasaporte & NEAR Explorer",
            "Actualizar 'pasaporte.html' e 'index.html' para mostrar la línea de tiempo de la prenda con insignias oficiales de NEAR y enlaces verificables directos a 'testnet.nearblocks.io'.",
            "Fredy\n(Backend Lead)"
        ),
        (
            "RF-11\nApp Móvil: Auth y Roles Flutter",
            "Gestionar inicio de sesión y registro de clientes en 'KipuLux-Mobile', persistiendo JWT en flutter_secure_storage y bifurcando shells de navegación para Artesanos y Clientes finales.",
            "Joseph\n(Mobile Lead)"
        ),
        (
            "RF-12\nApp Móvil: Registro Artesano & Mint",
            "Capturar fotos y PDFs en 'registrar_prenda_screen.dart', enviarlos al backend para subida a IPFS y solicitar el minteo del pasaporte digital en NEAR, mostrando modal de confirmación.",
            "Joseph\n(Mobile Lead)"
        ),
        (
            "RF-13\nApp Móvil: Pasaporte & NEARBlocks",
            "Visualizar en 'pasaporte_screen.dart' la cronología completa de la prenda, la tarjeta de certificación NEAR Protocol y el botón nativo para abrir la transacción en testnet.nearblocks.io.",
            "Joseph\n(Mobile Lead)"
        ),
        (
            "RF-14\nApp Móvil: Phygital con Chip NFC",
            "Implementar lectura de hardware de chips NFC (NTAG213/215/216) mediante 'nfc_service.dart' para vincular el chip físico al NFT (Artesano) y validar autenticidad al instante (Cliente).",
            "Joseph\n(Mobile Lead)"
        ),
        (
            "RF-15\nCuentas Nombradas de Actores",
            "Diseñar el mapeo de identidades de artesanos y tiendas a subcuentas legibles de NEAR (ej. 'artesano1.kipulux.testnet') para aprovechar la abstracción de cuentas nativa.",
            "Daniel, Fredy & Joseph\n(Colaborativo)"
        ),
        (
            "RF-16\nSuite Demo E2E & Hackathon Showcase",
            "Elaborar el script maestro 'run-demo-near.js', redactar el README reproducible para agentes Claude/Codex, compilar la APK de Android y preparar el video demostrativo para X.",
            "Daniel, Fredy & Joseph\n(Colaborativo)"
        )
    ]

    table = doc.add_table(rows=len(table_data) + 1, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    col_widths = [Inches(1.8), Inches(3.6), Inches(1.5)]
    for row in table.rows:
        for idx, width in enumerate(col_widths):
            row.cells[idx].width = width

    # Cabecera
    hdr_titles = ["Requerimiento Funcional (RF)", "Descripción Técnica & Criterios", "Responsable"]
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(hdr_titles):
        set_cell_background(hdr_cells[i], COLOR_HEADER_BG)
        set_cell_margins(hdr_cells[i], top=140, bottom=140, left=150, right=150)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(title)
        run.font.name = "Calibri"
        run.font.size = Pt(10)
        run.font.bold = True
        run.font.color.rgb = RGBColor(255, 255, 255)

    # Datos
    for r_idx, (rf_id, desc, resp) in enumerate(table_data):
        row_cells = table.rows[r_idx + 1].cells
        bg_color = COLOR_ZEBRA_BG if r_idx % 2 == 1 else "FFFFFF"

        for c_idx, text in enumerate([rf_id, desc, resp]):
            cell = row_cells[c_idx]
            set_cell_background(cell, bg_color)
            set_cell_margins(cell, top=90, bottom=90, left=110, right=110)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(2)
            run = p.add_run(text)
            run.font.name = "Calibri"
            run.font.size = Pt(9)
            run.font.color.rgb = COLOR_SECONDARY

            if c_idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run.font.bold = True
            elif c_idx == 1:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            elif c_idx == 2:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run.font.bold = True
                if "Colaborativo" in text:
                    run.font.color.rgb = COLOR_ACCENT

    # =========================================================================
    # SECCIÓN 3: PROTOCOLO DE TRABAJO EN GITHUB PARA LOS 3
    # =========================================================================
    doc.add_page_break()
    h3 = doc.add_paragraph()
    h3.paragraph_format.space_before = Pt(12)
    h3.paragraph_format.space_after = Pt(6)
    r_h3 = h3.add_run("3. Protocolo y Gobernanza de Trabajo en GitHub para los 3")
    r_h3.font.name = "Calibri"
    r_h3.font.size = Pt(14)
    r_h3.font.bold = True
    r_h3.font.color.rgb = COLOR_PRIMARY

    p_git = doc.add_paragraph()
    p_git.paragraph_format.space_after = Pt(10)
    r_git = p_git.add_run(
        "Para coordinar el desarrollo simultáneo de Daniel, Fredy y Joseph sin conflictos de código ni fuga de secretos, "
        "se establece el siguiente protocolo normativo de versionamiento y gobernanza:"
    )
    r_git.font.name = "Calibri"
    r_git.font.size = Pt(10)

    git_points = [
        ("A. Arquitectura de Repositorios:",
         "El proyecto opera bajo dos repositorios complementarios:\n"
         "1. Repositorio Core ('Kipulux'): Contiene el Backend Express, contratos NEAR Wasm, Neo4j, Web SPA y scripts de demo.\n"
         "2. Repositorio Móvil ('KipuLux-Mobile'): Proyecto Flutter (Android/iOS) en su rama de trabajo 'feat/app-movil-flutter'."),

        ("B. Estrategia de Ramas (Branching Strategy):",
         "• Rama 'main': Código de producción protegido. Requiere pull request aprobado y verificación de pruebas.\n"
         "• Rama 'feature/near-integration': Rama troncal de integración de la hackathon.\n"
         "• Ramas atómicas por desarrollador:\n"
         "  - 'feat/near-contracts-daniel': Desacoplada para compilar contratos Wasm, ABI y tests en NEAR sandbox.\n"
         "  - 'feat/near-backend-fredy': Para el servicio Relayer, adaptación de controladores de Express y Neo4j.\n"
         "  - 'feat/near-mobile-joseph': Para adaptación de Riverpod DTOs, pantallas de pasaporte y lectura NFC.\n"
         "  - 'integration/e2e-demo': Rama de ensamblaje final previo a la grabación del video y postulación."),

        ("C. Convención de Commits (Conventional Commits):",
         "Todos los commits deben seguir el formato '<tipo>(<alcance>): <descripción corta>':\n"
         "• feat(near-contract): Implementar mint_authorized con eventos NEP-297\n"
         "• feat(relayer): Integrar near-api-js con InMemoryKeyStore corporativo\n"
         "• feat(mobile-nfc): Vincular lectura de chip físico con nearTokenId\n"
         "• fix(neo4j): Corregir propiedad receiptId en nodo Producto\n"
         "• docs(hackathon): Añadir matriz de trazabilidad y diff de código Q-002"),

        ("D. Gobernanza de Secretos y Variables de Entorno (Zero-Secret Leaks):",
         "• Terminantemente prohibido commitear llaves privadas, archivos .env o claves ed25519.\n"
         "• Daniel provee a Fredy la dirección del contrato en testnet ('NEAR_CONTRACT_NAME=kipulux-core.testnet').\n"
         "• Fredy expone la API local hacia Joseph mediante:\n"
         "  - Emulador Android: 'flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3005'\n"
         "  - Simulador iOS / Desktop: 'flutter run --dart-define=API_BASE_URL=http://localhost:3005'\n"
         "  - Dispositivo físico: 'flutter run --dart-define=API_BASE_URL=http://<IP_LAN>:3005'\n"
         "• Ambos repositorios deben mantener manifiestos canónicos '.env.example' sincronizados."),

        ("E. Cumplimiento de Reglas de la NEAR Hackathon (Q-001 a Q-005 y Q-017):",
         "• Etiquetado Git: Se colocará el tag 'pre-hackathon' en el commit base de inicio y 'hackathon-submission' al culminar.\n"
         "• El README.md debe incluir una sección 'NEAR Hackathon Integration Diff' enlazando al diff de GitHub.\n"
         "• Preparación para Evaluadores IA (Claude Code / Codex): El README debe estructurarse con pasos reproducibles 'Haz X -> Observa Y' sin descripciones puramente comerciales.")
    ]

    for title, desc in git_points:
        p_gp = doc.add_paragraph()
        p_gp.paragraph_format.left_indent = Inches(0.15)
        p_gp.paragraph_format.space_before = Pt(4)
        p_gp.paragraph_format.space_after = Pt(2)
        r_t = p_gp.add_run(f"{title}\n")
        r_t.font.bold = True
        r_t.font.size = Pt(10)
        r_t.font.color.rgb = COLOR_PRIMARY
        r_d = p_gp.add_run(desc)
        r_d.font.size = Pt(9.5)
        r_d.font.color.rgb = COLOR_SECONDARY

    # =========================================================================
    # SECCIÓN 4: PLAN DE IMPLEMENTACIÓN E2E EN 4 FASES (CRONOGRAMA)
    # =========================================================================
    doc.add_page_break()
    h4 = doc.add_paragraph()
    h4.paragraph_format.space_before = Pt(12)
    h4.paragraph_format.space_after = Pt(6)
    r_h4 = h4.add_run("4. Plan de Implementación E2E para Daniel, Fredy y Joseph")
    r_h4.font.name = "Calibri"
    r_h4.font.size = Pt(14)
    r_h4.font.bold = True
    r_h4.font.color.rgb = COLOR_PRIMARY

    p_plan_intro = doc.add_paragraph()
    p_plan_intro.paragraph_format.space_after = Pt(10)
    r_pi = p_plan_intro.add_run(
        "El cronograma se divide en 4 fases altamente sincronizadas hacia el cierre de postulaciones (14 de Noviembre de 2026, 23:59 UTC):"
    )
    r_pi.font.name = "Calibri"
    r_pi.font.size = Pt(10)

    phases_e2e = [
        {
            "num": "Fase 1: Setup, Cuentas NEAR & Smart Contract Core (Días 1 - 4)",
            "daniel": [
                "Crear el proyecto de contrato inteligente NEAR en Rust (near-sdk-rs) o TypeScript (near-sdk-js).",
                "Implementar estándares NEP-171 (Core NFT) y NEP-177 (Metadata de origen, lote y artesano).",
                "Programar la máquina de estados ('ORIGINADO', 'CUSTODIA', 'VENDIDO') y métodos de control restringidos.",
                "Escribir tests unitarios en sandbox y verificar compilación a WebAssembly (Wasm)."
            ],
            "fredy": [
                "Crear la rama 'feature/near-integration' en el repo Core y generar cuentas de testnet con faucet.",
                "Instalar dependencias en el backend Express ('near-api-js', 'bn.js') y definir '.env.near'.",
                "Auditar controladores ('productos', 'tiendas', 'clientes') mapeando las funciones Viem a reemplazar.",
                "Habilitar endpoints mock temporales para que Joseph pueda desarrollar la app móvil sin bloqueos."
            ],
            "joseph": [
                "Sincronizar la rama 'feat/app-movil-flutter' del repositorio 'KipuLux-Mobile'.",
                "Ejecutar 'flutter pub get' y 'dart run build_runner build' para regenerar modelos Freezed.",
                "Configurar el interceptor de Dio en 'providers.dart' para consumir el backend local con '--dart-define'.",
                "Auditar el servicio de lectura de chip físico 'nfc_service.dart' en dispositivo de pruebas."
            ],
            "entregable": "Contrato compilado en Wasm, cuentas de testnet fondeadas y entorno móvil compilando localmente."
        },
        {
            "num": "Fase 2: Despliegue en Testnet, Servicio Relayer & Modelos Móviles (Días 5 - 8)",
            "daniel": [
                "Desplegar el contrato Wasm en NEAR Testnet ('kipulux-core.testnet') usando 'near-cli-rs'.",
                "Inicializar el contrato vinculando la cuenta Relayer como 'owner_id' y fondear para Storage Staking.",
                "Ejecutar minteo y transferencias de prueba vía CLI, verificando transacciones en NEARBlocks.",
                "Documentar firmas de métodos y estructuras JSON de retorno para Fredy y Joseph."
            ],
            "fredy": [
                "Construir 'services/nearService.js' integrando 'InMemoryKeyStore' con la clave del Relayer.",
                "Implementar 'mintAuthorized', 'actualizarCustodia', 'transferirCustodia' y 'registrarVenta'.",
                "Actualizar 'productos.controller.js' para emitir pasaportes en NEAR y devolver 'nearTxHash'.",
                "Sincronizar las mutaciones de estado con el grafo de relaciones en Neo4j."
            ],
            "joseph": [
                "Actualizar el modelo 'pasaporte.dart' con campos on-chain: 'nearTxHash', 'nearTokenId', 'nearBlocksUrl'.",
                "Adaptar 'registrar_prenda_screen.dart' para consumir el nuevo endpoint de minteo en NEAR.",
                "Crear la tarjeta 'Certificación NEAR Protocol' en 'pasaporte_screen.dart' con diseño brandeado.",
                "Integrar 'url_launcher' para abrir la transacción directamente en 'testnet.nearblocks.io'."
            ],
            "entregable": "Transacciones reales ejecutadas en NEAR Testnet y reflejadas en tiempo real en la App Móvil."
        },
        {
            "num": "Fase 3: Integración E2E Phygital, Neo4j & Pasaporte Móvil (Días 9 - 11)",
            "daniel": [
                "Verificar la correcta emisión de eventos NEP-297 en el contrato para auditoría e indexación.",
                "Validar la inmutabilidad y cálculo de hash de boletas SUNAT ante intentos de sobreescritura.",
                "Colaborar con Fredy y Joseph en la asignación de subcuentas para artesanos y tiendas."
            ],
            "fredy": [
                "Actualizar 'pasaporte.html' e 'index.html' en la SPA Web con badges verificables de NEARBlocks.",
                "Optimizar los tiempos de respuesta de los endpoints de trazabilidad con Neo4j en p95 < 2500 ms.",
                "Desarrollar el script de prueba de extremo a extremo 'scripts/demo/test_near_flow.js'."
            ],
            "joseph": [
                "Finalizar la vinculación del UID de chip NFC físico con el NFT de NEAR en 'vincular_nfc_screen.dart'.",
                "Completar el flujo de verificación instantánea en 'verify_screen.dart' por lectura de chip o QR.",
                "Ejecutar pruebas completas en emulador y teléfono físico Android generando la APK de prueba."
            ],
            "entregable": "Flujo Phygital 100% operativo: Cuero Físico + Chip NFC <-> Contrato NEAR <-> Grafo Neo4j <-> App Móvil."
        },
        {
            "num": "Fase 4: Showcase, Video Demo, README & Postulación Oficial (Días 12 - 14)",
            "daniel": [
                "Redactar la sección técnica del 'README.md' para los agentes de evaluación automática Claude Code / Codex.",
                "Documentar formalmente el diff de la integración NEAR y adjuntar archivo de licencia MIT ('LICENSE').",
                "Revisar la integridad criptográfica de la cuenta receptora de premios en NEAR Mainnet."
            ],
            "fredy": [
                "Empaquetar el script de demostración en un solo comando: 'node scripts/demo/run-demo-near.js'.",
                "Asegurar que los datos sintéticos de prueba sean hiper-realistas (cero 'Lorem Ipsum' o 'test').",
                "Configurar los manifiestos finales y validar la estabilidad de la API en local y servidor."
            ],
            "joseph": [
                "Grabar y producir el video de demostración (2-3 minutos) capturando el escaneo NFC y la app en acción.",
                "Publicar el post público en X (Twitter) anunciando el proyecto en el marco de la NEAR HACKATHON.",
                "Revisar en conjunto el payload JSON y ejecutar el envío formal a 'https://nearhackathon.com/api/applications'."
            ],
            "entregable": "Repositorio público, video demo en X, confirmación HTTP 201 de la postulación oficial de la hackathon."
        }
    ]

    for p_info in phases_e2e:
        h_phase = doc.add_paragraph()
        h_phase.paragraph_format.space_before = Pt(10)
        h_phase.paragraph_format.space_after = Pt(4)
        r_ph = h_phase.add_run(p_info["num"])
        r_ph.font.name = "Calibri"
        r_ph.font.size = Pt(11)
        r_ph.font.bold = True
        r_ph.font.color.rgb = COLOR_PRIMARY

        # Tareas Daniel
        p_d = doc.add_paragraph()
        p_d.paragraph_format.left_indent = Inches(0.2)
        p_d.paragraph_format.space_after = Pt(2)
        r_dt = p_d.add_run("Daniel (Web3 & Smart Contracts Lead):\n")
        r_dt.font.bold = True
        r_dt.font.size = Pt(9.5)
        r_dt.font.color.rgb = COLOR_SECONDARY
        for t in p_info["daniel"]:
            p_item = doc.add_paragraph()
            p_item.paragraph_format.left_indent = Inches(0.4)
            p_item.paragraph_format.space_after = Pt(1)
            r_item = p_item.add_run(f"• {t}")
            r_item.font.size = Pt(9)

        # Tareas Fredy
        p_f = doc.add_paragraph()
        p_f.paragraph_format.left_indent = Inches(0.2)
        p_f.paragraph_format.space_before = Pt(3)
        p_f.paragraph_format.space_after = Pt(2)
        r_ft = p_f.add_run("Fredy (Backend & Systems Integration Lead):\n")
        r_ft.font.bold = True
        r_ft.font.size = Pt(9.5)
        r_ft.font.color.rgb = COLOR_SECONDARY
        for t in p_info["fredy"]:
            p_item = doc.add_paragraph()
            p_item.paragraph_format.left_indent = Inches(0.4)
            p_item.paragraph_format.space_after = Pt(1)
            r_item = p_item.add_run(f"• {t}")
            r_item.font.size = Pt(9)

        # Tareas Joseph
        p_j = doc.add_paragraph()
        p_j.paragraph_format.left_indent = Inches(0.2)
        p_j.paragraph_format.space_before = Pt(3)
        p_j.paragraph_format.space_after = Pt(2)
        r_jt = p_j.add_run("Joseph (Mobile App & Phygital Experience Lead):\n")
        r_jt.font.bold = True
        r_jt.font.size = Pt(9.5)
        r_jt.font.color.rgb = COLOR_SECONDARY
        for t in p_info["joseph"]:
            p_item = doc.add_paragraph()
            p_item.paragraph_format.left_indent = Inches(0.4)
            p_item.paragraph_format.space_after = Pt(1)
            r_item = p_item.add_run(f"• {t}")
            r_item.font.size = Pt(9)

        # Entregable
        p_ent = doc.add_paragraph()
        p_ent.paragraph_format.left_indent = Inches(0.2)
        p_ent.paragraph_format.space_before = Pt(4)
        p_ent.paragraph_format.space_after = Pt(8)
        r_ent_l = p_ent.add_run("Hito y Entregable de Fase: ")
        r_ent_l.font.bold = True
        r_ent_l.font.size = Pt(9.5)
        r_ent_l.font.color.rgb = COLOR_ACCENT
        r_ent_v = p_ent.add_run(p_info["entregable"])
        r_ent_v.font.size = Pt(9)
        r_ent_v.font.italic = True

    # =========================================================================
    # SECCIÓN 5: CHECKLIST DE POSTULACIÓN OFICIAL
    # =========================================================================
    doc.add_page_break()
    h5 = doc.add_paragraph()
    h5.paragraph_format.space_before = Pt(12)
    h5.paragraph_format.space_after = Pt(6)
    r_h5 = h5.add_run("5. Checklist Pre-Vuelo para la Postulación Oficial en la API")
    r_h5.font.name = "Calibri"
    r_h5.font.size = Pt(14)
    r_h5.font.bold = True
    r_h5.font.color.rgb = COLOR_PRIMARY

    p_check = doc.add_paragraph()
    p_check.paragraph_format.space_after = Pt(10)
    r_ck = p_check.add_run(
        "Antes de ejecutar el POST a 'https://nearhackathon.com/api/applications', los 3 integrantes deben validar "
        "cada campo del contrato técnico estricto:\n\n"
        "1. [ ] 'requestId': UUID v4 generado una sola vez y conservado para reintentos.\n"
        "2. [ ] 'projectName': 'Kipulux' (entre 2 y 80 caracteres).\n"
        "3. [ ] 'leadName': Nombre completo del líder del equipo.\n"
        "4. [ ] 'email': Correo electrónico verificado (máximo 160 caracteres).\n"
        "5. [ ] 'size': Exactamente '2 - 4' (valor canónico exigido por el endpoint).\n"
        "6. [ ] 'tracks': Array formal conteniendo ['realworld', 'nfts'].\n"
        "7. [ ] 'nearAddress': Dirección real y activa en NEAR Mainnet (ej. 'equipo.near') para cobro de premios.\n"
        "8. [ ] 'projectUrl': URL pública del repositorio de GitHub (abierto antes del 14-Nov-2026 23:59 UTC).\n"
        "9. [ ] 'demoUrl': URL pública del post en X (Twitter) con el video demostrativo adjunto.\n"
        "10. [ ] 'idea': Pitch técnico (entre 20 y 2000 caracteres) explicando el problema, qué se construyó y cómo NEAR aporta valor inmutable.\n"
        "11. [ ] 'consent': Valor booleano true con la aceptación de los términos de contacto.\n"
        "12. [ ] 'website': Campo omitido terminantemente (es un spam-trap que invalida la postulación)."
    )
    r_ck.font.name = "Calibri"
    r_ck.font.size = Pt(10)
    r_ck.font.color.rgb = COLOR_SECONDARY

    output_path = r"docs/01-requirements/Kipulux_NEAR_Requerimientos_y_Plan_E2E_Daniel_Fredy_Joseph.docx"
    doc.save(output_path)
    print(f"Documento E2E generado exitosamente en: {output_path}")

if __name__ == "__main__":
    create_document()
