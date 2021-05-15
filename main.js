const { app, Menu, BrowserWindow, shell } = require('electron')
const path = require('path')
let mainWin
const CONFIG_FILE_PATH = './config.json';
var PAD_LENGTH = 3;
var FILE_NAME_FORMAT = '[date]_[str_index]';
var OUT_DIR_FROM_CONFIG = "";

var GitHubUrl = 'https://github.com/nushitoritarou/hidukeru';
// メニュー
const template = Menu.buildFromTemplate([
  ...[{
    label: app.name+'アプリ',
    submenu: [
      { role: 'about', label: `${app.name}について` },
    { label: `GitHub Repository`, click: function () { shell.openExternal(GitHubUrl); } },
      { role: 'quit', label: `${app.name}を終了` }
    ]
  }]
]);
// About Panel
app.setAboutPanelOptions({
  applicationName: 'hidukeru',
  applicationVersion: 'dev',
  copyright: 'Copyright (c) 2021 nushitoritarou',
  version: 'dev',
  authors: ['nushitoritarou'],
  website: GitHubUrl,
  iconPath: 'image/icon.png'
});
// メニューを適用する
Menu.setApplicationMenu(template);


function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      //devTools: false,  // comment out in dev environment
      preload: path.join(__dirname, '/preload.js')
    }
  })
  win.loadFile(__dirname + '/index.html');
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

//ファイル選択ダイアログ
ipcMain.on('select-dirs', async (event, arg) => {
  // ファイルを選択
  const paths = dialog.showOpenDialogSync(mainWin, {
    buttonLabel: '開く',  // 確認ボタンのラベル
    properties: [
      'openDirectory',
      'multiSelections',
      'createDirectory',
    ]
  });
  event.sender.send('selected-dirs', paths);
})

ipcMain.on('open-output-path', async (event, arg) => {
  shell.openPath(arg);
})

ipcMain.on('load-config', async (event, arg) => {
  fs.promises.readFile(CONFIG_FILE_PATH, 'utf-8').then(function (configFile) {
    var configJson = JSON.parse(configFile);
    event.sender.send('config-param', configJson);
  }, function (err) {
    event.sender.send('config-param', undefined);
  });
})

ipcMain.on('save-config', async (event, arg) => {
  fs.promises.writeFile(CONFIG_FILE_PATH, arg).catch((err) => { throw err; });
  event.sender.send('save-config-result', "SUCCESS");
})

ipcMain.on('file-path-list', async (event, arg) => {
  ExecuteRename(arg).then((result) => {
    mainWin.webContents.send('rename-result', result);
  });
})

