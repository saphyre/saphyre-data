/**
 * @class
 * @param {Object} config An object which the KEY will be the Model property and the VALUE must be 'ASC'|'DESC'
 * @constructor
 */
function Sort(config) {
    this.config = config;
}

module.exports = Sort;