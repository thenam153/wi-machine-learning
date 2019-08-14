const gulp = require('gulp');
const downloadFile = require("gulp-download");

gulp.task('pre', function() {
	// let stream = downloadFile('https://www.dropbox.com/scl/fi/dyrdwclgcnqimzbd8wtj8/Untitled.gsheet?dl=0&rlkey=iu3z2opnenevuamg30ez9kz3i#gid=0').pipe(gulp.dest("./")); 
	var wiMl = require('./excel-to-json.js');
	// stream.on('end', function() {
	// 	let inputFile = './wi-uservice.xlsx';
	// 	let outputFile = './wi-uservice.json';
	// 	let configFile = './src/config/config.js';
	// 	wiMl.sheetToJson(inputFile, outputFile, configFile);
	// });
	let inputFile = './wi-uservice.xlsx';
	let outputFile = './src/model-selection/model/wi-uservice.json';
	let configFile = './src/config/config.js';
	return wiMl.sheetToJson(inputFile, outputFile, configFile);
});
