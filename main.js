const {app, BrowserWindow, ipcMain, screen } = require('electron')
const path = require('path')
require('dotenv').config()
//require('electron-reloader')(module)
const express = require("express");
const exp = express();
const server = require("http").createServer(exp);
const io = require("socket.io").listen(server);
const fs = require('fs-extra');
const peerflix = require("./vendor/peerflix");
const chalk = require('chalk');
const utils = require('./src/utils/utils');
const subsApi = require('./src/subtitles/subtitles');
const port = process.env.PORT;

let g_activeMovieCode = null;
let mainWindow = null;
let g_engine = null;
let g_dirName = null;

//electron stuff
function createWindow () {
    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      frame:false,
      webPreferences: {
        autoplayPolicy: 'no-user-gesture-required',
        webSecurity: false,
        preload: path.join(__dirname, './electron/preload.js')
      },
      
    })
    
    //cant make the player fullscreen without user interaction, so just set the electron window to fullscreen
    //and the player width and height to the screen resolution
    mainWindow.fullScreen = true
    mainWindow.loadFile('./electron/index.html')
  }

app.whenReady().then(() => {
    createWindow()
    
    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})
  
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

//
  

io.on("connection", socket => {
    console.log(chalk.yellow("App connected"));

    //receives the movie data from the mobile app
    socket.on('app_startStream', (data)=>{
        const magnet = data.value.url
        g_activeMovieCode = data.imdb_code;

        //console.log(data);
        start(data, magnet);
    })

    //mobile app requesting status when the component is mounted
    socket.on('app_getStatus',()=>{
        if (g_engine != null && g_activeMovieCode != null){
            io.sockets.emit('setWatching',{condition:true, activeCode:g_activeMovieCode});
        }else{
            io.sockets.emit('setWatching',{condition:false, activeCode:null});
        }
    })

    //received when the mobile app press the button to set the screen mode
    socket.on('app_changeScreen', ()=>{
        mainWindow.webContents.send('changeScreen');
    })

    socket.on('app_pauseScreen', ()=>{
        mainWindow.webContents.send('pausePlayer');
    })

    //received when the mobile app press the button to close the player
    socket.on('app_closeProcess', ()=>{
        if (g_engine){
            mainWindow.webContents.send('closePlayer');
            g_engine.destroy(()=>{
                io.sockets.emit('setWatching', {condition:false, activeCode: g_activeMovieCode});
                g_activeMovieCode = null;
                g_engine = null;
                fs.emptyDir(g_dirName);
            });
        }
    })  
});

//starts the torrent-stream engine and opens the vlc with the engine stream;
async function start(data, uri) {
    if (!uri) {
      throw new Error("Uri is required");
    }
    console.log(chalk.cyan(`Starting ${data.title}`));
  
    g_engine = await startEngine(uri);
    await openPlayer(data);
    return g_engine
  };

//starts the engine with the url provided by the yifi api
function startEngine(uri) {
    return new Promise((resolve, reject) => {
        const engine = peerflix(uri, {path:process.env.torrentsPath});
        engine.server.on('listening', () => {
            resolve(engine);
        });
        //todo error?
    });
}


//opens the player on the electron frontend
openPlayer = async(data)=>{
    try{
        g_dirName = process.env.torrentsPath + '/' + g_engine.torrent.name + '/';

        const {status, subs} = await subsApi.getSubtitles(data, g_dirName);
        let hasSubs = true;
        if(status != 200 || subs < 1){
            console.log(chalk.red('Starting without subtitles'));
            hasSubs = false;
        }

        //stream url address
        let localHref = `http://localhost:${g_engine.server.address().port}/`;

        //opening player on electron frontend
        let {width, height} = screen.getPrimaryDisplay().size
        let downPercent = 0;
        let pieces = 0;

        //saving the total pieces downloaded to check the download percentage
        const changePiece = (i) =>{
            pieces = i;
        }
        g_engine.on('verify', changePiece);

        //checks until the torrent has downloaded at least 5%
        let interval = setInterval(()=>{
            downPercent = Math.round(((pieces + 1) / g_engine.torrent.pieces.length) * 100.0)
            if (downPercent > 1){
                clearInterval(interval);

                //send watching status to mobile app to show the buttons
                io.sockets.emit('setWatching', {condition: true, activeCode: g_activeMovieCode});

                //streaming crashes if i remove the verify listener
                //g_engine.removeListener('verify', changePiece)
                mainWindow.webContents.send('startPlayer', {url: localHref, subDir: g_dirName, size: {width: width, height: height}, hasSubs});
            }
        },500)   
    }
    catch(e){
        console.error(e.message);
    }

}

server.listen(port,() => console.log("server running on port:" + port));
