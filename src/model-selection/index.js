const moduleName = "modelSelection";
const componentName = "modelSelection";
module.exports.name = moduleName;

const dataJson = require('./model/model.js');

var app = angular.module(moduleName, ['wiDropdownList','editable']);

app.component(componentName,{
	template: require('./template.html'),
    controller: ModelSelectionController,
    style: require('./style.css'),
    controllerAs: 'self',
    bindings: {
    	// datas: '=',
    	// selectedItemProps: '=',
    	setDataModel: '<',
    	setItemSelected: '<'
    }
});

function ModelSelectionController($scope){
	let self = 	this;
	self.hideDeleteButton = false;	
	this.$onInit = function() {
		self.datas = [];
		self.selectedItemProps = {};
		// self.data = self.handleData(dataJson);
		for(let i in dataJson) {
			self.datas.push(self.handleData(dataJson[i],i));
		}
		// console.log(dataJson);
		self.setDataModel(self.datas)
	}
	this.handleData = function(dataJson,key) {
		var definitions = dataJson.definitions;
		// var key = Object.keys(definitions);
		var item = {};
		item.data = {};
		// item.data.label = key[key.length-1];
		item.data.label = key;
		item.properties = {};	
		for (let i in definitions[key].properties){
			// item.properties[i] = definitions[key].properties[i].type;
			item.properties[i] = {};
			item.properties[i].name = i;
			item.properties[i].type = definitions[key].properties[i].type;
			item.properties[i].default= definitions[key].properties[i].example || 0;
			item.properties[i].value = item.properties[i].default;
		}
		return item;
	}
	this.onItemChanged = function(selectedItemProps){
		self.selectedItemProps = selectedItemProps;
		self.setItemSelected(selectedItemProps);
		// console.log(selectedItemProps);
	}
	this.setValue = function(params,value) {
		console.log(self.selectedItemProps[this.itemLabel].type);
		value = validate(self.selectedItemProps[this.itemLabel].type,value);
		if(!value) value = params;
		this.itemValue = value;
		self.selectedItemProps[this.itemLabel].value = value;
		return
	}
	var validate = function(type,value) {
		// console.log(value,Number.isInteger(value),typeof value);
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
					return 'true';
				}
				if(value.toString().toLowerCase() == 'false') {
					return 'false';
				}
				return '';
			default: return '';
		}
	}
}