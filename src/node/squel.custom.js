var squel = require('squel'),
    _ = require('lodash');

squel.registerValueHandler(Array, function (array) {
    var result = '( ';
    _.forEach(array, function (item, index) {
        result = index > 0 ? ', ' + item.toString() : item.toString();
    });
    return result + ' )';
});

squel.registerValueHandler(Date, function (date) {
    return date.toISOString()
        .replace(/T/, ' ') // replace T with a space
        .replace(/\..+/, ''); // delete the dot and everything after
});