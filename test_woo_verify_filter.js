const axios = require('axios');

async function verifyFilter() {
  const credentials = Buffer.from('ck_your_woocommerce_consumer_key_placeholder:cs_your_woocommerce_consumer_secret_placeholder').toString('base64');
  
  try {
    const response = await axios.get('https://alda.com.pe/wp-json/wc/v3/orders', {
      params: { _billing_taxable: '74629527' },
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
