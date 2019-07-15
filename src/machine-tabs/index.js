const moduleName = "machineTabs";
const componentName = "machineTabs";
module.exports.name = moduleName;

var app = angular.module(moduleName, ['modelSelection','datasetSelection','trainingPrediction','wiApi']);

app.component(componentName,{
	template: require('./template.html'),
    controller: MachineTabsController,
    style: require('./style.less'),
    controllerAs: 'self',
    bindings: {
    	token: '<',
    	idProject: '<'
    }
});

function MachineTabsController($scope, $timeout, wiToken, wiApi){
	const REMOVE = 0;
	const ADD = 1;
	let self = 	this;
	this.modelDatas = [];
	this.selectedModelProps = {};
	this.current_tab = 0 ;
	this.titleTabs = ['Dataset Selection','Model Selection','Training and Prediction'];
	this.steps = ['training','prediction','verify'];
	$scope.changeTab = function(index) {
		self.current_tab = index;
	}
	$scope.isActive = function(index) {
		return self.current_tab === index;
	}
	this.typeSelected = 'curve';
	this.$onInit = function() {
		self.dataSteps = {
				training: {
					datasets: [],
					selectionList: [],
					// inputCurveSpecs: [],
					target: true,
					name: 'Train',
					index: 0
				},
				verify: {
					datasets: [],
					selectionList: [],
					// inputCurveSpecs: [],
					target: true,
					name: 'Verify',
					index: 1
				},
				prediction: {
					datasets: [],
					selectionList: [],
					// inputCurveSpecs: [],
					target: false,
					name: 'Predict',
					index: 2
				}
		};
		self.dataStepsForTrainPredict = angular.copy(self.dataSteps);
		if(self.token && self.token.length) window.localStorage.setItem('token',self.token);
		$scope.$watch(function() {
			return JSON.stringify(self.inputCurveSpecs) + JSON.stringify(self.targetCurveSpec);
		},function() {
			// console.log('watch');
			for(let i in self.dataSteps) {
	        	self.handleDrop(i,self.indexInputCurve, self.formatCurve);
	        }
	        self.indexInputCurve = -1;
	        self.formatCurve = null;
		})
	}
	
	this.setDataModels = function(datas) {
		console.log(datas);
		self.modelDatas = datas;
	}
	this.setItemSelected = function(selectedModelProps) {
		self.selectedModelProps = selectedModelProps;
        // console.log(self.selectedModelProps);
	}
	this.inputCurveSpecs = [
		{
			label: 'Input Curve',
	        value: null,
	        currentSelect: '[no choose]'
	    },
	    {
	        label: 'Input Curve',
	        value: null,
	        currentSelect: '[no choose]'
    }];
    this.targetCurveSpec = {
        label: 'Target Curve',
        value: null,
        currentSelect: '[no choose]'
    };
	function handleSelectionList(dataStep,step,index = -1,type = null) {
		let inputSpecs = [...self.inputCurveSpecs,self.targetCurveSpec];
		let mergeCurves = [];
		for(let dataset of dataStep.datasets) {
			if(!dataset.inputCurveSpecs) {
				if(dataStep.target) {
					dataset.inputCurveSpecs = new Array(self.inputCurveSpecs.length + 1);
				}else {
					dataset.inputCurveSpecs = new Array(self.inputCurveSpecs.length);
				}
			} 
			if(index != -1 && type == ADD) {
				if(dataStep.target) {
					dataset.inputCurveSpecs.splice(index,0,{
			            label: 'Input Curve',
			            value: null,
			            currentSelect: '[no choose]'
			        });
				}else {
					dataset.inputCurveSpecs.splice(index,0,{
			            label: 'Input Curve',
			            value: null,
			            currentSelect: '[no choose]'
			        });
				}
			}
			if(index != -1 && type == REMOVE) {
				if(dataStep.target) {
					dataset.inputCurveSpecs.splice(index,1);
				}else {
					dataset.inputCurveSpecs.splice(index,1);
				}
			}
			mergeCurves.push(dataset.curves);
		}
		let curves = _.intersectionBy(...mergeCurves,'name');
		if(dataStep.target) {
			dataStep.selectionList = new Array(self.inputCurveSpecs.length + 1);
		}else {
			dataStep.selectionList = new Array(self.inputCurveSpecs.length);
		}
		console.log(curves);
		if (step === 'training' && self.typeSelected === 'curve') {
			for(let i = 0; i < dataStep.selectionList.length; i++) {
				if(!dataStep.selectionList[i]) dataStep.selectionList[i] = [];
				dataStep.selectionList[i] = [{
					data: {
						label: inputSpecs[i].currentSelect
					},
					properties: inputSpecs[i].value
				}];
			}
		}else if(curves && curves.length) {
			 for(let curve of curves) {
			 	let dataInformation = { 	
	                data: {
	                    label: curve.name
	                },
	                properties: {
	                    idFamily: curve.idFamily,
	                    type: curve.type,
	                    unit: curve.unit,
	                    name: curve.name
	                },
	                icon: 'curve-16x16'
	            }
	            switch(self.typeSelected) {
	    			case 'curve': 
    					for(let i = 0; i < dataStep.selectionList.length; i++) {
    						if(!dataStep.selectionList[i]) dataStep.selectionList[i] = [{
    							data: {
									label: '[no choose]'
								},
								properties: null
    						}];
    						dataStep.selectionList[i].push(dataInformation);
    					}
	    			break;
	    			case 'family_curve':
		    			for(let i = 0; i < dataStep.selectionList.length; i++) {
							if(!dataStep.selectionList[i]) dataStep.selectionList[i] = [{
								data: {
									label: '[no choose]'
								},
								properties: null
							}];
							console.log(curve);
							if((curve.idFamily == (inputSpecs[i].value || {}).idFamily )&& curve.idFamily ) dataStep.selectionList[i].push(dataInformation);
						}
	    			break;
	    			case 'main_family':
	    				(async() => {
	    					try{
	    						let mainFamily = await wiApi.getFamily(curve.idFamily);
	    						if(mainFamily) {
	    							for(let i = 0; i < dataStep.selectionList.length; i++) {
										if(!dataStep.selectionList[i]) dataStep.selectionList[i] = [{
											data: {
												label: '[no choose]'
											},
											properties: null
										}];
										if(mainFamily.familyGroup == (inputSpecs[i].value || {}).familyGroup  ) dataStep.selectionList[i].push(dataInformation);
									}	
	    						}
	    					}catch(e) {
	    						console.log(e);
	    					}
	    				})();
	    			break;
	    		}
			}
		}else {
			for(let i = 0; i < dataStep.selectionList.length; i++) {
				if(!dataStep.selectionList[i]) dataStep.selectionList[i] = [{
					data: {
						label: '[no choose]'
					},
					properties: null
				}];
			}
		}
		// dataStep.selectionList = _.uniqBy(dataStep.selectionList,'data.label');
		for(let dataset of dataStep.datasets) {
			if(step === 'training' && self.typeSelected === 'curve') {
				dataset.inputCurveSpecs = angular.copy(inputSpecs);
			}else {
				for(let i = 0; i < dataset.inputCurveSpecs.length; i++) {
					if(!dataset.inputCurveSpecs[i]) dataset.inputCurveSpecs[i] = {
			            label: 'Input Curve',
			            value: null,
			            currentSelect: '[no choose]'
			        };
				}	
			}
		}
		// console.log(dataStep);
	}
 	let functionCache = [];
    let functionCacheSteps = {
        training: {
            status: true,
            drop: null,
            out: null,
            over: null,
            deactivate: null,
        },
        verify: {
            status: true,
            drop: null,
            out: null,
            over: null,
            deactivate: null,
        },
        prediction: {
            status: true,
            drop: null,
            out: null,
            over: null,
            deactivate: null,
        },
    }
    this.mergeCurves = [];
    this.selectionList = [{
        data: {
            label: '[no choose]'
        },
        properties: null
    }];
    this.makeSelectionList = function() {
    	// console.log('make',self.inputCurveSpecs);
        var curves = _.intersectionBy(...self.mergeCurves,'name');
        let selectionList = [{
            data: {
                label: '[no choose]'
            },
            properties: null
        }];
        // self.selectionList = [{
        //     data: {
        //         label: '[no choose]'
        //     },
        //     properties: null
        // }];
        // console.log(self.typeSelected);
        switch(self.typeSelected) {
            case 'family_curve': 
            	console.log('run');
                (async()=> {
                    for(let curve of curves) {
                        let familyCurve = await wiApi.getFamily(curve.idFamily);
                        if(!familyCurve) break;
                        let dataInformation = {
                            data: {
                                label : familyCurve.name 
                            },
                            properties: {
                                family_spec: familyCurve.familyCurve,
                                name: familyCurve.name,
                                idFamily: familyCurve.idFamily
                            },
                            icon: 'family-16x16'
                        }
                        selectionList.push(dataInformation);
                    }
                    selectionList = _.uniqBy(selectionList,'data.label');
                    self.selectionList = angular.copy(selectionList);  
                })();
                break;
            case 'main_family': 
                (async()=> {
                    let familyGroups = [];
                    for(let curve of curves) {
                        let familyCurve = await wiApi.getFamily(curve.idFamily);
                        if(!familyCurve) break;

                        let dataInformation = {
                            data: {
                                label : familyCurve.familyGroup
                            },
                            properties: {
                                familyGroup: familyCurve.familyGroup,
                                name: familyCurve.familyGroup
                            },
                            icon: 'family-group-16x16'
                        }
                        selectionList.push(dataInformation);
                    }
                    selectionList = _.uniqBy(selectionList,'data.label');
                    self.selectionList = angular.copy(selectionList);  
                })();    
                break;
            default: 
	            for(let curve of curves ) {
	                let dataInformation = {
	                    data: {
	                        label: curve.name
	                    },
	                    properties: {
	                        idFamily: curve.idFamily,
	                        type: curve.type,
	                        unit: curve.unit,
	                        name: curve.name
	                    },
	                    icon: 'curve-16x16'
	                }
	            	selectionList.push(dataInformation);
			}
			self.selectionList = angular.copy(selectionList);  
        }  
    }
    this.addCurveInput = function() {
    	console.log('add');
    	self.indexInputCurve = self.inputCurveSpecs.length - 1;
    	self.formatCurve = ADD;
        self.inputCurveSpecs.push({
            label: 'Input Curve',
            value: null,
            currentSelect: '[no choose]'
        });
        // for(let i in self.dataSteps) {
        // 	self.handleDrop(i,self.inputCurveSpecs.length - 1, ADD);
        // }
    }
    this.getOnItemChanged = function($index) {
        if (!functionCache[$index])
            functionCache[$index] = function(selectedItemProps) {
            	// console.log(selectedItemProps);
                self.inputCurveSpecs[$index].value = selectedItemProps;
                if(selectedItemProps){
                    self.inputCurveSpecs[$index].currentSelect = selectedItemProps.name;
                }
                else {
                    self.inputCurveSpecs[$index].currentSelect = '[no choose]';
                }
                // for(let i in self.dataSteps) {
                // 	self.handleDrop(i);
                // }
            }
        return functionCache[$index];
    }
    this.onTargetItemChanged = function(selectedItemProps){
        self.targetCurveSpec.value = selectedItemProps;
        if(selectedItemProps){
            self.targetCurveSpec.currentSelect = selectedItemProps.name;
        }else {
            self.targetCurveSpec.currentSelect = '[no choose]';
        }
    }
    this.removeDataSelectionList = function($index) {
    	self.indexInputCurve = $index;
    	self.formatCurve = REMOVE;
        if(self.inputCurveSpecs.length > 1){
            self.inputCurveSpecs.splice($index,1);
        }
        // for(let i in self.dataSteps) {
        // 	self.handleDrop(i,$index, REMOVE);
        // }
    }
    this.changeType = function(button) {
        self.typeSelected = button.type;
        for(let index in self.inputCurveSpecs) {
            self.inputCurveSpecs[index]= {
                label: 'Input Curve',
                value: null,
                currentSelect: '[no choose]'
            }
        }
        self.targetCurveSpec = {
                label: 'Target Curve',
                value: null,
                currentSelect: '[no choose]'
            }
        self.makeSelectionList();
        for(let i in self.dataSteps) {
        	self.handleDrop(i);
        }
    }
    this.drop = function(step) {
        if(!functionCacheSteps[step].drop) {
            functionCacheSteps[step].drop = function(event,helper,datasets) {
                $timeout(()=>{
                    // datasets.forEach(node => {
                    //     let valueDataset = angular.copy(node);
                    //     if (self.equals(self.dataSteps[step].datasets,valueDataset) < 0 && valueDataset.idDataset && valueDataset.idWell) {
                    //         self.dataSteps[step].datasets.push(valueDataset);
                    //         if(step == 'training') {
                    //             self.mergeCurves.push(valueDataset.curves);
                    //             self.makeSelectionList();   
                    //         }
                    //     }
                    //     self.handleDrop(step);
                    // })    
                    for(let node of datasets) {
                    	let valueDataset = angular.copy(node);
                        if (self.equals(self.dataSteps[step].datasets,valueDataset) < 0 && valueDataset.idDataset && valueDataset.idWell) {
                            self.dataSteps[step].datasets.push(valueDataset);
                            if(step == 'training') {
                                self.mergeCurves.push(valueDataset.curves);
                                self.makeSelectionList();   
                            }
                        }
                    }
                    self.handleDrop(step);
                })
            }
        }
        return functionCacheSteps[step].drop;
    }
    this.out = function(step) {
        if(!functionCacheSteps[step].out) {
            functionCacheSteps[step].out = function(event,helper,datasets) {
                // functionCacheSteps[step].status = !functionCacheSteps[step].status;
                functionCacheSteps[step].status = false;
            }
        }
        return functionCacheSteps[step].out;
    }
    this.over = function(step) {
        if(!functionCacheSteps[step].over) {
            functionCacheSteps[step].over = function(event,helper,datasets) {
                // functionCacheSteps[step].status = !functionCacheSteps[step].status;
                functionCacheSteps[step].status = true;
            }
        }
        return functionCacheSteps[step].over;
    }
    this.deactivate = function(step) {
        if(!functionCacheSteps[step].deactivate) {
            functionCacheSteps[step].deactivate = function(event,helper,datasets) {
                if(!functionCacheSteps[step].status) {
                    $timeout(()=>{
                        // datasets.forEach(datasetRemove =>{
                        //     self.dataSteps[step].datasets = _.remove(self.dataSteps[step].datasets,(dataset,index)=>{
                        //         if(step == 'training') {
                        //             if(dataset.$$hashKey === datasetRemove.$$hashKey) {
                        //                 self.mergeCurves.splice(index,1);
                        //                 self.makeSelectionList();
                        //             }
                        //         }
                        //         return dataset.$$hashKey !== datasetRemove.$$hashKey;
                        //     });
                        //     self.handleDrop(step);
                        // })
                        for(let datasetRemove of datasets) {
                        	 self.dataSteps[step].datasets = _.remove(self.dataSteps[step].datasets,(dataset,index)=>{
                                if(step == 'training') {
                                    if(dataset.$$hashKey === datasetRemove.$$hashKey) {
                                        self.mergeCurves.splice(index,1);
                                        self.makeSelectionList();
                                    }
                                }
                                return dataset.$$hashKey !== datasetRemove.$$hashKey;
                            });
                        }
                        self.handleDrop(step);
                        functionCacheSteps[step].status = !functionCacheSteps[step].status;
                    })   
                }
            }
        }
        return functionCacheSteps[step].deactivate;
    }
    this.equals = function(arrayData, data){
        for(let i in arrayData) {
            if(arrayData[i].idDataset == data.idDataset) return i;
        }
        return -1;
    }
    this.handleDrop = function(step,index = -1,type = null) {
    	let datasetSource = Object.assign([],self.dataSteps[step].datasets);
    	let datasetDestination = Object.assign([],self.dataStepsForTrainPredict[step].datasets);
    	let ds = _.intersectionBy(datasetDestination, datasetSource, 'idDataset');
    	let ds1 = _.pullAllBy(datasetSource, ds, 'idDataset');
    	for(let i in ds1) {
    		ds1[i].active = true;
    	}
    	self.dataStepsForTrainPredict[step].datasets = [...ds,...ds1];
    	handleSelectionList(self.dataStepsForTrainPredict[step],step ,index,type);
    }
}