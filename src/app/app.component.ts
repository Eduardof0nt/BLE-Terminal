import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'bluetooth-serial';
  electron: any;

  constructor() {
    this.electron = (<any>window).require('electron');
  }
}
