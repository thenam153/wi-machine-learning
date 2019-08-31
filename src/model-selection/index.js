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
    	currentSelectedModelLabel: '<',
    	currentSelectedTypeModel: '<',
    	setTypeModel: '<',
    	onModelChanged: '<',

    	currentSelectedModel: '<',
    	getFnSetValueElModel: '<',
    	getFnSetValueElEnumModel: '<',

    	listTypeModel: '<',
    	listSelectionModel: '<',
    	layerChange: '<',
    	nnConfig: '<',
    	nnConfigNLayerChanged: '<',
    	tab: '<',
    	setTab: '<',
    	isSet: '<',
    }
});
ModelSelectionController.$inject = ['$scope']

function ModelSelectionController($scope){
	let self = 	this;
	self.hideDeleteButton = false;	
	this.$onInit = function() {
	}
}