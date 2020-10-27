const serviceName = 'mlService';
angular.module(serviceName, []).factory(serviceName, ['$http', '$timeout', function($http, $timeout) {
    return new mlService($http, $timeout);
}]);
function mlService($http, $timeout) {
    
}