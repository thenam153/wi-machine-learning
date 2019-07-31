const moduleName = "modelSelection";
const componentName = "modelSelection";
module.exports.name = moduleName;

const dataJson = require('./model/model.js');

var app = angular.module(moduleName, ['wiNeuralNetwork','wiDropdownList','editable']);

app.component(componentName,{
	template: require('./newtemplate.html'),
    controller: ModelSelectionController,
    style: require('./newstyle.less'),
    controllerAs: 'self',
    bindings: {
    	// datas: '=',
    	// selectedItemProps: '=',
    	setDataModels: '<',
    	setItemSelected: '<'
    }
});

function ModelSelectionController($scope, $compile){
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
	//--------------
	$scope.tab = 1;
	self.selectionTab = self.selectionTab || 'Train';

	$scope.setTab = function(newTab){
		$scope.tab = newTab;
	};

	$scope.isSet = function(tabNum){
		return $scope.tab === tabNum;
	};
	//--------------
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
		item.properties['bucket_id'] = {};
		item.properties['bucket_id'].name = 'bucket_id';
		item.properties['bucket_id'].type = 'string';
		item.properties['bucket_id'].default= 'bucket_id_01';
		item.properties['bucket_id'].value = item.properties['bucket_id'].default;
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
	self.panel = {};
	this.click = function() {
		$.jsPanel({
			id: 'id1',
			headerTitle: 'test 1',
			// headerLogo: 'adadad',
			position: 'center',
			contentSize: '750 500',
			panelSize: '750 500',
			container: document.getElementById('workspace'),
			content: `<div id="id1"></div>`,
			draggable: {
                containment: "parent"
            },
            resizable: {
                containment: "parent"
            },
            callback: function(panel) {
            	let scope = $scope.$new();
      //       	self.panel = panel;
            	const scopeOptions = {
                    cropViewByZones: true
                }
      //           let scope = {};
                inputs = [{class: "Input Curve",
                            label: "ECGR",
                            name: "ECGR",
                            type: "1",
                            value: "ECGR"}];
		        outputs = [{class: "Target Output",
		                        label: "DTCO3",
		                        name: "DTCO3",
		                        type: "1",
		                        value: "DTCO3"}];
		        layers = [5,5];
		        Object.assign(scope, {self, inputs, outputs, layers})
		        const html = `<div style="display:flex;flex:0.7;height:100%;flex-direction:column;padding:10px;overflow:auto;"><wi-neural-network 
						    style='flex:1; display: flex;' 
						    container='' 
						    input-curves="inputs"
						    output-curves="outputs" 
						    hidden-layer="layers">
						</wi-neural-network></div>`
				// $(`#id1`).html($compile(html)(scope))

				$(`#id1`).html($compile(html)(scope))
            },	
            onclosed: (panel) => {
				delete scope;
				scope.$destroy();
			}
		})
	}
	function getContentSize(ratio = 3 / 4) {
        let body = $(`#id1`);
        let width = body.width() * ratio;
        let height = body.height() * ratio;
        return `${width} ${height}`;
    }
}