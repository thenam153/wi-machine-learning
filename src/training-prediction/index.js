const moduleName = "trainingPrediction";
const componentName = "trainingPrediction";
module.exports.name = moduleName;

var config = require('../config/config.js');
var app = angular.module(moduleName, ['wiDialog','wiDiscriminator','wiApi']);

app.component(componentName,{
	template: require('./template.html'),
    controller: TrainingPredictionController,
    style: require('./style.less'),
    controllerAs: 'self',
    bindings: {
    	stepDatas: '<',
    	inputCurveSpecs: '<',
        targetCurveSpec: '<',
        model: '<',
    }
});
function TrainingPredictionController($scope,wiDialog,wiApi,$http){
	let self = this;
	const TRAIN_STEP_NAME = 'Train';
    const VERIFY_STEP_NAME = 'Verify';
    const PREDICT_STEP_NAME = 'Predict';

    const TRAIN_STEP_STATE = 'training';
    const VERIFY_STEP_STATE = 'verify';
    const PREDICT_STEP_STATE = 'prediction';
	// const BASE_ML_URL = 'http://192.168.0.120:5001/api';
	 //--------------
	 $scope.tab = 1;
	 self.selectionTab = self.selectionTab || 'Wells';
 
	 $scope.setTab = function(newTab){
		 $scope.tab = newTab;
	 };
 
	 $scope.isSet = function(tabNum){
		 return $scope.tab === tabNum;
	 };
	 //--------------
    this.$onInit = function() {
    	// self.baseMlUrl = '';
    	// $scope.$watch(function() {
    	// 	return JSON.stringify(self.model);
    	// }, function() {
    	// 	// if(self.model)
    	// 	self.baseMlUrl = config[self.model.name] || '';
    	// 	console.log('change', self.baseMlUrl);
    	// })
    }
    this.model_id = null;
	this.onDiscriminator = function(dataset) {
		// console.log(dataset.curves);
		wiDialog.discriminator(dataset.discrmnt,dataset.curves,function(res) {
			dataset.discrmnt = res;
			console.log(res);
		})
	}
	this.runTask = runTask;
	let functionCache = {
		training: {},
		verify: {},
		prediction: {}
	}
	this.getOnItemChange = function(step,indexDataset,index) {
		if(!functionCache[step][indexDataset]) functionCache[step][indexDataset] = [];
		if(!functionCache[step][indexDataset][index]) {
			functionCache[step][indexDataset][index] = function(selectedItemProps) {
				self.stepDatas[step].datasets[indexDataset].inputCurveSpecs[index].value = selectedItemProps;
				if(selectedItemProps) {
					self.stepDatas[step].datasets[indexDataset].inputCurveSpecs[index].currentSelect = selectedItemProps.name;
				}
				else {
					self.stepDatas[step].datasets[indexDataset].inputCurveSpecs[index].currentSelect = '[no choose]';
				}
			}
		}
		return functionCache[step][indexDataset][index];
	}
	function postPromise(url, data, method) {
        return new Promise(function(resolve, reject) {
            $http({
                method: method,
                url: url,
                data: data,
            }).then((response) => {
            	console.log(response);
                if (response.status === 200) resolve(response.data);
                if (response.status === 201) resolve(response.data);
                else reject(new Error(response.data.reason));
            }, (err) => {
            	console.log('err',err);
            	if(err.status === 400 && err.data.status === 'existed') {
            		resolve({existed : true});
            	}
                reject(err);
            })
        });
    }
    function postCreateModel(payload) {
    	return postPromise(config[self.model.name] + self.model.create , payload, 'POST');
    }
    function postCreateBucketId(payload) {
    	return postPromise(config[self.model.name] + '/data', payload ,'POST');
    }
    function putDataOfTrain(payload) {
    	return postPromise(config[self.model.name] + '/data', payload, 'PUT');
    }
    function postTrainByBucketData(payload) {
    	return postPromise(config[self.model.name] + '/model/train_by_bucket_data', payload,'POST');
    }
    function postPredict(payload) {
    	return postPromise(config[self.model.name] + '/model/predict', payload, 'POST');
    }
    function getBucket() {
    	return postPromise(config[self.model.name] + '/bucket/list', {}, 'GET');
    }
    function isRun(dataset) {
    	// console.log('isRun',dataset);
    	if(!dataset.active) return false;
    	let isValid = true;
		for(let i of dataset.inputCurveSpecs) {
			if(i.currentSelect == '[no choose]') {
				isValid = false;
				break;
			}
		}
		return isValid;
    }
    async function createModelAndBucketId() {
    	console.log(self.model);
    	let payload = {};
		for(let i in self.model.params) {
			payload[i] = self.model.params[i].value;
			if(i === 'model_id') self.model_id = self.model.params[i].value;
			if(i === 'max_features') payload[i] = self.inputCurveSpecs.length
		}
		console.log(payload);
		let resModelId = await postCreateModel(payload);
		let request = {
			bucket_id: self.model_id,
			dims: self.inputCurveSpecs.length + 1
		}
		let resBucketId = await postCreateBucketId(request);
		console.log(resBucketId);
		if(resBucketId.existed) {
			request.override_flag = true;
			resBucketId = await postCreateBucketId(request);
		}
		return new Promise((resolve) => {
			resolve({
				model_id: resModelId,
				bucket_id: resBucketId
			})
		})
    }
	function runTask(step) {
		switch(step) {
			case 0: 
				train(function(){
					console.log('run',step);
				});
				break;				
			case 1:
				verify(function(){
					console.log('run',step);
				})	
				break;	
			case 2:
				prediction(function(){
					console.log('run',step);
				})
				break;
		}
	}
	function getDataCurveAndFilter(dataset, curves, callback) {
		let arrNaN = [];
		let inputCurveData = [];
		// console.log(dataset);
		async.eachSeries(dataset.inputCurveSpecs,function(input,_cb) {
			(async()=> {
				let curve = dataset.curves.find(i => {
					return i.name === input.currentSelect;
				});
				let dataCurve = await wiApi.getCurveDataPromise(curve.idCurve);
				for(let i in dataCurve) {
					dataCurve[i] = parseFloat(dataCurve[i].x,4);
					if(isNaN(dataCurve[i])) curves[i] = false;
				}
				inputCurveData.push(dataCurve);
				_cb();
			})();	
		}, err => {
			if (err) console.log(err);
			if(inputCurveData && inputCurveData.length) {
				let cacheInputCurveData = [];
				cacheInputCurveData.length = inputCurveData.length;
				let length = inputCurveData[0].length;
				for(let i in inputCurveData) {
					if(length > inputCurveData[i].length) length = inputCurveData[i].length; 
				}
				for(let i = 0; i < inputCurveData.length; i++) {
					if(inputCurveData[i].length > length) {
						inputCurveData[i].splice(length,inputCurveData[i].length - length);
					}
					for(let j = 0; j < inputCurveData[i].length; j++) {
						if(!cacheInputCurveData[i]) cacheInputCurveData[i] = []; 
						if(curves[j]) {
							cacheInputCurveData[i].push(inputCurveData[i][j]);
						}
					}
				}
				inputCurveData = cacheInputCurveData;
				callback(inputCurveData);	
			}else {
				callback([]);
			}
		});
	}
	async function train(cb) {
		if(!self.stepDatas[TRAIN_STEP_STATE].datasets.length) return cb();
		let res = await createModelAndBucketId();
		console.log(res);
		async.each(self.stepDatas[TRAIN_STEP_STATE].datasets,function(dataset,_cb){
			if(isRun(dataset)) {
				evaluateExpr(dataset,dataset.discrmnt,function(curves) {
					// console.log('evaluate',curves);
					getDataCurveAndFilter(dataset, curves, async function(dataCurves) {
						console.log(dataCurves);
						let request = {
							bucket_id: self.model_id,
							data: dataCurves
						}
						let res = await putDataOfTrain(request);
						_cb();
					});
				})
			}else {
				_cb();
				// cb();
			}
		},async function(err) {
			if(err) console.error(err);
			let req = {
				model_id: self.model_id,
				bucket_id: self.model_id
			}
			console.log(req);
			let res = await postTrainByBucketData(req);
			console.log('train ',res);
			cb();	
		})
	}
	async function verify(cb) {
		async.each(self.stepDatas[VERIFY_STEP_STATE].datasets,function(dataset,_cb){
			if(isRun(dataset)) {
				evaluateExpr(dataset,dataset.discrmnt,function(curves) {
					getDataCurveAndFilter(dataset, curves, async function(dataCurves) {
						let target = dataCurves.splice(dataCurves.length - 1, 1)[0];
						// console.log(target,dataCurves);	
						let payload = {
							features: dataCurves,
							model_id: self.model_id
						}
						let verifyData = await postPredict(payload);			
						let dataError = [];
						for(let i = 0; i < target.length; i++) {
							dataError[i] = Math.abs((target[i] - verifyData.target[i]) / verifyData.target[i]);
						}	
						console.log('verify',dataError);
						_cb();
					});
				});
			}else {
				_cb();
				// cb();
			}
		},err => {
			if(err) console.error(err);
			cb();	
		});
	}
	async function prediction(cb) {
		async.each(self.stepDatas[PREDICT_STEP_STATE].datasets,function(dataset,_cb){
			if(isRun(dataset)) {
				evaluateExpr(dataset,dataset.discrmnt,function(curves) {
					getDataCurveAndFilter(dataset, curves, async function(dataCurves) {
						// console.log(target,dataCurves);	
						let payload = {
							features: dataCurves,
							model_id: self.model_id
						}
						let preidictData = await postPredict(payload);	
						console.log('predict',preidictData);
						_cb();
					});
				});
			}else {
				_cb();
				// cb();
			}
		},err => {
			if(err) console.error(err);
			cb();	
		})
	}
	function evaluateExpr(dataset, discriminator, callback) {
	    let result = new Array();
	    let length = 0;
	    // let length = (dataset.bottom - dataset.top) / dataset.step;
	    let curveSet = new Set();
	    let curvesData = new Array();
	    let curvesInDataset = dataset.curves;
	    if (!curvesInDataset) return callback(result);
	    function findCurve(condition) {
	        if (condition && condition.children && condition.children.length) {
	            condition.children.forEach(function (child) {
	                findCurve(child);
	            })
	        } else if (condition && condition.left && condition.right) {
	            curveSet.add(condition.left.value);
	            if (condition.right.type == 'curve') {
	                curveSet.add(condition.right.value);
	            }
	        } else {
	            return;
	        }
	    }

	    findCurve(discriminator);

	    function evaluate(condition, index) {
	    	if(typeof discriminator !== 'undefined' && !discriminator.active) {return true;}
	        if (condition && condition.children && condition.children.length) {
	            let left = evaluate(condition.children[0], index);
	            let right = evaluate(condition.children[1], index);
	            switch (condition.operator) {
	                case 'and':
	                    return left && right;
	                case 'or':
	                    return left || right;
	            }
	        }
	        else if (condition && condition.left && condition.right) {
	            let leftCurve = curvesData.find(function (curve) {
	                return curve.name == condition.left.value;
	            });
	            let left = leftCurve ? parseFloat(leftCurve.data[index]) : null;

	            let right = condition.right.value;
	            if (condition.right.type == 'curve') {
	                let rightCurve = curvesData.find(function (curve) {
	                    return curve.name == condition.right.value;
	                })
	                right = rightCurve ? parseFloat(rightCurve.data[index]) : null;
	            }

	            if (left != null && right != null) {
	                switch (condition.comparison) {
	                    case '<':
	                        return left < right;
	                    case '>':
	                        return left > right;
	                    case '=':
	                        return left == right;
	                    case '<=':
	                        return left <= right;
	                    case '>=':
	                        return left >= right;
	                }
	            } else {
	                return false;
	            }
	        } else {
	            return true;
	        }
	    }

	    let curveArr = curvesInDataset.filter(c => {
	        // console.log('c',c,Array.from(curveSet).includes(c.name),Array.from(curveSet));
	        return Array.from(curveSet).includes(c.name);
	    });
	    console.log(curveArr);
	    async.eachOfSeries(
	        curveArr,
	        function (curve, i, done) {
	            // console.log('curve of curve arr',curve);
	            if (curve) {
	            	(async()=>{
	            		let data = await wiApi.getCurveDataPromise(curve.idCurve);
	            		if (Array.isArray(data)) {
	                        curvesData.push({
	                            idCurve: curve.idCurve,
	                            name: curve.name,
	                            data: data.map(d => parseFloat(d.x))
	                        })
	                    }
	                    done();
	            	})();
	            } 
	        },
	        function (err) {
	            console.log('done!', curvesData);
	            (async()=> {
	            	let data = await wiApi.getCurveDataPromise(curvesInDataset[0].idCurve);
	            	// console.log(data);
	            	length = data.length;
	            	for (let i = 0; i <= length; i++) {
			                result.push(evaluate(discriminator, i));
			            }
		            callback(result);
	            })();
	        }
	    );
	}
	this.runAll = async function() {
		train(function() {
			verify(function() {
				prediction(function() {
					console.log('Run All');
				})
			})
		})
		// async.eachOfSeries(stepDatas, (data,index,next) {

		// }, err => {
		// 	if(!err) return console.log(err);
		// 	console.log('Run All finish');
		// })
	}
	this.onToggleActiveOutput = function(dataset) {
		dataset.active = !dataset.active;
	}
}