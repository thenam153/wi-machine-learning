const moduleName = "trainingPrediction";
const componentName = "trainingPrediction";
module.exports.name = moduleName;

var config = require('../config/config.js');
var app = angular.module(moduleName, ['wiDialog',
	'wiDiscriminator',
	'wiApi',  
	'distributionMapModule',
  	'visualizationMapModule',
  	'somModelService']);

app.component(componentName,{
	template: require('./newtemplate.html'),
    controller: TrainingPredictionController,
    style: require('./newstyle.less'),
    controllerAs: 'self',
    bindings: {
    	stepDatas: '<',
    	inputCurveSpecs: '<',
        targetCurveSpec: '<',
        model: '<',
        stateWorkflow: '<',
        setModelId: '<',
        setBucketId: '<',
        somVisualize: '<',
        showSomVisualize: '<',
        setState: '<'
    }
});
function TrainingPredictionController($scope, $timeout, wiDialog, wiApi, $http, somModelService){
	let self = this;
	const TRAIN_STEP_NAME = 'Train';
    const VERIFY_STEP_NAME = 'Verify';
    const PREDICT_STEP_NAME = 'Predict';

    const TRAIN_STEP_STATE = 'training';
    const VERIFY_STEP_STATE = 'verify';
    const PREDICT_STEP_STATE = 'prediction';

    const ML_TOOLKIT = 'curve';
    const ML_TOOLKIT_CLASSIFICATION = 'classification';
	// const BASE_ML_URL = 'http://192.168.0.120:5001/api';
	 //--------------
	$scope.tab = 1;
	self.selectionTab = self.selectionTab || 'Wells';

	$scope.setTab = function(newTab) {
	 $scope.tab = newTab;
	};

	$scope.isSet = function(tabNum) {
	 return $scope.tab === tabNum;
	};
	 //--------------

    this.model_id = null;
	this.onDiscriminator = function(dataset) {
		// console.log(dataset.curves);
		wiDialog.discriminator(dataset.discrmnt,dataset.curves,function(res) {
			dataset.discrmnt = res;
			console.log(res);
		})
	}
	this.running = false;
	this.runTask = runTask;
	let functionCache = {
		training: {},
		verify: {},
		prediction: {}
	}
	this.showWapper = function () {
		let element = document.getElementById("wapper");
		element.classList.toggle("show");
	}
	this.setItemOnChange = function(dataset, index, item) {
		console.log(dataset, index, item);
		if(dataset.inputCurveSpecs.length === index + 1 && dataset.patternCurveName) {
			dataset.resultCurveName = item.data.label.toUpperCase() !== '[NO CHOOSE]' ? item.data.label.toUpperCase() + dataset.patternCurveName : dataset.patternCurveName ;
		}
		dataset.inputCurveSpecs[index].value = item.properties;
		dataset.inputCurveSpecs[index].currentSelect = item.data.label;
	}

	function postPromise(url, data, method) {
        return new Promise(function(resolve, reject) {
            $http({
                method: method,
                url: url,
                data: data,
            }).then((response) => {
            	// console.log(response);
                if (response.status === 200) resolve(response.data);
                if (response.status === 201) resolve(response.data);
                else reject(new Error(response.data.reason));
            }, (err) => {
            	if(err.status === 400 && err.data.status === 'existed') {
            		resolve({existed : true});
            	}
                reject(err);
            })
        });
    }

    function getSomVisualize(model_id) {
    	// /model/som/
    	return postPromise(`${self.model.url}/api/model/som/${model_id}`, {}, 'GET');
    }

    function postCreateModel(payload) {
    	return postPromise(`${self.model.url}/api/model/create/${self.model.create}`, payload, 'POST');
    }

    function postCreateBucketId(payload) {
    	return postPromise(`${self.model.url}/api/data`, payload ,'POST');
    }

    function putDataOfTrain(payload) {
    	return postPromise(`${self.model.url}/api/data`, payload, 'PUT');
    }

    function postTrainByBucketData(payload) {
    	return postPromise(`${self.model.url}/api/model/train_by_bucket_data`, payload,'POST');
    }

    function postPredict(payload) {
    	return postPromise(`${self.model.url}/api/model/predict`, payload, 'POST');
    }

    function getBucket() {
    	return postPromise(`${self.model.url}/api/bucket/list`, {}, 'GET');
    }

	function runTask(step) {
		self.running = true;
		switch(step) {
			case 0: 
				train()
				.then(data => {
					console.log('run',step, data);
				})
				.catch(err => {
					console.error(err)
				})
				.finally(() => {
					$timeout(() => {
						self.running = false;						
					})
				})
				break;				
			case 1:
				verify()
				.then(() => {
					console.log('run',step);
				})
				.catch(err => {
					console.error(err)
				})
				.finally(() => {
					$timeout(() => {
						self.running = false;						
					})
				})
				break;	
			case 2:
				prediction()
				.then(() => {
					console.log('run',step);
				})
				.catch(err => {
					console.error(err)
				})
				.finally(() => {
					$timeout(() => {
						self.running = false;						
					})
				})
				break;
		}
	}

	function train() {
		return new Promise((resolve, reject) => {
			if(!self.stepDatas[TRAIN_STEP_STATE].datasets.length) {
				// return cb(new Error('Please drop dataset'));
				reject(new Error('Please drop dataset'))				
			} 
			createModelAndBucketId()
			.then((res) => {
				async.each(self.stepDatas[TRAIN_STEP_STATE].datasets, function(dataset, _cb) {
					if(!isRun(dataset)) {
						reject(new Error('Please select curve for dataset'));
					}
					evaluateExpr(dataset,dataset.discrmnt)
					.then((curves) => {
						getDataCurveAndFilter(dataset, curves).then(async (dataCurves) => {
							let payload = {
								bucket_id: self.bucket_id,
								data: dataCurves
							}
							putDataOfTrain(payload)
							.then((res) => {
								console.log(res);
								_cb();
							})
						});
					})
					.catch(err => {
						reject(err);
					});
				}, async function(err) {
					if(err) {
						reject(err)
					}
					let request = createPayloadForTrain();
					postTrainByBucketData(request)
					.then((res) => {
						console.log(res);
						doAfterTrain();
						resolve(res);
					})
					.catch((err) => {
						reject(err)
					})
				})
			})
			.catch((err) => {
				reject(err)
			})
		})
	}

	function verify() {
		return new Promise((resolve, reject) => {
			if(self.stateWorkflow.state === -1 ) reject(new Error('Please train before verify'));
			if(self.stepDatas[VERIFY_STEP_STATE].datasets) {
				reject(new Error('Please drop dataset'))
			}
			async.each(self.stepDatas[VERIFY_STEP_STATE].datasets, function(dataset,_cb){
				if(!isRun(dataset)) {
					reject(new Error('Please select curve for dataset'));
				}
				evaluateExpr(dataset, dataset.discrmnt)
				.then(function(curves) {
					getDataCurveAndFilter(dataset, curves)
					.then(async function(dataCurves) {
						let targetFilter = dataCurves.pop();
						let payload = {
							features: dataCurves,
							model_id: self.model_id
						}
						// let dataVerify = await postPredict(payload);
						postPredict(payload)
						.then((dataVerify) => {
							handleResultVerify(dataset, dataVerify)
							.then(newCurve => {
								console.log(newCurve);
								_cb();
							});
						});	
					});
				})
				.catch(err => {
					console.error(err);
					_cb(err);
				});
				
			},err => {
				if(err) {
						console.error(err);
						reject(err);
					};
				resovle();	
			});
		})
	}

	async function prediction() {
		return new Promise((resolve, reject) => {
			if(self.stateWorkflow.state === -1 ) reject(new Error('Please train before prediction'));
			if(self.stepDatas[PREDICT_STEP_STATE].datasets) {
				reject(new Error('Please drop dataset'))
			}
			async.each(self.stepDatas[PREDICT_STEP_STATE].datasets, function(dataset,_cb){
				if(isRun(dataset)) {
					reject(new Error('Please drop dataset'))
				}
				evaluateExpr(dataset,dataset.discrmnt)
				.then(function(curves) {
					getDataCurveAndFilter(dataset, curves)
					.then(async function(dataCurves) {
						// console.log(target,dataCurves);	
						let payload = {
							features: dataCurves,
							model_id: self.model_id
						}
						// let dataPrediction = await postPredict(payload);	
						postPredict(payload)
						.then((dataPrediction) => {
							handleResultPrediction(dataset, dataPrediction)
							.then((newCurve) => {
								_cb();
							});
						});	
					});
				})
				.catch(err => {
					_cb(err);
				});
			},err => {
				if(err) {
					reject(err);
					console.error(err);
				}
				resolve();
			})
		})
	}

	function evaluateExpr(dataset, discriminator) {
		return new Promise(resolve => {
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
			            resolve(result);
		            })();
		        }
		    );
		})
	}

	function isRun(dataset) {
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
    	return new Promise((resolve, reject) => {
    		console.log(self.model);
	    	let payload = {};
	    	let params = self.model.payload.params;
			params.forEach(i => {
				payload[i.name] = i.value;
				if(i.name === 'model_id') self.model_id = i.value;
			})
			console.log(payload);
			// let resModelId = await postCreateModel(payload);
			postCreateModel(payload)
			.then((resModelId) => {
				self.setModelId(self.model_id);
				self.bucket_id = self.model_id + Date.now()
				let request = {
					bucket_id: self.bucket_id,
					dims: self.inputCurveSpecs.length + 1
				}
				// let resBucketId = await postCreateBucketId(request);
				postCreateBucketId(request)
				.then((resBucketId) => {
					self.setBucketId(self.bucket_id)
					if(resBucketId.existed) {
						request.override_flag = true;
						// resBucketId = await postCreateBucketId(request);
						postCreateBucketId(request)
						.then((resBucketId) => {
							resolve({
								model_id: resModelId,
								bucket_id: resBucketId
							})
						})
					}else {
						resolve({
								model_id: resModelId,
								bucket_id: resBucketId
							})
					}
				})
			})
			.catch((err) => {
				reject(err);
			})
    	})
		// return new Promise((resolve) => {
		// 	resolve({
		// 		model_id: resModelId,
		// 		bucket_id: resBucketId
		// 	})
		// })
    }

	function getDataCurveAndFilter(dataset, curves, callback) {
		return new Promise((resolve, reject) => {
			let arrNaN = [];
			let inputCurveData = [];
			// console.log(dataset);
			async.eachSeries(dataset.inputCurveSpecs, function(input, _cb) {
				(async()=> {
					let curve = dataset.curves.find(i => {
						return i.name === input.currentSelect;
					});
					let dataCurve = await wiApi.getCurveDataPromise(curve.idCurve);
					for(let i in dataCurve) {
						dataCurve[i] = parseFloat(dataCurve[i].x, 4);
						if(isNaN(dataCurve[i])) curves[i] = false;
					}
					inputCurveData.push(dataCurve);
					_cb();
				})();	
			}, err => {
				if (err || !inputCurveData || !inputCurveData.length) {
					console.log(err);
					reject(err || 'Something was wrong');
				}
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
				resolve(inputCurveData);	
			});
		})
	}
	function createPayloadForTrain() {
		if(!self.model.payload.train) {
			return {
				model_id: self.model_id,
				bucket_id: self.bucket_id
			}
		}else {
	    	let payload = {
	    		model_id: self.model_id,
				bucket_id: self.bucket_id
	    	};
	    	let params = self.model.payload.train;
			params.forEach(i => {
				payload[i.name] = i.value;
			})
			return payload
		}
	}

	this.runAll = async function() {
		self.running = true;
		// train(function() {
		// 	verify(function() {
		// 		prediction(function() {
		// 			console.log('Run All');
		// 			self.running = false;
		// 		})
		// 	})
		// })
		train()
		.then(() => {
			return verify();
		})
		.then(() => {
			return prediction();
		})
		.then(() => {
			console.log('complete')
		})
		.catch((err) => {
			console.log(err);
		})
		.finally(() => {
			console.log('Run All');
			$timeout(() => {
				self.running = false;
			})
		})
	}

	this.onToggleActiveOutput = function(dataset) {
		dataset.active = !dataset.active;
	}

	async function saveCurve(curveInfo, dataset, callback) {
		let payload = {
            idDataset: curveInfo.idDataset,
            data: curveInfo.data,
            unit: curveInfo.unit || undefined,
            idFamily: curveInfo.idFamily || null,
        }
        if(dataset.step == 0 ) {
        	let curveData = await wiApi.getCurveDataPromise(dataset.curves[0].idCurve);
        	payload.data = curveData.map((d,i)=>{
                return [parseFloat(d.y),curveInfo.data[i]];
            });
        }
    	let curve = await wiApi.checkCurveExistedPromise(curveInfo.name, curveInfo.idDataset);
    	if (curve && curve.idCurve) {
            payload.idDesCurve = curve.idCurve;
            curveInfo.idCurve = curve.idCurve;
        } else {
            payload.curveName = curveInfo.name
        }
        let newCurve = await wiApi.createCurvePromise(payload);
        // console.log(newCurve);
        callback(newCurve);
	}
	function handleResultVerify(dataset, dataVerify) {
		return new Promise ((resolve, reject) => {
			let curveTarget = {
				name: 'target',
				value: dataVerify.target
			}		
			getDataCurves(dataset, dataset.inputCurveSpecs, function(curves) {
				if(!curves) reject(new Error('Failture'));
				let targetNFilter = curves.pop();
				let filterNullResult = filterNull(curves);
				fillNullInCurve(filterNullResult.fillNull, curveTarget, function(res) {
					console.log(res); 
					if(!res) reject(new Error('Failture'));
					let curveInfo = {
                        idDataset: dataset.idDataset,
                        idFamily: dataset.inputCurveSpecs.slice(-1).pop().value.idFamily,
                        // idWell: well.idWell,
                        name: dataset.resultCurveName,
                        data: res.value,
                        unit: dataset.inputCurveSpecs.slice(-1).pop().value.unit
                    }
                    saveCurve(curveInfo, dataset, function(newCurve) {
                    	if(!newCurve.idCurve) reject(new Error('Failture'));
                    	resolve(newCurve)
                    })
				})
			})
		})
	}
	function handleResultPrediction (dataset, dataPrediction) {
		return new Promise ((resolve, reject) => {
			let curveTarget = {
				name: 'target',
				value: dataPrediction.target
			}		
			let idFamily, unit;
			if(self.stepDatas[TRAIN_STEP_STATE].datasets[0].inputCurveSpecs.slice(-1).pop().value) {
				idFamily = self.stepDatas[TRAIN_STEP_STATE].datasets[0].inputCurveSpecs.slice(-1).pop().value.idFamily;
				unit = self.stepDatas[TRAIN_STEP_STATE].datasets[0].inputCurveSpecs.slice(-1).pop().value.unit;	
			}else {
				_cb(new Error('Data Training not existed'))
			}
			
			// console.log(self.stepDatas[TRAIN_STEP_STATE].datasets[0].inputCurveSpecs.slice(-1).pop());
			getDataCurves(dataset, dataset.inputCurveSpecs, function(curves) {
				if(!curves) reject(new Error('Failture'));
				let targetNFilter = curves.pop();
				let filterNullResult = filterNull(curves);
				fillNullInCurve(filterNullResult.fillNull, curveTarget, function(res) {
					console.log(res); 
					if(!res) reject(new Error('Failture'));
					let curveInfo = {
		                idDataset: dataset.idDataset,
		                idFamily: idFamily,
		                // idWell: well.idWell,
		                name: dataset.resultCurveName,
		                data: res.value,
		                unit: unit
		            }
		            saveCurve(curveInfo, dataset, function(newCurve) {
		            	if(!newCurve.idCurve) reject(new Error('Failture'));
		            	resolve(newCurve)
		            })
				})
			})
		})
	}

	function fillNullInCurve(fillArr, curve, cb) {
        // async.forEachOfSeries(curvesArray, function (curve, j, done) {
            for (let i in fillArr) {
                curve.value.splice(fillArr[i], 0, NaN);
            }

            cb && cb(curve);
            // done();
        // }, function (err) {
        //     cb && cb(curvesArray);
        // });
    }

    function filterNull(curves) {
        // let WELL = [];
        let l = curves.length;
        let filterCurves = [];
        let fillNull = [];
        for (let j = 0; j < l; j++) {
            filterCurves[j] = [];
        }
        for (let i = 0; i < curves[0].length; i++) {
            let notNull = true;
            for (let j = 0; j < l; j++)
                if (isNaN(curves[j][i])) {
                    fillNull.push(i);
                    notNull = false;
                    break;
                }
            if (notNull)
                for (let j = 0; j < l; j++) {
                    // if (j == 0) WELL.push(well[i]);
                    filterCurves[j].push(curves[j][i]);
                }
        }
        return {
            filterCurves: filterCurves,
            fillNull: fillNull,
            // well: WELL
        };
    }

    async function getDataCurves(dataset, curves, callback) {
    	let listInputCurves = [];

    	if(curves.length) {
    		for(let i = 0; i < curves.length; i++) {
    			let curve = dataset.curves.find(c => {
    				return c.name === curves[i].value.name;
    			})
    			if(!curve) callback([]);
    			let curveData = await wiApi.getCurveDataPromise(curve.idCurve);
    			listInputCurves[i] = curveData.map(function (d) {
                    return parseFloat(d.x);
                });
    		}
    		callback && callback(listInputCurves);
    	}else {
    		callback && callback([]);
    	}
    }	

    async function doAfterTrain(dataset) {
    	if(self.model && self.model['som-visualization']) {
			$http({
				method: 'GET',
				url: `${self.model.url}/api/model/som/${self.model_id}`,
			})
			.then((res) => {
				console.log(res);
				if(res.status === 201) {
					$timeout(() => {
						self.showSomVisualize = true;
		    			self.somVisualize = res.data;
		    		})
				}
			})
		}else {
			$timeout(() => {
				self.showSomVisualize = false;
    		})
		}
    }
    // ============================================================================
    this.getDistributionMaps = function (data) {
			return data.distributionMaps;
		}

		this.getDistributionMapHeader = function (distributionMap) {
			return distributionMap.header;
		}

		this.getDistributionMapRows = function (distributionMap) {
			return distributionMap.rows;
		}

		this.getDistributionMapCells = function (row) {
			return row.cells;
		}

		this.getDistributionMapWeight = function (cell) {
			return cell.weight;
		}

		this.getDistributionMapScaledWeight = function (cell) {
			return cell.scaledWeight;
		}

		this.getDistributionMapLabel = function (cell) {
			return cell.label;
		}

		this.distributionMapClickFn = function (event, cell) {
			console.log(cell);
		}

		this.distributionMapColors = ["#FFFFDD", "#AAF191", "#80D385", "#61B385", "#3E9583", "#217681", "#285285", "#1F2D86", "#000086"];
		this.distributionMapColorRange = d3.range(0, 1, 1.0 / (this.distributionMapColors.length - 1));
		this.distributionMapColorRange.push(1);

		this.getDistributionMapColors = function () {
			return self.distributionMapColors;
		}

		this.distributionMapColorScale = d3.scaleLinear()
		.domain(this.distributionMapColorRange)
		.range(this.distributionMapColors)

		// Visualization map function
		this.getVisualizationMap = function (data) {
			return data.visualizationMap;
		}

		this.getVisualizationMapCells = function (row) {
			return row.cells;
		}

		this.getVisualizationMapFeatures = function (cell) {
			return cell.features;
		}

		this.getVisualizationMapLabel = function (cell) {
			return cell.label;
		}

		this.getVisualizationMapLabels = function (data) {
			let labels = [];
			for (i = 0; i < data.visualizationMap.length; i++) {
				cells = data.visualizationMap[i].cells;
				for (j = 0; j < cells.length; j++) {
					label = cells[j].label;
					if (!labels.includes(label)) {
						labels.push(label)
					}
				}
			}
			return labels;
		}

		this.getVisualizationMapFeatureWeight = function (feature) {
			return feature.weight;
		}

		this.getVisualizationMapFeatureScaledWeight = function (feature) {
			return feature.scaledWeight;
		}

		this.getVisualizationMapFeatureNames = function (data) {
			let featureHeaders = []
			data.visualizationMap[0].cells[0].features.forEach(feature => {
				featureHeaders.push(feature.header);
			});
			return featureHeaders;
		}

		this.getVisualizationMapFeatureName = function (feature) {
			return feature.header;
		}

		this.visualizationMapClickFn = function (event, cell) {
			console.log(cell);
		}

		this.visualizationMapLabelColors = [
		"rgba(255,0,0,0.6)",
		"rgba(0,255,0,0.6)",
		"rgba(0,0,255,0.6)",
		"rgba(255,255,0,0.6)",
		"rgba(0,255,255,0.6)",
		"violet",
		"springgreen"
		]

		this.visualizationMapFeatureColors = [
		'red', 'green', 'blue', 'yellow'
		]

		this.getFittedModel = async function () {
			if(self.model['som-visualization']) {
	    		$http({
		    		method: 'GET',
		    		url: `${self.model.url}/api/model/som/${self.model_id}`,
		    	})
		    	.then((res) => {
		    		console.log(res);
		    		if(res.status === 201) {
		    			$timeout(() => {
			    			self.somVisualize = res.data;
			    		})
		    		}
		    	});
	    	}
		}
}