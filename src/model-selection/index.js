import { ngVue } from '@revotechuet/misc-component-vue';
const moduleName = "modelSelection";
const componentName = "modelSelection";
export { moduleName as name };

var app = angular.module(moduleName, ['wiDropdownList','editable', ngVue]);

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

	this.getValue = getValue;
    function getValue(props) {
        return props.value
    }
    this.setValue = setValue;
    function setValue(obj, newValue) {
        $timeout(() => {
			switch (obj.type) {
                case 'string':
					obj.value = newValue
                    break;
                case 'integer':
                    if (!Number.isInteger(Number(newValue))) {
                        obj.value = obj.example;
                    }else {
                        obj.value = Number(newValue)
                    }
                    break;
                case 'number':
                    if (isNaN(Number(newValue))) {
                        obj.value = obj.example;
                    }else {
                        obj.value = Number(newValue)
                    }
                    break;
                case 'float':
                    if (isNaN(parseFloat(newValue))) {
                        obj.value = obj.example;
                    } 
                    else {
                        obj.value = parseFloat(newValue)
                    } 
                    break;
			}
			console.log(obj)
        })
    }
}

