# Resonance v2.0 — Plataforma de Streaming Colaborativo, Salas Jam y Comunidades

> **Equipo 87 (5. Resonance) — Ingeniería de Software (UCAB)**  
> **Integrantes:** Sebastián Pérez, Luis Guerrero, Victoria De Nóbrega, Gabriel Castro, Jesús Medina.

---

## 1. Arquitectura General (POO en 2 Capas + Clúster de Alta Disponibilidad)

- **Capa 1 — Capa WEB (`frontend/`):** React 18 (Vite 5) + Sistema de Diseño *Capa Zero* estructurado en **3 páginas principales** (`LandingPage`, `LoginPage`, `HomePage` de 4 paneles estilo Spotify) y **14 módulos con responsabilidad única (SRP)**.
- **Capa 2 — Aplicación Backend (`backend/Resonance.Api/`):** C# (.NET 8 Web API) + ASP.NET Core SignalR (WebSockets `<= 200 ms`) estructurada en **6 carpetas planas** (`Controllers`, `Data`, `DTOs`, `Hubs`, `Models`, `Services`) bajo el Principio de Responsabilidad Única (SRP).
- **Persistencia Relacional (`Data/`):** **PostgreSQL 16** (14 tablas ACID gestionadas vía Entity Framework Core 8 + Repositorios + `DbInitializer`).
- **Clúster y Streaming Musical (`res0nance.pp.ua`):**
  - **Servidor Principal (Prioridad 1):** `https://movil.res0nance.pp.ua`
  - **Servidor Secundario / Failover (Prioridad 2):** `https://musica.res0nance.pp.ua` (Administración SSH: `https://ssh.res0nance.pp.ua/`)
  - **Timeout de Conmutación Automática (Failover):** `2500 ms` (`2.5 segundos`). Si el servidor principal no responde en `2.5s`, tanto el Backend como el Frontend conmutan automáticamente al servidor secundario y reescriben al vuelo las URLs de audio sin interrumpir la sesión.
  - **Sincronización Bidireccional de PostgreSQL (`ClusterSyncService`):** Ambos nodos sincronizan cada `15 segundos` por HTTPS (`GET /api/songs/cluster-snapshot` / `POST /api/songs/cluster-sync`) las 14 tablas de PostgreSQL conservando los mismos `Id (Guid)`.

---

## 2. Guía Completa de Despliegue y Conexión en Ambos Servidores

### A. Paso a Paso en el Servidor Secundario (`https://musica.res0nance.pp.ua` / `https://ssh.res0nance.pp.ua/`)

1. **Acceso por SSH al Servidor Secundario:**
   - Entra a `https://ssh.res0nance.pp.ua/`
   - Inicia sesión con el usuario `gab` y eleva privilegios a `root` (`su -` o `sudo -i`).

2. **Verificar que Docker, Docker Compose y Git estén activos:**
   ```bash
   docker --version
   docker compose version
   git --version
   ```
   *(Si el servicio de Docker estuviera detenido, actívalo con: `systemctl enable --now docker`).*

3. **Clonar o actualizar el repositorio del proyecto:**
   ```bash
   cd /opt || cd ~
   git clone <URL_DEL_REPOSITORIO_GIT> Resonance
   cd Resonance
   git pull origin main
   ```

