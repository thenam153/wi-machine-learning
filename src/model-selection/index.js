const moduleName = "modelSelection";
const componentName = "modelSelection";
module.exports.name = moduleName;

const dataJson = require('../../wi-uservice.json');

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
    	setTab: '<',
    	getFnSetValueElEnumModel: '<'
    }
});
ModelSelectionController.$inject = ['$scope', '$compile']

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
}