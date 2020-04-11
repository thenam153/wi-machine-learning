const moduleName = "machineTabs";
const componentName = "machineTabs";
module.exports.name = moduleName;
const queryString = require('query-string')
// var config = require('../config/config').default;
// if (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'development') {
//     config = require('../config/config').development
// } else if (process.env.NODE_ENV === 'prod' || process.env.NODE_ENV === 'production') {
//     config = require('../config/config').production
// }
var config = require('../config/config').production;
var app = angular.module(moduleName, ['modelSelection',
    'datasetSelection',
    'trainingPrediction',
    'mlService',
    'wiApi',
    'wiNeuralNetwork',
    'wiLogin',
    'wiToken',
    'wiDialog',
    'wiDiscriminator',
    'ngDialog',
    'somModelService',
    'heatMap',
    'wiDropdownListNew'
]);
app.component(componentName, {
    template: require('./newtemplate.html'),
    controller: MachineTabsController,
    style: require('./newstyle.less'),
    controllerAs: 'self',
    bindings: {
        token: '<'
    }
});
MachineTabsController.$inject = ['$scope', '$timeout', 'wiToken', 'wiApi', '$http', 'wiDialog', 'ngDialog','mlService']

const LINEAR = 'linear';
const LOGA = 'logarithmic';
const EXPO = 'exponential';
const LABEL_DEFAULT = '[Not Selected]';
const TAB_DATASET =  'Dataset Selection';
const TAB_MODEL =  'Model Selection';
const TAB_TRAIN =  'Training and Prediction';
const STEP_TRAIN = 'training';
const STEP_VERIFY = 'verify';
const STEP_PREDICT = 'prediction';
const CURVE = 'curve';
const FAMILY_CURVE = 'family_curve';
const FAMILY_GROUP = 'main_family';
const REMOVE = 0;
const ADD = 1;  

