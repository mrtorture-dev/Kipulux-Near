# Especificación de Requerimientos Funcionales — Kipulux NEAR Protocol (E2E)

## 1. Resumen Ejecutivo del Sistema

**Kipulux** es una plataforma Web2.5 de Pasaporte Digital de Producto (DPP) y certificación inmutable de origen y manufactura para prendas de cuero de alta gama en Perú. Conecta la cadena de valor física y digital (curtiembre -> artesano -> taller -> tienda -> cliente final) integrando:
1. **Contratos Inteligentes en NEAR Protocol (NEP-171/NEP-177)** en WebAssembly (Wasm).
2. **Backend API en Node.js + Express** con servicio Relayer gasless (`near-api-js`).
3. **Persistencia en Grafo con Neo4j** para trazabilidad semántica completa de la cadena de suministro.
4. **Frontend Web SPA** (HTML5 + Tailwind CSS) para administración y consultas públicas.
5. **Aplicación Móvil en Flutter (`KipuLux-Mobile`)** para artesanos y clientes con lectura de chips físicos **NFC** y visualización de pasaportes.

Esta especificación cubre la migración completa E2E desde la red EVM previa hacia **NEAR Protocol**, estructurando el trabajo colaborativo en GitHub para el equipo de 3 desarrolladores: **Daniel**, **Fredy** y **Joseph**.

---

## 2. Mapa de Actores y Roles

| ID | Rol / Actor | Tipo | Responsabilidad Principal | Nivel de Acceso |
|:---|:---|:---|:---|:---|
| **ACT-01** | Bóveda Corporativa / Relayer | Sistema / Agente | Firma transacciones gasless en NEAR, financia el storage staking y administra el contrato. | Propietario (`only_owner` / Admin) |
| **ACT-02** | Artesano (Taller de Cuero) | Humano (App Móvil / Web) | Confecciona la prenda, sube evidencia fotográfica/PDF a IPFS, solicita emisión del pasaporte y graba chip NFC. | Autenticado (Rol Artesano) |
| **ACT-03** | Tienda / Distribuidor | Humano / Negocio (Web) | Recibe la custodia de la prenda física y digital, confirma stock y registra ventas B2C con boleta SUNAT. | Autenticado (Rol Tienda) |
| **ACT-04** | Cliente Final (Comprador) | Humano (App Móvil / Web) | Escanea chip NFC o QR de la prenda, consulta la línea de tiempo en NEAR y almacena su certificado digital. | Público / Autenticado (Rol Cliente) |
| **ACT-05** | Juez / Auditor de Hackathon | Humano / Bot (Codex/Claude) | Valida la reproducibilidad del sistema, verifica contratos y transacciones en `testnet.nearblocks.io`. | Acceso de Solo Lectura / Verificación |

---

## 3. Matriz de Requerimientos Funcionales y Asignación de Equipo

| ID | Requerimiento Funcional | Módulo | Prioridad MoSCoW | Responsable Principal |
|:---|:---|:---|:---|:---|
| **RF-01** | Contrato Inteligente NEP-171 con Metadatos NEP-177 | Smart Contracts | **Must Have** | **Daniel** (Web3 Lead) |
| **RF-02** | Minteo Autorizado de Pasaporte Digital (`mint_authorized`) | Smart Contracts | **Must Have** | **Daniel** (Web3 Lead) |
| **RF-03** | Máquina de Estados del Ciclo de Vida en NEAR | Smart Contracts | **Must Have** | **Daniel** (Web3 Lead) |
| **RF-04** | Transferencia y Custodia de NFT entre Cuentas | Smart Contracts | **Must Have** | **Daniel** (Web3 Lead) |
| **RF-05** | Certificación Fiscal con Hash de Boleta SUNAT | Smart Contracts | **Must Have** | **Daniel** (Web3 Lead) |
| **RF-06** | Gestión de Storage Staking y Depósitos NEAR | Smart Contracts | **Should Have**| **Daniel** (Web3 Lead) |
| **RF-07** | Servicio Relayer Backend con `near-api-js` | Backend API | **Must Have** | **Fredy** (Backend Lead) |
| **RF-08** | Adaptador de Endpoints REST para NEAR en Express | Backend API | **Must Have** | **Fredy** (Backend Lead) |
| **RF-09** | Sincronización Bidireccional de NEAR con Grafo Neo4j | Persistencia | **Must Have** | **Fredy** (Backend Lead) |
| **RF-10** | Web SPA: Pasaporte Digital y Enlace a NEARBlocks | Frontend Web | **Must Have** | **Fredy** (Backend Lead) |
| **RF-11** | App Móvil: Autenticación, Sesión y Soporte de Roles | Mobile Flutter | **Must Have** | **Joseph** (Mobile Lead) |
| **RF-12** | App Móvil: Flujo Artesano con Emisión NEAR y Subida IPFS | Mobile Flutter | **Must Have** | **Joseph** (Mobile Lead) |
| **RF-13** | App Móvil: Pasaporte Digital con Verificación NEARBlocks | Mobile Flutter | **Must Have** | **Joseph** (Mobile Lead) |
| **RF-14** | App Móvil: Vinculación y Verificación Phygital vía Chip NFC | Mobile Flutter | **Must Have** | **Joseph** (Mobile Lead) |
| **RF-15** | Arquitectura de Identidad NEAR y Cuentas Nombradas | Identidad Web3 | **Should Have**| **Daniel, Fredy & Joseph** |
| **RF-16** | Suite E2E de Pruebas, Script Unificado y Showcase Hackathon | DevOps / QA | **Must Have** | **Daniel, Fredy & Joseph** |

