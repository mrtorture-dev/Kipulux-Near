const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const TIMEOUT_MS = 5000;

/**
 * Genera un comprobante de boleta sintético para fallback (modo MOCK o cuando falla la API).
 * 
 * @param {string} rucEmisor 
 * @param {string} dniRucComprador 
 * @param {string} sku 
 * @param {number} montoTotal 
 * @returns {Object} Comprobante de boleta sintético
 */
function generarBoletaSintetica(rucEmisor, dniRucComprador, sku, montoTotal = 250.00) {
    const timestamp = Date.now();
    const serie_numero = `MOCK-B001-${timestamp}`;
    const comprobante_str = `<invoice>` +
        `<issuer>${rucEmisor || '20600123456'}</issuer>` +
        `<customer>${dniRucComprador || '00000000'}</customer>` +
        `<item><sku>${sku || 'MOCK-SKU'}</sku><total>${Number(montoTotal).toFixed(2)}</total></item>` +
        `<issued_at>${new Date(timestamp).toISOString()}</issued_at>` +
        `<mock>true</mock>` +
        `</invoice>`;
    
    const hashHex = crypto.createHash('sha256').update(comprobante_str, 'utf8').digest('hex');
    const hashFiscal = `0x${hashHex}`;
    const enlace_pdf = `https://api.simplefact.pe/v1/pdf/${serie_numero}`;
    const enlace_xml = `https://api.simplefact.pe/v1/xml/${serie_numero}`;

    console.log(`[SimpleFact Client] Emisión sintética MOCK ejecutada. Boleta: ${serie_numero} | Hash: ${hashFiscal}`);

    return {
        success: true,
        serie_numero,
        enlace_pdf,
        enlace_xml,
        comprobante_str,
        // Aliases para compatibilidad
        numeroBoleta: serie_numero,
        xmlBoleta: comprobante_str,
        hashFiscal,
        isMock: true
    };
}

/**
 * Emite un comprobante / boleta electrónica ante SUNAT utilizando la API de SimpleFact.
 * Incluye circuit breaker / fallback sintético si el token es 'mock', si ocurre timeout (>5000ms) o error de red.
 * 
 * @param {Object} datosVenta 
 * @returns {Promise<{
 *   success: boolean,
 *   serie_numero: string,
 *   enlace_pdf: string,
 *   enlace_xml: string,
 *   comprobante_str: string,
 *   hashFiscal: string,
 *   isMock: boolean
 * }>}
 */
async function emitirComprobante(datosVenta = {}) {
    const rucEmisor = datosVenta.rucEmisor || datosVenta.emisor_ruc || datosVenta.ruc_emisor || process.env.SIMPLEFACT_RUC_EMISOR || '20600123456';
    const dniRucComprador = datosVenta.dniRucComprador || datosVenta.dni_ruc_comprador || datosVenta.DNI_O_RUC_Comprador || '00000000';
    const nombreComprador = datosVenta.nombreComprador || datosVenta.nombre_comprador || 'Comprador Kipulux';
    const emailComprador = datosVenta.emailComprador || datosVenta.email_comprador || 'cliente@kipulux.com';
    const sku = datosVenta.sku || datosVenta.SKU_Producto_Final || 'SKU-000';
    const montoTotal = datosVenta.montoTotal !== undefined ? datosVenta.montoTotal : (datosVenta.monto_total !== undefined ? datosVenta.monto_total : 250.00);

    const apiUrl = process.env.SIMPLEFACT_API_URL || 'https://api.simplefact.pe/v1';
    const bearerToken = process.env.SIMPLEFACT_TOKEN_BEARER || 'mock';

    // Fallback inmediato si el token está configurado en 'mock' o no existe
    if (bearerToken === 'mock' || !bearerToken) {
        console.log('[SimpleFact Client] Módulo en modo MOCK. Generando boleta sintética...');
        return generarBoletaSintetica(rucEmisor, dniRucComprador, sku, montoTotal);
    }

    const payload = {
        emisor_ruc: rucEmisor,
        comprador: {
            num_documento: dniRucComprador,
            tipo_documento: String(dniRucComprador).length === 11 ? '6' : '1',
            nombre: nombreComprador,
            email: emailComprador
        },
        items: [
            {
                sku: sku,
                descripcion: `Prenda Certificada de Cuero Kipulux (SKU: ${sku})`,
                cantidad: 1,
                precio_unitario: montoTotal,
                monto_total: montoTotal
            }
        ],
        moneda: 'PEN'
    };

    try {
        console.log(`[SimpleFact Client] Enviando solicitud HTTP a ${apiUrl}/boletas (Timeout: ${TIMEOUT_MS}ms)...`);
        
        const response = await axios.post(`${apiUrl}/boletas`, payload, {
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json'
            },
            timeout: TIMEOUT_MS
        });

        const { numero_comprobante, xml_firmado, enlace_pdf, enlace_xml } = response.data || {};
        const serie_numero = numero_comprobante || `B001-${Date.now()}`;
        const comprobante_str = xml_firmado || `<invoice><number>${serie_numero}</number><sku>${sku}</sku></invoice>`;
        
        const hashHex = crypto.createHash('sha256').update(comprobante_str, 'utf8').digest('hex');
        const hashFiscal = `0x${hashHex}`;

        const pdfUrl = enlace_pdf || `${apiUrl}/pdf/${serie_numero}`;
        const xmlUrl = enlace_xml || `${apiUrl}/xml/${serie_numero}`;

        return {
            success: true,
            serie_numero,
            enlace_pdf: pdfUrl,
            enlace_xml: xmlUrl,
            comprobante_str,
            // Aliases para compatibilidad
            numeroBoleta: serie_numero,
            xmlBoleta: comprobante_str,
            hashFiscal,
            isMock: false
        };

    } catch (error) {
        console.warn(`[SimpleFact Client] Fallo en API SimpleFact (${error.message}). Activando fallback sintético MOCK...`);
        return generarBoletaSintetica(rucEmisor, dniRucComprador, sku, montoTotal);
    }
}

// Alias para compatibilidad previa
const emitirBoletaElectronica = emitirComprobante;

module.exports = {
    emitirComprobante,
    emitirBoletaElectronica,
    generarBoletaSintetica
};
