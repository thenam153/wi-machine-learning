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

function MachineTabsController($scope, $timeout, wiToken, wiApi, $http, wiDialog, ngDialog) {
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
    $scope.isActive = function(index) {
        return self.current_tab === index;
    }
    const REMOVE = 0;
    const ADD = 1;
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
    this.$onInit = async function() {
        wiApi.setBaseUrl(config.base_url);
        // wiApi.baseUrl = window.localStorage.getItem('__BASE_URL') || 'https://api-1.i2g.cloud';
        self.loginUrl = config.login;
        self.queryString = queryString.parse(location.search);
        self.token = wiToken.getToken();
        self.currentColor = 'rgb(6, 116, 218)';
        self.currentFontSize = '12px';
        self.selectedFontSize = 12;

        self.titleTabs = ['Dataset Selection', 'Model Selection', 'Training and Prediction'];
        self.steps = ['training', 'prediction', 'verify'];
        self.current_tab = 0;
        initMlProject();
        if (self.token && self.token.length) window.localStorage.setItem('token', self.token);
        self.restore();
    }
    this.changeTheme = function(color) {
        $("body").find(".menu").filter(function() {
            return ($(this).css("background-color") == self.currentColor);
        }).css("background", color);
        self.currentColor = color;
    }
    this.changeFontSize = function(size) {
        $("body").find("*").filter(function() {
            return ($(this).css("font-size") == self.currentFontSize);
        }).css("font-size", size);
        self.currentFontSize = size;
    }

    function initMlProject() {
        self.showSomVisualize = false;
        self.currentSelectedMlProject = null;
        self.mlProjectSelected = null;
        self.mlNameProject = null;
        self.mergeCurves = [];
        self.selectionList = [{
            data: {
                label: '[no choose]'
            },
        }];
        self.typeInput = 'curve';
        self.inputCurveSpecs = [
            {
                label: 'Target Curve',
                value: null,
                currentSelect: '[no choose]',
                isTarget: true,
                transform: 'linear',
            },{
                label: 'Input Curve',
                value: null,
                currentSelect: '[no choose]',
                transform: 'linear'
            }, {
                label: 'Input Curve',
                value: null,
                currentSelect: '[no choose]',
                transform: 'linear'
            }
        ];
        self.targetCurveSpec = {
            label: 'Target Curve',
            value: null,
            currentSelect: '[no choose]',
            transform: 'linear'
        };
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
        self.machineLearnSteps = {
            training: {
                datasets: [],
                selectionList: [],
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
        self.currentSelectedModel = self.listSelectionModel.classification[0].properties;
        self.currentSelectedTypeModel = self.listTypeModel[0].properties;
        self.currentSelectedModelLabel = self.listSelectionModel.classification;
    }
    // this.restore = function() {
    //     console.log(wiToken.getCurrentProjectName());
    //     self.curPrj = wiToken.getCurrentProjectName();
    //     if (self.curPrj) {
    //         ngDialog.open({
    //             template: 'templateRestore',
    //             className: 'ngdialog-theme-default',
    //             scope: $scope,
    //         });
    //         self.acceptRestore = function() {
    //             wiApi.getMlProjectListPromise()
    //                 .then((listMlProject) => {
    //                     let proj = listMlProject.find((i) => {
    //                         return i.name === wiToken.getCurrentProjectName();
    //                     });
    //                     if (proj) {
    //                         self.openMlProject(proj);
    //                     } else {
    //                         ngDialog.open({
    //                             template: 'templateConnectionError',
    //                             className: 'ngdialog-theme-default',
    //                             scope: $scope,
    //                         });
    //                         self.cancelReload = function() {
    //                             ngDialog.close();
    //                             $timeout(() => {
    //                                 location.reload();
    //                             }, 500)
    //                         }
    //                     }
    //                 });
    //         }
    //     } else {
    //         self.findAllProjects();
    //     }
    // }
    // this.delProject = function(project) {
    //     var dialog = ngDialog.open({
    //         template: 'templateDeleteProject',
    //         className: 'ngdialog-theme-default',
    //         scope: $scope,
    //     });
    //     self.acceptDeletePrj = function() {
    //         wiApi.deleteMlProjectPromise(project.idMlProject)
    //             .then((res) => {
    //                 toastr.success('Delete "' + res.name + '" Project Success', 'Success');
    //                 _.remove(self.allProjects, (d, i) => {
    //                     return d == project;
    //                 });
    //                 self.newMlProject();
    //                 dialog.close();
    //             })
    //             .catch((err) => {
    //                 toastr.error('Delete "' + project.name + '" Project Error', 'Error');
    //             })
    //     }
    //     self.cancelDeletePrj = function() {
    //         ngDialog.close();
    //     }
    // }
    // this.findAllProjects = function() {
    //     ngDialog.open({
    //         template: 'templateOpenProject',
    //         className: 'ngdialog-theme-default',
    //         scope: $scope,
    //     });
    //     wiApi.getMlProjectListPromise()
    //         .then((listMlProject) => {
    //             $timeout(() => {
    //                 self.allProjects = listMlProject.sort((a, b) => a.name.localeCompare(b.name));
    //             })
    //         });
    // }
    // this.createNewProject = function() {
    //     let projectName;
    //     if (!projectName) {
    //         ngDialog.open({
    //             template: 'templateNewPrj',
    //             className: 'ngdialog-theme-default',
    //             scope: $scope,
    //         });
    //         self.acceptNewPrj = function() {
    //             self.newMlProject();
    //             console.log(self.nameNewProject);
    //             saveWorkflow();
    //             wiApi.createMlProjectPromise({
    //                     name: self.nameNewProject,
    //                     content: self.workflow
    //                 })
    //                 .then((mlProject) => {
    //                     toastr.success('Create machine learing project success', 'Success')
    //                     $timeout(() => {
    //                         self.mlProjectSelected = mlProject;
    //                         self.currentSelectedMlProject = mlProject.name;
    //                         wiToken.setCurrentProjectName(mlProject.name);
    //                         ngDialog.close();
    //                     })
    //                 })
    //                 .catch((err) => {
    //                     toastr.error("Project's name already exists", 'Error')
    //                 })
    //                 .finally(() => {
    //                     self.nameNewProject = "";
    //                 })
    //         }
    //     }
    // }
    // this.renameProject = function() {
    //     let projectName;
    //     if (!projectName) {
    //         ngDialog.open({
    //             template: 'templateRenamePrj',
    //             className: 'ngdialog-theme-default',
    //             scope: $scope,
    //         });
    //         self.acceptRenamePrj = function() {
    //             saveWorkflow();
    //             wiApi.editMlProjectPromise({
    //                     name: self.currentSelectedMlProject,
    //                     idMlProject: self.mlProjectSelected.idMlProject,
    //                     content: self.workflow
    //                 })
    //                 .then((mlProject) => {
    //                     $timeout(() => {
    //                         toastr.success('Rename project success', 'Success');
    //                         wiToken.setCurrentProjectName(mlProject.name);
    //                         ngDialog.close();
    //                     })
    //                 })
    //                 .catch((err) => {
    //                     toastr.error('Rename project fail', 'Error');
    //                 })
    //         }
    //     }
    // }
    // this.saveMlProject = function() {
    //     if (self.mlProjectSelected) {
    //         saveWorkflow();
    //         wiApi.editMlProjectPromise({
    //                 name: self.mlProjectSelected.name,
    //                 idMlProject: self.mlProjectSelected.idMlProject,
    //                 content: self.workflow
    //             })
    //             .then((mlProject) => {
    //                 toastr.success('Save machine learning project success', 'Success');
    //                 wiToken.setCurrentProjectName(mlProject.name);
    //             })
    //             .catch((err) => {
    //                 toastr.error('Save machine learning project fail', 'Error');
    //             })
    //     } else {
    //         self.createNewProject();
    //     }
    // }
    // this.openMlProject = async function(mlProject) {
    //     if (!mlProject) return;
    //     console.log(mlProject);
    //     self.mlProjectSelected = mlProject;
    //     self.mlNameProject = mlProject.name;
    //     self.showDialogOpenMlProject = false;
    //     if (self.mlProjectSelected) {
    //         wiToken.setCurrentProjectName(mlProject.name);
    //         $timeout(async() => {
    //             self.sprinnerMl = true;
    //             self.mergeCurves = [];
    //             self.currentSelectedModelLabel = '';
    //             self.machineLearnSteps = {
    //                 training: {
    //                     datasets: [],
    //                     selectionList: [],
    //                     target: true,
    //                     name: 'Train',
    //                     index: 0
    //                 },
    //                 verify: {
    //                     datasets: [],
    //                     selectionList: [],
    //                     target: true,
    //                     name: 'Verify',
    //                     index: 1
    //                 },
    //                 prediction: {
    //                     datasets: [],
    //                     selectionList: [],
    //                     target: false,
    //                     name: 'Predict',
    //                     index: 2
    //                 }
    //             };
    //             // self.dataStepsForTrainPredict = angular.copy(self.machineLearnSteps);
    //             let content = self.mlProjectSelected.content;
    //             self.currentSelectedMlProject = self.mlProjectSelected.name;
    //             for (let i in content.steps) {
    //                 for (let j in content.steps[i].datasets) {
    //                     // let dataset = await wiApi.getDatasetInfoPromise(content.steps[i].datasets[j].idDataset);
    //                     let dataset = await wiApi.getDatasetInfoPromise(content.steps[i].datasets[j].idDataset);
    //                     let valueDataset = angular.copy(dataset);
    //                     if (equals(self.machineLearnSteps[i].datasets, valueDataset) < 0 && valueDataset.idDataset && valueDataset.idWell) {
    //                         // valueDatase
    //                         if (i == 'training') {
    //                             self.mergeCurves.push(valueDataset.curves);
    //                         } else {
    //                             // valueDataset.resultCurveName = content.steps[i].datasets[j].resultCurveName;
    //                             // valueDataset.patternCurveName = '_' + i.toUpperCase();
    //                         }
    //                         valueDataset.inputCurveSpecs = content.steps[i].datasets[j].inputCurveSpecs;
    //                         valueDataset.active = content.steps[i].datasets[j].active;
    //                         valueDataset.discrmnt = content.steps[i].datasets[j].discrmnt;
    //                         valueDataset.wellName = content.steps[i].datasets[j].wellName;
    //                         valueDataset.idProject = content.steps[i].datasets[j].idProject;
    //                         self.machineLearnSteps[i].datasets = _.concat(self.machineLearnSteps[i].datasets, valueDataset);
    //                     }
    //                 }
    //             }
    //             self.typeInput = content.type || 'curve';
    //             self.inputCurveSpecs = content.inputCurveSpecs;
    //             self.targetCurveSpec = content.targetCurveSpec;
    //             self.createSelectionList();
    //             // self.currentSelectedTypeModel = content.model.type;
    //             self.currentSelectedTypeModel = content.typeModel;
    //             self.currentSelectedModelLabel = content.model.label;
    //             self.currentSelectedModel = content.model;
    //             self.currentSelectedModel.sync = true;

    //             console.log(self.currentSelectedModel)
    //             self.stateWorkflow = content.stateWorkflow;
    //             if (self.stateWorkflow.model_id && (content.model.label === 'Supervise Som' || content.model.name === 'supervise_som' || content.model['som-visualization'])) {
    //                 $http({
    //                         method: 'GET',
    //                         url: `${content.model.url}/api/model/som/${self.stateWorkflow.model_id}`,
    //                     })
    //                     .then((res) => {
    //                         console.log(res);
    //                         if (res.status === 201) {
    //                             $timeout(() => {
    //                                 self.dataSomVisualize = res.data;
    //                                 self.showSomVisualize = true;
    //                             })
    //                         }
    //                     });
    //             } else {
    //                 $timeout(() => {
    //                     self.showSomVisualize = false;
    //                 })
    //             }
    //             self.sprinnerMl = false;
    //             toastr.success('Open machine learning project success', 'Success');
    //         });
    //         ngDialog.close();
    //     }
    // }
    // this.newMlProject = function() {
    //     $timeout(() => {
    //         // toastr.info('New machine learing project', 'Info');
    //         // $scope.nameMlProject = 'new project';
    //         self.mlNameProject = null;
    //         self.currentSelectedMlProject = null;
    //         self.dataSomVisualize = {
    //             distributionMaps: [{
    //                 "header": "feature_0",
    //                 'row': [{ "cells": [] }]
    //             }],
    //             visualizationMap: [{
    //                 "cells": [{
    //                     "features": [],
    //                     "label": null
    //                 }]
    //             }]
    //         }
    //         self.machineLearnSteps = {
    //             training: {
    //                 datasets: [],
    //                 selectionList: [],
    //                 target: true,
    //                 name: 'Train',
    //                 index: 0
    //             },
    //             verify: {
    //                 datasets: [],
    //                 selectionList: [],
    //                 target: true,
    //                 name: 'Verify',
    //                 index: 1
    //             },
    //             prediction: {
    //                 datasets: [],
    //                 selectionList: [],
    //                 target: false,
    //                 name: 'Predict',
    //                 index: 2
    //             }
    //         };
    //         self.stateWorkflow = {
    //             state: -1,
    //             waitResult: false,
    //             model_id: null,
    //             bucket_id: null
    //         }
    //         self.listSelectionModel = angular.copy(self.cacheListSelectionModel);
    //         self.mlProjectSelected = null;
    //         self.showSomVisualize = false;
    //         self.currentSelectedModel = self.listSelectionModel.classification[0].properties;
    //         self.currentSelectedTypeModel = self.listTypeModel[0].properties;
    //         self.currentSelectedModelLabel = self.listSelectionModel.classification[0].properties.label;
    //         self.inputCurveSpecs = [{
    //                 label: 'Input Curve',
    //                 value: null,
    //                 currentSelect: '[no choose]',
    //                 transform: 'linear'
    //             },
    //             {
    //                 label: 'Input Curve',
    //                 value: null,
    //                 currentSelect: '[no choose]',
    //                 transform: 'linear'
    //             }
    //         ];
    //         self.targetCurveSpec = {
    //             label: 'Target Curve',
    //             value: null,
    //             currentSelect: '[no choose]',
    //             transform: 'linear'
    //         };
    //         self.typeInput = 'curve';
    //         // initMlProject();
    //         self.nnConfig = { inputs: [], outputs: [], layers: [], container: {}, nLayer: 2, layerConfig: [{ label: 'label 0', value: 10 }, { label: 'label 1', value: 10 }] };
    //         self.updateNNConfig();
    //         wiToken.setCurrentProjectName('');
    //     })
    // }
    // function saveWorkflow() {
    //     let steps = angular.copy(self.machineLearnSteps);
    //     for (let i in steps) {
    //         steps[i].datasets = steps[i].datasets.map(d => {
    //             return {
    //                 inputCurveSpecs: d.inputCurveSpecs,
    //                 idDataset: d.idDataset,
    //                 name: d.name,
    //                 resultCurveName: d.resultCurveName,
    //                 active: d.active,
    //                 discrmnt: d.discrmnt,
    //                 wellName: d.wellName,
    //                 idProject: d.idProject,
    //                 // ofStep: d.ofStep,
    //             }
    //         })
    //     }
    //     let model = self.currentSelectedModel;
    //     let inputCurveSpecs = self.inputCurveSpecs.map(i => {
    //         return i
    //     })
    //     let targetCurveSpec = self.targetCurveSpec;
    //     //create content to post server
    //     self.workflow = {
    //         inputCurveSpecs: inputCurveSpecs,
    //         targetCurveSpec: targetCurveSpec,
    //         type: self.typeInput,
    //         typeModel: self.currentSelectedTypeModel,
    //         model: model,
    //         stateWorkflow: self.stateWorkflow,
    //         steps: steps
    //     }
    // }
    // 
    this.onChangeType = function(button) {
        self.typeInput = button.type;
        for (let index in self.inputCurveSpecs) {
            self.inputCurveSpecs[index] = {
                label: 'Input Curve',
                value: null,
                currentSelect: '[no choose]',
                transform: 'linear'
            }
        }
        // self.targetCurveSpec = {
        //     label: 'Target Curve',
        //     value: null,
        //     currentSelect: '[no choose]',
        //     transform: 'linear'
        // }
        self.createSelectionList();
        for (let i in self.machineLearnSteps) {
            self.handleDropDatasets(i);
        }
    }
    this.getFnOnInputChanged = function($index) {
        if (!functionCache[$index])
            functionCache[$index] = function(selectedItemProps) {
                self.inputCurveSpecs[$index].value = selectedItemProps;
                if (selectedItemProps) {
                    self.inputCurveSpecs[$index].currentSelect = selectedItemProps.name;
                } else {
                    self.inputCurveSpecs[$index].currentSelect = '[no choose]';
                }
                let handle = _.debounce(() => {
                    for (let i in self.machineLearnSteps) {
                        self.handleDropDatasets(i);
                    }
                }, 500);
                handle()
            }
        return functionCache[$index];
    }
    // this.onTargetItemChanged = function(selectedItemProps) {
    //     self.targetCurveSpec.value = selectedItemProps;
    //     if (selectedItemProps) {
    //         self.targetCurveSpec.currentSelect = selectedItemProps.name;
    //         // if(self.typeInput === 'curve') {
    //         //     self.machineLearnSteps['prediction'].datasets.forEach(e => {
    //         //         e.resultCurveName = selectedItemProps.name + e.patternCurveName;
    //         //     })
    //         // }else {
    //         //     self.machineLearnSteps['prediction'].datasets.forEach(e => {
    //         //         e.resultCurveName = e.patternCurveName;
    //         //     })
    //         // }
    //     } else {
    //         self.targetCurveSpec.currentSelect = '[no choose]';
    //     }
    //     let handle = _.debounce(() => {
    //         for (let i in self.machineLearnSteps) {
    //             self.handleDropDatasets(i);
    //         }
    //     }, 500);
    //     handle()
    // }
    this.onRemoveInputItem = function($index) {
        self.indexInputCurve = $index;
        self.formatCurve = REMOVE;
        if (self.inputCurveSpecs.length > 2) {
            self.inputCurveSpecs.splice($index, 1);
        }
        let handle = _.debounce(() => {
            for (let i in self.machineLearnSteps) {
                self.handleDropDatasets(i, $index, REMOVE);
            }
        }, 500);
        handle()
    }
    this.onAddInputItem = function() {
        console.log('add');
        self.indexInputCurve = self.inputCurveSpecs.length - 1;
        self.formatCurve = ADD;
        self.inputCurveSpecs = _.concat(self.inputCurveSpecs, {
            label: 'Input Curve',
            value: null,
            currentSelect: '[no choose]',
            transform: 'linear'
        })
        let handle = _.debounce(() => {
            for (let i in self.machineLearnSteps) {
                self.handleDropDatasets(i, self.inputCurveSpecs.length - 1, ADD);
            }
        }, 500);
        handle()
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
                        let valueDataset = angular.copy(node);
                        if (equals(self.machineLearnSteps[step].datasets, valueDataset) < 0 && valueDataset.idDataset && valueDataset.idWell) {
                            valueDataset.active = true;
                            valueDataset._selected = false;
                            if (step == 'training') {
                                self.mergeCurves.push(valueDataset.curves);
                                self.machineLearnSteps[step].datasets = _.concat(self.machineLearnSteps[step].datasets, valueDataset);
                                self.handleDropDatasets(step);
                            } else if (self.machineLearnSteps[step].datasets.length == 0 || self.machineLearnSteps[step].datasets[0].idProject === valueDataset.idProject) {
                                // valueDataset.resultCurveName = valueDataset.patternCurveName = '_' + step.toUpperCase();
                                self.machineLearnSteps[step].datasets = _.concat(self.machineLearnSteps[step].datasets, valueDataset);
                                self.handleDropDatasets(step);
                            } else {
                                toastr.error('Please drop dataset from same project')
                            }
                        }
                    }
                    self.createSelectionList();
                    // var handle = _.debounce(() => {self.handleDropDatasets(step)}, 1000);  
                    // handle();
                })
            }
        }
        return functionCacheSteps[step].drop;
    }
    this.onRemoveDataset = function(step, $index) {
        $timeout(() => {
            self.machineLearnSteps[step].datasets = _.remove(self.machineLearnSteps[step].datasets, (dataset, index) => {
                if (step == 'training') {
                    if (index === $index) {
                        self.mergeCurves.splice(index, 1);
                    }
                }
                return index !== $index;
            });
            self.createSelectionList();
            self.handleDropDatasets(step);
        });
    }
    this.createSelectionList = function() {
        var curves = _.intersectionBy(...self.mergeCurves, 'name');
        let selectionList = [{
            data: {
                label: '[no choose]'
            },
            properties: null
        }];
        switch (self.typeInput) {
            case 'family_curve':
                console.log('run');
                (async() => {
                    for (let curve of curves) {
                        let familyCurve = await wiApi.getFamily(curve.idFamily);
                        if (!familyCurve) continue;
                        let dataInformation = {
                            data: {
                                label: familyCurve.name
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
                    $timeout(() => {
                        selectionList = _.uniqBy(selectionList, 'data.label');
                        self.selectionList = angular.copy([selectionList.shift(), ...selectionList.sort((a, b) => {
                            let nameA = a.data.label.toUpperCase();
                            let nameB = b.data.label.toUpperCase();
                            return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
                        })]);
                    });
                })();
                break;
            case 'main_family':
                (async() => {
                    let familyGroups = [];
                    for (let curve of curves) {
                        let familyCurve = await wiApi.getFamily(curve.idFamily);
                        if (!familyCurve) continue;

                        let dataInformation = {
                            data: {
                                label: familyCurve.familyGroup
                            },
                            properties: {
                                familyGroup: familyCurve.familyGroup,
                                name: familyCurve.familyGroup
                            },
                            icon: 'family-group-16x16'
                        }
                        selectionList.push(dataInformation);
                    }
                    $timeout(() => {
                        selectionList = _.uniqBy(selectionList, 'data.label');
                        self.selectionList = angular.copy([selectionList.shift(), ...selectionList.sort((a, b) => {
                            let nameA = a.data.label.toUpperCase();
                            let nameB = b.data.label.toUpperCase();
                            return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
                        })]);
                    });
                })();
                break;
            default:
                for (let curve of curves) {
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
                $timeout(() => {
                    self.selectionList = angular.copy([selectionList.shift(), ...selectionList.sort((a, b) => {
                        let nameA = a.data.label.toUpperCase();
                        let nameB = b.data.label.toUpperCase();
                        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
                    })]);
                });
        }
    }
    this.handleDropDatasets = function(step, index = -1, type = null) {
        handleCreateSelectionList(self.machineLearnSteps[step], step, index, type);
        self.updateNNConfig();
        self.updateInputModel();
        self.updateNameResult();
    }

    function handleCreateSelectionList(dataStep, step, index = -1, type = null) {
        let inputSpecs = [...self.inputCurveSpecs, self.targetCurveSpec];
        let mergeCurves = [];
        for (let dataset of dataStep.datasets) {
            if (!dataset.inputCurveSpecs) {
                dataset.inputCurveSpecs = dataStep.target ? new Array(self.inputCurveSpecs.length + 1) : new Array(self.inputCurveSpecs.length);
            }
            if (index != -1 && type == ADD) {
                if (dataStep.target) {
                    dataset.inputCurveSpecs.splice(index, 0, {
                        label: 'Input Curve',
                        value: null,
                        currentSelect: '[no choose]',
                        transform: 'linear'
                    });
                } else {
                    dataset.inputCurveSpecs.splice(index, 0, {
                        label: 'Input Curve',
                        value: null,
                        currentSelect: '[no choose]',
                        transform: 'linear'
                    });
                }
            }
            if (index != -1 && type == REMOVE) {
                if (dataStep.target) {
                    dataset.inputCurveSpecs.splice(index, 1);
                } else {
                    dataset.inputCurveSpecs.splice(index, 1);
                }
            }
            mergeCurves.push(dataset.curves);
        }
        let curves = _.intersectionBy(...mergeCurves, 'name');
        dataStep.selectionList = dataStep.selectionList ? new Array(self.inputCurveSpecs.length + 1) : new Array(self.inputCurveSpecs.length);
        if (self.typeInput === 'curve') {
            for (let i = 0; i < dataStep.selectionList.length; i++) {
                if (!dataStep.selectionList[i]) dataStep.selectionList[i] = [];
                let c = curves.find((t) => {
                    return t.name === inputSpecs[i].currentSelect;
                })
                dataStep.selectionList[i] = c ? [{
                    data: {
                        label: inputSpecs[i].currentSelect
                    },
                    properties: inputSpecs[i].value
                }] : [{
                    data: {
                        label: '[no choose]'
                    },
                    properties: null
                }]
            }
        } else if (curves && curves.length) {
            for (let curve of curves) {
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
                switch (self.typeInput) {
                    case 'curve':
                        for (let i = 0; i < dataStep.selectionList.length; i++) {
                            if (!dataStep.selectionList[i]) dataStep.selectionList[i] = [{
                                data: {
                                    label: '[no choose]'
                                },
                                properties: null
                            }];
                            dataStep.selectionList[i].push(dataInformation);
                        }
                        break;
                    case 'family_curve':
                        for (let i = 0; i < dataStep.selectionList.length; i++) {
                            if (!dataStep.selectionList[i]) dataStep.selectionList[i] = [{
                                data: {
                                    label: '[no choose]'
                                },
                                properties: null
                            }];
                            if ((curve.idFamily == (inputSpecs[i].value || {}).idFamily) && curve.idFamily) dataStep.selectionList[i].push(dataInformation);
                        }
                        break;
                    case 'main_family':
                        (async() => {
                            try {
                                let mainFamily = await wiApi.getFamily(curve.idFamily);
                                if (mainFamily) {
                                    for (let i = 0; i < dataStep.selectionList.length; i++) {
                                        if (!dataStep.selectionList[i]) dataStep.selectionList[i] = [{
                                            data: {
                                                label: '[no choose]'
                                            },
                                            properties: null
                                        }];
                                        if (mainFamily.familyGroup == (inputSpecs[i].value || {}).familyGroup) dataStep.selectionList[i].push(dataInformation);
                                    }
                                }
                            } catch (e) {
                                console.log(e);
                            }
                        })();
                        break;
                }
            }
        } else {
            for (let i = 0; i < dataStep.selectionList.length; i++) {
                if (!dataStep.selectionList[i]) dataStep.selectionList[i] = [{
                    data: {
                        label: '[no choose]'
                    },
                    properties: null
                }];
            }
        }

        for (let dataset of dataStep.datasets) {
            if (self.typeInput === 'curve') {
                // dataset.inputCurveSpecs = angular.copy(inputSpecs);
                for (let i = 0; i < dataset.inputCurveSpecs.length; i++) {
                    if (!dataset.inputCurveSpecs[i]) {
                        dataset.inputCurveSpecs[i] = {
                            label: 'Input Curve',
                            value: null,
                            currentSelect: '[no choose]',
                            transform: 'linear'
                        }
                    }
                    let c = dataStep.selectionList[i].find((t) => {
                        return t.data.label === inputSpecs[i].currentSelect;
                    });
                    if (c) {
                        dataset.inputCurveSpecs[i] = angular.copy(inputSpecs[i]);
                    } else {
                        dataset.inputCurveSpecs[i] = {
                            label: 'Input Curve',
                            value: null,
                            currentSelect: '[no choose]',
                            transform: 'linear'
                        }
                    }
                }
                // if(step === 'verify') {
                //     let name = dataset.inputCurveSpecs[dataset.inputCurveSpecs.length - 1].currentSelect;
                //     dataset.resultCurveName = name === '[no choose]' ?  dataset.patternCurveName : name + dataset.patternCurveName;
                // }
                // if(step === 'prediction') {
                //     dataset.resultCurveName = self.targetCurveSpec.currentSelect === '[no choose]' ?  dataset.patternCurveName : self.targetCurveSpec.currentSelect + dataset.patternCurveName;
                // }
            } else {
                for (let i = 0; i < dataset.inputCurveSpecs.length; i++) {
                    if (!dataset.inputCurveSpecs[i]) {
                        dataset.inputCurveSpecs[i] = {
                            label: 'Input Curve',
                            value: null,
                            currentSelect: '[no choose]',
                            transform: 'linear'
                        }
                    } else {
                        if (dataStep.selectionList[i]) {
                            let input = dataStep.selectionList[i].find(d => {
                                return dataset.inputCurveSpecs[i].currentSelect === d.data.label;
                            });
                            if (!input) {
                                if (dataStep.selectionList[i][1]) {
                                    dataset.inputCurveSpecs[i] = {
                                        label: 'Input Curve',
                                        value: dataStep.selectionList[i][1].properties,
                                        currentSelect: dataStep.selectionList[i][1].data.label
                                    }
                                } else {
                                    dataset.inputCurveSpecs[i] = {
                                        label: 'Input Curve',
                                        value: null,
                                        currentSelect: '[no choose]'
                                    }
                                }
                                // dataset.resultCurveName = dataset.patternCurveName;
                            } else {
                                if (!input.properties && dataStep.selectionList[i][1]) {
                                    dataset.inputCurveSpecs[i] = {
                                        label: 'Input Curve',
                                        value: dataStep.selectionList[i][1].properties,
                                        currentSelect: dataStep.selectionList[i][1].data.label
                                    }
                                }
                            }
                        }
                        // if(step === 'verify') {
                        //     let name = dataset.inputCurveSpecs[dataset.inputCurveSpecs.length - 1].currentSelect;
                        //     dataset.resultCurveName = name === '[no choose]' ?  dataset.patternCurveName : name + dataset.patternCurveName;
                        // }
                        // if(step === 'prediction') {
                        //     let ds = self.machineLearnSteps.training.datasets[0];
                        //     if(ds) {
                        //         let name = ds.inputCurveSpecs[ds.inputCurveSpecs.length - 1].currentSelect;
                        //         dataset.resultCurveName = name === '[no choose]' ?  dataset.patternCurveName : name + dataset.patternCurveName;
                        //     }
                        // }
                    }
                }
            }
        }
    }
    this.updateNameResult = function() {
            if (self.machineLearnSteps.training.datasets.length) {
                let dataset = self.machineLearnSteps.training.datasets[0];
                let length = dataset.inputCurveSpecs.length;
                let value = dataset.inputCurveSpecs[length - 1].value;
                if (dataset.inputCurveSpecs[length - 1].value) {
                    let name = dataset.inputCurveSpecs[length - 1].currentSelect;
                    self.machineLearnSteps.prediction.datasets.forEach((i) => {
                        i.resultCurveName = `${name}-${self.currentSelectedModel.infix}-Prediction`;
                    })
                } else {
                    self.machineLearnSteps.prediction.datasets.forEach((i) => {
                        i.resultCurveName = `-${self.currentSelectedModel.infix}-Prediction`;
                    })
                }
            }

            if (self.machineLearnSteps.verify.datasets.length) {
                self.machineLearnSteps.verify.datasets.forEach((i) => {
                    let name = i.inputCurveSpecs[i.inputCurveSpecs.length - 1].currentSelect;
                    let value = i.inputCurveSpecs[i.inputCurveSpecs.length - 1].value;
                    i.resultCurveName = !value ? `-${self.currentSelectedModel.infix}-Verify` : `${name}-${self.currentSelectedModel.infix}-Verify`;
                })
            }
        }
        // ===================================================================================================

    function initModels() {
        self.listTypeModel = [{
                data: {
                    label: 'Classification'
                },
                properties: {
                    type: 'classification',
                    label: 'Classification'
                }
            },
            {
                data: {
                    label: 'Regression'
                },
                properties: {
                    type: 'regression',
                    label: 'Regression'
                }
            }
        ];
        self.listSelectionModel = {}
        self.listTypeModel = [];
        const dataJsonModels = require('../../wi-uservice.json');
        for (let t of dataJsonModels.type) {
            self.listTypeModel.push({
                data: {
                    label: t.label
                },
                properties: {
                    type: t.type,
                    label: t.label
                }
            })
        }
        for (let t of self.listTypeModel) {
            self.listSelectionModel[t.properties.type] = [];
            for (let j of dataJsonModels.model) {
                if (j.type === t.properties.type) {
                    self.listSelectionModel[t.properties.type].push({
                        data: {
                            label: j.label
                        },
                        properties: j
                    })
                }
            }
        }
        self.cacheListSelectionModel = angular.copy(self.listSelectionModel);
    }
    initModels();
    this.nnConfig = { inputs: [], outputs: [], layers: [], container: {}, nLayer: 2, layerConfig: [{ label: 'label 0', value: 10 }, { label: 'label 1', value: 10 }] };

    function updateNNConfig() {
        self.nnConfig.inputs = self.inputCurveSpecs.map(i => {
            return {
                label: i.currentSelect,
                name: i.currentSelect,
                value: i.currentSelect,
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
        $timeout(function() {
            if (self.nnConfig.container.wiNNCtrl) {
                console.log('update layers');
                self.nnConfig.container.wiNNCtrl.update(self.nnConfig);
            }
        });
    }
    this.updateNNConfig = _.debounce(updateNNConfig);
    setInterval(self.updateNNConfig(), 1000);
    this.nnConfigNLayerChanged = function(nLayer) {
        self.nnConfig.nLayer = nLayer;
        let params = self.currentSelectedModel.payload.params;
        let layer = (params || []).find(i => {
            return i.name === 'hidden_layer_sizes';
        })
        if (self.nnConfig.nLayer < self.nnConfig.layerConfig.length) {
            layer.value.splice(self.nnConfig.nLayer, self.nnConfig.layerConfig.length - self.nnConfig.nLayer);
            self.nnConfig.layerConfig.splice(self.nnConfig.nLayer, self.nnConfig.layerConfig.length - self.nnConfig.nLayer);
        } else {
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
        if(!isNaN(value)) {
            self.nnConfig.layerConfig[index].value = parseInt(value);
            let layer = (self.currentSelectedModel.payload.params || []).find(i => {
                return i.name === 'hidden_layer_sizes';
            })
            layer.value[index] = parseInt(value);
        }
        self.updateNNConfig();
    }
    this.updateLayer = function() {
        if (self.currentSelectedModel && self.currentSelectedModel.nnnw) {
            let params = self.currentSelectedModel.payload.params;
            let layer = (params || []).find(i => {
                return i.name === 'hidden_layer_sizes';
            })
            if (layer.value) {
                self.nnConfig.nLayer = layer.value.length;
                self.nnConfig.layerConfig = layer.value.map((i, idx) => {
                    return { label: 'Layer ' + idx, value: i }
                })
            } else if (layer.example) {
                self.nnConfig.nLayer = layer.example.length;
                self.nnConfig.layerConfig = layer.example.map((i, idx) => {
                    return { label: 'Layer ' + idx, value: i }
                })
            }
        }
        self.updateNNConfig();
    }
    this.tab = 1;
    this.setTab = function(idx) {
        self.tab = idx;
    }
    this.isSet = function(tabNum) {
        return self.tab === tabNum;
    };
    this.onModelChanged = function(modelSelectedProps) {
        console.log(modelSelectedProps);
        if (!modelSelectedProps) return;
        self.currentSelectedModel = self.currentSelectedModel.sync ? Object.assign(modelSelectedProps, { payload: self.currentSelectedModel.payload }) : modelSelectedProps;
        // self.currentSelectedModel = self.currentSelectedModel.sync ? Object.assign(modelSelectedProps, self.currentSelectedModel) : modelSelectedProps;
        self.updateInputModel();
        self.currentSelectedModel.sync = false;
        self.currentSelectedModelLabel = self.currentSelectedModel.label;
        console.log(self.currentSelectedModel)
        if (!self.currentSelectedModel.nnnw) {
            $timeout(() => {
                self.tab = 1;
            })
            let element = document.getElementById("tab-layer");
            element.classList.add("hide");
            let changePosition = document.getElementById("model-selection");
            changePosition.classList.add("position-static");
        } else {
            self.updateLayer();
            let element = document.getElementById("tab-layer");
            element.classList.remove("hide");
            let changePosition = document.getElementById("model-selection");
            changePosition.classList.remove("position-static");
        }
        let handle = _.debounce(() => {
            for (let i in self.machineLearnSteps) {
                self.handleDropDatasets(i);
            }
        }, 500);
        handle()
    }
    this.setTypeModel = function(type) {
        self.currentSelectedTypeModel = type;
    }
    let fnSetValue = {};
    this.getFnSetValueElModel = function(type) {
        if (type === 'params') {
            if (!fnSetValue.params) {
                fnSetValue.params = function(param, value) {
                    console.log(param, value);
                    let item = self.currentSelectedModel.payload.params.find(i => {
                        return i.name == param
                    })
                    value = validate(item.type, value);
                    if (value === '') value = item.example;
                    // this.itemValue = value;
                    item.value = value;
                }
            }
            return fnSetValue.params;
        } else {
            if (!fnSetValue.train) {
                fnSetValue.train = function(param, value) {
                    console.log(param, value);
                    let item = self.currentSelectedModel.payload.train.find(i => {
                        return i.name == param
                    })
                    value = validate(item.type, value);
                    if (value === '') value = item.example;
                    item.value = value;
                }
            }
            return fnSetValue.train;
        }
    }
    let fnSetValueEnum = {
        params: {},
        train: {}
    };
    this.getFnSetValueElEnumModel = function(param, type) {
        if (type === 'params') {
            if (!fnSetValueEnum.params[param]) {
                fnSetValueEnum.params[param] = function(props) {
                    let item = self.currentSelectedModel.payload.params.find(i => {
                        return i.name == param
                    })
                    if (item) {
                        item.value = props;
                    }
                    console.log(item, props, param);
                }
            }
            return fnSetValueEnum.params[param];
        } else {
            if (!fnSetValueEnum.train[param]) {
                fnSetValueEnum.train[param] = function(props) {
                    let item = self.currentSelectedModel.payload.train.find(i => {
                        return i.name == param
                    })
                    if (item) {
                        item.value = props;
                    }
                    console.log(item, props, param);
                }
            }
            return fnSetValueEnum.train[param];
        }
    }

    function validate(type, value) {
        switch (type) {
            case 'string':
                return value;

            case 'integer':
                value = Number(value);
                if (Number.isInteger(value)) {
                    return value;
                }
                return '';
            case 'number':
                value = Number(value);
                if (!isNaN(value)) {
                    return value;
                }
                return '';
            case 'boolean':
                if (value.toString().toLowerCase() == 'true') {
                    // return 'true';
                    return true;
                }
                if (value.toString().toLowerCase() == 'false') {
                    // return 'false';
                    return false;
                }
                return '';
            case 'float':
                value = parseFloat(value);
                if (!isNaN(value)) {
                    return value;
                }
                return '';
            case 'array':

                value = value.toString().replace(/\s/g, '').split(',');
                console.log(value);
                return ([...new Set(value)]);
            default:
                return '';
        }
    }
    // =====================================================================
    const TRAIN_STEP_NAME = 'Train';
    const VERIFY_STEP_NAME = 'Verify';
    const PREDICT_STEP_NAME = 'Predict';

    const TRAIN_STEP_STATE = 'training';
    const VERIFY_STEP_STATE = 'verify';
    const PREDICT_STEP_STATE = 'prediction';

    const ML_TOOLKIT = 'regression';
    const ML_TOOLKIT_CLASSIFICATION = 'classification';

    this.onToggleActiveOutput = function(dataset) {
        $timeout(() => {
            dataset.active = !dataset.active;
        })
    }
    this.setOnItemCurveChanged = function(dataset, index, item) {
        console.log(dataset, index, item);
        dataset.inputCurveSpecs[index].value = item.properties;
        dataset.inputCurveSpecs[index].currentSelect = item.data.label;

        self.updateNameResult();
    }
    this.onDiscriminator = function(dataset) {
        wiDialog.discriminator(dataset.discrmnt, dataset.curves, function(res) {
            dataset.discrmnt = res;
            console.log(res);
        })
    }

    function httpPromise(url, data, method, options = {}) {
        return new Promise(function(resolve, reject) {
            $http({
                method: method,
                url: url,
                data: data,
                headers: {
                    service: options.service
                }
            }).then((response) => {
                // console.log(response);
                if (response.status === 200) resolve(response.data);
                if (response.status === 201) resolve(response.data);
                else reject(new Error(response.data.reason));
            }, (err) => {
                if (err.status === 400 && err.data.status === 'existed') {
                    resolve({ existed: true });
                }
                reject(err);
            })
        });
    }

    function postCreateModel(payload) {
        return httpPromise(`${self.currentSelectedModel.url}/api/model/create/${self.currentSelectedModel.create}`, payload, 'POST', { service: self.currentSelectedModel.service });
    }

    function postCreateBucketId(payload) {
        return httpPromise(`${self.currentSelectedModel.url}/api/data`, payload, 'POST', { service: self.currentSelectedModel.service });
    }

    function putDataOfTrain(payload) {
        return httpPromise(`${self.currentSelectedModel.url}/api/data`, payload, 'PUT', { service: self.currentSelectedModel.service });
    }

    function postTrainByBucketData(payload) {
        return httpPromise(`${self.currentSelectedModel.url}/api/model/train_by_bucket_data`, payload, 'POST', { service: self.currentSelectedModel.service });
    }

    function postPredict(payload) {
        return httpPromise(`${self.currentSelectedModel.url}/api/model/predict`, payload, 'POST', { service: self.currentSelectedModel.service });
    }

    function getBucket() {
        return httpPromise(`${self.currentSelectedModel.url}/api/bucket/list`, {}, 'GET', { service: self.currentSelectedModel.service });
    }

    function fillNullInCurve(fillArr, curve, cb) {
        // async.forEachOfSeries(curvesArray, function (curve, j, done) {
        for (let i in fillArr) {
            curve.value.splice(fillArr[i], 0, NaN);
        }

        cb && cb(curve);
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
        if (curves.length) {
            for (let i = 0; i < curves.length; i++) {
                let curve = dataset.curves.find(c => {
                    return c.name === curves[i].value.name;
                })
                if (!curve) callback([]);
                let curveData = await wiApi.getCurveDataPromise(curve.idCurve);
                listInputCurves[i] = curveData.map(function(d) {
                    return parseFloat(d.x);
                });
            }
            callback && callback(listInputCurves);
        } else {
            callback && callback([]);
        }
    }

    function getDataCurveAndFilter(dataset, curves, callback) {
        return new Promise((resolve, reject) => {
            let arrNaN = [];
            let inputCurveData = [];
            // console.log(dataset);
            async.eachSeries(dataset.inputCurveSpecs, function(input, _cb) {
                (async() => {
                    let curve = dataset.curves.find(i => {
                        return i.name === input.currentSelect;
                    });
                    let dataCurve = await wiApi.getCurveDataPromise(curve.idCurve);
                    for (let i in dataCurve) {
                        dataCurve[i] = parseFloat(dataCurve[i].x, 4);
                        if (isNaN(dataCurve[i])) curves[i] = false;
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
                for (let i in inputCurveData) {
                    if (length > inputCurveData[i].length) length = inputCurveData[i].length;
                }
                for (let i = 0; i < inputCurveData.length; i++) {
                    if (inputCurveData[i].length > length) {
                        inputCurveData[i].splice(length, inputCurveData[i].length - length);
                    }
                    for (let j = 0; j < inputCurveData[i].length; j++) {
                        if (!cacheInputCurveData[i]) cacheInputCurveData[i] = [];
                        if (curves[j]) {
                            cacheInputCurveData[i].push(inputCurveData[i][j]);
                        }
                    }
                }
                inputCurveData = cacheInputCurveData;
                resolve(inputCurveData);
            });
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
                    condition.children.forEach(function(child) {
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
                if (typeof discriminator !== 'undefined' && !discriminator.active) { return true; }
                if (condition && condition.children && condition.children.length) {
                    let left = evaluate(condition.children[0], index);
                    let right = evaluate(condition.children[1], index);
                    switch (condition.operator) {
                        case 'and':
                            return left && right;
                        case 'or':
                            return left || right;
                    }
                } else if (condition && condition.left && condition.right) {
                    let leftCurve = curvesData.find(function(curve) {
                        return curve.name == condition.left.value;
                    });
                    let left = leftCurve ? parseFloat(leftCurve.data[index]) : null;

                    let right = condition.right.value;
                    if (condition.right.type == 'curve') {
                        let rightCurve = curvesData.find(function(curve) {
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
                function(curve, i, done) {
                    // console.log('curve of curve arr',curve);
                    if (curve) {
                        (async() => {
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
                function(err) {
                    console.log('done!', curvesData);
                    (async() => {
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
    async function saveCurveAndCreatePlot(_step, curveInfo, dataset, callback, errorCurveInfo) {
        saveCurve(curveInfo, dataset, function(curveProps) {
            function handle(errorCurveInfo) {
                let orderNum = dataset.idDataset.toString() + '1';
                // delete curveInfo.data;
                let errorCurve = null;
                let inCurves = dataset.inputCurveSpecs.map((ipt) => {
                    // return ipt;
                    let i = dataset.curves.find((ip) => {
                        return ip.name === ipt.value.name
                    });
                    return i;
                });
                inCurves.push({
                    idCurve: curveProps.idCurve,
                    name: curveProps.name,
                    idFamily: curveProps.idFamily
                });
                if (errorCurveInfo) {
                    inCurves.push({
                        idCurve: errorCurveProps.idCurve,
                        name: errorCurveProps.name,
                        idFamily: idFamily,
                        minValue: (errorCurveInfo | {}).minValue,
                        maxValue: (errorCurveInfo | {}).maxValue
                    })
                }
                createLogPlot(_step, dataset, inCurves, orderNum, function() {
                    callback();
                });
            }
            handle();
        })
    }
    async function saveCurve(curveInfo, dataset, callback) {
        let payload = {
            idDataset: curveInfo.idDataset,
            data: curveInfo.data,
            unit: curveInfo.unit || undefined,
            idFamily: curveInfo.idFamily || null,
        }
        if (dataset.step == 0) {
            let curveData = await wiApi.getCurveDataPromise(dataset.curves[0].idCurve);
            payload.data = curveData.map((d, i) => {
                return [parseFloat(d.y), curveInfo.data[i]];
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

    function createLogPlot(_step, dataset, inCurves, orderNum, callback) {
        console.log('_step', _step);
        let idPlot = _step.plot.idPlot;
        let currentOrderNum = orderNum;
        wiApi.createDepthTrackPromise({
                idPlot: idPlot,
                width: 0.75,
                orderNum: currentOrderNum.slice(0, currentOrderNum.length - 1) + '0',
                widthUnit: 'inch',
                idWell: dataset.idWell
            })
            .then((res) => {
                async.eachOfSeries(inCurves, function(curve, i, done) {
                    wiApi.createLogTrackPromise({
                            idPlot: idPlot,
                            orderNum: currentOrderNum,
                            title: curve.name,
                            width: 1
                        })
                        .then((trackData) => {
                            if (!trackData) {
                                done();
                            } else {
                                wiApi.createLinePromise({
                                        idTrack: trackData.idTrack,
                                        idCurve: curve.idCurve,
                                        orderNum: currentOrderNum
                                    })
                                    .then((line) => {
                                        // toastr.success('Create log plot success', 'Success')
                                        if (line) { //scale
                                            if (curve.minValue != undefined && curve.maxValue != undefined) {
                                                line.minValue = curve.minValue;
                                                line.maxValue = curve.maxValue;
                                                wiApi.editLinePromise(line, function() {
                                                    done();
                                                });
                                            } else
                                                done();
                                        } else done();
                                    })
                            }

                        })
                }, function(err) {
                    if (err) {
                        callback(err);
                    } else {
                        toastr.success('Create log plot success', 'Success');
                        callback();
                    }
                })
            })
            // callback();
    }

    function isRun(dataset) {
        // if(!dataset.active) return false;
        let isValid = true;
        for (let i of dataset.inputCurveSpecs) {
            if (i.currentSelect == '[no choose]') {
                isValid = false;
                break;
            }
        }
        return isValid;
    }
    // this.model_id = null;
    this.runAll = async function() {
        self.sprinnerMl = true;
        createModelAndBucketId()
            .then(() => {
                return train();
            })
            .then(() => {
                if(!self.machineLearnSteps[VERIFY_STEP_STATE].datasets || !self.machineLearnSteps[VERIFY_STEP_STATE].datasets.length) {
                    return;
                }
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
                    self.sprinnerMl = false;
                })
            })
    }
    this.runTask = function(step) {
        self.sprinnerMl = true;
        switch (step) {
            case -1:
                createModelAndBucketId()
                    .then((res) => {
                        self.runTask(0);
                    })
                    .catch(err => {
                        console.error(err);
                        $timeout(() => {
                            self.sprinnerMl = false;
                        })
                    })
                    // .finally(() => {
                    //     $timeout(() => {
                    //         self.sprinnerMl = false;                       
                    //     })
                    // })
                break;
            case 0:
                train()
                    .then(data => {
                        console.log('run', step, data);
                    })
                    .catch(err => {
                        console.error(err)
                    })
                    .finally(() => {
                        $timeout(() => {
                            self.sprinnerMl = false;
                        })
                    })
                break;
            case 1:
                verify()
                    .then(() => {
                        console.log('run', step);
                    })
                    .catch(err => {
                        console.error(err)
                    })
                    .finally(() => {
                        $timeout(() => {
                            self.sprinnerMl = false;
                        })
                    })
                break;
            case 2:
                prediction()
                    .then(() => {
                        console.log('run', step);
                    })
                    .catch(err => {
                        console.error(err)
                    })
                    .finally(() => {
                        $timeout(() => {
                            self.sprinnerMl = false;
                        })
                    })
                break;
        }
    }

    function train() {
        return new Promise((resolve, reject) => {
            if (!self.machineLearnSteps[TRAIN_STEP_STATE].datasets.length) {
                toastr.error('Dataset is not none', 'Error');
                return reject(new Error('Please drop dataset'))
            }
            async.each(self.machineLearnSteps[TRAIN_STEP_STATE].datasets, function(dataset, _cb) {
                if (!isRun(dataset)) {
                    toastr.error('Curve in dataset is not [no choose]', 'Error');
                    return reject(new Error('Please select curve for dataset'));
                }
                if (!dataset.active) return _cb();
                evaluateExpr(dataset, dataset.discrmnt)
                    .then((curves) => {
                        return getDataCurveAndFilter(dataset, curves)
                    })
                    .then((dataCurves) => {
                        let payload = {
                            bucket_id: self.stateWorkflow.bucket_id,
                            data: dataCurves
                        }
                        return putDataOfTrain(payload)
                    })
                    .then((res) => {
                        console.log('put data success', res);
                        _cb();
                    })
                    .catch(err => {
                        reject(err);
                    });
            }, async function(err) {
                let request = createPayloadForTrain();
                postTrainByBucketData(request)
                    .then((res) => {
                        toastr.success('Train success', 'Success');
                        // doAfterTrain(res, function() {
                        //     resolve(res);
                        // });
                        return doAfterTrain(res);
                    })
                    .then(() => {
                        toastr.success('Do after train success', 'Success');
                        self.stateWorkflow.state = 0;
                        self.saveMlProject()
                        resolve();
                    })
                    .catch((err) => {
                        toastr.error('Something was wrong', 'Error');
                        reject(err)
                    })
            })
        })
    }

    function verify() {
        return new Promise((resolve, reject) => {
            if (self.stateWorkflow.state === -1) {
                toastr.error('Train before verify', 'Error');
                reject(new Error('Please train before verify'));
            }
            if (!self.machineLearnSteps[VERIFY_STEP_STATE].datasets) {
                toastr.error('Dataset is not none', 'Error');
                return reject(new Error('Please drop dataset'))
            }
            createBlankPlot(self.machineLearnSteps[VERIFY_STEP_STATE], 'Verification Plot')
                .then((res) => {
                    self.machineLearnSteps[VERIFY_STEP_STATE].plot = res;
                    self.machineLearnSteps[VERIFY_STEP_STATE].plot.username = localStorage.getItem('username') || ''
                    async.each(self.machineLearnSteps[VERIFY_STEP_STATE].datasets, function(dataset, _cb) {
                        if (!isRun(dataset)) {
                            toastr.error('Curve in dataset is not [no choose]', 'Error');
                            return reject(new Error('Please select curve for dataset'));
                        }
                        if (!dataset.active) return _cb();
                        evaluateExpr(dataset, dataset.discrmnt)
                            .then(function(curves) {
                                return getDataCurveAndFilter(dataset, curves)
                            })
                            .then(async function(dataCurves) {
                                let targetFilter = dataCurves.pop();
                                let payload = {
                                    features: dataCurves,
                                    model_id: self.stateWorkflow.model_id
                                }
                                return postPredict(payload)
                            })
                            .then((res) => {
                                toastr.success('Verify success', 'Success');
                                return doAfterVerify(res, dataset);
                            })
                            .then((res) => {
                                _cb();
                            })
                            .catch(err => {
                                // toastr.error('Some thing went wrong', 'Error');
                                // _cb(err);
                                reject(err);
                            });

                    }, err => {
                        // self.saveMlProject();
                        self.stateWorkflow.state = 1;
                        self.saveMlProject()
                        resolve();
                    });
                })
        })
    }

    function prediction() {
        return new Promise((resolve, reject) => {
            if (self.stateWorkflow.state === -1) {
                toastr.error('Train before prediction', 'Error');
                reject(new Error('Please train before prediction'));
            }
            if (!self.machineLearnSteps[PREDICT_STEP_STATE].datasets) {
                toastr.error('Dataset is not none', 'Error');
                return reject(new Error('Please drop dataset'))
            }
            createBlankPlot(self.machineLearnSteps[PREDICT_STEP_STATE], 'Prediction Plot')
                .then((res) => {
                    self.machineLearnSteps[PREDICT_STEP_STATE].plot = res;
                    async.each(self.machineLearnSteps[PREDICT_STEP_STATE].datasets, function(dataset, _cb) {
                        if (!isRun(dataset)) {
                            toastr.error('Curve in dataset is not [no choose]', 'Error');
                            return reject(new Error('Please drop dataset'))
                        }
                        if (!dataset.active) return _cb();
                        evaluateExpr(dataset, dataset.discrmnt)
                            .then(function(curves) {
                                return getDataCurveAndFilter(dataset, curves)
                            })
                            .then(async function(dataCurves) {
                                let payload = {
                                    features: dataCurves,
                                    model_id: self.stateWorkflow.model_id
                                }
                                return postPredict(payload)
                            })
                            .then((res) => {
                                return doAfterPrediction(res, dataset)
                            })
                            .then((res) => {
                                toastr.success('New curve success', 'success')
                                _cb();
                            })
                            .catch(err => {
                                reject(err);
                            });
                    }, err => {
                        // self.saveMlProject();
                        self.stateWorkflow.state = 2;
                        self.saveMlProject()
                        resolve();
                    })
                })
        })
    }

    function createModelAndBucketId() {
        return new Promise((resolve, reject) => {
            if (!self.currentSelectedMlProject) {
                self.saveMlProject();
                toastr.error('Must save machine learning project')
                reject();
            }
            console.log(self.currentSelectedModel);
            let payload = {};
            let params = self.currentSelectedModel.payload.params;
            params.forEach(i => {
                payload[i.name] = i.value;
                // if(i.name === 'model_id') self.model_id = i.value;
            })
            console.log(payload);
            postCreateModel(payload)
                .then((resModelId) => {
                    self.stateWorkflow.model_id = resModelId.model_id
                    self.stateWorkflow.bucket_id = self.stateWorkflow.model_id + localStorage.getItem('username') + self.mlProjectSelected.idMlProject
                        // self.stateWorkflow.bucket_id = self.stateWorkflow.model_id + localStorage.getItem('username') + Date.now();
                    let request = {
                        bucket_id: self.stateWorkflow.bucket_id,
                        dims: self.inputCurveSpecs.length + 1,
                    }
                    postCreateBucketId(request)
                        .then((resBucketId) => {
                            if (resBucketId.existed) {
                                request.override_flag = true;
                                postCreateBucketId(request)
                                    .then((resBucketId) => {
                                        resolve({
                                            model_id: resModelId,
                                            bucket_id: resBucketId
                                        })
                                    })
                            } else {
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
    }

    function createPayloadForTrain() {
        if (!self.currentSelectedModel.payload.train) {
            return {
                model_id: self.stateWorkflow.model_id,
                bucket_id: self.stateWorkflow.bucket_id
            }
        } else {
            let payload = {
                model_id: self.stateWorkflow.model_id,
                bucket_id: self.stateWorkflow.bucket_id
            };
            let params = self.currentSelectedModel.payload.train;
            params.forEach(i => {
                payload[i.name] = i.value;
            })
            return payload
        }
    }

    function doAfterTrain(res) {
        return new Promise((resolve, reject) => {
            getSomVisualize();
            resolve();
        })
    }

    function doAfterVerify(res, dataset) {
        return new Promise((resolve, reject) => {
            handleResultVerify(res, dataset)
                .then(newCurve => {
                    toastr.success('Create new curve success', 'Success');
                    resolve();
                })
                .catch(err => {
                    reject()
                })
        })
    }

    function handleResultVerify(dataVerify, dataset) {
        return new Promise((resolve, reject) => {
            let curveTarget = {
                name: 'target',
                value: dataVerify.target
            }
            getDataCurves(dataset, dataset.inputCurveSpecs, function(curves) {
                if (!curves) reject(new Error('Failture'));
                let targetNFilter = curves.pop();
                let filterNullResult = filterNull(curves);
                fillNullInCurve(filterNullResult.fillNull, curveTarget, function(res) {
                    console.log(res);
                    if (!res) reject(new Error('Failture'));
                    let curveInfo = {
                        idDataset: dataset.idDataset,
                        idFamily: dataset.inputCurveSpecs.slice(-1).pop().value.idFamily,
                        idWell: dataset.idWell,
                        name: dataset.resultCurveName,
                        data: res.value,
                        unit: dataset.inputCurveSpecs.slice(-1).pop().value.unit
                    }
                    let errorCurveInfo = null;
                    let dataError;
                    if (self.currentSelectedModel.type == ML_TOOLKIT) {
                        dataError = res.value.map((a, i) => {
                            return Math.abs((targetNFilter[i] - a) / a);
                        })
                        errorCurveInfo = {
                            idDataset: dataset.idDataset,
                            idFamily: dataset.inputCurveSpecs.slice(-1).pop().value.idFamily,
                            idWell: dataset.idWell,
                            name: "error verify curve",
                            data: dataError,
                            unit: dataset.inputCurveSpecs.slice(-1).pop().value.unit || null ,
                            minValue: 0,
                            maxValue: 1
                        }
                    }
                    saveCurveAndCreatePlot(self.machineLearnSteps[VERIFY_STEP_STATE], curveInfo, dataset, function(newCurve) {
                        // if(!newCurve.idCurve) reject(new Error('Failture'));
                        // resolve(newCurve)
                        resolve();
                    }, errorCurveInfo)
                })
            })
        })
    }

    function doAfterPrediction(res, dataset) {
        return new Promise((resolve, reject) => {
            handleResultPrediction(res, dataset)
                .then(newCurve => {
                    toastr.success('Create new curve success', 'Success');
                    resolve();
                })
                .catch(err => {
                    reject()
                })
        })
    }

    function handleResultPrediction(dataPrediction, dataset) {
        return new Promise((resolve, reject) => {
            let curveTarget = {
                name: 'target',
                value: dataPrediction.target
            }
            let idFamily, unit;
            if (self.machineLearnSteps[TRAIN_STEP_STATE].datasets[0].inputCurveSpecs.slice(-1).pop().value) {
                idFamily = self.machineLearnSteps[TRAIN_STEP_STATE].datasets[0].inputCurveSpecs.slice(-1).pop().value.idFamily;
                unit = self.machineLearnSteps[TRAIN_STEP_STATE].datasets[0].inputCurveSpecs.slice(-1).pop().value.unit;
            } else {
                _cb(new Error('Data Training not existed'))
            }

            // console.log(self.machineLearnSteps[TRAIN_STEP_STATE].datasets[0].inputCurveSpecs.slice(-1).pop());
            getDataCurves(dataset, dataset.inputCurveSpecs, function(curves) {
                if (!curves) reject(new Error('Failture'));
                let targetNFilter = curves.pop();
                let filterNullResult = filterNull(curves);
                fillNullInCurve(filterNullResult.fillNull, curveTarget, function(res) {
                    console.log(res);
                    if (!res) reject(new Error('Failture'));
                    let curveInfo = {
                        idDataset: dataset.idDataset,
                        idFamily: idFamily,
                        idWell: dataset.idWell,
                        name: dataset.resultCurveName,
                        data: res.value,
                        unit: unit
                    }
                    saveCurveAndCreatePlot(self.machineLearnSteps[PREDICT_STEP_STATE], curveInfo, dataset, function(newCurve) {
                        // if(!newCurve.idCurve) reject(new Error('Failture'));
                        resolve()
                    }, null)
                })
            })
        })
    }

    function getSomVisualize() {
        if (self.currentSelectedModel && self.currentSelectedModel['som-visualization']) {
            $http({
                    method: 'GET',
                    url: `${self.currentSelectedModel.url}/api/model/som/${self.stateWorkflow.model_id}`,
                })
                .then((res) => {
                    console.log(res);
                    if (res.status === 201) {
                        $timeout(() => {
                            self.showSomVisualize = true;
                            self.dataSomVisualize = res.data;
                            console.log(self.dataSomVisualize);
                        })
                    }
                })
        } else {
            $timeout(() => {
                self.showSomVisualize = false;
            })
        }
    }

    function createBlankPlot(_step, namePlot) {
        return wiApi.createLogplotPromise({
            idProject: _step.datasets[0].idProject,
            name: `${namePlot} - ${localStorage.getItem('username') || 'none'} - ${self.mlProjectSelected.idMlProject}`,
            override: true,
            option: 'blank-plot'
        });
    }
    let equals = function(arrayData, data) {
        for (let i in arrayData) {
            if (arrayData[i].idDataset == data.idDataset) return i;
        }
        return -1;
    }
}