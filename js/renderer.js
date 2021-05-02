// api 'files'
function sendFiles(files) {
  filesPath = files.map(e => e.path);
  window.api.send("files", filesPath);
}
window.api.on('files', (arg) => {
  console.log(arg)
})

function showFileList(files) {
  filesPath = files.map(e => e.path);
  filesPath.forEach(element => {
    console.log(element);
  });
}

