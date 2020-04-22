const moduleName = "zonesetConfig";
const componentName = "zonesetConfig";
module.exports.name = moduleName;

const app = angular.module(moduleName, [
    'wiTreeView',
    'wiDroppable',
    'angularResizable',
    'wiTreeViewVirtual',
    'sideBar'
]);

app.component(componentName,{
    template: require('./template.html'),
    controller: ZonesetConfigController,
    style: require('./style.less'),
    controllerAs: 'self',
    bindings: {
        controller: '<'
    }
});

ZonesetConfigController.$inject = ['$scope', 'wiApi', '$timeout']
function ZonesetConfigController($scope, wiApi, $timeout){
    let self = 	this;
    const tabsName = ['training', 'verify', 'prediction'];
    function getTab() {
        return $scope.tab;
    };
    function isSet(tabNum) {
        return $scope.tab === tabNum;
    };
    function setTab(newTab) {
        $scope.tab = newTab;
    };
    this.$onInit = function() {
        $scope.tab = 0;
        $scope.setTab = setTab;
        $scope.getTab = getTab;
        $scope.isSet = isSet;

        $scope.$watch(() => {
            let listDataset = self.controller.tabs['training'].listDataset;
            return listDataset.map(dataset => dataset.idDataset);
        }, () => {
            self.updateListZoneset(0);
        }, true);
        $scope.$watch(() => {
            let listDataset = self.controller.tabs['verify'].listDataset;
            return listDataset.map(dataset => dataset.idDataset);
        }, () => {
            self.updateListZoneset(1);
        }, true);
        $scope.$watch(() => {
            let listDataset = self.controller.tabs['prediction'].listDataset;
            return listDataset.map(dataset => dataset.idDataset);
        }, () => {
            self.updateListZoneset(2);
        }, true);
    }

    // ==========Zoneset List==========
    this.updateListZoneset = updateListZoneset;
    function updateListZoneset(tabNum) {
        let step = tabsName[tabNum];
        let listDataset = self.controller.tabs[step].listDataset;
        let uniqIdWells = _.uniq(listDataset.map(dataset => dataset.idWell));
        let zonesetsList = getZonesetsList(uniqIdWells);
        switch(step) {
            case 'training': {
                self.trainingZonesets = processZonesetsList(zonesetsList);
                break;
            }
            case 'verify': {
                self.verifyZonesets = processZonesetsList(zonesetsList);
                break;
            }
            case 'prediction': {
                self.predictionZonesets = processZonesetsList(zonesetsList);
                break;
            }
        }
    }
    function getZonesetsList(idWells) {
        let zonesetsListRes = [];
        let wells = (self.controller.dataProject || {}).wells;
        if (!wells || !wells.length) return [];
        for (let wellId of idWells) {
            let well = _.find(wells, w => w.idWell === wellId);
            zonesetsListRes.push(angular.copy(well.zonesets));
        }
        return zonesetsListRes;
    }
    function processZonesetsList(zonesetsList) {
        if (!zonesetsList.length) return;
        let zsList;
        for (let zonesets of zonesetsList) {
            if (!zsList) {
                zsList = angular.copy(zonesets);
            } else if (zsList.length) {
                zsList = intersectAndMerge(zsList, zonesets);
            } else {
                break;
            }
        }
        return zsList;
    }
    function intersectAndMerge(dstZoneList, srcZoneList) {
        return dstZoneList.filter(zs => {
            let zoneset = srcZoneList.find(zs1 => zs.name === zs1.name);
            if (!zoneset) return false;
            for (let z of zoneset.zones) {
                let zone = zs.zones.find(zo => zo.zone_template.name == z.zone_template.name);
                if (!zone) {
                    zs.zones.push(angular.copy(z));
                }
            }
            return true;
        });
    }
    this.getListZoneset = getListZoneset;
    function getListZoneset() {
        switch(true) {
            case isSet(0): {
                return self.trainingZonesets;
            }
            case isSet(1): {
                return self.verifyZonesets;
            }
            case isSet(2): {
                return self.predictionZonesets;
            }
        }
    }
    this.refreshZonesetList = refreshZonesetList;
    function refreshZonesetList() {
        let step = tabsName[getTab()];
        $timeout(() => {
            self.controller.zonesetConfig[step].zonesList = null;
            self.controller.zonesetConfig[step].zonesetName = null;
        });
        self.updateListZoneset(getTab());
    }
    this.clickZonesetFn = clickZonesetFn;
    function clickZonesetFn(event, node, selectIds, rootnode) {
        let step = tabsName[getTab()];
        let preZonesetName = self.controller.zonesetConfig[step].zonesetName;
        if (preZonesetName != self.getZonesetLabel(node)) {
            self.controller.zonesetConfig[step].zonesetName = self.getZonesetLabel(node);
            //collapseZoneList();
        }
        updateZoneList();
    }
    function collapseZoneList() {
        let step = tabsName[getTab()];
        let listDataset = self.controller.tabs[step].listDataset;
        listDataset.forEach(ds => {
            ds._expand = false;
        })
    }
    this.runMatchZoneset = function(node, filter) {
        let label = self.getZonesetLabel(node);
        return label.toLowerCase().includes(filter.toLowerCase());
    }
    this.getZonesetLabel = function(node) {
        return (node||{}).displayName || (node||{}).name || 'no name';
    }
    this.getZonesetIcon = function(node) {
        if(!node) return;
        return "user-define-16x16";
    }
    this.getZonesetChild = function(node) {
        return false;
    }

    // ==========Zone List==========
    this.getZoneTree = function() {
        let step = tabsName[getTab()];
        let listDataset = self.controller.tabs[step].listDataset;
        return (self.getListZone() && self.getListZone().length) ? listDataset : null;
    }
    function updateZoneList() {
        let step = tabsName[getTab()];
        let listDataset = self.controller.tabs[step].listDataset;
        let zonesetName = self.controller.zonesetConfig[step].zonesetName;
        self.controller.zonesetConfig[step].zonesList = getZones(zonesetName, listDataset);
    }
    function getZones(zonesetName, listDataset) {
        if (!listDataset || !listDataset.length) return null;
        let wells = (self.controller.dataProject || {}).wells;
        if (!wells || !wells.length) return null;
        let zonesRes = [];
        for (let dataset of listDataset) {
            let idDataset = dataset.idDataset;
            let idWell = dataset.idWell;
            let well = _.find(wells, w => w.idWell === idWell);
            let zones = (_.find(well.zonesets, zoneset => {
                return zoneset.zone_set_template.name === zonesetName
            })| {}).zones;
            zonesRes.push(angular.copy(zones));
        }
        return zonesRes;
    }
    this.getListZone = function() {
        let step = tabsName[getTab()];
        return self.controller.zonesetConfig[step].zonesList;
    }
    this.clickZoneFn = function(event, node, selectIds, rootnode) {
        if (!node) return;
        node._notUsed = !node._notUsed;
    }
    this.refreshZoneList = function() {
        /*
        let step = tabsName[getTab()];
        self.controller.zonesetConfig[step].zonesList = null;
        self.controller.zonesetConfig[step].zonesetName = null;
        */
        updateZoneList();
    }
    this.getZoneChild = function(node) {
        if (node.idDataset) {
            let step = tabsName[getTab()];
            let listDataset = self.controller.tabs[step].listDataset;
            let idx = _.findIndex(listDataset, ds => ds.idDataset === node.idDataset);
            return idx < 0 ? null : (self.getListZone() || [])[idx];
        } else
            return false;
    }
    this.runMatchZone = function(node, filter) {
        let label = self.getZoneLabel(node);
        return label.toLowerCase().includes(filter.toLowerCase());
    }
    this.getZoneLabel = function(node) {
        if (node.idDataset) {
            return node.name
        } else {
            return node.zone_template.name || 'no name';
        }
    }
    this.getZoneIcon = function(node) {
        if (!node) return;
        if (node.idDataset) {
            if (node.step == "0") {
                return "dataset-new-16x16"
            } else if (node.name === "INDEX") {
                return "reference-dataset-16x16";
            } else {
                return "curve-data-16x16";
            }
        } else
            return node._notUsed ? "ti ti-check check-off" : 'ti ti-check check-on';
    }
}
