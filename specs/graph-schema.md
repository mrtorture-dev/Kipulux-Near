# Especificación del Contrato de Datos del Grafo (Neo4j)

Esta especificación sirve como guía inmutable para la estructura, unicidad y conexiones relacionales en la base de datos de grafos de **Kipulux**.

---

## 1. Nodos (Entidades)

Cada etiqueta de nodo posee una propiedad clave indexada de manera única en el grafo.

### 1.1 `(:Artesano)`
Representa al maestro artesano o taller de manufactura en origen.
* **Propiedades:**
  * `ruc_fabricante` (String, **Llave Primaria / UNIQUE CONSTRAINT**): RUC de 11 dígitos del taller formal.
  * `nombre_taller` (String): Razón social o denominación del taller.
  * `email` (String): Correo de contacto del taller.

### 1.2 `(:LoteCuero)`
Representa un lote logístico de cuero procedente de una curtiembre acreditada.
* **Propiedades:**
  * `id_lote_cuero` (String, **Llave Primaria / UNIQUE CONSTRAINT**): Identificador alfanumérico único del lote.
  * `ruc_curtiembre` (String): RUC de la curtiembre que curtió y emitió el material.
  * `cid_certificado_ipfs` (String): Hash IPFSv0 conteniendo los certificados SENASA y análisis de efluentes (VMA) de las etapas 1 y 2.

### 1.3 `(:Producto)`
Representa una unidad física serializada única (Pasaporte de Producto) e inconfundible.
* **Propiedades:**
  * `sku_codigo` (String, **Llave Primaria / UNIQUE CONSTRAINT**): Serial único de la pieza física (ej. `KIPU-CUERO-001`).
  * `status` (String): Estado operativo actual de la pieza (`ORIGINADO` | `CUSTODIA` | `VENDIDO`).
  * `nft_token_id` (String): ID autoincremental del token NFT minteado en zkSyscoin.
  * `tx_hash_mint` (String): Hash de la transacción blockchain del minteo.
  * `foto_url` (String): URL persistente de la fotografía de calidad tomada en el taller.

### 1.4 `(:Cliente)`
Representa al comprador final que adquiere y ostenta la propiedad del NFT.
* **Propiedades:**
  * `dni_o_ruc` (String, **Llave Primaria / UNIQUE CONSTRAINT**): Documento nacional de identidad (8 dígitos) o RUC (11 dígitos).
  * `nombre_completo` (String): Nombre o razón social del comprador.
  * `wallet_address` (String): Dirección hexadecimal pública de la wallet del comprador (ej. `0x7f11...`).

---

## 2. Relaciones (Conexiones y Semántica)

Las relaciones en Neo4j son dirigidas y conectan las entidades del ciclo logístico de Kipulux.

```
(:Artesano)-[:CONFECCIONÓ]->(:Producto)-[:HEREDA_DE]->(:LoteCuero)
(:Producto)-[:CONFECCIONADO_POR]->(:Artesano)
(:Producto)-[:PROVIENE_DE]->(:LoteCuero)
(:Producto)-[:VENDIDO_A]->(:Cliente)
(:LoteCuero)-[:SUBDIVIDIDO_DE]->(:LoteCuero)
```

### 2.1 Confección y Manufactura
* **Relaciones Duales por Compatibilidad del API:**
  * `(a:Artesano)-[:CONFECCIONÓ]->(p:Producto)`  
    *Dirección:* Del Artesano fabricante hacia el Producto.
  * `(p:Producto)-[:CONFECCIONADO_POR]->(a:Artesano)`  
    *Dirección:* Del Producto hacia el Artesano fabricante.

### 2.2 Herencia de Lote de Cuero
* **Relaciones Duales por Compatibilidad del API:**
  * `(p:Producto)-[:HEREDA_DE]->(l:LoteCuero)`  
    *Dirección:* Del Producto hacia el Lote de Cuero nieto inmediato del taller.
  * `(p:Producto)-[:PROVIENE_DE]->(l:LoteCuero)`  
    *Dirección:* Del Producto hacia el Lote de Cuero nieto inmediato del taller.

### 2.3 Genealogía del Cuero (Parent-Child)
* `(lHijo:LoteCuero)-[:SUBDIVIDIDO_DE]->(lPadre:LoteCuero)`  
  *Dirección:* Auto-referencia dirigida desde el lote derivado (hijo/nieto) hacia su lote predecesor (padre/hijo). Permite el recorrido de trazabilidad variable recursivo.

### 2.4 Transacción de Venta
* `(p:Producto)-[r:VENDIDO_A]->(c:Cliente)`  
  *Dirección:* Del Producto hacia el Cliente comprador.
  * **Propiedades de la relación:**
    * `fecha` (Datetime): Marca de tiempo ISO de la venta.
    * `hash_boleta` (String): Hash SHA-256 de la boleta de venta (bytes32).
    * `tx_hash_venta` (String): Hash de la transacción de venta confirmada on-chain en zkSyscoin.
