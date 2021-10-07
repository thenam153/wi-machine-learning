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
        const e = Math.pow(10, -l.toExponential(0).split('e').slice(-1)[0])
        return Math.ceil(l * e * 2) / e / 2;
    }
    this.getBottom = function() {
        return 0;
    }
    this.getTop = function () {
        let max = _.max([...self.train_loss, ...self.val_loss]);
        const e = Math.pow(10, -max.toExponential(0).split('e').slice(-1)[0])
        return Math.ceil(max * e * 2) / e / 2;
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
