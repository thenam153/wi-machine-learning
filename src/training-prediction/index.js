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
    this.modelId = null;
    this.bucketId = null;
    this.runTask = function(i) {
        if(i == -1) {
            mlApi.createModelAndBucketId({name: 1, idMlProject: 10}, self.controller.curveSpecs.length)
            .then((res) => {
                console.log(res);
                self.modelId = res.modelId;
                self.bucketId = res.bucketId;
                train();
            });
        }else if(i == 1) {
            verify();
        }else if(i == 2) {
            predict();
        }
    }

    function beforeTrain() {
        return new Promise((resolve, reject) => {
            async.each(self.controller.tabs['training'].listDataset, (dataset, _next) => {
                mlApi.evaluateExpr(dataset, dataset.discrmnt)
                .then(curves => {
                    return mlApi.getDataCurveAndFilter(dataset, curves);
                })
                .then(dataCurves => {
                    return mlApi.transformData(dataCurves, self.controller.curveSpecs);
                })
                .then(dataCurves => {
                    let payload = {
                        bucket_id: self.bucketId,
                        data: dataCurves
                    }
                    return mlApi.putDataOfTrain(payload);
                })
                .then(res => {
                    resolve();
                })
                .catch(err => {
                    reject(err);
                })
            })
        })
    }
    function trainData() {
        return new Promise((resolve, reject) => {
            let payload = mlApi.createPayloadForTrain(self.modelId, self.bucketId);
            mlApi.postTrainByBucketData(payload)
            .then((res) => {
                toastr.success('Train success', 'Success');
                resolve();
            })
            .catch((err) => {
                toastr.error(err || 'Something was wrong', 'Error');
                reject(err)
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
    function getSomVisualize() {
        if(mlApi.getBaseCurrentModel()['som-visualization']) {
            mlApi.getSomVisualizeData(self.modelId)
            .then(data => {
                console.log(data);
            })
        }
    }

    function train() {
        beforeTrain()
        .then(() => trainData())
        .then(() => afterTrain())
        .then(() => console.log('Success'))
        .catch(() => console.log('Error'))
    }
    function verify() {
        beforeVerify()
        .then(() => console.log('Success'))
        .catch(() => console.log('Error'))
    }
    function predict() {
        beforePredict()
        .then(() => console.log('Success'))
        .catch(() => console.log('Error'))
    }
    function beforeVerify() {
        return new Promise((resolve, reject) => {
            mlApi.createBlankPlot(1, 10, 'Verification Plot')
            .then((plot) => {
                self.controller.tabs['verify'].plot = plot;
                self.controller.tabs['verify'].plot.username = localStorage.getItem('username') || ''
                async.each(self.controller.tabs['verify'].listDataset, (dataset, _next) => {
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
                            model_id: self.modelId
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
                    err ? reject() : resolve()
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
                tCurve = curves.shift();
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
    // function verifyData() {}
    // function afterVerify() {}

    function beforePredict() {
        return new Promise((resolve, reject) => {
            mlApi.createBlankPlot(1, 10, 'Prediction Plot')
            .then(plot => {
                self.controller.tabs['prediction'].plot = plot
                self.controller.tabs['prediction'].plot.username = localStorage.getItem('username') || ''
                async.each(self.controller.tabs['prediction'].listDataset, (dataset, _next) => {
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
                            model_id: self.modelId
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
    // function predictData() {}
    // function afterPredict() {}
}