# wi-machine-learning
Install 
[gulp-cli](http://npmjs.com/package/gulp-cli)
```shell
$ npm install gulp-cli -g
```
[http-server](https://www.npmjs.com/package/http-server)
```shell
$ npm install http-server -g
```
### Run
#### Dev
```shell
SET NODE_ENV=development || dev
gulp build
webpack --mode=development
npm start
```
#### Production
```shell
SET NODE_ENV=production || prod
gulp build
webpack --mode=production
npm start
```
