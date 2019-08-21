const moduleName = "machineTabs";
const componentName = "machineTabs";
module.exports.name = moduleName;

var app = angular.module(moduleName, ['modelSelection','datasetSelection','trainingPrediction','wiApi','wiNeuralNetwork']);

app.component(componentName,{
	template: require('./newtemplate.html'),
    controller: MachineTabsController,
    style: require('./newstyle.less'),
    controllerAs: 'self',
    bindings: {
    	token: '<',
    	idProject: '<'
    }
});

function MachineTabsController($scope, $timeout, wiToken, wiApi, $http){
	const REMOVE = 0;
	const ADD = 1;
	let self = 	this;
    this.showSomVisualize = false;
    this.showDialogOpenMlProject = false;
    this.currentSelectMlProject = null;
    self.mlProjectSelected = null;
    this.openDialogMlProject = async function() {
        self.listMlProject = await wiApi.getMlProjectListPromise();
        self.listMlProject = self.listMlProject.map(i => {
            return {
                data: {
                    label: i.name
                },
                properties: i
            }
        })
        console.log(self.listMlProject);
        self.showDialogOpenMlProject = true;

    }
    this.onItemMlProjectChange = function(itemProps) {
        self.currentSelectMlProject = itemProps.name;
        self.mlProjectSelected = itemProps;
    }
    this.clickButtonOpen = async function() {
        self.showDialogOpenMlProject = false;
        if(self.mlProjectSelected) {
            self.currentSelectModel = {};
            self.machineLearnSteps = {
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
            self.dataStepsForTrainPredict = angular.copy(self.machineLearnSteps);
            let content = self.mlProjectSelected.content;
            for(let i in content.steps) {
                for(let j in content.steps[i].datasets) {
                    let dataset = await wiApi.getDatasetInfoPromise(content.steps[i].datasets[j].idDataset);
                    let valueDataset = angular.copy(dataset);
                        if (self.equals(self.machineLearnSteps[i].datasets, valueDataset) < 0 && valueDataset.idDataset && valueDataset.idWell) {
                            self.machineLearnSteps[i].datasets = _.concat(self.machineLearnSteps[i].datasets, valueDataset);
                            if(i == 'training') {
                                self.mergeCurves.push(valueDataset.curves);
                            }
                        }
                    let valueDatasetTrainPredict = angular.copy(dataset);
                    let cacheDataset = content.steps[i].datasets.find(d => {
                        return valueDatasetTrainPredict.idDataset === d.idDataset;
                    })
                    if(cacheDataset) {
                        valueDatasetTrainPredict.inputCurveSpecs = cacheDataset.inputCurveSpecs;
                        valueDatasetTrainPredict.resultCurveName = cacheDataset.resultCurveName;
                        valueDatasetTrainPredict.patternCurveName = '_' + i.toUpperCase();
                        valueDatasetTrainPredict.active = cacheDataset.active || true;
                        self.dataStepsForTrainPredict[i].datasets.push(valueDatasetTrainPredict)
                    }
                }
            }
            self.makeSelectionList();
            $timeout(() => {
                self.inputCurveSpecs = content.inputCurveSpecs;
                self.targetCurveSpec = content.targetCurveSpec;
                self.currentSelectModel = {
                                            name: content.model.name,
                                            payload: content.model.payload,
                                            sync: false
                                        };
                self.stateWorkflow = content.stateWorkflow || {
                                                                state : -1, // -1 is nothing 0 was train 1 was verify, predict
                                                                waitResult: false,
                                                                model_id: null,
                                                                bucket_id: null
                                                            };
                if(self.stateWorkflow.model_id && content.model.name === 'Supervise Som') {
                    $http({
                        method: 'GET',
                        url: `${content.model.url}/api/model/som/${self.stateWorkflow.model_id}`,
                    })
                    .then((res) => {
                        console.log(res);
                        if(res.status === 201) {
                            $timeout(() => {
                                self.dataSomVisualize = res.data;     
                                self.showSomVisualize = true;                           
                            })
                        }
                    });
                }
            });

        }
        
    }
    function saveWorkflow() {
        let steps = angular.copy(self.dataStepsForTrainPredict);
        for(let i in steps) {
            steps[i].datasets = steps[i].datasets.map(d => {
                return {
                    inputCurveSpecs: d.inputCurveSpecs,
                    idDataset: d.idDataset,
                    name: d.name,
                    resultCurveName: d.resultCurveName,
                    active: d.active
                }
            })
        }
        let model = {
            name: angular.copy(self.selectedModelProps.name),
            payload: angular.copy(self.selectedModelProps.properties.payload),
            url: self.selectedModelProps.properties.url
        }
        let inputCurveSpecs = self.inputCurveSpecs.map(i => {
            return i
        })
        let targetCurveSpec = self.targetCurveSpec;
        self.workflow = {
            inputCurveSpecs: inputCurveSpecs,
            targetCurveSpec: targetCurveSpec,
            model: model,
            stateWorkflow: self.stateWorkflow,
            steps: steps
        }
    }
    this.clickButtonSave = function(name) {
        console.log('save workflow', name);
        self.showDialogSaveMlProject = false;
        saveWorkflow();
        wiApi.createMlProjectPromise({
            name: name,
            content: self.workflow
        })
        .then((mlProject) => {
            if(!mlProject) return console.error(new Error("Don't create Ml Project"))
            self.mlProjectSelected = mlProject;
            self.currentSelectMlProject = mlProject.name;
        });
    }
    this.openDialogSaveMlProject = function() { 
        if(self.mlProjectSelected) {
            saveWorkflow();
            wiApi.editMlProjectPromise({
                name: self.mlProjectSelected.name,
                idMlProject: self.mlProjectSelected.idMlProject,
                content: self.workflow
            })
        }else {
            self.showDialogSaveMlProject = true;
        }
    }
	this.model;
	this.selectedModelProps = {};
	this.current_tab = 0 ;
	this.titleTabs = ['Dataset Selection','Model Selection','Training and Prediction'];
	this.steps = ['training','prediction','verify'];
	$scope.changeTab = function(index) {
        if ( index === 'back' ) {
            if ( self.current_tab === 0){
                return;
            } else {
                self.current_tab = self.current_tab - 1;
                return;
            }
        } else if ( index === 'next' ) {
            if ( self.current_tab === 2){
                return;
            } else {
                self.current_tab = self.current_tab + 1;
                return;
            }
        } else {
            self.current_tab = index;
        }
	}
	$scope.isActive = function(index) {
		return self.current_tab === index;
	}
	this.typeSelected = 'curve';
	this.$onInit = async function() {
        self.currentSelectModel = {};
        self.dataSomVisualize = {
            distributionMaps: [{
                "header": "feature_0",
                'row': [{"cells": []}]
            }],
            visualizationMap: [{"cells": [{
                    "features": [],
                    "label": null
                }]}]
        }
        self.machineLearnSteps = {
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
        self.dataStepsForTrainPredict = angular.copy(self.machineLearnSteps);
        self.stateWorkflow = {
            state : -1, // -1 is nothing 0 was train 1 was verify, predict
            waitResult: false,
            model_id: null,
            bucket_id: null
        }
		// self.dataStepsForTrainPredict = angular.copy(self.machineLearnSteps);
		if(self.token && self.token.length) window.localStorage.setItem('token',self.token);
	}
    this.setModelId = function(modelId) {
        self.stateWorkflow.model_id = modelId;
    }
    this.setBucketId = function(bucketId) {
        self.stateWorkflow.bucket_id = bucketId;
    }
	this.setDataModels = function(data) {
		self.model = data;
	}
	this.setItemSelected = function(selectedModelProps) {
        if(!self.currentSelectModel.sync && self.currentSelectModel.name) {
            self.selectedModelProps = selectedModelProps;
            self.selectedModelProps.properties.payload = self.currentSelectModel.payload;
            self.currentSelectModel.sync = true;
        }else{
            self.selectedModelProps = selectedModelProps;
        }
        // console.log('asdasdas', self.selectedModelProps)
	}
    this.nnConfig = { inputs: [], outputs: [], layers: [], container: {}, nLayer: 2, layerConfig: [{label: 'label 0', value: 10}, {label: 'label 1', value: 10}] };
    function updateNNConfig() {
        self.nnConfig.inputs = self.inputCurveSpecs.map(i => {
                                        return {
                                                label: i.currentSelect,  
                                                name: i.currentSelect, 
                                                value : i.currentSelect,
                                                class: 'Input Curve',
                                                type: "1"
                                            }
                                    });
        self.nnConfig.outputs = [{
                                    label: self.targetCurveSpec.currentSelect,
                                    name: self.targetCurveSpec.currentSelect, 
                                    value: self.targetCurveSpec.currentSelect,
                                    class: 'Target output',
                                    type: "1"
                                }]
        self.nnConfig.layers = self.nnConfig.layerConfig.map(i => i.value);
        $timeout(function () {
            if(self.nnConfig.container.wiNNCtrl) {
                self.nnConfig.container.wiNNCtrl.update(self.nnConfig);                
            }
        });
        console.log(self.nnConfig, self.selectedModelProps);
    }   
    this.updateNNConfig = _.debounce(updateNNConfig);
    setInterval(self.updateNNConfig(), 1000);
    this.nnConfigNLayerChanged = function(nLayer) {
        self.nnConfig.nLayer = nLayer;
        let params = self.selectedModelProps.properties.payload.params;
        let layer = (params || []).find(i => {
            return i.name === 'hidden_layer_sizes';
        })
        if(self.nnConfig.nLayer < self.nnConfig.layerConfig.length) {
            layer.value.splice(self.nnConfig.nLayer, self.nnConfig.layerConfig.length - self.nnConfig.nLayer);
            self.nnConfig.layerConfig.splice(self.nnConfig.nLayer, self.nnConfig.layerConfig.length - self.nnConfig.nLayer);
        }else {
            let oldLength = self.nnConfig.layerConfig.length;
            for (let i = 0; i < self.nnConfig.nLayer - oldLength; i++) {
                self.nnConfig.layerConfig.push({
                    label: "Layer " + (oldLength + i),
                    value: 10
                });
                layer.value.push(10);
            }
        }
        self.updateNNConfig();
    }
    this.layerChange = function(index, value) {
        // layer.value = value;
        let params = self.selectedModelProps.properties.payload.params;
        let layer = (params || []).find(i => {
            return i.name === 'hidden_layer_sizes';
        })
        self.nnConfig.layerConfig[index].value = value;
        layer.value[index] = value;
        self.updateNNConfig();
    }
    this.updateLayer = function() {
        if(self.selectedModelProps.properties && self.selectedModelProps.properties.nnnw  ) {
            let params = self.selectedModelProps.properties.payload.params;
            let layer = (params || []).find(i => {
                return i.name === 'hidden_layer_sizes';
            })
            if(layer) {
                self.nnConfig.nLayer = layer.example.length;
                self.nnConfig.layerConfig = layer.example.map((i, idx) => {
                    return {label:'label ' + idx, value: i}
                })
            }
        } 
        self.updateNNConfig();
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
	function handleSelectionList(dataStep, step, index = -1, type = null) {
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
		// console.log(curves);
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
							// console.log(curve);
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
					if(!dataset.inputCurveSpecs[i]) {
                        dataset.inputCurveSpecs[i] = {
    			            label: 'Input Curve',
    			            value: null,
    			            currentSelect: '[no choose]'
                        }
                    }else {
                        let input = dataStep.selectionList[i].find(d => {
                            return dataset.inputCurveSpecs[i].currentSelect === d.data.label;
                        });
                        if(!input) {
                            dataset.inputCurveSpecs[i] = {
                                label: 'Input Curve',
                                value: null,
                                currentSelect: '[no choose]'
                            }
                            dataset.resultCurveName = dataset.patternCurveName;
                        } 
                    }
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
        },
        verify: {
            status: true,
            drop: null,
        },
        prediction: {
            status: true,
            drop: null,
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
    this.addInputCurve = function() {
    	console.log('add');
    	self.indexInputCurve = self.inputCurveSpecs.length - 1;
    	self.formatCurve = ADD;
        self.inputCurveSpecs.push({
            label: 'Input Curve',
            value: null,
            currentSelect: '[no choose]'
        });
        // for(let i in self.machineLearnSteps) {
        // 	self.handleDrop(i,self.inputCurveSpecs.length - 1, ADD);
        // }
        let handle = _.debounce(() => {
            for(let i in self.machineLearnSteps) {
             self.handleDrop(i,self.inputCurveSpecs.length - 1, ADD);
            }  
        }, 500);
        handle()
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
                let handle = _.debounce(() => {
                    for(let i in self.machineLearnSteps) {
                     self.handleDrop(i);
                    }  
                }, 500);
                handle()
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
        let handle = _.debounce(() => {
            for(let i in self.machineLearnSteps) {
             self.handleDrop(i);
            }  
        }, 500);
        handle()
    }
    this.removeInputCurve = function($index) {
    	self.indexInputCurve = $index;
    	self.formatCurve = REMOVE;
        if(self.inputCurveSpecs.length > 1){
            self.inputCurveSpecs.splice($index,1);
        }
        let handle = _.debounce(() => {
            for(let i in self.machineLearnSteps) {
             self.handleDrop(i,$index, REMOVE);
            }  
        }, 500);
        handle()
        // for(let i in self.machineLearnSteps) {
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
        for(let i in self.machineLearnSteps) {
        	self.handleDrop(i);
        }
    }
    this.drop = function(step) {
        if(!functionCacheSteps[step].drop) {
            functionCacheSteps[step].drop = function(event,helper,datasets) {
                $timeout(()=>{ 
                    for(let node of datasets) {
                    	let valueDataset = angular.copy(node);
                        if (self.equals(self.machineLearnSteps[step].datasets,valueDataset) < 0 && valueDataset.idDataset && valueDataset.idWell) {
                            // self.machineLearnSteps[step].datasets.push(valueDataset);
                            self.machineLearnSteps[step].datasets = _.concat(self.machineLearnSteps[step].datasets, valueDataset);
                            if(step == 'training') {
                                self.mergeCurves.push(valueDataset.curves);
                            }
                        }
                    }
                    self.makeSelectionList();
                    var handle = _.debounce(() => {self.handleDrop(step)}, 1000);  
                    handle();
                    // self.handleDrop(step);
                })
            }
        }
        return functionCacheSteps[step].drop;
    }
    this.removeDataset = function(step, $index) {
        $timeout(() => {
            self.machineLearnSteps[step].datasets = _.remove(self.machineLearnSteps[step].datasets, (dataset,index)=>{
                if(step == 'training') {
                    if(index === $index) {
                        self.mergeCurves.splice(index,1);
                    }
                }
                return index !== $index;
            });
            self.makeSelectionList();
            self.handleDrop(step);
        });
    }
    this.equals = function(arrayData, data){
        for(let i in arrayData) {
            if(arrayData[i].idDataset == data.idDataset) return i;
        }
        return -1;
    }
    this.handleDrop = function(step,index = -1,type = null) {
    	let datasetSource = Object.assign([],self.machineLearnSteps[step].datasets);
    	let datasetDestination = Object.assign([],self.dataStepsForTrainPredict[step].datasets);
    	let ds = _.intersectionBy(datasetDestination, datasetSource, 'idDataset');
    	let ds1 = _.pullAllBy(datasetSource, ds, 'idDataset');
    	for(let i in ds1) {
            if(step != 'training') {
                ds1[i].resultCurveName = ds1[i].patternCurveName = '_' + step.toUpperCase();
            }
            ds1[i].active = true;
    		ds1[i]._selected = false;
    	}
    	self.dataStepsForTrainPredict[step].datasets = [...ds,...ds1];
    	handleSelectionList(self.dataStepsForTrainPredict[step],step ,index,type);
        self.updateNNConfig();
    }
}