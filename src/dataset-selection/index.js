import Vue from 'vue';
import { ngVue, WiTree, WiDroppable } from '@revotechuet/misc-component-vue';
const moduleName = "datasetSelection";
const componentName = "datasetSelection";
export {moduleName as name}

var app = angular.module(moduleName, ['wiTreeView','wiDroppable','angularResizable','wiTreeViewVirtual','sideBar', ngVue]);

app.component(componentName,{
	template: require('./newtemplate.html'),
    controller: DatasetSelectionController,
    style: require('./newstyle.less'),
    controllerAs: 'self',
    bindings: {
        inputCurveSpecs: '<',
        targetCurveSpec: '<',
        machineLearnSteps: '<',
        typeInput: '<',
        selectionList: '<',
        onAddInputItem: '<',
        getFnOnInputChanged: '<',
        onTargetItemChanged: '<',
        onRemoveInputItem: '<',
        onChangeType: '<',
        onRemoveDataset: '<',
        drop: '<',

        listDataset: '<',
        controller: '<'
    }
});
DatasetSelectionController.$inject = ['$scope', 'wiApi', '$timeout']

function DatasetSelectionController($scope, wiApi, $timeout) {
    Object.assign($scope, {
        WiTree,
        WiDroppable,
    })
    let self = 	this;
	this.listMlProject;
    this.buttons = [{
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
    this.getDraggable = function (node) {
      if (node.idDataset && node.idWell) return true;
      return false;
    }
    this.noDrag = function(node) {
        return !(node && node.idDataset && node.idWell);
    }
    this.getLabel = function (node) {
        return (node||{}).displayName || (node||{}).name || 'no name';
    }	
    this.getIcon = function (node) {
    	if(!node) return;
        if(node.idCurve) {
            if(node.type === "TEXT"){
                return "text-curve-16x16"
            } else if (node.type === "ARRAY") {
                return "array-curve-16x16";
            }else {
                return "curve-16x16";
            }
    	} else if(node.idDataset){
            if(node.step == "0"){
                return "dataset-new-16x16"
            } else if (node.name === "INDEX") {
                return "reference-dataset-16x16";
            }else {
                return "curve-data-16x16";
            }
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
    this.clickFn = function(event, node, selectIds, rootnode) {
        console.log(node);
        if(node.idProject && node.wells) return;
        if(node.idProject && !node.idDataset) {
            wiApi.client(getClientId(node.owner, node.name)).getFullInfoPromise(node.idProject, node.owner, node.name).then(dataProject => {
                if (node.owner) {
                    for (let well of dataProject.wells) {
                        for (let dataset of well.datasets) {
                            dataset.owner = dataProject.owner;
                            dataset.prjName = dataProject.name;
                        }
                    }
                }
                    //self.controller.projectInfo = {owner: node.owner, name: node.name}; // TUNG
                    self.controller.dataProject = dataProject;
                    Vue.set(node, 'wells', dataProject.wells.sort((a, b) => a.name.localeCompare(b.name)));
                    for(let i of node.wells) {
                        i.datasets.sort((a,b) => a.name.localeCompare(b.name));   
                        for(let j of i.datasets) {
                            j.curves.sort((a,b) => a.name.localeCompare(b.name));   
                            j.wellName = i.name;
                            j.idProject = node.idProject;
                        }
                    }
                    sortProjectData(node);
                /* TUNG : Donot need this anymore
                // fix bug project share 
                let project = rootnode.find(i => !i.shared)
                if(project) {
                    wiApi.getFullInfoPromise(project.idProject)
                    .then(() => {});
                }
                */
            });
        }
    }
    this.runMatch = function(node, filter) {
        if(node.displayName) {
            return node.displayName.toLowerCase().includes(filter.toLowerCase());
        }else if(node.name) {
            return node.name.toLowerCase().includes(filter.toLowerCase());
        }
        // return node.name.includes(filter);
    }
    this.$onInit = function() {
        $scope.$watch(function () {
			return localStorage.getItem('token');
		}, function (newValue, oldValue) {
			if ((localStorage.getItem("token")) !== null) {
                wiApi.client(getClientId()).getProjectsPromise()
                .then((data) => {
                    $timeout(() => {
                        self.listMlProject = data.sort((a,b) => a.name.localeCompare(b.name));
                        self.controller.setProject(data);
                    })
                })
                .catch((err) => {
                    if(err.status === 401) {
                        delete window.localStorage.token;
                    }
                })
			}
		});
    }
    this.refeshProject = function() {
        self.reloadPrj = true;
        wiApi.client(getClientId()).getProjectsPromise()
        .then((data) => {
            $timeout(() => {
                self.listMlProject = data.sort((a,b) => a.name.localeCompare(b.name));
                self.reloadPrj = !self.reloadPrj;
                self.controller.setProject(data);
            })
        })
    }
    function sortProjectData(projectData) {
        if (!projectData.wells) return;
        projectData.wells.sort((a, b) => {
            let nameA = a.name.toUpperCase();
            let nameB = b.name.toUpperCase();
            return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
        });
        projectData.wells.forEach(well => {
            well.datasets.sort((a, b) => {
                let nameA = a.name.toUpperCase();
                let nameB = b.name.toUpperCase();
                return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
            });
            well.datasets.forEach(dataset => {
                dataset.curves.sort((a, b) => {
                    let nameA = a.name.toUpperCase();
                    let nameB = b.name.toUpperCase();
                    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
                });
            });
            well.zonesets.sort((a, b) => {
                let nameA = a.name.toUpperCase();
                let nameB = b.name.toUpperCase();
                return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
            });
            well.zonesets.forEach(function (zoneset) {
                zoneset.zones.sort((a, b) => {
                    let depthA = parseFloat(a.startDepth);
                    let depthB = parseFloat(b.startDepth);
                    return depthA - depthB;
                })
            })
        });
    }
    function getClientId(owner, prjName) {
        return self.controller.getClientId(owner, prjName);
    }
}