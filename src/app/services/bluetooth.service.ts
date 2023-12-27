import { Injectable } from '@angular/core';
import { RequiredModulesService } from './required-modules.service';
// import { Observable, bindNodeCallback } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BluetoothService {
  getOsAsObservable = this.requiredModulesService.os.platform;
  // serial = this.requiredModulesService.serial;
  noble = this.requiredModulesService.ble;
  bluetoothDevices: any = {};

  constructor(private requiredModulesService: RequiredModulesService) {
    let aux_this = this;
    function deviceDiscovered(peripheral: any) {
      try {
        aux_this.bluetoothDevices[peripheral['id']] = peripheral;
        //console.log(peripheral);
      } catch (error) {}
      //console.log(aux_this.bluetoothDevices);
    }
    this.noble.on('discover', deviceDiscovered);
    this.noble.startScanning();
  }

  // async callCLICommand(command: string) {
  //   return new Promise((resolve, reject) => {
  //     this.requiredModulesService.child_process.exec(
  //       command,
  //       (error: Error, stdout: string, stderr: string) => {
  //         if (error) {
  //           console.log(`error: ${error.message}`);
  //           reject(error);
  //         }
  //         if (stderr) {
  //           console.log(`stderr: ${stderr}`);
  //           reject(stderr);
  //         }
  //         resolve(stdout);
  //       }
  //     );
  //   });
  // }

  resetBluetoothDeviceList() {
    this.noble.stopScanning();
    this.bluetoothDevices = {};
    this.noble.startScanning();
  }

  async connectToDevice(id: string) {
    // this.bluetoothDevices[id].connect();
    // let platform = this.getOsAsObservable();
    // if (platform === 'darwin') {
    //   console.log(`blueutil --unpair ${address}`);
    //   return new Promise((resolve, reject) => {
    //     this.callCLICommand(`blueutil --unpair ${address}`)
    //       .then(() => {
    //         console.log(`blueutil --pair ${address}`);
    //         return this.callCLICommand(`sleep 2 && blueutil --pair ${address}`);
    //       })
    //       .then(() => {
    //         console.log(`blueutil --connect ${address}`);
    //         return this.callCLICommand(
    //           `sleep 2 && blueutil --connect ${address}`
    //         );
    //       })
    //       .then(() => {
    //         resolve({ done: true });
    //         return 'done';
    //       })
    //       .catch(() => {
    //         reject({ done: false });
    //         return 'done';
    //       });
    //   });
    // }
    // //TODO
    // else if (platform == 'linux') {
    // }
    // //TODO
    // else if (platform == 'win32') {
    // } else {
    //   return new Promise((resolve, reject) => {
    //     reject({ done: false });
    //   });
    // }
  }
}
