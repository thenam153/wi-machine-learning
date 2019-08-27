const webpack = require('webpack');

module.exports = {
	context: __dirname + '/src',
	mode: "development",
	entry: {
		main: "./main.js",
	},
	output: {
		path: __dirname + '/dist'
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
}