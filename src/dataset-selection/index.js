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
    	idProject: '<',
        inputCurveSpecs: '<',
        targetCurveSpec: '<',
        steps: '<',
        typeSelected: '<',

        addInputCurve: '<',
        getOnItemChanged: '<',
        onTargetItemChanged: '<',
        removeInputCurve: '<',
        changeType: '<',
        drop: '<',
        out: '<',
        over: '<',
        deactivate: '<',
        selectionList: '<',
        mergeCurves: '<',
        makeSelectionList: '<',
        removeDataset: '<'
        // isClick: '=',
    }
});

function DatasetSelectionController($scope,wiApi,$timeout){
	let self = 	this;
	this.treedata;
    this.isActive = 0;
    this.buttons = [{
        label: 'Curve',
        type: 'curve',
        icon: 'curve-16x16'
    },{
        label: 'Family Curve',
        type: 'family_curve',
        icon: 'family-16x16'
    },{
        label: 'Main Family',
        type: 'main_family',
        icon: 'family-group-16x16'
    }];
    // this.typeSelected = self.buttons[0].type;
    this.getLabel = function (node) {
        return (node||{}).name || 'no name';
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
        // if (!node) return [];
        // if (node.idWell && node.idProject) {
        //     return node.datasets || [];
        // }
        return [];
    }
    this.clickFn = function(event,node,selectIds,rootnode) {
        if(node.idProject && node.wells) return;
        if(node.idWell && node.datasets) return;
        if(node.idProject) {
            wiApi.getFullInfoPromise(node.idProject, node.owner, node.name).then(dataProject => {
                console.log(dataProject);
                $timeout(()=>{
                    node.wells = dataProject.wells;   
                    for(let i of node.wells) {
                        for(let j of i.datasets) {
                            j.wellName = i.name;
                        }
                    }   
                })
            });
        }
    }
    this.runMatch = function(node,filter) {
        return node.name.includes(filter);
    }
    this.$onInit = function() {
        self.typeSelected = self.buttons[0].type;
    	// (async ()=>{
    	// 	try{
    	// 		self.treedata = await wiApi.getWellsPromise(self.idProject);
    	// 	}catch (e){
    	// 		console.error(e);
    	// 	}
    	// })();
        (async() => {
            try {
                self.treedata = await wiApi.getProjectsPromise();
            }catch (e) {
                console.error(e);
            }
        })();
    }
}