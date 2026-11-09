import * as signalR from '@microsoft/signalr';

const HUB_URL = 'http://localhost:5000/hubs/room';

export function createRoomHubConnection() {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, {
      skipNegotiation: false,
      transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
    })
    .withAutomaticReconnect([0, 1000, 3000, 5000, 10000])
    .configureLogging(signalR.LogLevel.Information)
    .build();

  return connection;
}
