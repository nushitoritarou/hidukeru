  //適当なプログラム
  const button1 = document.getElementById("button1");
  button1.addEventListener("click", (e)=>{
      window.api.send("message","ping");
});      
      window.api.on('reply', (arg) => {
      console.log(arg)
    })