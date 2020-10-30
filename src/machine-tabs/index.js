const moduleName = "machineTabs";
const componentName = "machineTabs";
module.exports.name = moduleName;
// const queryString = require('query-string')
const limitToastDisplayed = 3;
// const { wiLogin } = require('@revotechuet/misc-component-vue');
const { wiLoginClient } = require('@revotechuet/misc-component-vue');
const wiLogin = new wiLoginClient('WI_AI_CLIENT')
var config;
if (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'development') {
    config = require('../config/config').development
} else if (process.env.NODE_ENV === 'prod' || process.env.NODE_ENV === 'production') {
    config = require('../config/config').production
} else if (process.env.NODE_ENV === 'local') {
    config = require('../config/config').local;
}
else {
    config = require('../config/config').default
}
let { BASE_URL, AUTHENTICATION_HOME, WHOAMI } = config
Object.assign(window.localStorage, { BASE_URL, AUTHENTICATION_HOME })
// window.localStorage.setItem('BASE_URL', config.base_url);
var app = angular.module(moduleName, ['modelSelection',
    'datasetSelection',
    'zonesetConfig',
    'trainingPrediction',
    'convergenceAnalysis',
    'mlApi',
    'wiApi',
    'wiNeuralNetwork',
    // 'wiLogin',
    'wiToken',
    'wiDialog',
    'wiDiscriminator',
    'ngDialog',
    'somModelService',
    'heatMap',
    'wiDropdownListNew',
]);
app.run(['wiApi', 'mlApi', function (wiApi, mlApi) {
    wiApi.client(mlApi.getClientId()).setBaseUrl(window.localStorage.getItem("BASE_URL"));
  }]);
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
const TAB_CONVERGENCE =  'Convergence Analysis';
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
    function excludeReplacer(key, value) {
        switch(key) {
            case 'discrimnt':
            case 'resultCurveName':
            case 'plotName':
            case 'active':
            case 'selectedValues':
                return undefined;
        }
        return value;
    }
    $scope.$watch(() => (JSON.stringify(self.tabs, excludeReplacer) + ((self.typeInput || {}).type || "")) , () => {
        this.buildInputSelectionListForTabs([
            STEP_TRAIN,
            STEP_VERIFY
        ]).then(curves => {
            self.selectionListTarget = curves;
            return self.buildInputSelectionListForTabs([
                STEP_TRAIN,
                STEP_VERIFY,
                STEP_PREDICT
            ]);
        }).then(curves => {
            self.selectionList = curves;
            $timeout(() => {
                buildAllCurvesCache();
            });
        }).catch(e => {
            console.log(e)
            $timeout(() => {
                self.showNotiFn('error', 'Error', e.message || "Open project error" , 4000);
                removeDataProject() 
            })
        });
    });
    this.getUser = function() {
    return localStorage.username || 'Guest';
    }
    this.logout = function() {
        let logoutDialog = ngDialog.open({
          template: 'templateLogout',
          className: 'i2g-ngdialog',
          showClose: true,
          scope: $scope,
        });
        self.acceptLogout = function () {
            wiLogin.logout({ redirectUrl: window.location.origin, whoami: WHOAMI, loginPage: AUTHENTICATION_HOME });
            window.localStorage.clear();
        }
        self.cancelLogout = function () {
          ngDialog.close(logoutDialog.id)
        }
      }
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
        loadTheme();
        loadFontSize();
        self.toastArray = [];
		self.toastHistory = [];
		self.mute = true;
        wiLogin.doLogin({ redirectUrl: window.location.origin, whoami: WHOAMI, loginPage: AUTHENTICATION_HOME });
        self.titleTabs = [TAB_DATASET, TAB_MODEL, TAB_TRAIN, TAB_ZONESET, TAB_CONVERGENCE];
        self.steps = [STEP_TRAIN, STEP_VERIFY, STEP_PREDICT];
        self.current_tab = 0;
        initMlProject();
        //if (self.token && self.token.length) window.localStorage.setItem('token', self.token);
        await updateVersion();
        self.restoreProject();
        $scope.$watch(() => window.localStorage.getItem("token"), () => wiApi && wiApi.client(getClientId()).doInit());
    }
    async function updateVersion() {
		let oldVersion = localStorage.getItem('VER') || localStorage.getItem('VERSION')
		let newVersion = await new Promise((resolve) => {
			$http({
				method: 'GET',
				url: window.location + 'i2g.version',
				cache: false
			}) 
			.then(res => {
				res ? resolve(res.data) : resolve(null)
			})
			.catch(err => {
				resolve(null)
			})
		}) 
		if(!newVersion) return
		if(newVersion != oldVersion) {
			await new Promise((resolve) => {
				let dialog = ngDialog.open({
					template: 'templateVersion',
					className: 'i2g-ngdialog',
					showClose: false,
					scope: $scope,
                    closeByEscape: false,
                    closeByDocument: false
				})
				self.acceptRefresh = function() {
					localStorage.setItem('VER', newVersion)
					location.reload(true)
					// resolve()
				}
				self.cancelRefresh = function() {
					dialog.close()
					resolve()
				}
			})
			
		}
	}	
    this.setTheme = function(theme)  {
        if (theme == 'dark') {
          localStorage.setItem('theme', theme);
          $timeout(()=>{
            self.currentTheme = 'dark';
          })
          $(':root').css('--toolbar-bg-color', '#252525');
          $(':root').css('--white', '#252525');
          $(':root').css('--black', '#fff');
          $(':root').css('--text-primary-color', '#fff');
          $(':root').css('--button-bg-color', '#434343');
          $(':root').css('--input-bg', '#2d2d2d');
          $(':root').css('--dialog-bg-color', '#333333');
          $(':root').css('--input-bg-hover', '#1e1e1e');
          $(':root').css('--box-shadow', '0px 10px 50px rgb(0 0 0 / 17%)');
          $(':root').css('--body-bg-color', '#252525');
          $(':root').css('--input-check-bg', '#333333');
          $(':root').css('--input-border', '#fff');
          $(':root').css('--select-bg', '#f3f3f4');
          $(':root').css('--select-border', '#434343');

        }
        if (theme == 'light') {
          localStorage.setItem('theme', 'light');
          $timeout(()=>{
            self.currentTheme = 'light';
          })
          $(':root').css('--toolbar-bg-color', '#fff');
          $(':root').css('--body-bg-color', '#f3f3f4');
          $(':root').css('--dialog-bg-color', '#fff');
          $(':root').css('--white', '#fff');
          $(':root').css('--black', '#000');
          $(':root').css('--button-bg-color', '#f3f3f4');
          $(':root').css('--text-primary-color', '#0d0b22');
          $(':root').css('--input-check-bg', '#fff');
          $(':root').css('--input-bg', '#f3f3f4');
          $(':root').css('--input-border', '#9e9ea7');
          $(':root').css('--input-bg-hover', '#fff');
          $(':root').css('--box-shadow', '0px 10px 50px rgba(0, 0, 0, 0.1)');
          $(':root').css('--select-bg', '#f3f3f4');
          $(':root').css('--select-border', '#f3f3f4');

        }
    }
    function loadTheme() {
    if (localStorage.getItem('theme') == '') {
        self.setTheme('light');
        $timeout(()=>{
        self.currentTheme = 'light';
        })
    } else {
        self.setTheme(localStorage.getItem('theme'));
    }
    }
    this.setFontSize = function(size) {
    if (size == '12') {
        localStorage.setItem('font-size', size);
        self.currentFont = '12';
        $('*').addClass('font-12');
        $('*').removeClass('font-14');
        $('*').removeClass('font-16');
        $('*').removeClass('font-18');
        $('*').removeClass('font-20');
    }
    if (size == '14') {
        localStorage.setItem('font-size', size);
        self.currentFont = '14';
        $('*').addClass('font-14');
        $('*').removeClass('font-12');
        $('*').removeClass('font-16');
        $('*').removeClass('font-18');
        $('*').removeClass('font-20');
    }
    if (size == '16') {
        localStorage.setItem('font-size', size);
        self.currentFont = '16';
        $('*').addClass('font-16');
        $('*').removeClass('font-14');
        $('*').removeClass('font-12');
        $('*').removeClass('font-18');
        $('*').removeClass('font-20');
    }
    if (size == '18') {
        localStorage.setItem('font-size', size);
        self.currentFont = '18';
        $('*').addClass('font-18');
        $('*').removeClass('font-14');
        $('*').removeClass('font-16');
        $('*').removeClass('font-12');
        $('*').removeClass('font-20');
    }
    if (size == '20') {
        localStorage.setItem('font-size', size);
        self.currentFont = '20';
        $('*').addClass('font-20');
        $('*').removeClass('font-14');
        $('*').removeClass('font-16');
        $('*').removeClass('font-18');
        $('*').removeClass('font-12');
    }

    }
    function loadFontSize() {
    if (localStorage.getItem('font-size') == '') {
        self.setFontSize('14');
        $timeout(()=>{
        self.currentFont = '14';
        })
    }
    else {
        self.setFontSize(localStorage.getItem('font-size'));
    }
    }
    self.openSetting = function() {
    let settingDialog = ngDialog.open({
        template: 'settingDialog',
        className: 'i2g-ngdialog',
        showClose: true,
        scope: $scope,
    });
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
                plotName: 'Verification Plot',
                createPlot: true
            },
            prediction: {
                listDataset: [],
                plotName: 'Prediction Plot',
                createPlot: true
            }
        }
        self.zonesetConfig = {
            training: {},
            verify: {},
            prediction: {}
        };
        self.zonesList = {};
        self.zonesetsTree = {};
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
    function removeDataProject() {
        for (let stepLabel of Object.keys(self.tabs)) {
            self.tabs[stepLabel].listDataset = []
        }
    }
    this.onChangeType = function(button) {
        if(self.typeInput.type != button.type) {
            $timeout(() => {
                self.typeInput = button;
                    self.curveSpecs.forEach(i => Object.assign(i, {
                        value: null,
                        currentSelect: LABEL_DEFAULT
                    }));
            })
            $timeout(() => {
                for (let stepLabel of Object.keys(self.tabs)) {
                    let listDataset = self.tabs[stepLabel].listDataset;
                    for (let dsItem of listDataset) {
                        dsItem.selectedValues = []
                    }
                }
            }, 1000)
        }
    }
    this.onInputItemChange = function(i, params) {
        let item = params[0];
        let idx = params[1];
        if(i) {
            item.currentSelect = i.label;
            item.value = i;
            for (let stepLabel of Object.keys(self.tabs)) {
                let listDataset = self.tabs[stepLabel].listDataset;
                for (let dsItem of listDataset) {
                    dsItem.selectedValues = dsItem.selectedValues || [];
                    // dsItem.selectedValues[idx] = "";
                }
            }
        }
        /*else {
            console.log("set default");
            item.currentSelect = LABEL_DEFAULT;
        }*/
    }
    this.onRemoveInputItem = function($index) {
        if (self.curveSpecs.length > 2 && !self.curveSpecs[$index].isTarget) {
            for (let dsItem of self.tabs[STEP_TRAIN].listDataset) {
                dsItem.selectedValues.splice($index, 1);
            }
            for (let dsItem of self.tabs[STEP_VERIFY].listDataset) {
                dsItem.selectedValues.splice($index, 1);
            }
            for (let dsItem of self.tabs[STEP_PREDICT].listDataset) {
                dsItem.selectedValues.splice($index, 1);
            }
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
            functionCacheSteps[step].drop = function(event, datasets) {
                $timeout(() => {
                    for (let node of datasets) {
                        let vlDs = angular.copy(node);
                        if(!vlDs.idDataset) continue;
                        let ds = self.tabs[step].listDataset.find( i => i.idDataset === vlDs.idDataset);
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
                                discrimnt: {active: false},
                                resultCurveName: "RESULT_CURVE"
                                //curveSpecs
                            }
                            self.tabs[step].listDataset.push(dsItem);
                        } else {
                            $timeout(() => {
                                self.showNotiFn('error', 'Error','Already has this dataset' , 4000);
                            });
                            // toastr.error('Already has this dataset');
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
    this.buildInputSelectionListForTabs = function(stepLabels) {
        let dsItemHash = {};
        let datasetIds = [];
        let curves = [];
        let wellIds = [];
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
                    if(w != null) {
                        this.__WELLCACHE["" + w.idWell] = w;
                        buildAllCurvesCache();
                    }
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
                        let family = wiApi.client(getClientId()).getFamily(c.idFamily);
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
                        let family = wiApi.client(getClientId()).getFamily(c.idFamily);
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

    this.refreshCurveData = function() {
        this.buildInputSelectionListForTabs([
            STEP_TRAIN,
            STEP_VERIFY
        ]).then(curves => {
            self.selectionListTarget = curves;
            return self.buildInputSelectionListForTabs([
                STEP_TRAIN,
                STEP_VERIFY,
                STEP_PREDICT
            ]);
        }).then(curves => {
            self.selectionList = curves;
            $timeout(() => {
                buildAllCurvesCache();
                self.showNotiFn('success', 'Successfully','Refresh success' , 4000);
            });
            // toastr.success('Refresh success', 'Success')
        }).catch(e => {
            $timeout(() => {
                self.showNotiFn('error', 'Error','Refresh error' , 4000);
                removeDataProject()
            });
            // toastr.error('Refresh error', 'Error');
            console.error(e)
        });
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

    this.updateTabTrainingPredictiong = function () {
        mlApi.setBaseCurrentModel(self.modelSelection.currentModel.value);
    }

    this.onClickDiscriminator = function(dataset) {
        wiApi.client(getClientId(dataset.owner, dataset.prjName)).getCachedWellPromise(dataset.idWell).then(well => {
            let fullDataset = well.datasets.find(ds => ds.idDataset === dataset.idDataset);
            if (!fullDataset) return;
            let discrimnt = Object.assign({}, dataset.discrimnt)
            wiDialog.discriminator(discrimnt, fullDataset.curves, function(res) {
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
        if (!item) return;
        arr[1].selectedValues = arr[1].selectedValues || [];
        arr[1].selectedValues[arr[3]] = item.name;
        return;
    }

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

            self.tabs[STEP_VERIFY].createPlot = self.project.content.plot[STEP_VERIFY].createPlot;
            self.tabs[STEP_PREDICT].createPlot = self.project.content.plot[STEP_PREDICT].createPlot;
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

        let modelType = self.modelSelection.listTypeModel.find(item => item.type === content.model.type);
        if (modelType)
            self.modelSelection.currentTypeModel = modelType;
        let model = self.modelSelection.listModel[modelType.type].find(item => item.name === content.model.name);
        if (model) {
            // Object.assign(self.modelSelection.currentModel, content.model);
            Object.assign(model, content.model);
            self.modelSelection.currentModel = model;
        }
            // self.modelSelection.currentModel = content.model;
        self.convergenceAnalysis = content.convergenceAnalysis;
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
                className: 'i2g-ngdialog',
                scope: $scope,
            });
        }).catch(err => {
            console.log(err)
            // toastr.error(err.message);
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
                            prediction: self.tabs[STEP_PREDICT].listDataset,
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
                        self.showNotiFn('success', 'Successfully','Rename project success' , 4000);
                    })
                    // toastr.success('Rename project success', 'Success');
                })
                .catch(err => {
                    console.error(err);
                    $timeout(()=>{
                        self.showNotiFn('error', 'Rename project fail',err.message , 4000);
                    })
                    // Toastr.error('Rename project fail', 'Error: ' + err.message);
                })
                .finally(() => {
                    ngDialog.close();
                })
            }
            ngDialog.close();
        }
        ngDialog.open({
            template: 'templateRenamePrj',
            className: 'i2g-ngdialog',
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
                        plotName: self.tabs[STEP_VERIFY].plotName,
                        createPlot: self.tabs[STEP_VERIFY].createPlot
                    },
                    prediction: {
                        plotName: self.tabs[STEP_PREDICT].plotName,
                        createPlot: self.tabs[STEP_PREDICT].createPlot
                    }
                },
                zonesetConfig: self.zonesetConfig,
                convergenceAnalysis: self.convergenceAnalysis,
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
            $timeout(()=>{
                self.showNotiFn('success', 'Successfully','Save project success' , 4000);
            })
            // toastr.success('Save project success', 'Success');
        })
        .catch((err) => {
            $timeout(()=>{
                self.showNotiFn('error', 'Error',"Save project fail" , 4000);
            })
            toastr.error('Save project fail', 'Error');
        })
        .finally(() =>  ngDialog.close())
    }
    this.saveAsProject = function() {
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
                                plotName: self.tabs[STEP_VERIFY].plotName,
                                createPlot: self.tabs[STEP_VERIFY].createPlot
                            },
                            prediction: {
                                plotName: self.tabs[STEP_PREDICT].plotName,
                                createPlot: self.tabs[STEP_PREDICT].createPlot
                            }
                        },
                        zonesetConfig: self.zonesetConfig,
                        convergenceAnalysis: self.convergenceAnalysis,
                        projectInfo: self.projectInfo,
                        curveSpecs: self.curveSpecs,
                        typeInput: self.typeInput,
                        model: self.modelSelection.currentModel,
                        state: -1,
                        modelId: null,
                        bucketId: null
                    }
                })
                .then((project) => {
                    // toastr.success('Create machine learing project success', 'Success')
                    console.log(project);
                    $timeout(() => {
                        self.showNotiFn('success', 'Successfully','Save as machine learing project success' , 4000);
                        self.project = project;
                        wiToken.setCurrentProjectName(project.name);
                    })
                    ngDialog.close();
                })
                .catch((err) => {
                    $timeout(()=>{
                        self.showNotiFn('error', 'Error',"Project's name already exists" , 4000);
                    })
                    // toastr.error("Project's name already exists", 'Error')
                })
            }
        }
        ngDialog.open({
            template: 'templateNewPrj',
            className: 'i2g-ngdialog',
            scope: $scope,
        });
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
                                plotName: self.tabs[STEP_VERIFY].plotName,
                                createPlot: self.tabs[STEP_VERIFY].createPlot
                            },
                            prediction: {
                                plotName: self.tabs[STEP_PREDICT].plotName,
                                createPlot: self.tabs[STEP_PREDICT].createPlot
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
                    // toastr.success('Create machine learing project success', 'Success')
                    console.log(project);
                    $timeout(() => {
                        self.showNotiFn('success', 'Successfully','Create machine learing project success' , 4000);
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
                    $timeout(()=>{
                        self.showNotiFn('error', 'Error',"Project's name already exists" , 4000);
                    })
                    // toastr.error("Project's name already exists", 'Error')
                })
                .finally(() => {
                    ngDialog.close();
                })
            }
            ngDialog.close();
        }
        ngDialog.open({
            template: 'templateNewPrj',
            className: 'i2g-ngdialog',
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
                    // toastr.success('Delete "' + project.name + '" Project Success', 'Success');
                    if(self.project && project.idMlProject === self.project.idMlProject) {
                            self.newProject();
                    }
                    $timeout(() => {
                        self.showNotiFn('success', 'Successfully','Delete "' + project.name + '" Project Success' , 4000);
                        $scope.allProjects = $scope.allProjects.filter((i) => i.idMlProject != project.idMlProject);
                    })
                })
                .catch((err) => {
                    $timeout(()=>{
                        self.showNotiFn('error', 'Error','Delete "' + project.name + '" Project error' , 4000);
                    })
                    // toastr.error('Delete "' + project.name + '" Project Error', 'Error');
                })
                .finally(() => {
                    dialog.close();
                })
        }
        let dialog = ngDialog.open({
            template: 'templateDeleteProject',
            className: 'i2g-ngdialog',
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
                className: 'i2g-ngdialog',
                scope: $scope,
            });
        })
        }else {
            wiToken.setCurrentProjectName('');
            self.openProject();
        }
    }
    this.__PROJECTCACHE = {};
    this.getProject = function(idProject, owner) {
        if(owner) {
            return this.__PROJECTCACHE[idProject + "_" + owner]
        }
        return this.__PROJECTCACHE[idProject]
    }
    this.setProject = function(projects) {
        projects.forEach(project => {
            if(project.owner == undefined) {
                this.__PROJECTCACHE["" + project.idProject] = project;
            }else {
                this.__PROJECTCACHE[project.idProject + "_" + project.owner] = project;
            }
        })
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
        let familyTable = wiApi.client(getClientId()).getFamilyTable();
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

    //HUNGNK

    $(".my_audio").trigger('load');
	function play_audio(task) {
		if(self.mute) return;
		if(task == 'play'){
			 $(".my_audio").trigger('play');
		}
		if(task == 'stop'){
			 $(".my_audio").trigger('pause');
			 $(".my_audio").prop("currentTime",0);
		}
   }

	this.showNotiFn = function (type, title, message, timeLife) {
		let id;
		let item;
		let currentTime;
		let date = new Date();
		//SET OVERLAY LOADING NOTI
		if (type === 'loading-noti') {
			$(".i2g-toast-container").addClass("cursor-not-allowed");
			setTimeout(function () {
				$(".i2g-toast-container").removeClass("cursor-not-allowed");
			}, timeLife);
		}
		//LIMIT ARRAY ITEM
		if (self.toastArray.length > limitToastDisplayed) {
			self.toastArray.pop();
		}
		//STOP SOUND
		play_audio('stop');
		//SET ID
		id = type + '-' + String(Math.floor(Math.random() * 1000));
		currentTime = String(date.getHours() + 'h' + date.getMinutes() + '"');
		item = {
			id: id,
			type: type,
			classTypeToast: type,
			title: title,
			message: message,
			timeLife: timeLife,
			currentTime: currentTime,
		};
		//PUSH ARRAY NOTI
		self.toastArray.push(item)
		//PLAY SOUND
		play_audio('play');
		//PUSH ARRAY HISTORY
		self.toastHistory.unshift(item)
		//REMOVE ITEM IN ARRAY, REMOVE DOM HTML
		setTimeout(function () {
			document.getElementById(id).classList.add('i2g-close-notification')
		}, (timeLife - 300));
		setTimeout(function () {
			self.toastArray = self.toastArray.filter(function (obj) {
				return obj.id !== id;
			});
			document.getElementById(id).remove();

		}, timeLife);
	}

	this.turn_Off_On_Sound = function() {
		console.log('mute')
		document.getElementsByClassName(".my_audio").muted = true;
	}
}