const fs = require('fs');
const sharp = require("sharp");
const exif = require('exif-reader');
const EXIF_PROPERTIES = ["[image]", "[thumbnail]", "[exif]"];
// ファイル名変更処理実行
async function ExecuteRename(filePathListOrg) {
  sendProgress(0);
  await loadConfig();
  //重複削除
  const uniqueFilePathList = [...new Set(filePathListOrg)];

  if (uniqueFilePathList.length < 1) return new RenameResult('WRONG_LIST_SIZE');
  var OUTPUT_DIR = "";

  try {
    OUTPUT_DIR = await getOutputDirectory(uniqueFilePathList);
  } catch (e) {
    // No such file or directory
    if (e.code == "ENOENT") {
      return new RenameResult("ENOENT", e.path);
    }
  }
  JpgFileObject.fileNameProperties = getPropertyList(FILE_NAME_FORMAT);

  //ファイル一覧を取得,jpegに絞る
  var jpegFileList = [];
  for (let element of uniqueFilePathList) {
    let pathlist = await getFileList(element).catch((e) => {
      // No such file or directory
      if (e.code == "ENOENT") {
        return new RenameResult("ENOENT", e.path);
      }
    });
    jpegFileList.push(...pathlist);
  }
  const PROGRESS_DENOMINATOR = jpegFileList.length * 3;
  var PROGRESS_NUMERATOR = 0;

  var jpegClassList = jpegFileList.map(m => new JpgFileObject(m));
  //exif情報からタイムスタンプを取得
  for (let jpegClassObject of jpegClassList) {
    let mtime = '';
    let exifData = '';
    try {
      exifData = await getExif(jpegClassObject).catch(async (err) => {
        throw err;
      });
      jpegClassObject.setExif(exifData);
    } catch (err) {
      mtime = await getCreatedDateTime(jpegClassObject);
      jpegClassObject.createdDateTime = mtime;
    }
    PROGRESS_NUMERATOR++;
    sendProgress(100 * PROGRESS_NUMERATOR / PROGRESS_DENOMINATOR);
  }
  //ソート，インデックスの付与
  var sortedClassList = jpegClassList.sort(function (a, b) {
    if (a.createdDateTime < b.createdDateTime) return -1;
    if (a.createdDateTime > b.createdDateTime) return 1;
    return 0;
  });

  // add file index on the date
  var fileCount = 1;
  var processingDate = '';
  sortedClassList.forEach(function (element) {
    if (processingDate == element.getDate()) {
      fileCount += 1;
    }
    else {
      fileCount = 1;
      processingDate = element.getDate();
    }
    element.index = fileCount;
    PROGRESS_NUMERATOR++;
    sendProgress(100 * PROGRESS_NUMERATOR / PROGRESS_DENOMINATOR);
  })

  //日付ごとフォルダの作成
  const dateList = [...new Set(sortedClassList.map(e => e.getDate()))];
  var existsDate = [];
  for (let element of dateList) {
    let dirPath = OUTPUT_DIR + "\\" + element;
    let directoryExistsFlg = await directoryExists(dirPath);
    if (!directoryExistsFlg) {
      await fs.promises.mkdir(dirPath).catch((e) => {
        // No such file or directory
        if (e.code == "ENOENT") {
          return new RenameResult("ENOENT", e.path);
        }
      });
    }
    else {
      existsDate.push(element);
    }
  }
  // ファイルのコピー
  // 日付のフォルダがすでにあった場合はコピーしない
  for (let element of sortedClassList) {
    PROGRESS_NUMERATOR++;
    sendProgress(100 * PROGRESS_NUMERATOR / PROGRESS_DENOMINATOR);
    if (existsDate.includes(element.getDate())) continue;

    let outDirPath = OUTPUT_DIR + "\\" + element.getDate();
    let outFilePath = outDirPath + "\\" + element.createFileName();
    fs.promises.copyFile(element.path, outFilePath).catch((e) => {
      // No such file or directory
      if (e.code == "ENOENT") {
        return new RenameResult("ENOENT", e.path);
      }
    });
  }
  if (existsDate.length == 0) {
    return new RenameResult("SUCCESS", OUTPUT_DIR);
  }
  else {
    return new RenameResult("DUPLICATE", OUTPUT_DIR, existsDate);
  }
}

// renameに必要な情報をまとめて保持
// class holds the information needed for rename
class JpgFileObject {
  constructor(path) {
    this.path = path;
    //yyyymmddhhmmssfff
    this.createdDateTime = "";
    this.index = 0;
    this.exif = '';
  }
  static fileNameProperties = [];

  getDate() {
    return this.createdDateTime.substr(0, 'yyyymmdd'.length);
  }
  setExif(exifData) {
    this.exif = exifData;
    this.createdDateTime = exifData['exif']['DateTimeOriginal'].toISOString().replace(/-/g, "").replace("T", "").replace(/:/g, "").replace(".", "").replace("Z", "");
  }
  createFileName(nameFormat = FILE_NAME_FORMAT) {
    let result = nameFormat;
    this.date = this.getDate();
    this.str_index = this.zeroPadIndex(PAD_LENGTH);
    for (let i = 0; i < JpgFileObject.fileNameProperties.length; i++) {
      let properties = JpgFileObject.fileNameProperties;
      result = result.replace(properties[i], this.getPropertyValue(properties[i]));
    }
    return result + path.extname(this.path);
  }
  zeroPadIndex(length) {
    return ('000000000000000' + this.index).slice(-length);
  }
  // getPropertyValue("[date]") -> this.date
  // getPropertyValue("[exif][DateTimeOriginal]") -> this.exif.DateTimeOriginal
  getPropertyValue(propertyName) {
    let propertyList = getPropertyList(propertyName);
    var objectFlg = false
    var beforeObject = '';
    for (let i = 0; i < propertyList.length; i++) {
      if (EXIF_PROPERTIES.includes(propertyList[i])) {
        objectFlg = true;
        beforeObject = result[i];
      }
      else {
        if (objectFlg) {
          return this[trimIdentifier(beforeObject)][trimIdentifier(propertyList[i])];
        } else {
          return this[trimIdentifier(propertyList[i])];
        }
      }
    }
    return "";
  }
}

