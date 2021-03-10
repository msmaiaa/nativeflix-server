const {app, BrowserWindow} = require('electron')
const path = require('path')
require('dotenv').config()
const express = require("express");
const exp = express();
const server = require("http").createServer(exp);
const io = require("socket.io").listen(server);
const peerflix = require("peerflix");
const chalk = require('chalk');
const utils = require('./src/utils/utils');
const subs = require('./src/subtitles/subtitles');
const port = process.env.PORT;
let g_activeMovieCode = null;

//electron stuff

function createWindow () {
    const mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        webSecurity: false,
        preload: path.join(__dirname, './electron/preload.js')
      }
    })
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
        // windowManager.checkMediaPlayerOpened('vlc')
        // .then((res)=>{
        //     io.sockets.emit('setWatching',{condition:res, activeCode:g_activeMovieCode});
        //     io.sockets.emit('processType','vlc');
        // })

    })

    //received when the mobile app press the button to set the screen mode
    socket.on('app_changeScreen', ()=>{

    })

    socket.on('app_pauseScreen', ()=>{

    })

    //received when the mobile app press the button to close the window
    socket.on('app_closeProcess', (process)=>{

    })
});

//starts the torrent-stream engine and opens the vlc with the engine stream;
async function start(data, uri) {
    if (!uri) {
      throw new Error("Uri is required");
    }
    console.log(chalk.cyan(`Starting ${data.title}`));
  
    const engine = await startEngine(uri);
    await openVlc(engine, data);
    return engine;
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

//opens the vlc process, still need to separate the functions
function openVlc(engine, data) {
    return new Promise((resolve, reject) => {
        let dirName = process.env.torrentsPath + '/' + engine.torrent.name + '/';
        //checking vlc installation
        regedit.list('HKLM\\SOFTWARE\\VideoLAN\\VLC', (err, result) =>{
            if(!result){
                regedit.list('HKLM\\SOFTWARE\\WOW6432Node\\VideoLAN\\VLC', (err, result)=>{
                    if(!result){
                        console.log(chalk.red('Please install VLC'));
                        process.exit();
                    }else{
                        let pResult = result['HKLM\\SOFTWARE\\WOW6432Node\\VideoLAN\\VLC'].values;
                        exec(pResult);
                    }
                })
            }else{
                let pResult = result['HKLM\\SOFTWARE\\VideoLAN\\VLC'].values;
                exec(pResult);
            }
            
        })

        const exec = (result) =>{
            subs.getSubtitles(data, dirName)
            .then((status)=>{
            if(status != 200){
                console.log(chalk.red('Starting without subtitles'));
            }
            //stream url address
            let localHref = `http://localhost:${engine.server.address().port}/`;
            console.log(localHref)
            let root;
    
            root = result.InstallDir.value;
                
            let home = (process.env.HOME || '') + root;
    
            const subtitleDirectory = `${dirName}subtitle.srt`.replace(/\//g, "\\");
            let VLC_ARGS;
            if(status != 200){
                VLC_ARGS = `--fullscreen`;
            }else{
                VLC_ARGS = `--fullscreen --sub-file="${subtitleDirectory}"`;
            }
    
            const cmd = `"${home}\\vlc.exe" ${VLC_ARGS} ${localHref}`;
        
            //send watching status to mobile app to show the buttons
            io.sockets.emit('setWatching', {condition: true, activeCode: g_activeMovieCode});
    
            //opening vlc process
            let vlc = proc.exec(cmd , (error, stdout, stderror) => {
                if (error) {
                reject(error);
                } else {
                //code executed after vlc is closed
                engine.destroy(()=>{
                    io.sockets.emit('setWatching', {condition:false, activeCode: g_activeMovieCode});
                    fs.emptyDir(dirName);
                    resolve();
                });
                }
            });
    
        })
        }

    });
}



server.listen(port,() => console.log("server running on port:" + port));
