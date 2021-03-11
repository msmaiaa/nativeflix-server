const {app, BrowserWindow, ipcMain, screen } = require('electron')
const path = require('path')
require('dotenv').config()
require('electron-reloader')(module)
const express = require("express");
const exp = express();
const server = require("http").createServer(exp);
const io = require("socket.io").listen(server);
const fs = require('fs-extra');
const peerflix = require("peerflix");
const chalk = require('chalk');
const utils = require('./src/utils/utils');
const subs = require('./src/subtitles/subtitles');
const port = process.env.PORT;

let g_activeMovieCode = null;
let mainWindow = null;
let g_engine = null;
let g_dirName = null;
let g_resolve_stream = null;

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
        const magnet = utils.generateMagnet(data.value.hash);
        g_activeMovieCode = data.imdb_code;

        start(data, magnet);
    })

    //todo
    // socket.on('app_startDownload', (data)=>{
    //     const magnet = utils.generateMagnet(data.value.hash);
    // })

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
                g_resolve_stream();
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
function openPlayer(data) {
    return new Promise((resolve, reject) => {
        g_dirName = process.env.torrentsPath + '/' + g_engine.torrent.name + '/';

        subs.getSubtitles(data, g_dirName)
        .then((status)=>{
                if(status != 200){
                    console.log(chalk.red('Starting without subtitles'));
                }
                console.log('sub')
                //stream url address
                let localHref = `http://localhost:${g_engine.server.address().port}/`;

                const subtitleDirectory = `${g_dirName}`.replace(/\//g, "\\");

                //opening player on electron frontend
                let {width, height} = screen.getPrimaryDisplay().size
                let downPercent = 0;
                let pieces = 0;

                //saving the total pieces downloaded to check the download percentage
                const changePiece = (i) =>{
                    pieces = i;
                }
                g_engine.on('verify', changePiece);
                console.log(localHref);

                //checks until the torrent has downloaded at least 5%
                let interval = setInterval(()=>{
                    downPercent = Math.round(((pieces + 1) / g_engine.torrent.pieces.length) * 100.0)
                    if (downPercent > 5){
                        clearInterval(interval);

                        //send watching status to mobile app to show the buttons
                        io.sockets.emit('setWatching', {condition: true, activeCode: g_activeMovieCode});

                        //streaming crashes if i remove the verify listener
                        //g_engine.removeListener('verify', changePiece)
                        mainWindow.webContents.send('startPlayer', {url: localHref, subDir: g_dirName, size: {width: width, height: height}});
                        
                        //need to assign resolve to a global variable, so we can stop the download from within the socket messages
                        g_resolve_stream = resolve;
                    }
                },500)   
            }
        )
    });
}


// setTimeout(()=>{
//     let data = {
//         value: {
//           url: 'https://yts.mx/torrent/download/EA17E6BE92962A403AC1C638D2537DCF1E564D26',
//           hash: 'EA17E6BE92962A403AC1C638D2537DCF1E564D26',
//           quality: '720p',
//           type: 'bluray',
//           seeds: 595,
//           peers: 126,
//           size: '1.25 GB',
//           size_bytes: 1342177280,
//           date_uploaded: '2018-08-01 07:28:54',
//           date_uploaded_unix: 1533101334
//         },
//         type: 'stream',
//         title: 'Avengers: Infinity War',
//         imdb_code: 'tt4154756'
//     }
//     let imdb_code = data.imdb_code;
//     g_activeMovieCode = imdb_code;
//     let magnet = utils.generateMagnet(data.value.hash)
//     start(data, magnet);
// },1000)
server.listen(port,() => console.log("server running on port:" + port));
