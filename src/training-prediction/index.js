const moduleName = "trainingPrediction";
const componentName = "trainingPrediction";
module.exports.name = moduleName;

var app = angular.module(moduleName, ['wiDialog',
	'wiDiscriminator',
	'wiApi',  
	'distributionMapModule',
  	'visualizationMapModule',
  	'somModelService']);

app.component(componentName,{
	template: require('./newtemplate.html'),
    controller: TrainingPredictionController,
    style: require('./newstyle.less'),
    controllerAs: 'self',
    bindings: {
    	machineLearnSteps: '<',
    	inputCurveSpecs: '<',
        targetCurveSpec: '<',
        // setItemOnChanged: '<',
        setOnItemCurveChanged: '<',
        onToggleActiveOutput: '<',
        onDiscriminator: '<',
        runAll: '<',
        runTask: '<',


        somVisualize: '<',
        showSomVisualize: '<',
        // mlApi: '<',

        stateWorkflow: '<',
        setModelId: '<',
        setBucketId: '<',
		setState: '<',
		saveMlProject: '<',
		model: '<',



    }
});
TrainingPredictionController.$inject = ['$scope', '$timeout', 'wiDialog', 'wiApi', '$http', 'somModelService']

function TrainingPredictionController($scope, $timeout, wiDialog, wiApi, $http, somModelService){
	let self = this;
	
	$scope.tab = 1;
	$scope.setTab = function(newTab) {
	 $scope.tab = newTab;
	};

	$scope.isSet = function(tabNum) {
	 return $scope.tab === tabNum;
	};

	// this.showWapper = function () {
	// 	console.log("showWapper")
	// 	$('.dropdown-list').toggle(function () {
	// 		$(".dropdown-list").addClass("displayBlock");
	// 	}, function () {
	// 		$(".dropdown-list").removeClass("displayBlock");
	// 	});
	
	// }
	$(document).click(function(event) {
		if(event.target.id === 'dropdown-list' ) {
			event.stopPropagation();
            return false;
		}
        else {
			$(".dropdown-list").addClass("ng-hide");
			
        }

    });
 
    // ============================================================================
	this.getDistributionMaps = function (data) {
		return data.distributionMaps;
	}

	this.getDistributionMapHeader = function (distributionMap) {
		return distributionMap.header;
	}

	this.getDistributionMapRows = function (distributionMap) {
		return distributionMap.rows;
	}

	this.getDistributionMapCells = function (row) {
		return row.cells;
	}

	this.getDistributionMapWeight = function (cell) {
		return cell.weight;
	}

	this.getDistributionMapScaledWeight = function (cell) {
		return cell.scaledWeight;
	}

	this.getDistributionMapLabel = function (cell) {
		return cell.label;
	}

	this.distributionMapClickFn = function (event, cell) {
		console.log(cell);
	}

	this.distributionMapColors = ["#FFFFDD", "#AAF191", "#80D385", "#61B385", "#3E9583", "#217681", "#285285", "#1F2D86", "#000086"];
	this.distributionMapColorRange = d3.range(0, 1, 1.0 / (this.distributionMapColors.length - 1));
	this.distributionMapColorRange.push(1);

	this.getDistributionMapColors = function () {
		return self.distributionMapColors;
	}

	this.distributionMapColorScale = d3.scaleLinear()
	.domain(this.distributionMapColorRange)
	.range(this.distributionMapColors)

	// Visualization map function
	this.getVisualizationMap = function (data) {
		return data.visualizationMap;
	}

	this.getVisualizationMapCells = function (row) {
		return row.cells;
	}

	this.getVisualizationMapFeatures = function (cell) {
		return cell.features;
	}

	this.getVisualizationMapLabel = function (cell) {
		return cell.label;
	}

	this.getVisualizationMapLabels = function (data) {
		let labels = [];
		for (i = 0; i < data.visualizationMap.length; i++) {
			cells = data.visualizationMap[i].cells;
			for (j = 0; j < cells.length; j++) {
				label = cells[j].label;
				if (!labels.includes(label)) {
					labels.push(label)
				}
			}
		}
		return labels;
	}

	this.getVisualizationMapFeatureWeight = function (feature) {
		return feature.weight;
	}

	this.getVisualizationMapFeatureScaledWeight = function (feature) {
		return feature.scaledWeight;
	}

	this.getVisualizationMapFeatureNames = function (data) {
		let featureHeaders = []
		data.visualizationMap[0].cells[0].features.forEach(feature => {
			featureHeaders.push(feature.header);
		});
		return featureHeaders;
	}

	this.getVisualizationMapFeatureName = function (feature) {
		return feature.header;
	}

	this.visualizationMapClickFn = function (event, cell) {
		console.log(cell);
	}

	this.visualizationMapLabelColors = [
		'#0674da',
		'#3aa2ff',
		'#03bfda',
		'#3da581',
		'#51f5f5',
		'#9362e6',
		'#afe662'
	]

	this.visualizationMapFeatureColors = [
	'#0674da', '#3aa2ff', '#03bfda', '#3da581'
	]
	$scope.$watch(() => {
		return self.somVisualize.visualizationMap;
	}, (newData, oldData) => {
		console.log('change data', newData, oldData);
		self.visualizationMapLabelColors = {};
		let listLabel = [];
		for(let i = 0; i < newData.length; i++) {
			for(let j = 0; j < newData[i].cells.length	; j++) {
				listLabel.push(newData[i].cells[j].label);
			}
		}
		listLabel = _.sortBy(_.uniq(listLabel)).map((i) => i);
		console.log(listLabel)
		// let z = d3.scaleOrdinal(d3.schemeBuGn[9])
		// .domain(listLabel)
		let z = d3.scaleLinear().domain([1, listLabel.length + 1])
  				.range(["#000086", "#FFFFDD"])
		for(let i = 0; i < listLabel.length; i++) {
			self.visualizationMapLabelColors[listLabel[i]] = z(i + 1);
		}
	})
	this.getFittedModel = async function () {
		if(self.model['som-visualization']) {
    		$http({
	    		method: 'GET',
	    		url: `${self.model.url}/api/model/som/${self.model_id}`,
	    	})
	    	.then((res) => {
	    		console.log(res);
	    		if(res.status === 201) {
	    			$timeout(() => {
		    			self.somVisualize = res.data;
		    		})
	    		}
	    	});
    	}
	}
}