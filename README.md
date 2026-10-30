# 📦 Kipulux: Pasaporte Digital & Trazabilidad Premium en NEAR Protocol
> **NEAR HACKATHON 2026 Submission**  
> **Tracks:** `realworld` (Real-World Money & Commerce) · `nfts` (NFTs That Do Something)  
> **Contrato Inteligente:** Rust WebAssembly (Wasm) — Estándares NEP-171, NEP-177, NEP-297  
> **Licencia:** MIT (Ver archivo [`LICENSE`](./LICENSE))

¡Bienvenido a **Kipulux**! Esta plataforma es una solución híbrida Web2.5 diseñada para asegurar la trazabilidad inmutable y certificación de origen de prendas de cuero premium en el mercado peruano. Kipulux conecta de manera elegante la robustez y flexibilidad de las bases de datos de grafos (**Neo4j**) con la inmutabilidad y seguridad de **NEAR Protocol**.

---

## 🌐 1. Despliegue Oficial en NEAR Testnet

El Smart Contract ha sido desarrollado en **Rust nativo (`near-sdk-rs`)**, compilado a WebAssembly (`.wasm`) optimizado con `wasm-opt -Oz` (~188 KB) y desplegado en la red pública de pruebas de NEAR Protocol.

| Parámetro | Valor Verificado en Testnet |
| :--- | :--- |
| **Cuenta del Contrato** | [`kipulux-2277d1.testnet`](https://testnet.nearblocks.io/address/kipulux-2277d1.testnet) |
| **Cuenta del Relayer Gasless** | [`kipu-relayer-2277d1.testnet`](https://testnet.nearblocks.io/address/kipu-relayer-2277d1.testnet) |
| **Tx de Despliegue Wasm** | [`ApmYAyhXFefY5bCe4H51G7BcFido6ZAZWu1PFGW1kLCY`](https://testnet.nearblocks.io/txns/ApmYAyhXFefY5bCe4H51G7BcFido6ZAZWu1PFGW1kLCY) |
| **Tx Minteo de Origen (NEP-171)** | [`FRnjMyQqseowc94D6woMt85jFdtCvgAoyaQ1m21QqtS4`](https://testnet.nearblocks.io/txns/FRnjMyQqseowc94D6woMt85jFdtCvgAoyaQ1m21QqtS4) |
| **Tx Custodia B2B a Tienda** | [`FhTPxVd8fxdJFBbqS1MKQF3daDSc6i5mCzmCkMWUYM22`](https://testnet.nearblocks.io/txns/FhTPxVd8fxdJFBbqS1MKQF3daDSc6i5mCzmCkMWUYM22) |
| **Tx Venta Fiscal SUNAT** | [`3QwjNbtXHNhxg58EaRcf87qokJk5e9suSsvA5pVAiLiq`](https://testnet.nearblocks.io/txns/3QwjNbtXHNhxg58EaRcf87qokJk5e9suSsvA5pVAiLiq) |
| **Explorador Público** | [https://testnet.nearblocks.io/address/kipulux-2277d1.testnet](https://testnet.nearblocks.io/address/kipulux-2277d1.testnet) |

---

## 🤖 2. Guía de Reproducción Rápida ("Do X - See Y" para Jueces y Evaluadores IA)

Diseñado para evaluación automatizada y screening por agentes (**Claude Code / Codex**):

### Paso 1: Instalar dependencias
```bash
npm install
```

### Paso 2: Ejecutar la Demostración E2E sobre NEAR Testnet en 1 solo comando
```bash
node scripts/demo/run-demo-near.js
```
* **Acción:** Ejecuta el ciclo completo (Acuñación artesano -> Traslado a tienda -> Venta al cliente con hash de factura SUNAT).
* **Resultado Esperado (See Y):**
  * Salida con código de salida `0` y 3 transacciones firmadas y confirmadas en vivo con sus URLs de [nearblocks.io](https://testnet.nearblocks.io).

### Paso 3: Compilar y verificar el Smart Contract en Rust
```bash
cd contracts/near
cargo check --target wasm32-unknown-unknown
cargo build --target wasm32-unknown-unknown --release
```
* **Resultado Esperado (See Y):** Compilación limpia sin errores generando el binario WebAssembly `target/wasm32-unknown-unknown/release/kipulux_near_contract.wasm`.

### Paso 4: Ejecutar la Suite Completa de Pruebas On-Chain e Inmutabilidad Fiscal
```bash
node scripts/near/deploy_and_verify.js
```
* **Resultado Esperado (See Y):** Crea cuentas testnet dinámicas, despliega el Wasm, inicializa el contrato, ejecuta transacciones y comprueba que los intentos de sobreescribir el hash de boleta SUNAT son rechazados on-chain con `"Inmutabilidad fiscal violada"`.

---

## 📜 3. Declaración de Código Previo y Trabajo en la Hackathon (Reglas Q-001 y Q-002)

* **Código Base Previo (Baseline):** 
  * Estructura del servidor Express, persistencia de grafos Neo4j e interfaz web de prototipo.
* **Desarrollado Durante la Hackathon NEAR (19-Oct a 14-Nov 2026):**
  * **Smart Contract en Rust (`contracts/near/`):** Implementación completa en WebAssembly bajo estándares NEP-171, NEP-177 y NEP-297, máquina de estados inmutable (`ORIGINADO` -> `CUSTODIA` -> `VENDIDO`), Storage Staking automático y certificación tributaria SUNAT.
  * **Servicio Relayer Gasless (`services/nearService.js`):** Integración con `near-api-js`, gestión de firmas corporativas con `KeyPairSigner` y subsidio de gas para artesanos y clientes.
  * **Suite de Automatización y Despliegue (`scripts/near/deploy_and_verify.js` y `scripts/demo/run-demo-near.js`):** Fondeo automático de cuentas en testnet, despliegue del binario y pruebas de regresión.
* **Enlace al Diff de la Integración:**
  * [https://github.com/mrtorture-dev/Kipulux-Near/compare/main...feature/near-integration](https://github.com/mrtorture-dev/Kipulux-Near/compare/main...feature/near-integration)

---

## 🏗️ 4. Arquitectura del Sistema (Resumen Ejecutivo)

Kipulux opera bajo una arquitectura de tres capas sincronizada de extremo a extremo:

1. **Frontend SPA (Single Page Application):** Interfaz reactiva construida con HTML5 nativo, JavaScript vanilla y Tailwind CSS con vistas condicionales por rol (`Artesano`, `Tienda` y `Cliente`) y un renderizador visual de la línea de tiempo del producto.
2. **Backend (Express API):** Servidor Node.js + Express con servicio Relayer de NEAR Protocol (`near-api-js`), validación de esquemas con Zod y driver oficial de Neo4j.
3. **Persistencia de Relaciones (Neo4j):** Base de datos orientada a grafos que mapea la cadena de suministro física (`LoteCuero`, `Artesano`, `Producto`, `Tienda`, `Cliente`) sincronizada con los hashes on-chain de NEAR.
4. **Capa Blockchain (NEAR Protocol):** Smart Contract en Rust (`NEP-171/NEP-177/NEP-297`) que resguarda la inmutabilidad de la propiedad, la trazabilidad del cuero y el hash SHA-256 de las facturas electrónicas de la SUNAT.

---

## 📋 5. Prerrequisitos del Sistema

* **Node.js:** Versión `v18.0.0` o superior (se recomienda LTS v20+ / v22+).
* **Neo4j Desktop:** Instalado y configurado con base de datos local activa (`bolt://localhost:7687`).
* **Rust:** `cargo` y target `wasm32-unknown-unknown` (para compilar contratos NEAR).
* **Navegador Web:** Chrome, Brave o Edge.

---

## 🔐 6. Configuración de Variables de Entorno (`.env.near`)

Para interactuar con la red NEAR Testnet, el sistema utiliza el archivo `.env.near`:

```env
NEAR_NETWORK_ID=testnet
NEAR_NODE_URL=https://rpc.testnet.near.org
NEAR_CONTRACT_NAME=kipulux-2277d1.testnet
NEAR_RELAYER_ACCOUNT_ID=kipu-relayer-2277d1.testnet
NEAR_RELAYER_PRIVATE_KEY=ed25519:...
NEAR_MOCK_FALLBACK=false
```

---

## 🛡️ 7. Seguridad y Resiliencia Criptográfica
* **Inmutabilidad Fiscal:** Una vez que un producto es vendido y se almacena el hash de la boleta de la SUNAT en el contrato NEAR, el estado pasa a `VENDIDO` y el contrato rechaza cualquier intento de sobreescritura posterior.
* **Storage Staking Pool:** El contrato calcula dinámicamente el delta de bytes almacenados en cada transacción y reembolsa el depósito no utilizado al Relayer corporativo.
* **Transacciones Gasless:** Los artesanos y clientes no necesitan tener tokens NEAR ni pagar tarifas; el Relayer corporativo firma las llamadas con subsidio transparente.
