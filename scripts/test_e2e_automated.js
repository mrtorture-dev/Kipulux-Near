const API_BASE_URL = 'http://localhost:3005/api';

async function runTests() {
  console.log("🚀 INICIANDO TEST DE INTEGRACIÓN PROGRAMÁTICO E2E REINGENIERÍA - KIPULUX");

  // Paso 1: Purgado y Sembrado de Base de Datos Neo4j
  let seedData;
  try {
    const res = await fetch(`${API_BASE_URL}/debug/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.status !== 200) {
      throw new Error(`Código de estado incorrecto: ${res.status}`);
    }
    seedData = await res.json();
    console.log("[PASS] Paso 1: Purgado y Sembrado de Base de Datos Neo4j.");
  } catch (error) {
    console.error(`[FAIL] Paso 1: Purgado y Sembrado fallido:`, error.message);
    process.exit(1);
  }

  // Paso 2: Autenticación de Artesano Cusco Sembrado (JWT Generado con Éxito)
  let artisanToken;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/mock-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: "artesano_cusco",
        password: "Artesano123!"
      })
    });
    if (res.status !== 200) {
      throw new Error(`Código de estado incorrecto: ${res.status}`);
    }
    const data = await res.json();
    artisanToken = data.accessToken;
    if (!artisanToken) {
      throw new Error("Token no recibido");
    }
    console.log("[PASS] Paso 2: Autenticación de Artesano (JWT Generado con Éxito).");
  } catch (error) {
    console.error(`[FAIL] Paso 2: Autenticación de Artesano fallida:`, error.message);
    process.exit(1);
  }

  // Paso 2B: Autenticación de Tienda Cusco Sembrada (JWT Generado con Éxito)
  let tiendaToken;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/mock-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: "tienda_cusco",
        password: "Tienda123!"
      })
    });
    if (res.status !== 200) {
      throw new Error(`Código de estado incorrecto: ${res.status}`);
    }
    const data = await res.json();
    tiendaToken = data.accessToken;
    if (!tiendaToken) {
      throw new Error("Token no recibido");
    }
    console.log("[PASS] Paso 2B: Autenticación de Tienda (JWT Generado con Éxito).");
  } catch (error) {
    console.error(`[FAIL] Paso 2B: Autenticación de Tienda fallida:`, error.message);
    process.exit(1);
  }

  // Paso 3: Onboarding de Artesano por la Tienda Cusco
  let newArtisanUsername;
  let newArtisanPassword;
  let newArtisanAddress;
  try {
    const onboardRes = await fetch(`${API_BASE_URL}/tiendas/registrar-artesano`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tiendaToken}`
      },
      body: JSON.stringify({
        RUC_Fabricante: "20999888777",
        nombre_taller: "Taller Premium Cusco",
        email: "taller.premium@gmail.com",
        ubigeo: "080101"
      })
    });

    if (onboardRes.status !== 201) {
      throw new Error(`Código de estado incorrecto al registrar artesano: ${onboardRes.status}`);
    }

    const onboardData = await onboardRes.json();
    newArtisanUsername = onboardData.username;
    newArtisanPassword = onboardData.password;
    newArtisanAddress = onboardData.address;
    if (!newArtisanUsername || !newArtisanPassword || !newArtisanAddress) {
      throw new Error("Credenciales o dirección EVM no autogeneradas");
    }
    console.log("[PASS] Paso 3: Onboarding de nuevo Artesano por la Tienda.");
  } catch (error) {
    console.error(`[FAIL] Paso 3: Onboarding de Artesano fallido:`, error.message);
    process.exit(1);
  }

  // Paso 3B: Autenticación del nuevo Artesano creado
  let newArtisanToken;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/mock-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: newArtisanUsername,
        password: newArtisanPassword
      })
    });
    if (res.status !== 200) {
      throw new Error(`Código de estado incorrecto: ${res.status}`);
    }
    const data = await res.json();
    newArtisanToken = data.accessToken;
    if (!newArtisanToken) {
      throw new Error("Token no recibido");
    }
    console.log("[PASS] Paso 3B: Autenticación del nuevo Artesano Onboarded.");
  } catch (error) {
    console.error(`[FAIL] Paso 3B: Autenticación de nuevo Artesano fallida:`, error.message);
    process.exit(1);
  }

  // Paso 4: Registro de Prenda y Mint de NFT (Manufactura por nuevo Artesano)
  let createdProductData;
  try {
    const res = await fetch(`${API_BASE_URL}/productos/crear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newArtisanToken}`
      },
      body: JSON.stringify({
        SKU_Producto_Final: "KIPU-CUERO-004",
        ID_Lote_Cuero_Utilizado: "LOTE-NIETO-003",
        Foto_Producto: "https://alda.com.pe/cartera.png",
        PDF_Certificado_Previo: "QmYwAPJ88CZ21GCg69B3Y9ff62XSp23tKCTsF4C4rJ8B1D"
      })
    });
    if (res.status !== 200) {
      throw new Error(`Código de estado incorrecto al crear producto: ${res.status}`);
    }
    createdProductData = await res.json();
    console.log(`[PASS] Paso 4: Registro de Manufactura E2E. Mint realizado a wallet del Artesano (${newArtisanAddress}) | TokenID: ${createdProductData.tokenId}`);
  } catch (error) {
    console.error(`[FAIL] Paso 4: Registro de Manufactura fallido:`, error.message);
    process.exit(1);
  }

  // Paso 5: Despacho / Transferencia B2B (Artesano -> Tienda Cusco)
  let transferData;
  try {
    const res = await fetch(`${API_BASE_URL}/productos/transferir-a-tienda`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newArtisanToken}`
      },
      body: JSON.stringify({
        SKU_Producto_Final: "KIPU-CUERO-004",
        RUC_Tienda_Destino: "20600123456"
      })
    });
    if (res.status !== 200) {
      throw new Error(`Código de estado incorrecto al transferir B2B: ${res.status}`);
    }
    transferData = await res.json();
    console.log(`[PASS] Paso 5: Custodia transferida B2B exitosamente en Blockchain y Neo4j (estado EN_TIENDA). Tx: ${transferData.txHash}`);
  } catch (error) {
    console.error(`[FAIL] Paso 5: Transferencia B2B fallida:`, error.message);
    process.exit(1);
  }

  // Paso 5B: Validación de Regla de Custodia (Tienda no puede vender lo que no posee)
  try {
    // Intentar vender un producto que pertenece al artesano (KIPU-CUERO-002 está en estado ORIGINADO, no transferido)
    const res = await fetch(`${API_BASE_URL}/productos/vender`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tiendaToken}`
      },
      body: JSON.stringify({
        SKU_Producto_Final: "KIPU-CUERO-002",
        DNI_O_RUC_Comprador: "00792282",
        Nro_Comprobante_Pago: "B001-00029384",
        wallet_address_comprador: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        xml_boleta: "<invoice><total>250.00</total></invoice>"
      })
    });
    if (res.status !== 400) {
      throw new Error(`Se esperaba código 400 por falta de transferencia previa, se obtuvo: ${res.status}`);
    }
    console.log("[PASS] Paso 5B: Validación de Regla de Custodia verificada (la tienda no puede vender lo que no posee).");
  } catch (error) {
    console.error(`[FAIL] Paso 5B: Validación de Regla de Custodia fallida:`, error.message);
    process.exit(1);
  }

  // Paso 6: Comercialización y Venta B2C (Tienda Cusco -> Comprador Juan Pérez)
  let ventaData;
  try {
    const res = await fetch(`${API_BASE_URL}/productos/vender`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tiendaToken}`
      },
      body: JSON.stringify({
        SKU_Producto_Final: "KIPU-CUERO-004",
        DNI_O_RUC_Comprador: "00792282",
        Nro_Comprobante_Pago: "B001-00029384",
        wallet_address_comprador: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        xml_boleta: "<invoice><total>250.00</total></invoice>"
      })
    });
    if (res.status !== 200) {
      throw new Error(`Código de estado incorrecto al vender: ${res.status}`);
    }
    ventaData = await res.json();
    console.log(`[PASS] Paso 6: Comercialización y Venta B2C exitosa. Tx: ${ventaData.txHash} | Hash SUNAT: ${ventaData.hashSUNAT}`);
  } catch (error) {
    console.error(`[FAIL] Paso 6: Comercialización y Venta B2C fallida:`, error.message);
    process.exit(1);
  }

  // Paso 7: Registro del Cliente Final Juan Pérez
  try {
    const res = await fetch(`${API_BASE_URL}/clientes/registrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        DNI_O_RUC_Comprador: "00792282",
        nombre_completo: "Juan Pérez",
        wallet_address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        username: "cliente_juan",
        email: "juan.perez@gmail.com",
        password: "Cliente123!"
      })
    });
    if (res.status !== 201) {
      throw new Error(`Código de estado incorrecto al registrar cliente: ${res.status}`);
    }
    console.log("[PASS] Paso 7: Registro del Cliente Final Juan Pérez con credenciales de ingreso.");
  } catch (error) {
    console.error(`[FAIL] Paso 7: Registro de cliente fallido:`, error.message);
    process.exit(1);
  }

  // Paso 8: Autenticación del Cliente Final Juan Pérez
  let clientToken;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/mock-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: "cliente_juan",
        password: "Cliente123!"
      })
    });
    if (res.status !== 200) {
      throw new Error(`Código de estado incorrecto: ${res.status}`);
    }
    const data = await res.json();
    clientToken = data.accessToken;
    if (!clientToken) {
      throw new Error("Token no recibido");
    }
    console.log("[PASS] Paso 8: Autenticación de Cliente (JWT Generado con Éxito).");
  } catch (error) {
    console.error(`[FAIL] Paso 8: Autenticación de cliente fallida:`, error.message);
    process.exit(1);
  }

  // Paso 9: Consulta Genealógica Multi-nivel en el Grafo (PROPIEDAD_DE)
  try {
    const res = await fetch(`${API_BASE_URL}/productos/KIPU-CUERO-004`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    if (res.status !== 200) {
      throw new Error(`Código de estado incorrecto al consultar: ${res.status}`);
    }
    const data = await res.json();
    if (!data.lotes || data.lotes.length !== 3) {
      throw new Error(`Se esperaban 3 niveles en la genealogía, se obtuvo: ${data.lotes ? data.lotes.length : 0}`);
    }
    if (data.status !== 'VENDIDO') {
      throw new Error(`Estado incorrecto: ${data.status}`);
    }
    console.log("[PASS] Paso 9: Consulta Genealógica Multi-nivel verificada en el Grafo (relación PROPIEDAD_DE).");
  } catch (error) {
    console.error(`[FAIL] Paso 9: Consulta de trazabilidad fallida:`, error.message);
    process.exit(1);
  }

  // Paso 10: Consulta de Historial de Compras discriminada por Tienda Origen
  try {
    const res = await fetch(`${API_BASE_URL}/clientes/historial-compras`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    if (res.status !== 200) {
      throw new Error(`Código de estado incorrecto al consultar historial: ${res.status}`);
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Historial de compras vacío o en formato incorrecto");
    }
    const tiendaItem = data.find(item => item.id_tienda === "20600123456");
    if (!tiendaItem) {
      throw new Error("No se encontró la tienda origen 20600123456");
    }
    const product = tiendaItem.productos.find(p => p.SKU_Producto_Final === "KIPU-CUERO-004");
    if (!product) {
      throw new Error("No se encontró el producto KIPU-CUERO-004 en la tienda");
    }
    console.log("[PASS] Paso 10: Consulta de Historial de Compras discriminada por Tienda Origen validada exitosamente.");
  } catch (error) {
    console.error(`[FAIL] Paso 10: Consulta de historial fallida:`, error.message);
    process.exit(1);
  }

  // Paso 11: Control de Seguridad BOLA (mitigado)
  try {
    // Registrar otro cliente
    const regRes = await fetch(`${API_BASE_URL}/clientes/registrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        DNI_O_RUC_Comprador: "99999999",
        nombre_completo: "Otro Cliente",
        wallet_address: "0x85303C737976118D09559c5D7cdBE2cF44B6C318",
        username: "cliente_otro",
        email: "cliente.otro@gmail.com",
        password: "OtroPassword123!"
      })
    });
    if (regRes.status !== 201) {
      throw new Error("No se pudo registrar otro cliente");
    }

    // Login otro cliente
    const logRes = await fetch(`${API_BASE_URL}/auth/mock-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: "cliente_otro",
        password: "OtroPassword123!"
      })
    });
    const logData = await logRes.json();
    const otroToken = logData.accessToken;

    // Intentar ver KIPU-CUERO-004
    const traceRes = await fetch(`${API_BASE_URL}/productos/KIPU-CUERO-004`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${otroToken}` }
    });
    if (traceRes.status !== 404) {
      throw new Error(`Se esperaba 404 para cliente no autorizado, se obtuvo: ${traceRes.status}`);
    }
    console.log("[PASS] Paso 11: Control de Seguridad BOLA mitigado correctamente (404 en accesos no autorizados).");
  } catch (error) {
    console.error(`[FAIL] Paso 11: Validación BOLA fallida:`, error.message);
    process.exit(1);
  }

  console.log("🎉 CONCLUSIÓN: EL SISTEMA COMPLACE EL 100% DEL FLUJO DE NEGOCIO Y AUTENTICACIÓN SEGURA DE EXTREMO A EXTREMO.");
}

runTests();
