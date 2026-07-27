const assert = require('assert');
const crypto = require('crypto');
const http = require('http');
const simplefact = require('../services/simplefact');
const { ventaSchema } = require('../middlewares/validation');

describe('SimpleFact Service Unit Tests', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('should export emitirComprobante and emitirBoletaElectronica functions', () => {
        assert.strictEqual(typeof simplefact.emitirComprobante, 'function');
        assert.strictEqual(typeof simplefact.emitirBoletaElectronica, 'function');
    });

    it('should emit synthetic mock invoice when SIMPLEFACT_TOKEN_BEARER = "mock" with required payload fields', async () => {
        process.env.SIMPLEFACT_TOKEN_BEARER = 'mock';

        const datosVenta = {
            rucEmisor: '20600123456',
            dniRucComprador: '72849102',
            nombreComprador: 'Maria Garcia',
            emailComprador: 'maria@example.com',
            sku: 'SKU-TEST-001',
            montoTotal: 350.00
        };

        const res = await simplefact.emitirComprobante(datosVenta);

        assert.strictEqual(res.success, true);
        assert.strictEqual(res.isMock, true);
        
        // Assert required payload fields exist
        assert.strictEqual(typeof res.serie_numero, 'string');
        assert.ok(res.serie_numero.startsWith('MOCK-B001-'));
        
        assert.strictEqual(typeof res.enlace_pdf, 'string');
        assert.ok(res.enlace_pdf.startsWith('https://api.simplefact.pe/v1/pdf/MOCK-B001-'));

        assert.strictEqual(typeof res.enlace_xml, 'string');
        assert.ok(res.enlace_xml.startsWith('https://api.simplefact.pe/v1/xml/MOCK-B001-'));

        assert.strictEqual(typeof res.comprobante_str, 'string');
        assert.ok(res.comprobante_str.includes('<invoice>'));
        assert.ok(res.comprobante_str.includes('<issuer>20600123456</issuer>'));
        assert.ok(res.comprobante_str.includes('<customer>72849102</customer>'));
        assert.ok(res.comprobante_str.includes('<sku>SKU-TEST-001</sku>'));
        assert.ok(res.comprobante_str.includes('<total>350.00</total>'));
    });

    it('should calculate valid 66-character SHA-256 SUNAT hash starting with 0x (0x + 64 hex chars)', async () => {
        process.env.SIMPLEFACT_TOKEN_BEARER = 'mock';
        const res = await simplefact.emitirComprobante({ sku: 'SKU-HASH-TEST' });
        
        const expectedHashHex = crypto.createHash('sha256').update(res.comprobante_str, 'utf8').digest('hex');
        const expectedBytes32 = `0x${expectedHashHex}`;

        assert.strictEqual(res.hashFiscal, expectedBytes32);
        assert.strictEqual(res.hashFiscal.length, 66);
        assert.ok(res.hashFiscal.startsWith('0x'));
        assert.ok(/^0x[0-9a-fA-F]{64}$/.test(res.hashFiscal));
    });

    it('should fallback gracefully on simulated network connection failure when SIMPLEFACT_TOKEN_BEARER is non-mock', async () => {
        process.env.SIMPLEFACT_TOKEN_BEARER = 'real_bearer_token_123';
        process.env.SIMPLEFACT_API_URL = 'http://127.0.0.1:59999'; // Non-existent server endpoint

        const res = await simplefact.emitirComprobante({
            rucEmisor: '20600123456',
            dniRucComprador: '72849102',
            sku: 'SKU-NET-FAIL'
        });

        assert.strictEqual(res.success, true);
        assert.strictEqual(res.isMock, true);
        assert.ok(res.serie_numero.startsWith('MOCK-B001-'));
        assert.strictEqual(typeof res.enlace_pdf, 'string');
        assert.strictEqual(typeof res.enlace_xml, 'string');
        assert.strictEqual(typeof res.comprobante_str, 'string');
        assert.strictEqual(res.hashFiscal.length, 66);
        assert.ok(res.hashFiscal.startsWith('0x'));
    });

    it('should fallback gracefully on simulated network timeout (>5000ms) when SIMPLEFACT_TOKEN_BEARER is non-mock', async function () {
        this.timeout(10000); // Allow test to run up to 10s for 5000ms timeout simulation

        // Create a local dummy HTTP server that delays response for 5500ms
        const server = http.createServer((req, res) => {
            setTimeout(() => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ numero_comprobante: 'REAL-B001-999' }));
            }, 5500);
        });

        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        const port = server.address().port;

        process.env.SIMPLEFACT_TOKEN_BEARER = 'real_bearer_token_456';
        process.env.SIMPLEFACT_API_URL = `http://127.0.0.1:${port}`;

        const startTime = Date.now();
        const res = await simplefact.emitirComprobante({
            rucEmisor: '20600123456',
            dniRucComprador: '72849102',
            sku: 'SKU-TIMEOUT-TEST'
        });
        const duration = Date.now() - startTime;

        server.close();

        // Assert fallback executed after ~5000ms timeout
        assert.ok(duration >= 4900, `Execution duration ${duration}ms should be at least ~5000ms`);
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.isMock, true); // Fallback activated
        assert.ok(res.serie_numero.startsWith('MOCK-B001-'));
        assert.strictEqual(typeof res.enlace_pdf, 'string');
        assert.strictEqual(typeof res.enlace_xml, 'string');
        assert.strictEqual(typeof res.comprobante_str, 'string');
        assert.strictEqual(res.hashFiscal.length, 66);
        assert.ok(res.hashFiscal.startsWith('0x'));
    });
});

describe('Zod VentaSchema Fiscal Validation Tests', () => {
    it('should validate request payload containing fiscal fields without strict error', () => {
        const payload = {
            SKU_Producto_Final: 'SKU-LUX-99',
            dni_ruc_comprador: '76543210',
            nombre_comprador: 'Carlos Ruiz',
            email_comprador: 'carlos@kipulux.pe',
            wallet_address_comprador: '0x1234567890123456789012345678901234567890',
            monto_total: 500.00
        };

        const result = ventaSchema.safeParse(payload);
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.data.dni_ruc_comprador, '76543210');
        assert.strictEqual(result.data.nombre_comprador, 'Carlos Ruiz');
    });

    it('should validate request payload with classic DNI_O_RUC_Comprador field', () => {
        const payload = {
            SKU_Producto_Final: 'SKU-LUX-88',
            DNI_O_RUC_Comprador: '10456789012',
            wallet_address_comprador: '0xabcdef0123456789abcdef0123456789abcdef01'
        };

        const result = ventaSchema.safeParse(payload);
        assert.strictEqual(result.success, true);
    });

    it('should reject invalid unknown additional fields due to .strict()', () => {
        const payload = {
            SKU_Producto_Final: 'SKU-LUX-77',
            dni_ruc_comprador: '76543210',
            wallet_address_comprador: '0x1234567890123456789012345678901234567890',
            campo_invalido_hacker: 'malicious_data'
        };

        const result = ventaSchema.safeParse(payload);
        assert.strictEqual(result.success, false);
    });
});
