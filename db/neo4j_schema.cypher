// ==========================================
// 1. RESTRICCIONES DE UNICIDAD (CONSTRAINTS)
// ==========================================
// Garantizan que los identificadores de negocio sean únicos e indexen automáticamente
// para búsquedas y conexiones instantáneas O(1).

CREATE CONSTRAINT artesano_ruc IF NOT EXISTS
FOR (a:Artesano) REQUIRE a.RUC_Fabricante IS UNIQUE;

CREATE CONSTRAINT lotecuero_id IF NOT EXISTS
FOR (l:LoteCuero) REQUIRE l.ID_Lote_Cuero_Utilizado IS UNIQUE;

CREATE CONSTRAINT producto_sku IF NOT EXISTS
FOR (p:Producto) REQUIRE p.SKU_Producto_Final IS UNIQUE;

CREATE CONSTRAINT cliente_dni IF NOT EXISTS
FOR (c:Cliente) REQUIRE c.DNI_O_RUC_Comprador IS UNIQUE;


// ==========================================
// 2. DATOS DE PRUEBA (MOCK DATA)
// ==========================================
// Generamos un árbol de herencia de cuero de 3 niveles:
// Lote Padre (curtiembre) -> Lote Hijo (corte) -> Lote Nieto (producción)
// Y asociamos el producto al artesano y al cliente final.

// A. Crear Artesano
CREATE (art:Artesano {
    RUC_Fabricante: "20123456789",
    nombre_taller: "Taller Alda Sur - Cusco",
    email: "taller.aldasur@gmail.com"
})

// B. Crear Lote de Cuero Padre (Origen principal en Curtiembre)
CREATE (lotePadre:LoteCuero {
    ID_Lote_Cuero_Utilizado: "LOTE-PADRE-001",
    ruc_curtiembre: "20555444333",
    PDF_Certificado_Previo: "QmXoypizjW3WknFixtdKL9B2D7QsNTkwVKzEA48g8Ss65D"
})

// C. Crear Lote de Cuero Hijo (Subdivisión de corte) y relacionarlo
CREATE (loteHijo:LoteCuero {
    ID_Lote_Cuero_Utilizado: "LOTE-HIJO-002",
    ruc_curtiembre: "20555444333",
    PDF_Certificado_Previo: "QmXoypizjW3WknFixtdKL9B2D7QsNTkwVKzEA48g8Ss65D"
})
CREATE (loteHijo)-[:SUBDIVIDED_FROM]->(lotePadre)

// D. Crear Lote de Cuero Nieto (Retazo final asignado para la cartera) y relacionarlo
CREATE (loteNieto:LoteCuero {
    ID_Lote_Cuero_Utilizado: "LOTE-NIETO-003",
    ruc_curtiembre: "20555444333",
    PDF_Certificado_Previo: "QmYwAPJ88CZ21GCg69B3Y9ff62XSp23tKCTsF4C4rJ8B1D"
})
CREATE (loteNieto)-[:SUBDIVIDED_FROM]->(loteHijo)

// E. Crear Producto (Cartera/Billetera física)
CREATE (prod:Producto {
    SKU_Producto_Final: "BC007NN",
    Foto_Producto: "https://alda.com.pe/wp-content/uploads/2025/07/Billetera-caballero_Mesa-de-trabajo-1-copia-18.png",
    nft_token_id: "1",
    tx_hash_mint: "0x6d9742dc0b1d1cc50a80c9c335f9acde85b656ab00a8a9219ad63a382575ff6c",
    status: "VENDIDO"
})

// F. Crear Relaciones del Producto (Confección y Herencia de Cuero)
CREATE (prod)-[:MANUFACTURED_BY]->(art)
CREATE (prod)-[:SUBDIVIDED_FROM]->(loteNieto)

// G. Crear Cliente Final
CREATE (cli:Cliente {
    DNI_O_RUC_Comprador: "00792282",
    nombre_completo: "Juan Pérez",
    wallet_address: "0x0000000000000000000000000000000000000000000000000000000000000000"
})

// H. Registrar la Venta
CREATE (prod)-[:OWNED_BY {
    fecha: datetime("2026-06-24T17:00:00-05:00"),
    Hash_Comprobante_Pago: "0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    Nro_Comprobante_Pago: "B001-00029384"
}]->(cli);


// ==========================================
// 3. CONSULTA DE AUDITORÍA Y TRAZABILIDAD
// ==========================================
// Dado el SKU del producto, recorre el grafo hacia atrás para obtener:
// 1. El artesano fabricante.
// 2. El lote de cuero inmediato.
// 3. Toda la cadena jerárquica de subdivisión de lotes (recursividad SUBDIVIDED_FROM*0..).
// Retorna un único registro estructurado con la información consolidada.

MATCH (p:Producto {SKU_Producto_Final: "BC007NN"})
MATCH (p)-[:MANUFACTURED_BY]->(art:Artesano)
MATCH (p)-[:SUBDIVIDED_FROM]->(loteInmediato:LoteCuero)
// Recorrido de longitud variable hacia atrás (0 a N saltos) para capturar toda la genealogía
MATCH path = (loteInmediato)-[:SUBDIVIDED_FROM*0..]->(loteAncestro:LoteCuero)
// Nos quedamos con el camino más largo (el que llega al lote raíz original)
WITH p, art, loteInmediato, path
ORDER BY length(path) DESC
LIMIT 1
RETURN 
    p.SKU_Producto_Final AS SKU,
    p.status AS EstadoActual,
    p.tx_hash_mint AS HashMintBlockchain,
    {
        ruc: art.RUC_Fabricante,
        taller: art.nombre_taller,
        email: art.email
    } AS Fabricante,
    {
        id_lote_inmediato: loteInmediato.ID_Lote_Cuero_Utilizado,
        curtiembre: loteInmediato.ruc_curtiembre,
        certificado: loteInmediato.PDF_Certificado_Previo
    } AS LoteDirecto,
    [node IN nodes(path) | {
        id_lote: node.ID_Lote_Cuero_Utilizado,
        curtiembre: node.ruc_curtiembre,
        certificado_ipfs: node.PDF_Certificado_Previo
    }] AS GenealogiaCompletaLotes;
