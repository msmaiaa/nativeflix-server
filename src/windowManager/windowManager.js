const activeWin = require('active-win');
const windows = require('../../src/vendor/node-window-switcher');


//just checking if process is opened
const checkMediaPlayerOpened = async function(type){
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
const focus = async function(type){
    if(type == 'vlc'){
        return checkFocus('vlc.exe')
        .then((window)=>{
            if(!window){
                windows.focusWindow('VLC media player');
                return;      
            }
        })
    }
}

//checks the current window focus (activeWin uses the vs build tools)
const checkFocus = function(process){
    return activeWin()
    .then((window)=>{
        if(window.owner.name != process){
            return false;
        }else{
            return true;
        }
    })
}

exports.checkFocus = checkFocus;
exports.focus = focus;
exports.checkMediaPlayerOpened = checkMediaPlayerOpened;