---

## 4. Detalle de Requerimientos e Historias de Usuario

---

### 📦 BLOQUE DANIEL: Smart Contracts & NEAR Protocol Core

#### RF-01: Contrato Inteligente NEP-171 con Metadatos NEP-177
**Como** Administrador de Kipulux,  
**Quiero** un contrato inteligente desplegado en NEAR Testnet bajo los estándares NEP-171 y NEP-177,  
**Para** representar cada prenda física como un Pasaporte Digital de Producto único e interoperable en WebAssembly.
* **Criterios de Aceptación:**
  * **Dado** que se compila el contrato en Wasm y se despliega en una cuenta de testnet (ej. `kipulux-core.testnet`),
  * **Cuando** se llama al método de inicialización `new(owner_id, metadata)`,
  * **Entonces** el contrato registra el `owner_id` (Relayer) y establece la metadata global (nombre: "Kipulux Trazabilidad", símbolo: "KIPU").
  * **Excepción:** Si se invoca `new()` sobre un contrato ya inicializado, aborta con `"Contract is already initialized"`.

#### RF-02: Minteo Autorizado de Pasaporte Digital (`mint_authorized`)
**Como** Bóveda Corporativa (Relayer),  
**Quiero** invocar un método `mint_authorized` con los metadatos de la prenda (IPFS CID, descripción, lote de cuero),  
**Para** registrar en NEAR el nacimiento del pasaporte digital sin cobrar gas al artesano.
* **Criterios de Aceptación:**
  * **Dado** que la cuenta que firma es exactamente el `owner_id` del contrato,
  * **Cuando** ejecuta `mint_authorized(token_id, receiver_id, token_metadata)`,
  * **Entonces** el token se acuña a favor de `receiver_id`, su estado inicial se marca como `ORIGINADO` y se emite el evento estándar NEP-171 `nft_mint`.
  * **Excepción:** Si una cuenta no autorizada intenta mintear, se revierte con `"Kipulux: Only owner can mint"`.

#### RF-03: Máquina de Estados del Ciclo de Vida en NEAR
**Como** Auditor del sistema,  
**Quiero** que el contrato mantenga una máquina de estados explícita (`ORIGINADO`, `CUSTODIA`, `VENDIDO`),  
**Para** auditar con certeza matemática en qué etapa de la cadena de suministro se encuentra la prenda.
* **Criterios de Aceptación:**
  * **Dado** un token en estado `ORIGINADO`,
  * **Cuando** se ejecuta la entrega a tienda mediante `actualizar_custodia(token_id)`,
  * **Entonces** el estado interno cambia a `CUSTODIA` y queda indexado en el estado del contrato.
  * **Consulta pública:** El método view `obtener_estado_prenda(token_id)` retorna el estado actual sin costo de gas.

#### RF-04: Transferencia y Custodia de NFT entre Cuentas
**Como** Tienda autorizada,  
**Quiero** que el contrato permita transferir la titularidad del NFT desde el artesano hacia la tienda al recibir el lote físico,  
**Para** garantizar la correspondencia exacta entre posesión física y titularidad digital.
* **Criterios de Aceptación:**
  * **Dado** que una prenda fue confeccionada y enviada a la tienda `tienda-jockey.kipulux.testnet`,
  * **Cuando** el Relayer ejecuta `transferir_custodia(token_id, nueva_tienda_id)`,
  * **Entonces** el NFT cambia de dueño a `nueva_tienda_id`, el estado pasa a `CUSTODIA` y se emite el evento `nft_transfer`.

