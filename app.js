const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io").listen(server);
const peerflix = require("peerflix");
const proc = require("child_process");
const regedit = require('regedit')
const fkill = require('fkill');
const fs = require('fs-extra');
const config = require('./config.json');
const utils = require('./src/utils/utils');
const subs = require('./src/subtitles/subtitles');
const windowManager = require('./src/windowManager/windowManager');
const port = 1337;


io.on("connection", socket => {
    console.log("App connected")

    //receives the movie data from the mobile app
    socket.on('app_startStream', (data)=>{
        const magnet = utils.generateMagnet(data.value.hash);
        start(data, magnet);
    })

    //todo
    // socket.on('app_startDownload', (data)=>{
    //     const magnet = utils.generateMagnet(data.value.hash);
    // })

    socket.on('app_getStatus',()=>{
        windowManager.checkMediaPlayerOpened('vlc')
        .then((res)=>{
            io.sockets.emit('setWatching',res);
            io.sockets.emit('processType','vlc');
        })

    })

    //received when the mobile app press the button to set the screen mode
    socket.on('app_changeScreen', ()=>{
        windowManager.focus('vlc')
        .then(()=>{
            utils.changeScreen();
        }) 
    })

    socket.on('app_pauseScreen', ()=>{
        windowManager.focus('vlc')
        .then(()=>{
            utils.pauseScreen();
        })
    })

    //received when the mobile app press the button to close the window
    socket.on('app_closeProcess', (process)=>{
        if(process == 'vlc'){
            fkill(process + '.exe')
            .then(()=>{
                // console.log('killed process');
            })
            .catch((err)=>{
                console.log(err);
            })
        }
    })
});

//starts the torrent-stream engine and opens the vlc with the engine stream;
async function start(data, uri) {
    if (!uri) {
      throw new Error("Uri is required");
    }
    console.log(`Starting ${data.title}`);
  
    const engine = await startEngine(uri);
    await openVlc(engine, data);
    return engine;
  };

//starts the engine with the url provided by the yifi api
function startEngine(uri) {
    return new Promise((resolve, reject) => {
      const engine = peerflix(uri, {path:config.torrentsPath});
      engine.server.on('listening', () => {
        resolve(engine);
      });
      //todo error?
    });
}

//opens the vlc process, still need to separate the functions
function openVlc(engine, data) {
    return new Promise((resolve, reject) => {
        let dirName = config.torrentsPath + '/' + engine.torrent.name + '/';
        subs.getSubtitles(data, dirName)
        .then((status)=>{
        if(status != 200){
            console.log('Subtitles api offline! Starting without subtitles');
        }
        //stream url address
        let localHref = `http://localhost:${engine.server.address().port}/`;
        let root;

        //checking vlc installation
        regedit.list('HKLM\\SOFTWARE\\VideoLAN\\VLC', function(err, result) {
            pResult = result['HKLM\\SOFTWARE\\VideoLAN\\VLC'].values;
            if(!pResult){
                console.log('Please install vlc')
            }else{
                root = pResult.InstallDir.value;
                
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
                io.sockets.emit('setWatching', true);

                //opening vlc process
                let vlc = proc.exec(cmd , (error, stdout, stderror) => {
                    if (error) {
                    reject(error);
                    } else {
                    //code executed after vlc is closed
                    engine.destroy(()=>{
                        io.sockets.emit('setWatching', false);
                        fs.emptyDir(dirName);
                        resolve();
                    });
                    }
                });

                //focus on window if vlc is opened
                let timer = setInterval(()=>{
                    windowManager.checkMediaPlayerOpened('vlc')
                    .then((res)=>{
                        if(res == true){
                            windowManager.focus('vlc');
                            clearInterval(timer);
                        }
                    })
                },1000)
                io.sockets.emit('processType', 'vlc');
            }
        })
    })


    });
}



server.listen(port, () => console.log("server running on port:" + port));
