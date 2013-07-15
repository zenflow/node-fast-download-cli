var large_height = 8;
var large_width = 78;
var small_width = 40;

var charm = require('charm')(process.stdout);
var last_row_count = 0;
module.exports = function(data){
	charm.up(last_row_count);
	var row_count = 0;
	//print headers
	data.headers.forEach(function(header){
		charm.write(header);
		charm.erase('end');
		charm.write('\n');
		row_count++;
	});
	//print space
	charm.erase('end');
	charm.write('\n');
	row_count++;
	//print large (segmented) chart
	for (var y = 0; y < large_height; y++){
		var segment = 0;
		for (var x = 0; x < large_width; x++){
			var percent = (x * large_height + y) / (large_width * large_height) * 100;
			while (percent >= data.large[segment]){segment++;}
			charm.background(['green','cyan','blue'][segment]);
			charm.write(' ');
		}
		charm.background('black');
		charm.erase('end');
		charm.write('\n');
		row_count++;
	}
	//print space
	charm.erase('end');
	charm.write('\n');
	row_count++;
	//print chart for each open chunk
	data.small.forEach(function(small){
		var position = Math.floor(small.percent / 100 * small_width);
		charm.background('cyan');
		var str = ''; 
		while (str.length < position){str+=' '}
		charm.write(str);
		charm.background('blue');
		var str = ''; 
		while (str.length < small_width-position){str+=' '}
		charm.write(str);
		charm.background('black');
		charm.erase('end');
		charm.write(' '+small.text+'\n');
		row_count++;
	});
	//continue clearing until all lines from the last display are gone
	var row_difference = last_row_count - row_count;
	for (var i = 0; i < row_difference; i++){
		charm.erase('end');
		charm.down(1);
	}
	charm.up(row_difference);
	last_row_count = row_count;
};