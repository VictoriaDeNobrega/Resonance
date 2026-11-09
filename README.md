# Resonance 🎵

> Plataforma de streaming de música colaborativa con salas sincronizadas en tiempo real (Jam), comunidades por géneros y listas de reproducción compartidas.

**Equipo 87 (5. Resonance) — Ingeniería de Software (UCAB)**  
*Integrantes:* Sebastián Pérez, Luis Guerrero, Victoria De Nóbrega, Gabriel Castro, Jesús Medina.

---

## 🛠️ Stack Tecnológico

- **Backend:** C# (.NET 8 Web API) + SignalR (WebSockets de baja latencia < 200 ms).
- **Frontend:** React 18 (Vite) + Lucide Icons + SignalR Client.
- **Base de Datos:** PostgreSQL 16 (vía Entity Framework Core 8).
- **Infraestructura:** Docker & Docker Compose.

---

## 📁 Estructura del Proyecto

```text
Resonance/
├── backend/                  # API REST y Hubs SignalR en C# (.NET 8)
│   └── Resonance.Api/        # Controllers, Hubs, Models, DTOs, Services, Data
├── frontend/                 # Aplicación Web React (Vite)
│   └── src/
│       ├── api/              # Clientes HTTP y conexión WebSockets
│       ├── components/       # Componentes visuales comunes
│       ├── features/         # Módulos aislados por integrante (Cero conflictos Git)
│       │   ├── rooms/        # [Sebastián] Salas de música Jam en tiempo real
│       │   ├── auth/         # [Luis] Perfiles y autenticación
│       │   ├── songs/        # [Gabriel] Catálogo y reproductor global
│       │   ├── communities/  # [Victoria] Comunidades y comentarios
│       │   └── playlists/    # [Jesús] Gestión de playlists
│       └── routes/           # Enrutamiento React Router
├── docker-compose.yml        # Base de datos PostgreSQL lista para correr
└── .gitignore                # Reglas de exclusión para C# y React
```

---

## 🚀 Cómo Ejecutar el Proyecto Localmente

### 1. Levantar la Base de Datos (PostgreSQL)
Con Docker instalado y abierto:
```bash
docker compose up -d
```
Esto creará un contenedor con PostgreSQL escuchando en el puerto `5432`.

### 2. Ejecutar el Backend (C# .NET 8)
```bash
cd backend/Resonance.Api
dotnet restore
dotnet run
```
La API estará corriendo en `http://localhost:5000` (Swagger en `http://localhost:5000/swagger`).

### 3. Ejecutar el Frontend (React)
```bash
cd frontend
npm install
npm run dev
```
La aplicación web abrirá en `http://localhost:5173`.
