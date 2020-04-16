import { parse } from "query-string";

const serviceName = 'mlApi';
angular.module(serviceName, ['wiApi']).factory(serviceName, function($http, $timeout, wiApi) {
    return new mlApi($http, $timeout, wiApi);
});
function mlApi($http, $timeout, wiApi) {
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
    const self = this;
    this.currentModel;
    this.setBaseCurrentModel = function(model) {
        this.currentModel = model;
    }
    this.getBaseCurrentModel = () => self.currentModel;
    
    this.postCreateModel = postCreateModel;
    function postCreateModel(payload) {
        return httpPromise(`${self.getBaseCurrentModel().url}/api/model/create/${self.getBaseCurrentModel().create}`, payload, 'POST', { service: self.getBaseCurrentModel().service });
    }
    this.postCreateBucketId = postCreateBucketId;
    function postCreateBucketId(payload) {
        return httpPromise(`${self.getBaseCurrentModel().url}/api/data`, payload, 'POST', { service: self.getBaseCurrentModel().service });
    }
    this.putDataOfTrain = putDataOfTrain;
    function putDataOfTrain(payload) {
        return httpPromise(`${self.getBaseCurrentModel().url}/api/data`, payload, 'PUT', { service: self.getBaseCurrentModel().service });
    }
    this.postTrainByBucketData = postTrainByBucketData;
    function postTrainByBucketData(payload) {
        return httpPromise(`${self.getBaseCurrentModel().url}/api/model/train_by_bucket_data`, payload, 'POST', { service: self.getBaseCurrentModel().service });
    }
    this.postPredict = postPredict;
    function postPredict(payload) {
        return httpPromise(`${self.getBaseCurrentModel().url}/api/model/predict`, payload, 'POST', { service: self.getBaseCurrentModel().service });
    }
    this.getBucket = getBucket;
    function getBucket() {
        return httpPromise(`${self.getBaseCurrentModel().url}/api/bucket/list`, {}, 'GET', { service: self.getBaseCurrentModel().service });
    }
    this.getSomVisualizeData = getSomVisualizeData;
    function getSomVisualizeData(modelId) {
        return httpPromise(`${self.getBaseCurrentModel().url}/api/model/som/${modelId}`, {}, 'GET', { service: self.getBaseCurrentModel().service });
    }
    this.fillNullInCurve = fillNullInCurve;
    function fillNullInCurve(fillArr, curves) {
        return new Promise(resolve => {
            async.eachSeries(curves, (curve, next) => {
                for (let i in fillArr) {
                    curve.value.splice(fillArr[i], 0, NaN);
                }
                next();
            }, err => {
                resolve(curves);
            })
        })
    }
    this.filterNull = filterNull;
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
    this.getDataCurves = getDataCurves;
    function getDataCurves(dataset, curves) {
        return new Promise((resolve) => {
            let listInputCurves = [];
            if (curves.length) {
                async.eachOfSeries(curves, (curve, idx, next) => {
                    let c = dataset.curves.find(v => v.name === curve.value.name);
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
   
    function getDataCurveAndFilter(dataset, curves) {
        return new Promise((resolve, reject) => {
            // let arrNaN = [];
            let inputCurveData = [];
            async.eachSeries(dataset.curveSpecs, async function(input) {
                    let curve = input.value;
                    let dataCurve = await wiApi.getCurveDataPromise(curve.idCurve);
                    for (let i in dataCurve) {
                        dataCurve[i] = parseFloat(dataCurve[i].x, 4);
                        if (isNaN(dataCurve[i])) curves[i] = false;
                    }
                    inputCurveData.push(dataCurve);
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
                async function(err) {
                    console.log('done!', curvesData);
                    let data = await wiApi.getCurveDataPromise(curvesInDataset[0].idCurve);
                    // console.log(data);
                    length = data.length;
                    for (let i = 0; i <= length; i++) {
                        result.push(evaluate(discriminator, i));
                    }
                    resolve(result);
                }
            );
        })
    }
    this.evaluateExpr = evaluateExpr;
    async function saveCurveAndCreatePlot(tab, curveInfo, dataset, callback, errorCurveInfo, targetGroupsInfo) {
        saveCurve(curveInfo, dataset, function(curveProps) {
            function handle(errorCurveInfo) {
                let orderNum = dataset.idDataset.toString() + '1';
                let inCurves = dataset.curveSpecs.map((ipt) => {
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
                createLogPlot(tab, dataset, inCurves, orderNum, function() {
                    callback();
                });
            }
            if(errorCurveInfo) {
                saveCurve(errorCurveInfo, dataset, function(errorCurveProps) {
                    if (errorCurveProps) handle(errorCurveProps);
                })
            } else if(targetGroupsInfo) {
                saveCurve(targetGroupsInfo, dataset, function(targetGroupsCurveProps) {
                    if (targetGroupsCurveProps) handle(targetGroupsCurveProps);
                })
            } else {
                handle();
            }
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
        callback(newCurve);
    }
    this.createLogPlot = createLogPlot;
    function createLogPlot(tab, dataset, inCurves, orderNum, callback) {
        console.log('_step', tab);
        let idPlot = tab.plot.idPlot;
        let currentOrderNum = orderNum;
        wiApi.createDepthTrackPromise({
                idPlot: idPlot,
                width: 0.75,
                orderNum: currentOrderNum.slice(0, currentOrderNum.length - 1) + '0',
                widthUnit: 'inch',
                idWell: dataset.idWell
            })
            .then((res) => {
                async.eachSeries(inCurves, async function(curve) {
                    let trackData = await wiApi.createLogTrackPromise({
                        idPlot: idPlot,
                        orderNum: currentOrderNum,
                        title: curve.name,
                        width: 1
                    });
                    let line = wiApi.createLinePromise({
                                    idTrack: trackData.idTrack,
                                    idCurve: curve.idCurve,
                                    orderNum: currentOrderNum
                                })
                    if (line && curve.minValue != undefined && curve.maxValue != undefined) {
                            line.minValue = curve.minValue;
                            line.maxValue = curve.maxValue;
                            await wiApi.editLinePromise(line);
                        }
                }, function(err) {
                    if (err) return err;
                    callback()
                })
            })
    }
    this.createBlankPlot = createBlankPlot;
    function createBlankPlot(idProject, idMlProject, namePlot) {
        return wiApi.createLogplotPromise({
            idProject: idProject,
            name: `${namePlot} - ${localStorage.getItem('username') || 'none'} - ${idMlProject}`,
            override: true,
            option: 'blank-plot'
        });
    }
    this.createModelAndBucketId = createModelAndBucketId;
    function createModelAndBucketId(mlProject, dims) {
        return new Promise((resolve, reject) => {
            let payload = {};
            self.currentModel.payload.params.forEach(i => {
                payload[i.name] = i.value.properties || i.value;
            })
            var modelId, bucketId
            postCreateModel(payload)
                .then((resModel) => {
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
                                            modelId: modelId,
                                            bucketId: bucketId
                                        })
                                    })
                            } else {
                                resolve({
                                    modelId: modelId,
                                    bucketId: bucketId
                                })
                            }
                        })
                })
                .catch((err) => {
                    reject(err);
                })
        })
    }
    this.createPayloadForTrain = createPayloadForTrain;
    function createPayloadForTrain(modelId, bucketId) {
        if (!self.currentModel.payload.train) {
            return {
                model_id: modelId,
                bucket_id: bucketId
            }
        } else {
            let payload = {
                model_id: modelId,
                bucket_id: bucketId
            };
            self.currentModel.payload.train.forEach(i => {
                payload[i.name] = i.value.properties || i.value;
            })
            return payload
        }
    }
    this.transformData = transformData;
    function transformData(dataCurves, curveSpecs) {
        return new Promise(resolve => {
            let input = dataCurves.length === curveSpecs.length ? curveSpecs.filter(i => i) : curveSpecs.filter((i, idx) => idx > 0);
            dataCurves.forEach((curve, idx) => {
                let transform = input[idx].transform;
                switch(transform) {
                    case 'logarithmic':
                        for (let i in curve) {
                            if (isNaN(curve[i])) continue;
                            try {
                                curve[i] = Math.log10(curve[i]);
                                if (!isFinite(curve[i])) curve[i] = NaN;
                            }
                            catch (err) {
                                curve[i] = NaN;
                            }
                        }
                        break;
                    case 'exponential':
                        for (let i in curve) {
                            if (isNaN(curve[i])) continue;
                            try {
                                curve[i] = Math.pow(10, curve[i]);
                                if (!isFinite(curve[i])) curve[i] = NaN;
                            }
                            catch (err) {
                                curve[i] = NaN;
                            }
                        }
                }
            });
            resolve(dataCurves);
        })
    }
    this.invTransformData = invTransformData;
    function invTransformData(curve, curveSpecs) {
        let transform = curveSpecs[0].transform;
        switch(transform) {
            case 'logarithmic':
                for (let i in curve) {
                    if (isNaN(curve[i])) {
                        curve[i] = null;
                        continue;
                    }
                    try {
                        curve[i] = Math.pow(10, curve[i]);
                        if (!isFinite(curve[i])) curve[i] = NaN;
                    }
                    catch (err) {
                        curve[i] = 0;
                    }
                }
                break;
            case 'exponential':
                for (let i in curve) {
                    if (isNaN(curve[i])) {
                        curve[i] = null;
                        continue;
                    }
                    try {
                        curve[i] = Math.log10(curve[i]);
                        if (!isFinite(curve[i])) curve[i] = NaN;
                    }
                    catch (err) {
                        curve[i] = 0;
                    }
                }
        }
        return curve;
    }
}