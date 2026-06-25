# 📦 Kipulux: Pasaporte Digital & Trazabilidad Premium Web2.5

¡Bienvenido a **Kipulux**! Esta plataforma es una solución híbrida Web2.5 diseñada para asegurar la trazabilidad inmutable y certificación de origen de prendas de cuero premium en el mercado peruano. Kipulux conecta de manera elegante la robustez y flexibilidad de las bases de datos de grafos con la inmutabilidad y seguridad de la tecnología Blockchain.

---

## 🏗️ 1. Arquitectura del Sistema (Resumen Ejecutivo)

Kipulux opera bajo una arquitectura de tres capas sincronizada de extremo a extremo:

1. **Frontend SPA (Single Page Application):** Una interfaz reactiva y de alta fidelidad estética, construida con HTML5 nativo, JavaScript vanilla interactivo (`app.js` integrado en la SPA) y Tailwind CSS. Implementa vistas condicionales por rol (`Artesano`, `Tienda` y `Cliente`) y un renderizador visual de la línea de tiempo del producto.
2. **Backend (Express API):** Un servidor Node.js + Express estructurado de forma modular. Utiliza `multer` para procesar flujos multimedia en memoria, Zod para la validación estricta de esquemas de datos de negocio y el driver oficial de Neo4j para consultas optimizadas de trazabilidad.
3. **Persistencia de Relaciones (Neo4j):** Una base de datos orientada a grafos local. Mapea la cadena de suministro completa mediante nodos (`LoteCuero`, `Artesano`, `Producto`, `Tienda`, `Cliente`) y relaciones semánticas estandarizadas (tales como `SUBDIVIDIDO_DE`, `CONFECCIONADO_POR`, `ENTREGADO_A` y `PROPIEDAD_DE`).
4. **Capa Blockchain/Web3 (Hardhat / zkSyscoin):** Un Smart Contract de trazabilidad (`ERC-721`) desplegado sobre la red zkSyscoin. Cuenta con un **Relayer corporativo gasless** que firma y ejecuta las transacciones en nombre de los artesanos y tiendas en segundo plano, resguardando sus claves privadas.

### 🛡️ Capas de Seguridad Críticas Implementadas
* **Blindaje contra Vulnerabilidades BOLA (Broken Object Level Authorization):** Implementación de políticas de *Query Anchoring* donde el identificador del usuario (DNI o RUC) se extrae directamente del payload verificado de los tokens JWT de sesión. Ningún actor puede modificar la URL para espiar prendas de otros clientes.
* **Resguardo Cifrado de Claves (KMS Simulado):** Cifrado simétrico de claves privadas EVM usando el algoritmo estándar de la industria `AES-256-CBC` con derivación criptográfica de claves mediante `crypto.scryptSync`. Las claves privadas de los artesanos nunca viajan al frontend ni se muestran en texto plano.

---

## 📋 2. Prerrequisitos del Sistema

Para levantar el proyecto en tu entorno local, asegúrate de contar con:

* **Node.js:** Versión `v18.0.0` o superior (se recomienda LTS v20+ / v22+).
* **Neo4j Desktop:** Instalado y configurado con una base de datos local activa.
* **Navegador Web:** Chrome, Brave o Edge (con soporte de consola y localStorage activo).

### ⚙️ Configuración Paso a Paso de Neo4j Desktop
1. Abre **Neo4j Desktop** y crea un nuevo proyecto llamado `Kipulux`.
2. Añade un **Local DBMS** con versión `5.x` (o la disponible por defecto).
3. Establece la contraseña del DBMS como `your_neo4j_password_here` (o la contraseña de tu preferencia, que luego inyectarás en el `.env`).
4. Haz clic en el botón **Start** del DBMS y espera a que el estado cambie a **Active (color verde)**. El DBMS estará listo para escuchar conexiones en el puerto por defecto `bolt://localhost:7687`.

---

## 🔐 3. Configuración de Variables de Entorno (`.env`)

El sistema requiere un archivo `.env` en la raíz del proyecto para leer las configuraciones críticas. Al iniciar los servicios con el integrador local, este archivo se autogenera, pero es importante que conozcas su estructura didáctica:

```env
# =========================================================================
# CONFIGURACIÓN DE LA BLOCKCHAIN (LOCAL HARDHAT O TESTNET ZKSYSCOIN)
# =========================================================================
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337

# Cuenta de despliegue del Relayer corporativo
VAULT_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Dirección del Smart Contract KipuluxTrazabilidad (inyectada tras deploy)
NEO4J_OR_BLOCKCHAIN_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3

# =========================================================================
# CONFIGURACIÓN DE PERSISTENCIA ORIENTADA A GRAFOS (NEO4J)
# =========================================================================
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password_here

# =========================================================================
# SEGURIDAD, KMS Y AUTENTICACIÓN
# =========================================================================
JWT_SECRET=your_jwt_secret_key_here
PORT=3005
```

---

## 🚀 4. Guía de Instalación y Levantamiento Paso a Paso

Sigue esta secuencia exacta de comandos en tu terminal de Windows/PowerShell o bash para inicializar Kipulux:

### Paso 1: Clonar e instalar dependencias
Instala todas las librerías necesarias del proyecto (incluyendo Express, Neo4j Driver, Viem para la interacción Web3 y Multer para archivos):
```bash
npm install
```

### Paso 2: Compilar y levantar la infraestructura local
Kipulux incluye un script integrador (`scripts/start_all.js`) que levanta el nodo blockchain local de Hardhat, compila y despliega el Smart Contract de trazabilidad, purga y siembra el grafo de Neo4j e inicia el servidor Express en un solo comando:
```bash
node scripts/start_all.js
```
*Espera unos 6-8 segundos a que se imprima en consola: `[Server] Backend Corporativo Kipulux corriendo en http://localhost:3005`*.

