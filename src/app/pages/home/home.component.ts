import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { AppComponent } from 'src/app/app.component';
declare var $: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  @Input() devices: any = {};
  keepReloading = true;
  failedDevice: string = '';
  constructor(
    private appComponent: AppComponent,
    private cdr: ChangeDetectorRef
  ) {
    let aux_this = this;
    this.pool();
    this.appComponent.electron.ipcRenderer.on(
      'serial-disconnect',
      async (event: any, id: string) => {
        aux_this.disconnectDevice(id);
        return true;
      }
    );

    this.appComponent.electron.ipcRenderer.on(
      'cancel-connect',
      async (event: any, failedDevice: any) => {
        try {
          aux_this.failedDevice = failedDevice;
          let modal = $('.modal');
          modal.modal('close');
        } catch (error) {}
        let modal = $('.modal');
        modal.modal('show');
        return true;
      }
    );

    this.appComponent.electron.ipcRenderer.on(
      'set-device-loading',
      (event: any, id: string, loading: boolean) => {
        aux_this.devices[id].loading = loading;
        aux_this.cdr.detectChanges();
        return true;
      }
    );
  }

  ngOnDestroy() {
    this.keepReloading = false;
  }

  pool() {
    let aux_this = this;
    setTimeout(() => {
      if (aux_this.keepReloading) {
        aux_this.getDevices();
        aux_this.pool();
      }
    }, 100);
  }

  getDevices() {
    let aux_this = this;
    let devices = this.appComponent.electron.ipcRenderer.sendSync(
      'get-ble-devices',
      {}
    );
    for (let device of Object.keys(devices)) {
      aux_this.devices[device] = {
        name: devices[device].name,
        id: devices[device].id,
        rssi: devices[device].rssi,
        loading: devices[device].loading,
        connected: devices[device].connected,
      };
    }
    this.cdr.detectChanges();
  }

  resetDeviceList() {
    this.devices = {};
    this.devices = this.appComponent.electron.ipcRenderer.sendSync(
      'reset-ble-devices',
      {}
    );
    this.devices = {};
  }

  async connectToDevice(id: string) {
    // Async
    this.appComponent.electron.ipcRenderer.send('connect-to-ble-device', id);
  }

  disconnectDevice(id: string) {
    this.appComponent.electron.ipcRenderer.sendSync('remove-serial-device', id);
  }

  getObjectKeys(object: any) {
    return Object.keys(object);
  }
}
