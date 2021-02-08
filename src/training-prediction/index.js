import { getConfusionMatrix } from './confusion-matrix';
const moduleName = "trainingPrediction";
const componentName = "trainingPrediction";
export const name = moduleName;

var app = angular.module(moduleName, ['wiDialog',
    'wiDiscriminator',
    'wiApi',
    'distributionMapModule',
    'visualizationMapModule',
    'somModelService',
    'heatMap',
    'mlApi'
]);

app.component(componentName, {
    template: require('./newtemplate.html'),
    controller: TrainingPredictionController,
    style: require('./newstyle.less'),
    controllerAs: 'self',
    bindings: {
        // machineLearnSteps: '<',
        // inputCurveSpecs: '<',
        // targetCurveSpec: '<',
        // // setItemOnChanged: '<',
        // setOnItemCurveChanged: '<',
        // onToggleActiveOutput: '<',
        // onDiscriminator: '<',
        // runAll: '<',
        // runTask: '<',


        // somVisualize: '<',
        // showSomVisualize: '<',

        // stateWorkflow: '<',
        // setModelId: '<',
        // setBucketId: '<',
        // setState: '<',
        // saveMlProject: '<',
        // model: '<',
        
        controller: '<'
    }
});
TrainingPredictionController.$inject = ['$scope', '$timeout', 'wiDialog', 'wiApi', '$http', 'somModelService', 'mlApi', 'ngDialog']

