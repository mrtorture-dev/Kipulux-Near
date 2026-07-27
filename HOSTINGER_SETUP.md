# Guía de Configuración de Firewall e Infraestructura VPS Hostinger (KipuLux Demo-)

Este documento detalla la topología de contenedores, la orquestación en el Servidor Privado Virtual (VPS) de Hostinger y la configuración de firewall requerida en **Hostinger hPanel**.

---

## 1. Configuración de Reglas de Firewall (Hostinger hPanel)

Para permitir el funcionamiento seguro y el acceso externo al sistema KipuLux, configure las siguientes reglas de puertos en el panel de administración de Hostinger (**hPanel > VPS > Firewall**):

| Puerto | Protocolo | Servicio / Propósito | Dirección / Origen Requerido |
| :--- | :--- | :--- | :--- |
| **80** | TCP | HTTP (Tráfico Web Nginx Reverse Proxy) | `0.0.0.0/0` (Público) |
| **443** | TCP | HTTPS (SSL/TLS Reverse Proxy - Futuro Certbot) | `0.0.0.0/0` (Público) |
| **22** | TCP | SSH (Administración remota del VPS) | Restringido a IPs de administradores |
| **7687** | TCP | Neo4j Bolt Protocol (Conexiones cliente/driver Neo4j) | Restringido o Público según necesidad |

> **Nota de Seguridad:** El puerto interno del backend Express (`3000`) y el puerto HTTP de la consola Neo4j (`7474`) **NO** deben exponerse públicamente en el firewall del VPS. Todo el tráfico HTTP/API entrante es enrutado de manera segura a través de **Nginx** en el puerto 80.

---

## 2. Topología de Contenedores y Red Virtual (`kipu-net`)

La infraestructura de producción está aislada dentro de una red interna Docker llamada `kipu-net` (driver bridge). La comunicación entre contenedores se realiza mediante sus nombres de servicio:

```
                  [ Petición Cliente / Internet ]
                                 │
                                 ▼
                     +-----------------------+
                     | Hostinger Firewall    |
                     | Puertos 80, 443, 7687 |
                     +-----------------------+
                                 │
                                 ▼ (Puerto 80)
                   +---------------------------+
                   |  Nginx Reverse Proxy      |
                   |  Container: kipu-nginx    |
                   |  Image: nginx:alpine      |
                   +---------------------------+
                                 │
                 (http://kipu-backend:3000)
                                 │
                                 ▼
                   +---------------------------+
                   |  Backend Express Node.js  |
                   |  Container: kipu-backend  |
                   |  `app.set('trust proxy')` |
                   +---------------------------+
                                 │
                     (bolt://neo4j:7687)
                                 │
                                 ▼
                   +---------------------------+
                   |  Base de Datos Neo4j 5.x  |
                   |  Container: kipu-neo4j    |
                   +---------------------------+
```

### Componentes de la Arquitectura:

1. **Nginx Reverse Proxy (`kipu-nginx`):**
   - Escucha en el puerto público `80:80`.
   - Limita el tamaño del cuerpo de peticiones a `client_max_body_size 20M;` (necesario para subida de imágenes y assets).
   - Reenvía las peticiones a `http://kipu-backend:3000`.
   - Inyecta cabeceras HTTP de proxy: `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`.

2. **Backend Express (`kipu-backend`):**
   - Corre en el puerto 3000 internamente en `kipu-net`.
   - Configurado con `app.set('trust proxy', 1);` para capturar la IP real del cliente enviada por Nginx a través de `X-Forwarded-For`, permitiendo el correcto funcionamiento de `express-rate-limit` y auditoría de peticiones.

3. **Base de Datos Neo4j (`kipu-neo4j`):**
   - Almacena el grafo de trazabilidad y claves cifradas de artesanos.
   - Accesible internamente vía `bolt://neo4j:7687`.

---

## 3. Orquestación y Despliegue Automatizado

### Comandos de Despliegue Manual
Para combinar la definición base y la extensión de producción de Nginx:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

### Script Automatizado (`deploy.sh`)
El proyecto incluye un script ejecutable para simplificar el flujo CI/CD en el VPS Hostinger:

```bash
chmod +x deploy.sh
./deploy.sh
```

El script ejecuta automáticamente:
1. `git pull` para obtener los últimos cambios.
2. `docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d` para reconstruir y desplegar.
3. `docker image prune -f` para eliminar capas e imágenes huérfanas de compilaciones previas.
