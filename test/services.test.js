const assert = require('assert');
const ipfs = require('../services/ipfs');

describe('IPFS Service Mock Tests', () => {
  it('should return the static CID regardless of SKU in generarMockCID', () => {
    const expectedCid = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
    assert.strictEqual(ipfs.generarMockCID('SKU-123'), expectedCid);
    assert.strictEqual(ipfs.generarMockCID('SKU-456'), expectedCid);
    assert.strictEqual(ipfs.generarMockCID(''), expectedCid);
    assert.strictEqual(ipfs.generarMockCID(null), expectedCid);
  });

  it('should return success and static CID in subirAIPFS', async () => {
    const expectedCid = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
    const result = await ipfs.subirAIPFS({ name: 'Cuero Premium' });
    assert.deepStrictEqual(result, { success: true, cid: expectedCid });
  });
});

describe('Blockchain Service Tests', () => {
  before(() => {
    require('dotenv').config();
    if (!process.env.VAULT_PRIVATE_KEY) {
      console.warn('[Test Warning] VAULT_PRIVATE_KEY environment variable is not set');
    }
  });

  it('should load blockchain service and export required functions', () => {
    const blockchain = require('../services/blockchain');
    assert.strictEqual(typeof blockchain.ejecutarMintOnChain, 'function');
    assert.strictEqual(typeof blockchain.ejecutarVentaOnChain, 'function');
  });
});
