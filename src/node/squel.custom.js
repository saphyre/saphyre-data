var squel = require('squel-having-block'), // TODO mode back to squel
    _ = require('lodash');

squel.registerValueHandler(Array, function (array) {
    var result = '( ';
    _.forEach(array, function (item, index) {
        result = index > 0 ? ', ' + item.toString() : item.toString();
    });
    return result + ' )';
});

squel.registerValueHandler(Date, function (date) {
    return date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate();
});