4. **Levantar todo el Stack como Servidor Secundario (`secondary`):**
   ```bash
   chmod +x deploy-cluster.sh
   ./deploy-cluster.sh secondary
   ```
   **¿Qué hace este comando automáticamente?**
   - Copia `.env.secondary` a `.env` (`NODE_ROLE=secondary`, `SELF_PUBLIC_URL=https://musica.res0nance.pp.ua`, `PEER_PUBLIC_URL=https://movil.res0nance.pp.ua`, `FAILOVER_TIMEOUT_MS=2500`).
   - Construye y levanta los **3 contenedores Docker** en la red `resonance_net`:
     1. `resonance_postgres` (PostgreSQL 16 en puerto `5432` con volumen persistente `postgres_data`).
     2. `resonance_api` (Backend C# .NET 8 + SignalR en puerto `5000`).
     3. `resonance_web` (Frontend React + Nginx Reverse Proxy en puerto `8080`).
   - Crea automáticamente las **14 tablas** en PostgreSQL 16, sincroniza el catálogo de canciones con Subsonic/Navidrome (`usuario: Nidus`) y sincroniza el snapshot de base de datos con el otro servidor.

---

### B. Paso a Paso para Clonar la Configuración en el Servidor Principal (`https://movil.res0nance.pp.ua`)

Para desplegar exactamente la misma configuración en el **Servidor Principal**, copia o clona la misma carpeta `Resonance` y ejecuta el script con el parámetro `primary`:

```bash
cd Resonance
git pull origin main
chmod +x deploy-cluster.sh
./deploy-cluster.sh primary
```
**¿Qué cambia automáticamente con `primary`?**
- Copia `.env.primary` a `.env` (`NODE_ROLE=primary`, `SELF_PUBLIC_URL=https://movil.res0nance.pp.ua`, `PEER_PUBLIC_URL=https://musica.res0nance.pp.ua`).
- Levanta los mismos 3 contenedores (`resonance_postgres`, `resonance_api`, `resonance_web`) y establece a `movil.res0nance.pp.ua` como nodo primario activo, manteniendo a `musica.res0nance.pp.ua` sincronizado cada 15 segundos como respaldo automático.

---

### C. Configuración de Puertos y Enrutamiento (Cloudflare Tunnel / Nginx del Host)

Al correr `./deploy-cluster.sh`, el servidor expone localmente estos puertos:
- **Puerto `8080` (`resonance_web` — Nginx Reverse Proxy Todo-en-Uno):**
  - Sirve el Frontend React (`/`, `/login`, `/home`, `/rooms/:code`).
  - Redirige automáticamente `/api/*` hacia `resonance_api:5000/api/`.
  - Redirige automáticamente `/hubs/*` (con cabeceras WebSocket `Upgrade`) hacia `resonance_api:5000/hubs/`.
  - Redirige `/health` y `/swagger` hacia `resonance_api:5000`.
- **Puerto `5000` (`resonance_api`):** Acceso directo al Backend .NET 8.
- **Puerto `5432` (`resonance_postgres`):** Base de datos PostgreSQL 16.

> **Cómo conectarlo a tu Cloudflare Tunnel (`cloudflared`) o Proxy del Servidor:**
> - Si el dominio (`movil.res0nance.pp.ua` o `musica.res0nance.pp.ua`) apunta únicamente a la aplicación Resonance completa, apunta el servicio del túnel en Cloudflare Zero Trust a **`http://localhost:8080`** (el Nginx del contenedor ya enruta tanto el Frontend como `/api` y `/hubs`).
> - Si en el mismo dominio también corre **Navidrome** (por ejemplo en el puerto `4533`), configura las rutas de entrada (*Public Hostname Routes*) en Cloudflare Tunnel o en el Nginx del host así:
>   - Ruta `/rest/*` $\rightarrow$ `http://localhost:4533` *(API Subsonic de Navidrome para audio y carátulas)*
>   - Ruta `/api/*` $\rightarrow$ `http://localhost:5000` *(API REST de Resonance .NET 8)*
>   - Ruta `/hubs/*` $\rightarrow$ `http://localhost:5000` *(WebSockets SignalR de Resonance)*
>   - Ruta `/health` $\rightarrow$ `http://localhost:5000` *(Healthcheck del nodo)*
>   - Ruta `/` (Default) $\rightarrow$ `http://localhost:8080` *(Frontend React Capa Zero)*

---

### D. Comandos de Verificación, Sincronización y Prueba de Failover

Una vez levantados los contenedores, puedes verificar que todo esté conectado con estos comandos:

1. **Ver estado de los 3 contenedores y logs en vivo:**
   ```bash
   docker ps
   docker compose logs -f api
   ```

2. **Verificar salud de PostgreSQL 16 y rol del nodo (`/health`):**
   ```bash
   curl -s http://localhost:5000/health
   ```

3. **Verificar conexión con los servidores de música Subsonic (`movil` principal y `musica` secundario):**
   ```bash
   curl -s http://localhost:5000/api/songs/server-status
   ```

4. **Verificar estado del Clúster y forzar sincronización de las 14 tablas entre ambos servidores:**
   ```bash
   curl -s http://localhost:5000/api/songs/cluster-status
   curl -s -X POST http://localhost:5000/api/songs/cluster-sync
   ```

5. **Cómo probar el Failover Automático (`< 2.5 segundos`) en vivo:**
   -Con ambos servidores arriba, abre la aplicación web: verás que opera contra el **Servidor Principal (`https://movil.res0nance.pp.ua`)**.
   - Si detienes el contenedor principal (`docker stop resonance_api` en el servidor `movil`), en menos de **2.5 segundos** el cliente y el reproductor de audio conmutan automáticamente al **Servidor Secundario (`https://musica.res0nance.pp.ua`)**, manteniendo tu usuario, tus playlists, tus comunidades y la música sonando sin caerse.
