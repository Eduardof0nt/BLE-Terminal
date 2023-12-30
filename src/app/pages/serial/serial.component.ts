import { Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AppComponent } from 'src/app/app.component';
import { ChangeDetectorRef } from '@angular/core';
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
  wsPort: number = 8080;
  checkingPort: boolean = false;
  portError: boolean = false;
  wsAuth: boolean = false;
  wsClientConnected: boolean = false;
  wsUser: string = '';
  wsPassword: string = '';
  command: string = '';

  constructor(
    private appComponent: AppComponent,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.loadSerial();
  }

  ngOnInit() {
    this.device = JSON.parse(
      <string>this.route.snapshot.paramMap.get('device')
    );
  }

  ngOnDestroy() {
    if (this.websocketEnabled) {
      this.closeWebSocket();
    }
  }

  loadSerial() {
    this.appComponent.electron.ipcRenderer.on(
      'update-data',
      (event: any, serialData: any[]) => {
        for (let i = this.data.length; i < serialData.length; i++) {
          if (this.websocketEnabled) {
            this.appComponent.electron.ipcRenderer.sendSync(
              'send-ws',
              this.device.id,
              serialData[i].data,
              false
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
        }, 500);
        return true;
      }
    );
  }

  sendCommand() {
    if (this.websocketEnabled) {
      this.appComponent.electron.ipcRenderer.sendSync(
        'send-ws',
        this.device.id,
        this.command,
        true
      );
    }
    this.appComponent.electron.ipcRenderer.sendSync(
      'serial-device-write',
      this.device.id,
      this.command
    );
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
    this.checkingPort = true;
    this.portError = !this.appComponent.electron.ipcRenderer.sendSync(
      'check-port',
      this.wsPort
    );
    this.checkingPort = false;
  }

  openWebSocket() {
    this.websocketEnabled = true;
    this.appComponent.electron.ipcRenderer.sendSync(
      'init-ws',
      this.device.id,
      this.wsPort,
      this.wsAuth,
      this.wsUser,
      this.wsPassword
    );
  }

  closeWebSocket() {
    this.websocketEnabled = false;
    this.wsClientConnected = false;
    this.appComponent.electron.ipcRenderer.sendSync('close-ws', this.device.id);
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
