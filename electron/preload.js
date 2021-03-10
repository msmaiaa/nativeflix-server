const videojs = require('video.js')
const srt2vtt = require('srt-to-vtt')
let $ = null;
const fs = require('fs');
const { ipcRenderer } = require('electron')

let g_player = null;

subDir = 'G:/torrents/movies/Avengers Infinity War (2018) [BluRay] [720p] [YTS.AM]/'
sub = `${subDir}subtitle.srt`

window.addEventListener('DOMContentLoaded', () => {
    $ = require ('jquery');
    ipcRenderer.on('startPlayer', (event, arg)=>{
        createPlayer(arg.url, arg.subDir);
    })
})

createPlayer = (url, subDir) =>{
    //TODO: append video to main
    $('#title').hide();
    let videoHTML = `
    <video
    id="player"
    class="video-js"
    controls
    preload="auto"
    width="800"
    height="600"
    data-setup={}
    >
    <source src="${url}" type="video/mp4" />
    </video>
    `
    //
    $('main').append(videoHTML)
    g_player = videojs('player')
    convertSubtitle(subDir)
    player.play()
}

closePlayer = () =>{

}

stopPlayer = () =>{

}

setPlayerScreen = () =>{
    if (g_player.isFullScreen()){
        g_player.requestFullscreen();
    }else{
        g_player.exitFullscreen();
    }
    return
}

setSubtitle = (path) =>{
    let track = g_player.addRemoteTextTrack({src: path})
    track.addEventListener('load', function(){
        console.log('loaded')
        return
    })
}

convertSubtitle = (subDir) =>{
    fs.createReadStream(subDir + 'subtitle.srt')
    .pipe(srt2vtt())
    .pipe(fs.createWriteStream(`${subDir}subtitle.vtt`))
    .on('finish', ()=>{
        setSubtitle(subDir + subtitle.vtt)
        return
    })
}

//G:/torrents/movies/Avengers Infinity War (2018) [BluRay] [720p] [YTS.AM]/subtitle.srt