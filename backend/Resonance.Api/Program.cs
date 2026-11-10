using Microsoft.EntityFrameworkCore;
using Resonance.Api.Data;
using Resonance.Api.Hubs;
using Resonance.Api.Services.Implementations;
using Resonance.Api.Services.Interfaces;
using Resonance.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Base de datos PostgreSQL con EF Core
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// 2. Registro de Servicios (Inyección de Dependencias)
builder.Services.AddScoped<IRoomService, RoomService>();
builder.Services.AddScoped<ICommunityService, CommunityService>();

// 3. WebSockets en tiempo real con SignalR
builder.Services.AddSignalR();

// 4. Configuración de CORS para React (Vite en http://localhost:5173)
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Imprescindible para SignalR WebSockets
    });
});

// Registro utilizando la interfaz IPlaylistService
builder.Services.AddScoped<IPlaylistService, PlaylistService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddScoped<ISongService, SongService>();

var app = builder.Build();

// Crear la base de datos automáticamente si no existe al arrancar
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        db.Database.EnsureCreated();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Aviso DB] No se pudo conectar a Postgres aún: {ex.Message}");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("CorsPolicy");
app.UseAuthorization();

// Mapeo de Controladores y Hubs
app.MapControllers();
app.MapHub<RoomHub>("/hubs/room");

app.Run();