function MachineTabsController($scope, $timeout, wiToken, wiApi, $http, wiDialog, ngDialog, mlService) {
    $scope.isActive = function(index) {
        return self.current_tab === index;
    }
    $scope.changeTab = function(index) {
        if (index === 'back') {
            if (self.current_tab === 0) {
                return;
            } else {
                self.current_tab = self.current_tab - 1;
                return;
            }
        } else if (index === 'next') {
            if (self.current_tab === 2) {
                return;
            } else {
                self.current_tab = self.current_tab + 1;
                return;
            }
        } else {
            self.current_tab = index;
        }
    }
    let self = this;
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
    this.titleTabs = [TAB_DATASET, TAB_MODEL, TAB_TRAIN];
    this.steps = [STEP_TRAIN, STEP_VERIFY, STEP_PREDICT];
    this.$onInit = async function() {
        wiApi.setBaseUrl(config.base_url);
        self.loginUrl = config.login;
        self.queryString = queryString.parse(location.search);
        self.token = wiToken.getToken();
        self.titleTabs = [TAB_DATASET, TAB_MODEL, TAB_TRAIN];
        self.steps = [STEP_TRAIN, STEP_VERIFY, STEP_PREDICT];
        self.current_tab = 0;
        initMlProject();
        if (self.token && self.token.length) window.localStorage.setItem('token', self.token);
        console.log(mlService.value);
    }
    function initMlProject() {
        self.selectionList = [
            {
                label: LABEL_DEFAULT,
                properties: null
            }
        ];
        self.listDataset = {
            training: [],
            verify: [],
            prediction: []
        }
        self.typeInput = {
            label: 'Curve',
            type: CURVE,
            icon: 'curve-16x16'
        };
        self.curveSpecs = [
            {
                label: 'Target Curve',
                currentSelect: LABEL_DEFAULT,
                value: null,
                isTarget: true,
                transform: LINEAR,
            }, {
                label: 'Input Curve',
                currentSelect: LABEL_DEFAULT,
                value: null,
                transform: LINEAR
            }, {
                label: 'Input Curve',
                currentSelect: LABEL_DEFAULT,
                value: null,
                transform: LINEAR
            }
        ];
        self.dataSomVisualize = {
            distributionMaps: [{
                "header": "feature_0",
                'row': [{ "cells": [] }]
            }],
            visualizationMap: [{
                "cells": [{
                    "features": [],
                    "label": null
                }]
            }]
        }
        self.steps = {
            training: {
                datasets: [], // list dataset
                selectionList: [], // selection list map list dataset
                target: true,
                name: 'Train',
                index: 0
            },
            verify: {
                datasets: [],
                selectionList: [],
                target: true,
                name: 'Verify',
                index: 1
            },
            prediction: {
                datasets: [],
                selectionList: [],
                target: false,
                name: 'Predict',
                index: 2
            }
        };
        self.stateWorkflow = {
            state: -1,
            waitResult: false,
            model_id: null,
            bucket_id: null
        }
    }
    this.onChangeType = function(button) {
        self.typeInput = button;
        self.makeListOfDatasetSelection();
        $timeout(() => {
            self.curveSpecs.forEach(i => Object.assign(i, {
                value: null,
                currentSelect: LABEL_DEFAULT
            }));
        })
    }
    this.onInputItemChange = function(i, item) {
        item.currentSelect = i.label;
        item.value = i;
    }
    this.onRemoveInputItem = function($index) {
        if (self.curveSpecs.length > 2 && !self.curveSpecs[$index].isTarget) {
            self.curveSpecs.splice($index, 1);
        }
    }
    this.onAddInputItem = function() {
        self.curveSpecs.push({
            label: 'Input Curve',
            currentSelect: LABEL_DEFAULT,
            value: null,
            transform: LINEAR
        });
    }
    this.getFnDrop = function(step) {
        if (!functionCacheSteps[step].drop) {
            functionCacheSteps[step].drop = function(event, helper, datasets) {
                $timeout(() => {
                    for (let node of datasets) {
                        let vlDs = angular.copy(node);
                        let ds = self.listDataset[step].find( i => i.idDataset === vlDs.idDataset || i.idProject !== vlDs.idProject);
                        if (ds == null) {
                            switch(step) {
                                case STEP_TRAIN: 
                                    self.listDataset[STEP_TRAIN].push(vlDs);
                                    self.makeListOfDatasetSelection();
                                break;
                                case STEP_VERIFY:
                                case STEP_PREDICT:
                                    self.listDataset[step].push(vlDs);
                                    break;
                            }
                        } else {
                            toastr.error('Already has a dataset or a dataset that is not in the same project');
                        }
                    }
                })
            }
        }
        return functionCacheSteps[step].drop;
    }
    this.onRemoveDataset = function(step, $index) {
        $timeout(() => {
            switch(step) {
                case STEP_TRAIN:
                    self.listDataset[STEP_TRAIN].splice($index, 1); 
                    self.makeListOfDatasetSelection();
                break;
                case STEP_VERIFY:
                case STEP_PREDICT:
                    self.listDataset[step].splice($index, 1);
                break;
            }
        });
    }
    this.makeListOfDatasetSelection = function() {
        let preProcessCurves = [];
        self.listDataset[STEP_TRAIN].forEach(i => {
            preProcessCurves.push(...i.curves);
        })
        var curves = _.intersectionBy(preProcessCurves, 'name');
        self.selectionList = [];
        switch(self.typeInput.type) {
            case FAMILY_CURVE:
                falCurve = _.intersectionBy(curves, 'idFamily');
                async.eachSeries(falCurve, async (c) => {
                    if (c.idFamily !== undefined && c.idFamily) {
                        let fl = await wiApi.getFamily(c.idFamily);
                        if(fl) {
                            // self.selectionList.push({
                            //     data: {
                            //         label: fl.name
                            //     },
                            //     properties: {
                            //         familyCurveSpec: fl.family_spec,
                            //         familyGroup: fl.familyGroup,
                            //         familyCurve: fl.name,
                            //         name: fl.name,
                            //         // idFamily: fl.idFamily
                            //     },
                            //     icon: 'family-16x16'
                            // })
                            self.selectionList.push({
                                label: fl.name,
                                familyCurveSpec: fl.family_spec,
                                familyGroup: fl.familyGroup,
                                familyCurve: fl.name,
                                name: fl.name,
                                // idFamily: fl.idFamily
                                icon: 'family-16x16'
                            })
                        }
                    }
                }, (err) => {
                    if(err) console.log("Have a error!");
                    self.selectionList = _.uniqBy(self.selectionList, 'label');
                    self.selectionList.sort((a, b) => {
                                        let nameA = a.label.toUpperCase();
                                        let nameB = b.label.toUpperCase();
                                        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
                                    });
                    self.selectionList.unshift({
                        label: LABEL_DEFAULT,
                        value: null
                    });
                });
                break;
            case FAMILY_GROUP:
                falCurve = _.intersectionBy(curves, 'idFamily');
                async.eachSeries(falCurve, async (c) => {
                    if (c.idFamily !== undefined && c.idFamily) {
                        let fl = await wiApi.getFamily(c.idFamily);
                        if(fl) {
                            // self.selectionList.push({
                            //     data: {
                            //         label: fl.familyGroup
                            //     },
                            //     properties: {
                            //         name: fl.familyGroup,
                            //         familyGroup: fl.familyGroup,
                            //         familyCurveSpec: fl.family_spec,
                            //         // idFamily: fl.idFamily
                            //     },
                            //     icon: 'family-group-16x16'
                            // })
                            self.selectionList.push({
                                label: fl.familyGroup,
                                name: fl.familyGroup,
                                familyGroup: fl.familyGroup,
                                familyCurveSpec: fl.family_spec,
                                // idFamily: fl.idFamily
                                icon: 'family-group-16x16'
                            })
                        }
                    }
                }, (err) => {
                    if(err) console.log("Have a error!");
                    self.selectionList = _.uniqBy(self.selectionList, 'label');
                    self.selectionList.sort((a, b) => {
                                        let nameA = a.label.toUpperCase();
                                        let nameB = b.label.toUpperCase();
                                        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
                                    });
                    self.selectionList.unshift({
                        label: LABEL_DEFAULT,
                        value: null
                    });
                });
                break;
            case CURVE:
                async.eachSeries(curves, (c, next) => {
                    // self.selectionList.push({
                    //     data: {
                    //         label: c.name
                    //     },
                    //     properties: {
                    //         name: c.name,
                    //         curveType: c.type,
                    //         // familyGroup: c.familyGroup,
                    //         // familyCurveSpec: c.family_spec,
                    //         idFamily: c.idFamily
                    //     },
                    //     icon: 'curve-16x16'
                    // });
                    self.selectionList.push({
                        label: c.name,
                        name: c.name,
                        curveType: c.type,
                        // familyGroup: c.familyGroup,
                        // familyCurveSpec: c.family_spec,
                        idFamily: c.idFamily,
                        icon: 'curve-16x16'
                    });
                    next();
                }, (err) => {
                    if(err) console.log("Have a error!");
                    self.selectionList = _.uniqBy(self.selectionList, 'label');
                    self.selectionList.sort((a, b) => {
                                        let nameA = a.label.toUpperCase();
                                        let nameB = b.label.toUpperCase();
                                        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
                                    });
                    self.selectionList.unshift({
                        label: LABEL_DEFAULT,
                        value: null
                    });
                });
                break;
        }
    }
    // ================= modelSelection ====================
    this.modelSelection = {}
    const dataJsonModels = require('../../wi-uservice.json');
    this.modelSelection.listTypeModel = dataJsonModels.type.map(t => {
        return {
            label: t.label,
            type: t.type
        }
    }).sort((a, b) => {
        let nameA = a.label.toUpperCase();
        let nameB = b.label.toUpperCase();
        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
    });
    this.modelSelection.listModel = {};
    this.modelSelection.listTypeModel.forEach(t => {
        this.modelSelection.listModel[t.type] = dataJsonModels.model
                                    .filter(i => i.type == t.type)
                                    .map(m => {
                                        return {
                                            label: m.label,
                                            name: m.name,
                                            type: m.type,
                                            value: m
                                        } 
                                    })
                                    .sort((a, b) => {
                                        let nameA = a.label.toUpperCase();
                                        let nameB = b.label.toUpperCase();
                                        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
                                    });

    });
    this.modelSelection.currentTypeModel = this.modelSelection.listTypeModel[0];
    this.modelSelection.currentModel = this.modelSelection.listModel[this.modelSelection.currentTypeModel.type][0];
    console.log(this.modelSelection.currentTypeModel, this.modelSelection.currentModel, this.modelSelection.listTypeModel, this.modelSelection.listModel);
    this.modelSelection.onChangeTypeModel = function(item) {
		self.modelSelection.currentTypeModel = item;
		self.modelSelection.currentModel = self.modelSelection.listModel[self.modelSelection.currentTypeModel.type][0];
	}
	this.modelSelection.onChangeModel = function(item) {
		self.modelSelection.currentModel = item;
        self.modelSelection.updateNeuralConfig();
        self.modelSelection.updateParamInput();
    }
    this.modelSelection.updateParamInput = function() {
        self.modelSelection.currentModel.value.payload.params.forEach(i => {
            i.type === 'input' ?
            i.value = self.curveSpecs.filter(x => !x.isTarget).map((x, idx) => i.pattern + (idx + 1)) : null;
        });
    }
	this.modelSelection.initPropertiesPayload = function(properties) {
		if(properties.value === undefined || properties.value === null) {
			if(properties.type === 'enum') {
				properties.value = properties.enum[properties.example];
				return;
			}
			if(properties.type === 'size') {
				properties.value = properties.example.map(i => i);
				return;
            }
            if(properties.type === 'input') {
                properties.value = self.curveSpecs.filter(i => !i.isTarget).map((i, idx) => properties.pattern + (idx + 1));
                return;
            }
			properties.value = properties.example;
			// console.log(properties);
		}
	}
	this.modelSelection.changeValue = function(obj) {
		console.log(obj);
		switch (obj.type) {
            case 'string':
                break;
            case 'integer':
                if (!Number.isInteger(Number(obj.value))) {
                    obj.value = obj.example;
                }
                break;
            case 'number':
                if (isNaN(Number(obj.value))) {
                    obj.value = obj.example;
                }
                break;
            // case 'boolean':
            //     if (value.toString().toLowerCase() == 'true') {
            //         return true;
            //     }
            //     if (value.toString().toLowerCase() == 'false') {
            //         return false;
            //     }
            //     return '';
            case 'float':
                if (isNaN(parseFloat(obj.value))) {
                    obj.value = obj.example;
                }
                break;
            // case 'array':
            //     value = value.toString().replace(/\s/g, '').split(',');
            //     console.log(value);
			// 	return ([...new Set(value)]);
        }
	}
	this.modelSelection.onItemChange = function(value, properties) {
		// console.log(value, properties);
		properties.value = properties.enum.find(e => e.properties === value);
	}
	this.modelSelection.nnConfig = {inputs: [], outputs: [], layers: []}
	this.modelSelection.showNeu = false;
	this.modelSelection.updateNeuralConfig = function() {
        self.modelSelection.nnnw = false;
        if(!self.modelSelection.currentModel.value.nnnw) {
            return;
        }
        $timeout(() => {
            self.modelSelection.nnConfig.inputs = self.curveSpecs.filter((v, i) => !v.isTarget).map((i) => {
                return {
                    label: i.currentSelect,
                    name: i.currentSelect,
                    value: i.currentSelect,
                    class: 'Input Curve',
                    type: "1"
                }
            });
            let output = self.curveSpecs.find(i => i.isTarget);
            output ? self.modelSelection.nnConfig.outputs = [{
                label: self.curveSpecs[0].currentSelect,
                name: self.curveSpecs[0].currentSelect,
                value: self.curveSpecs[0].currentSelect,
                class: 'Target output',
                type: "1"
            }] :
            self.modelSelection.nnConfig.outputs = [{
                label: output.currentSelect,
                name: output.currentSelect,
                value: output.currentSelect,
                class: 'Target output',
                type: "1"
            }]
            self.modelSelection.nnConfig.layers = self.modelSelection.currentModel.value.payload.params.find(i => i.name === 'hidden_layer_sizes').value;
            self.modelSelection.nnnw = true;
        })
	}
	this.modelSelection.onLayerChange = function(idx) {
		idx > 0 ? self.modelSelection.nnConfig.layers.push(10) : self.modelSelection.nnConfig.layers.pop(); 
        self.modelSelection.updatePaint();
	}
	this.modelSelection.onHiddenChange = function(index, idx) {
		idx > 0 ? self.modelSelection.nnConfig.layers[index]++ : self.modelSelection.nnConfig.layers[index]--;
        self.modelSelection.updatePaint();
    }
    this.modelSelection.updatePaint = function() {
        self.modelSelection.currentModel.value.nnnw && self.modelSelection.nnConfig.wiNNCtrl ? self.modelSelection.nnConfig.wiNNCtrl.update(self.modelSelection.nnConfig) : null; 
    }
    this.getModelSelection = function() {
        return self.modelSelection;
    }

    // ================= training ==========================
}