class RenameResult {
  constructor(message, info = "", dupList = []) {
    this.message = message;
    this.info = info;
    this.duplicateList = dupList;
  }
}

// get the list of files to rename (jpg files)
async function getFileList(directoryPath) {
  var fileList = await fs.promises.readdir(directoryPath).catch((err) => {
    return file.map(element => directoryPath + "\\" + element).filter(element => isJpegFile(element));
  });
  return fileList.map(element => directoryPath + "\\" + element).filter(element => isJpegFile(element));
}

// Whether the file extname is in the allowed extension list
function isJpegFile(filePath) {
  const ALLOWED_EXTENSION = [".jpg", ".jpeg", ".JPG", ".JPEG"]
  return ALLOWED_EXTENSION.includes(path.extname(filePath));
}

// get mtime from file system
async function getCreatedDateTime(element) {
  var fileStat = await fs.promises.stat(element.path);
  // ファイル更新時間(mtime)のタイムゾーンがGMT+0 なので9時間分をエポック秒に足す
  var createdDateTime = new Date(fileStat.mtimeMs + (9 * 60) * 60 * 1000).toISOString();
  return createdDateTime.replace(/-/g, "").replace("T", "").replace(/:/g, "").replace(".", "").replace("Z", "");
}

async function getExif(element) {
  var sharpData = await sharp(element.path).metadata();
  var exifData = exif(sharpData.exif);
  //yyyy-mm-ddThh:mm:ss.fffZ -> yyyymmddhhmmssfff
  return exifData;

}
// if the output directory path is not defined in the config file,
// one of the selected directories will be used for the output directory
async function getOutputDirectory(filePath) {
  let outDir = OUT_DIR_FROM_CONFIG;
  outDir = outDir ? outDir : filePath[0];
  let dirStat = await fs.promises.stat(outDir);
  if (dirStat.isDirectory) {
    return outDir;
  } else {
    return path.dirname(outDir);
  }
}
// load the config file from CONFIG_FILE_PATH
async function loadConfig() {
  var configFile = await fs.promises.readFile(CONFIG_FILE_PATH, 'utf-8').catch((err) => {
    var data = {
      pad_length: 3,
      file_name_format: "[date]_[str_index]",
      output_directory: ""
    };
    fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(data), (err) => {
      throw err;
    });
  });
  var configJson = JSON.parse(configFile);
  PAD_LENGTH = configJson.pad_length;
  FILE_NAME_FORMAT = configJson.file_name_format;
  OUT_DIR_FROM_CONFIG = configJson.output_directory;
  return;
}

async function directoryExists(dirPath) {
  let stat = await fs.promises.stat(dirPath, fs.constants.R_OK | fs.constants.W_OK).catch((err) => {
    if (err) {
      return false;
    }
  });
  if (stat) {
    return stat.isDirectory();
  }
  return false;
}
// "[a]_[b]_[exif][c]_[d]" -> ["[a]","[b]","[exif][c]","[d]"]
function getPropertyList(src) {
  let singlePropertyList = src.match(/\[([^\]]*)\]/g);
  let result = [];
  for (let i = 0; i < singlePropertyList.length; i++) {
    let pushValue = singlePropertyList[i];
    if (EXIF_PROPERTIES.includes(singlePropertyList[i])) {
      if (!(i + 1 < singlePropertyList.length)) {
        break;
      }
      pushValue = singlePropertyList[i] + singlePropertyList[i + 1];
    }
    result.push(pushValue);
  }
  return result;
}
function trimIdentifier(element) {
  return element.replace('[', '').replace(']', '')
}

async function sendProgress(percentage) {
  if (mainWin !== null) {
    mainWin.webContents.send('progress', percentage);
  }
}
