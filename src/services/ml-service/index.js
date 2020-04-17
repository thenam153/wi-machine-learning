// var serviceName = 'mlService';

// module.exports.name = serviceName;

// angular.module(serviceName, []).factory(serviceName, function() {
//     return {
//         value: "nguyen the nam"
//     };
// });
const serviceName = 'mlService';
angular.module(serviceName, []).factory(serviceName, ['$http', '$timeout', function($http, $timeout) {
    return new mlService($http, $timeout);
}]);
function mlService($http, $timeout) {
    this.value = "Nam The"
}