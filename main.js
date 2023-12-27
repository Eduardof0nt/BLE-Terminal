const { app, BrowserWindow, ipcMain } = require("electron");
const { exec } = require("child_process");
const sudo = require('sudo-prompt');
const noble = require("@abandonware/noble");


let appWin;
let serialDevices = {};
let bluetoothDevices = {};
function deviceDiscovered(peripheral) {
  try {
    bluetoothDevices[peripheral['id']] = peripheral;
    // console.log(peripheral);
  } catch (error) { }
  //console.log(aux_this.bluetoothDevices);
}
noble.on('discover', deviceDiscovered);
noble.startScanning();

createWindow = async () => {
  let platform = process.platform;

  appWin = new BrowserWindow({
    width: 400,
    height: 400,
    title: "Laboratory Blutooth Data Logger",
    resizable: true,
    webPreferences: {
      // devTools: false,
      contextIsolation: false,
      nodeIntegration: true
    },
    address: 'Test'
  });

  appWin.setMenu(null);

  appWin.webContents.openDevTools();

  appWin.loadURL(`file://${__dirname}/dist/index.html#/loading`);

  appWin.maximize();


  if (platform == "darwin") {
    await new Promise((resolve, reject) => {
      exec("clang --version", (error, stdout, stderr) => {
        if (error) {
          console.log(`error: ${error.message}`);
          exec("xcode-select --install", (error, stdout, stderr) => {
            if (error) {
              console.log(`error: ${error.message}`);
              app.quit();
              reject();
            }
            if (stderr) {
              console.log(`stderr: ${stderr}`);
              reject();
            }
            console.log(`stdout: ${stdout}`);
            resolve();
          });
        }
        else {
          // if (stdout.split("\n")[0].split("Power: ")[1] != "1") {
          //     exec("blueutil -p 1", (error, stdout, stderr) => {
          //         if (error) {
          //             console.log(`error: ${error.message}`);
          //             app.quit();
          //             reject();
          //         }
          //         if (stderr) {
          //             console.log(`stderr: ${stderr}`);
          //             reject();
          //         }
          //         resolve();
          //     });
          // }
          resolve();
        }
      });
    }).catch(() => { app.quit() });

  }

  else if (platform == "linux") {
    await new Promise((resolve, reject) => {
      exec("bluetoothd -v", (error, stdout, stderr) => {
        if (error) {
          console.error(`error: ${error.message}`);
          sudo.exec("apt-get install -y bluetooth bluez libbluetooth-dev libudev-dev", {
            name: 'BLE Terminal',
            //icns: '/path/to/icns/file', // (optional)
          }, (error, stdout, stderr) => {
            if (error) {
              app.quit();
              reject()
            }
            else {
              resolve();
            }
          });
        }
        else {
          console.log(stdout);
          resolve();
        }
      });
    }).catch(() => { app.quit() });

    //Raspberry Pi: DisablePlugins=pnat in /etc/bluetooth/main.conf and reboot
  }

  //TODO
  else if (platform == "win32") {
    await new Promise((resolve, reject) => {
      sudo.exec("npm install --global --production windows-build-tools", {
        name: 'BLE Terminal',
        //icns: '/path/to/icns/file', // (optional)
      }, (error, stdout, stderr) => {
        if (error) {
          console.log(`error: ${error.message}`);
          // reject()
          resolve();
        }
        else {
          resolve();
        }
      });
    }).catch(() => { app.quit() });
  }

  else {
    app.quit();
  }

  // Main process to render comunication


  // BLE
  ipcMain.on('reset-ble-devices', (event) => {
    noble.stopScanning();
    bluetoothDevices = {};
    noble.startScanning();
    event.returnValue = true;
  });

  ipcMain.on('get-ble-devices', (event) => {
    let devices = {};
    for (let device in bluetoothDevices) {
      if (bluetoothDevices[bluetoothDevices[device].id]) {
        devices[bluetoothDevices[device].id] = {
          name: bluetoothDevices[device].advertisement.localName || 'No Name',
          id: bluetoothDevices[device].id,
          rssi: bluetoothDevices[device].rssi,
          // peripheral: bluetoothDevices[bluetoothDevices[device].id],
          loading: bluetoothDevices[bluetoothDevices[device].id].loading,
          connected: bluetoothDevices[bluetoothDevices[device].id].connected,
          characteristics: bluetoothDevices[bluetoothDevices[device].id].characteristics,
          serial: bluetoothDevices[bluetoothDevices[device].id].serial,
        };
      }
    }
    event.returnValue = devices;
  });

  ipcMain.on('connect-to-ble-device', async (event) => {
    // TODO
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
          } catch (error) { }
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
          characteristics[i].on('read', (data) => {
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
    event.returnValue = true;
  });


  // Serial

  ipcMain.on('get-serial-devices', (event) => {
    event.returnValue = serialDevices;
  });

  ipcMain.on('begin-serial-device', (event, device) => {
    openSerialWindow(device);
    event.returnValue = true;
  });

  ipcMain.on('remove-serial-device', (event, id) => {
    try {
      let serialWin = BrowserWindow.fromId(serialDevices[id].window);
      serialWin.close();
    } catch (error) {

    }
    event.returnValue = true;
  })

  ipcMain.on('serial-device-read', (event, data) => {
    for (let row of data.data.split('\r\n')) {
      if (row != "") {
        serialDevices[data.id].serialLog.push({ data: row, timestamp: Date.now() });
      }
    }
    BrowserWindow.fromId(serialDevices[data.id].window).webContents.send('update-data', serialDevices[data.id].serialLog);
    event.returnValue = true;
  });

  ipcMain.on('serial-device-write', (event, data) => {
    appWin.webContents.send("serial-write", data);
    event.returnValue = true;
  });


  // Websockets

  appWin.loadURL(`file://${__dirname}/dist/index.html`);

  appWin.on("closed", () => {
    app.quit();
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  for (const [key, value] of Object.entries(serialDevices)) {
    let serialWin = BrowserWindow.fromId(serialDevices[key].window);
    serialWin.close();
  }
  app.quit();
});

openSerialWindow = (device) => {
  let serialWin = new BrowserWindow({
    width: 1200,
    height: 800,
    title: `${device.name} Serial Monitor`,
    resizable: true,
    webPreferences: {
      // devTools: false,
      contextIsolation: false,
      nodeIntegration: true
    },
  });

  serialWin.maximize();

  serialDevices[device.id] = ({ window: serialWin.id, device: device, serialLog: [] });


  serialWin.loadURL(`file://${__dirname}/dist/index.html#/serial/${encodeURIComponent(JSON.stringify(device))}`);


  serialWin.setMenu(null);

  serialWin.webContents.openDevTools();

  serialWin.on("closed", () => {
    try {
      appWin.webContents.send("serial-disconnect", device.id);
      delete serialDevices[device.id];
      serialWin = null;
    } catch (error) {

    }
  });
}
