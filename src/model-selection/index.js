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
		// const dataJsonModels = require('../../wi-uservice.json');
		// self.listTypeModel = dataJsonModels.type.map(t => {
		// 	return {
		// 		label: t.label,
        //         type: t.type
		// 	}
		// }).sort((a, b) => {
		// 	let nameA = a.label.toUpperCase();
		// 	let nameB = b.label.toUpperCase();
		// 	return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
		// });
		// self.listModel = {};
		// self.listTypeModel.forEach(t => {
		// 	self.listModel[t.type] = dataJsonModels.model
		// 								.filter(i => i.type == t.type)
		// 								.map(m => {
		// 									return {
		// 										label: m.label,
		// 										name: m.name,
		// 										type: m.type,
		// 										value: m
		// 									} 
		// 								})
		// 								.sort((a, b) => {
		// 									let nameA = a.label.toUpperCase();
		// 									let nameB = b.label.toUpperCase();
		// 									return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
		// 								});

		// });
		// self.currentTypeModel = self.listTypeModel[0];
		// self.currentModel = self.listModel[self.currentTypeModel.type][0];
		// console.log(self.currentTypeModel, self.currentModel, self.listTypeModel, self.listModel);
		// $scope.$watch(() => self.controller.curveSpecs, () => {
		// 	self.nnConfig.wiNNCtrl && self.nnConfig.wiNNCtrl.viNeuralNetwork ? self.updateNeuralConfig() : null;
		// })
	}
	// this.onChangeTypeModel = function(item) {
	// 	self.currentTypeModel = item;
	// 	self.currentModel = self.listModel[self.currentTypeModel.type][0];
	// }
	// this.onChangeModel = function(item) {
	// 	self.currentModel = item;
	// 	self.updateNeuralConfig();
	// }
	// this.initPropertiesPayload = function(properties) {
	// 	if(properties.value === undefined || properties.value === null) {
	// 		if(properties.type === 'enum') {
	// 			properties.value = properties.enum[properties.example];
	// 			return;
	// 		}
	// 		if(properties.type === 'size') {
	// 			properties.value = properties.example.map(i => i);
	// 			return;
	// 		}
	// 		properties.value = properties.example;
	// 		// console.log(properties);
	// 	}
	// }
	// this.changeValue = function(obj) {
	// 	console.log(obj);
	// 	switch (obj.type) {
    //         case 'string':
    //             break;
    //         case 'integer':
    //             if (!Number.isInteger(Number(obj.value))) {
    //                 obj.value = obj.example;
    //             }
    //             break;
    //         case 'number':
    //             if (isNaN(Number(obj.value))) {
    //                 obj.value = obj.example;
    //             }
    //             break;
    //         // case 'boolean':
    //         //     if (value.toString().toLowerCase() == 'true') {
    //         //         return true;
    //         //     }
    //         //     if (value.toString().toLowerCase() == 'false') {
    //         //         return false;
    //         //     }
    //         //     return '';
    //         case 'float':
    //             if (isNaN(parseFloat(obj.value))) {
    //                 obj.value = obj.example;
    //             }
    //             break;
    //         // case 'array':
    //         //     value = value.toString().replace(/\s/g, '').split(',');
    //         //     console.log(value);
	// 		// 	return ([...new Set(value)]);
    //     }
	// }
	// this.onItemChange = function(value, properties) {
	// 	// console.log(value, properties);
	// 	properties.value = properties.enum.find(e => e.properties === value);
	// }
	// this.nnConfig = {}
	// this.showNeu = false;
	// this.updateNeuralConfig = function() {
	// 	if(!self.controller || !self.currentModel || !self.currentModel.value || !self.currentModel.value.nnnw) {self.nnnw=false; return};
	// 	self.nnConfig.inputs = self.controller.curveSpecs.filter((v, i) => !i.isTarget).map((i) => {
    //         return {
    //             label: i.currentSelect,
    //             name: i.currentSelect,
    //             value: i.currentSelect,
    //             class: 'Input Curve',
    //             type: "1"
    //         }
	// 	});
	// 	let output = self.controller.curveSpecs.find(i => i.isTarget);
	// 	output ? self.nnConfig.outputs = [{
    //         label: self.controller.curveSpecs[0].currentSelect,
    //         name: self.controller.curveSpecs[0].currentSelect,
    //         value: self.controller.curveSpecs[0].currentSelect,
    //         class: 'Target output',
    //         type: "1"
    //     }] :
    //     self.nnConfig.outputs = [{
    //         label: output.currentSelect,
    //         name: output.currentSelect,
    //         value: output.currentSelect,
    //         class: 'Target output',
    //         type: "1"
    //     }]
	// 	self.nnConfig.hiddenLayer = self.currentModel.value.payload.params.find(i => i.name === 'hidden_layer_sizes').value;
	// 	self.nnnw = true;
	// }
	// this.onLayerChange = function(idx) {
	// 	idx > 0 ? self.nnConfig.hiddenLayer.push(10) : self.nnConfig.hiddenLayer.pop();
	// 	self.nnConfig.wiNNCtrl ? self.nnConfig.wiNNCtrl.update(self.nnConfig) : null; 
	// }
	// this.onHiddenChange = function(index, idx) {
	// 	idx > 0 ? self.nnConfig.hiddenLayer[index]++ : self.nnConfig.hiddenLayer[index]--;
	// 	self.nnConfig.wiNNCtrl ? self.nnConfig.wiNNCtrl.update(self.nnConfig) : null; 
	// }

}

