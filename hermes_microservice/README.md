# 🤖 Hermes AI - Kipulux Microservice

Este directorio contiene las configuraciones y directivas (Skills) para ejecutar el Agente de Inteligencia Artificial (Hermes) como un microservicio satélite de Kipulux.

Al correr Hermes con este Skill, el agente se convierte en el "Bot de Telegram Oficial", procesando conversaciones en lenguaje natural de los clientes, gestionando la bóveda KMS (Key Management System) local y ejecutando compras/ventas automatizadas mediante la API del servidor Express de Kipulux.

## 🚀 Despliegue del Microservicio

### Requisitos Previos
1. **Servidor Express (Kipulux Core):** El servidor principal (`server.js`) debe estar corriendo en `http://localhost:3005`.
2. **Hardhat Blockchain Node:** La blockchain local (`npx hardhat node`) debe estar activa.
3. **Neo4j Desktop:** La base de datos orientada a grafos debe estar inicializada.
4. **Hermes Agent Framework:** Debes tener instalado localmente el Framework de Agentes de Hermes (`hermes-agent`).

### Pasos de Instalación
1. **Configurar Variables de Entorno:**
   Asegúrate de que el token de Telegram del Bot (`TELEGRAM_BOT_TOKEN`) esté definido en tu `.env` de Hermes o en tu servidor Express.
   
2. **Copiar las Skills:**
   Copia la carpeta `skills/kipulux` de este repositorio hacia la ruta donde Hermes busca sus habilidades localmente.
   - En Windows: `C:\Users\Usuario\AppData\Local\hermes\skills\kipulux`
   - En Linux/Mac: `~/.local/share/hermes/skills/kipulux`

3. **Ejecutar el Agente:**
   Abre una nueva terminal en el directorio raíz de `hermes-agent` y ejecuta el comando de inicialización de Gateway:
   ```bash
   # Iniciar el Agente Hermes en modo Gateway
   hermes gateway run
   ```

### 🧠 Arquitectura Cognitiva (SKILL)
El archivo `skills/kipulux/SKILL.md` contiene el *System Prompt* y las guías heurísticas (Zero-Shot y Few-Shot) para que el modelo de lenguaje interactúe con los endpoints sin autorización JWT (`/api/hermes/*`), delegando el proceso seguro de descifrado y firmas criptográficas nativas al servidor backend en Node.js.
