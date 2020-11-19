const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io").listen(server);
const peerflix = require("peerflix");
const magnet = require("magnet-uri");
const os = require("os");
const path = require("path");
const proc = require("child_process");
const debug = require("debug")("vlc-streamer");
const regedit = require('regedit')
const {keyboard, Key, mouse} = require("@nut-tree/nut-js");
const fkill = require('fkill');
const windows = require('node-window-switcher');
const config = require('./config.json');

const port = 1337;

io.on("connection", socket => {
    console.log("connected")
    socket.on('app_startStream', (data)=>{
        const magnet = `magnet:?xt=urn:btih:${data.value.hash}&dn=a&tr=udp://open.demonii.com:1337/announce&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.coppersurfer.tk:6969`
        start(magnet);
    })

    socket.on('app_startDownload', (data)=>{
        const magnet = `magnet:?xt=urn:btih:${data.value.hash}&dn=a&tr=udp://open.demonii.com:1337/announce&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.coppersurfer.tk:6969`

    })

    socket.on('app_getStatus',()=>{

    })

    socket.on('app_changeScreen', (type)=>{
        
        async function changeScreen(){
            await mouse.leftClick();
            await keyboard.pressKey(Key.F);
            await keyboard.releaseKey(Key.F);
        }
        changeScreen();
    })

    socket.on('app_closeProcess', (process)=>{
        if(process == 'vlc'){
            fkill(process + '.exe')
            .then(()=>{
                console.log('killed process');
            })
            .catch((err)=>{
                console.log(err);
            })
        }
    })
});

async function checkMediaPlayerOpened (type){
    return await windows.getProcesses()
    .then((processes)=>{
        if(type == 'vlc'){
            let isOpened = false;
            for(p of processes){
                if(p.MainWindowTitle == 'VLC media player'){
                    isOpened = true;
                }
            }
            return isOpened;
        }
    })
}

const focus = (type) =>{
    if(type == 'vlc'){
        windows.focusWindow('VLC media player');
    }
}

async function start(uri) {
    if (!uri) {
      throw new Error("Uri is required");
    }
    const parsedUri = magnet.decode(uri);
    const name = parsedUri.name;
    if (!name) {
      throw new Error(`Invalid magnet uri ${uri}`);
    }
  
    const engine = await startEngine(uri);
    await openVlc(engine);
  
    return engine;
  };

function startEngine(uri) {
    return new Promise((resolve, reject) => {
      debug(`Starting peerflix engine for ${uri}`);
      const engine = peerflix(uri, {path:config.torrentsPath});
      engine.server.on('listening', () => {
        debug(`Engine started`);
        resolve(engine);
      });
      //todo error?
    });
}
  
function openVlc(engine) {
    return new Promise((resolve, reject) => {
        let localHref = `http://localhost:${engine.server.address().port}/`;
        //console.log(engine);
        let root;
        regedit.list('HKLM\\SOFTWARE\\VideoLAN\\VLC', function(err, result) {
            pResult = result['HKLM\\SOFTWARE\\VideoLAN\\VLC'].values;
            if(!pResult){
                debug('Please install vlc')
            }else{
                root = pResult.InstallDir.value;
                
                let home = (process.env.HOME || '') + root;
                let VLC_ARGS = `--fullscreen`;
                const cmd = `"${home}\\vlc.exe" ${VLC_ARGS} ${localHref}`;
            
                debug(`Opening VLC: ${cmd}`);
                io.sockets.emit('setWatching', true);
                let vlc = proc.exec(cmd , (error, stdout, stderror) => {
                    if (error) {
                    reject(error);
                    } else {
                    engine.destroy(()=>{
                        io.sockets.emit('setWatching', false);
                        resolve();
                    });
                    }
                });

                var vlcOpened = false;
                let timer = setInterval(()=>{
                    checkMediaPlayerOpened('vlc')
                    .then((res)=>{
                        if(res == true){
                            focus('vlc');
                            vlcOpened = true;
                            clearInterval(timer);
                        }
                    })
                },1000)

                io.sockets.emit('processType', 'vlc');
            }
        })

    });
}



server.listen(port, () => console.log("server running on port:" + port));
