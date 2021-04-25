const { app, BrowserWindow } = require('electron')
const path = require('path')


function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, '/preload.js')
    }
  })

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})


// ipc processing
// ipcMain is ipc object for main process.
const { ipcMain } = require('electron')

ipcMain.on('message', (event, arg) => {
  console.log(arg);
  async() => {
    await sleep(10); 
    event.sender.send('reply', 'pong');
  };
})

function sleep(time) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}
