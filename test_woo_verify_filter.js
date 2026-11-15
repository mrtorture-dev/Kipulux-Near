const axios = require('axios');
require('dotenv').config();

async function verifyFilter() {
  const wooKey = process.env.WOOCOMMERCE_CONSUMER_KEY || '';
  const wooSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET || '';
  const credentials = Buffer.from(`${wooKey}:${wooSecret}`).toString('base64');
  const testDni = process.env.TEST_DNI || '71000001';
  
  try {
    const response = await axios.get('https://alda.com.pe/wp-json/wc/v3/orders', {
      params: { _billing_taxable: testDni },
      headers: { 'Authorization': `Basic ${credentials}` }
    });
    
    console.log(`Retornó ${response.data.length} órdenes.`);
    response.data.forEach(order => {
      const doc = order.meta_data.find(m => m.key === '_billing_taxable');
      console.log(`Orden #${order.id} | Comprador: ${order.billing.first_name} | DNI: ${doc ? doc.value : 'No encontrado'}`);
    });
  } catch (error) {
    console.error(error.message);
  }
}

verifyFilter();
