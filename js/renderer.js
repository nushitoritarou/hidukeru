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
  console.log(arg);
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
  // テンプレートのノードを複製
  const clone = document.importNode(content, true);

  // テンプレート内のbox
  const filePathBox = clone.querySelector('.file-path-box');

  // テンプレート内のname-box
  const fileNameBox = clone.querySelector('.file-name-box');

  // テンプレートの要素に適用する
  filePathBox.id = "file-path" + filePathBoxCount++;
  fileNameBox.innerHTML = path;

  // 複製したノードをフラグメントに挿入
  fragment.appendChild(clone);
  // HTMLに挿入
  document.querySelector('#file-list').appendChild(fragment);
}

function deleteFilePathBox(path) {
  path.parent().parent().parent().remove();
}

function openModal() {
  console.log("openModal");
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
    window.api.send("open-output-path",path);
}