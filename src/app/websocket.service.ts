import { Injectable } from '@angular/core';
import { RequiredModulesService } from './services/required-modules.service';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  ws = this.requiredModulesService.ws;
  portScanner = this.requiredModulesService.portscanner;

  constructor(private requiredModulesService: RequiredModulesService) {}

  async testWebSocketPort(port: number) {
    let ws = new this.ws.WebSocket('ws://localhost:' + port);
    let open = true;

    await new Promise((res: any, rej: any) => {
      ws.on('open', () => {
        console.log('open');
        open = false;
        res();
      });

      ws.on('error', (error: any) => {
        if (error.code == 'ECONNREFUSED') {
          open = true;
        } else if (error.code == 'WS_ERR_EXPECTED_FIN') {
          open = false;
        }
        res();
        //console.log(JSON.stringify(error));
      });
    });

    return open;
  }

  newWebSocket(port: number) {
    return new this.ws.WebSocketServer({
      port: port,
      perMessageDeflate: {
        zlibDeflateOptions: {
          // See zlib defaults.
          chunkSize: 1024,
          memLevel: 7,
          level: 3,
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024,
        },
        // Other options settable:
        clientNoContextTakeover: true, // Defaults to negotiated value.
        serverNoContextTakeover: true, // Defaults to negotiated value.
        serverMaxWindowBits: 10, // Defaults to negotiated value.
        // Below options specified as default values.
        concurrencyLimit: 10, // Limits zlib concurrency for perf.
        threshold: 1024, // Size (in bytes) below which messages
        // should not be compressed if context takeover is disabled.
      },
    });
  }
}
