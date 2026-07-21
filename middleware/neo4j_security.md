# Estrategia de Seguridad en Middleware (Node.js & Neo4j)

Dado que Kipulux reemplazará a Supabase por Neo4j (el cual no posee políticas declarativas de Row Level Security - RLS en su versión Community), toda la seguridad a nivel de datos (Data-Level Access Control) debe ser gestionada por nuestra **capa intermedia (Middleware) en Node.js**.

Este documento detalla cómo diseñar esta capa intermedia para prevenir fugas de información y accesos no autorizados (vulnerabilidades tipo BOLA - Broken Object Level Authorization), asegurando que un **Cliente** solo pueda ver productos conectados directamente a su identidad.

---

## 1. Arquitectura de Seguridad Middleware

El principio fundamental es que la base de datos de grafos Neo4j **nunca debe ser consultada directamente por el cliente**. El middleware de Node.js actúa como una barrera aislante que intercepta la petición, verifica la identidad del usuario y modifica el punto de inicio de la consulta del grafo.

```
[ Cliente / Frontend ] 
        │  (HTTP Request + JWT Token)
        ▼
[ API Express / NestJS ] ──▶ [ Middleware: Validar JWT & Rol ]
        │                       │ (Decodifica DNI del token)
        ▼                       ▼
[ Query Builder / Parametrización Cypher ] 
        │ (Forzar ancla en :Cliente {dni_o_ruc: DNI})
        ▼
[ Neo4j Graph Database ]
```

---

## 2. Estrategia de "Anclaje de Consulta" (Query Anchoring)

Para evitar que un cliente consulte un SKU que no le pertenece (simplemente adivinando o alterando el parámetro en la petición), el backend debe **anclar** la consulta de grafos al nodo `Cliente` del usuario autenticado.

### Consulta Insegura (Vulnerable a BOLA)
Si el backend confía ciegamente en el SKU enviado por el cliente:
```cypher
// VULNERABLE: Cualquier usuario autenticado podría consultar el SKU de otro cliente.
MATCH (p:Producto {sku_codigo: $sku_codigo})-[:HEREDA_DE]->(l:LoteCuero)
RETURN p, l
```

### Consulta Segura (Anclada al DNI)
El backend fuerza que el punto de partida del recorrido del grafo comience en el nodo del cliente autenticado. Si el producto no está relacionado con el cliente, el grafo no conectará los nodos y la consulta devolverá **cero registros**:
```cypher
// SEGURA: El recorrido del grafo está condicionado por el enlace directo de venta al cliente.
MATCH (c:Cliente {dni_o_ruc: $dni_usuario})<-[:VENDIDO_A]-(p:Producto {sku_codigo: $sku_codigo})
MATCH (p)-[:HEREDA_DE]->(l:LoteCuero)
RETURN p, l
```

---

## 3. Prevención de Cypher Injection

Al igual que SQL Injection, Neo4j es vulnerable a inyecciones de código Cypher si se concatenan strings dinámicos. 

* **Regla de Oro:** Nunca concatenar variables del usuario en los strings de consulta de Neo4j.
* **Solución:** Utilizar el paso de parámetros nativo del driver oficial de Neo4j (`neo4j-driver`). El driver sanitiza las entradas y optimiza el plan de ejecución de Neo4j.

---

## 4. Implementación de Referencia en Node.js (Express + neo4j-driver)

A continuación se muestra el código modular para implementar esta seguridad en producción:

### A. Middleware de Autenticación (`authMiddleware.js`)
Decodifica el JWT de la cabecera `Authorization` e inyecta la información del usuario en el objeto `req.user`.

```javascript
const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        // decoded debe contener { dni: "00792282", rol: "cliente" }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Token inválido o expirado.' });
    }
}

module.exports = verificarToken;
```

### B. Controlador de Consultas de Trazabilidad Segura (`productoController.js`)
Realiza la consulta a Neo4j usando los parámetros sanitizados del middleware.

```javascript
const neo4j = require('neo4j-driver');

// Inicializar el Driver de Neo4j
const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

async function obtenerMisProductos(req, res) {
    const session = driver.session();
    const dniCliente = req.user.dni; // Extraído del token JWT verificado en el middleware
    const skuBuscado = req.params.sku; // Parámetro de la URL de consulta

    const query = `
        MATCH (c:Cliente {dni_o_ruc: $dniCliente})<-[:VENDIDO_A]-(p:Producto {sku_codigo: $skuBuscado})
        MATCH (art:Artesano)-[:CONFECCIONÓ]->(p)
        MATCH (p)-[:HEREDA_DE]->(loteInmediato:LoteCuero)
        MATCH path = (loteInmediato)-[:SUBDIVIDIDO_DE*0..]->(loteAncestro:LoteCuero)
        WITH p, art, loteInmediato, path
        ORDER BY length(path) DESC
        LIMIT 1
        RETURN 
            p.sku_codigo AS SKU,
            p.status AS Estado,
            p.tx_hash_mint AS HashMint,
            art.nombre_taller AS TallerFabricacion,
            [node IN nodes(path) | {
                id_lote: node.id_lote_cuero,
                certificado_ipfs: node.cid_certificado_ipfs
            }] AS GenealogiaLotes
    `;

    try {
        const result = await session.run(query, {
            dniCliente: dniCliente, // PASADO COMO PARÁMETRO SEGURO (Evita Cypher Injection)
            skuBuscado: skuBuscado
        });

        if (result.records.length === 0) {
            // El producto no existe o NO le pertenece a este DNI.
            // Retornamos 404 por seguridad para no dar pistas al atacante de la existencia del recurso.
            return res.status(404).json({ error: 'Producto no encontrado o no autorizado para este usuario.' });
        }

        const record = result.records[0];
        const data = {
            sku: record.get('SKU'),
            estado: record.get('Estado'),
            hashMint: record.get('HashMint'),
            taller: record.get('TallerFabricacion'),
            lotes: record.get('GenealogiaLotes')
        };

        res.json(data);
    } catch (error) {
        console.error('Error en consulta Neo4j:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    } finally {
        await session.close();
    }
}

module.exports = { obtenerMisProductos };
```

---

## 5. Control de Acceso Basado en Roles (RBAC)

Para cubrir a todos los actores del ecosistema Kipulux, el middleware debe aplicar filtros de anclaje según el rol del usuario decodificado en el JWT:

### Rol: `artesano`
El artesano solo puede ver el detalle de los productos que él mismo confeccionó para auditar su producción o reclamar incentivos:
```cypher
MATCH (a:Artesano {ruc_fabricante: $ruc_artesano})-[:CONFECCIONÓ]->(p:Producto {sku_codigo: $sku_codigo})
...
```

### Rol: `cliente`
El comprador final solo accede a su pasaporte digital del producto tras el registro de la venta en tienda:
```cypher
MATCH (c:Cliente {dni_o_ruc: $dni_cliente})<-[:VENDIDO_A]-(p:Producto {sku_codigo: $sku_codigo})
...
```

### Rol: `cajero` / `admin`
El personal de tienda o auditor puede realizar búsquedas sin filtros de propiedad para gestionar el stock y la cadena de suministro global:
```cypher
MATCH (p:Producto {sku_codigo: $sku_codigo})
...
```
*(Este rol debe tener un endpoint API exclusivo e hiper-protegido con llaves de acceso del sistema corporativo).*
