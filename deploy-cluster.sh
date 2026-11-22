#!/usr/bin/env bash
set -euo pipefail

ROLE="${1:-secondary}"
cd "$(dirname "$0")"

if [[ "$ROLE" == "primary" ]]; then
  echo ">>> Configurando nodo como SERVIDOR PRINCIPAL (https://movil.res0nance.pp.ua)..."
  cp .env.primary .env
elif [[ "$ROLE" == "secondary" ]]; then
  echo ">>> Configurando nodo como SERVIDOR SECUNDARIO / FAILOVER (https://musica.res0nance.pp.ua)..."
  cp .env.secondary .env
else
  echo "Uso: ./deploy-cluster.sh [primary|secondary]"
  exit 1
fi

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
elif command -v podman >/dev/null 2>&1 && podman compose version >/dev/null 2>&1; then
  COMPOSE_CMD="podman compose"
elif command -v podman-compose >/dev/null 2>&1; then
  COMPOSE_CMD="podman-compose"
else
  echo "Error: No se encontró docker compose ni podman compose en este servidor."
  exit 1
fi

echo ">>> Levantando stack con $COMPOSE_CMD (PostgreSQL 16 + Resonance.Api .NET 8 + Resonance.Web Nginx)..."
$COMPOSE_CMD up -d --build

echo ">>> Esperando a que Resonance.Api (:5000) esté saludable..."
for i in {1..30}; do
  if curl -fsS http://localhost:5000/health >/dev/null 2>&1; then
    echo ">>> Resonance.Api en línea:"
    curl -s http://localhost:5000/health
    echo ""
    break
  fi
  sleep 2
done

echo ">>> Sincronizando catálogo Subsonic (Principal movil -> Failover musica) y estado del clúster..."
curl -s -X POST "http://localhost:5000/api/songs/sync-server?source=primary" || true
echo ""
curl -s -X POST "http://localhost:5000/api/songs/cluster-sync" || true
echo ""
echo ">>> Despliegue completado:"
echo "    - Web UI + Reverse Proxy Nginx : http://localhost:8080"
echo "    - Backend REST API & SignalR   : http://localhost:5000 (Swagger: http://localhost:5000/swagger)"
echo "    - PostgreSQL 16                : localhost:5432"
