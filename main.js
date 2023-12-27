const { app, BrowserWindow, ipcMain } = require("electron");
const { exec } = require("child_process");
const sudo = require('sudo-prompt');


let appWin;
let serialDevices = {};

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
