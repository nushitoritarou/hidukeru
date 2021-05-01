  //適当なプログラム
  const button1 = document.getElementById("button1");
  button1.addEventListener("click", (e)=>{
      window.api.send("message","ping");
});      
      window.api.on('reply', (arg) => {
      console.log(arg)
    })
    
    function sendFiles(files){
        if(!files instanceof FileList){
          console.log("it's not a filelist")
          return
        }
        filesPath = files.map(e=>e.path);
        window.api.send("files",filesPath);
    }
      window.api.on('files', (arg) => {
      console.log(arg)
    })
