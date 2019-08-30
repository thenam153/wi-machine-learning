const moduleName = "machineTabs";
const componentName = "machineTabs";
module.exports.name = moduleName;
const queryString = require('query-string')
var config = require('../config/config').default;
if(process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'development') {
    config = require('../config/config').development
}else if(process.env.NODE_ENV === 'prod' || process.env.NODE_ENV === 'production') {
    config = require('../config/config').production
}

var app = angular.module(moduleName, ['modelSelection','datasetSelection','trainingPrediction','wiApi','wiNeuralNetwork','wiLogin','wiToken']);

app.component(componentName, {
	template: require('./newtemplate.html'),
    controller: MachineTabsController,
    style: require('./newstyle.less'),
    controllerAs: 'self',
    bindings: {
    	token: '<'
    }
});
MachineTabsController.$inject = ['$scope', '$timeout', 'wiToken', 'wiApi', '$http']
function MachineTabsController($scope, $timeout, wiToken, wiApi, $http){
    // toastr.options = {
    //     "closeButton": false,
    //     "debug": false,
    //     "newestOnTop": false,
    //     "progressBar": false,
    //     "positionClass": "toast-top-right",
    //     "preventDuplicates": false,
    //     "onclick": null,
    //     "showDuration": "300",
    //     "hideDuration": "500000",
    //     "timeOut": "500000",
    //     "extendedTimeOut": "100000",
    //     "showEasing": "swing",
    //     "hideEasing": "linear",
    //     "showMethod": "fadeIn",
    //     "hideMethod": "fadeOut"
    // }
    // toastr.success('We do have the Kapua suite available.', 'Success');
    // toastr.warning('We do have the Kapua suite available.', 'Success')
    // toastr.error('We do have the Kapua suite available.', 'Success')
    // toastr.info('We do have the Kapua suite available.', 'Success')
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
	const REMOVE = 0;
	const ADD = 1;
    let self = 	this;
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
        window.localStorage.setItem('__BASE_URL', config.backend);
        wiApi.baseUrl = window.localStorage.getItem('__BASE_URL') || 'https://api-1.i2g.cloud';
        self.loginUrl = config.login;
        self.queryString = queryString.parse(location.search);
        self.token = wiToken.getToken();
        self.currentColor = 'rgb(6, 116, 218)';
        self.currentFontSize = '12px';
        self.showSomVisualize = false;
        self.showDialogOpenMlProject = false;
        self.currentSelectedMlProject = null;
        self.mlProjectSelected = null;
        self.mergeCurves = [];
        self.selectionList = [{
            data: {
                label: '[no choose]'
            },
            properties: null
        }];
        self.model;
        self.selectedModelProps = {};
        self.current_tab = 0 ;
        self.titleTabs = ['Dataset Selection','Model Selection','Training and Prediction'];
        self.steps = ['training','prediction','verify'];
        self.typeSelected = 'curve';
        self.inputCurveSpecs = [
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
        self.targetCurveSpec = {
            label: 'Target Curve',
            value: null,
            currentSelect: '[no choose]'
        };
        self.currentSelectedModel = '';
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
        self.typeModelSelected = 'classification';
        if(self.token && self.token.length) window.localStorage.setItem('token',self.token);
    }
    this.changeTheme = function (color){
        $("body").find(".menu").filter(function() {
            return( $(this).css("background-color") == self.currentColor );
        }).css("background", color);
        self.currentColor = color;
    }
    this.changeFontSize = function (size){
        $("body").find("*").filter(function() {
            return( $(this).css("font-size") == self.currentFontSize );
        }).css("font-size", size);
        self.currentFontSize = size;
    }

    this.getFnOnInputChanged = function($index) {
        if (!functionCache[$index])
            functionCache[$index] = function(selectedItemProps) {
                self.inputCurveSpecs[$index].value = selectedItemProps;
                if(selectedItemProps){
                    self.inputCurveSpecs[$index].currentSelect = selectedItemProps.name;
                }
                else {
                    self.inputCurveSpecs[$index].currentSelect = '[no choose]';
                }
                let handle = _.debounce(() => {
                    for(let i in self.machineLearnSteps) {
                     self.handleDropDatasets(i);
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
             self.handleDropDatasets(i);
            }  
        }, 500);
        handle()
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
                console.log('update layers');
                self.nnConfig.container.wiNNCtrl.update(self.nnConfig);                
            }
        });
    }   
    this.updateNNConfig = _.debounce(updateNNConfig);
    setInterval(self.updateNNConfig(), 1000);
    this.nnConfigNLayerChanged = function(nLayer) {
        self.nnConfig.nLayer = nLayer;
        let params = self.selectedModelProps.payload.params;
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
        let params = self.selectedModelProps.payload.params;
        let layer = (params || []).find(i => {
            return i.name === 'hidden_layer_sizes';
        })
        self.nnConfig.layerConfig[index].value = value;
        layer.value[index] = value;
        self.updateNNConfig();
    }
    this.updateLayer = function() {
        if(self.selectedModelProps && self.selectedModelProps.nnnw  ) {
            let params = self.selectedModelProps.payload.params;
            let layer = (params || []).find(i => {
                return i.name === 'hidden_layer_sizes';
            })
            if(layer.value) {
                self.nnConfig.nLayer = layer.value.length;
                self.nnConfig.layerConfig = layer.value.map((i, idx) => {
                    return {label:'label ' + idx, value: i}
                })
            }else if(layer.example) {
                self.nnConfig.nLayer = layer.example.length;
                self.nnConfig.layerConfig = layer.example.map((i, idx) => {
                    return {label:'label ' + idx, value: i}
                })
            }
        } 
        self.updateNNConfig();
    }

    this.onRemoveInputItem = function($index) {
        self.indexInputCurve = $index;
        self.formatCurve = REMOVE;
        if(self.inputCurveSpecs.length > 1){
            self.inputCurveSpecs.splice($index,1);
        }
        let handle = _.debounce(() => {
            for(let i in self.machineLearnSteps) {
             self.handleDropDatasets(i,$index, REMOVE);
            }  
        }, 500);
        handle()
    }
    this.onAddInputItem = function() {
        console.log('add');
        self.indexInputCurve = self.inputCurveSpecs.length - 1;
        self.formatCurve = ADD;
        self.inputCurveSpecs.push({
            label: 'Input Curve',
            value: null,
            currentSelect: '[no choose]'
        });
        let handle = _.debounce(() => {
            for(let i in self.machineLearnSteps) {
             self.handleDropDatasets(i,self.inputCurveSpecs.length - 1, ADD);
            }  
        }, 500);
        handle()
    }
    this.getFnDrop = function(step) {
        if(!functionCacheSteps[step].drop) {
            functionCacheSteps[step].drop = function(event,helper,datasets) {
                $timeout(()=>{ 
                    for(let node of datasets) {
                        let valueDataset = angular.copy(node);
                        if (self.equals(self.machineLearnSteps[step].datasets,valueDataset) < 0 && valueDataset.idDataset && valueDataset.idWell) {
                            self.machineLearnSteps[step].datasets = _.concat(self.machineLearnSteps[step].datasets, valueDataset);
                            if(step == 'training') {
                                self.mergeCurves.push(valueDataset.curves);
                            }
                        }
                    }
                    self.createSelectionList();
                    var handle = _.debounce(() => {self.handleDropDatasets(step)}, 1000);  
                    handle();
                })
            }
        }
        return functionCacheSteps[step].drop;
    }
    this.onRemoveDataset = function(step, $index) {
        $timeout(() => {
            self.machineLearnSteps[step].datasets = _.remove(self.machineLearnSteps[step].datasets, (dataset,index)=>{
                if(step == 'training') {
                    if(index === $index) {
                        self.mergeCurves.splice(index,1);
                    }
                }
                return index !== $index;
            });
            self.createSelectionList();
            self.handleDropDatasets(step);
        });
    }
    this.createSelectionList = function() {
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
    this.handleDropDatasets = function(step,index = -1,type = null) {
    	let datasetSource = Object.assign([], self.machineLearnSteps[step].datasets);
    	let datasetDestination = Object.assign([], self.dataStepsForTrainPredict[step].datasets);
    	let ds = _.intersectionBy(datasetDestination, datasetSource, 'idDataset');
    	let ds1 = _.pullAllBy(datasetSource, ds, 'idDataset');
    	for(let i in ds1) {
            if(step != 'training') {
                ds1[i].resultCurveName = ds1[i].patternCurveName = '_' + step.toUpperCase();
            }
            ds1[i].active = true;
    		ds1[i]._selected = false;
    	}
    	self.dataStepsForTrainPredict[step].datasets = [...ds, ...ds1];
    	handleCreateSelectionList(self.dataStepsForTrainPredict[step],step ,index,type);
        self.updateNNConfig();
    }
    function handleCreateSelectionList(dataStep, step, index = -1, type = null) {
        let inputSpecs = [...self.inputCurveSpecs,self.targetCurveSpec];
        let mergeCurves = [];
        for(let dataset of dataStep.datasets) {
            if(!dataset.inputCurveSpecs) {
                // if(dataStep.target) {
                //     dataset.inputCurveSpecs = new Array(self.inputCurveSpecs.length + 1);
                // }else {
                //     dataset.inputCurveSpecs = new Array(self.inputCurveSpecs.length);
                // }
                dataset.inputCurveSpecs = dataStep.target ? new Array(self.inputCurveSpecs.length + 1) : new Array(self.inputCurveSpecs.length);
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
        // if(dataStep.selectionList) {
        //     dataStep.selectionList = new Array(self.inputCurveSpecs.length + 1);
        // }else {
        //     dataStep.selectionList = new Array(self.inputCurveSpecs.length);
        // }
        dataStep.selectionList = dataStep.selectionList ? new Array(self.inputCurveSpecs.length + 1) : new Array(self.inputCurveSpecs.length);
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
                            if((curve.idFamily == (inputSpecs[i].value || {}).idFamily ) && curve.idFamily ) dataStep.selectionList[i].push(dataInformation);
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
                                        if(mainFamily.familyGroup == (inputSpecs[i].value || {}).familyGroup ) dataStep.selectionList[i].push(dataInformation);
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
                        if(dataStep.selectionList[i]) {
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
        }
    }
    this.onChangeType = function(button) {
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
        self.createSelectionList();
        for(let i in self.machineLearnSteps) {
            self.handleDropDatasets(i);
        }
    }
    this.equals = function(arrayData, data){
        for(let i in arrayData) {
            if(arrayData[i].idDataset == data.idDataset) return i;
        }
        return -1;
    }

    this.setStateWorkflow = function(state) {
        self.stateWorkflow.state = state;
    }
    this.setTypeModelSelected = function(type) {
        self.typeModelSelected = type;
    }
    this.openMlProject = function() {
        self.showDialogOpenMlProject = true;
        wiApi.getMlProjectListPromise()
        .then((listMlProject) => {
            $timeout(() => {
                self.listMlProject = listMlProject;            
            })
        });
    }
    this.saveMlProject = function() { 
        if(self.mlProjectSelected) {
            saveWorkflow();
            // self.showNotiSave = true;
            wiApi.editMlProjectPromise({
                name: self.mlProjectSelected.name,
                idMlProject: self.mlProjectSelected.idMlProject,
                content: self.workflow
            })
            .then((mlProject)=>{
                toastr.success('Save machine learning project success', 'Success');
                // $timeout(()=>{
                //     self.showNotiSave = false;
                // },1000)
            })
            .catch((err) => {
                toastr.error('Save machine learning project fail', 'Error');
            })
        }else {
            self.showDialogSaveMlProject = true;
        }
    }
    this.onClickButtonOpen = async function(mlProject) {
        if(!mlProject) return;
        console.log(mlProject);
        self.mlProjectSelected = mlProject;
        self.mlNameProject = mlProject.name;
        self.showDialogOpenMlProject = false;
        if(self.mlProjectSelected) {
            $timeout(async() => {
                self.sprinnerMl = true;
                self.mergeCurves = [];
                self.currentSelectedModel = '';
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
                self.dataStepsForTrainPredict = angular.copy(self.machineLearnSteps);
                let content = self.mlProjectSelected.content;
                self.currentSelectedMlProject = self.mlProjectSelected.name;
                for(let i in content.steps) {
                    for(let j in content.steps[i].datasets) {
                        // let dataset = await wiApi.getDatasetInfoPromise(content.steps[i].datasets[j].idDataset);
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
                            valueDatasetTrainPredict.active = cacheDataset.active;
                            valueDatasetTrainPredict.discrmnt = cacheDataset.discrmnt;
                            valueDatasetTrainPredict.wellName = cacheDataset.wellName;
                            self.dataStepsForTrainPredict[i].datasets.push(valueDatasetTrainPredict)
                        }
                    }
                }
                self.typeSelected = content.type || 'curve';
                self.inputCurveSpecs = content.inputCurveSpecs;
                self.targetCurveSpec = content.targetCurveSpec;
                self.createSelectionList();                    
                self.typeModelSelected = content.model.type;
                self.currentSelectedModel = content.model.label;
                // self.modelSelectedProps = content.model;
                // let props = Object.assign({}, {properties: self.modelSelectedProps}, {name: self.modelSelectedProps.label});
                self.selectedModelProps = content.model;
                self.selectedModelProps.sync = true;
                console.log(self.selectedModelProps)
                self.stateWorkflow = content.stateWorkflow;
                // || {
                // state : -1, 
                // waitResult: false,
                // model_id: null,
                // bucket_id: null
                // };
                if(self.stateWorkflow.model_id && (content.model.label === 'Supervise Som' || content.model.name === 'supervise_som' )) {
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
                }else {
                    $timeout(() => {  
                        self.showSomVisualize = false;                           
                    })
                }
                self.sprinnerMl  = false;
                toastr.success('Open machine learning project success', 'Success');
            });
        }
    }
    this.createMlProject = function(name) {
        console.log('save', name);
        self.showDialogSaveMlProject = false;
        saveWorkflow();
        wiApi.createMlProjectPromise({
            name: name,
            content: self.workflow
        })
        .then((mlProject) => {
            // if(!mlProject) return console.error(new Error("Don't create Ml Project"))
            toastr.success('Create machine learing project fail','Success')
            $timeout(() => {
                self.mlProjectSelected = mlProject;
                self.currentSelectedMlProject = mlProject.name;
            })
        })
        .catch((err) => {
            toastr.error('Create machine learing project fail','Error')
        })
    }
    this.newMlProject = function() {
        $timeout(() => {
            toastr.info('New machine learing project', 'Info');
            $scope.nameMlProject = 'new project';
            self.mlNameProject = null;
            // self.currentSelectedModel = '';
            self.currentSelectedMlProject = null;
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
            self.dataStepsForTrainPredict = angular.copy(self.machineLearnSteps);
            self.stateWorkflow = {
                state : -1,
                waitResult: false,
                model_id: null,
                bucket_id: null
            }
            self.mlProjectSelected = null;
            self.showSomVisualize = false;
            // self.selectedModelProps.name = self.model.classification[0].name;
            self.selectedModelProps = self.model.classification[0].properties;
            self.typeModelSelected = 'classification';
            self.currentSelectedModel = self.model.classification[0].properties.label;
            self.inputCurveSpecs = [
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
            self.targetCurveSpec = {
                label: 'Target Curve',
                value: null,
                currentSelect: '[no choose]'
            };
            self.typeSelected = 'curve';
            self.nnConfig = { inputs: [], outputs: [], layers: [], container: {}, nLayer: 2, layerConfig: [{label: 'label 0', value: 10}, {label: 'label 1', value: 10}] };
            self.updateNNConfig();
        })
    }
    this.setModelId = function(modelId) {
        self.stateWorkflow.model_id = modelId;
    }
    this.setBucketId = function(bucketId) {
        self.stateWorkflow.bucket_id = bucketId;
    }
    this.setPropsModel = function(data) {
       self.model = data;
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
                    active: d.active,
                    discrmnt: d.discrmnt,
                    wellName: d.wellName
                }
            })
        }
        let model = self.selectedModelProps;
        let inputCurveSpecs = self.inputCurveSpecs.map(i => {
            return i
        })
        let targetCurveSpec = self.targetCurveSpec;
        //create content to post server
        self.workflow = {
            inputCurveSpecs: inputCurveSpecs,
            targetCurveSpec: targetCurveSpec,
            type: self.typeSelected,
            model: model,
            stateWorkflow: self.stateWorkflow,
            steps: steps
        }
    }
    self.selectItemDelete = function($index) {
        self.delProject = true;
        self.indexItemDelete = $index;
    }
    self.confirmDeleteItemMlProject = function() {
        console.log(self.indexItemDelete)
        if(self.indexItemDelete > -1 ) {
            let id = self.listMlProject[self.indexItemDelete].idMlProject;
            wiApi.deleteMlProjectPromise(id)
            .then((res) => {
                toastr.success('Delete "' + res.name + '" Project Success', 'Success');
                _.remove(self.listMlProject, (d, i) => {
                    return i === self.indexItemDelete;
                });
                if(self.mlProjectSelected && id === self.mlProjectSelected.idMlProject) {
                    self.newMlProject();
                }
            })
            .catch((err) => {
                toastr.error('Delete "' + self.listMlProject[self.indexItemDelete].name + '" Project Error', 'Error');
            })
            .finally(() => {
                $timeout(() => {
                    self.delProject = false;
                    self.indexItemDelete = -1;
                })
            })
        }
    }

    this.tab = 1;
    this.setTab = function(idx) {
        self.tab = idx;
    }
    this.onModelChanged = function(modelSelectedProps){
        console.log(modelSelectedProps);
        if(!modelSelectedProps) return;
        self.selectedModelProps = self.selectedModelProps.sync ? self.selectedModelProps : modelSelectedProps;
        self.selectedModelProps.sync = false;
        self.currentSelectedModel = self.selectedModelProps.label;
        console.log(self.selectedModelProps)
        if(!self.selectedModelProps.nnnw) {
            $timeout(() => {
                self.tab = 1;
            })
            let element = document.getElementById("tab-layer");
            element.classList.add("hide");
            let changePosition = document.getElementById("model-selection");
            changePosition.classList.add("position-static");
        }else {
            self.updateLayer();
            let element = document.getElementById("tab-layer");
            element.classList.remove("hide");
            let changePosition = document.getElementById("model-selection");
            changePosition.classList.remove("position-static");
        }
    }
    let fnSetValue = {};
    this.getFnSetValueElModel = function(type) {
        if(type === 'params') {
            if(!fnSetValue.params) {
                fnSetValue.params = function(param, value) {
                    console.log(param, value);
                    let item = self.selectedModelProps.payload.params.find(i => {
                        return i.name == param
                    })
                    value = validate(item.type, value);
                    if(value === '') value = item.example;
                    // this.itemValue = value;
                    item.value = value;     
                }
            }
            return fnSetValue.params;
        }else {
            if(!fnSetValue.train) {
                fnSetValue.train = function(param, value) {
                    console.log(param, value);
                    let item = self.selectedModelProps.payload.train.find(i => {
                        return i.name == param
                    })
                    value = validate(item.type, value);
                    if(value === '') value = item.example;
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
        if(type === 'params') {
            if(!fnSetValueEnum.params[param]) {
                fnSetValueEnum.params[param] = function(props) {
                    let item = self.selectedModelProps.payload.params.find(i => {
                        return i.name == param
                    })
                    if(item) {
                        item.value = props;
                    }
                    console.log(item, props, param);
                }
            }
            return fnSetValueEnum.params[param];
        }else {
            if(!fnSetValueEnum.train[param]) {
                fnSetValueEnum.train[param] = function(props) {
                    let item = self.selectedModelProps.payload.train.find(i => {
                        return i.name == param
                    })
                    if(item) {
                        item.value = props;
                    }
                    console.log(item, props, param);
                }
            }
            return fnSetValueEnum.train[param];
        }
    }
    function validate(type, value) {
        switch(type){
            case 'string' : return value; 

            case 'integer': 
                value = Number(value);
                if(Number.isInteger(value)) {
                    return value;
                }
                return '';
            case 'number':
                value = Number(value);
                if(!isNaN(value)) {
                    return value;
                }
                return '';
            case 'boolean':
                if(value.toString().toLowerCase() == 'true') {
                    // return 'true';
                    return true;
                }
                if(value.toString().toLowerCase() == 'false') {
                    // return 'false';
                    return false;
                }
                return '';
            case 'float': 
                value = parseFloat(value);
                if(!isNaN(value)) {
                    return value;
                }
                return '';
            default: return '';
        }
    }
}