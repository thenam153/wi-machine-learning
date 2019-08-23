const moduleName = "modelSelection";
const componentName = "modelSelection";
module.exports.name = moduleName;

const dataJson = require('./model/wi-uservice.json');

var app = angular.module(moduleName, ['wiDropdownList','editable']);

app.component(componentName,{
	template: require('./newtemplate.html'),
    controller: ModelSelectionController,
    style: require('./newstyle.less'),
    controllerAs: 'self',
    bindings: {
    	// datas: '=',
    	// modelSelectedProps: '=',
    	updateLayer: '<',
    	layerChange: '<',
    	nnConfig: '<',
    	nnConfigNLayerChanged: '<',
    	setPropsModel: '<',
    	// setModelSelected: '<',
    	currentSelectedModel: '<',
    	typeModelSelected: '<',
    	setTypeModelSelected: '<',
    	onModelChanged: '<',
    	modelSelectedProps: '<',
    	getFnSetValueElModel: '<',
    	tab: '<',
    	setTab: '<'
    }
});

function ModelSelectionController($scope, $compile){
	let self = 	this;
	self.hideDeleteButton = false;	
	this.$onInit = function() {
		self.listType = [{
			data: {
				label: 'classification'
			},
			properties: 'classification'
		}, {
			data: {
				label: 'regression'
			},
			properties: 'regression'
		}];
		// self.modelSelectedProps = {};
		self.listModel = {
			regression: [],
			classification: []
		}
		for(let i in dataJson) {
			if(dataJson[i].type === 'classification') {
				self.listModel.classification.push({data: {label: dataJson[i].label}, properties: dataJson[i]});
			}else {
				self.listModel.regression.push({data: {label: dataJson[i].label}, properties: dataJson[i]});
			}
		}
		self.setPropsModel(self.listModel)
	}
	$scope.tab = self.tab;
	self.selectionTab = self.selectionTab || 'Train';
	$scope.setTab = function(newTab){
		self.tab = newTab;
	};

	$scope.isSet = function(tabNum){
		return self.tab === tabNum;
	};
	// let fnSetValue = {};
	// this.getFnSetValueElModel = function(type) {
	// 	if(type === 'params') {
	// 		if(!fnSetValue.params) {
	// 			fnSetValue.params = function(param, value) {
	// 				console.log(param, value);
	// 				let item = self.modelSelectedProps.payload.params.find(i => {
	// 					return i.name == param
	// 				})
	// 				value = validate(item.type, value);
	// 				if(value === '') value = item.example;
	// 				// this.itemValue = value;
	// 				item.value = value;		
	// 			}
	// 		}
	// 		return fnSetValue.params;
	// 	}else {
	// 		if(!fnSetValue.train) {
	// 			fnSetValue.train = function(param, value) {
	// 				console.log(param, value);
	// 				let item = self.modelSelectedProps.payload.train.find(i => {
	// 					return i.name == param
	// 				})
	// 				value = validate(item.type, value);
	// 				if(value === '') value = item.example;
	// 				item.value = value;		
	// 			}
	// 		}
	// 		return fnSetValue.train;
	// 	}
	// }
	// function validate(type,value) {
	// 	switch(type){
	// 		case 'string' : return value; 

	// 		case 'integer': 
	// 			value = Number(value);
	// 			if(Number.isInteger(value)) {
	// 				return value;
	// 			}
	// 			return '';
	// 		case 'number':
	// 			value = Number(value);
	// 			if (!isNaN(value)) {
	// 				return value;
	// 			}
	// 			return '';
	// 		case 'boolean':
	// 			if(value.toString().toLowerCase() == 'true') {
	// 				// return 'true';
	// 				return true;
	// 			}
	// 			if(value.toString().toLowerCase() == 'false') {
	// 				// return 'false';
	// 				return false;
	// 			}
	// 			return '';
	// 		default: return '';
	// 	}
	// }
}