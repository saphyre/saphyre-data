const Model = require('./model');
const Consts = require('./consts');
const Criteria = require('./criteria');
const Query = require('./query');

require('./squel.custom');

/**
 * Saphyre Data Model Provider
 *
 * This is the main instance of Saphyre Data, used to manage all models.
 *
 * @class
 */
class Provider {

  /**
   * @constructor
   */
  constructor() {
    this.models = {};
  }

  /**
   * Creates a new Model
   * @see {Model}
   * @param config Passes to Model constructor
   * @returns {Model}
   */
  createModel(config) {
    const model = new Model(this, config);
    this.models[model.model.name] = model;
    return model;
  }

  getModel(sequelizeModel) {
    return this.models[sequelizeModel.name];
  }
}

Provider.prototype.OPERATOR = Criteria.prototype.OPERATOR;
Provider.prototype.Query = Query;
Provider.prototype.RANDOM = Consts.RANDOM;

module.exports = Provider;