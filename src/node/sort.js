/**
 * @class
 * @param {Object} config An object which the KEY will be the Model property and the VALUE must be 'ASC'|'DESC'
 */
class Sort {
  constructor(config) {
    this.config = config;
  }
}

module.exports = Sort;