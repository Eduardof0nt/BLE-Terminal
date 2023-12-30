const { app, BrowserWindow, ipcMain } = require("electron");
const { exec } = require("child_process");
const sudo = require('sudo-prompt');
const noble = require("@abandonware/noble");
const ws = require('ws');

let appWin;
let serialDevices = {};
let bluetoothDevices = {};

let prod = true;

function deviceDiscovered(peripheral) {
  try {
    if (bluetoothDevices[peripheral['id']]) {
      bluetoothDevices[peripheral['id']] = { ...peripheral, peripheral: bluetoothDevices[peripheral['id']].peripheral, loading: bluetoothDevices[peripheral['id']].loading };
    }
    else {
      bluetoothDevices[peripheral['id']] = { ...peripheral, peripheral: peripheral, loading: false };
    }

  } catch (error) { }
}
noble.on('discover', deviceDiscovered);
noble.startScanning();




// Web Sockets

async function checkWebSocketPort(port) {
  let websocket = new ws.WebSocket('ws://localhost:' + port);
  let open = true;

  await new Promise((res, rej) => {
    websocket.on('open', () => {
      console.log('open');
      open = false;
      res();
    });

    websocket.on('error', (error) => {
      if (error.code == 'ECONNREFUSED') {
        open = true;
      } else if (error.code == 'WS_ERR_EXPECTED_FIN') {
        open = false;
      }
      res();
      //console.log(JSON.stringify(error));
    });
  });

  return open;
}

function newWebSocket(port) {
  return new ws.WebSocketServer({
    port: port,
    perMessageDeflate: {
      zlibDeflateOptions: {
        // See zlib defaults.
        chunkSize: 1024,
        memLevel: 7,
        level: 3,
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024,
      },
      // Other options settable:
      clientNoContextTakeover: true, // Defaults to negotiated value.
      serverNoContextTakeover: true, // Defaults to negotiated value.
      serverMaxWindowBits: 10, // Defaults to negotiated value.
      // Below options specified as default values.
      concurrencyLimit: 10, // Limits zlib concurrency for perf.
      threshold: 1024, // Size (in bytes) below which messages
      // should not be compressed if context takeover is disabled.
    },
  });
}


//Create window

