const http = require('http');
const exec = require('child_process').exec;
const fs = require('fs');
const program = require('commander');
const package = require('./package.json');
const path = require('path');
const moment = require('moment');


//Commander path

program
    .version(package.version)  
    .option('-d --date [date]', 'Date of diffusions', 'none')
    .option('--date-format [format]', 'Date format', 'YYYY-MM-DD')
    .option('-p --parts [1er|2eme|all]', 'Parts of diffusions', 'all')
    .option('-o --out [out]', 'Out directory', '.')
    .parse(process.argv);




var outDir = program.out;

/* Content */
function startDL(link) {
    var child = exec("youtube-dl -f mp4 -s --get-id " + link, function (err, stdout, stderr) {
        if (!err) {
            var fileid = stdout.replace('\n', '');
            child = exec("youtube-dl -f mp4 -s --get-filename " + link, function (err, stdout, stderr) {
                if (!err) {
                    var filename = stdout.replace(/ /g, '_').replace(/,/g, '').replace('-' + fileid, '').replace('\n', '');
                    var filePath = path.join(outDir, filename);
                    fs.access(filePath, fs.F_OK, function (err) {
                        if (err != null) {
                            console.log('Start download of', link);
                            var cmd = "youtube-dl -f mp4 -o " + filePath + " " + link;
                            child = exec(cmd, {maxBuffer: 1024 * 1000}, function (err, stdout, stderr) {
                                if (!err) {
                                    console.log(filename + ': downloaded!');
                                } else {
                                    console.log('ERR#3: ' + err);
                                }
                            });
                            child.stdout.on('data', function(data){
                                process.stdout.write(data);
                            });
                        } else {
                            console.log(filename + ': already exists!');
                        }
                    });

                } else {
                    console.log('ERR#2: ' + err);
                }
            });
        } else {
            console.log('ERR#1: ' + err);
        }
    });
}

function extractDate(link){
    var indexStartDate = link.indexOf('-partie-') + 8;
    var indexEndDate = link.indexOf('.html');

    var strDate = link.substring(indexStartDate, indexEndDate);
    return moment(strDate, 'DD-MMMM-YYYY');
}

function okForDownload(link){
    var res = true;
    if(program.date != "none"){
        var argDate = moment(program.date, program.dateFormat);
        var linkDate = extractDate(link);
        if(!argDate.isSame(linkDate)){
            res = false;
        }
    }
    if(res && program.parts != 'all'){
        if(program.parts == '1er'){
            if(link.indexOf('premiere') == -1){
                res = false
            }
        }else{
            if(link.indexOf('deuxieme') == -1){
                res = false
            }
        }
    }
    return res;
}

var req = http.get({host: 'www.tf1.fr', path: '/tmc/quotidien-avec-yann-barthes/videos?filter=replay'}, function (res) {
    var bodyChunks = [];
    res.on('data', function (chunk) {
        bodyChunks.push(chunk);
    }).on('end', function () {
        var body = Buffer.concat(bodyChunks).toString();
        var results = body.match(/<a href="\/tmc\/quotidien-avec-yann-barthes\/videos\/quotidien-(\w*)-partie-(\d*)-(\w*)-(\d*).html" class="link videoLink trackXiti testCSA"/gi);
        var links = [];
        for (var result in results) links.push('http://www.tf1.fr' + results[result].replace('<a href="', '').replace('" class="link videoLink trackXiti testCSA"', ''));
        for (var i in links) {
            var link = links[i];
            if(okForDownload(link)){
                console.log('Init download of', link);
                startDL(link);
            }

        }

    });
});

req.on('error', function (e) {
    console.log('ERROR: ' + e.message);
});
