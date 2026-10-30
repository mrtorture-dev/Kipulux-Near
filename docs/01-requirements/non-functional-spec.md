# Especificación de Requerimientos No Funcionales (RNF) — Kipulux NEAR Protocol & Mobile

## 1. Rendimiento, Latencia y Eficiencia Móvil
* **RNF-01 (Finalidad de Bloque en NEAR):** Las transacciones de minteo y cambio de custodia en NEAR Testnet deben alcanzar finalidad en menos de 2.0 segundos (tiempo de bloque promedio de NEAR ~1.2s).
* **RNF-02 (Latencia de la API Backend):** Los endpoints REST intermedios (`POST /api/productos/mintear`) deben responder en p95 < 2500 ms incluyendo la confirmación del receipt en la red NEAR.
* **RNF-03 (Lectura NFC en Dispositivos Móviles):** El servicio de lectura NFC en Flutter (`nfc_service.dart`) debe detectar y capturar el UID físico del chip NTAG213/215/216 en menos de 300 ms al contacto.
* **RNF-04 (Arranque de App y Renderizado de Pasaporte):** La app móvil Flutter debe iniciar en frío en menos de 1.8 segundos y renderizar la línea de tiempo completa del pasaporte en menos de 1.0 segundo tras recibir la respuesta HTTP.

---

## 2. Economía On-Chain y Gestión de Almacenamiento (Storage Staking)
* **RNF-05 (Storage Staking Efficiency):** El contrato inteligente debe almacenar únicamente hashes, identificadores y referencias a IPFS para mantener el costo de almacenamiento on-chain inferior a 0.05 NEAR por pasaporte emitido (~5 KB de estado).
* **RNF-06 (Gas Optimization):** Las llamadas de mutación de estado no deben exceder los 30 Tgas (Teragas), garantizando que el límite estándar de 300 Tgas por bloque nunca sea un cuello de botella.

---

## 3. Seguridad, Criptografía y Protección Móvil
* **RNF-07 (Principio de Menor Privilegio en Llaves):** Se prohíbe exponer la llave maestra (`FullAccessKey`) del Relayer en el cliente web o en el código fuente de Flutter. La clave privada del Relayer residirá exclusivamente en variables de entorno del backend (`.env.near`).
* **RNF-08 (Almacenamiento Cifrado en Dispositivo):** Las sesiones, tokens JWT y claves temporales en la aplicación móvil deben resguardarse estrictamente mediante `flutter_secure_storage` (Keystore en Android y Keychain en iOS).
* **RNF-09 (Inmutabilidad Fiscal y de Trazabilidad):** Una vez registrado el hash SHA-256 de la boleta de venta electrónica SUNAT para un `token_id`, el contrato inteligente en NEAR debe impedir terminantemente su sobreescritura o alteración.
* **RNF-10 (Auditoría de Invocación NEP-297):** Todos los métodos de mutación (`mint_authorized`, `transferir_custodia`, `registrar_venta`) deben emitir eventos de log estructurados según el estándar NEP-297 (Event Format Specification).

---

## 4. Gobernanza en GitHub y Reproducibilidad Hackathon (Claude Code / Codex)
* **RNF-11 (Instalación y Demo en 1 Comando):** El entorno de pruebas local debe levantarse y ejecutarse mediante un único script unificado (`node scripts/demo/run-demo-near.js`), cumpliendo con la directiva "Haz X -> Verás Y".
* **RNF-12 (Zero Placeholders):** Todos los datos de prueba y fixtures sembrados deben ser hiper-realistas (nombres reales de talleres de cuero peruanos, CIDs válidos, hashes SHA-256 congruentes), prohibiendo textos de relleno como "Lorem Ipsum" o "test".
* **RNF-13 (Estrategia de Ramas y Separación de Código):** Se debe etiquetar con Git tag `pre-hackathon` el código previo a la hackathon y con `hackathon-submission` la versión final, manteniendo en `README.md` el enlace directo al diff de la integración NEAR desarrollada en la ventana (Regla Q-002).
* **RNF-14 (Licenciamiento Abierto):** Ambos repositorios (`Kipulux` y `KipuLux-Mobile`) deben incluir un archivo `LICENSE` MIT explícito y mantenerse públicos antes de la fecha límite (14 de noviembre de 2026, 23:59 UTC).
