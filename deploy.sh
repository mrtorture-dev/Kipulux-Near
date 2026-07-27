#!/bin/bash
# ==============================================================================
# Script de Despliegue Automatizado para KipuLux Demo- (Hostinger VPS)
# ==============================================================================
# Instrucciones de ejecución:
# 1. Conceder permisos de ejecución al archivo:
#    chmod +x deploy.sh
# 2. Ejecutar el script:
#    ./deploy.sh
# ==============================================================================

set -e

echo "=== Actualizando repositorio Git ==="
git pull

echo "=== Reconstruyendo y desplegando contenedores (Producción) ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

echo "=== Limpiando imágenes en desuso ==="
docker image prune -f

echo "=== Despliegue completado exitosamente ==="
