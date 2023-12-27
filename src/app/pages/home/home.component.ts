import { Component } from '@angular/core';
import { AppComponent } from 'src/app/app.component';
import { BluetoothService } from 'src/app/services/bluetooth.service';
declare var $: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  platform: string = '';
  devices: any = {};
  connectedDevices: any[] = [];
  keepReloading = true;
  failedDevice: string = '';
  constructor(
    private bluetoothService: BluetoothService,
    private appComponent: AppComponent
  ) {
    this.platform = this.bluetoothService.getOsAsObservable();
    this.pool();
    this.appComponent.electron.ipcRenderer.on(
      'serial-disconnect',
      async (event: any, id: string) => {
        this.disconnectDevice(id);
        return true;
      }
    );
    this.appComponent.electron.ipcRenderer.on(
      'serial-write',
      async (event: any, data: any) => {
        this.sendToDevice(data.id, data.command);
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
    }, 30);
  }

  async getDevices() {
    let devices: any = this.bluetoothService.bluetoothDevices;
    for (let device in devices) {
      if (this.devices[devices[device].id]) {
        this.devices[devices[device].id] = {
          name: devices[device].advertisement.localName || 'No Name',
          id: devices[device].id,
          rssi: devices[device].rssi,
          peripheral: this.devices[devices[device].id].peripheral,
          loading: this.devices[devices[device].id].loading,
          connected: this.devices[devices[device].id].connected,
          characteristics: this.devices[devices[device].id].characteristics,
          serial: this.devices[devices[device].id].serial,
        };
      } else {
        this.devices[devices[device].id] = {
          name: devices[device].advertisement.localName || 'No Name',
          id: devices[device].id,
          peripheral: devices[device],
          rssi: devices[device].rssi,
          characteristics: undefined,
          loading: false,
          connected: devices[device].state == 'connected',
          serial: false,
        };
      }
    }
  }

  resetDeviceList() {
    this.devices = {};
    this.bluetoothService.resetBluetoothDeviceList();
    this.devices = {};
  }

  async connectToDevice(id: string) {
    this.devices[id].loading = true;
    let disconnect = true;
    setTimeout(() => {
      if (disconnect) {
        try {
          this.failedDevice = this.devices[id].name;
          try {
            let modal = $('.modal');
            // modal.modal({ backdrop: 'static', keyboard: false });
            modal.modal('close');
          } catch (error) {}
          let modal = $('.modal');
          // modal.modal({ backdrop: 'static', keyboard: false });
          modal.modal('show');
          this.devices[id].peripheral.disconnect();
        } catch (error) {
          console.error(error);
        }
        this.devices[id].loading = false;
        this.devices[id].connected = false;
      }
    }, 30000);
    try {
      await this.devices[id].peripheral.connectAsync();
      disconnect = false;
      let aux_this = this;
      const disconnectCallback = () => {
        aux_this.devices[id].loading = false;
        aux_this.devices[id].connected = false;
      };
      this.devices[id].peripheral.once('disconnect', disconnectCallback);
      this.devices[id].loading = false;
      this.devices[id].connected = true;
      const { characteristics } = await this.devices[
        id
      ].peripheral.discoverAllServicesAndCharacteristicsAsync();
      this.devices[id].characteristics = characteristics;
      this.peripheralConnected(this.devices[id]);
      for (let i = 0; i < characteristics.length; i++) {
        if (characteristics[i].properties.includes('notify')) {
          characteristics[i].notify(true);
          characteristics[i].on('read', (data: Uint8Array) => {
            this.appComponent.electron.ipcRenderer.sendSync(
              'serial-device-read',
              {
                id: id,
                data: data.toString(),
              }
            );
          });
        }
      }
    } catch (error) {
      this.devices[id].peripheral.disconnect();
    }
  }

  disconnectDevice(id: string) {
    this.devices[id].peripheral.disconnect();
    this.appComponent.electron.ipcRenderer.sendSync('remove-serial-device', id);
  }

  async peripheralConnected(device: any) {
    this.appComponent.electron.ipcRenderer.sendSync('begin-serial-device', {
      id: device.id,
      name: device.name,
    });
  }

  sendToDevice(id: string, command: string) {
    const utf8EncodeText = new TextEncoder();
    for (let i = 0; i < this.devices[id].characteristics.length; i++) {
      if (this.devices[id].characteristics[i].properties.includes('write')) {
        this.devices[id].characteristics[i].write(
          utf8EncodeText.encode(command),
          false
        );
      }
    }
  }

  getObjectKeys(object: any) {
    return Object.keys(object);
  }
}
