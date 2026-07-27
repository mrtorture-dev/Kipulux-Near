const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf8');

// Replace require block (Line 13)
content = content.replace(
/<<<<<<< HEAD\r?\nconst \{ registrarVenta.*?\}\s*=\s*require\('\.\/services\/blockchain'\);\r?\n=======\r?\nconst \{ registrarVenta.*?\}\s*=\s*require\('\.\/services\/blockchain'\);\r?\nconst simplefact = require\('\.\/services\/simplefact'\);\r?\n>>>>>>> origin\/main/s,
`const { registrarVenta, ejecutarTransferenciaOnChain, ejecutarMintOnChain, listTokenOnMarketplace, buyTokenFromMarketplace } = require('./services/blockchain');\nconst simplefact = require('./services/simplefact');`
);

// Replace /api/productos/vender req body parsing
content = content.replace(
/<<<<<<< HEAD\r?\napp\.post\('\/api\/productos\/vender', async \(req, res\) => \{\r?\n    const \{ SKU_Producto_Final, tiendaRuc, DNI_O_RUC_Comprador, Nro_Comprobante_Pago, wallet_address_comprador \} = req\.body;\r?\n    const xml_boleta = req\.body\.xml_boleta \|\| '<Factura><Mock><\/Mock><\/Factura>';\r?\n=======\r?\napp\.post\('\/api\/productos\/vender', authenticateToken, checkRole\(\['Tienda', 'Admin'\]\), async \(req, res\) => \{\r?\n    const \{\r?\n        SKU_Producto_Final,\r?\n        tiendaRuc,\r?\n        compradorDniRuc,\r?\n        wallet_address_comprador,\r?\n        numero_boleta,\r?\n        nombreCliente,\r?\n        emailCliente,\r?\n        montoVenta\r?\n    \} = req\.body;\r?\n>>>>>>> origin\/main/s,
`app.post('/api/productos/vender', authenticateToken, checkRole(['Tienda', 'Admin']), async (req, res) => {
    const { 
        SKU_Producto_Final, 
        tiendaRuc, 
        compradorDniRuc: DNI_O_RUC_Comprador, 
        wallet_address_comprador, 
        numero_boleta: Nro_Comprobante_Pago,
        nombreCliente,
        emailCliente,
        montoVenta
    } = req.body;
    const xml_boleta = req.body.xml_boleta || '<Factura><Mock></Mock></Factura>';`
);

// ID Unico y Auto Generador
content = content.replace(
/<<<<<<< HEAD\r?\n        const findResult = await session\.run\(`\r?\n            MATCH \(p:Producto \{SKU_Producto_Final: \$sku\}\)\r?\n            MATCH \(p\)<-\[:CUSTODIA\]-\(t:Tienda \{id_tienda: \$tiendaRuc\}\)\r?\n            RETURN p\.status AS status, p\.nft_token_id AS tokenId, p\.id_unico AS idUnico\r?\n            LIMIT 1\r?\n        `, \{\r?\n            sku: SKU_Producto_Final,\r?\n            tiendaRuc\r?\n        \}\);\r?\n=======\r?\n        const findResult = await session\.run\(`\r?\n            MATCH \(p:Producto \{SKU_Producto_Final: \$sku\}\)\r?\n            MATCH \(p\)<-\[:CUSTODIA\]-\(t:Tienda \{id_tienda: \$tiendaRuc\}\)\r?\n            RETURN p\.status AS status, p\.nft_token_id AS tokenId\r?\n            LIMIT 1\r?\n        `, \{ sku: SKU_Producto_Final, tiendaRuc \}\);\r?\n>>>>>>> origin\/main/s,
`        const findResult = await session.run(\`
            MATCH (p:Producto {SKU_Producto_Final: $sku})
            MATCH (p)<-[:CUSTODIA]-(t:Tienda {id_tienda: $tiendaRuc})
            RETURN p.status AS status, p.nft_token_id AS tokenId, p.id_unico AS idUnico
            LIMIT 1
        \`, { sku: SKU_Producto_Final, tiendaRuc });`
);

// TokenID Check
content = content.replace(
/<<<<<<< HEAD\r?\n        if \(!tokenId \|\| !idUnico\) \{\r?\n            return res\.status\(400\)\.json\(\{ error: 'El producto no posee un NFT Token ID o id_unico registrado\.' \}\);\r?\n=======\r?\n        \/\/ Decodificar tokenId a formato primitivo string si viene de Neo4j Integer\r?\n        if \(tokenId !== undefined && tokenId !== null && typeof tokenId === 'object' && typeof tokenId\.toString === 'function'\) \{\r?\n            tokenId = tokenId\.toString\(\);\r?\n        \}\r?\n\r?\n        if \(!tokenId\) \{\r?\n            return res\.status\(400\)\.json\(\{ error: 'El producto no posee un NFT Token ID registrado\.' \}\);\r?\n>>>>>>> origin\/main/s,
`        // Decodificar tokenId a formato primitivo string si viene de Neo4j Integer
        if (tokenId !== undefined && tokenId !== null && typeof tokenId === 'object' && typeof tokenId.toString === 'function') {
            tokenId = tokenId.toString();
        }

        if (!tokenId || !idUnico) {
            return res.status(400).json({ error: 'El producto no posee un NFT Token ID o id_unico registrado.' });`
);

// Delete the remaining <<<<<<< HEAD blocks that we partially replaced
content = content.replace(/<<<<<<< HEAD[\s\S]*?=======\s*\r?\n/g, '');
content = content.replace(/>>>>>>> origin\/main\r?\n/g, '');

fs.writeFileSync('server.js', content, 'utf8');

// For other files, let's just checkout --ours because the UI changes and validation changes are purely ours for Phase 3
const { execSync } = require('child_process');
execSync('git checkout --ours middlewares/validation.js public/index_colleague.html');
console.log("Resolved");
