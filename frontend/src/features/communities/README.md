# Módulo de Comunidades (Resonance)
**Encargada:** Victoria De Nóbrega  

## Descripción
Módulo encargado de la gestión de comunidades musicales por **Género** o por **Artista**, garantizando nombres únicos, vinculación de playlists comunitarias (sin interferir en la gestión interna de playlists) y muro de interacción comunitaria.

---

## Criterios de Aceptación Implementados

### Escenario 1: Edición exitosa de los datos de la comunidad
- El creador accede a la sección de edición/configuración desde el perfil de la comunidad.
- Modifica la descripción, nombre o género/artista con datos válidos y confirma con "Guardar cambios".
- La información se persiste y la interfaz refleja los cambios en menos de 1.5 segundos.

### Escenario 2: Intento de edición con datos obligatorios vacíos
- Si se deja en blanco el campo `Nombre` o `Género/Artista`:
- El sistema bloquea el envío y muestra el mensaje accesible WCAG:
  > *"El campo [Nombre/Género] no puede estar vacío."*

### Escenario 3: Asociación exitosa de una playlist a la comunidad
- El creador presiona "Agregar playlist", selecciona una playlist disponible o ingresa su identificador y confirma.
- Se crea la relación N:M entre la comunidad y la playlist seleccionada, mostrándose en el catálogo comunitario con notificación de éxito.

### Escenario 4: Intento de agregar una playlist ya vinculada
- Si la playlist seleccionada ya forma parte del catálogo de la comunidad:
- El sistema impide la duplicación y muestra el aviso exacto:
  > *"Esta playlist ya está agregada a la comunidad."*

---

## Requisitos No Funcionales (RNF) Cumplidos

1. **Rendimiento y Tiempo de Respuesta**:
   - Actualización de metadatos en pantalla en menos de 1.5 segundos.
   - Búsqueda, validación y vinculación de playlists en menos de 2 segundos.
2. **Seguridad y Control de Acceso**:
   - **Autorización Backend**: Validación estricta en servidor (`CommunitiesController` y `CommunityService`) de que el usuario solicitante posea el rol activo de creador (`CreatorId`) antes de permitir edición o adición de playlists.
   - **Sanitización e Integridad**: Sanitización de texto libre contra inyecciones XSS y prevención nativa de SQL Injection mediante consultas parametrizadas con Entity Framework Core.
3. **Usabilidad y Accesibilidad (UX & WCAG 2.1 AA)**:
   - Feedback visual inmediato con spinner de carga (`Loader2`) y bloqueo de botones para evitar clics múltiples accidentales.
   - Mensajes de error con alto contraste, `role="alert"`, `aria-live="polite"` y `aria-invalid` compatibles con lectores de pantalla.
   - Coherencia visual total con la paleta oscura de Resonance (`--bg-primary`, `--accent: #8b5cf6`, `lucide-react`).
4. **Confiabilidad y Manejo de Errores**:
   - Transacciones atómicas de base de datos (`BeginTransactionAsync` / rollback automático) en `AddPlaylistAsync` para garantizar la integridad de la relación N:M.

---

## Estructura de Archivos del Módulo

### Frontend (`frontend/src/features/communities/`)
- `services/communityApi.js`: Cliente de comunicación con endpoints REST y fallback resiliente para desarrollo.
- `components/PlaylistCard.jsx`: Tarjeta visual de playlist vinculada con contador de pistas y opción de desvincular.
- `components/CommunityCard.jsx`: Tarjeta para el directorio de comunidades.
- `components/AddPlaylistModal.jsx`: Modal de vinculación con validación de no duplicados y catálogo de playlists disponibles.
- `components/EditCommunityModal.jsx`: Modal de edición con validación de obligatoriedad, nombres únicos y WCAG AA.
- `pages/CreateCommunityModal.jsx`: Modal de creación por Género o Artista.
- `pages/CommunitiesListPage.jsx`: Directorio de comunidades con buscador reactivo, filtros y selector de sesión.
- `pages/CommunityDetailPage.jsx`: Vista detallada con pestañas de Playlists, Muro de Conversación y Acerca de.

### Backend (`backend/Resonance.Api/`)
- `Models/Community.cs`: Entidad con `NormalizedName` (índice único), `CategoryType`, `CategoryValue` y `CreatorId`.
- `Models/CommunityPlaylist.cs`: Entidad de vinculación N:M con índice compuesto único `(CommunityId, PlaylistId)`.
- `Models/CommunityCategoryType.cs`: Enum `Genre` / `Artist`.
- `DTOs/Communities/`: `CommunityDto`, `CreateCommunityDto`, `UpdateCommunityDto`, `AddCommunityPlaylistDto`, `CommunityPlaylistDto`.
- `Services/Interfaces/ICommunityService.cs`: Contrato de servicio.
- `Services/Implementations/CommunityService.cs`: Lógica de negocio, sanitización, autorización y transacciones atómicas.
- `Controllers/CommunitiesController.cs`: Endpoints REST API `/api/communities`.
