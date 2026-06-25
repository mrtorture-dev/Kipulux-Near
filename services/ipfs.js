const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Guarda físicamente un archivo en local (carpeta public/uploads) y retorna un CID de IPFS simulado.
 * @param {Buffer} buffer Contenido binario del archivo
 * @param {string} fileName Nombre original del archivo
 * @returns {Promise<{success: boolean, cid: string, fileName: string, url: string}>}
 */
async function subirAIPFS(buffer, fileName) {
    try {
        // Asegurar que exista el directorio public/uploads
        const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Escribir el archivo en disco local
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, buffer);

        // Generar Hash SHA-256 simulando CID de IPFS
        const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
        const mockCid = `QmMockIPFSHashLocal${fileHash.substring(0, 26)}`;

        console.log(`[Mock IPFS] Archivo guardado localmente: public/uploads/${fileName} | CID Simulado: ${mockCid}`);

        return {
            success: true,
            cid: mockCid,
            fileName: fileName,
            url: `/uploads/${fileName}`
        };

        /*
        // =========================================================================
        // PRODUCTION MIGRATION HOOK: Integración con Pinata IPFS API
        // =========================================================================
        // Para migrar a Pinata en producción, puedes usar Axios de la siguiente forma:
        
        const axios = require('axios');
        const FormData = require('form-data');
        
        const formData = new FormData();
        formData.append('file', buffer, { filename: fileName });
        
        const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
            maxBodyLength: 'Infinity',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
                'pinata_api_key': process.env.PINATA_API_KEY,
                'pinata_secret_api_key': process.env.PINATA_API_SECRET
            }
        });
        
        return {
            success: true,
            cid: response.data.IpfsHash,
            fileName: fileName,
            url: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`
        };
        // =========================================================================
        */

    } catch (error) {
        console.error('[Mock IPFS] Error al guardar archivo localmente:', error);
        throw error;
    }
}

module.exports = {
    subirAIPFS
};
