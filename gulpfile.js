const gulp = require('gulp');
const downloadFile = require("gulp-download");
const changed = require('gulp-changed');

gulp.task('pre', function (cb) {
	let stream = downloadFile('http://file.i2g.cloud/wi-xlsx/wi-uservice.xlsx').pipe(gulp.dest("./"));
	var wiMl = require('./excel-to-json.js');
	stream.on('end', function () {
		let inputFile = './wi-uservice.xlsx';
		let outputFile = './wi-uservice.json';
		let configFile = './src/config/config.json';
		wiMl.sheetToJson(inputFile, outputFile, configFile);
		cb();
	});
	stream.on('error', function (e) {
		console.log("Loi ", e)
	});
	// let inputFile = './wi-uservice.xlsx';
	// let outputFile = './src/model-selection/model/wi-uservice.json';
	// let configFile = './src/config/config.js';
	// return wiMl.sheetToJson(inputFile, outputFile, configFile);
});

gulp.task('bower', function () {
    var DEST = 'public/bower_components';
    return gulp.src('bower_components/**/*').pipe(changed(DEST)).pipe(gulp.dest(DEST));
});

gulp.task('build', gulp.parallel('pre', 'bower'), function(done) {
	done();
})