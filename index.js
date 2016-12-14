var http = require('http');
var exec = require('child_process').exec;
var fs = require('fs');

/* Some config */
var path = '/path/to/your/download/directory/';


/* Content */
function startDL(link) {
    var child = exec("youtube-dl -f mp4 -s --get-id " + link, function (err, stdout, stderr) {
        if (!err) {
            var fileid = stdout.replace('\n', '');
            child = exec("youtube-dl -f mp4 -s --get-filename " + link, function (err, stdout, stderr) {
                if (!err) {
                    var filename = stdout.replace(/ /g, '_').replace(/,/g, '').replace('-' + fileid, '').replace('\n', '');
                    fs.access(path + filename, fs.F_OK, function (err) {
                        if (err != null) {
                            var cmd = "youtube-dl -f mp4 -o " + path + filename + " " + link;
                            child = exec(cmd, {maxBuffer: 1024 * 1000}, function (err, stdout, stderr) {
                                if (!err) {
                                    console.log(filename + ': downloaded!');
                                } else {
                                    console.log('ERR#3: ' + err);
                                }
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

var req = http.get({host: 'www.tf1.fr', path: '/tmc/quotidien-avec-yann-barthes/videos?filter=replay'}, function (res) {
    var bodyChunks = [];
    res.on('data', function (chunk) {
        bodyChunks.push(chunk);
    }).on('end', function () {
        var body = Buffer.concat(bodyChunks).toString();
        var results = body.match(/<a href="\/tmc\/quotidien-avec-yann-barthes\/videos\/quotidien-(\w*)-partie-(\d*)-(\w*)-(\d*).html" class="link videoLink trackXiti testCSA"/gi);
        var links = [];
        for (var result in results) links.push('http://www.tf1.fr' + results[result].replace('<a href="', '').replace('" class="link videoLink trackXiti testCSA"', ''));
        for (var link in links) {
            console.log('Starting DL of ' + links[link]);
            startDL(links[link]);
        }

    });
});

req.on('error', function (e) {
    console.log('ERROR: ' + e.message);
});
