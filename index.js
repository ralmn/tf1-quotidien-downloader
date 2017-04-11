const http = require('https');
const exec = require('child_process').exec;
const fs = require('fs');
const program = require('commander');
const package = require('./package.json');
const path = require('path');
const moment = require('moment');


//Commander path

moment.locale('fr') // returns the new locale, in this case 'fr'


program
.version(package.version)  
.option('-d --date [date]', 'Date of diffusions', 'none')
.option('--date-format [format]', 'Date format', 'YYYY-MM-DD')
.option('-p --part [1er|2eme|all]', 'Parts of diffusions', 'all')
.option('-o --out [out]', 'Out directory', '.')
.parse(process.argv);


var strDate = program.date;

var argDate = moment(program.date, program.dateFormat);

if(strDate != 'none' && argDate == null){
    console.log("Date ",program.date," cannot be parsed. Format is :", program.dateFormat);
}else if(program.date != 'none'){
    console.log('Search episode for the ', strDate , '('+argDate.toString()+')');
}else{
    console.log('Download all days');
}

console.log('Parts selected :', program.part);

var outDir = program.out;

/* Content */
function startDL(link, cb) {
    child = exec("youtube-dl -f mp4 -s --get-filename " + link, function (err, stdout, stderr) {
        if (!err) {
            var filename = stdout.replace(/ /g, '_').replace(/,/g, '').replace('\n', '');
            var filePath = path.join(outDir, filename);
            fs.access(filePath, fs.F_OK, function (err) {
                if (err != null) {
                    console.log('Start download of', link);
                    var cmd = "youtube-dl -f mp4 -o " + filePath + " " + link;
                    child = exec(cmd, {maxBuffer: 1024 * 1000}, function (err, stdout, stderr) {
                        if (!err) {
                            console.log(filename + ': downloaded!');
                        } else {
                            console.log('ERR#2: ' + err);
                        }
                        cb();
                    });
                    child.stdout.on('data', function(data){
                        process.stdout.write(data);
                    });
                } else {
                    console.log(filename + ': already exists!');
                    cb();
                }
            });

        } else {
            console.log('ERR#1: ' + err);
            cb();
        }
    });

}

function extractDate(link){
    var indexStartDate = link.indexOf('-partie-') + 8;
    var indexEndDate = link.indexOf('.html');

    var strDate = link.substring(indexStartDate, indexEndDate).replace('fevrier', 'février');
    return moment(strDate, 'DD-MMMM-YYYY');
}

function okForDownload(link){
    var res = true;
    if(strDate != "none"){
        var linkDate = extractDate(link);
        if(!argDate.isSame(linkDate)){
            res = false;
        }
    }
    

    if(res && program.part != 'all'){
        if(program.part == '1er'){
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
        fs.writeFileSync('test.html', body);
        var results = body.match(/<a href="\/tmc\/quotidien-avec-yann-barthes\/videos\/quotidien-(\w*)-partie-(\d*)-(\w*)-(\d*).html" class="link videoLink trackXiti testCSA"/gi);
        var links = [];
        for (var result in results){
            links.push('http://www.tf1.fr' + results[result].replace('<a href="', '').replace('" class="link videoLink trackXiti testCSA"', ''));
        } 
        if(links.length == 0)
            console.error("No links found");

        var next = function(){
            if(links.length == 0){ return; }
            var link = links.pop();
            if(okForDownload(link)){
                console.log('Init download of', link);
                startDL(link, next);
                    //next();
                }else{
                    next();
                }
            };

            next();
        });
});

req.on('error', function (e) {
    console.log('ERROR: ' + e.message);
});
