const gulp = require('gulp');
const downloadFile = require("gulp-download");
const changed = require('gulp-changed');
const webpackStream = require('webpack-stream');
const webpack = require('webpack');
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
});
gulp.task('run-webpack', function(done) {
	gulp.src('./src/main.js')
    .pipe(webpackStream(require('./webpack.config'), webpack))
    .pipe(gulp.dest('./public'));	
    done();
});
gulp.task('build', gulp.series('pre', 'run-webpack'), function(done) {
	done();
})