function TrainingPredictionController($scope, $timeout, wiDialog, wiApi, $http, somModelService, mlApi, ngDialog) {
    let self = this;
    toastr.options = {
        "positionClass": "toast-bottom-right",
      }
      
    $scope.tab = 1;
    $scope.setTab = function(newTab) {
        $scope.tab = newTab;
    };

    $scope.isSet = function(tabNum) {
        return $scope.tab === tabNum;
    };
    $(document).click(function(event) {
        if (event.target.id === 'dropdown-list') {
            return false;
        } else {
            $(".dropdown-list").addClass("ng-hide");

        }

    });
    this.runTask = function(i) {
        return new Promise((resolve) => {
            if(!self.controller.project) {
                self.controller.createProject();
                return   
            }
            if(i == -1) {
                $timeout(() => {
                    self.running = true;
                    mlApi.createModelAndBucketId(self.controller.curveSpecs.length, self.controller.project.idMlProject).then((res) => {
                        console.log(res);
                        self.modelId = res.modelId;
                        self.bucketId = res.bucketId;
                        self.controller.project.content.modelId = res.modelId;
                        self.controller.project.content.bucketId = res.bucketId;
                        self.running = false;
                        return resolve(train());
                    });
                    
                })
            }
            else if(i == 1) {
                return resolve(verify());
            }
            else if(i == 2) {
                return resolve(predict());
            }
        })
    }
    this.runAll = function() {
        if(!self.controller.project) {
            self.controller.createProject();
            return;
        }
        $timeout(() => {
            self.running = true;
        });
        self.runTask(-1)
        .then(() => self.runTask(1))
        .then(() => self.runTask(2))
        .then(() => {
            self.controller.saveProject();
        })
        .catch(err => {
            // toastr.error(err ? err.message : err || 'Something went error' );
            console.log('Error')
        })
        .finally(() => {
            $timeout(() => {
                self.running = false;
            })
        })
    }
    $scope.canCreatePlot = canCreatePlot;
    function canCreatePlot (tabKey) {
        const listDataset = self.controller.tabs[tabKey].listDataset;
        if (!listDataset.length) return false;
        const idProject1 = listDataset[0].idProject;
        return !listDataset.some(d => d.idProject !== idProject1);
    }
    function zonesetFilter(dataset, curve, zonesConfig, zonesList) {
        // if (zonesConfig.length == 1
        //     && zonesConfig[0].template_name == 'Zonation All'
        //     && zonesConfig[0]._notUsed) {
        //     return curve.map(p => false);
        // }
        if (!zonesList || !zonesList.length) return curve;
        let usedZones = _.filter(zonesConfig, z => !z._notUsed);
        usedZones = usedZones.map(z => zonesList.find(_z => _z.zone_template.name === z.template_name)).filter(v => v);
        if (!usedZones || !usedZones.length) return curve.map(d => ({ ...d, x: false }));
        return curve.map((p, pIdx) => {
            const depth = +dataset.step !== 0 ? +dataset.top + pIdx * dataset.step : p.y;
            const zone = _.find(usedZones, z => (z.startDepth - depth) * (z.endDepth - depth) <= 0)
            return zone ? p : { ...p, x: false };
        })
    }
    function sampleFilter(curves, project, step) {
        let sample = project.content.sample[step]
        if (sample.enable) {
            console.log(">>>>", curves, project, step)
            for(let idx = 0; idx < curves.length; idx++) {
                if(curves[idx]) {
                    curves[idx] = seeding(sample.value, sample.condition)
                }
            }
        }
        return curves
    }
    function seeding(value, condition) {
        let randomValue = random()
        switch (condition) {
            case '<': 
                return randomValue < value;
            case '>':
                return randomValue > value;
            case '=':
                return randomValue == value;
            case '<=':
                return randomValue <= value;
            case '>=':
                return randomValue => value;
            default:
                return false
        }
    }
    function random() {
        return Math.random(0,1)
    }
    function beforeTrain() {
        return new Promise((resolve, reject) => {
            let listDataset = self.controller.tabs['training'].listDataset;
            if(self.controller.tabs['training'].listDataset.length == 0) {
                return reject(new Error('Please drop datasets for training'));
            }
            if(!isActive(self.controller.tabs['training'].listDataset)) {
                return reject(new Error('Please select a dataset to train before verifying/predicting'));
            }
            async.each(self.controller.tabs['training'].listDataset, (dataset, _next) => {
                //if(!isRun(dataset)) {
                if(!isReady(dataset, self.controller.curveSpecs)) {
                    return reject(new Error('Curve in dataset must be select'))
                }
                if(!dataset.active) {
                    return _next();
                }
                let realWell;
                wiApi.client(getClientId(dataset.owner, dataset.prjName)).getCachedWellPromise(dataset.idWell).then((well) => {
                    realWell = well;
                    let dtset = well.datasets.find(ds => ds.idDataset === dataset.idDataset);
                    if (!dtset) {
                        throw new Error("Cannot find dataset idDataset=" + dataset.idDataset);
                    }
                    return mlApi.evaluateExpr(dtset.curves, dataset.discrimnt, dataset.owner, dataset.prjName);
                })
                .then(curves => {
                    let zonesConfig = self.controller.zonesetConfig['training'].zoneList || []; // PHUC
                    let zones = (realWell.zone_sets.find(zs => zs.name === self.controller.zonesetConfig['training'].zonesetName)  || {}).zones || [];
                    curves = zonesetFilter(dataset, curves, zonesConfig, zones).map(d => d.x); // PHUC
                    curves = sampleFilter(curves, self.controller.project, 'training')
                    return mlApi.getDataCurveAndFilter(dataset, curves, self.controller.curveSpecs);
                }) 
                .then(dataCurves => {
                    return mlApi.transformData(dataCurves, self.controller.curveSpecs);
                })
                .then(dataCurves => {
                    dataCurves.push(dataCurves.shift());
                    let payload = {
                        bucket_id: self.controller.project.content.bucketId,
                        data: dataCurves
                    }
                    return mlApi.putDataOfTrain(payload);
                })
                .finally(() => {
                    _next();
                })
            }, err => {
                !err ? resolve() : reject(err); 
            })
        })
    }
    function afterTrain() {
        return new Promise((resolve, reject) => {
            // getSomVisualize();
            getSomVisualize()
            resolve();
        })
    }
    function trainData() {
        return new Promise((resolve, reject) => {
            let payload = mlApi.createPayloadForTrain(self.controller.project.content.modelId, self.controller.project.content.bucketId);
            mlApi.postTrainByBucketData(payload)
            .then((res) => {
                resolve(res);
            })
            .catch((err) => {
                reject(err)
            })
        })
    }
    function getSomVisualize() {
        if(mlApi.getBaseCurrentModel()['som-visualization']) {
            mlApi.getSomVisualizeData(self.controller.project.content.modelId)
            .then(data => {
                console.log(data);
            })
        }
    }

    function train() {
        return new Promise(resolve => {
            $timeout(() => {
                self.running = true;
            })
            beforeTrain().then(() => trainData()).then((res) => {
                self.controller.convergenceAnalysis = angular.copy(res);
                afterTrain()
            }).then(() => {
                console.log('Success')
                // toastr.success('Training success');
                self.controller.project.content.state = 1;
                self.controller.saveProject();
            })
            .catch(err => {
                console.error(err);
                // toastr.error(err ? err.message : err || 'Something went error' );
            })
            .finally(() => {
                $timeout(() => {
                    self.running = false;
                })
                resolve();
            })
        })
    }
    function verify() {
        return new Promise(resolve => {
            $timeout(() => {
                self.running = true;
            })
            beforeVerify()
            .then((res) => {
                // if(res) toastr.success('Verify success');
                console.log('Success')
                self.controller.saveProject();
            })
            .catch(err => {
                // toastr.error(err ? err.message : err || 'Something went error' );
                console.log('Error')
            })
            .finally(() => {
                $timeout(() => {
                    self.running = false;
                })
                resolve();
            })
        })
    }
    function predict() {
        return new Promise(resolve => {
            $timeout(() => {
                self.running = true;
            })
            beforePredict()
            .then(() => {
                // toastr.success('Prediction success');            
                console.log('Success')
                self.controller.saveProject();
            })
            .catch(err => {
                // toastr.error(err ? err.message
                    // || (err.status ? `${err.status} - ${err.statusText}${err.data?("-" + JSON.stringify(err.data)):""}` : 'Something went error')
                    // : err || 'Something went error');          
                console.log('Error')
            })
            .finally(() => {
                $timeout(() => {
                    self.running = false;
                })
                resolve();
            })
        })
    }

    function beforeVerify() {
        return new Promise((resolve, reject) => {
            let listDataset = self.controller.tabs['verify'].listDataset;
            if(self.controller.project.content.state < 1) {
                return reject(new Error('Please training before verify or predict'));
            }
            if(self.controller.tabs['verify'].listDataset.length == 0) {
                return resolve(false);
            }
            if( !isActive(self.controller.tabs['verify'].listDataset)) {
                return resolve()
            }
            self.controller.tabs['verify'].canCreatePlot = canCreatePlot('verify');
            const createPlot = self.controller.tabs['verify'].canCreatePlot && self.controller.tabs['verify'].createPlot;
            let idProject = self.controller.tabs['verify'].listDataset[0].idProject;
            mlApi.createBlankPlot(idProject, self.controller.project.idMlProject, self.controller.tabs['verify'].plotName, listDataset[0], createPlot).then((plot) => {
                self.controller.tabs['verify'].plot = plot;
                self.controller.tabs['verify'].plot.username = localStorage.getItem('username') || '';
                async.each(self.controller.tabs['verify'].listDataset, (dataset, _next) => {
                    let filterCurveBoolean;
                    //if(!isRun(dataset)) {
                    if(!isReady(dataset, self.controller.curveSpecs)) {
                        return reject(new Error('Curve in dataset must be select'))
                    }
                    if(!dataset.active) {
                        return _next();
                    }
                    let realWell;
                    wiApi.client(getClientId(dataset.owner, dataset.prjName)).getCachedWellPromise(dataset.idWell).then((well) => {
                        realWell = well;
                        let dtset = well.datasets.find(ds => ds.idDataset === dataset.idDataset);
                        if (!dtset) {
                            throw new Error("Cannot find dataset idDataset=" + dataset.idDataset);
                        }
                        return mlApi.evaluateExpr(dtset.curves, dataset.discrimnt, dataset.owner, dataset.prjName);
                    })
                    //mlApi.evaluateExpr(dataset, dataset.discrimnt) // TUNG
                    .then(curves => {
                        //return mlApi.getDataCurveAndFilter(dataset, curves); // TUNG
                        let zonesConfig = self.controller.zonesetConfig['verify'].zoneList || [];
                        let zones = (realWell.zone_sets.find(zs => zs.name === self.controller.zonesetConfig['verify'].zonesetName) || {}).zones || [];
                        curves = zonesetFilter(dataset, curves, zonesConfig, zones).map(d => d.x);  
                        curves = sampleFilter(curves, self.controller.project, 'verify')
                        filterCurveBoolean = curves;
                        return mlApi.getDataCurveAndFilter(dataset, curves, self.controller.curveSpecs);
                    })
                    .then(dataCurves => {
                        return mlApi.transformData(dataCurves, self.controller.curveSpecs);
                    })
                    .then(dataCurves => {
                        // dataCurves.pop();
                        dataCurves.shift();
                        let payload = {
                            features: dataCurves,
                            model_id: self.controller.project.content.modelId
                        }
                        return mlApi.postPredict(payload);
                    })
                    .then(res => {
                        return resultVerify(res, dataset, filterCurveBoolean);
                    })
                    .then(() => {
                        _next();
                    })
                    .catch(err => {
                        _next(err);
                    })
                }, err => {
                    err ? reject() : resolve(true)
                })
            })
        })
    }
    function resultVerify(res, dataset, filterCurveBoolean) {
        return new Promise((resolve, reject) => {
            let value = mlApi.invTransformData(res.target, self.controller.curveSpecs);
            let target = {
                name: "target",
                value: value
            }
            let curveArr = [target];
            if (res.target_groups) {
                curveArr.push({
                name: 'target_groups',
                value: res.target_groups
                })
            };
            let tCurve;
            //mlApi.getDataCurves(dataset, dataset.curveSpecs)
            mlApi.getDataCurves(dataset, self.controller.curveSpecs)
            .then(curves => {
                // tCurve = curves.shift();
                tCurve = mlApi.filterNull(curves, filterCurveBoolean);
                return mlApi.fillNullInCurve(tCurve.fillNull, curveArr)
            })
            .then(curves => {
                let idDataset = dataset.idDataset;
                wiApi.client(getClientId(dataset.owner, dataset.prjName)).getCachedWellPromise(dataset.idWell).then((well) => {
                    let realDataset = well.datasets.find(ds => ds.idDataset === dataset.idDataset);
                    let targetCurve = realDataset.curves.find(c => c.name === dataset.selectedValues[0]);
                    let idFamily = targetCurve.idFamily;
                    let idWell = dataset.idWell;
                    let unit = targetCurve.unit;

                    let target_groups = [], targetGroupsInfo = null;
                    let outCurve = curves[0].value;
                    if (curves.length == 2) {
                        target_groups = curves[1].value;
                        targetGroupsInfo = {
                            idDataset: idDataset,
                            idFamily: idFamily,
                            idWell: idWell,
                            name: 'target_groups curve',
                            data: target_groups,
                            unit: ''
                        }
                    }
                    let curveInfo = {
                        idDataset: idDataset,
                        idFamily: idFamily,
                        idWell: idWell,
                        name: dataset.resultCurveName,
                        data: outCurve,
                        unit: unit || null
                    }
                    let errorCurveInfo = null, dataError = null;
                    if (mlApi.getBaseCurrentModel().type == 'regression') {
                        dataError = outCurve.map((a, i) => {
                            return Math.abs((tCurve[i] - a) / a);
                        })
                        errorCurveInfo = {
                            idDataset: idDataset,
                            idFamily: idFamily,
                            idWell: idWell,
                            name: "VERIFICATION_ERROR",
                            data: dataError,
                            unit: unit || null ,
                            minValue: 0,
                            maxValue: 1
                        }
                    }
                    mlApi.saveCurveAndCreatePlot(self.controller.tabs['verify'], curveInfo, dataset, function() {
                        resolve();
                    }, errorCurveInfo, targetGroupsInfo, self.controller.curveSpecs, false, self.controller.zonesetConfig['verify'].zonesetName);
                });
            })
        })
    }

    function beforePredict() {
        return new Promise((resolve, reject) => {
            let listDataset = self.controller.tabs['prediction'].listDataset;
            if(self.controller.project.content.state < 1) {
                return reject(new Error('Please training before verify or predict'));
            }
            if(self.controller.tabs['prediction'].listDataset.length == 0) {
                return reject(new Error('Please drop datasets for predict'));
            }
            if(!isActive(self.controller.tabs['prediction'].listDataset)) {
                return reject(new Error('Please active one or more dataset'));
            }
            self.controller.tabs['prediction'].canCreatePlot = canCreatePlot('prediction');
            const createPlot = self.controller.tabs['prediction'].canCreatePlot && self.controller.tabs['prediction'].createPlot;
            let idProject = self.controller.tabs['prediction'].listDataset[0].idProject;
            mlApi.createBlankPlot(idProject, self.controller.project.idMlProject, self.controller.tabs['prediction'].plotName, listDataset[0], createPlot)
                .then(plot => {
                self.controller.tabs['prediction'].plot = plot
                self.controller.tabs['prediction'].plot.username = localStorage.getItem('username') || '';
                let filterCurveBoolean;
                async.each(self.controller.tabs['prediction'].listDataset, (dataset, _next) => {
                    //if(!isRun(dataset)) {
                    if (!isReady(dataset, self.controller.curveSpecs, true)) {
                        return reject(new Error('Curve in dataset must be select'))
                    }
                    if(!dataset.active) {
                        return _next();
                    }
                    let realWell;
                    wiApi.client(getClientId(dataset.owner, dataset.prjName)).getCachedWellPromise(dataset.idWell).then((well) => {
                        realWell = well;
                        let dtset = well.datasets.find(ds => ds.idDataset === dataset.idDataset);
                        if (!dtset) {
                            throw new Error("Cannot find dataset idDataset=" + dataset.idDataset);
                        }
                        return mlApi.evaluateExpr(dtset.curves, dataset.discrimnt, dataset.owner, dataset.prjName);
                    })
                    .then(curves => {
                        let zonesConfig = self.controller.zonesetConfig['prediction'].zoneList || [];
                        let zones = (realWell.zone_sets.find(zs => zs.name === self.controller.zonesetConfig['prediction'].zonesetName) || {}).zones || [];
                        curves = zonesetFilter(dataset, curves, zonesConfig, zones).map(d => d.x);
                        filterCurveBoolean = curves;
                        return mlApi.getDataCurveAndFilter(dataset, curves, self.controller.curveSpecs, true);
                    })
                    .then(dataCurves => {
                        return mlApi.transformData(dataCurves, self.controller.curveSpecs, true)
                    })
                    .then(dataCurves => {
                        let payload = {
                            features: dataCurves,
                            model_id: self.controller.project.content.modelId
                        }
                        return mlApi.postPredict(payload);
                    })
                    .then(res => {
                        return resultPredict(res, dataset, filterCurveBoolean)
                    })
                    .then(() => {
                        _next();
                    })
                    .catch(err => {
                        _next(err);
                    })
                }, err => {
                    err ? reject(err) : resolve()
                })
            }).catch(e => {
                reject(e);
            });
        });
    }
    function resultPredict(res, dataset, filterCurveBoolean) {
        // TODO: SHOULD BE REVIEWED **** TUNG
        return new Promise((resolve, reject) => {
            let value = mlApi.invTransformData(res.target, self.controller.curveSpecs);
            let target = {
                name: "target",
                value: value
            }
            let curveArr = [target];
            if (res.target_groups) {
                curveArr.push({
                    name: 'target_groups',
                    value: res.target_groups
                    })
            };
            let tCurve;
            //mlApi.getDataCurves(dataset, dataset.curveSpecs)
            mlApi.getDataCurves(dataset, self.controller.curveSpecs, true)
            .then(curves => {
                tCurve = mlApi.filterNull(curves, filterCurveBoolean);
                return mlApi.fillNullInCurve(tCurve.fillNull, [target])
            })
            .then(curves => {
                let idDataset = dataset.idDataset;
                // let idFamily = dataset.curveSpecs[0].value.idFamily;
                let idWell = dataset.idWell;
                // let unit = dataset.curveSpecs[0].value.unit;

                let curveTarget = curves[0].value;
                let target_groups = [], targetGroupsInfo = null;
                if (curves.length == 2) {
                    target_groups = curves[1].value;
                    targetGroupsInfo = {
                        idDataset: idDataset,
                        // idFamily: idFamily,
                        idWell: idWell,
                        name: 'target_groups curve',
                        data: target_groups,
                        // unit: ''
                    }
                }
                let curveInfo = {
                    idDataset: idDataset,
                    // idFamily: idFamily,
                    idWell: idWell,
                    name: dataset.resultCurveName,
                    data: curveTarget,
                    // unit: unit || null
                }
                //if(!self.controller.tabs['training'].listDataset.length || !self.controller.tabs['training'].listDataset[0].curves.length) {
                if(!self.controller.tabs['training'].listDataset.length) {
                    return reject("Must be have dataset in training for predict");
                }
                // let dsItem = self.controller.tabs['training'].listDataset[0]
                // TO BE REVIEWED : TUNG
                let targetDs = self.controller.tabs['training'].listDataset[0];
                wiApi.client(getClientId(targetDs.owner, targetDs.prjName)).getCachedWellPromise(targetDs.idWell).then(well => {
                    let realDs = well.datasets.find(ds => ds.idDataset === targetDs.idDataset);
                    let curveName = targetDs.selectedValues[0];
                    let info = realDs.curves.find(c => c.name === curveName)
                    curveInfo.idFamily = info.idFamily;
                    curveInfo.unit = info.unit;
                    if(targetGroupsInfo) {
                        targetGroupsInfo.idFamily = info.idFamily;
                        targetGroupsInfo.unit = info.unit;
                    }
                    mlApi.saveCurveAndCreatePlot(self.controller.tabs['prediction'], curveInfo, dataset, function() {
                        resolve();
                    }, null, targetGroupsInfo, self.controller.curveSpecs, true, self.controller.zonesetConfig['prediction'].zonesetName)
                })
                //wiApi.getCurveInfoPromise(self.controller.tabs['training'].listDataset[0].curveSpecs[0].value.idCurve)
                //.then(info => {
                    //curveInfo.idFamily = info.idFamily;
                    //curveInfo.unit = info.unit;
                    //if(targetGroupsInfo) {
                        //targetGroupsInfo.idFamily = info.idFamily;
                        //targetGroupsInfo.unit = info.unit;
                    //}
                    //mlApi.saveCurveAndCreatePlot(self.controller.tabs['prediction'], curveInfo, dataset, function() {
                        //resolve();
                    //}, null, targetGroupsInfo, self.controller.curveSpecs)
                //})
            })
        })
    }

    function isReady(dataset, curveSpecs, isPrediction) {
        let startIdx = isPrediction ? 1 : 0;
        for (let i = startIdx ; i < curveSpecs.length; i++) {
            if (!dataset.selectedValues || !dataset.selectedValues[i] || !dataset.selectedValues[i].length) {
                return false;
            }
        }
        return true;
    }
    /* TUNG
    function isRun(dataset) {
        for (let i of dataset.curveSpecs) {
            if (!i.value) {
                return false;
            }
        }
        return true;
    }
    */
    this.onToggleActive = function(dataset) {
        dataset.active = !dataset.active;
    }
    function isActive(datasets) {
        let d = datasets.find(i => i.active);
        if(d) {
            return true;
        }else {
            return false;
        }
    }
    // function predictData() {}
    // function afterPredict() {}
    function getClientId(owner, prjName) {
        return mlApi.getClientId(owner, prjName);
    }
    self.getResultCurveName = function([dsItem, suffix]) {
        if (!self.controller ) return "N/A";
        if (dsItem.resultCurveName.length && dsItem.resultCurveName !== "RESULT_CURVE") {
            return dsItem.resultCurveName;
        }

        let targetName = _.get(self.controller, "curveSpecs[0].value.name", null);
        if (!targetName) return dsItem.resultCurveName;
        let defaultName = normalizeCurveName(targetName + suffix);
        
        dsItem.resultCurveName = defaultName;
        return dsItem.resultCurveName;
    }
    self.setResultCurveName = function([dsItem, suffix], newName) {
        if (!self.controller) return;
        dsItem.resultCurveName = newName;
    }
    function normalizeCurveName(name) {
        return name.replace(/(\s|%)+/g, "_");
    }
    
    this.minValueMatrix = 0;
    this.maxValueMatrix = 0;
    this.levelMatrix = 5;
    this.confusionMatrix = async function (dataset) {
        console.log(dataset);
        self.running = true;
        const dsInfo = await wiApi.getDatasetInfoPromise(dataset.idDataset);
        const targetCurve = dsInfo.curves.find(c => c.name === dataset.selectedValues[0]);
        const resultCurve = dsInfo.curves.find(c => c.name === dataset.resultCurveName);
        if (!resultCurve || !targetCurve) return;
        const targetCurveData = await wiApi.getCurveDataPromise(targetCurve.idCurve);
        const resultCurveData = await wiApi.getCurveDataPromise(resultCurve.idCurve);
        self.running = false;
        self.showConfusionMatrix(targetCurveData, resultCurveData, self.controller.getDataset(dataset.idWell, dataset.idDataset).name);
        // const { matrix } = getConfusionMatrix.call(this, targetCurveData, resultCurveData);
        // ngDialog.open({
        //     template: require('./confusion-matrix.html'),
        //     plain: true,
        //     className: 'i2g-ngdialog confusion-matrix-dialog',
        //     controller: ['$scope', '$element',
        //         function ($scope, $element) {
        //             $scope.datasetName = self.controller.getDataset(dataset.idWell, dataset.idDataset).name;
        //             const matrixTransposed = _.unzip(matrix);
        //             $scope.rowPercentage = function (row) {
        //                 return _.round(matrix[row][row] / _.sum(matrix[row]) * 100, 1) || 0;
        //             }
        //             $scope.colPercentage = function (col) {
        //                 return _.round(matrixTransposed[col][col] / _.sum(matrixTransposed[col]) * 100, 1) || 0;
        //             }
        //             $scope.matrix = matrix;
        //             const sum = _.sum(matrix.flat());
        //             $scope.sum = sum;
        //             $scope.averageAccuracy = _.round(matrix.reduce((acc, row, idx) => acc + row[idx], 0) / sum * 100, 1) || 0;
        //             const colorScale = d3.scaleLinear().domain([0, 20, 40, 60, 80, 100]).range(['#F7FCF0', '#D4EECD', '#9FDAB8', '#57B8D0', '#1C7CB6', '#053D7F']);
        //             $scope.getColor = function (val, max = 100) {
        //                 return colorScale(val / max * 100);
        //             };
        //             const textColorScale = d3.scaleQuantile().domain([0, 80, 100]).range(['#000', '#fff', '#fff']);
        //             $scope.getTextColor = function (val, max = 100) {
        //                 return textColorScale(val / max * 100);
        //             }
        //         }
        //     ],
        // });
    }
    this.confusionMatrixModel = async function() {
        let listDataset = self.controller.tabs['verify'].listDataset;
        if(!listDataset.length) return;
        self.running = true;
        let listTargetCurveData = [];
        let listResultCurveData = [];
        for(let index in listDataset) {
            const dsInfo = await wiApi.getDatasetInfoPromise(listDataset[index].idDataset);
            const resultCurve = dsInfo.curves.find(c => c.name === listDataset[index].resultCurveName);
            const targetCurve = dsInfo.curves.find(c => c.name === listDataset[index].selectedValues[0]);
            if (!resultCurve || !targetCurve) continue;
            listTargetCurveData.push(...await wiApi.getCurveDataPromise(targetCurve.idCurve));
            listResultCurveData.push(...await wiApi.getCurveDataPromise(resultCurve.idCurve));
        }
        self.running = false;
        self.showConfusionMatrix(listTargetCurveData, listResultCurveData, 'Model')
    }
    this.showConfusionMatrix = function(targetCurveData, resultCurveData, datasetName) {
        const { matrix } = getConfusionMatrix.call(this, targetCurveData, resultCurveData);
        ngDialog.open({
            template: require('./confusion-matrix.html'),
            plain: true,
            className: 'i2g-ngdialog confusion-matrix-dialog',
            controller: ['$scope', '$element',
                function ($scope, $element) {
                    // $scope.datasetName = self.controller.getDataset(dataset.idWell, dataset.idDataset).name;
                    $scope.datasetName = datasetName;
                    const matrixTransposed = _.unzip(matrix);
                    $scope.rowPercentage = function (row) {
                        return _.round(matrix[row][row] / _.sum(matrix[row]) * 100, 1) || 0;
                    }
                    $scope.colPercentage = function (col) {
                        return _.round(matrixTransposed[col][col] / _.sum(matrixTransposed[col]) * 100, 1) || 0;
                    }
                    $scope.matrix = matrix;
                    const sum = _.sum(matrix.flat());
                    $scope.sum = sum;
                    $scope.averageAccuracy = _.round(matrix.reduce((acc, row, idx) => acc + row[idx], 0) / sum * 100, 1) || 0;
                    const colorScale = d3.scaleLinear().domain([0, 20, 40, 60, 80, 100]).range(['#F7FCF0', '#D4EECD', '#9FDAB8', '#57B8D0', '#1C7CB6', '#053D7F']);
                    $scope.getColor = function (val, max = 100) {
                        return colorScale(val / max * 100);
                    };
                    const textColorScale = d3.scaleQuantile().domain([0, 80, 100]).range(['#000', '#fff', '#fff']);
                    $scope.getTextColor = function (val, max = 100) {
                        return textColorScale(val / max * 100);
                    }
                }
            ],
        });
    }
}
