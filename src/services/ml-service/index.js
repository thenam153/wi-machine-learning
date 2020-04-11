// var serviceName = 'mlService';

// module.exports.name = serviceName;

// angular.module(serviceName, []).factory(serviceName, function() {
//     return {
//         value: "nguyen the nam"
//     };
// });
const serviceName = 'mlService';
angular.module(serviceName, []).factory(serviceName, function($http, $timeout) {
    return new mlService($http, $timeout);
});
function mlService($http, wiToken, Upload, $timeout) {
    this.value = "Nam The"
}