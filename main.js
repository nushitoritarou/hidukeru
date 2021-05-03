const { app, BrowserWindow } = require('electron')
const path = require('path')
let mainWin

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      //devTools: false,  // comment out in dev environment
      preload: path.join(__dirname, '/preload.js')
    }
  })
  win.loadFile('index.html');
  mainWin = win;
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
const { ipcMain, dialog } = require('electron')


ipcMain.on('files', (event, arg) => {
  console.log(arg[0]);
  event.sender.send('reply', 'pong');
})

ipcMain.on('select-dirs', async (event, arg) => {
  // ファイルを選択
  const paths = dialog.showOpenDialogSync(mainWin, {
    buttonLabel: '開く',  // 確認ボタンのラベル
    properties:[
      'openDirectory',
      'multiSelections',
      'createDirectory',  
    ]
  });
  event.sender.send('selected-dirs', paths);

})


