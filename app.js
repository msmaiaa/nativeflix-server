const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io").listen(server);
const peerflix = require("peerflix");
const os = require("os");
const path = require("path");
const proc = require("child_process");
const regedit = require('regedit')
const {keyboard, Key, mouse} = require("@nut-tree/nut-js");
const fkill = require('fkill');
const windows = require('./node-window-switcher');
const config = require('./config.json');
const OS = require('opensubtitles-api');
const OpenSubtitles = new OS('Popcorn Time NodeJS');
const request = require('superagent');
const fs = require('fs-extra');
const admZip = require('adm-zip');
const auth = require('./auth.json');

let token = '';
//opensubtitles credentials
OpenSubtitles.api.LogIn(auth.login, auth.password, 'pt-br', 'Butter V1')
.then((res)=>{
    token = res.token;
})


const port = 1337;

io.on("connection", socket => {
    console.log("connected")

    //receives the movie data from the mobile app
    socket.on('app_startStream', (data)=>{
        const magnet = `magnet:?xt=urn:btih:${data.value.hash}&dn=a&tr=udp://open.demonii.com:1337/announce&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.coppersurfer.tk:6969`
        start(data, magnet);
    })

    socket.on('app_startDownload', (data)=>{
        const magnet = `magnet:?xt=urn:btih:${data.value.hash}&dn=a&tr=udp://open.demonii.com:1337/announce&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.coppersurfer.tk:6969`

    })

    socket.on('app_getStatus',()=>{
        checkMediaPlayerOpened()
        .then((res)=>{
            socket.broadcast.emit('setWatching',res);
        })

    })

    //received when the mobile app press the button to set the screen mode
    socket.on('app_changeScreen', (type)=>{
        async function changeScreen(){
            await mouse.leftClick();
            await keyboard.pressKey(Key.F);
            await keyboard.releaseKey(Key.F);
        }
        changeScreen();
    })

    //received when the mobile app press the button to close the window
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


async function getSubtitles(data, directory){
    const imdb_code = data.imdb_code.replace('tt', '');
    //fetching directly from the opensubtitles api
    return await OpenSubtitles.api.SearchSubtitles(token,[{'imdbid': imdb_code, 'sublanguageid': config.subtitlesLanguage}])
    .then((subtitles)=>{
        let goodSubtitles = [];
        let bestSubtitles = [];

        //if server is offline or in maintenance
        if(!subtitles.data){
            return 400;
        }

        //checks for the best subtitle based on the yifi api
        for(s of subtitles.data){
            if(s.SubFileName.includes(data.value.quality)){
                if(s.SubFileName.includes('YTS') || s.SubFileName.includes('YIFI') || s.SubFileName.includes('yts')){
                    bestSubtitles.push(s);
                }else{
                    goodSubtitles.push(s);
                }
            }
        }
        
        let bestSub = null;
        if(bestSubtitles.length > 1){
            bestSub = bestSubtitles[0]
        }else{
            bestSub = goodSubtitles[0];
        }
        
        const subDownLink = bestSub.ZipDownloadLink;

        //clearing the directory if it has old content
        fs.emptyDirSync(directory);

        //download the subtitle zip to the directory
        request
        .get(subDownLink)
        .on('error', function(error) {
            console.log(error);
        })
        .pipe(fs.createWriteStream(directory + 'subtitle.zip'))
        .on('finish', function() {

            //unzipping the files to the directory
            let zip = new admZip(directory + 'subtitle.zip');
            zip.extractAllTo(directory, false, true);

            //reads all the files on the directory and changes the subtitle to subtitle.srt
            const directoryPath = path.join(directory);
            fs.readdir(directoryPath, function (err, files) {
                if (err) {
                    return console.log('Unable to scan directory: ' + err);
                } 
                files.forEach(function (file) {
                    if(file.includes('srt')){
                        fs.renameSync(directory + file, directory + 'subtitle.srt');
                        return 200;
                    } 
                });
            });
        });
    })
    .catch((e)=>{
        console.log(e);
        console.error('subtitles api is offline')
        //return getSubtitles(data,directory);
    })
}

//self-explanatory
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

//focus window based on the player
const focus = (type) =>{
    if(type == 'vlc'){
        windows.focusWindow('VLC media player');
    }
}

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
      //console.log(`Starting peerflix engine for ${uri}`);
      const engine = peerflix(uri, {path:config.torrentsPath});
      engine.server.on('listening', () => {
        console.log(`Engine started`);
        resolve(engine);
      });
      //todo error?
    });
}

//opens the vlc process, still need to separate the functions
function openVlc(engine, data) {
    return new Promise((resolve, reject) => {


        let dirName = config.torrentsPath + '/' + engine.torrent.name + '/';
        getSubtitles(data, dirName)
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
                    checkMediaPlayerOpened('vlc')
                    .then((res)=>{
                        if(res == true){
                            focus('vlc');
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
