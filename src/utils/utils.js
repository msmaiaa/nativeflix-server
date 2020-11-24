const {keyboard, Key} = require("@nut-tree/nut-js");

exports.generateMagnet = (hash)=>{
    return `magnet:?xt=urn:btih:${hash}&dn=a&tr=udp://open.demonii.com:1337/announce&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.coppersurfer.tk:6969`
}

exports.changeScreen = async function (){
    await keyboard.pressKey(Key.F);
    await keyboard.releaseKey(Key.F);
}

exports.pauseScreen = async function (){
    await keyboard.pressKey(Key.Space);
    await keyboard.releaseKey(Key.Space);
}
