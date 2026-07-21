# 📖 Catálogo de APIs para Desarrolladores Frontend: Kipulux MVP

Este catálogo detalla la especificación técnica de todos los endpoints disponibles en el backend de Kipulux (`http://localhost:3005`). Está diseñado para que los desarrolladores frontend puedan integrar las peticiones `fetch` de forma rápida y sin errores.

---

## 🔑 Resumen de Cabeceras (Headers) de Autenticación
Todos los endpoints protegidos requieren obligatoriamente la cabecera `Authorization` con un token JWT válido:
```http
Authorization: Bearer <accessToken>
```

---

## 1. Módulo de Autenticación

### 🔐 Iniciar Sesión (`POST /api/auth/mock-login`)
Permite iniciar sesión a cualquier actor (Tienda, Artesano o Cliente). El backend valida contra el grafo Neo4j.

* **Content-Type:** `application/json`
* **Cuerpo de Petición (Request Body):**
  ```json
  {
    "identifier": "artesano_cusco",
    "password": "Artesano123!"
  }
  ```
  *(Nota: El identifier puede ser el username o el email del actor).*

* **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": "2h",
    "type": "Artesano",
    "dni_o_ruc": "20555444333"
  }
  ```
  *(Nota: `type` puede ser `Artesano`, `Tienda` o `Cliente`. El frontend debe guardar el `accessToken` en el `localStorage` y usarlo en las siguientes cabeceras).*

* **Respuesta con Error (`401 Unauthorized`):**
  ```json
  {
    "error": "Contraseña incorrecta."
  }
  ```

---

## 2. Módulo de la Tienda (Onboarding & B2C)

### 🧑‍🎨 Onboarding de Artesano (`POST /api/tiendas/registrar-artesano`)
*Ruta Protegida (Exclusivo para Tiendas).* Registra a un nuevo proveedor en la red, creándole credenciales de ingreso y una wallet EVM en la blockchain.

* **Headers Requeridos:** `Authorization: Bearer <TiendaToken>`
* **Content-Type:** `application/json`
* **Cuerpo de Petición (Request Body):**
  ```json
  {
    "RUC_Fabricante": "20111222333",
    "nombre_taller": "Taller Premium Nieto - Cusco",
    "email": "taller.premium@gmail.com",
    "ubigeo": "080101"
  }
  ```
* **Respuesta Exitosa (`201 Created`):**
  ```json
  {
    "message": "Artesano registrado y credenciales generadas exitosamente.",
    "RUC_Fabricante": "20111222333",
    "username": "artesano_2233_x4gf",
    "password": "nkrwrrtz",
    "address": "0x36C5B5Eab16ce2E87e227Bc205048D9f653eC445",
    "credentials": {
      "username": "artesano_2233_x4gf",
      "password": "nkrwrrtz",
      "eth_address": "0x36C5B5Eab16ce2E87e227Bc205048D9f653eC445",
      "address": "0x36C5B5Eab16ce2E87e227Bc205048D9f653eC445"
    }
  }
  ```

---

### 🛍️ Comercialización y Venta B2C (`POST /api/productos/vender`)
*Ruta Protegida (Exclusivo para Tiendas).* Transfiere la propiedad del NFT de la prenda al cliente final y ancla la boleta XML on-chain de forma transparente.

* **Headers Requeridos:** `Authorization: Bearer <TiendaToken>`
* **Content-Type:** `application/json`
* **Cuerpo de Petición (Request Body):**
  ```json
  {
    "SKU_Producto_Final": "KIPU-CUERO-001",
    "DNI_O_RUC_Comprador": "00792282",
    "Nro_Comprobante_Pago": "B001-00029384",
    "wallet_address_comprador": "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "xml_boleta": "<invoice><id>B001-00029384</id><total>150.00</total></invoice>"
  }
  ```
* **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "message": "Venta procesada y certificada con éxito en zkSyscoin y Neo4j.",
    "sku": "KIPU-CUERO-001",
    "tokenId": "1",
    "comprador": "00792282",
    "hashSUNAT": "0x66e273c280866f6bfc21494006861d18f47a3d4ffdeaa9eccc37280bde14d515",
    "txHash": "0x101fde9b9e52fdc1c300cf8161ec91618c5545aff16c68efbb5b3ac3641d4b1f"
  }
  ```

---

## 3. Módulo del Artesano (Manufactura & B2B)

### 🔨 Registro de Prenda / Mint NFT (`POST /api/productos/crear`)
*Ruta Protegida (Exclusivo para Artesanos).* Sube los archivos a la persistencia local de IPFS, genera `metadata-[SKU].json` y realiza el Mint de la prenda en la Blockchain en estado `ORIGINADO`.

* **Headers Requeridos:** `Authorization: Bearer <ArtesanoToken>`
* **Content-Type:** `multipart/form-data`
* **Cuerpo de Petición (FormData):**
  * `SKU_Producto_Final` (Texto) -> ej: `KIPU-CUERO-004`
  * `ID_Lote_Cuero_Utilizado` (Texto) -> ej: `LOTE-NIETO-003`
  * `Foto_Producto` (Archivo Binario) -> Archivo de imagen (`.png`, `.jpg`)
  * `PDF_Certificado_Previo` (Archivo Binario) -> Archivo PDF (`.pdf`)

