require('dotenv').config()
const path = require("path");
const request = require('superagent');
const admZip = require('adm-zip');
const OS = require('opensubtitles-api');
const OpenSubtitles = new OS('Popcorn Time NodeJS');
const fs = require('fs-extra');
const srt2vtt = require('srt-to-vtt')
const chalk = require('chalk');

let token = '';
//opensubtitles credentials
OpenSubtitles.api.LogIn(process.env.LOGIN, process.env.PASS, 'pt-br', 'Butter V1')
.then((res)=>{
    token = res.token;
})

const getSubtitles = async(data, directory)=>{
    try{
        const imdb_code = data.imdb_code.replace('tt', '');
        
        //fetching directly from the opensubtitles api
        return OpenSubtitles.api.SearchSubtitles(token,[{'imdbid': imdb_code, 'sublanguageid': process.env.subtitlesLanguage}])
        .then(async (subtitles)=>{
            let goodSubtitles = [];
            let bestSubtitles = [];
            let status;
    
            //if server is offline or in maintenance
            if(!subtitles.data){
                if(subtitles.status == '401 Unauthorized'){
                    console.log(chalk.red('Unauthorized status from the api, maybe the credentials are wrong.'));
                    status = 401;
                }else{
                    status = 400;
                }
                return status;
            }else{
                status = 200;
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
    
            await createDir(directory)
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
                zip.extractAllTo(directory,true);
    
                //reads all the files on the directory and changes the subtitle to subtitle.srt
                const directoryPath = path.join(directory);
                fs.readdir(directoryPath, function (err, files) {
                    if (err) {
                        return console.log('Unable to scan directory: ' + err);
                    } 
                    return files.forEach(function (file) {
                        if(file.includes('srt')){
                            fs.renameSync(directory + file, directory + 'subtitle.srt');
                            fs.createReadStream(`${directory}subtitle.srt`)
                            .pipe(srt2vtt())
                            .pipe(fs.createWriteStream(`${directory}subtitle.vtt`))
                            .on('finish', ()=>{
                                return 200;
                            })
                        } 
                    });
                });
            });
            return status;
            
        })
        .catch((e)=>{
            console.error('Error on the subtitles api (maybe offline?)')
            return 400;
        })
    }
    catch(e){
        console.error(e.message);
        throw e;
    }
}

createDir = async(dir) =>{
    try{
        await fs.ensureDir(dir)
        return;
    }
    catch(e){
        console.error(e)
    }
}
exports.getSubtitles = getSubtitles;