### Paso 3: Abrir e interactuar con la aplicación
Abre tu navegador de preferencia y entra en:
👉 **[http://localhost:3005](http://localhost:3005)**

*(Para explorar y probar interactivamente las llamadas a los endpoints de la API, también puedes visitar la documentación interactiva en **[http://localhost:3005/api-docs](http://localhost:3005/api-docs)**).*

---

## 🕹️ 5. Guía de Pruebas en Vivo: El Flujo E2E

Sigue esta guía secuencial en la UI del navegador para simular el ciclo de vida del producto de cuero:

### Paso 0: Purgado y Sembrado de Datos
* **Acción:** Presiona el botón flotante en la esquina inferior izquierda: **"Sembrar Base de Datos Neo4j"**.
* **Resultado:** Se vaciará la base de datos Neo4j y se re-inyectarán los lotes de cuero de origen (`LOTE-NIETO-003`, etc.) junto con usuarios de prueba. Recibirás una notificación de éxito.

### Paso 1: Onboarding de Artesano
* **Actor:** Tienda Cusco (Login: `tienda_cusco` / `Tienda123!`).
* **Acción:** Dirígete a la pestaña **Panel Tienda** y rellena el formulario de onboarding con el RUC `20111222333` y nombre `Taller Premium Nieto`. Presiona **"Registrar Artesano"**.
* **Detalle Técnico:** El backend genera criptográficamente una nueva wallet EVM y su llave privada, la cifra de forma simétrica mediante AES-256-CBC de manera transparente y expone un panel verde con su `usuario` y `contraseña` autogenerados. La llave privada queda custodiada de forma ultra-segura.

### Paso 2: Manufactura del Producto (Pasaporte Digital)
* **Actor:** Artesano Nieto (Inicia sesión con las credenciales mostradas en la Fase 1).
* **Acción:** Entra al **Panel Artesano**, escribe el SKU `KIPU-CUERO-999` y asócialo al lote `LOTE-NIETO-003`. Sube una imagen real de tu computadora en el campo de Foto y un archivo PDF en el Certificado. Presiona **"Registrar y Mintear NFT"**.
* **Detalle Técnico:** El backend almacena la foto y el PDF en `public/uploads/` asignándoles un CID criptográfico basado en su hash SHA-256 (simulación IPFS), escribe localmente el archivo de metadatos `metadata-KIPU-CUERO-999.json` y acuña el NFT en la blockchain mandando la tx a la wallet del artesano usando el relayer.

### Paso 3: Despacho Logístico B2B (Fase B)
* **Actor:** Artesano Fabricante.
* **Acción:** En el mismo panel, ve al formulario de transferencia B2B, ingresa el SKU `KIPU-CUERO-999` y el RUC de la Tienda `20600123456`. Presiona **"Transferir Custodia NFT"**.
* **Detalle Técnico:** La custodia digital del NFT se transfiere en la blockchain a la wallet de la Tienda. En Neo4j, se actualiza el estado del producto a `EN_TIENDA` y se crea la relación física y digital bajo el enlace semántico `ENTREGADO_A`.

### Paso 4: Comercialización B2C (Fase C)
* **Actor:** Tienda Cusco (Login: `tienda_cusco` / `Tienda123!`).
* **Acción:** En el **Panel Tienda**, ve a la sección de Venta B2C, escribe el SKU `KIPU-CUERO-999`, el DNI del comprador `00792282`, factura `B001-00055443` y su wallet EVM. Selecciona un archivo XML local y haz clic en **"Registrar Venta & Transferir NFT"**.
* **Detalle Técnico:** El backend calcula el hash SHA-256 de la boleta de manera interna y firma la transacción on-chain. El NFT se transfiere al cliente, el estado cambia a `VENDIDO` y se crea la relación de propiedad `PROPIEDAD_DE` resguardando la información personal.

### Paso 5: Consulta del Comprador Final
* **Actor:** Cliente Juan Pérez (Login: `cliente_juan` / `Cliente123!`).
* **Acción:** En el **Panel Cliente**, verás la tarjeta de la prenda con su imagen real subida. Haz clic en **"Certificado"** para descargar el PDF original o presiona **"Trazabilidad"** para renderizar la línea de tiempo vertical interactiva (Lote ➔ Artesano ➔ Tienda ➔ Venta Final).

---

## 🚨 6. Solución de Problemas Frecuentes (Troubleshooting)

### Error de Conexión de Neo4j (`Neo4jError: Failed to connect to server...`)
* **Solución 1:** Asegúrate de que el DBMS en Neo4j Desktop esté encendido y en color verde (**Active**).
* **Solución 2:** Revisa que el puerto en el archivo `.env` coincida con la configuración de tu Neo4j Desktop (usualmente `bolt://localhost:7687`).
* **Solución 3:** Si tu entorno local exige deshabilitar SSL/cifrado de conexiones, asegúrate de que tu cadena de conexión empiece con `bolt://` en lugar de `neo4j://` en las variables de entorno.

### Limpieza y Reseteo Rápido de Pruebas
Si deseas limpiar toda la base de datos orientada a grafos y resetearla a su estado semilla inicial de manera rápida:
1. Haz clic en el botón flotante **"Sembrar Base de Datos Neo4j"** en el frontend.
2. Alternativamente, puedes ejecutar la siguiente query Cypher directo en el Neo4j Browser para borrar todo el contenido:
   ```cypher
   MATCH (n) DETACH DELETE n
   ```
   Y luego reiniciar el script `scripts/start_all.js` para volver a crear las restricciones de unicidad y usuarios iniciales.