createWindow = async () => {
  let platform = process.platform;

  console.log(prod);

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

  if (!prod) {
    appWin.webContents.openDevTools();
  }

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
          // console.log(stdout);
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
          loading: bluetoothDevices[device].loading,
          connected: bluetoothDevices[device].connected,
        };
      }
    }
    event.returnValue = devices;
  });

  ipcMain.on('connect-to-ble-device', async (event, id) => {
    bluetoothDevices[id].loading = true;
    appWin.webContents.send('set-device-loading', id, true);
    let disconnect = true;
    setTimeout(() => {
      if (disconnect) {
        try {
          failedDevice = bluetoothDevices[id].name;
          appWin.webContents.send('cancel-connect', failedDevice);
          bluetoothDevices[id].peripheral.disconnect();
        } catch (error) {
          console.error(error);
        }
        bluetoothDevices[id].loading = false;
        bluetoothDevices[id].connected = false;
      }
    }, 30000);
    try {
      await bluetoothDevices[id].peripheral.connectAsync();
      disconnect = false;
      const disconnectCallback = () => {
        bluetoothDevices[id].loading = false;
        appWin.webContents.send('set-device-loading', id, false);
        bluetoothDevices[id].connected = false;
      };
      bluetoothDevices[id].peripheral.once('disconnect', disconnectCallback);
      bluetoothDevices[id].loading = false;
      appWin.webContents.send('set-device-loading', id, false);
      bluetoothDevices[id].connected = true;
      let { characteristics } = await bluetoothDevices[
        id
      ].peripheral.discoverAllServicesAndCharacteristicsAsync();
      bluetoothDevices[id].characteristics = characteristics;
      let hasWrite = false;
      let hasRead = false;
      for (let i = 0; i < characteristics.length; i++) {
        if (characteristics[i].properties.includes('write')) {
          hasWrite = true;
        }
      }
      for (let i = 0; i < characteristics.length; i++) {
        if (characteristics[i].properties.includes('notify')) {
          hasRead = true;
        }
      }
      if (hasRead && hasWrite) {
        openSerialWindow(bluetoothDevices[id]);
        for (let i = 0; i < characteristics.length; i++) {
          if (characteristics[i].properties.includes('notify')) {
            characteristics[i].notify(true);
            characteristics[i].on('read', (data) => {
              const textDecoder = new TextDecoder();
              for (let row of textDecoder.decode(data).split('\r\n')) {
                if (row != "") {
                  serialDevices[id].serialLog.push({ data: row, timestamp: Date.now() });
                }
              }
              BrowserWindow.fromId(serialDevices[id].window).webContents.send('update-data', serialDevices[id].serialLog);
            });
          }
        }
      }
      else {
        bluetoothDevices[id].peripheral.disconnect();
      }
    } catch (error) {
      console.error(error);
      bluetoothDevices[id].loading = false;
      appWin.webContents.send('set-device-loading', id, false);
      bluetoothDevices[id].peripheral.disconnect();
    }
    event.returnValue = true;
  });


  // Serial

  ipcMain.on('remove-serial-device', (event, id) => {
    try {
      bluetoothDevices[id].peripheral.disconnect()
      let serialWin = BrowserWindow.fromId(serialDevices[id].window);
      serialWin.close();
    } catch (error) {
      console.error(error);
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

  function serialDeviceWrite(id, command) {
    const utf8EncodeText = new TextEncoder();
    for (let i = 0; i < bluetoothDevices[id].characteristics.length; i++) {
      if (bluetoothDevices[id].characteristics[i].properties.includes('write')) {
        bluetoothDevices[id].characteristics[i].write(
          utf8EncodeText.encode(command),
          false
        );
      }
    }
  }

  ipcMain.on('serial-device-write', (event, id, command) => {
    serialDeviceWrite(id, command);
    event.returnValue = true;
  });


  // Websockets

  ipcMain.on('init-ws', (event, id, port, wsAuth, wsUser, wsPassword) => {
    let webSocketServer = newWebSocket(port);
    serialDevices[id].wsServer = webSocketServer;
    serialDevices[id].wsClient = undefined;
    webSocketServer.on(
      'connection',
      function connection(ws, request) {
        let user = request.headers.user;
        let password = request.headers.password;
        if (
          !serialDevices[id].wsClient &&
          (!wsAuth ||
            (wsAuth &&
              wsUser == user &&
              wsPassword == password))
        ) {
          ws.on('error', console.error);
          serialDevices[id].ws = ws;
          serialDevices[id].wsClient = request.client;
          request.client.on('close', function () {
            try {
              serialDevices[id].wsClient = undefined;
            } catch (error) {
              console.error(error);
            }
          });

          ws.on('message', function message(data) {
            let dataString = new TextDecoder().decode(data);
            serialDeviceWrite(id, dataString);
          });
        } else {
          request.client.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
          request.client.destroy();
        }

        // ws.send('something');
      }
    );
    event.returnValue = true;
  });

  ipcMain.on('close-ws', (event, id) => {
    serialDevices[id].ws = undefined;
    serialDevices[id].wsClient.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
    serialDevices[id].wsClient.destroy();
    serialDevices[id].wsServer.close();
    serialDevices[id].wsServer = undefined;
    serialDevices[id].wsClient = undefined;
    event.returnValue = true;
  });

  ipcMain.on('send-ws', (event, id, command, sent) => {
    try {
      serialDevices[id].ws.send(
        JSON.stringify({
          sent: sent,
          command: command,
        })
      );
    } catch (error) {
      console.error(error);
    }
    event.returnValue = true;
  });

  ipcMain.on('check-port', async (event, port) => {
    event.returnValue = await checkWebSocketPort(port);
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
    title: `${device.advertisement.localName} Serial Monitor`,
    resizable: true,
    webPreferences: {
      // devTools: false,
      contextIsolation: false,
      nodeIntegration: true
    },
  });

  serialWin.maximize();

  serialDevices[device.id] = ({ window: serialWin.id, device: { id: device.id, name: device.advertisement.localName }, serialLog: [], ws: undefined, wsServer: undefined, wsClient: undefined });


  serialWin.loadURL(`file://${__dirname}/dist/index.html#/serial/${encodeURIComponent(JSON.stringify({ id: device.id, name: device.advertisement.localName }))}`);


  serialWin.setMenu(null);

  if (!prod) {
    serialWin.webContents.openDevTools();
  }

  serialWin.on("closed", () => {
    try {
      appWin.webContents.send("serial-disconnect", device.id);
      delete serialDevices[device.id];
      serialWin = null;
    } catch (error) {

    }
  });
}
