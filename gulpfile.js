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
	// let inputFile = './wi-uservice.xlsx';
	// let outputFile = './src/model-selection/model/wi-uservice.json';
	// let configFile = './src/config/config.js';
	// return wiMl.sheetToJson(inputFile, outputFile, configFile);
});
gulp.task('run-webpack', function(done) {
	gulp.src('./src/main.js')
    .pipe(webpackStream({
		// context: __dirname + '/src',
		mode: process.env.NODE_ENV === 'prod' ? "production" : "development",
		// entry: {
		// 	main: "./main.js",
		// },
		output: {
			filename:'main.js'
		},
		module: {
			rules: [{
					test: /\.html$/,
					use: ['html-loader']
				}, {
					test: /\.css$/,
					use: ['style-loader', 'css-loader'],
				},
				{
					test: /\.less$/,
					use: ['style-loader','css-loader','less-loader'],
				},
				{
					test: /\.(png|jpeg|ttf|...)$/,
					use: [
						{ loader: 'url-loader' }
						// limit => file.size =< 8192 bytes ? DataURI : File
					]
				}
			],
		}
	}, webpack))
    .pipe(gulp.dest('./public'));	
    done();
})
// gulp.task('bower', function () {
//     var DEST = 'public/bower_components';
//     return gulp.src('bower_components/**/*').pipe(changed(DEST)).pipe(gulp.dest(DEST));
// });

gulp.task('build', gulp.series('pre', 'run-webpack'), function(done) {
	done();
})