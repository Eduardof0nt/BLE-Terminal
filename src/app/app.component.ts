import { Component } from '@angular/core';
import { BluetoothService } from './services/bluetooth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'bluetooth-serial';
  electron: any;
  platform: string = '';

  constructor(private bluetoothService: BluetoothService) {
    this.electron = (<any>window).require('electron');
    this.platform = bluetoothService.getOsAsObservable();
  }
}
