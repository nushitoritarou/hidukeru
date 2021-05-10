// api 'files'
function sendFiles(files) {
  filesPath = files.map(e => e.path);
  window.api.send("files", filesPath);
}
window.api.on('files', (arg) => {
  console.log(arg)
})

//ファイル選択ダイアログ
// ファイル選択ダイアログ mainプロセスへ渡す
function selectDir() {
  jQuery("#progress-bar-div").hide();
  window.api.send("select-dirs", "");
}

// ファイル選択ダイアログの結果
window.api.on('selected-dirs', (arg) => {
  setFileList(arg);
})
function setFileList(files) {
  if (files == undefined) {
    return
  }
  files.forEach(element => {
    addFilePathBox(element);
  });
}

window.api.on('progress', (arg) => {
  jQuery('#progress-bar').css('width', arg + "%");
})

window.api.on('rename-result', (arg) => {
  let modal_message = document.getElementById("modal-message")
  if (arg == undefined) return;
  if (arg.message == "ENOENT") {
    // No such file or directory
    let errorPath = arg.info;
    document.getElementById("modal-message").innerHTML = "ファイル処理実行中にエラーが発生しました．以下のファイルもしくはフォルダは存在していません．\n" + errorPath;
    jQuery('#finish-modal').modal();
  }
  else if (arg.message == "WRONG_LIST_SIZE") {
    document.getElementById("modal-message").innerHTML = "";
    jQuery('#finish-modal').modal('hide');
  }
  else if (arg.message == "SUCCESS") {
    let filePath = arg.info;
    document.getElementById("modal-message").innerHTML = "以下のフォルダに日付けごとに分けてコピーされました．\n" + filePath;
    jQuery("#open-output-path").show();
    jQuery("#open-output-path").data('path', filePath);
    jQuery('#finish-modal').modal();
  }
  jQuery("#progress-bar-div").hide();
})

let filePathBoxCount = 0
// path 文字列パス
function addFilePathBox(path) {
  // template要素からコンテンツを取得、
  const content = document.querySelector('#file-path-box-template').content;
  // フラグメント
  const fragment = document.createDocumentFragment();
  const clone = document.importNode(content, true);

  const filePathBox = clone.querySelector('.file-path-box');
  const fileNameBox = clone.querySelector('.file-name-box');
  filePathBox.id = "file-path" + filePathBoxCount++;
  fileNameBox.innerHTML = path;
  fragment.appendChild(clone);
  // HTMLに挿入
  document.querySelector('#file-list').appendChild(fragment);
}

function deleteFilePathBox(path) {
  path.parent().parent().parent().remove();
}

function openModal() {
  jQuery('#finish-modal').modal();
}

// file-name-box で画面に表示されているパスのリストを返す
function getFilePathList() {
  return Array.from(document.querySelector('#file-list').getElementsByClassName('file-name-box')).map(element => element.innerHTML);
}

// ファイル名変更処理実行 mainプロセスへおくる
function sendFilePathList() {
  const filePathList = getFilePathList();
  window.api.send("file-path-list", filePathList);
}
function openOutputDirectory(path) {
  jQuery("#open-output-path").hide();
  window.api.send("open-output-path", path);
}

function saveConfig() {
  var data = {
    pad_length: jQuery('#pad_length').val(),
    file_name_format: jQuery('#file_name_format').val(),
    output_directory: jQuery('#output_directory').val()
  };
  var configJson = JSON.stringify(data);
  window.api.send("save-config", configJson);
}
function setDefaultConfig() {
  setForm({ "pad_length": 3, "file_name_format": "[date]_[str_index]", "output_directory": "" });
}
function setForm(param) {
  jQuery('#pad_length').val(param.pad_length);
  jQuery('#file_name_format').val(param.file_name_format);
  jQuery('#output_directory').val(param.output_directory);
}


// send request to main process
function loadConfig() {
  window.api.send("load-config", "");
}

// コンフィグの読み込みが終了すると呼ばれる
window.api.on('config-param', (arg) => {
  if (arg == undefined) {
    setDefaultConfig();
  }
  setForm(arg);
})
// コンフィグの保存が終了すると呼ばれる
window.api.on('save-config-result', (arg) => {
  if (arg == undefined) {
  }
  console.log(arg);
})