* **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "message": "Producto registrado y certificado con éxito.",
    "SKU_Producto_Final": "KIPU-CUERO-004",
    "tokenId": "4",
    "txHash": "0x7ea271b0ff0fe2e84d5d11d384463f680f12069ac8e1ff76aebc5f85d6e4e916"
  }
  ```
  *(Nota: Los archivos subidos se hacen públicos bajo `/uploads/[nombre_archivo]` en el backend).*

---

### 🚚 Despacho Logístico B2B (`POST /api/productos/transferir-a-tienda`)
*Ruta Protegida (Exclusivo para Artesanos).* Transfiere la custodia digital y propiedad del NFT de la prenda del Artesano a la Tienda de destino.

* **Headers Requeridos:** `Authorization: Bearer <ArtesanoToken>`
* **Content-Type:** `application/json`
* **Cuerpo de Petición (Request Body):**
  ```json
  {
    "SKU_Producto_Final": "KIPU-CUERO-004",
    "RUC_Tienda_Destino": "20600123456"
  }
  ```
* **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "message": "Custodia del NFT transferida exitosamente a la Tienda.",
    "sku": "KIPU-CUERO-004",
    "tiendaRuc": "20600123456",
    "txHash": "0x6df515b7ff0af991cb1f86c8a7b838bdeb786063a5791a670bdd10ff2d743020"
  }
  ```

---

## 4. Módulo del Cliente Final

### 🗃️ Historial de Compras (`GET /api/clientes/historial-compras`)
*Ruta Protegida (Exclusivo para Clientes).* Obtiene el historial completo de las prendas compradas por el cliente autenticado (extraído automáticamente de su JWT), agrupadas por la Tienda origen de venta.

* **Headers Requeridos:** `Authorization: Bearer <ClienteToken>`
* **Content-Type:** `application/json`
* **Respuesta Exitosa (`200 OK`):**
  ```json
  [
    {
      "id_tienda": "20600123456",
      "nombre_tienda": "Tienda Cusco - Kipulux",
      "productos": [
        {
          "SKU_Producto_Final": "KIPU-CUERO-001",
          "status": "VENDIDO",
          "Foto_Producto": "/uploads/foto-KIPU-CUERO-001.png",
          "PDF_Certificado_Previo": "/uploads/certificado-KIPU-CUERO-001.pdf"
        }
      ]
    }
  ]
  ```

---

### 🔍 Consulta de Pasaporte Digital / Trazabilidad (`GET /api/productos/:sku`)
*Ruta Protegida (Exclusivo para Clientes - Control de Seguridad BOLA).* Recupera toda la genealogía del lote, los datos del artesano fabricante, fecha e información de la tienda custodia y el comprobante de SUNAT.

* **Headers Requeridos:** `Authorization: Bearer <ClienteToken>`
* **Parámetro Path:** `sku` (ej: `KIPU-CUERO-001`)
* **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "sku": "KIPU-CUERO-001",
    "status": "VENDIDO",
    "Foto_Producto": "/uploads/foto-KIPU-CUERO-001.png",
    "PDF_Certificado_Previo": "/uploads/certificado-KIPU-CUERO-001.pdf",
    "taller_artesano": "Taller Alda Sur - Cusco",
    "RUC_Fabricante": "20555444333",
    "Nro_Comprobante_Pago": "B001-00029384",
    "Hash_Comprobante_Pago": "0x66e273c280866f6bfc21494006861d18f47a3d4ffdeaa9eccc37280bde14d515",
    "nombre_tienda": "Tienda Cusco - Kipulux",
    "id_tienda": "20600123456",
    "lotes": [
      {
        "ID_Lote_Cuero_Utilizado": "LOTE-NIETO-003",
        "ruc_curtiembre": "20777888999",
        "PDF_Certificado_Previo": "QmYwAPJ88CZ21GCg69B3Y9ff62XSp23tKCTsF4C4rJ8B1D"
      },
      {
        "ID_Lote_Cuero_Utilizado": "LOTE-HIJO-002",
        "ruc_curtiembre": "20777888999",
        "PDF_Certificado_Previo": "QmXoypizjW3WknFixtdKL9B2D7QsNTkwVKzEA48g8Ss65D"
      },
      {
        "ID_Lote_Cuero_Utilizado": "LOTE-PADRE-001",
        "ruc_curtiembre": "20777888999",
        "PDF_Certificado_Previo": "QmXoypizjW3WknFixtdKL9B2D7QsNTkwVKzEA48g8Ss65D"
      }
    ]
  }
  ```
  *(Nota: Si el cliente autenticado no es el comprador del producto en la relación de base de datos, el endpoint devuelve `404 Not Found` por seguridad BOLA).*

---

## 5. Módulo de Utilidades y Debug

### 🧪 Sembrado de Base de Datos (`POST /api/debug/seed`)
Limpia todas las tablas del DBMS de Neo4j local y siembra datos iniciales de prueba (tiendas, clientes, artesanos base y linaje de lotes).

* **Content-Type:** `application/json`
* **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "message": "Base de datos de Neo4j sembrada exitosamente.",
    "nodos": "9",
    "relaciones": "16"
  }
  ```
