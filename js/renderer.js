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
  path.parent().parent().remove();
}