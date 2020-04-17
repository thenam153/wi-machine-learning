const moduleName = "machineTabs";
const componentName = "machineTabs";
module.exports.name = moduleName;
const queryString = require('query-string')
var config = require('../config/config').production;
// if (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'development') {
//     config = require('../config/config').development
// } else if (process.env.NODE_ENV === 'prod' || process.env.NODE_ENV === 'production') {
//     config = require('../config/config').production
// }
var app = angular.module(moduleName, ['modelSelection',
    'datasetSelection',
    'trainingPrediction',
    'mlApi',
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
MachineTabsController.$inject = ['$scope', '$timeout', 'wiToken', 'wiApi', '$http', 'wiDialog', 'ngDialog', 'mlApi']

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

function MachineTabsController($scope, $timeout, wiToken, wiApi, $http, wiDialog, ngDialog, mlApi) {
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
        self.restoreProject();
        // console.log(mlService.value);
    }
    function initMlProject() {
        self.project = null;
        self.selectionList = [
            {
                label: LABEL_DEFAULT,
                properties: null
            }
        ];
        self.selectionListTarget = [
            {
                label: LABEL_DEFAULT,
                properties: null
            }
        ];
        self.tabs = {
            training: {
                listDataset: [],
                selectionList: []
            },
            verify: {
                listDataset: [],
                selectionList: [],
                plotName: 'Verification Plot'
            },
            prediction: {
                listDataset: [],
                selectionList: [],
                plotName: 'Prediction Plot'
            }
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
        self.stateWorkflow = {
            state: -1,
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
        if(i) {
            item.currentSelect = i.label;
            item.value = i;
        }else {
            item.currentSelect = LABEL_DEFAULT;
        }
    }
    this.onRemoveInputItem = function($index) {
        if (self.curveSpecs.length > 2 && !self.curveSpecs[$index].isTarget) {
            self.curveSpecs.splice($index, 1);
            self.updateCurveSpecs($index);
        }
    }
    this.onAddInputItem = function() {
        self.curveSpecs.push({
            label: 'Input Curve',
            currentSelect: LABEL_DEFAULT,
            value: null,
            transform: LINEAR
        });
        self.updateCurveSpecs();
    }
    this.getFnDrop = function(step) {
        if (!functionCacheSteps[step].drop) {
            functionCacheSteps[step].drop = function(event, helper, datasets) {
                $timeout(() => {
                    for (let node of datasets) {
                        let vlDs = angular.copy(node);
                        if(!vlDs.idDataset) continue;
                        let ds = self.tabs[step].listDataset.find( i => i.idDataset === vlDs.idDataset || i.idProject !== vlDs.idProject);
                        if (ds == null) {
                            vlDs.active = true;
                            vlDs.discrmnt = {active: true};
                            // switch(step) {
                            //     case STEP_TRAIN: 
                            //         self.tabs[STEP_TRAIN].listDataset.push(vlDs);
                            //         // self.makeListOfDatasetSelection();
                            //     break;
                            //     case STEP_VERIFY:
                            //     case STEP_PREDICT:
                            //         self.tabs[step].listDataset.push(vlDs);
                            //         break;
                            // }
                            switch(step) {
                                case STEP_TRAIN: 
                                case STEP_VERIFY:
                                    vlDs.curveSpecs = self.curveSpecs.map(i => {return {isTarget: i.isTarget, value: null};});
                                break;
                                case STEP_PREDICT:
                                    vlDs.curveSpecs = self.curveSpecs.filter(i => !i.isTarget).map(i => {return {isTarget: i.isTarget, value: null};});
                                    break;
                            }
                            self.tabs[step].listDataset.push(vlDs);
                            self.makeListOfDatasetSelection();
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
                    self.tabs[STEP_TRAIN].listDataset.splice($index, 1); 
                    // self.makeListOfDatasetSelection();
                break;
                case STEP_VERIFY:
                case STEP_PREDICT:
                    self.tabs[step].listDataset.splice($index, 1);
                break;
            }
            self.makeListOfDatasetSelection();
        });
    }
    this.makeListOfDatasetSelection = function() {
        self.makeListOfDatasetSelectionTarget();
        let preProcessCurves = [];
        self.tabs[STEP_TRAIN].listDataset.forEach(i => {
            preProcessCurves.push(i.curves);
        })
        self.tabs[STEP_VERIFY].listDataset.forEach(i => {
            preProcessCurves.push(i.curves);
        })
        self.tabs[STEP_PREDICT].listDataset.forEach(i => {
            preProcessCurves.push(i.curves);
        })
        var curves = _.intersectionBy(...preProcessCurves, 'name');
        self.selectionList = [];
        switch(self.typeInput.type) {
            case FAMILY_CURVE:
                falCurve = _.intersectionBy(curves, 'idFamily');
                async.eachSeries(falCurve, async (c) => {
                    if (c.idFamily !== undefined && c.idFamily) {
                        // let fl = await wiApi.getFamily(c.idFamily);
                        // if(fl) {
                        //     self.selectionList.push({
                        //         label: fl.name,
                        //         familyCurveSpec: fl.family_spec,
                        //         familyGroup: fl.familyGroup,
                        //         familyCurve: fl.name,
                        //         name: fl.name,
                        //         // idFamily: fl.idFamily
                        //         icon: 'family-16x16'
                        //     })
                        // }

                        self.selectionList.push({
                            label: c.LineProperty.name,
                            familyGroup: c.LineProperty.familyGroup,
                            familyCurve: c.LineProperty.name,
                            name: c.LineProperty.name,
                            // idFamily: fl.idFamily
                            icon: 'family-16x16'
                        })
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
                        // let fl = await wiApi.getFamily(c.idFamily);
                        // if(fl) {
                        //     self.selectionList.push({
                        //         label: fl.familyGroup,
                        //         name: fl.familyGroup,
                        //         familyGroup: fl.familyGroup,
                        //         familyCurveSpec: fl.family_spec,
                        //         // idFamily: fl.idFamily
                        //         icon: 'family-group-16x16'
                        //     })
                        // }
                        self.selectionList.push({
                            label: c.LineProperty.familyGroup,
                            familyGroup: c.LineProperty.familyGroup,
                            name: c.LineProperty.familyGroup,
                            // idFamily: fl.idFamily
                            icon: 'family-group-16x16'
                        })
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
    this.makeListOfDatasetSelectionTarget = function() {
        let preProcessCurves = [];
        self.tabs[STEP_TRAIN].listDataset.forEach(i => {
            preProcessCurves.push(i.curves);
        })
        self.tabs[STEP_VERIFY].listDataset.forEach(i => {
            preProcessCurves.push(i.curves);
        })
        var curves = _.intersectionBy(...preProcessCurves, 'name');
        self.selectionListTarget = [];
        switch(self.typeInput.type) {
            case FAMILY_CURVE:
                falCurve = _.intersectionBy(curves, 'idFamily');
                async.eachSeries(falCurve, async (c) => {
                    if (c.idFamily !== undefined && c.idFamily) {
                        // let fl = await wiApi.getFamily(c.idFamily);
                        // if(fl) {
                        //     self.selectionListTarget.push({
                        //         label: fl.name,
                        //         familyCurveSpec: fl.family_spec,
                        //         familyGroup: fl.familyGroup,
                        //         familyCurve: fl.name,
                        //         name: fl.name,
                        //         // idFamily: fl.idFamily
                        //         icon: 'family-16x16'
                        //     })
                        // }

                        self.selectionListTarget.push({
                            label: c.LineProperty.name,
                            familyGroup: c.LineProperty.familyGroup,
                            familyCurve: c.LineProperty.name,
                            name: c.LineProperty.name,
                            // idFamily: fl.idFamily
                            icon: 'family-16x16'
                        })

                    }
                }, (err) => {
                    if(err) console.log("Have a error!");
                    self.selectionListTarget = _.uniqBy(self.selectionListTarget, 'label');
                    self.selectionListTarget.sort((a, b) => {
                                        let nameA = a.label.toUpperCase();
                                        let nameB = b.label.toUpperCase();
                                        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
                                    });
                    self.selectionListTarget.unshift({
                        label: LABEL_DEFAULT,
                        value: null
                    });
                });
                break;
            case FAMILY_GROUP:
                falCurve = _.intersectionBy(curves, 'idFamily');
                async.eachSeries(falCurve, async (c) => {
                    if (c.idFamily !== undefined && c.idFamily) {
                        // let fl = await wiApi.getFamily(c.idFamily);
                        // if(fl) {
                        //     self.selectionListTarget.push({
                        //         label: fl.familyGroup,
                        //         name: fl.familyGroup,
                        //         familyGroup: fl.familyGroup,
                        //         familyCurveSpec: fl.family_spec,
                        //         // idFamily: fl.idFamily
                        //         icon: 'family-group-16x16'
                        //     })
                        // }

                        self.selectionListTarget.push({
                            label: c.LineProperty.familyGroup,
                            familyGroup: c.LineProperty.familyGroup,
                            name: c.LineProperty.familyGroup,
                            // idFamily: fl.idFamily
                            icon: 'family-group-16x16'
                        })

                    }
                }, (err) => {
                    if(err) console.log("Have a error!");
                    self.selectionListTarget = _.uniqBy(self.selectionListTarget, 'label');
                    self.selectionListTarget.sort((a, b) => {
                                        let nameA = a.label.toUpperCase();
                                        let nameB = b.label.toUpperCase();
                                        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
                                    });
                    self.selectionListTarget.unshift({
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
                    self.selectionListTarget.push({
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
                    self.selectionListTarget = _.uniqBy(self.selectionListTarget, 'label');
                    self.selectionListTarget.sort((a, b) => {
                                        let nameA = a.label.toUpperCase();
                                        let nameB = b.label.toUpperCase();
                                        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
                                    });
                    self.selectionListTarget.unshift({
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
    this.modelSelection.initModelSelection = function() {
        self.modelSelection.listTypeModel = dataJsonModels.type.map(t => {
            return {
                label: t.label,
                type: t.type
            }
        }).sort((a, b) => {
            let nameA = a.label.toUpperCase();
            let nameB = b.label.toUpperCase();
            return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
        });
        self.modelSelection.listModel = {};
        self.modelSelection.listTypeModel.forEach(t => {
            self.modelSelection.listModel[t.type] = dataJsonModels.model
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
        self.modelSelection.currentTypeModel = self.modelSelection.listTypeModel[0];
        self.modelSelection.currentModel = self.modelSelection.listModel[self.modelSelection.currentTypeModel.type][0];
        self.modelSelection.currentModel.value.payload.params.forEach(i => self.modelSelection.initPropertiesPayload(i))
        if(self.modelSelection.currentModel.value.payload.train) {
            self.modelSelection.currentModel.value.payload.train.forEach(i => self.modelSelection.initPropertiesPayload(i))
        }
        // console.log(self.modelSelection.currentTypeModel, self.modelSelection.currentModel, self.modelSelection.listTypeModel, self.modelSelection.listModel);
    }
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
		switch (obj.type) {
            case 'string':
                break;
            case 'integer':
                if (!Number.isInteger(Number(obj.value))) {
                    obj.value = obj.example;
                }else {
                    obj.value = Number(obj.value)
                }
                break;
            case 'number':
                if (isNaN(Number(obj.value))) {
                    obj.value = obj.example;
                }else {
                    obj.value = Number(obj.value)
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
                }else {
                    obj.value = parseFloat(obj.value)
                }
                break;
            // case 'array':
            //     value = value.toString().replace(/\s/g, '').split(',');
            //     console.log(value);
			// 	return ([...new Set(value)]);
        }
        console.log(obj);
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
    this.modelSelection.initModelSelection();
    // ================= training ==========================

    this.updateTabTrainingPredictiong = function() {
        console.log("switch");
        self.makeListOfTAP();
        mlApi.setBaseCurrentModel(self.modelSelection.currentModel.value);
    }   
    this.updateCurveSpecs = function(remove) {
        if(remove) {
            Object.keys(self.tabs).forEach((k) => {
                self.tabs[k].listDataset.forEach((d) => {
                    k === STEP_PREDICT ? 
                    d.curveSpecs.splice(remove - 1, 1) :
                    d.curveSpecs.splice(remove, 1);
                });
            });
        }else {
            Object.keys(self.tabs).forEach((k) => {
                self.tabs[k].listDataset.forEach((d) => {
                    d.curveSpecs.push({isTarget: false, value: null});
                });
            });
        }
    }
    this.makeListOfTAP = function() {
        Object.keys(self.tabs).forEach((k) => {
            let list = [];
            switch(k) {
                case STEP_TRAIN:
                case STEP_VERIFY:
                        list = self.curveSpecs.filter((i, idx) => idx >= 0);
                    break;
                case STEP_PREDICT: 
                        list = self.curveSpecs.filter((i, idx) => idx > 0);
                    break;
            }
            // self.tabs[k].selectionList = list;
            self.tabs[k].listDataset.forEach((d) => {
                d.listSelection = list.map(i => []);
                list.forEach((l, idx) => {
                    if(l.currentSelect !== LABEL_DEFAULT)
                    {
                        switch(self.typeInput.type) {
                            case CURVE:
                                    curve = d.curves.find(c => c.name === l.currentSelect);
                                    d.listSelection[idx] = [{data: {label: curve.name}, properties: curve}];
                                break;
                            case FAMILY_CURVE:
                                    d.listSelection[idx] = d.curves.filter(c => {
                                        return c.LineProperty && c.LineProperty.name === l.currentSelect;
                                    }).map((c) => {
                                        return {
                                            data: {
                                                label: c.name
                                            },
                                            properties: c
                                        }
                                    });
                                break;
                            case FAMILY_GROUP:
                                    d.listSelection[idx] = d.curves.filter(c => {
                                        return c.LineProperty && c.LineProperty.familyGroup === l.currentSelect;
                                    }).map((c) => {
                                        return {
                                            data: {
                                                label: c.name
                                            },
                                            properties: c
                                        }
                                    });
                                break;
                        }
                    }else {
                        d.listSelection[idx] = [{data: {label: LABEL_DEFAULT}, properties: null}];
                    }
                    d.curveSpecs[idx].currentSelect =  d.listSelection[idx][0].data.label; 
                })
            })
        });
    }
    this.onClickDiscriminator = function(dataset) {
        wiDialog.discriminator(dataset.discrmnt, dataset.curves, function(res) {
            dataset.discrmnt = res;
            console.log(res);
        })
    }
    this.onItemChangeTabTAP = function(v, arr) {
        // if(!v) item.value = 
        arr[0].value = v;
        if(arr[1] && arr[0].isTarget) {
            if(v) {
                if(arr[2] == 'Verify') {
                    arr[1].resultCurveName = `${v.name}-${self.modelSelection.currentModel.value.infix}-${arr[2]}`;
                }else {
                    self.tabs[STEP_PREDICT].listDataset.forEach(d => d.resultCurveName = `${v.name}-${self.modelSelection.currentModel.value.infix}-${arr[2]}`)
                }
            }else {
                if(arr[2] == 'Verify') {
                    arr[1].resultCurveName = `-${self.modelSelection.currentModel.value.infix}-${arr[2]}`;
                }else {
                    self.tabs[STEP_PREDICT].listDataset.forEach(d => d.resultCurveName = `-${self.modelSelection.currentModel.value.infix}-${arr[2]}`)
                }
            }
        }
        console.log(v);
    }
    // ===========================================================================================

    this.openProject = function() {
        wiApi.getMlProjectListPromise()
        .then((listMlProject) => {
            // $timeout(() => {
                $scope.allProjects = self.project ? listMlProject.filter(l => l.name != self.project.name).sort((a, b) => a.name.localeCompare(b.name)) :
                listMlProject.sort((a, b) => a.name.localeCompare(b.name)) 
                $scope.projectSelected = null;
                $scope.openProject = function() {
                    console.log($scope.projectSelected);
                    if($scope.projectSelected) {
                        wiToken.setCurrentProjectName($scope.projectSelected.name);
                        self.project = $scope.projectSelected
                        if(self.project.content.plot) {
                            self.tabs[STEP_VERIFY].plotName = self.project.content.plot[STEP_VERIFY].plotName
                            self.tabs[STEP_PREDICT].plotName = self.project.content.plot[STEP_PREDICT].plotName
                        }
                        self.tabs[STEP_TRAIN].listDataset = self.project.content.tabs[STEP_TRAIN] || []
                        self.tabs[STEP_VERIFY].listDataset = self.project.content.tabs[STEP_VERIFY] || []
                        self.tabs[STEP_PREDICT].listDataset = self.project.content.tabs[STEP_PREDICT] || []
                        self.typeInput = self.project.content.typeInput
                        self.makeListOfDatasetSelection();
                        self.curveSpecs = self.project.content.curveSpecs
                        let currentTypeModel = self.modelSelection.listTypeModel.find(t => t.type === self.project.content.model.type);
                        if(currentTypeModel) self.modelSelection.currentTypeModel = currentTypeModel;
                        let currentModel = self.modelSelection.listModel[self.modelSelection.currentTypeModel.type].find(m => m.name === self.project.content.model.name);
                        if(currentModel) {
                            Object.assign(self.modelSelection.currentModel, self.project.content.model);
                            Object.assign(currentModel, self.project.content.model);
                        }
                    }
                    ngDialog.close()
                }
                $scope.clickProject = function(project) {
                    $scope.projectSelected = project;
                }
                ngDialog.open({
                    template: 'templateOpenProject',
                    className: 'ngdialog-theme-default',
                    scope: $scope,
                });
            // })
        });
    }
    this.renameProject = function() {
        self.projectName = self.project.name;
        $scope.rename = function() {
            if(self.projectName) {
                wiApi.editMlProjectPromise({
                    name: self.projectName,
                    idMlProject: self.project.idMlProject,
                    content: {
                        tabs: {
                            training: self.tabs[STEP_TRAIN].listDataset,
                            verify: self.tabs[STEP_VERIFY].listDataset,
                            prediction: self.tabs[STEP_TRAIN].listDataset,
                        },
                        curveSpecs: self.curveSpecs,
                        typeInput: self.typeInput,
                        model: self.modelSelection.currentModel,
                        state: self.project.content.state,
                        modelId: self.project.content.modelId,
                        bucketId: self.project.content.bucketId
                    }
                })
                .then((project) => {
                    $timeout(() => {
                        self.project = project;
                        wiToken.setCurrentProjectName(project.name);
                    })
                    toastr.success('Rename project success', 'Success');
                })
                .catch(err => {
                    toastr.error('Rename project fail', 'Error');
                })
                .finally(() => {
                    ngDialog.close();
                })
            }
            ngDialog.close();
        }
        ngDialog.open({
            template: 'templateRenamePrj',
            className: 'ngdialog-theme-default',
            scope: $scope,
        });
    }
    this.saveProject = function() {
        wiApi.editMlProjectPromise({
            name: self.project.name,
            idMlProject: self.project.idMlProject,
            content: {
                tabs: {
                    training: self.tabs[STEP_TRAIN].listDataset,
                    verify: self.tabs[STEP_VERIFY].listDataset,
                    prediction: self.tabs[STEP_PREDICT].listDataset,
                },
                plot:{
                    verify: {
                        plotName: self.tabs[STEP_VERIFY].plotName
                    },
                    prediction: {
                        plotName: self.tabs[STEP_PREDICT].plotName
                    }
                },
                curveSpecs: self.curveSpecs,
                typeInput: self.typeInput,
                model: self.modelSelection.currentModel,
                state: self.project.content.state,
                modelId: self.project.content.modelId,
                bucketId: self.project.content.bucketId
            }
        })
        .then((project) => {
            wiToken.setCurrentProjectName(project.name);
            toastr.success('Save project success', 'Success');
        })
        .catch((err) => {
            toastr.error('Save project fail', 'Error');
        })
        .finally(() =>  ngDialog.close())
    }
    this.createProject = function() {
        self.nameProject = "default";
        $scope.createNewProject = function(name) {
            if(self.nameProject) {
                wiApi.createMlProjectPromise({
                    name: self.nameProject,
                    content: {
                        tabs: {
                            training: self.tabs[STEP_TRAIN].listDataset,
                            verify: self.tabs[STEP_VERIFY].listDataset,
                            prediction: self.tabs[STEP_PREDICT].listDataset,
                        },
                        plot:{
                            verify: {
                                plotName: self.tabs[STEP_VERIFY].plotName
                            },
                            prediction: {
                                plotName: self.tabs[STEP_PREDICT].plotName
                            }
                        },
                        curveSpecs: self.curveSpecs,
                        typeInput: self.typeInput,
                        model: self.modelSelection.currentModel,
                        state: -1,
                        modelId: null,
                        bucketId: null
                    }
                })
                .then((project) => {
                    toastr.success('Create machine learing project success', 'Success')
                    console.log(project);
                    $timeout(() => {
                        self.project = project;
                        wiToken.setCurrentProjectName(project.name);
                    })
                    // $timeout(() => {
                    //     self.mlProjectSelected = mlProject;
                    //     self.currentSelectedMlProject = mlProject.name;
                    //     wiToken.setCurrentProjectName(mlProject.name);
                    // })

                })
                .catch((err) => {
                    toastr.error("Project's name already exists", 'Error')
                })
                .finally(() => {
                    ngDialog.close();
                })
            }
            ngDialog.close();
        }
        ngDialog.open({
            template: 'templateNewPrj',
            className: 'ngdialog-theme-default',
            scope: $scope,
        });
    }
    this.newProject = function() {   
        initMlProject();
        self.modelSelection.initModelSelection();
        wiToken.setCurrentProjectName('');
        ngDialog.close();
    }
    this.deleteProject = function(project) {
        $scope.projectDelete = project;
        $scope.cancelDelete = () => dialog.close();
        $scope.okDelete = function() {
            wiApi.deleteMlProjectPromise(project.idMlProject)
                .then((res) => {
                    toastr.success('Delete "' + project.name + '" Project Success', 'Success');
                    if(self.project && project.idMlProject === self.project.idMlProject) {
                            self.newProject();
                    }
                    $timeout(() => {
                        $scope.allProjects = $scope.allProjects.filter((i) => i.idMlProject != project.idMlProject);
                    })
                })
                .catch((err) => {
                    toastr.error('Delete "' + project.name + '" Project Error', 'Error');
                })
                .finally(() => {
                    dialog.close();
                })
        }
        let dialog = ngDialog.open({
            template: 'templateDeleteProject',
            className: 'ngdialog-theme-default',
            scope: $scope,
        });
    }
    this.restoreProject = function() {
        if(wiToken.getCurrentProjectName()) {
            self.restoreProjectName = wiToken.getCurrentProjectName();
            wiApi.getMlProjectListPromise()
        .then((listMlProject) => {
            let currentProject = listMlProject.find(p => p.name === wiToken.getCurrentProjectName());
            if(!currentProject) {
                wiToken.setCurrentProjectName('');
                return self.openProject();
            }
            $scope.acceptRestore = function() {
                wiToken.setCurrentProjectName(currentProject.name);
                self.project = currentProject
                if(self.project.content.plot) {
                    self.tabs[STEP_VERIFY].plotName = self.project.content.plot[STEP_VERIFY].plotName
                    self.tabs[STEP_PREDICT].plotName = self.project.content.plot[STEP_PREDICT].plotName
                }
                self.tabs[STEP_TRAIN].listDataset = self.project.content.tabs[STEP_TRAIN] || []
                self.tabs[STEP_VERIFY].listDataset = self.project.content.tabs[STEP_VERIFY] || []
                self.tabs[STEP_PREDICT].listDataset = self.project.content.tabs[STEP_PREDICT] || []
                self.typeInput = self.project.content.typeInput
                self.makeListOfDatasetSelection();
                self.curveSpecs = self.project.content.curveSpecs
                let currentTypeModel = self.modelSelection.listTypeModel.find(t => t.type === self.project.content.model.type);
                if(currentTypeModel) self.modelSelection.currentTypeModel = currentTypeModel;
                let currentModel = self.modelSelection.listModel[self.modelSelection.currentTypeModel.type].find(m => m.name === self.project.content.model.name);
                if(currentModel) {
                    Object.assign(self.modelSelection.currentModel, self.project.content.model);
                    Object.assign(currentModel, self.project.content.model);
                }
                ngDialog.close()
            }
            ngDialog.open({
                template: 'templateRestore',
                className: 'ngdialog-theme-default',
                scope: $scope,
            });
        })
        }else {
            wiToken.setCurrentProjectName('');
            self.openProject();
        }
    }
}