#### RF-05: Certificación Fiscal con Hash de Boleta SUNAT
**Como** Marca y Comprador,  
**Quiero** registrar el hash criptográfico SHA-256 de la boleta de venta electrónica de la SUNAT al momento de la compra,  
**Para** asegurar inmutabilidad fiscal y combatir la falsificación y reventa ilegítima.
* **Criterios de Aceptación:**
  * **Dado** un token en estado `CUSTODIA` y un comprador `cliente.testnet`,
  * **Cuando** el Relayer llama a `registrar_venta(token_id, comprador_id, hash_boleta_sunat)`,
  * **Entonces** el contrato guarda el `hash_boleta_sunat`, actualiza el estado a `VENDIDO`, transfiere el NFT al `comprador_id` y emite el evento `VentaRegistrada`.
  * **Excepción:** Si el hash es nulo o inválido, la transacción aborta con `"Kipulux: Invalid tax invoice hash"`.

#### RF-06: Gestión de Storage Staking y Depósitos NEAR
**Como** Diseñador del contrato en NEAR,  
**Quiero** que el contrato gestione eficientemente el costo de almacenamiento on-chain (Storage Staking),  
**Para** que la creación de nuevos tokens no falle por falta de depósito y el Relayer pueda subsidiarlo fluidamente.
* **Criterios de Aceptación:**
  * **Dado** que el Relayer emite un nuevo pasaporte digital con metadatos JSON,
  * **Cuando** invoca `mint_authorized` adjuntando el depósito mínimo de NEAR requerido por bytes (`attached_deposit`),
  * **Entonces** el contrato retiene el monto exacto para storage staking y retorna cualquier excedente al Relayer.

---

### 💻 BLOQUE FREDY: Backend API, Relayer & Web Platform

#### RF-07: Servicio Relayer Backend con `near-api-js`
**Como** Desarrollador Backend,  
**Quiero** un módulo de servicio `nearService.js` en Node.js que mantenga una conexión RPC activa y un KeyStore seguro,  
**Para** abstraer la interacción blockchain de los controladores de negocio y firmar transacciones gasless.
* **Criterios de Aceptación:**
  * **Dado** que el servidor Express inicia con variables de entorno `.env.near`,
  * **Cuando** se carga `services/nearService.js`,
  * **Entonces** el servicio se conecta exitosamente al RPC de NEAR Testnet y valida el saldo del Relayer corporativo.
  * **Resiliencia:** Si el RPC responde con timeout, se aplican hasta 3 reintentos con backoff exponencial antes de devolver error HTTP 503.

#### RF-08: Adaptador de Endpoints REST para NEAR en Express
**Como** Aplicación Cliente (Web o App Móvil),  
**Quiero** endpoints REST estándar (`POST /api/productos/mintear`, `POST /api/tiendas/transferir`, `POST /api/ventas/certificar`),  
**Para** interactuar con la red NEAR mediante llamadas HTTP JSON transparentes.
* **Criterios de Aceptación:**
  * **Dado** un payload válido con los datos de la prenda y el artesano autenticado,
  * **Cuando** se hace una petición `POST /api/productos/mintear`,
  * **Entonces** el backend sube la metadata a IPFS, llama a `nearService.mintAuthorized()`, recibe el hash de transacción de NEAR y devuelve código HTTP 201 con `nearTxHash` y `tokenId`.

#### RF-09: Sincronización Bidireccional de NEAR con Grafo Neo4j
**Como** Arquitecto de Datos,  
**Quiero** que cada transacción confirmada en NEAR actualice el grafo de conocimiento en Neo4j,  
**Para** mantener sincronizados los nodos de `Producto`, `Artesano`, `Tienda` y `Cliente` con sus hashes on-chain.
* **Criterios de Aceptación:**
  * **Dado** que la transacción en NEAR retornó un `receipt_id` y `token_id`,
  * **Cuando** el controlador procesa la respuesta,
  * **Entonces** ejecuta una consulta Cypher en Neo4j vinculando las propiedades `nearTokenId`, `nearTxHash`, `receiptId` y `blockchainStatus: "ORIGINADO"` al nodo `Producto`.

#### RF-10: Web SPA: Pasaporte Digital y Enlace a NEARBlocks
**Como** Cliente final o visitante web,  
**Quiero** abrir `pasaporte.html` viendo la línea de tiempo y los enlaces oficiales a NEARBlocks,  
**Para** verificar independientemente la autenticidad de mi prenda en un explorador público de blockchain.
* **Criterios de Aceptación:**
  * **Dado** un visitante que consulta `pasaporte.html?id=KIPU-001`,
  * **Cuando** carga la página,
  * **Entonces** la UI renderiza el estado de la prenda, el artesano creador, el hash de la boleta SUNAT y el botón *"Verificar en NEARBlocks"* que abre `https://testnet.nearblocks.io/txns/<txHash>`.

---

### 📱 BLOQUE JOSEPH: Mobile App & Phygital Experience (`KipuLux-Mobile`)

