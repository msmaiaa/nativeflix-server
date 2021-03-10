const videojs = require('video.js')
var srt2vtt = require('srt-to-vtt')
//import VTTConverter from 'srt-webvtt';

const fs = require('fs');

subDir = 'G:/torrents/movies/Avengers Infinity War (2018) [BluRay] [720p] [YTS.AM]/'
sub = `${subDir}subtitle.srt`

window.addEventListener('DOMContentLoaded', () => {
    let player = videojs('my-video')
    player.play()
    let video = document.getElementById("my-video")
    document.getElementById('teste').addEventListener("click", function(){
        fs.createReadStream(sub)
        .pipe(srt2vtt())
        .pipe(fs.createWriteStream(`${subDir}subtitle.vtt`))
        .on('finish', ()=>{
            let track = player.addRemoteTextTrack({src: `${subDir}subtitle.vtt`})
            track.addEventListener('load', function(){
                console.log('loaded')
            })
        })
    })
    setTimeout(()=>{
        player.requestFullscreen();
    },5000)
    
})

//G:/torrents/movies/Avengers Infinity War (2018) [BluRay] [720p] [YTS.AM]/subtitle.srt