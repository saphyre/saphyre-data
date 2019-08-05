const squel = require('squel');
const _ = require('lodash');

squel.registerValueHandler(Array, array => {
  let result = '( ';
  _.forEach(array, function (item, index) {
    result = index > 0 ? ', ' + item.toString() : item.toString();
  });
  return result + ' )';
});

squel.registerValueHandler(Date, date => {
  return date.toISOString()
    .replace(/T/, ' ') // replace T with a space
    .replace(/\..+/, ''); // delete the dot and everything after
});