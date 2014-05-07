#!/usr/bin/env node
var fs = require('fs');
var http = require('http');
var path = require('path');
var url = require('url');
var program = require('commander');
var fastDownload = require('fast-download');
var display = require('./display');

var die = function(error){
	console.error(error);
	process.exit();
};
var formatBytes = function(bytes, precision){
    var units = ['bytes', 'kb', 'mb', 'gb', 'tb'];
	var unit_i = 0;
	var number = bytes;
    while(number>=1024){
        unit_i++;
        number = number / 1024;
    }
    return number.toFixed(precision || 0) + " " + units[unit_i];
}

program
	.version('0.1.0')
	.usage('[options] <url>')
	.option('-d, --directory <s>', 'destination directory (default: current working directory)')
	.option('-f, --filename <s>', 'destination filename (default: base filename in url)')
	.option('-o, --overwrite', 'overwrite existing file (as opposed to resume)')
	.option('-r, --resume', 'resume downloading existing file (as opposed to overwrite)')
	.option('-c, --connections <n>', 'number of connections (default: 5)', parseInt, 5)
	.option('-s, --chunk-size <n>', 'size of a chunk in bytes (default: 524288)', parseInt, 524288)
	.option('-t, --timeout <n>', 'request timeout in milliseconds (default: 5000)', parseInt, 5000)
	.parse(process.argv);
program.url = program.args[0];
if (!program.url){
	die('give me a url')
}
program.filename = program.filename || decodeURIComponent(path.basename(url.parse(program.url).pathname));
program.directory = program.directory || process.cwd();
var destination = path.join(program.directory, program.filename);
http.globalAgent.maxSockets = program.connections;

var doDownload = function(start_position){
	var download = fastDownload(program.url, {
		start: start_position,
		connections: program.connections,
		chunkSize: program.chunkSize,
		timeout: program.timeout
	});
	download.on('error', die);
	var updateDisplay = function(){
		var progress = download.progress();
		if (!progress.total){return;}
		var percent_downloaded = (start_position+progress.downloaded)/(start_position+progress.total)*100;
		var percent_written = (start_position+progress.written)/(start_position+progress.total)*100;
		var screen_data = {
			headers: [
				'written: '+formatBytes(start_position+progress.written, 2)+' ('+percent_written.toFixed(2)+'%)',
				'downloaded: '+formatBytes(start_position+progress.downloaded, 2)+' ('+percent_downloaded.toFixed(2)+'%)',
				'speed: '+progress.speed.toFixed(2)+' kb/s'
			], 
			large: [percent_written, percent_downloaded],
			small: []
		};
		progress.chunks.forEach(function(chunk){
			screen_data.small.push({
				percent: chunk.downloaded / chunk.size * 100,
				text: 'requests: '+chunk.requests+'\tspeed: '+chunk.speed.toFixed(2)+' kb/s'
			});
		});
		display(screen_data);
	};
	var progress_interval = null;
	download.on('headers', function(headers){
		process.stdout.write('\nfilename: '+program.filename+'\nsize: '+formatBytes(Number(headers['content-length']), 2)+'\n');
		progress_interval = setInterval(updateDisplay, 500);
	});
	download.pipe(fs.createWriteStream(destination, {flags: start_position?'a':'w'}));
	download.on('end', function(){
		updateDisplay();
		clearInterval(progress_interval);
		die('done!');
	});
};

var beginDownload = function(){
	doDownload(0);
};
var resumeDownload = function(){
	fs.stat(destination, function(err, stat){
		if (err){
			die(err);
		}
		doDownload(stat.size);
	});
};
if (program.overwrite && program.resume){
	handleError("can't overwrite and resume together, duh");
} else if (program.overwrite){
	beginDownload();
} else if (program.resume){
	resumeDownload();
} else {
	fs.exists(destination, function(exists){
		if (exists){
			process.stdout.write('warning: file "'+program.filename+'" already exists\n');
			program.choose(['overwrite', 'resume'], function(resume){
				if (resume){
					resumeDownload();
				} else {
					beginDownload();
				}
			});
		} else {
			beginDownload();
		}
	});
}