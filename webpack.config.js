const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackDeployPlugin = require('html-webpack-deploy-plugin');
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
		}, {
			test: /\.(js|jsx)$/,
			use: {
				loader: 'babel-loader',
			},
		},
		],
	},
	resolve: {
		alias: {
			'vue$': 'vue/dist/vue.esm.js'
		},
		symlinks: false,
	},
	plugins: [
		new CleanWebpackPlugin({
			cleanOnceBeforeBuildPatterns: ['**/*', '!bower_components/**'],
		}),
		new HtmlWebpackDeployPlugin({
			append: false,
			assets: {
				copy: [
					{
						from: './public',
						to: '',
						cacheTransform: true,
						force: true,
					},
				],
			},
			useAssetsPath: false,
			packages: {
				'@revotechuet/misc-component': {
					copy: { from: 'dist', to: '/' },
					scripts: 'misc-components.js',
				},
				'@revotechuet/plot-toolkit': {
					copy: [{ from: 'dist/plot-toolkit.js', to: 'plot-toolkit.js' }],
					scripts: 'plot-toolkit.js',
				},
			}
		}),
		new HtmlWebpackPlugin({
			template: './public/index.html',
		}),
	]
}
