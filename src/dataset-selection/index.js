const moduleName = "datasetSelection";
const componentName = "datasetSelection";
module.exports.name = moduleName;

var app = angular.module(moduleName, ['wiTreeView','wiDroppable','angularResizable','wiTreeViewVirtual']);

app.component(componentName,{
	template: require('./newtemplate.html'),
    controller: DatasetSelectionController,
    style: require('./newstyle.less'),
    controllerAs: 'self',
    bindings: {
        inputCurveSpecs: '<',
        targetCurveSpec: '<',

        machineLearnSteps: '<',

        // typeSelected: '<',
        typeInput: '<',

        selectionList: '<',
        // mergeCurves: '<',
        onAddInputItem: '<',

        getFnOnInputChanged: '<',

        onTargetItemChanged: '<',
        onRemoveInputItem: '<',
        onChangeType: '<',
        onRemoveDataset: '<',

        // makeSelectionList: '<',

        drop: '<',
    }
});
DatasetSelectionController.$inject = ['$scope', 'wiApi', '$timeout']

function DatasetSelectionController($scope, wiApi, $timeout){
	let self = 	this;
	this.listMlProject;
    this.buttons = [
        {
            label: 'Curve',
            type: 'curve',
            icon: 'curve-16x16'
        },
        {
            label: 'Family Curve',
            type: 'family_curve',
            icon: 'family-16x16'
        },
        {
            label: 'Main Family',
            type: 'main_family',
            icon: 'family-group-16x16'
        }
    ];
    this.getLabel = function (node) {
        return (node||{}).displayName || (node||{}).name || 'no name';
    }	
    this.getIcon = function (node) {
    	if(!node) return;
        if(node.idCurve) {
    		return "curve-16x16";
    	} else if(node.idDataset){
    		return "curve-data-16x16";
    	} else if(node.idWell) {
	        return "well-16x16";
 		} else if(node.idProject) {
            return "project-normal-16x16";
        }
    }
    this.getChildren = function (node) {
    	if (!node) return [];
        if(node.idDataset){
            return node.curves || [];           
        }else if (node.idWell) {
            return node.datasets || [];
        }else if(node.idProject) {
            return node.wells || [];
        }
        return [];
    }
    this.getChildrenDataset = function(node) {
        return [];
    }
    this.clickFn = function(event,node,selectIds,rootnode) {
        // console.log(node)
        if(node.idProject && node.wells) return;
        if(node.idWell && node.datasets) return;
        if(node.idProject && !node.idDataset) {
            wiApi.getFullInfoPromise(node.idProject, node.owner, node.name).then(dataProject => {
                console.log(dataProject);
                $timeout(()=>{
                    node.wells = dataProject.wells.sort((a,b) => a.name.localeCompare(b.name));   
                    for(let i of node.wells) {
                        i.datasets = i.datasets.sort((a,b) => a.name.localeCompare(b.name));   
                        for(let j of i.datasets) {
                            j.wellName = i.name;
                            j.idProject = node.idProject;
                        }
                    }   
                })
            });
        }
    }
    this.runMatch = function(node,filter) {
        return node.name.includes(filter.toUpperCase());
    }
    this.$onInit = function() {
        $scope.$watch(function () {
			return localStorage.getItem('token');
		}, function (newValue, oldValue) {
			if ((localStorage.getItem("token")) !== null) {
                wiApi.getProjectsPromise()
                .then((data) => {
                    $timeout(() => {
                        self.listMlProject = data.sort((a,b) => a.name.localeCompare(b.name));
                    })
                })
			}
		});
    }
    this.refeshProject = function() {
        wiApi.getProjectsPromise()
        .then((data) => {
            $timeout(() => {
                self.listMlProject = data.sort((a,b) => a.name.localeCompare(b.name));
            })
        })
    }
}