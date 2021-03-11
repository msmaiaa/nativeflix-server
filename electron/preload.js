const videojs = require('video.js')
videojs.options.autoplay = true;
let $ = null;
const { ipcRenderer} = require('electron');

let g_player = null;


window.addEventListener('DOMContentLoaded', () => {
    $ = require ('jquery');
    ipcRenderer.on('startPlayer', (event, arg)=>{
        createPlayer(arg.url, arg.subDir, arg.size);
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

createPlayer = (url, subDir, size) =>{
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
    g_player.ready(()=>{
        let settings = g_player.textTrackSettings;
        settings.setValues({
            "backgroundColor": "#000",
            "backgroundOpacity": "0",
            "edgeStyle": "uniform",
        });
        settings.updateDisplay();
        setSubtitle(subDir);
        g_player.play()
    })
    return
}

closePlayer = () =>{
    g_player.dispose();
    $('#player').remove();
    $("#title").show();
}

pausePlayer = () =>{
    if (g_player.paused()){
        g_player.play();
    }else{
        g_player.pause();
    }
}

setSubtitle = (path) =>{
    let fullPath = path + 'subtitle.vtt';
    let track = g_player.addRemoteTextTrack({src: fullPath, default: true, label:'subtitle1'})
    track.addEventListener('load', function(){
        console.log('loaded')
        return
    })
}

//G:/torrents/movies/Avengers Infinity War (2018) [BluRay] [720p] [YTS.AM]/subtitle.srt