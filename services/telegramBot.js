const axios = require('axios');
const neo4j = require('neo4j-driver');
const crypto = require('crypto');
const { listTokenOnMarketplace, buyTokenFromMarketplace } = require('./blockchain');
require('dotenv').config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'SUSTITUIR_POR_TOKEN';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// Neo4j config (Reusing from env)
const uri = process.env.NEO4J_URI || 'neo4j://127.0.0.1:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'Tu_Contraseña_De_Neo4j_Desktop_Aquí';
const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

// KMS descifrado (Reusing logic)
const jwtSecret = process.env.JWT_SECRET || 'Kipulux_Clave_Secreta_Segura_2026';
const encryptionAlgorithm = 'aes-256-cbc';
const kmsKey = crypto.scryptSync(jwtSecret, 'salt_kms_2026', 32);

function descifrarClavePrivada(encryptedString) {
    if (!encryptedString) return null;
    const textParts = encryptedString.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(encryptionAlgorithm, kmsKey, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

/**
 * Enviar mensaje simple
 */
async function sendMessage(chatId, text, replyMarkup = null) {
    const payload = { chat_id: chatId, text, parse_mode: 'Markdown' };
    if (replyMarkup) {
        payload.reply_markup = replyMarkup;
    }
    try {
        await axios.post(`${TELEGRAM_API}/sendMessage`, payload);
    } catch (e) {
        console.error('[Telegram] Error sending message:', e.response ? e.response.data : e.message);
    }
}

/**
 * Main Webhook Handler
 */
async function handleTelegramWebhook(req, res) {
    // Siempre responder 200 a Telegram lo antes posible
    res.status(200).send('OK');

    const update = req.body;
    
    // Manejar Mensajes de Texto
    if (update.message && update.message.text) {
        const chatId = update.message.chat.id;
        const text = update.message.text.trim();
        const username = update.message.from.username || update.message.from.first_name;

        // ==========================
        // COMANDO /start
        // ==========================
        if (text.startsWith('/start')) {
            // Check if user provided DNI: /start 77778888
            const parts = text.split(' ');
            if (parts.length === 2) {
                const dni = parts[1];
                const session = driver.session();
                try {
                    const result = await session.run(`
                        MATCH (c:Cliente {DNI_O_RUC_Comprador: $dni})
                        SET c.telegram_chat_id = $chatId
                        RETURN c
                    `, { dni, chatId: chatId.toString() });

                    if (result.records.length > 0) {
                        await sendMessage(chatId, `¡Bienvenido a *Kipulux*, ${username}!\n\nTu cuenta (DNI: ${dni}) ha sido enlazada exitosamente a tu wallet segura KMS.\n\nUsa /catalogo para ver el mercado secundario o /misprendas para ver tu bóveda.`);
                    } else {
                        await sendMessage(chatId, `❌ No se encontró ningún cliente con el DNI ${dni}. Si acabas de comprar en tienda, asegúrate de escribir el DNI correctamente.`);
                    }
                } finally {
                    await session.close();
                }
            } else {
                await sendMessage(chatId, `¡Hola ${username}! Soy el bot de *Kipulux*.\n\nPara enlazar tu cuenta y billetera KMS, responde con el comando:\n\`/start TU_DNI\``);
            }
        }

        // ==========================
        // COMANDO /catalogo
        // ==========================
        else if (text === '/catalogo') {
            const session = driver.session();
            try {
                const result = await session.run(`
                    MATCH (p:Producto {status: 'EN_VENTA'})
                    MATCH (p)<-[:LISTADO_EN_MARKETPLACE {is_active: true}]-(seller:Cliente)
                    RETURN p.SKU_Producto_Final AS sku, p.nombre AS nombre, p.precio_mercado AS precio
                `);

                if (result.records.length === 0) {
                    await sendMessage(chatId, '🛒 *Marketplace*\n\nActualmente no hay artículos listados en el mercado secundario.');
                } else {
                    let msg = '🛒 *Catálogo Marketplace Secundario*\n\n';
                    const buttons = [];
                    
                    result.records.forEach(r => {
                        const sku = r.get('sku');
                        const nombre = r.get('nombre') || sku;
                        const precio = r.get('precio');
                        msg += `🔹 *${nombre}* (SKU: ${sku})\n💰 Precio: ${precio} SYS\n\n`;
                        
                        buttons.push([{ text: `Comprar ${sku}`, callback_data: `buy_${sku}` }]);
                    });

                    await sendMessage(chatId, msg, { inline_keyboard: buttons });
                }
            } finally {
                await session.close();
            }
        }

        // ==========================
        // COMANDO /misprendas
        // ==========================
        else if (text === '/misprendas') {
            const session = driver.session();
            try {
                // Verificar quién es
                const userRes = await session.run(
                    `MATCH (c:Cliente {telegram_chat_id: $chatId}) RETURN c.DNI_O_RUC_Comprador AS dni`,
                    { chatId: chatId.toString() }
                );
                
                if (userRes.records.length === 0) {
                    await sendMessage(chatId, '❌ Primero debes enlazar tu cuenta usando `/start TU_DNI`.');
                    return;
                }

                const dni = userRes.records[0].get('dni');
                
                // Buscar propiedades
                const prodRes = await session.run(`
                    MATCH (c:Cliente {DNI_O_RUC_Comprador: $dni})-[:PROPIEDAD_DE]->(p:Producto)
                    WHERE p.status = 'VENDIDO'
                    RETURN p.SKU_Producto_Final AS sku, p.nombre AS nombre
                `, { dni });

                if (prodRes.records.length === 0) {
                    await sendMessage(chatId, '📦 *Tu Bóveda*\n\nNo tienes prendas disponibles para vender (o ya están publicadas).');
                } else {
                    let msg = '📦 *Tus Prendas Kipulux*\n\nSelecciona una prenda para listarla en el Marketplace:\n';
                    const buttons = [];
                    
                    prodRes.records.forEach(r => {
                        const sku = r.get('sku');
                        const nombre = r.get('nombre') || sku;
                        
                        buttons.push([{ text: `Listar ${sku} (Vender)`, callback_data: `list_${sku}` }]);
                    });

                    await sendMessage(chatId, msg, { inline_keyboard: buttons });
                }
            } finally {
                await session.close();
            }
        }
    }

    // ==========================
    // MANEJO DE CALLBACKS (Botones)
    // ==========================
    if (update.callback_query) {
        const chatId = update.callback_query.message.chat.id;
        const data = update.callback_query.data; // e.g., 'buy_SKU' or 'list_SKU'
        const callbackId = update.callback_query.id;

        // Responder al callback rápidamente para que Telegram no muestre un reloj de carga
        try {
            await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackId });
        } catch(e){}

        const session = driver.session();

        try {
            // Encontrar el DNI del usuario de telegram
            const userRes = await session.run(
                `MATCH (c:Cliente {telegram_chat_id: $chatId}) RETURN c.DNI_O_RUC_Comprador AS dni, c.kms_encrypted_key AS kmsKey`,
                { chatId: chatId.toString() }
            );

            if (userRes.records.length === 0) {
                await sendMessage(chatId, '❌ Cuenta no enlazada.');
                return;
            }

            const dni = userRes.records[0].get('dni');
            const kmsKey = userRes.records[0].get('kmsKey');

            if (data.startsWith('buy_')) {
                const sku = data.split('_')[1];
                await sendMessage(chatId, `⏳ Iniciando compra de *${sku}* mediante Smart Contract Escrow... Por favor espera.`);
                
                try {
                    // Llamar lógica de compra similar a /api/marketplace/comprar
                    const infoRes = await session.run(`
                        MATCH (p:Producto {SKU_Producto_Final: $sku, status: 'EN_VENTA'})
                        MATCH (buyer:Cliente {DNI_O_RUC_Comprador: $dni})
                        MATCH (seller:Cliente)-[l:LISTADO_EN_MARKETPLACE {is_active: true}]->(p)
                        RETURN p.nft_token_id AS tokenId, p.precio_mercado AS precioSys, 
                               seller.DNI_O_RUC_Comprador AS sellerDni
                    `, { sku, dni });

                    if (infoRes.records.length === 0) {
                        await sendMessage(chatId, '❌ Producto no disponible o ya fue vendido.');
                        return;
                    }
                    
                    const tokenId = infoRes.records[0].get('tokenId');
                    const precioSys = infoRes.records[0].get('precioSys');
                    const sellerDni = infoRes.records[0].get('sellerDni');
                    const privateKey = descifrarClavePrivada(kmsKey);

                    // Blockchian tx
                    await buyTokenFromMarketplace(tokenId, precioSys, privateKey);

                    // Update Neo4j
                    await session.run(`
                        MATCH (p:Producto {SKU_Producto_Final: $sku})
                        MATCH (seller:Cliente {DNI_O_RUC_Comprador: $sellerDni})-[l:LISTADO_EN_MARKETPLACE]->(p)
                        MATCH (seller)-[prop:PROPIEDAD_DE]->(p)
                        MATCH (buyer:Cliente {DNI_O_RUC_Comprador: $dni})
                        SET p.status = 'VENDIDO', l.is_active = false
                        DELETE prop
                        MERGE (buyer)-[:PROPIEDAD_DE {fecha: datetime()}]->(p)
                        MERGE (seller)-[:VENDIÓ_A_CLIENTE {fecha: datetime(), precio: $precio}]->(buyer)
                    `, { sku, sellerDni, dni, precio: precioSys });

                    await sendMessage(chatId, `✅ ¡Felicidades! Has comprado exitosamente la prenda *${sku}*. El NFT ya está en tu wallet KMS.`);
                } catch(err) {
                    console.error(err);
                    await sendMessage(chatId, `❌ Error en la transacción Escrow: ${err.message}`);
                }

            } else if (data.startsWith('list_')) {
                const sku = data.split('_')[1];
                const precioFijo = 150; // HARDCODED por simplicidad del bot, en prod se pediría al usuario.

                await sendMessage(chatId, `⏳ Listando *${sku}* por ${precioFijo} SYS en el Escrow... Aprobando Smart Contract.`);
                
                try {
                    const prodRes = await session.run(`
                        MATCH (c:Cliente {DNI_O_RUC_Comprador: $dni})-[:PROPIEDAD_DE]->(p:Producto {SKU_Producto_Final: $sku})
                        MATCH (t:Tienda)-[:VENDIÓ]->(p)
                        RETURN p.nft_token_id AS tokenId, t.wallet_address AS storeWallet
                    `, { dni, sku });

                    if (prodRes.records.length === 0) {
                        await sendMessage(chatId, '❌ No eres dueño de este producto.');
                        return;
                    }

                    const tokenId = prodRes.records[0].get('tokenId');
                    const storeWallet = prodRes.records[0].get('storeWallet') || '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
                    const privateKey = descifrarClavePrivada(kmsKey);

                    // Blockchain tx
                    await listTokenOnMarketplace(tokenId, precioFijo, storeWallet, privateKey);

                    // Neo4j update
                    await session.run(`
                        MATCH (c:Cliente {DNI_O_RUC_Comprador: $dni})-[:PROPIEDAD_DE]->(p:Producto {SKU_Producto_Final: $sku})
                        SET p.status = 'EN_VENTA', p.precio_mercado = $precio
                        MERGE (c)-[l:LISTADO_EN_MARKETPLACE]->(p)
                        SET l.is_active = true, l.fecha = datetime()
                    `, { dni, sku, precio: precioFijo });

                    await sendMessage(chatId, `✅ Tu producto *${sku}* ha sido listado públicamente por ${precioFijo} SYS.\n\nCualquier usuario puede verlo en /catalogo.`);
                } catch(err) {
                    console.error(err);
                    await sendMessage(chatId, `❌ Error listando el producto: ${err.message}`);
                }
            }
        } finally {
            await session.close();
        }
    }
}

module.exports = {
    handleTelegramWebhook
};
