import { parse } from "query-string";

const serviceName = 'mlApi';
angular.module(serviceName, ['wiApi']).factory(serviceName, function($http, $timeout, wiApi) {
    return new mlApi($http, $timeout, wiApi);
});
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
function mlApi($http, $timeout, wiApi) {
    this.currentModel;
    this.setBaseCurrentModel = function(model) {
        this.currentModel = model;
    }
    this.getBaseCurrentModel = () => self.currentModel;
    
    function postCreateModel(payload) {
        return httpPromise(`${self.getBaseCurrentModel().url}/api/model/create/${self.getBaseCurrentModel().create}`, payload, 'POST', { service: self.getBaseCurrentModel().service });
    }
    this.postCreateModel = postCreateModel;
    function postCreateBucketId(payload) {
        return httpPromise(`${self.getBaseCurrentModel().url}/api/data`, payload, 'POST', { service: self.getBaseCurrentModel().service });
    }
    this.postCreateBucketId = postCreateBucketId;
    function putDataOfTrain(payload) {
        return httpPromise(`${self.getBaseCurrentModel().url}/api/data`, payload, 'PUT', { service: self.getBaseCurrentModel().service });
    }
    this.putDataOfTrain = putDataOfTrain;
    function postTrainByBucketData(payload) {
        return httpPromise(`${self.getBaseCurrentModel().url}/api/model/train_by_bucket_data`, payload, 'POST', { service: self.getBaseCurrentModel().service });
    }
    this.postTrainByBucketData = postTrainByBucketData;
    function postPredict(payload) {
        return httpPromise(`${self.getBaseCurrentModel().url}/api/model/predict`, payload, 'POST', { service: self.getBaseCurrentModel().service });
    }
    this.postPredict = postPredict;
    function getBucket() {
        return httpPromise(`${self.getBaseCurrentModel().url}/api/bucket/list`, {}, 'GET', { service: self.getBaseCurrentModel().service });
    }
    this.getBucket = getBucket;
    function fillNullInCurve(fillArr, curve, cb) {
        for (let i in fillArr) {
            curve.value.splice(fillArr[i], 0, NaN);
        }
        cb && cb(curve);
    }
    this.fillNullInCurve = fillNullInCurve;
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
    this.fillNullInCurve = fillNullInCurve;

    function getDataCurves(dataset, curves) {
        return new Promise((resolve) => {
            let listInputCurves = [];
            if (curves.length) {
                // for (let i = 0; i < curves.length; i++) {
                //     let curve = dataset.curves.find(c => {
                //         return c.name === curves[i].value.name;
                //     })
                //     if (!curve) callback([]);
                //     let curveData = await wiApi.getCurveDataPromise(curve.idCurve);
                //     listInputCurves[i] = curveData.map(function(d) {
                //         return parseFloat(d.x);
                //     });
                // }
                async.eachOfSeries(curves, (curve, idx, next) => {
                    let c = dataset.curves.find(v => v.name === curve.name);
                    if(!c) {
                        return resolve([]);
                    }
                    wiApi.getCurveDataPromise(c.idCurve)
                    .then((data) => {
                        listInputCurves[idx] = data.map(d => parseFloat(d.x));
                        next();
                    })
                }, (err) => {
                    if(err) console.log(err);
                    resolve(listInputCurves);
                });
            } else {
                resolve([]);
            }
        });
    }
    this.getDataCurves = getDataCurves;
    function getDataCurveAndFilter(dataset, curves) {
        return new Promise((resolve, reject) => {
            // let arrNaN = [];
            let inputCurveData = [];
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
    this.getDataCurveAndFilter = getDataCurveAndFilter;
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
    this.evaluateExpr = evaluateExpr;
    async function saveCurveAndCreatePlot(_step, curveInfo, dataset, callback, errorCurveInfo) {
        saveCurve(curveInfo, dataset, function(curveProps) {
            function handle(errorCurveInfo) {
                let orderNum = dataset.idDataset.toString() + '1';
                let errorCurve = null;
                let inCurves = dataset.inputCurveSpecs.map((ipt) => {
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
    this.saveCurveAndCreatePlot = saveCurveAndCreatePlot;
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
    this.getSomVisualize = getSomVisualize;
    function createBlankPlot(idProject, idMlProject, namePlot) {
        return wiApi.createLogplotPromise({
            idProject: idProject,
            name: `${namePlot} - ${localStorage.getItem('username') || 'none'} - ${idMlProject}`,
            override: true,
            option: 'blank-plot'
        });
    }
    this.createBlankPlot = createBlankPlot;
    this.createModelAndBucketId = createModelAndBucketId;
    function createModelAndBucketId(mlProject, params, dims) {
        return new Promise((resolve, reject) => {
            let payload = {};
            // let params = self.currentSelectedModel.payload.params;
            params.forEach(i => {
                payload[i.name] = i.value;
            })
            // console.log(payload);
            postCreateModel(payload)
                .then((resModel) => {
                    // self.stateWorkflow.model_id = resModel.model_id
                    // self.stateWorkflow.bucket_id = self.stateWorkflow.model_id + localStorage.getItem('username') + self.mlProjectSelected.idMlProject\
                    modelId = resModel.model_id;
                    bucketId = `${modelId}_${localStorage.getItem('username')}_${mlProject.idMlProject}`;
                    let payload1 = {
                        bucket_id: bucketId,
                        dims: dims,
                    }
                    postCreateBucketId(payload1)
                        .then((resBucket) => {
                            if (resBucket.existed) {
                                payload1.override_flag = true;
                                postCreateBucketId(payload1)
                                    .then((resBucketId) => {
                                        resolve({
                                            model_id: modelId,
                                            bucket_id: bucketId
                                        })
                                    })
                            } else {
                                resolve({
                                    model_id: modelId,
                                    bucket_id: bucketId
                                })
                            }
                        })
                })
                .catch((err) => {
                    reject(err);
                })
        })
    }
}