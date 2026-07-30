const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud';

// Determina si opera en modo Mock de desarrollo
const isMockMode = !PINATA_JWT || PINATA_JWT === 'PEGAR_AQUI_TU_JWT_DE_PINATA' || PINATA_JWT.trim() === '';

/**
 * Sube un archivo a IPFS utilizando la API de Pinata.
 * Si no hay JWT configurado, guarda el archivo localmente en public/uploads y simula un CID.
 * @param {Buffer} fileBuffer Buffer con contenido del archivo
 * @param {string} fileName Nombre del archivo
 * @param {string} mimeType Tipo MIME del archivo
 * @returns {Promise<string>} URI estandarizado: ipfs://<IpfsHash>
 */
async function uploadFileToIPFS(fileBuffer, fileName, mimeType) {
    if (isMockMode) {
        const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, fileBuffer);

        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        const mockCid = `QmMockIPFSHashLocal${fileHash.substring(0, 26)}`;
        console.log(`[Mock IPFS Service] Archivo guardado localmente: /uploads/${fileName} | Mock CID: ${mockCid}`);
        return `ipfs://${mockCid}`;
    }

    try {
        const formData = new FormData();
        const fileBlob = new Blob([fileBuffer], { type: mimeType });
        formData.append('file', fileBlob, fileName);

        const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PINATA_JWT}`
            },
            body: formData
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Error en API Pinata: ${res.status} - ${errText}`);
        }

        const data = await res.json();
        if (data && data.IpfsHash) {
            return `ipfs://${data.IpfsHash}`;
        } else {
            throw new Error('No se retornó el IpfsHash de Pinata.');
        }
    } catch (error) {
        console.error('[IPFS Service] Error al subir archivo a Pinata:', error.message);
        throw error;
    }
}

/**
 * Sube metadatos JSON a IPFS utilizando la API de Pinata.
 * Si no hay JWT configurado, guarda el archivo localmente en public/uploads y simula un CID estático.
 * @param {object} metadataData Datos de metadatos del producto
 * @param {string} sku SKU del producto
 * @returns {Promise<string>} URI estandarizado: ipfs://<metadataCID>
 */
async function uploadMetadataToIPFS(metadataData, sku) {
    if (isMockMode) {
        const metadataBuffer = Buffer.from(JSON.stringify(metadataData, null, 2));
        const metadataName = `metadata-${sku}.json`;

        const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, metadataName);
        fs.writeFileSync(filePath, metadataBuffer);

        // Retornar el CID estático de prueba para garantizar compatibilidad con los tests E2E
        const mockCid = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
        console.log(`[Mock IPFS Service] Metadatos guardados localmente: /uploads/${metadataName} | Mock CID: ${mockCid}`);
        return `ipfs://${mockCid}`;
    }

    try {
        const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PINATA_JWT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pinataContent: metadataData,
                pinataMetadata: {
                    name: `metadata-${sku}.json`
                }
            })
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Error en API Pinata JSON: ${res.status} - ${errText}`);
        }

        const data = await res.json();
        if (data && data.IpfsHash) {
            return `ipfs://${data.IpfsHash}`;
        } else {
            throw new Error('No se retornó el IpfsHash de Pinata JSON.');
        }
    } catch (error) {
        console.error('[IPFS Service] Error al subir JSON a Pinata:', error.message);
        throw error;
    }
}

module.exports = {
    uploadFileToIPFS,
    uploadMetadataToIPFS,
    isMockMode
};
