const moduleName = "modelSelection";
const componentName = "modelSelection";
module.exports.name = moduleName;

const dataJson = require('./model/model.js');

var app = angular.module(moduleName, ['wiDropdownList','editable']);

app.component(componentName,{
	template: require('./template.html'),
    controller: ModelSelectionController,
    style: require('./style.less'),
    controllerAs: 'self',
    bindings: {
    	// datas: '=',
    	// selectedItemProps: '=',
    	setDataModels: '<',
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
		self.setDataModels(self.datas)
		console.log(self.datas);
	}
	this.handleData = function(dataJson,key) {
		var definitions = dataJson.definitions;
		var keysPath = Object.keys(dataJson.paths);
		console.log(keysPath[4]);
		var item = {};
		item.create = keysPath[4];
		item.name = key;
		item.data = {};
		item.data.label = key;
		// item.properties = {name: key};	
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
		// console.log(this,this.selectedItem);
		let props = Object.assign({}, {params: this.selectedItem.properties}, {name: this.selectedItem.name}, {create: this.selectedItem.create});
		// console.log(props);
		self.setItemSelected(props);
	}
	this.setValue = function(param,value) {
		// console.log(self.selectedItemProps[this.itemLabel].type);
		value = validate(self.selectedItemProps[this.itemLabel].type,value);
		if(value === '') value = param;
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