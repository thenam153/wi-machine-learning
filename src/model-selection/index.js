const moduleName = "modelSelection";
const componentName = "modelSelection";
module.exports.name = moduleName;

var app = angular.module(moduleName, ['wiDropdownList','editable']);

app.component(componentName,{
	template: require('./newtemplate.html'),
    controller: ModelSelectionController,
    style: require('./newstyle.less'),
    controllerAs: 'self',
    bindings: {
    	// currentSelectedModelLabel: '<',
    	// currentSelectedTypeModel: '<',
    	// setTypeModel: '<',
    	// onModelChanged: '<',

    	// currentSelectedModel: '<',
    	// getFnSetValueElModel: '<',
    	// getFnSetValueElEnumModel: '<',

    	// listTypeModel: '<',
    	// listSelectionModel: '<',
    	// layerChange: '<',
    	// nnConfig: '<',
    	// nnConfigNLayerChanged: '<',
    	// tab: '<',
    	// setTab: '<',
		// isSet: '<',
		controller: '<'
    }
});
ModelSelectionController.$inject = ['$scope', '$timeout']

function ModelSelectionController($scope, $timeout){
	let self = 	this;
	self.hideDeleteButton = false;	
	$scope.tab = 1;
	$scope.setTab = function(idx) {
		$scope.tab = idx;
	}
	this.$onInit = function() {
	}
}