#### RF-11: App Móvil: Autenticación, Sesión y Soporte de Roles
**Como** Usuario de la app móvil (Artesano o Cliente),  
**Quiero** iniciar sesión con mis credenciales seguras o crear una cuenta de cliente desde la app,  
**Para** acceder al shell de navegación correspondiente a mi rol.
* **Criterios de Aceptación:**
  * **Dado** un usuario que ingresa sus credenciales en `login_screen.dart`,
  * **Cuando** el backend responde exitosamente con el JWT y el campo `type`,
  * **Entonces** la app almacena de forma cifrada el token en `flutter_secure_storage` y construye las rutas de `go_router` acordes al rol (Artesano: Prendas, Registrar, Verificar; Cliente: Mis prendas, Verificar).

#### RF-12: App Móvil: Flujo Artesano con Emisión NEAR y Subida IPFS
**Como** Artesano de cuero en su taller,  
**Quiero** registrar una nueva prenda capturando fotos y adjuntando el certificado de curtido desde `registrar_prenda_screen.dart`,  
**Para** que el sistema suba los archivos a IPFS y solicite la emisión del pasaporte digital en NEAR Protocol.
* **Criterios de Aceptación:**
  * **Dado** un artesano que completa el formulario con selección de lote padre, fotos de la prenda y PDF de curtiembre,
  * **Cuando** presiona "Registrar Prenda",
  * **Entonces** la app envía el multipart request al backend, recibe la confirmación con el `nearTxHash`, muestra un modal de éxito con el identificador del NFT emitido y ofrece la opción inmediata de "Vincular Chip NFC".

#### RF-13: App Móvil: Pasaporte Digital con Verificación NEARBlocks
**Como** Cliente final que compró una prenda de lujo,  
**Quiero** abrir `pasaporte_screen.dart` y ver la línea de tiempo completa del producto con la insignia de certificación NEAR,  
**Para** conocer el taller de confección, la curtiembre y acceder con 1 toque a la prueba criptográfica en el explorador.
* **Criterios de Aceptación:**
  * **Dado** un cliente que selecciona una prenda en "Mis Prendas",
  * **Cuando** carga la pantalla del pasaporte,
  * **Entonces** se muestran los datos de origen, el hash de la boleta SUNAT, una tarjeta con el badge "Certificado en NEAR Protocol" y un botón interactivo que utiliza `url_launcher` para abrir la transacción en `https://testnet.nearblocks.io/txns/<nearTxHash>`.

#### RF-14: App Móvil: Vinculación y Verificación Phygital vía Chip NFC
**Como** Artesano o Cliente comprador,  
**Quiero** acercar mi smartphone al chip NFC integrado físicamente en el cuero de la prenda,  
**Para** vincular el UID físico al NFT de NEAR (artesano) o validar su autenticidad instantánea en la tienda o calle (cliente).
* **Criterios de Aceptación:**
  * **Escenario 1 (Vinculación por Artesano):**
    * **Dado** un artesano en `vincular_nfc_screen.dart`,
    * **Cuando** aproxima el teléfono al chip NFC de la prenda,
    * **Entonces** `nfc_service.dart` lee el UID del chip, lo envía al endpoint `/api/nfc/vincular` asociándolo al `sku` y al `nearTokenId`, mostrando confirmación verde.
  * **Escenario 2 (Verificación por Cliente):**
    * **Dado** cualquier usuario en `verify_screen.dart`,
    * **Cuando** aproxima el teléfono al chip NFC de cualquier prenda Kipulux,
    * **Entonces** la app lee el UID, consulta `/api/nfc/verificar/:uid`, valida la autenticidad y redirige automáticamente a la pantalla del pasaporte digital correspondiente con el estado on-chain de NEAR.

---

### 🤝 BLOQUE COLABORATIVO: Daniel, Fredy & Joseph

#### RF-15: Arquitectura de Identidad NEAR y Cuentas Nombradas
* **Daniel:** Crea las subcuentas oficiales en NEAR Testnet (`artesano.kipulux.testnet`, `tienda.kipulux.testnet`, `relayer.kipulux.testnet`).
* **Fredy:** Configura en el backend la resolución entre DNI/RUC de los usuarios y sus cuentas NEAR legibles.
* **Joseph:** Adapta la app móvil para mostrar las cuentas nombradas humanas en lugar de hashes ilegibles en los perfiles y certificados.

#### RF-16: Suite E2E de Pruebas, Script Unificado y Showcase Hackathon
* **Daniel:** Documenta el diff de código en `README.md` (Regla Q-002) y asegura la compatibilidad con el evaluador automático de la hackathon (**Claude Code / Codex**).
* **Fredy:** Integra el script maestro `scripts/demo/run-demo-near.js` que ejecuta todo el ciclo en 1 solo comando.
* **Joseph:** Genera la APK de prueba y graba la interacción móvil con lectura NFC para el video de presentación en X (Twitter).
