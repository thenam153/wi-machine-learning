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
    	// selectedItemProps: '=',
    	updateLayer: '<',
    	layerChange: '<',
    	nnConfig: '<',
    	nnConfigNLayerChanged: '<',
    	setDataModels: '<',
    	setItemSelected: '<'
    }
});

function ModelSelectionController($scope, $compile){
	let self = 	this;
	self.hideDeleteButton = false;	
	this.$onInit = function() {
		// self.datas = [];
		self.selectedItemProps = {};
		self.dataJson = dataJson;
		self.dataJson = self.dataJson.map(d => {
			let data = Object.assign({}, {data: {label: d.label}, properties: d});
			return data;
		})
		console.log(self.dataJson );
		self.setDataModels(self.dataJson)
	}
	//--------------
	$scope.tab = 1;
	self.selectionTab = self.selectionTab || 'Train';

	$scope.setTab = function(newTab){
		$scope.tab = newTab;
	};

	$scope.isSet = function(tabNum){
		return $scope.tab === tabNum;
	};
	this.onItemChanged = function(selectedItemProps){
		self.selectedItemProps = selectedItemProps;
		let props = Object.assign({}, {properties: this.selectedItem.properties}, {name: this.selectedItem.properties.label});
		self.setItemSelected(props);
		if(!props.properties.nnnw) {
			let element = document.getElementById("tab-layer");
			element.classList.add("hide");
			let changePosition = document.getElementById("model-selection");
			changePosition.classList.add("position-static");
		}else {
			self.updateLayer();
			let element = document.getElementById("tab-layer");
			element.classList.remove("hide");
			let changePosition = document.getElementById("model-selection");
			changePosition.classList.remove("position-static");
		}
	}
	this.setValue = function(param, value) {
		console.log(param, value);
		let item = self.selectedItemProps.payload.params.find(i => {
			return i.name == param
		})
		value = validate(item.type, value);
		if(value === '') value = item.example;
		// this.itemValue = value;
		item.value = value;			
		// return
	}
	let fnSetValue = {};
	this.getFnSetValue = function(type) {
		if(type === 'params') {
			if(!fnSetValue.params) {
				fnSetValue.params = function(param, value) {
					console.log(param, value);
					let item = self.selectedItemProps.payload.params.find(i => {
						return i.name == param
					})
					value = validate(item.type, value);
					if(value === '') value = item.example;
					// this.itemValue = value;
					item.value = value;		
				}
			}
			return fnSetValue.params;
		}else {
			if(!fnSetValue.train) {
				fnSetValue.train = function(param, value) {
					console.log(param, value);
					let item = self.selectedItemProps.payload.train.find(i => {
						return i.name == param
					})
					value = validate(item.type, value);
					if(value === '') value = item.example;
					// this.itemValue = value;
					item.value = value;		
				}
			}
			return fnSetValue.train;
		}
	}
	function validate(type,value) {
		switch(type){
			case 'string' : return value; 

			case 'integer': 
				value = Number(value);
				if(Number.isInteger(value)) {
					return value;
				}
				return '';
			case 'number':
				value = Number(value);
				if (!isNaN(value)) {
					return value;
				}
				return '';
			case 'boolean':
				if(value.toString().toLowerCase() == 'true') {
					// return 'true';
					return true;
				}
				if(value.toString().toLowerCase() == 'false') {
					// return 'false';
					return false;
				}
				return '';
			default: return '';
		}
	}
}