const moduleName = "machineTabs";
const componentName = "machineTabs";
module.exports.name = moduleName;
const queryString = require('query-string')
//var config = require('../config/config').production;
var config;
if (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'development') {
    config = require('../config/config').development
} else if (process.env.NODE_ENV === 'prod' || process.env.NODE_ENV === 'production') {
    config = require('../config/config').production
}
else if (process.env.NODE_ENV === 'local') {
    config = require('../config/config').local;
}
else {
    config = require('../config/config').default
}
var app = angular.module(moduleName, ['modelSelection',
    'datasetSelection',
    'zonesetConfig',
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
const TAB_ZONESET = 'Zoneset Config';
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
    const _buildAllCurvesCache = () => {
        this.__CURVES_CACHE[STEP_TRAIN] = this.buildCurvesCache(this.curveSpecs, self.tabs[STEP_TRAIN].listDataset);
        this.__CURVES_CACHE[STEP_VERIFY] = this.buildCurvesCache(this.curveSpecs, self.tabs[STEP_VERIFY].listDataset);
        this.__CURVES_CACHE[STEP_PREDICT] = this.buildCurvesCache(this.curveSpecs, self.tabs[STEP_PREDICT].listDataset);
    }
    const buildAllCurvesCache = _.debounce(_buildAllCurvesCache, 500);
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
    this.titleTabs = [TAB_DATASET, TAB_MODEL, TAB_TRAIN, TAB_ZONESET];
    this.steps = [STEP_TRAIN, STEP_VERIFY, STEP_PREDICT];
    function excludeReplacer(key, value) {
        switch(key) {
            case 'discrimnt':
            case 'resultCurveName':
            case 'plotName':
            case 'active':
                return undefined;
        }
        return value;
    }
    $scope.$watch(() => (JSON.stringify(self.tabs, excludeReplacer) + ((self.typeInput || {}).type || "")) , () => {
        this.makeListOfDatasetSelectionForTabs([
            STEP_TRAIN, 
            STEP_VERIFY
        ]).then(curves => {
            self.selectionListTarget = curves;
            return self.makeListOfDatasetSelectionForTabs([
                STEP_TRAIN, 
                STEP_VERIFY, 
                STEP_PREDICT
            ]);
        }).then(curves => {
            self.selectionList = curves;
            $timeout(() => {
                buildAllCurvesCache();
            });
        }).catch(e => console.error(e));
    });
    this.buildCurvesCache = function(curveSpecs, datasets) {
        let cache = {};
        for (let idx = 0; idx < curveSpecs.length; idx++) {
            for (let dataset of datasets) {
                let key = `${dataset.idDataset}-${idx}`;
                cache[key] = this.getCurves(curveSpecs[idx], dataset);
            }
        }
        return cache;
    }
    $scope.$watch(() => (JSON.stringify(this.curveSpecs)), buildAllCurvesCache);
    this.$onInit = async function() {
        wiApi.setBaseUrl(config.base_url);
        self.loginUrl = config.login;
        self.queryString = queryString.parse(location.search);
        self.token = wiToken.getToken();
        self.titleTabs = [TAB_DATASET, TAB_MODEL, TAB_TRAIN, TAB_ZONESET];
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
                listDataset: []
            },
            verify: {
                listDataset: [],
                plotName: 'Verification Plot'
            },
            prediction: {
                listDataset: [],
                plotName: 'Prediction Plot'
            }
        }
        self.zonesetConfig = {
            training: {},
            verify: {},
            prediction: {}
        };
        self.zonesList = {};
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
        // self.makeListOfDatasetSelection(); // TUNG
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
        }
        /*else {
            console.log("set default");
            item.currentSelect = LABEL_DEFAULT;
        }*/
    }
    this.onRemoveInputItem = function($index) {
        if (self.curveSpecs.length > 2 && !self.curveSpecs[$index].isTarget) {
            self.curveSpecs.splice($index, 1);
            // self.updateCurveSpecs($index); // TUNG : to be removed
        }
    }
    this.onAddInputItem = function() {
        console.log('onAddInputItem');
        self.curveSpecs.push({
            label: 'Input Curve',
            currentSelect: LABEL_DEFAULT,
            value: null,
            transform: LINEAR
        });
        // self.updateCurveSpecs(); // TUNG : to be removed
    }
    this.getFnDrop = function(step) {
        if (!functionCacheSteps[step].drop) {
            functionCacheSteps[step].drop = function(event, helper, datasets) {
                $timeout(() => {
                    for (let node of datasets) {
                        let vlDs = angular.copy(node);
                        if(!vlDs.idDataset) continue;
                        let ds = self.tabs[step].listDataset.find( i => i.idDataset === vlDs.idDataset || i.idProject !== vlDs.idProject);
                        if (!ds) {
                            let curveSpecs = self.curveSpecs.map(i => {return {isTarget: i.isTarget, value: null};});
                            if (step === STEP_PREDICT) 
                                curveSpecs = curveSpecs.filter(item => !item.isTarget);
                            let dsItem = {
                                active: true,
                                idDataset: vlDs.idDataset,
                                idWell: vlDs.idWell,
                                idProject: vlDs.idProject,
                                owner: vlDs.owner,
                                prjName: vlDs.prjName,
                                top: vlDs.top,
                                step: vlDs.step,
                                discrimnt: {active: true},
                                resultCurveName: "RESULT_CURVE"
                                //curveSpecs
                            }
                            self.tabs[step].listDataset.push(dsItem);
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
                    self.tabs[step].listDataset.splice($index, 1); 
                    break;
                case STEP_PREDICT:
                    self.tabs[step].listDataset.splice($index, 1);
                    break;
            }
            // self.makeListOfDatasetSelection(); // TUNG
        });
    }
    this.makeListOfDatasetSelectionForTabs = function(stepLabels) {
        let dsItemHash = {};
        let datasetIds = [];
        let curves = [];
        for (let tabLabel of stepLabels) {
            let tab = self.tabs[tabLabel];
            tab.listDataset.forEach(dsItem => {
                dsItemHash[`${dsItem.idProject}-${dsItem.owner}-${dsItem.prjName}-${dsItem.idWell}`] = dsItem;
                wellIds.push(dsItem.idWell);
                datasetIds.push(dsItem.idDataset);
            });
        }
        wellIds = Object.keys(dsItemHash);
        datasetIds = _.intersection(datasetIds);
        let jobs = wellIds.map(wellKey => {
            let dsItem = dsItemHash[wellKey];
            return wiApi.client(getClientId(dsItem.owner, dsItem.prjName)).getCachedWellPromise(dsItem.idWell);
        });
        return Promise.all(jobs).then((wells) => {
            for (let w of wells) {
                $timeout(() => {
                    this.__WELLCACHE["" + w.idWell] = w;
                    buildAllCurvesCache();
                });
                for (let ds of w.datasets) {
                    if (datasetIds.indexOf(ds.idDataset) < 0) 
                        continue;
                    curves.push(ds.curves);
                }
            }
            self.selectionList = [];
            switch (self.typeInput.type) {
                case CURVE: 
                    curves = _.intersectionBy(...curves, 'name');
                    curves = curves.map(c => ({
                        label: c.name,
                        name: c.name,
                        curveType: c.type,
                        idFamily: c.idFamily,
                        icon: 'curve-16x16'
                    }));
                    break;
                case FAMILY_CURVE:
                    curves = _.intersectionBy(...curves, 'idFamily');
                    curves = curves.filter(c => c.idFamily).map(c => {
                        let family = wiApi.getFamily(c.idFamily);
                        return {
                            label: family.name,
                            familyGroup: family.familyGroup,
                            familyCurve: family.name,
                            name: family.name,
                            icon: 'family-16x16'
                        }
                    });
                    curves = _.uniqBy(curves, 'label');
                    curves.sort((a, b) => {
                        let nameA = a.label.toUpperCase();
                        let nameB = b.label.toUpperCase();
                        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
                    }) ;
                    break;
                case FAMILY_GROUP:
                    curves = _.intersectionBy(...curves, 'idFamily');
                    curves = curves.filter(c => c.idFamily).map(c => {
                        let family = wiApi.getFamily(c.idFamily);
                        return {
                            label: family.familyGroup,
                            familyGroup: family.familyGroup,
                            name: family.familyGroup,
                            icon: 'family-group-16x16'
                        }
                    });
                    curves = _.uniqBy(curves, 'label');
                    break;
                default: 
                    throw new Error("invalid self.inputType.type " + self.inputType.type);
            }
            curves.sort((a, b) => {
                let nameA = a.label.toUpperCase();
                let nameB = b.label.toUpperCase();
                return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
            }) ;
            curves.unshift({
                label: LABEL_DEFAULT,
                value: null
            });
            return curves;
        });
    }
    /* TUNG
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
    } */
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
	this.modelSelection.changeValue = _.debounce(function(obj) {
        $timeout(() => {
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
                    } 
                    else {
                        obj.value = parseFloat(obj.value)
                    } 
                    break;
                // case 'array':
                //     value = value.toString().replace(/\s/g, '').split(',');
                //     console.log(value);
                // 	return ([...new Set(value)]);
            }
            console.log(obj);
        });
	}, 700);
	this.modelSelection.onItemChange = function(value, properties) {
		// console.log(value, properties);
		properties.value = properties.enum.find(e => e.properties === value);
	}
	this.modelSelection.nnConfig = {inputs: [], outputs: [], layers: []}
	this.modelSelection.showNeu = false;
	this.modelSelection.updateNeuralConfig = function() {
        console.log('updateNeuralConfig');
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
        //self.makeListOfTAP();
        mlApi.setBaseCurrentModel(self.modelSelection.currentModel.value);
    }
    /* TUNG
    this.updateCurveSpecs = function(remove) {
        if(remove) {
            Object.keys(self.tabs).forEach((k) => {
                self.tabs[k].listDataset.forEach((d) => {
                    k === STEP_PREDICT ? 
                    d.curveSpecs.splice(remove - 1, 1) :
                    d.curveSpecs.splice(remove, 1);
                });
            });
        }
        else {
            Object.keys(self.tabs).forEach((k) => {
                self.tabs[k].listDataset.forEach((d) => {
                    d.curveSpecs.push({isTarget: false, value: null});
                });
            });
        }
    }
    this.makeListOfTAP = function() {
        console.log('makeListOfTAP');
        return;
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
                    } else {
                        d.listSelection[idx] = [{data: {label: LABEL_DEFAULT}, properties: null}];
                    }
                    d.curveSpecs[idx].currentSelect =  d.listSelection[idx][0].data.label; 
                })
            })
        });
    }
    */
    this.onClickDiscriminator = function(dataset) {
        wiApi.client(getClientId(dataset.owner, dataset.prjName)).getCachedWellPromise(dataset.idWell).then(well => {
            let fullDataset = well.datasets.find(ds => ds.idDataset === dataset.idDataset);
            if (!fullDataset) return;
            wiDialog.discriminator(dataset.discrimnt, fullDataset.curves, function(res) {
                dataset.discrimnt = res;
                console.log(res);
            });
        }).catch(e => {
            console.error(e)
        });

        /* TUNG
        wiDialog.discriminator(dataset.discrmnt, dataset.curves, function(res) {
            dataset.discrmnt = res;
            console.log(res);
        }); */
    }
    this.onItemChangeTabTAP = function(item, arr) {
        console.log(item, arr);
        if (!item) return;
        arr[1].selectedValues = arr[1].selectedValues || [];
        arr[1].selectedValues[arr[3]] = item.name;
        return;
    }
    /* TUNG
    this.onItemChangeTabTAP1 = function(v, arr) {

        return;
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
    */
    // ===========================================================================================
    function loadProject(mlProject) {
        let content = mlProject.content;
        //self.projectInfo = content.projectInfo || {}; // TUNG
        //let owner = self.projectInfo.owner; // TUNG
        //let name = self.projectInfo.name; // TUNG
        /*if (owner && name) {
            //self.dataProject = await wiApi.getFullInfoPromise((content.tabs[STEP_TRAIN] || [])[0].idProject, owner, name);
            wiApi.getFullInfoPromise((content.tabs[STEP_TRAIN] || [])[0].idProject, owner, name).then(prj => {
                self.dataProject = prj;

            }).catch(e => {
                console.error(e)
            }).finally(() => {
        */
                wiToken.setCurrentProjectName(mlProject.name);
                $timeout(() => {
                    self.current_tab = 0;
                });
                self.project = mlProject
                if(self.project.content.plot) {
                    self.tabs[STEP_VERIFY].plotName = self.project.content.plot[STEP_VERIFY].plotName;
                    self.tabs[STEP_PREDICT].plotName = self.project.content.plot[STEP_PREDICT].plotName;
                }

                // PHUC !!! Dont move after load listDataset !!!
                self.zonesetConfig = content.zonesetConfig || {
                    training: {},
                    verify: {},
                    prediction: {}
                };

                self.tabs[STEP_TRAIN].listDataset = self.project.content.tabs[STEP_TRAIN] || [];
                self.tabs[STEP_VERIFY].listDataset = self.project.content.tabs[STEP_VERIFY] || [];
                self.tabs[STEP_PREDICT].listDataset = self.project.content.tabs[STEP_PREDICT] || [];
                self.typeInput = self.project.content.typeInput
                // self.makeListOfDatasetSelection(); // TUNG
                self.curveSpecs = self.project.content.curveSpecs
                let currentTypeModel = self.modelSelection.listTypeModel.find(t => t.type === self.project.content.model.type);
                if(currentTypeModel) 
                    self.modelSelection.currentTypeModel = currentTypeModel;
                let currentModel = self.modelSelection.listModel[self.modelSelection.currentTypeModel.type].find(m => m.name === self.project.content.model.name);
                if(currentModel) {
                    Object.assign(self.modelSelection.currentModel, self.project.content.model);
                    Object.assign(currentModel, self.project.content.model);
                }
        /*    });
        }*/
    }
    this.openProject = function() {
        wiApi.client(getClientId()).getMlProjectListPromise()
        .then((listMlProject) => {
            $scope.allProjects = self.project ? listMlProject.filter(l => l.name != self.project.name).sort((a, b) => a.name.localeCompare(b.name)) :
            listMlProject.sort((a, b) => a.name.localeCompare(b.name)) 
            $scope.projectSelected = null;
            $scope.openProject = function() {
                console.log($scope.projectSelected);
                if($scope.projectSelected) {
                    loadProject($scope.projectSelected);
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
        });
    }
    this.renameProject = function() {
        self.projectName = self.project.name;
        $scope.rename = function() {
            if(self.projectName) {
                wiApi.client(getClientId()).editMlProjectPromise({
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
                    console.error(err);
                    toastr.error('Rename project fail', 'Error: ' + err.message);
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
        wiApi.client(getClientId()).editMlProjectPromise({
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
                zonesetConfig: self.zonesetConfig,
                projectInfo: self.projectInfo,
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
                wiApi.client(getClientId()).createMlProjectPromise({
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
            wiApi.client(getClientId()).deleteMlProjectPromise(project.idMlProject)
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
            wiApi.client(getClientId()).getMlProjectListPromise()
        .then((listMlProject) => {
            let currentProject = listMlProject.find(p => p.name === wiToken.getCurrentProjectName());
            if(!currentProject) {
                wiToken.setCurrentProjectName('');
                return self.openProject();
            }
            $scope.acceptRestore = function() {
                loadProject(currentProject);
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
    this.__WELLCACHE = {};
    this.getWell = function(idWell) {
        return this.__WELLCACHE["" + idWell];
    }
    this.getDataset = function(idWell, idDataset) {
        let well = this.__WELLCACHE["" + idWell];
        if (!well) return null;
        return well.datasets.find(ds => ds.idDataset === idDataset);
    }
    this.__CURVES_CACHE = {};
    this.getCurves = function(curveSpecItem, compactDataset) {
        let well = self.__WELLCACHE["" + compactDataset.idWell];
        if (!well) return null;
        let dataset = well.datasets.find(ds => ds.idDataset === compactDataset.idDataset);
        let familyTable = wiApi.getFamilyTable();
        let family;
        let families;
        switch (self.typeInput.type) {
            case FAMILY_CURVE:
                family = familyTable.find(f => f.name === curveSpecItem.currentSelect);
                break;
            case FAMILY_GROUP:
                families = familyTable.filter(f => f.familyGroup === curveSpecItem.currentSelect);
        }

        let curves = dataset.curves.filter(curve => {
            switch (self.typeInput.type) {
                case CURVE:
                    return curve.name === curveSpecItem.currentSelect;
                case FAMILY_CURVE:
                    if (!family) return false;
                    return curve.idFamily === family.idFamily;
                case FAMILY_GROUP:
                    if (!families) return false;
                    let idx = families.findIndex(f => f.idFamily === curve.idFamily);
                    return idx >= 0;
            }
        }).map(c => ({ data: { label: c.name }, properties: c }));
        return curves;
    }
    /*
    this.updateAndGetCurvesCacheEntry = function(key, curves) {
        let cs = curves.map(c => ({ data: { label: c.name }, properites: c }));
        if (!self.__CURVES_CACHE[key]) {
            self.__CURVES_CACHE[key] = cs;
        }
        else {
            self.__CURVES_CACHE[key].length = 0;
            self.__CURVES_CACHE[key].push(...cs);
        }
        return self.__CURVES_CACHE[key];
    }
    */
    this.inputCurveSpecs = function(curveSpec, idx, curveSpecs) {
        return !curveSpec.isTarget;
    }
    this.searchTrainingText = "";
    this.searchTrainingFilter = function(compactDatasetItem, idx, listDataset) {
        let well = self.__WELLCACHE["" + compactDatasetItem.idWell];
        if (!well) return;
        let dataset = well.datasets.find(ds => ds.idDataset === compactDatasetItem.idDataset);
        return dataset.name.toUpperCase().includes((self.searchTrainingText || "").toUpperCase());
    }
    this.searchVerifyText = "";
    this.searchVerifyFilter = function(compactDatasetItem, idx, listDataset) {
        let well = self.__WELLCACHE["" + compactDatasetItem.idWell];
        if (!well) return;
        let dataset = well.datasets.find(ds => ds.idDataset === compactDatasetItem.idDataset);
        return dataset.name.toUpperCase().includes((self.searchVerifyText || "").toUpperCase());
    }
    this.searchPredictionText = "";
    this.searchPredictionFilter = function(compactDatasetItem, idx, listDataset) {
        let well = self.__WELLCACHE["" + compactDatasetItem.idWell];
        if (!well) return;
        let dataset = well.datasets.find(ds => ds.idDataset === compactDatasetItem.idDataset);
        return dataset.name.toUpperCase().includes((self.searchPredictionText || "").toUpperCase());
    }
    function getClientId(owner, prjName) {
        return mlApi.getClientId(owner, prjName);
    }
    this.getClientId = getClientId;
}
