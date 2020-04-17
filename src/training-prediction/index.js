const moduleName = "trainingPrediction";
const componentName = "trainingPrediction";
module.exports.name = moduleName;

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
TrainingPredictionController.$inject = ['$scope', '$timeout', 'wiDialog', 'wiApi', '$http', 'somModelService', 'mlApi']

function TrainingPredictionController($scope, $timeout, wiDialog, wiApi, $http, somModelService, mlApi) {
    let self = this;

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
    // ============================================================================
    // this.modelId = null;
    // this.bucketId = null;
    this.runTask = function(i) {
        if(!self.controller.project) {
            self.controller.createProject();
         return   
        }
        if(i == -1) {
            mlApi.createModelAndBucketId({name: 1, idMlProject: 10}, self.controller.curveSpecs.length, self.controller.project.idMlProject)
            .then((res) => {
                console.log(res);
                self.modelId = res.modelId;
                self.bucketId = res.bucketId;
                self.controller.project.content.modelId = res.modelId;
                self.controller.project.content.bucketId = res.bucketId;
                train();
            });
        }else if(i == 1) {
            verify();
        }else if(i == 2) {
            predict();
        }
    }
    this.runAll = function() {
        mlApi.createModelAndBucketId({name: 1, idMlProject: 10}, self.controller.curveSpecs.length, self.controller.project.idMlProject)
        .then((res) => {
            console.log(res);
            self.modelId = res.modelId;
            self.bucketId = res.bucketId;
            self.controller.project.content.modelId = res.modelId;
            self.controller.project.content.bucketId = res.bucketId;
            return train();
        })
        .then(() => verify())
        .then(() => predict())
        .then(() => console.log('run all success'))
        .catch(() => console.log('run all fail'))
    }
    function beforeTrain() {
        return new Promise((resolve, reject) => {
            if(self.controller.tabs['training'].listDataset.length == 0) {
                return reject(new Error('Please drop datasets for training'));
            }
            async.each(self.controller.tabs['training'].listDataset, (dataset, _next) => {
                if(!isRun(dataset)) {
                    return reject(new Error('Curve in dataset must be select'))
                }
                if(!dataset.active) {
                    return _next();
                }
                mlApi.evaluateExpr(dataset, dataset.discrmnt)
                .then(curves => {
                    return mlApi.getDataCurveAndFilter(dataset, curves);
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
                !err ? resolve() : reject(); 
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
                resolve();
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
            beforeTrain()
            .then(() => trainData())
            .then(() => afterTrain())
            .then(() => {
                console.log('Success')
                toastr.success('Training success');
                self.controller.project.content.state = 1;
                self.controller.saveProject();
            })
            .catch(err => {
                console.log('Error')
                toastr.error(err ? err.message : err || 'Something went error' );
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
                if(res) toastr.success('Verify success');
                console.log('Success')
                self.controller.saveProject();
            })
            .catch(err => {
                toastr.error(err ? err.message : err || 'Something went error' );
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
                toastr.success('Prediction success');
                console.log('Success')
                self.controller.saveProject();
            })
            .catch(err => {
                toastr.error(err ? err.message : err || 'Something went error' );
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
            if(self.controller.project.content.state < 1) {
                return reject(new Error('Please training before verify or predict'));
            }
            if(self.controller.tabs['verify'].listDataset.length == 0) {
                return resolve(false)
            }
            let idProject = self.controller.tabs['verify'].listDataset[0].idProject;
            mlApi.createBlankPlot(idProject, self.controller.project.idMlProject, self.controller.tabs['verify'].plotName)
            .then((plot) => {
                self.controller.tabs['verify'].plot = plot;
                self.controller.tabs['verify'].plot.username = localStorage.getItem('username') || ''
                async.each(self.controller.tabs['verify'].listDataset, (dataset, _next) => {
                    if(!isRun(dataset)) {
                        return reject(new Error('Curve in dataset must be select'))
                    }
                    if(!dataset.active) {
                        return _next();
                    }
                    mlApi.evaluateExpr(dataset, dataset.discrmnt)
                    .then(curves => {
                        return mlApi.getDataCurveAndFilter(dataset, curves);
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
                        return resultVerify(res, dataset);
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
    function resultVerify(res, dataset) {
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
            mlApi.getDataCurves(dataset, dataset.curveSpecs)
            .then(curves => {
                // tCurve = curves.shift();
                tCurve = mlApi.filterNull(curves);
                return mlApi.fillNullInCurve(tCurve.fillNull, curveArr)
            })
            .then(curves => {
                let idDataset = dataset.idDataset;
                let idFamily = dataset.curveSpecs[0].value.idFamily;
                let idWell = dataset.idWell;
                let unit = dataset.curveSpecs[0].value.unit;

                let target_groups = [], targetGroupsInfo = null;
                let curveTarget = curves[0].value;
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
                    data: curveTarget,
                    unit: unit || null
                }
                let errorCurveInfo = null, dataError = null;
                if (mlApi.getBaseCurrentModel().type == 'regression') {
                    dataError = curveTarget.map((a, i) => {
                        return Math.abs((tCurve[i] - a) / a);
                    })
                    errorCurveInfo = {
                        idDataset: idDataset,
                        idFamily: idFamily,
                        idWell: idWell,
                        name: "error verify curve",
                        data: dataError,
                        unit: unit || null ,
                        minValue: 0,
                        maxValue: 1
                    }
                }
                mlApi.saveCurveAndCreatePlot(self.controller.tabs['verify'], curveInfo, dataset, function() {
                    resolve();
                }, errorCurveInfo, targetGroupsInfo)
            })
        })
    }

    function beforePredict() {
        return new Promise((resolve, reject) => {
            if(self.controller.project.content.state < 1) {
                return reject(new Error('Please training before verify or predict'));
            }
            if(self.controller.tabs['prediction'].listDataset.length == 0) {
                return reject(new Error('Please drop datasets for predict'));
            }
            let idProject = self.controller.tabs['prediction'].listDataset[0].idProject;
            mlApi.createBlankPlot(idProject, self.controller.project.idMlProject, self.controller.tabs['prediction'].plotName)
            .then(plot => {
                self.controller.tabs['prediction'].plot = plot
                self.controller.tabs['prediction'].plot.username = localStorage.getItem('username') || ''
                async.each(self.controller.tabs['prediction'].listDataset, (dataset, _next) => {
                    if(!isRun(dataset)) {
                        return reject(new Error('Curve in dataset must be select'))
                    }
                    if(!dataset.active) {
                        return _next();
                    }
                    mlApi.evaluateExpr(dataset, dataset.discrmnt)
                    .then(curves => {
                        return mlApi.getDataCurveAndFilter(dataset, curves);
                    })
                    .then(dataCurves => {
                        return mlApi.transformData(dataCurves, self.controller.curveSpecs)
                    })
                    .then(dataCurves => {
                        let payload = {
                            features: dataCurves,
                            model_id: self.controller.project.content.modelId
                        }
                        return mlApi.postPredict(payload);
                    })
                    .then(res => {
                        return resultPredict(res, dataset)
                    })
                    .then(() => {
                        _next();
                    })
                    .catch(err => {
                        _next(err);
                    })
                }, err => {
                    err ? reject() : resolve()
                })
            })
        })
    }
    function resultPredict(res, dataset) {
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
            mlApi.getDataCurves(dataset, dataset.curveSpecs)
            .then(curves => {
                tCurve = mlApi.filterNull(curves);
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
                if(!self.controller.tabs['training'].listDataset.length || !self.controller.tabs['training'].listDataset[0].curves.length) {
                    return reject("Must be have dataset in training for predict");
                }
                wiApi.getCurveInfoPromise(self.controller.tabs['training'].listDataset[0].curveSpecs[0].value.idCurve)
                .then(info => {
                    curveInfo.idFamily = info.idFamily;
                    curveInfo.unit = info.unit;
                    if(targetGroupsInfo) {
                        targetGroupsInfo.idFamily = info.idFamily;
                        targetGroupsInfo.unit = info.unit;
                    }
                    mlApi.saveCurveAndCreatePlot(self.controller.tabs['prediction'], curveInfo, dataset, function() {
                        resolve();
                    }, null, targetGroupsInfo)
                })
            })
        })
    }

    function isRun(dataset) {
        for (let i of dataset.curveSpecs) {
            if (!i.value) {
                return false;
            }
        }
        return true;
    }
    this.onToggleActive = function(dataset) {
        $timeout(() => {
            dataset.active = !dataset.active;
        })
    }
    // function predictData() {}
    // function afterPredict() {}
}