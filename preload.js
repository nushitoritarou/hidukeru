window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})

// ipc processing
// ipcRenderer is ipc object for renderer.
const { contextBridge, ipcRenderer} = require("electron");
contextBridge.exposeInMainWorld(
    "api", {
        send: (channel, data) => {//rendererからの送信用//
         ipcRenderer.send(channel, data);            
        },
        on: (channel, func) => { //rendererでの受信用, funcはコールバック関数//
          ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    }
);