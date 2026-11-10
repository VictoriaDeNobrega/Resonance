import * as signalR from '@microsoft/signalr';
import { getServerUrl } from '../config/serverConfig';

export function createRoomHubConnection() {
  const hubUrl = `${getServerUrl()}/hubs/room`;
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      skipNegotiation: false,
      transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
    })
    .withAutomaticReconnect([0, 1000, 3000, 5000, 10000])
    .configureLogging(signalR.LogLevel.Information)
    .build();

  return connection;
}
