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
    'wiApi',
    'wiNeuralNetwork',
    'wiLogin',
    'wiToken',
    'wiDialog',
    'wiDiscriminator',
    'ngDialog',
    'somModelService',
    'heatMap'
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
MachineTabsController.$inject = ['$scope', '$timeout', 'wiToken', 'wiApi', '$http', 'wiDialog', 'ngDialog']

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

function MachineTabsController($scope, $timeout, wiToken, wiApi, $http, wiDialog, ngDialog) {
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
    }
    function initMlProject() {
        self.selectionList = [
            {
                data: {
                    label: LABEL_DEFAULT
                },
                properties: {
                    value: null
                }
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
        // self.createSelectionList();
        // for (let i in self.machineLearnSteps) {
        //     self.handleDropDatasets(i);
        // }
    }
    this.getFnOnInputChanged = function($index) {
        if (!functionCache[$index])
            functionCache[$index] = function(selectedItemProps) {
                self.curveSpecs[$index].value = selectedItemProps;
                if (selectedItemProps) {
                    self.curveSpecs[$index].currentSelect = selectedItemProps.name;
                } else {
                    self.curveSpecs[$index].currentSelect = LABEL_DEFAULT;
                }
                // let handle = _.debounce(() => {
                //     for (let i in self.machineLearnSteps) {
                //         self.handleDropDatasets(i);
                //     }
                // }, 500);
                // handle()
            }
        return functionCache[$index];
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
    this.updateInputModel = function() {
        for (let i of self.currentSelectedModel.payload.params) {
            if (i.type === 'input') {
                i.value = [];
                for (let j = 0; j < self.inputCurveSpecs.length; j++) {
                    i.value = _.concat(i.value, i.pattern + (Number(j) + 1))
                }
            }
        }
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
        // self.selectionList = [{
        //     data: {
        //         label: LABEL_DEFAULT
        //     },
        //     properties: null
        // }];
        self.selectionList = [];
        switch(self.typeInput.type) {
            case FAMILY_CURVE:
                falCurve = _.intersectionBy(curves, 'idFamily');
                async.eachSeries(falCurve, async (c) => {
                    if (c.idFamily !== undefined && c.idFamily) {
                        let fl = await wiApi.getFamily(c.idFamily);
                        if(fl) {
                            self.selectionList.push({
                                data: {
                                    label: fl.name
                                },
                                properties: {
                                    familyCurveSpec: fl.family_spec,
                                    familyGroup: fl.familyGroup,
                                    familyCurve: fl.name,
                                    name: fl.name,
                                    // idFamily: fl.idFamily
                                },
                                icon: 'family-16x16'
                            })
                        }
                    }
                }, (err) => {
                    if(err) console.log("Have a error!");
                    self.selectionList = _.uniqBy(self.selectionList, 'data.label');
                    self.selectionList.sort((a, b) => {
                                        let nameA = a.data.label.toUpperCase();
                                        let nameB = b.data.label.toUpperCase();
                                        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
                                    });
                    self.selectionList.unshift({
                        data: {
                            label: LABEL_DEFAULT
                        },
                        properties: null
                    });
                });
                break;
            case FAMILY_GROUP:
                falCurve = _.intersectionBy(curves, 'idFamily');
                async.eachSeries(falCurve, async (c) => {
                    if (c.idFamily !== undefined && c.idFamily) {
                        let fl = await wiApi.getFamily(c.idFamily);
                        if(fl) {
                            self.selectionList.push({
                                data: {
                                    label: fl.familyGroup
                                },
                                properties: {
                                    name: fl.familyGroup,
                                    familyGroup: fl.familyGroup,
                                    familyCurveSpec: fl.family_spec,
                                    // idFamily: fl.idFamily
                                },
                                icon: 'family-group-16x16'
                            })
                        }
                    }
                }, (err) => {
                    if(err) console.log("Have a error!");
                    self.selectionList = _.uniqBy(self.selectionList, 'data.label');
                    self.selectionList.sort((a, b) => {
                                        let nameA = a.data.label.toUpperCase();
                                        let nameB = b.data.label.toUpperCase();
                                        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
                                    });
                    self.selectionList.unshift({
                        data: {
                            label: LABEL_DEFAULT
                        },
                        properties: null
                    });
                });
                break;
            case CURVE:
                async.eachSeries(curves, (c, next) => {
                    self.selectionList.push({
                        data: {
                            label: c.name
                        },
                        properties: {
                            name: c.name,
                            curveType: c.type,
                            // familyGroup: c.familyGroup,
                            // familyCurveSpec: c.family_spec,
                            idFamily: c.idFamily
                        },
                        icon: 'curve-16x16'
                    });
                    next();
                }, (err) => {
                    if(err) console.log("Have a error!");
                    self.selectionList = _.uniqBy(self.selectionList, 'data.label');
                    self.selectionList.sort((a, b) => {
                                        let nameA = a.data.label.toUpperCase();
                                        let nameB = b.data.label.toUpperCase();
                                        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
                                    });
                    self.selectionList.unshift({
                        data: {
                            label: LABEL_DEFAULT
                        },
                        properties: null
                    });
                });
                break;
        }
    }
}