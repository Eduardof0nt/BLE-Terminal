import { Injectable } from '@angular/core';

function _window(): any {
  // return the global browser window object
  return window;
}

@Injectable({
  providedIn: 'root',
})
export class RequiredModulesService {
  constructor() {}

  get browserWindow(): any {
    return _window();
  }

  // get fs(): any {
  //   return this.browserWindow.NODE_FS;
  // }

  // get os(): any {
  //   return this.browserWindow.NODE_OS;
  // }

  // get path(): any {
  //   return this.browserWindow.NODE_PATH;
  // }

  // get child_process(): any {
  //   return this.browserWindow.NODE_CHILD_PROCESS;
  // }

  // get serial(): any {
  //   return this.browserWindow.NODE_SERIAL;
  // }

  // get ble(): any {
  //   return this.browserWindow.NODE_BLE;
  // }

  get ws(): any {
    return this.browserWindow.WEB_SOCKET;
  }

  // get portscanner(): any {
  //   return this.browserWindow.PORT_SCANNER;
  // }
}
