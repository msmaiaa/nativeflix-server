const videojs = require('video.js')
const fs = require('fs-extra');
videojs.options.autoplay = true;
let $ = null;
const { ipcRenderer} = require('electron');

let g_player = null;


window.addEventListener('DOMContentLoaded', () => {
    $ = require ('jquery');
    ipcRenderer.on('startPlayer', (event, arg)=>{
        createPlayer(arg.url, arg.subDir, arg.size, arg.hasSubs);
    })

    ipcRenderer.on('closePlayer', (event, arg)=>{
        if(g_player){
            closePlayer();
        }
    })

    ipcRenderer.on('changeScreen', (event, arg)=>{
        if(g_player){
            setPlayerScreen();
        }
    })

    ipcRenderer.on('pausePlayer', (event, arg)=>{
        if(g_player){
            pausePlayer();
        }
    })
})

const createPlayer = async(url, subDir, size, hasSubs) =>{
    if ($('#player')){
        $('#player').remove();
        g_player = null;
    }
    $('#title').hide();
    let videoHTML = `
    <video
    id="player"
    class="video-js"
    controls
    preload="auto"
    width=${size.width}
    height=${size.height}
    >
    <source src="${url}" type="video/mp4" />
    </video>
    `
    $('main').append(videoHTML);
    g_player = videojs('player',{
        autoplay: true,
        errorDisplay: false
    });
    g_player.ready(async()=>{
        let settings = g_player.textTrackSettings;
        settings.setValues({
            "backgroundColor": "#000",
            "backgroundOpacity": "0",
            "edgeStyle": "uniform",
        });
        settings.updateDisplay();
        if(hasSubs){
            await setSubtitles(subDir);
        }
        g_player.play()
    })
}

const closePlayer = () =>{
    g_player.dispose();
    $('#player').remove();
    $("#title").show();
}

const pausePlayer = () =>{
    if (g_player.paused()){
        g_player.play();
    }else{
        g_player.pause();
    }
}

setSubtitles = async (path) =>{
    const files = await fs.readdir(path)
    const promises = [];
    console.log('setSubtitles');
    for(f of files){
        if (f.includes('.vtt')){
            console.log(f)
            promises.push(addSubtitle(path, f));
        }
    }
    await Promise.all(promises);
}

addSubtitle = async (path, subName) =>{
    return new Promise(resolve =>{
        let fullPath = path + subName;
        let track = g_player.addRemoteTextTrack({src: fullPath, default: true, label:subName})
        track.addEventListener('load', function(){
            console.log('loaded')
            resolve()
        })
    })
}

//G:/torrents/movies/Avengers Infinity War (2018) [BluRay] [720p] [YTS.AM]/subtitle.srt