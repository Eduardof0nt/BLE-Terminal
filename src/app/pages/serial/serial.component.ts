import { Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AppComponent } from 'src/app/app.component';
import { ChangeDetectorRef } from '@angular/core';
import { WebsocketService } from 'src/app/services/websocket.service';
import { Debounce } from 'angular-debounce-throttle';
declare var $: any;

@Component({
  selector: 'app-serial',
  templateUrl: './serial.component.html',
  styleUrls: ['./serial.component.scss'],
})
export class SerialComponent {
  @Input() data: any[] = [];
  device: any;
  recording: boolean = false;
  autoscroll: boolean = false;
  websocketEnabled: boolean = false;
  websocketServer: any;
  ws: any;
  wsPort: number = 8080;
  //checkingPort: boolean = false;
  portError: boolean = false;
  wsAuth: boolean = false;
  wsClientConnected: boolean = false;
  wsUser: string = '';
  wsPassword: string = '';
  command: string = '';

  constructor(
    private appComponent: AppComponent,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private webSocketService: WebsocketService
  ) {
    this.loadSerial();
    //this.openWebSocket();
  }

  ngOnInit() {
    this.device = JSON.parse(
      <string>this.route.snapshot.paramMap.get('device')
    );
  }

  ngOnDestroy() {
    if (this.ws) {
      this.websocketServer.close();
    }
  }

  loadSerial() {
    this.appComponent.electron.ipcRenderer.on(
      'update-data',
      (event: any, serialData: any[]) => {
        for (let i = this.data.length; i < serialData.length; i++) {
          if (this.ws) {
            this.ws.send(
              JSON.stringify({
                sent: false,
                command: serialData[i].data,
              })
            );
          }
          this.data.push({
            ...serialData[i],
            recording: this.recording,
            timestampString: new Date(serialData[i].timestamp).toLocaleString(
              'es-CR'
            ),
          });
        }
        this.cdr.detectChanges();
        setTimeout(() => {
          if (this.autoscroll) {
            const elmnt = document.querySelector(
              'table > tbody > tr:last-child'
            );
            (<any>elmnt).scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest',
            });
          }
        }, 300);
        return true;
      }
    );
  }

  sendCommand() {
    if (this.ws) {
      this.ws.send(
        JSON.stringify({
          sent: true,
          command: this.command,
        })
      );
    }
    this.appComponent.electron.ipcRenderer.sendSync('serial-device-write', {
      id: this.device.id,
      command: this.command,
    });
    this.command = '';
  }

  toogleRecording() {
    this.recording = !this.recording;
  }

  toogleAutoscroll() {
    this.autoscroll = !this.autoscroll;
  }

  webSocketButton() {
    if (this.websocketEnabled) {
      this.closeWebSocketModal();
    } else {
      this.openWebSocketModal();
    }
  }

  openWebSocketModal() {
    let modal = $('#ws-modal');
    // modal.modal({ backdrop: 'static', keyboard: false });
    modal.modal('show');
    this.portError = true;
    this.checkPort();
  }

  closeWebSocketModal() {
    let modal = $('#ws-close-modal');
    // modal.modal({ backdrop: 'static', keyboard: false });
    modal.modal('show');
  }

  @Debounce(500)
  async checkPort() {
    //this.checkingPort = true;
    this.portError = !(await this.webSocketService.testWebSocketPort(
      this.wsPort
    ));
    //this.checkingPort = false;
  }

  openWebSocket() {
    this.websocketEnabled = true;
    this.websocketServer = this.webSocketService.newWebSocket(this.wsPort);
    let aux_this = this;
    this.websocketServer.on(
      'connection',
      function connection(ws: any, request: any) {
        //console.log(aux_this.wsClientConnected);
        let user = request.headers.user;
        let password = request.headers.password;
        if (
          !aux_this.wsClientConnected &&
          (!aux_this.wsAuth ||
            (aux_this.wsAuth &&
              aux_this.wsUser == user &&
              aux_this.wsPassword == password))
        ) {
          ws.on('error', console.error);
          aux_this.ws = ws;
          aux_this.wsClientConnected = true;
          request.client.on('close', function () {
            aux_this.wsClientConnected = false;
          });
          ws.on('message', function message(data: any) {
            let dataString = new TextDecoder().decode(data);
            //console.log(dataString);
            aux_this.appComponent.electron.ipcRenderer.sendSync(
              'serial-device-write',
              {
                id: aux_this.device.id,
                command: dataString,
              }
            );
          });
        } else {
          request.client.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
          request.client.destroy();
          //aux_this.wsClientConnected = false;
        }

        // ws.send('something');
      }
    );
  }

  closeWebSocket() {
    this.websocketEnabled = false;
    this.wsClientConnected = false;
    this.ws = undefined;
    this.websocketServer.close();
  }

  exportData() {
    let fileName = 'data.csv';
    let fileContents = 'timestamp,data';
    let data = this.data.filter((row: any) => {
      return row.recording;
    });

    for (let row of data) {
      fileContents = fileContents + '\n' + row.timestamp + ',' + row.data;
    }

    const file = new Blob([fileContents], { type: 'text/csv;charset=utf-8' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = fileName;
    link.click();
    link.remove();
  }
}
