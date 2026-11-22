FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["Resonance.Api.csproj", "./"]
RUN dotnet restore "Resonance.Api.csproj"

COPY . .
RUN dotnet publish "Resonance.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 5000
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Resonance.Api.dll"]
