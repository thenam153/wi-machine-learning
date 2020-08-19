const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
	mode: process.env.NODE_ENV || "development",
	entry: {
		main: "./src/main.js",
	},
	output: {
		path: __dirname + '/dist',
		filename: 'main.[contenthash].js',
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
			use: ['style-loader', 'css-loader', 'less-loader'],
		},
		{
			test: /\.(png|jpeg|ttf|...)$/,
			use: [
				{ loader: 'url-loader' }
				// limit => file.size =< 8192 bytes ? DataURI : File
			]
		}
		],
	},
	resolve: {
		alias: {
			'vue$': 'vue/dist/vue.esm.js'
		},
		symlinks: false,
	},
	plugins: [
		new CleanWebpackPlugin(),
		new CopyPlugin({
			patterns: [
				{
					from: 'public',
					cacheTransform: true,
					force: true,
				},
			],
		}),
		new HtmlWebpackPlugin({
			template: './public/index.html',
		}),
	]
}
