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

 ## using private packages
[Generate token](https://github.com/settings/tokens/new) with following scopes:
- read:packages

(keep it safe for using later, **but dont commit**)


`npm login --registry=https://npm.pkg.github.com` (password is the token generated)

## dev
**In package dir**
```shell
npm link
```

**In depedent dir**
```shell
npm link [<@scope>/]<pkg>[@<version>]
```