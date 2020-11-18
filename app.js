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


const port = 1337;

io.on("connection", socket => {
    console.log("connected")
    socket.on('app_startStream', (data)=>{
        console.log(data);
        const magnet = `magnet:?xt=urn:btih:${data.value.hash}&dn=a&tr=udp://open.demonii.com:1337/announce&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.coppersurfer.tk:6969`
        start(magnet);
    })

    socket.on('app_startDownload', (data)=>{
        console.log(data);
        const magnet = `magnet:?xt=urn:btih:${data.value.hash}`

    })

    socket.on('app_getStatus',()=>{

    })
});

async function start(uri) {
    if (!uri) {
      throw new Error("Uri is required");
    }
    const parsedUri = magnet.decode(uri);
    const name = parsedUri.name;
    if (!name) {
      throw new Error(`Invalid magnet uri ${uri}`);
    }
  
    const filepath = path.join(os.tmpdir(), name);
  
    const engine = await startEngine(uri);
    await openVlc(engine);
  
    return engine;
  };

function startEngine(uri) {
    return new Promise((resolve, reject) => {
      debug(`Starting peerflix engine for ${uri}`);
      const engine = peerflix(uri);
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
    
        let root;
        regedit.list('HKLM\\SOFTWARE\\VideoLAN\\VLC', function(err, result) {
            pResult = result['HKLM\\SOFTWARE\\VideoLAN\\VLC'].values;
            if(!pResult){
                debug('Please install vlc')
            }else{
                root = pResult.InstallDir.value;
                
                let home = (process.env.HOME || '') + root;
                let VLC_ARGS = `--fullscreen `;
                const cmd = `"${home}\\vlc.exe" ${VLC_ARGS} ${localHref}`;
            
                debug(`Opening VLC: ${cmd}`);
            
                let vlc = proc.exec(cmd , (error, stdout, stderror) => {
                    if (error) {
                    reject(error);
                    } else {
                    resolve();
                    }
                });
            }
        })

    });
}



server.listen(port, () => console.log("server running on port:" + port));
