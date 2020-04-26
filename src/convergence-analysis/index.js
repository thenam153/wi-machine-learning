const moduleName = "convergenceAnalysis";
const componentName = "convergenceAnalysis";
module.exports.name = moduleName;

const app = angular.module(moduleName, [
    'wiTreeView',
    'wiDroppable',
    'angularResizable',
    'wiTreeViewVirtual',
    'wiApi',
    'mlApi',
    'sideBar',
    'plot-toolkit'
]);

app.component(componentName,{
    template: require('./template.html'),
    controller: ConvergenceAnalysisController,
    style: require('./style.less'),
    controllerAs: 'self',
    bindings: {
        controller: '<'
    }
});

ConvergenceAnalysisController.$inject = ['$scope', 'wiApi', '$timeout', 'mlApi']
function ConvergenceAnalysisController($scope, wiApi, $timeout, mlApi){
    let self = 	this;
    this.$onInit = function() {
        self.setTab(0);
        self.xMinorTick = 1;
        self.xMajorTick = 10;
        self.yMinorTick = 1;
        self.yMajorTick = 10;

        $scope.$watchCollection(() => {
            return (self.controller.convergenceAnalysis || {}).train_loss;
        }, (newVal, oldVal) => {
            self.train_loss = newVal;
        })
        $scope.$watchCollection(() => {
            return (self.controller.convergenceAnalysis || {}).val_loss;
        }, (newVal, oldVal) => {
            self.val_loss = newVal;
        })
    }

    this.getLeft = function() {
        return 0;
    }
    this.getRight = function() {
        let l = self.train_loss.length;
        return parseInt((l / 10) + 1) * 10;
    }
    this.getBottom = function() {
        return 0;
    }
    this.getTop = function() {
        let max = Math.ceil(_.maxBy([...self.train_loss, ...self.val_loss], i => i));
        return parseInt((max / 10) + 1) * 10;
    }

    this.getX = function(d, i) {
        return i;
    }
    this.getY = function(d, i) {
        return d;
    }

    this.isTab = function(tabNum) {
        return self.tab === tabNum;
    }
    this.setTab = function(tabNum) {
        self.tab = tabNum;
    }
    this.getTab = function() {
        return self.tab;
    }

    this.plotCondition = function() {
        return (self.train_loss && self.train_loss.length)
            || (self.val_loss && self.val_loss.length);
    }
}
