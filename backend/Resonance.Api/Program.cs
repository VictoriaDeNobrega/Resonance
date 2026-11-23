using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Resonance.Api.Data;
using Resonance.Api.Hubs;
using Resonance.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Base de datos PostgreSQL 16 con Entity Framework Core 8
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// 2. Clientes HTTP para servidores Subsonic/Navidrome y Sincronización de Clúster (movil <-> musica)
builder.Services.AddHttpClient("Subsonic", client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("Resonance/2.0");
});

builder.Services.AddHttpClient("ClusterPeer", client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("Resonance-ClusterSync/2.0");
});

// 3. Repositorios de Persistencia PostgreSQL (SRP — Capa Data)
builder.Services.AddScoped<UserRepository>();
builder.Services.AddScoped<SongRepository>();
builder.Services.AddScoped<SubsonicCatalogRepository>();
builder.Services.AddScoped<PlaylistRepository>();
builder.Services.AddScoped<CommunityRepository>();
builder.Services.AddScoped<RoomRepository>();

// 4. Servicios Especializados (Subsonic/Navidrome, Buscador Global HU 1.3, Control Email/Tokens y Sincronización Clúster)
builder.Services.AddScoped<INavidromeService, NavidromeService>();
builder.Services.AddScoped<ISearchService, SearchService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddSingleton<ClusterSyncService>();
builder.Services.AddSingleton<IClusterSyncService>(sp => sp.GetRequiredService<ClusterSyncService>());
builder.Services.AddHostedService(sp => sp.GetRequiredService<ClusterSyncService>());

// 5. Servicios de Dominio POO (20 Historias de Usuario)
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ISongService, SongService>();
builder.Services.AddScoped<IPlaylistService, PlaylistService>();
builder.Services.AddScoped<ICommunityService, CommunityService>();
builder.Services.AddScoped<IRoomService, RoomService>();

// 6. Emisor Centralizado de Eventos en Tiempo Real SignalR
builder.Services.AddScoped<IRealtimeBroadcaster, RealtimeBroadcaster>();

// 7. WebSockets en tiempo real con SignalR (<= 200 ms, reconexión transparente)
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.KeepAliveInterval = TimeSpan.FromSeconds(10);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
    options.HandshakeTimeout = TimeSpan.FromSeconds(15);
});

// 8. Configuración CORS (Soporta todos los orígenes del clúster res0nance.pp.ua y desarrollo local)
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 9. Controladores REST + Serialización JSON + Swagger OpenAPI
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// 10. Inicialización del esquema de 14 tablas en PostgreSQL 16 y sincronización Subsonic
try
{
    await DbInitializer.InitializeAsync(app.Services);
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "[DbInitializer] Error inicializando PostgreSQL 16 o sincronizando Subsonic.");
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("CorsPolicy");
app.UseAuthorization();

app.MapGet("/health", async (AppDbContext db, IConfiguration config, CancellationToken ct) =>
{
    var canConnect = await db.Database.CanConnectAsync(ct);
    return Results.Ok(new
    {
        status = canConnect ? "healthy" : "degraded",
        nodeRole = config["ClusterSync:NodeRole"] ?? "primary",
        selfUrl = config["ClusterSync:SelfPublicUrl"] ?? "https://movil.res0nance.pp.ua",
        peerUrl = config["ClusterSync:PeerPublicUrl"] ?? "https://musica.res0nance.pp.ua",
        database = "PostgreSQL 16",
        connected = canConnect,
        timestampUtc = DateTime.UtcNow
    });
});

app.MapControllers();
app.MapHub<RoomHub>("/hubs/room");
app.MapHub<CommunityHub>("/hubs/community");

app.Run();
