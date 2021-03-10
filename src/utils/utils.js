exports.generateMagnet = (hash)=>{
    return `magnet:?xt=urn:btih:${hash}&dn=a&tr=udp://open.demonii.com:1337/announce&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.coppersurfer.tk:6969`
}